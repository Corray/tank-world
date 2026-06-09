// Enemy module: spawn scheduler + the three AI variants (data-model §6).

import { EnemyType, Direction, GameMode } from '../core/types';
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
  AI_BIAS_PROBABILITY,
  MELEE_SPAWN_CELLS,
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

  // R9 §3.22: MELEE spawns NPCs from neutral side cells (top row is P2's
  // side + base in the VS arena); other modes use the top-row cells.
  const cells = world.mode === GameMode.MELEE ? MELEE_SPAWN_CELLS : SPAWN_CELLS;
  const cell = cells[world.spawnCursor % cells.length];
  const pos: Vec = { x: cell.col * CELL + CELL / 2, y: cell.row * CELL + CELL / 2 };
  if (!tankAreaFree(world, pos.x, pos.y)) return; // occupied → retry next tick

  const enemy = createEnemy(world.spawnSequence[world.spawnedCount], pos);
  // R2: 1-based positions 4/8/12 carry a powerup (consensus §3.8).
  enemy.carrier = CARRIER_POSITIONS.includes(world.spawnedCount + 1);
  world.enemies.push(enemy);
  world.spawnedCount += 1;
  world.spawnCursor = (world.spawnCursor + 1) % cells.length;
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

const DIRECTIONS: readonly Direction[] = [
  Direction.UP,
  Direction.DOWN,
  Direction.LEFT,
  Direction.RIGHT,
];

/** Base center pixel position (cell 12,6 — shared by all level layouts). */
const BASE_POS: Vec = { x: 6 * CELL + CELL / 2, y: 12 * CELL + CELL / 2 };

/** Dominant-axis direction from `from` toward `to`. */
function directionToward(from: Vec, to: Vec): Direction {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dy) >= Math.abs(dx) && dy !== 0) return dy > 0 ? Direction.DOWN : Direction.UP;
  if (dx !== 0) return dx > 0 ? Direction.RIGHT : Direction.LEFT;
  return Direction.DOWN;
}

/**
 * R2 threat layering (consensus §3.9): one turn decision for an enemy.
 * BASIC: uniform random; FAST: 50% biased toward the base; ARMORED: 50%
 * biased toward the player; otherwise uniform random fallback.
 */
export function decideDirection(world: World, enemy: EnemyTank): Direction {
  const biased = Math.random() < AI_BIAS_PROBABILITY;
  if (biased && enemy.type === EnemyType.FAST) {
    return directionToward(enemy.pos, BASE_POS);
  }
  if (biased && enemy.type === EnemyType.ARMORED) {
    // R5 §31: pressure the NEAREST alive player.
    const target = nearestAlivePlayer(world, enemy.pos);
    if (target) return directionToward(enemy.pos, target.pos);
  }
  return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
}

function nearestAlivePlayer(world: World, from: Vec): { pos: Vec } | null {
  let best: { pos: Vec } | null = null;
  let bestDist = Infinity;
  for (const p of world.players) {
    if (!p.alive) continue;
    const d = Math.abs(p.pos.x - from.x) + Math.abs(p.pos.y - from.y);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}
