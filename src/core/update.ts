// Per-frame pipeline (architecture §3.2):
// input → player → enemies → combat → judge. Render/HUD happen outside.

import { GameState, GameMode } from './types';
import type { World } from './world';
import type { InputState } from '../input/input';
import { updatePlayers } from '../player/player';
import { updateEnemies, trySpawnEnemy } from '../enemy/enemy';
import { updateCombat } from '../combat/combat';
import { updatePowerups } from '../powerup/powerup';
import { updateEffects } from '../effects/effects';
import { playSound, SoundEvent } from '../audio/audio';
import { submitLevelScore, submitTotal, submitEndless, submitCoop } from '../storage/storage';
import { onLevelCleared } from '../achievements/achievements';
import { LEVEL_COUNT } from './constants';

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
 * Judgement (data-model §10/§20). Single exit per step; death conditions win
 * over clear if both fire in the same frame (T-SM-4). Death routes by level:
 * L1~3 → DEFEAT (retryable), L4+ → ENDLESS_OVER (settles best-endless).
 */
export function judge(world: World): void {
  if (world.state !== GameState.PLAYING) return;
  // R5 §31: defeat when the base falls OR every player is out of lives.
  const allPlayersDead = world.players.every((p) => !p.alive && p.lives <= 0);
  if (world.map.baseDestroyed || allPlayersDead) {
    if (world.level > LEVEL_COUNT) {
      world.state = GameState.ENDLESS_OVER;
      submitEndless(endlessSettlement(world));
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
    submitLevelScore(world.lastLevelScore);
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
