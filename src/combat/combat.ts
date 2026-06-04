// Combat module: bullet lifecycle + the single collision matrix C1~C12
// (data-model §5). All collision rules live here — never inside entities.

import type { World } from '../core/world';
import type { EnemyTank, Tank, Direction } from '../core/types';

/**
 * Advance all bullets and resolve the collision matrix for this step.
 * Implemented in slice P3 (walls) / P5 (tanks, base, bullet-vs-bullet).
 */
export function updateCombat(world: World, dtMs: number): void {
  void world;
  void dtMs;
  // TODO(slice-P3/P5): implement per data-model §5.
}

/**
 * Fire the player's bullet. Enforces the one-on-screen rule (consensus §3.2).
 * Returns true if a bullet was actually spawned.
 */
export function firePlayerBullet(world: World): boolean {
  void world;
  return false; // TODO(slice-P3)
}

/** Fire an enemy bullet from the given tank (no per-enemy on-screen cap). */
export function fireEnemyBullet(world: World, enemy: EnemyTank): void {
  void world;
  void enemy;
  // TODO(slice-P4)
}

/**
 * Try to move a tank one step in `dir`. Applies blocking rules C10~C12
 * (terrain / other tanks / field bounds). Returns true if moved.
 */
export function moveTank(world: World, tank: Tank, dir: Direction, dtMs: number): boolean {
  void world;
  void tank;
  void dir;
  void dtMs;
  return false; // TODO(slice-P2)
}
