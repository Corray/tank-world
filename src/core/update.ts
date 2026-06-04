// Per-frame pipeline (architecture §3.2):
// input → player → enemies → combat → judge. Render/HUD happen outside.

import { GameState } from './types';
import type { World } from './world';
import type { InputState } from '../input/input';
import { updatePlayer } from '../player/player';
import { updateEnemies, trySpawnEnemy } from '../enemy/enemy';
import { updateCombat } from '../combat/combat';
import { ENEMY_TOTAL } from './constants';

export function updateWorld(world: World, dtMs: number, input: InputState): void {
  updatePlayer(world, dtMs, input);
  trySpawnEnemy(world, dtMs);
  updateEnemies(world, dtMs);
  updateCombat(world, dtMs);
  judge(world);
}

/**
 * Victory / defeat judgement (data-model §4). Single exit per step:
 * defeat conditions win over victory if both fire in the same frame (T-SM-4
 * locks the behaviour: base/lives defeat is checked first).
 */
export function judge(world: World): void {
  if (world.state !== GameState.PLAYING) return;
  if (world.map.baseDestroyed || (!world.player.alive && world.player.lives <= 0)) {
    world.state = GameState.DEFEAT;
    return;
  }
  const allSpawned = world.spawnedCount >= ENEMY_TOTAL;
  const fieldClear = world.enemies.every((e) => !e.alive);
  if (allSpawned && fieldClear) {
    world.state = GameState.VICTORY;
  }
}
