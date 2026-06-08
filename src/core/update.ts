// Per-frame pipeline (architecture §3.2):
// input → player → enemies → combat → judge. Render/HUD happen outside.

import { GameState, GameMode } from './types';
import type { World } from './world';
import type { InputState } from '../input/input';
import { updatePlayers } from '../player/player';
import { updateEnemies, trySpawnEnemy } from '../enemy/enemy';
import { updateCombat } from '../combat/combat';
import { updatePowerups, spawnNeutralPowerup } from '../powerup/powerup';
import { updateEffects } from '../effects/effects';
import { playSound, SoundEvent } from '../audio/audio';
import { submitLevelScore, submitTotal, submitEndless, submitCoop, submitCoopEndless } from '../storage/storage';
import { onLevelCleared } from '../achievements/achievements';
import { LEVEL_COUNT, VS_WINS_NEEDED } from './constants';

/**
 * Per-step pipeline. `inputs` accepts a single InputState (v1~v4 compat,
 * applied to P1) or an array of per-player lanes (R5 §31).
 */
export function updateWorld(
  world: World,
  dtMs: number,
  inputs: InputState | InputState[],
): void {
  updatePlayers(world, dtMs, Array.isArray(inputs) ? inputs : [inputs]);
  updatePowerups(world); // before combat: bomb kills exclude same-frame scoring (risk §15)
  if (world.mode === GameMode.VERSUS) spawnNeutralPowerup(world, dtMs); // §3.21 neutral source
  trySpawnEnemy(world, dtMs);
  updateEnemies(world, dtMs);
  updateCombat(world, dtMs);
  updateEffects(world); // pure visuals, after logic (data-model §17)
  judge(world);
}

/** Endless-segment settlement score (counted from L4 entry — data-model §19). */
function endlessSettlement(world: World): number {
  return world.bankedScore + world.score - world.endlessStartBanked;
}

/**
 * R8 §3.21: VERSUS judgement — a side loses its round when its base falls OR
 * it runs out of lives; the other side takes the round. Best-of-3: reaching
 * VS_WINS_NEEDED ends the match (VERSUS_OVER), else a VERSUS_ROUND interlude.
 * Writes NO storage bucket (six buckets stay solo/co-op only, AC-57).
 */
export function judgeVersus(world: World): void {
  const [p1, p2] = world.players;
  const p1Lost = world.map.versusBaseDown(1) || (!p1.alive && p1.lives <= 0);
  const p2Lost = world.map.versusBaseDown(2) || (!p2.alive && p2.lives <= 0);
  if (!p1Lost && !p2Lost) return;
  // P2 lost → P1 wins; otherwise P1 lost → P2 wins (simultaneous: P1 edge).
  const winner: 1 | 2 = p2Lost ? 1 : 2;
  world.versusWins[winner] += 1;
  world.versusRoundWinner = winner;
  if (world.versusWins[winner] >= VS_WINS_NEEDED) {
    world.versusMatchWinner = winner;
    world.state = GameState.VERSUS_OVER;
  } else {
    world.state = GameState.VERSUS_ROUND;
  }
  playSound(SoundEvent.DEFEAT);
}

/**
 * Judgement (data-model §10/§20). Single exit per step; death conditions win
 * over clear if both fire in the same frame (T-SM-4). Death routes by level:
 * L1~3 → DEFEAT (retryable), L4+ → ENDLESS_OVER (settles best-endless).
 */
export function judge(world: World): void {
  if (world.state !== GameState.PLAYING) return;
  // R8 §3.21: VERSUS has its own win logic (no PvE clear path here).
  if (world.mode === GameMode.VERSUS) {
    judgeVersus(world);
    return;
  }
  // R5 §31: defeat when the base falls OR every player is out of lives.
  const allPlayersDead = world.players.every((p) => !p.alive && p.lives <= 0);
  if (world.map.baseDestroyed || allPlayersDead) {
    if (world.level > LEVEL_COUNT) {
      world.state = GameState.ENDLESS_OVER;
      // R7 清单 §35.2-9：设计期捕获的写入点分叉——第六档隔离（AC-48）。
      if (world.mode === GameMode.COOP) submitCoopEndless(endlessSettlement(world));
      else submitEndless(endlessSettlement(world));
    } else {
      world.state = GameState.DEFEAT;
    }
    playSound(SoundEvent.DEFEAT);
    return;
  }
  const allSpawned = world.spawnedCount >= world.enemyTotal;
  const fieldClear = world.enemies.every((e) => !e.alive);
  if (allSpawned && fieldClear) {
    onLevelCleared(world); // R4: NO_DEATH_LEVEL / FULL_CLEAR / PURIST (§26)
    world.lastLevelScore = world.score;
    world.bankedScore += world.score;
    world.score = 0;
    // fix #6 (AC-43): best-level is a SOLO bucket — co-op never writes it.
    if (world.mode === GameMode.SOLO) submitLevelScore(world.lastLevelScore);
    if (world.level === LEVEL_COUNT) {
      world.state = GameState.GAME_COMPLETE;
      world.gameCompleteWallMs = Date.now(); // anti-misfire window anchor (risk §21)
      // R5 §31: co-op totals go to their own bucket; solo buckets untouched.
      if (world.mode === GameMode.COOP) submitCoop(world.bankedScore);
      else submitTotal(world.bankedScore);
    } else {
      world.state = GameState.LEVEL_CLEAR; // L1~2 and all endless levels
    }
    playSound(SoundEvent.LEVEL_CLEAR);
  }
}
