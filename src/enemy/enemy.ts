// Enemy module: spawn scheduler + the three AI variants (data-model §6).

import { EnemyType } from '../core/types';
import type { World } from '../core/world';

/** Fixed spawn order: 4 BASIC / 3 FAST / 3 ARMORED, difficulty ramp (data-model §6). */
export const SPAWN_SEQUENCE: readonly EnemyType[] = [
  EnemyType.BASIC,
  EnemyType.BASIC,
  EnemyType.FAST,
  EnemyType.BASIC,
  EnemyType.ARMORED,
  EnemyType.FAST,
  EnemyType.BASIC,
  EnemyType.ARMORED,
  EnemyType.FAST,
  EnemyType.ARMORED,
];

/** Spawn cells on the top row: (0,0) / (0,6) / (0,12), cursor-rotated. */
export const SPAWN_CELLS: readonly { row: number; col: number }[] = [
  { row: 0, col: 0 },
  { row: 0, col: 6 },
  { row: 0, col: 12 },
];

/**
 * Spawn scheduling per step: concurrent < 4, total < 10, spawn point free,
 * cooldown elapsed; occupied point defers to next eligible tick.
 */
export function trySpawnEnemy(world: World, dtMs: number): void {
  void world;
  void dtMs;
  // TODO(slice-P4)
}

/** Per-step AI for all alive enemies: roam + periodic fire. */
export function updateEnemies(world: World, dtMs: number): void {
  void world;
  void dtMs;
  // TODO(slice-P4)
}
