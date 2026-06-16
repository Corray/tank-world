// Level module (R2): three-level configs, spawn sequence generation,
// level progression / retry with layered scoring (consensus §3.7, data-model §11).

import { EnemyType, Direction, GameState, GameMode, Terrain } from '../core/types';
import {
  INVINCIBLE_MS,
  PLAYER_LIVES,
  CELL,
  VARIANT_BASE,
  VARIANT_MOD,
  ENDLESS_TOTAL_STEP,
  ENDLESS_INTERVAL_STEP_MS,
  ENDLESS_INTERVAL_MIN_MS,
  ENDLESS_ARMOR_BASE,
  ENDLESS_ARMOR_STEP,
  ENDLESS_ARMOR_CAP,
  ENDLESS_CONFIRM_DELAY_MS,
  VS_SPAWN_P1,
  VS_SPAWN_P2,
  VS_POWERUP_INTERVAL_MS,
  MELEE_NPC_TOTAL,
  MELEE_NPC_COUNTS,
  MELEE_SPAWN_INTERVAL_MS,
  LEVEL_COUNT,
  BOSS_ENDLESS_EVERY,
  WAVE_TOTAL_BASE,
  WAVE_TOTAL_STEP,
  WAVE_ARMOR_BASE,
  WAVE_ARMOR_STEP,
  WAVE_ARMOR_CAP,
  WAVE_INTERVAL_BASE_MS,
  WAVE_INTERVAL_STEP_MS,
  WAVE_INTERVAL_MIN_MS,
  WAVE_BOSS_EVERY,
} from '../core/constants';
import { GameMap } from '../map/map';
import { onLevelLoaded } from '../achievements/achievements';
import type { World } from '../core/world';

export interface LevelConfig {
  layout: number[][];
  enemyCounts: { BASIC: number; FAST: number; ARMORED: number };
  spawnIntervalMs: number;
}

// Layout legend: 0 EMPTY / 1 BRICK / 2 STEEL / 3 BASE / 4 BUSH / 5 WATER / 6 ICE.
// Shared design constraints (data-model §11/§23): base (12,6) with DOUBLE brick
// ring (rows 10-12 × cols 4-8, AC-22); player spawn (12,2); enemy spawn cells
// (0,0)/(0,6)/(0,12) clear; R4: each level contains ≥1 of bush/water/ice (AC-35).
// prettier-ignore
const L1_LAYOUT: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
  [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
  [0, 1, 1, 0, 1, 1, 2, 1, 1, 0, 1, 1, 0],
  [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
  [0, 4, 0, 0, 1, 1, 0, 1, 1, 0, 0, 4, 0],
  [1, 1, 0, 1, 1, 0, 2, 0, 1, 1, 0, 1, 1],
  [6, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 6],
  [0, 2, 0, 0, 0, 1, 1, 1, 0, 0, 0, 2, 0],
  [0, 1, 0, 1, 0, 5, 0, 5, 0, 1, 0, 1, 0],
  [0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0],
  [0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0],
  [0, 0, 0, 0, 1, 1, 3, 1, 1, 0, 0, 0, 0],
];

// prettier-ignore
const L2_LAYOUT: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 2, 0, 1, 1, 0, 1, 0, 1, 1, 0, 2, 0],
  [0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0],
  [1, 1, 6, 0, 0, 0, 2, 0, 0, 0, 6, 1, 1],
  [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
  [0, 0, 0, 1, 4, 0, 0, 0, 4, 1, 0, 0, 0],
  [0, 1, 1, 1, 0, 2, 0, 2, 0, 1, 1, 1, 0],
  [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
  [0, 0, 0, 0, 5, 0, 0, 0, 5, 0, 0, 2, 0],
  [0, 2, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0],
  [0, 1, 0, 0, 1, 1, 3, 1, 1, 0, 0, 0, 0],
];

// prettier-ignore
const L3_LAYOUT: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 0, 2, 0, 1, 1, 1, 0, 2, 0, 1, 0],
  [0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0],
  [0, 5, 0, 1, 0, 0, 0, 0, 0, 1, 0, 5, 0],
  [2, 0, 1, 1, 0, 1, 2, 1, 0, 1, 1, 0, 2],
  [0, 0, 6, 0, 0, 1, 0, 1, 0, 0, 6, 0, 0],
  [0, 1, 1, 0, 0, 4, 0, 4, 0, 0, 1, 1, 0],
  [0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0],
  [2, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 2],
  [0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 1, 2, 0, 1, 1, 1, 1, 1, 0, 2, 1, 0],
  [0, 0, 0, 0, 1, 1, 3, 1, 1, 0, 0, 0, 0],
];

// R17 §3.29: campaign L4 — steel-heavy, water/ice channels. Base (12,6) + ring,
// spawns (0,0)/(0,6)/(0,12) & player (12,2) clear; ≥1 bush/water/ice (AC-35).
// prettier-ignore
const L4_LAYOUT: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 2, 0, 1, 0, 2, 0, 1, 1, 0],
  [0, 1, 0, 0, 0, 4, 0, 4, 0, 0, 0, 1, 0],
  [0, 0, 0, 1, 1, 0, 2, 0, 1, 1, 0, 0, 0],
  [2, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 2],
  [0, 5, 0, 1, 2, 0, 0, 0, 2, 1, 0, 5, 0],
  [0, 0, 0, 1, 0, 0, 6, 0, 0, 1, 0, 0, 0],
  [0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0],
  [2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 2],
  [0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 1, 2, 0, 1, 1, 1, 1, 1, 0, 2, 1, 0],
  [0, 0, 0, 0, 1, 1, 3, 1, 1, 0, 0, 0, 0],
];

// R17 §3.29: campaign L5 — climax, dense steel maze + corridors.
// prettier-ignore
const L5_LAYOUT: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 2, 1, 0, 1, 0, 1, 0, 1, 0, 1, 2, 0],
  [0, 0, 1, 0, 1, 0, 6, 0, 1, 0, 1, 0, 0],
  [1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 0, 5, 0, 0, 1, 1, 0, 1],
  [0, 0, 4, 0, 2, 0, 0, 0, 2, 0, 4, 0, 0],
  [0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0],
  [0, 1, 0, 1, 0, 0, 2, 0, 0, 1, 0, 1, 0],
  [0, 0, 0, 1, 0, 4, 0, 4, 0, 1, 0, 0, 0],
  [2, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 2],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 1, 0, 2, 1, 1, 1, 1, 1, 2, 0, 1, 0],
  [0, 0, 0, 0, 1, 1, 3, 1, 1, 0, 0, 0, 0],
];

// R8 §3.21: VERSUS arena — vertically symmetric (row r mirrors 12-r), two
// bases: P2 (0,6) top / P1 (12,6) bottom, each with a brick shell. Player
// spawns (0,10)/(12,2) and mid-line powerup cells (6,2)/(6,10) kept clear.
// prettier-ignore
const VS_LAYOUT: number[][] = [
  [0, 0, 0, 0, 0, 1, 3, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 2, 0, 1, 0, 0, 0, 0, 0, 1, 0, 2, 0],
  [0, 0, 0, 1, 0, 4, 0, 4, 0, 1, 0, 0, 0],
  [0, 1, 1, 0, 0, 2, 0, 2, 0, 0, 1, 1, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
  [0, 1, 1, 0, 0, 2, 0, 2, 0, 0, 1, 1, 0],
  [0, 0, 0, 1, 0, 4, 0, 4, 0, 1, 0, 0, 0],
  [0, 2, 0, 1, 0, 0, 0, 0, 0, 1, 0, 2, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 3, 1, 0, 0, 0, 0, 0],
];

// R4: hand-curated safe EMPTY cells per layout for endless variants
// (data-model §25 — never spawn cells / ring / player spawn / corridors).
// prettier-ignore
const VARIANT_SLOTS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[2, 0], [2, 12], [4, 4], [4, 6], [4, 8], [5, 3], [5, 9], [6, 7], [7, 6], [8, 0], [9, 2], [9, 10]],
  [[2, 0], [2, 12], [3, 4], [3, 8], [5, 5], [5, 7], [6, 0], [6, 12], [7, 5], [7, 7], [9, 1], [9, 9]],
  [[1, 4], [1, 8], [2, 4], [2, 8], [3, 6], [4, 4], [4, 8], [5, 6], [8, 5], [8, 7], [9, 4], [9, 8]],
  // R17: L4 safe EMPTY cells (verified 0 in L4_LAYOUT, off spawn/ring/player).
  [[2, 0], [2, 12], [3, 0], [3, 12], [4, 4], [4, 8], [6, 1], [6, 11], [7, 4], [7, 8], [8, 5], [8, 7]],
  // R17: L5 safe EMPTY cells (verified 0 in L5_LAYOUT).
  [[2, 0], [2, 12], [3, 1], [3, 11], [5, 0], [5, 12], [6, 2], [6, 10], [7, 4], [7, 8], [8, 0], [8, 12]],
];

/** Per-level configs (consensus §3.7 table). */
export const LEVELS: readonly LevelConfig[] = [
  { layout: L1_LAYOUT, enemyCounts: { BASIC: 4, FAST: 3, ARMORED: 3 }, spawnIntervalMs: 3000 },
  { layout: L2_LAYOUT, enemyCounts: { BASIC: 5, FAST: 5, ARMORED: 4 }, spawnIntervalMs: 2500 },
  { layout: L3_LAYOUT, enemyCounts: { BASIC: 6, FAST: 6, ARMORED: 6 }, spawnIntervalMs: 2000 },
  { layout: L4_LAYOUT, enemyCounts: { BASIC: 7, FAST: 7, ARMORED: 8 }, spawnIntervalMs: 1800 },
  { layout: L5_LAYOUT, enemyCounts: { BASIC: 8, FAST: 9, ARMORED: 9 }, spawnIntervalMs: 1600 },
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
/**
 * R11 §3.24: whether a level ends with a Boss — campaign L3 终点 or endless
 * milestone (every BOSS_ENDLESS_EVERY levels). G4 骨架桩：impl 阶段填充。
 */
export function isBossLevel(level: number): boolean {
  if (level === LEVEL_COUNT) return true; // campaign climax (L3)
  // endless milestone: every BOSS_ENDLESS_EVERY levels past the campaign (L8/L13/...)
  return level > LEVEL_COUNT && (level - LEVEL_COUNT) % BOSS_ENDLESS_EVERY === 0;
}

export function loadLevel(world: World, level: number): void {
  const cfg = level <= LEVELS.length ? LEVELS[level - 1] : endlessConfig(level);
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
  // R11 §3.24: on boss levels, the BOSS is appended as the LAST enemy to spawn —
  // killing it triggers the existing fieldClear (no new win logic).
  if (isBossLevel(level)) {
    // R15 §3.27: campaign climax is always the classic BOSS (index 1); endless
    // milestones rotate by their own series (L8=1 BOSS, L13=2 SUMMONER, ...).
    const idx = level === LEVEL_COUNT ? 1 : (level - LEVEL_COUNT) / BOSS_ENDLESS_EVERY;
    world.spawnSequence.push(bossTypeFor(idx));
    world.enemyTotal += 1;
  }
  // R12 §3.25: timed effects never cross levels (fresh map carries no ring
  // fortification — only the clocks need clearing).
  world.freezeUntil = 0;
  world.shovelUntil = { 1: 0, 2: 0 };
  // R18 §3.30: a fresh level starts with no kill streak.
  world.comboCount = 0;
  world.comboUntil = 0;

  // R5: reset EVERY player (positions/invincibility); lives carry per player.
  for (const p of world.players) {
    p.pos = { ...p.spawnPos };
    p.dir = Direction.UP;
    p.alive = p.lives > 0;
    p.invincibleUntil = world.clock + INVINCIBLE_MS;
    p.shieldUntil = 0;
    p.slide = null; // R4: level transitions never carry momentum (T-TER-6)
  }

  world.levelStartLives = world.players[0].lives; // R4 兼容快照（既有测试引用）
  for (const p of world.players) p.levelStartLives = p.lives; // R7: per-player 快照（§36）
  onLevelLoaded(world); // R4: ENDLESS_8 hook
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
  // R5 AC-40: every player revives at full lives on retry.
  for (const p of world.players) {
    p.lives = PLAYER_LIVES;
    p.doubleFire = false;
    p.alive = true;
    p.score = 0; // fix #13（PM 决策 a）：重试清零个人分，维持 sum(个人) ≤ Total 不变量
    p.level = 1; // R10 §3.23：败北重试 = 全新开局，升级清零
  }
  loadLevel(world, world.level);
  world.state = GameState.PLAYING;
}

// --- R8: versus mode (consensus §3.21) ---

/**
 * R8 §3.21: (re)set a versus round — load the VS arena, place P1 (bottom) /
 * P2 (top), no NPCs (enemyTotal=0 → trySpawnEnemy no-ops), clear the field.
 * Does NOT touch versusWins (preserved across rounds — advanceVersusRound).
 */
const VS_SPAWNS: Record<1 | 2, readonly [number, number]> = { 1: VS_SPAWN_P1, 2: VS_SPAWN_P2 };

export function setupVersus(world: World): void {
  world.map = new GameMap(VS_LAYOUT);
  world.enemies = [];
  world.bullets = [];
  world.powerups = [];
  world.powerupDropCursor = 0;
  world.enemyTotal = 0;
  world.spawnedCount = 0;
  world.spawnCooldownMs = 0;
  world.versusPowerupCooldownMs = VS_POWERUP_INTERVAL_MS;
  // R12 §3.25: timed effects never cross rounds (fresh arena, clocks cleared).
  world.freezeUntil = 0;
  world.shovelUntil = { 1: 0, 2: 0 };
  for (const p of world.players) {
    const [r, c] = VS_SPAWNS[p.id];
    p.spawnPos = { x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 };
    p.pos = { ...p.spawnPos };
    p.dir = p.id === 1 ? Direction.UP : Direction.DOWN;
    p.lives = PLAYER_LIVES;
    p.alive = true;
    p.invincibleUntil = 0;
    p.shieldUntil = 0;
    p.doubleFire = false;
    p.score = 0;
    p.kills = 0;
    p.level = 1; // R10 §3.23：每局新坦克，升级清零（覆盖 MELEE via setupMelee）
    p.slide = null;
  }
}

/**
 * R9 §3.22: set up a MELEE round = VERSUS arena + players, plus an NPC pool
 * (enemyTotal>0, neutral spawn cells via enemy.trySpawnEnemy mode branch).
 * Reuses setupVersus for arena/players, then layers the NPC config.
 */
export function setupMelee(world: World): void {
  setupVersus(world); // arena + players + clear field (enemyTotal=0)
  world.enemyTotal = MELEE_NPC_TOTAL;
  world.spawnSequence = generateSpawnSequence(MELEE_NPC_COUNTS);
  world.spawnIntervalMs = MELEE_SPAWN_INTERVAL_MS;
  world.spawnCooldownMs = 0; // first NPC spawns promptly
}

/**
 * R8 §3.21: VERSUS_ROUND → next round. Both sides revive at full lives, the
 * arena/powerups reset; round wins (versusWins) are preserved across rounds.
 * R9: dispatches to setupMelee for MELEE (NPC pool reset).
 */
export function advanceVersusRound(world: World): void {
  if (world.state !== GameState.VERSUS_ROUND) return;
  if (world.mode === GameMode.MELEE) setupMelee(world);
  else setupVersus(world);
  world.state = GameState.PLAYING;
}

// --- R13: wave defense (consensus §3.26) ---

/** R13 §3.26: wave size / mix / pace curve — fought on the L1 battlefield. */
export function waveConfig(wave: number): LevelConfig {
  const total = WAVE_TOTAL_BASE + WAVE_TOTAL_STEP * wave;
  const armoredRatio = Math.min(WAVE_ARMOR_CAP, WAVE_ARMOR_BASE + WAVE_ARMOR_STEP * wave);
  const ARMORED = Math.round(total * armoredRatio);
  const FAST = Math.round((total - ARMORED) / 2);
  const BASIC = total - ARMORED - FAST;
  const spawnIntervalMs = Math.max(
    WAVE_INTERVAL_MIN_MS,
    WAVE_INTERVAL_BASE_MS - WAVE_INTERVAL_STEP_MS * wave,
  );
  return { layout: LEVELS[0].layout, enemyCounts: { BASIC, FAST, ARMORED }, spawnIntervalMs };
}

/** R13 §3.26: every WAVE_BOSS_EVERY waves end with a boss (reuses R11). */
export function isBossWave(wave: number): boolean {
  return wave > 0 && wave % WAVE_BOSS_EVERY === 0;
}

/** R16 §3.28: milestone boss rotation — three-cycle BOSS → SUMMONER → GUARDIAN
 *  (deterministic; campaign L3 is always index 1). */
export function bossTypeFor(milestoneIdx: number): EnemyType {
  const cycle = [EnemyType.BOSS, EnemyType.SUMMONER, EnemyType.GUARDIAN];
  return cycle[(milestoneIdx - 1) % 3];
}

/**
 * R13 §3.26: refill the spawn fields for wave k. Map, field powerups, players
 * and the score stay UNTOUCHED — same-map continuity is the mode's core.
 */
export function applyWave(world: World, wave: number): void {
  const cfg = waveConfig(wave);
  world.spawnSequence = generateSpawnSequence(cfg.enemyCounts);
  world.enemyTotal =
    cfg.enemyCounts.BASIC + cfg.enemyCounts.FAST + cfg.enemyCounts.ARMORED;
  world.spawnIntervalMs = cfg.spawnIntervalMs;
  world.spawnedCount = 0;
  world.spawnCursor = 0;
  world.spawnCooldownMs = 0;
  if (isBossWave(wave)) {
    world.spawnSequence.push(bossTypeFor(wave / WAVE_BOSS_EVERY)); // R15 rotation
    world.enemyTotal += 1;
  }
}

/** R13 §3.26: enter wave mode — L1 battlefield via loadLevel, then wave 1. */
export function setupWave(world: World): void {
  loadLevel(world, 1); // map / players / field reset reused (startup only)
  world.wave = 1;
  applyWave(world, 1);
}

/** R13 §3.26: WAVE_BREAK ends → next wave on the SAME battlefield. */
export function startNextWave(world: World): void {
  if (world.state !== GameState.WAVE_BREAK) return;
  world.wave += 1;
  applyWave(world, world.wave);
  world.state = GameState.PLAYING;
}

// --- R3: endless mode (consensus §3.13, data-model §19) ---

/**
 * R4: deterministic terrain variant of the rotated base layout for an endless
 * level (data-model §25). Same level → same variant; LCG, no Math.random.
 */
export function variantLayout(level: number): number[][] {
  // R17: first endless level = LEVEL_COUNT+1 (was hardcoded 4); derive baseIdx.
  const baseIdx = (level - LEVEL_COUNT - 1) % LEVELS.length;
  const base = LEVELS[baseIdx].layout.map((row) => [...row]);
  const slots = VARIANT_SLOTS[baseIdx];
  const lcg = (1103515245 * level + 12345) % 2147483648;
  const count = VARIANT_BASE + (level % VARIANT_MOD);
  const start = lcg % slots.length;
  const cycle = [Terrain.BUSH, Terrain.WATER, Terrain.ICE];
  for (let i = 0; i < count; i++) {
    const [r, c] = slots[(start + i) % slots.length];
    base[r][c] = cycle[i % cycle.length];
  }
  return base;
}

/** Dynamic config for endless levels (level > LEVEL_COUNT) — data-model §19. */
export function endlessConfig(level: number): LevelConfig {
  // R17: endless depth = levels past the campaign (was hardcoded `level - 3`).
  const k = level - LEVEL_COUNT;
  const layout = variantLayout(level); // R4: rotation + deterministic variant
  // R20: difficulty bases derive from the LAST campaign level — endless
  // continues the campaign peak and climbs (fixes the R17 dip; no 18/2000 magic).
  const peak = LEVELS[LEVELS.length - 1];
  const peakTotal = peak.enemyCounts.BASIC + peak.enemyCounts.FAST + peak.enemyCounts.ARMORED;
  const total = peakTotal + ENDLESS_TOTAL_STEP * k;
  const armoredRatio = Math.min(ENDLESS_ARMOR_CAP, ENDLESS_ARMOR_BASE + ENDLESS_ARMOR_STEP * k);
  const ARMORED = Math.round(total * armoredRatio);
  const FAST = Math.round((total - ARMORED) / 2);
  const BASIC = total - ARMORED - FAST;
  const spawnIntervalMs = Math.max(
    ENDLESS_INTERVAL_MIN_MS,
    peak.spawnIntervalMs - ENDLESS_INTERVAL_STEP_MS * k,
  );
  return { layout, enemyCounts: { BASIC, FAST, ARMORED }, spawnIntervalMs };
}

/**
 * GAME_COMPLETE → endless L4. Requires the anti-misfire window to have
 * elapsed (risk §21). Lives are NOT reset (consensus §3.13).
 */
export function enterEndless(world: World, wallNowMs: number): void {
  if (world.state !== GameState.GAME_COMPLETE) return;
  // R7 §3.19: co-op endless OPEN（v5 门控按清单 §35.1-7 移除）。
  if (wallNowMs - world.gameCompleteWallMs <= ENDLESS_CONFIRM_DELAY_MS) return;
  world.endlessStartBanked = world.bankedScore;
  loadLevel(world, LEVEL_COUNT + 1); // R17: endless starts after the campaign (was hardcoded 4)
  world.state = GameState.PLAYING;
}
