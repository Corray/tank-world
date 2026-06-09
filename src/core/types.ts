// Shared enums and types (data-model §2/§3). N4: states are enums, not strings.

export enum GameState {
  READY = 'READY',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  /** A level (1..2) was cleared — interlude before the next level (R2 §3.7). */
  LEVEL_CLEAR = 'LEVEL_CLEAR',
  /** Level 3 cleared — the whole run is complete (R2 §3.7). */
  GAME_COMPLETE = 'GAME_COMPLETE',
  DEFEAT = 'DEFEAT',
  /** R3: died in endless mode — settlement screen, no retry (consensus §3.13). */
  ENDLESS_OVER = 'ENDLESS_OVER',
  /** R8: VERSUS between-round interlude — shows the score, next round on key (§3.21). */
  VERSUS_ROUND = 'VERSUS_ROUND',
  /** R8: VERSUS match settled (best-of-3 reached) — winner screen, R for a new match. */
  VERSUS_OVER = 'VERSUS_OVER',
}

/** R3: visual effect kinds (consensus §3.11) — pure visuals, no collision. */
export enum EffectKind {
  EXPLOSION = 'EXPLOSION',
  BASE_EXPLOSION = 'BASE_EXPLOSION',
  SPARK = 'SPARK',
  SCORE_FLOAT = 'SCORE_FLOAT',
  /** R4: achievement banner, top-center (consensus §3.16). */
  TOAST = 'TOAST',
}

export interface Effect {
  kind: EffectKind;
  pos: Vec;
  /** world.clock at spawn — pause freezes effects for free (AC-23). */
  bornAt: number;
  durationMs: number;
  /** SCORE_FLOAT text, e.g. '+400'. */
  text?: string;
  /** Explosion primary color (enemy vs player distinction). */
  color?: string;
}

export enum PowerupType {
  SHIELD = 'SHIELD',
  DOUBLE_FIRE = 'DOUBLE_FIRE',
  BOMB = 'BOMB',
}

export enum Terrain {
  EMPTY = 0,
  BRICK = 1,
  STEEL = 2,
  BASE = 3,
  /** R4: passable, hides tanks visually, bullets fly through (consensus §3.14). */
  BUSH = 4,
  /** R4: blocks tanks, bullets fly over. */
  WATER = 5,
  /** R4: passable with sliding inertia. */
  ICE = 6,
}

export enum EnemyType {
  BASIC = 'BASIC',
  FAST = 'FAST',
  ARMORED = 'ARMORED',
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export enum BulletOwner {
  PLAYER = 'PLAYER',
  ENEMY = 'ENEMY',
}

/** R5: solo vs local co-op; R8 adds VERSUS (1v1 PvP, consensus §3.17/§3.21). */
export enum GameMode {
  SOLO = 'SOLO',
  COOP = 'COOP',
  /** R8: local 2-player versus — adversarial, first opposing alignment (§3.21). */
  VERSUS = 'VERSUS',
  /** R9: NPC melee — VERSUS + NPC third party (PvE + PvP at once, §3.22). */
  MELEE = 'MELEE',
}

/** R9: PvP-family modes (friendly fire reversed + arena win logic) — §3.22. */
export function isPvP(mode: GameMode): boolean {
  return mode === GameMode.VERSUS || mode === GameMode.MELEE;
}

export interface Vec {
  x: number;
  y: number;
}

/** Common movable entity state: position is the collision-box center. */
export interface Tank {
  pos: Vec;
  dir: Direction;
  speed: number;
  alive: boolean;
  /** R4: ice sliding momentum; null/undefined = not sliding (data-model §24). */
  slide?: { dir: Direction; speed: number } | null;
}

export interface PlayerTank extends Tank {
  /** R5: player slot (key bindings / spawn / HUD attribution). */
  id: 1 | 2;
  lives: number;
  /** Timestamp (game clock, ms) until which the player is invincible. */
  invincibleUntil: number;
  spawnPos: Vec;
  /** R2: shield powerup invincibility deadline (game clock, ms). */
  shieldUntil: number;
  /** R2: double-fire powerup active (2 bullets on screen). */
  doubleFire: boolean;
  /** R5: personal cumulative score (display only; totals stay on World). */
  score: number;
  /** R7: lives snapshot at level load — NO_DEATH team judging (§36). */
  levelStartLives: number;
  /** R8: VERSUS frags — times this player downed the opponent (HUD only, §3.21). */
  kills: number;
}

export interface EnemyTank extends Tank {
  type: EnemyType;
  hp: number;
  score: number;
  /** AI timers, ms remaining. */
  ai: { turnMs: number; fireMs: number };
  /** R2: carries a powerup; flickers and drops it on death (consensus §3.8). */
  carrier: boolean;
}

/** R2: a dropped powerup waiting on the field to be picked up. */
export interface Powerup {
  type: PowerupType;
  pos: Vec;
}

export interface Bullet {
  pos: Vec;
  dir: Direction;
  speed: number;
  owner: BulletOwner;
  /** R5: which player fired it (fire-cap + score attribution, §30). */
  playerId?: 1 | 2;
}

export const DIR_VEC: Record<Direction, Vec> = {
  [Direction.UP]: { x: 0, y: -1 },
  [Direction.DOWN]: { x: 0, y: 1 },
  [Direction.LEFT]: { x: -1, y: 0 },
  [Direction.RIGHT]: { x: 1, y: 0 },
};
