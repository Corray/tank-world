// Enemy module: spawn scheduler + the three AI variants (data-model §6).

import { EnemyType, Direction } from '../core/types';
import type { EnemyTank, Vec } from '../core/types';
import type { World } from '../core/world';
import {
  CELL,
  ENEMY_SPEED,
  ENEMY_FAST_FACTOR,
  ENEMY_HP,
  ENEMY_SCORE,
  ENEMY_CONCURRENT,
  ENEMY_TURN_INTERVAL_MS,
  ENEMY_FIRE_INTERVAL_MS,
  CARRIER_POSITIONS,
} from '../core/constants';
import { moveTank, fireEnemyBullet, tankAreaFree } from '../combat/combat';

/** Spawn cells on the top row: (0,0) / (0,6) / (0,12), cursor-rotated. */
export const SPAWN_CELLS: readonly { row: number; col: number }[] = [
  { row: 0, col: 0 },
  { row: 0, col: 6 },
  { row: 0, col: 12 },
];

/**
 * Pure factory: build an enemy of `type` at pixel position. Type attributes
 * (speed / hp / score) come from constants (T-ENM-5~7 contract).
 */
export function createEnemy(type: EnemyType, pos: Vec): EnemyTank {
  return {
    pos: { ...pos },
    dir: Direction.DOWN,
    speed: type === EnemyType.FAST ? ENEMY_SPEED * ENEMY_FAST_FACTOR : ENEMY_SPEED,
    alive: true,
    type,
    hp: ENEMY_HP[type],
    score: ENEMY_SCORE[type],
    ai: { turnMs: ENEMY_TURN_INTERVAL_MS, fireMs: ENEMY_FIRE_INTERVAL_MS },
    carrier: false,
  };
}

/**
 * Spawn scheduling per step (data-model §6): concurrent < 4, total < 10,
 * cooldown elapsed, spawn point free. An occupied point defers (cursor does
 * not advance) and retries until free — spawns never stack (T-ENM-2).
 */
export function trySpawnEnemy(world: World, dtMs: number): void {
  world.spawnCooldownMs -= dtMs;
  if (world.spawnCooldownMs > 0) return;
  if (world.spawnedCount >= world.enemyTotal) return;
  if (world.enemies.filter((e) => e.alive).length >= ENEMY_CONCURRENT) return;

  const cell = SPAWN_CELLS[world.spawnCursor];
  const pos: Vec = { x: cell.col * CELL + CELL / 2, y: cell.row * CELL + CELL / 2 };
  if (!tankAreaFree(world, pos.x, pos.y)) return; // occupied → retry next tick

  const enemy = createEnemy(world.spawnSequence[world.spawnedCount], pos);
  // R2: 1-based positions 4/8/12 carry a powerup (consensus §3.8).
  enemy.carrier = CARRIER_POSITIONS.includes(world.spawnedCount + 1);
  world.enemies.push(enemy);
  world.spawnedCount += 1;
  world.spawnCursor = (world.spawnCursor + 1) % SPAWN_CELLS.length;
  world.spawnCooldownMs = world.spawnIntervalMs;
}

/** Per-step AI for all alive enemies: roam (re-roll on block/timer) + periodic fire. */
export function updateEnemies(world: World, dtMs: number): void {
  for (const e of world.enemies) {
    if (!e.alive) continue;
    e.ai.turnMs -= dtMs;
    e.ai.fireMs -= dtMs;

    const moved = moveTank(world, e, e.dir, dtMs);
    if (!moved || e.ai.turnMs <= 0) {
      e.dir = decideDirection(world, e);
      e.ai.turnMs = ENEMY_TURN_INTERVAL_MS;
    }
    if (e.ai.fireMs <= 0) {
      fireEnemyBullet(world, e);
      e.ai.fireMs = ENEMY_FIRE_INTERVAL_MS;
    }
  }
}

/**
 * R2 threat layering (consensus §3.9): one turn decision for an enemy.
 * BASIC: uniform random; FAST: 50% biased toward the base; ARMORED: 50%
 * biased toward the player; otherwise uniform random fallback.
 */
export function decideDirection(world: World, enemy: EnemyTank): Direction {
  void world;
  void enemy;
  return Direction.UP; // TODO(slice-Q3) — stub fails AI stats skeletons
}
