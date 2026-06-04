// All tunable game constants live here (architecture N4: no magic values).
// Default values are defined in docs/spec/data-model.md §1 — keep in sync.

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

/** Enemy hit points by type: BASIC / FAST / ARMORED (data-model §3). */
export const ENEMY_HP = { BASIC: 1, FAST: 1, ARMORED: 3 } as const;
/** Score awarded per destroyed enemy by type (consensus §3.3). */
export const ENEMY_SCORE = { BASIC: 100, FAST: 200, ARMORED: 400 } as const;

/** Enemy AI: ms between direction re-rolls. */
export const ENEMY_TURN_INTERVAL_MS = 1500;
/** Enemy AI: ms between shots (R2 balance: 1200 → 1800, consensus §3.9). */
export const ENEMY_FIRE_INTERVAL_MS = 1800;

// --- R2 additions (consensus §3.7~3.10) ---

/** Number of levels in a run. */
export const LEVEL_COUNT = 3;
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
