// All tunable game constants live here (architecture N4: no magic values).
// Default values are defined in docs/spec/data-model.md §1 — keep in sync.

import { Difficulty } from './types';

/** Logical grid dimension (cells per side). */
export const GRID = 13;
/** Cell edge length in pixels. */
export const CELL = 32;
/** Brick sub-block edge length (each brick cell = 2x2 sub-blocks). */
export const SUB = 16;
/** Canvas edge length in pixels. */
export const FIELD = GRID * CELL;

/** Tank collision box edge (slightly smaller than a cell for turn tolerance). */
export const TANK_SIZE = 28;
/** Player base speed, px per second. */
export const PLAYER_SPEED = 96;
/** Enemy base speed, px per second. */
export const ENEMY_SPEED = 96;
/** Speed multiplier for the FAST enemy type. */
export const ENEMY_FAST_FACTOR = 1.5;
/** Bullet speed, px per second (same for all bullets). */
export const BULLET_SPEED = 192;
/** Bullet collision box edge in pixels. */
export const BULLET_SIZE = 8;

/** Player initial lives (consensus §3.2). */
export const PLAYER_LIVES = 3;
/** Respawn invincibility window, ms (consensus §3.2). */
export const INVINCIBLE_MS = 2000;

/** Total enemies for level 1 (per-level totals live in LEVELS, data-model §11). */
export const ENEMY_TOTAL = 10;
/** Max concurrent enemies on field (consensus §3.3). */
export const ENEMY_CONCURRENT = 4;
/** Level-1 spawn interval, ms (per-level values in LEVELS; kept for v1 tests). */
export const SPAWN_INTERVAL_MS = 3000;

/** Fixed logic timestep frequency, Hz. */
export const LOGIC_HZ = 60;
/** Fixed logic timestep, ms. */
export const STEP_MS = 1000 / LOGIC_HZ;

/** Enemy hit points by type (data-model §3; R11 §3.24 adds BOSS). */
export const ENEMY_HP = { BASIC: 1, FAST: 1, ARMORED: 3, BOSS: 8, SUMMONER: 6, GUARDIAN: 12 } as const; // R15: BOSS 10→8; R16: GUARDIAN tank
/** Score awarded per destroyed enemy by type (consensus §3.3; R11 BOSS). */
export const ENEMY_SCORE = { BASIC: 100, FAST: 200, ARMORED: 400, BOSS: 1000, SUMMONER: 800, GUARDIAN: 1200 } as const;

/** Enemy AI: ms between direction re-rolls. */
export const ENEMY_TURN_INTERVAL_MS = 1500;
/** Enemy AI: ms between shots (R2 balance: 1200 → 1800, consensus §3.9). */
export const ENEMY_FIRE_INTERVAL_MS = 1800;

// --- R2 additions (consensus §3.7~3.10) ---

/** Number of levels in a run (R17: 3→5 campaign expansion). */
export const LEVEL_COUNT = 5;
/** 1-based spawn positions of powerup carriers within a level (consensus §3.8). */
export const CARRIER_POSITIONS: readonly number[] = [4, 8, 12];
/** Shield powerup duration, ms. */
export const SHIELD_MS = 10_000;
/** Player on-screen bullet cap: base / with DOUBLE_FIRE. */
export const PLAYER_BULLETS_BASE = 1;
export const PLAYER_BULLETS_DOUBLE = 2;
/** AI direction bias probability for FAST (→base) / ARMORED (→player), §3.9. */
export const AI_BIAS_PROBABILITY = 0.5;
/** localStorage keys (data-model §14/§21). */
export const KEY_BEST_TOTAL = 'tank-world.best-total';
export const KEY_BEST_LEVEL = 'tank-world.best-level';
export const KEY_BEST_ENDLESS = 'tank-world.best-endless';
export const KEY_MUTED = 'tank-world.muted';

// --- R3 additions (consensus §3.11~3.13) ---

/** Effect durations, ms (consensus §3.11 table). */
export const EXPLOSION_MS = 400;
export const BASE_EXPLOSION_MS = 800;
export const SPARK_MS = 150;
export const SCORE_FLOAT_MS = 600;
/** Player-hit full-screen flash duration, ms (≤200 per AC-25). */
export const FLASH_MS = 150;

/** Endless progression formula parameters (data-model §19). */
export const ENDLESS_TOTAL_STEP = 2;
export const ENDLESS_INTERVAL_STEP_MS = 100;
export const ENDLESS_INTERVAL_MIN_MS = 1200;
export const ENDLESS_ARMOR_BASE = 1 / 3;
export const ENDLESS_ARMOR_STEP = 0.05;
export const ENDLESS_ARMOR_CAP = 0.5;
/** Anti-misfire window after GAME_COMPLETE before endless entry, ms (risk §21). */
export const ENDLESS_CONFIRM_DELAY_MS = 1000;

// --- R4 additions (consensus §3.14~3.16) ---

/** Ice inertia: per-step speed decay factor @60Hz (≈0.5s to stop), data-model §24. */
export const ICE_DECAY = 0.92;
/** Ice inertia: slide speeds below this (px/s) snap to zero. */
export const ICE_STOP_THRESHOLD = 8;
/** Achievement toast banner duration, ms. */
export const TOAST_MS = 2500;
/** localStorage keys (data-model §26). */
export const KEY_ACHIEVEMENTS = 'tank-world.achievements';
export const KEY_KILLS = 'tank-world.kills';
/** Endless variant: slots used = VARIANT_BASE + (level % VARIANT_MOD), data-model §25. */
export const VARIANT_BASE = 6;
export const VARIANT_MOD = 5;

// --- R5 additions (consensus §3.17~3.18) ---

/** Co-op combined best score (data-model §31). */
export const KEY_BEST_COOP = 'tank-world.best-coop';

// --- R7 additions (consensus §3.19~3.20) ---

/** Co-op endless best — the sixth bucket (data-model §36). */
export const KEY_BEST_COOP_ENDLESS = 'tank-world.best-coop-endless';

// --- R8 additions (consensus §3.21) ---

/** VERSUS best-of-N: rounds a side must win to take the match (3局2胜). */
export const VS_WINS_NEEDED = 2;
/** VERSUS neutral powerup respawn interval, ms (§3.21 default — tunable). */
export const VS_POWERUP_INTERVAL_MS = 12_000;
/** VERSUS spawn cells (data-model §VS): P1 bottom-left, P2 top-right (mirror). */
export const VS_SPAWN_P1: readonly [number, number] = [12, 2];
export const VS_SPAWN_P2: readonly [number, number] = [0, 10];
/** VERSUS neutral powerup spawn cells: mid-line symmetric points. */
export const VS_POWERUP_CELLS: ReadonlyArray<readonly [number, number]> = [
  [6, 2],
  [6, 10],
];

// --- R9 additions (consensus §3.22, MELEE) ---

/** MELEE NPC pool per round (fewer than levels — two players out-gun them). */
export const MELEE_NPC_TOTAL = 12;
/** MELEE NPC spawn interval, ms (between L1/L2). */
export const MELEE_SPAWN_INTERVAL_MS = 2500;
/** MELEE NPC enemy mix per round (BASIC/FAST/ARMORED), totals MELEE_NPC_TOTAL. */
export const MELEE_NPC_COUNTS = { BASIC: 5, FAST: 4, ARMORED: 3 } as const;
/** MELEE NPC spawn cells: neutral side points in the VS arena (empty, equidistant). */
export const MELEE_SPAWN_CELLS: ReadonlyArray<{ row: number; col: number }> = [
  { row: 6, col: 1 },
  { row: 6, col: 11 },
];

// --- R10 additions (consensus §3.23, tank upgrade) ---

/** Max tank upgrade level (star caps here). */
export const MAX_TANK_LEVEL = 4;
/** L2+ player bullet speed (×1.5 of base — consensus §3.23 default). */
export const PLAYER_BULLET_FAST_SPEED = BULLET_SPEED * 1.5;

// --- R11 additions (consensus §3.24, Boss) ---

/** Boss HP / score (reference the by-type tables — single source). */
export const BOSS_HP = ENEMY_HP.BOSS;
export const BOSS_SCORE = ENEMY_SCORE.BOSS;
/** Boss fire interval: normal phase / rage phase (HP ≤ 50%), ms. */
export const BOSS_FIRE_MS = 1000;
export const BOSS_FIRE_RAGE_MS = 500;
/** Endless boss milestone: a boss every N endless levels (L8/L13/... at 5). */
export const BOSS_ENDLESS_EVERY = 5;

// --- R12 additions (consensus §3.25, powerup trio) ---

/** Shovel: base-ring fortify window, ms (expiry restores fresh brick). */
export const SHOVEL_MS = 15_000;
/** Freeze: NPC immobilize window, ms (re-pickup refreshes). */
export const FREEZE_MS = 8_000;
/**
 * Inner base ring cells per side — 1 = bottom base (PvE + VS P1), 2 = top
 * base (VS/MELEE P2). Same cells across all PvE layouts and the VS arena.
 */
export const BASE_RING: Record<1 | 2, ReadonlyArray<readonly [number, number]>> = {
  1: [[11, 5], [11, 6], [11, 7], [12, 5], [12, 7]],
  2: [[0, 5], [0, 7], [1, 5], [1, 6], [1, 7]],
};

// --- R13 additions (consensus §3.26, wave defense) ---

/** Between-wave countdown, ms (auto-starts the next wave; key skips). */
export const WAVE_BREAK_MS = 5_000;
/** Wave size curve: total = WAVE_TOTAL_BASE + WAVE_TOTAL_STEP * wave. */
export const WAVE_TOTAL_BASE = 8;
export const WAVE_TOTAL_STEP = 2;
/** Armored share curve: min(CAP, BASE + STEP * wave). */
export const WAVE_ARMOR_BASE = 0.15;
export const WAVE_ARMOR_STEP = 0.03;
export const WAVE_ARMOR_CAP = 0.5;
/** Spawn interval curve: max(MIN, BASE - STEP * wave), ms. */
export const WAVE_INTERVAL_BASE_MS = 2000;
export const WAVE_INTERVAL_STEP_MS = 100;
export const WAVE_INTERVAL_MIN_MS = 800;
/** A boss wave every N waves (wave % N === 0), reusing the R11 boss. */
export const WAVE_BOSS_EVERY = 5;
/** Storage buckets seven / eight (waves cleared, solo / co-op). */
export const KEY_BEST_WAVE = 'tank-world.best-wave';
export const KEY_BEST_COOP_WAVE = 'tank-world.best-coop-wave';

// --- R15 additions (consensus §3.27, summoner boss) ---

/** Summoner: ms between reinforcement calls — normal / rage (HP ≤ 50%). */
export const SUMMON_MS = 4_000;
export const SUMMON_RAGE_MS = 2_000;
export const SUMMONER_HP = ENEMY_HP.SUMMONER;
export const SUMMONER_SCORE = ENEMY_SCORE.SUMMONER;

// --- R16 additions (consensus §3.28, guardian boss) ---

/** Guardian moves at 0.6x base speed (slow tank). */
export const GUARDIAN_SPEED_FACTOR = 0.6;
export const GUARDIAN_HP = ENEMY_HP.GUARDIAN;
export const GUARDIAN_SCORE = ENEMY_SCORE.GUARDIAN;
/** Self-shield: ms between shield raises (normal / rage HP≤50%) + active span. */
export const GUARD_CYCLE_MS = 5_000;
export const GUARD_RAGE_CYCLE_MS = 3_000;
export const GUARD_ACTIVE_MS = 2_000;

// --- R18 additions (consensus §3.30, combo scoring) ---

/** Combo: ms window between kills to keep the streak alive. */
export const COMBO_WINDOW_MS = 3_000;
/** Combo: score multiplier step per combo level (mult = 1 + STEP*min(n-1, CAP)). */
export const COMBO_STEP = 0.1;
/** Combo: cap on the multiplier steps (CAP=10 → max ×2.0). */
export const COMBO_CAP = 10;

// --- R19 additions (consensus §3.31, difficulty) ---

/** Enemy speed multiplier by difficulty (NORMAL=1.0 → zero-regression anchor). */
export const DIFFICULTY_SPEED_FACTOR: Record<Difficulty, number> = {
  [Difficulty.EASY]: 0.85,
  [Difficulty.NORMAL]: 1.0,
  [Difficulty.HARD]: 1.2,
};
/** Spawn-interval multiplier by difficulty (HARD<1 → faster spawns). */
export const DIFFICULTY_INTERVAL_FACTOR: Record<Difficulty, number> = {
  [Difficulty.EASY]: 1.3,
  [Difficulty.NORMAL]: 1.0,
  [Difficulty.HARD]: 0.75,
};
