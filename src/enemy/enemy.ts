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
  ENEMY_TOTAL,
  ENEMY_CONCURRENT,
  SPAWN_INTERVAL_MS,
  ENEMY_TURN_INTERVAL_MS,
  ENEMY_FIRE_INTERVAL_MS,
} from '../core/constants';
import { moveTank, fireEnemyBullet, tankAreaFree } from '../combat/combat';

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

const DIRECTIONS: readonly Direction[] = [
  Direction.UP,
  Direction.DOWN,
  Direction.LEFT,
  Direction.RIGHT,
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
  if (world.spawnedCount >= ENEMY_TOTAL) return;
  if (world.enemies.filter((e) => e.alive).length >= ENEMY_CONCURRENT) return;

  const cell = SPAWN_CELLS[world.spawnCursor];
  const pos: Vec = { x: cell.col * CELL + CELL / 2, y: cell.row * CELL + CELL / 2 };
  if (!tankAreaFree(world, pos.x, pos.y)) return; // occupied → retry next tick

  world.enemies.push(createEnemy(SPAWN_SEQUENCE[world.spawnedCount], pos));
  world.spawnedCount += 1;
  world.spawnCursor = (world.spawnCursor + 1) % SPAWN_CELLS.length;
  world.spawnCooldownMs = SPAWN_INTERVAL_MS;
}

/** Per-step AI for all alive enemies: roam (re-roll on block/timer) + periodic fire. */
export function updateEnemies(world: World, dtMs: number): void {
  for (const e of world.enemies) {
    if (!e.alive) continue;
    e.ai.turnMs -= dtMs;
    e.ai.fireMs -= dtMs;

    const moved = moveTank(world, e, e.dir, dtMs);
    if (!moved || e.ai.turnMs <= 0) {
      e.dir = pickDirection(e.dir, moved);
      e.ai.turnMs = ENEMY_TURN_INTERVAL_MS;
    }
    if (e.ai.fireMs <= 0) {
      fireEnemyBullet(world, e);
      e.ai.fireMs = ENEMY_FIRE_INTERVAL_MS;
    }
  }
}

/** Random roam with a downward bias (classic feel); avoid re-picking a blocked dir. */
function pickDirection(current: Direction, currentWorks: boolean): Direction {
  const pool: Direction[] = [...DIRECTIONS, Direction.DOWN]; // DOWN weighted x2
  const candidates = currentWorks ? pool : pool.filter((d) => d !== current);
  return candidates[Math.floor(Math.random() * candidates.length)];
}
