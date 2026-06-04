// Per-frame pipeline (architecture §3.2):
// input → player → enemies → combat → judge. Render/HUD happen outside.

import { GameState } from './types';
import type { World } from './world';
import type { InputState } from '../input/input';
import { updatePlayer } from '../player/player';
import { updateEnemies, trySpawnEnemy } from '../enemy/enemy';
import { updateCombat } from '../combat/combat';
import { updatePowerups } from '../powerup/powerup';
import { submitLevelScore, submitTotal } from '../storage/storage';
import { LEVEL_COUNT } from './constants';

export function updateWorld(world: World, dtMs: number, input: InputState): void {
  updatePlayer(world, dtMs, input);
  updatePowerups(world); // before combat: bomb kills exclude same-frame scoring (risk §15)
  trySpawnEnemy(world, dtMs);
  updateEnemies(world, dtMs);
  updateCombat(world, dtMs);
  judge(world);
}

/**
 * Judgement (data-model §10). Single exit per step; defeat conditions win
 * over clear if both fire in the same frame (T-SM-4). Level clear banks the
 * level score immediately and settles best-level storage.
 */
export function judge(world: World): void {
  if (world.state !== GameState.PLAYING) return;
  if (world.map.baseDestroyed || (!world.player.alive && world.player.lives <= 0)) {
    world.state = GameState.DEFEAT;
    return;
  }
  const allSpawned = world.spawnedCount >= world.enemyTotal;
  const fieldClear = world.enemies.every((e) => !e.alive);
  if (allSpawned && fieldClear) {
    world.lastLevelScore = world.score;
    world.bankedScore += world.score;
    world.score = 0;
    submitLevelScore(world.lastLevelScore);
    if (world.level < LEVEL_COUNT) {
      world.state = GameState.LEVEL_CLEAR;
    } else {
      world.state = GameState.GAME_COMPLETE;
      submitTotal(world.bankedScore);
    }
  }
}
