// Level module (R2): three-level configs, spawn sequence generation,
// level progression / retry with layered scoring (consensus §3.7, data-model §11).

import { EnemyType, Direction, GameState } from '../core/types';
import { INVINCIBLE_MS, PLAYER_LIVES } from '../core/constants';
import { GameMap } from '../map/map';
import type { World } from '../core/world';

export interface LevelConfig {
  layout: number[][];
  enemyCounts: { BASIC: number; FAST: number; ARMORED: number };
  spawnIntervalMs: number;
}

// Layout legend: 0 EMPTY / 1 BRICK / 2 STEEL / 3 BASE.
// Shared design constraints (data-model §11): base (12,6) with DOUBLE brick
// ring (rows 10-12 × cols 4-8, AC-22); player spawn (12,2); enemy spawn cells
// (0,0)/(0,6)/(0,12) clear; steel ratio grows with level.
// prettier-ignore
const L1_LAYOUT: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
  [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
  [0, 1, 1, 0, 1, 1, 2, 1, 1, 0, 1, 1, 0],
  [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
  [0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0],
  [1, 1, 0, 1, 1, 0, 2, 0, 1, 1, 0, 1, 1],
  [0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0],
  [0, 2, 0, 0, 0, 1, 1, 1, 0, 0, 0, 2, 0],
  [0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0],
  [0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0],
  [0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0],
  [0, 0, 0, 0, 1, 1, 3, 1, 1, 0, 0, 0, 0],
];

// prettier-ignore
const L2_LAYOUT: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 2, 0, 1, 1, 0, 1, 0, 1, 1, 0, 2, 0],
  [0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
  [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  [0, 1, 1, 1, 0, 2, 0, 2, 0, 1, 1, 1, 0],
  [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0],
  [0, 2, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0],
  [0, 1, 0, 0, 1, 1, 3, 1, 1, 0, 0, 0, 0],
];

// prettier-ignore
const L3_LAYOUT: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 0, 2, 0, 1, 1, 1, 0, 2, 0, 1, 0],
  [0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0],
  [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  [2, 0, 1, 1, 0, 1, 2, 1, 0, 1, 1, 0, 2],
  [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
  [0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0],
  [2, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 2],
  [0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 1, 2, 0, 1, 1, 1, 1, 1, 0, 2, 1, 0],
  [0, 0, 0, 0, 1, 1, 3, 1, 1, 0, 0, 0, 0],
];

/** Per-level configs (consensus §3.7 table). */
export const LEVELS: readonly LevelConfig[] = [
  { layout: L1_LAYOUT, enemyCounts: { BASIC: 4, FAST: 3, ARMORED: 3 }, spawnIntervalMs: 3000 },
  { layout: L2_LAYOUT, enemyCounts: { BASIC: 5, FAST: 5, ARMORED: 4 }, spawnIntervalMs: 2500 },
  { layout: L3_LAYOUT, enemyCounts: { BASIC: 6, FAST: 6, ARMORED: 6 }, spawnIntervalMs: 2000 },
];

/**
 * Build the level's spawn order by round-robin interleaving
 * BASIC → FAST → ARMORED while counts remain (data-model §11).
 */
export function generateSpawnSequence(counts: LevelConfig['enemyCounts']): EnemyType[] {
  const remaining = { ...counts };
  const rotation = [EnemyType.BASIC, EnemyType.FAST, EnemyType.ARMORED] as const;
  const total = counts.BASIC + counts.FAST + counts.ARMORED;
  const seq: EnemyType[] = [];
  while (seq.length < total) {
    for (const t of rotation) {
      if (remaining[t] > 0) {
        seq.push(t);
        remaining[t] -= 1;
      }
    }
  }
  return seq;
}

/**
 * Reset the world to play the given level (1-based). Score fields untouched
 * (banking is judge's job); doubleFire untouched (AC-18: survives level clear,
 * retryLevel clears it explicitly on the death path).
 */
export function loadLevel(world: World, level: number): void {
  const cfg = LEVELS[level - 1];
  world.level = level;
  world.map = new GameMap(cfg.layout);
  world.enemies = [];
  world.bullets = [];
  world.powerups = [];
  world.powerupDropCursor = 0;
  world.spawnedCount = 0;
  world.spawnCursor = 0;
  world.spawnCooldownMs = 0;
  world.spawnSequence = generateSpawnSequence(cfg.enemyCounts);
  world.enemyTotal = cfg.enemyCounts.BASIC + cfg.enemyCounts.FAST + cfg.enemyCounts.ARMORED;
  world.spawnIntervalMs = cfg.spawnIntervalMs;

  const p = world.player;
  p.pos = { ...p.spawnPos };
  p.dir = Direction.UP;
  p.alive = true;
  p.invincibleUntil = world.clock + INVINCIBLE_MS;
  p.shieldUntil = 0;
}

/** LEVEL_CLEAR → next level: banking already happened at judgement time. */
export function advanceLevel(world: World): void {
  if (world.state !== GameState.LEVEL_CLEAR) return;
  loadLevel(world, world.level + 1);
  world.state = GameState.PLAYING;
}

/**
 * DEFEAT → retry current level (consensus AC-15): level score reset, banked
 * kept, lives back to 3, double-fire lost, map/powerups/spawns reset.
 * Retry exists for L1~3 only — endless death goes to ENDLESS_OVER (§3.13).
 */
export function retryLevel(world: World): void {
  if (world.state !== GameState.DEFEAT) return;
  world.score = 0;
  world.player.lives = PLAYER_LIVES;
  world.player.doubleFire = false;
  loadLevel(world, world.level);
  world.state = GameState.PLAYING;
}

// --- R3: endless mode (consensus §3.13, data-model §19) ---

/** Dynamic config for endless levels (level ≥ 4). */
export function endlessConfig(level: number): LevelConfig {
  void level;
  // TODO(slice-S3) — stub fails skeletons
  return LEVELS[0];
}

/**
 * GAME_COMPLETE → endless L4. Requires the anti-misfire window to have
 * elapsed (risk §21). Lives are NOT reset (consensus §3.13).
 */
export function enterEndless(world: World, wallNowMs: number): void {
  void world;
  void wallNowMs;
  // TODO(slice-S3)
}
