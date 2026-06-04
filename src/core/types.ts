// Shared enums and types (data-model §2/§3). N4: states are enums, not strings.

export enum GameState {
  READY = 'READY',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  VICTORY = 'VICTORY',
  DEFEAT = 'DEFEAT',
}

export enum Terrain {
  EMPTY = 0,
  BRICK = 1,
  STEEL = 2,
  BASE = 3,
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
}

export interface PlayerTank extends Tank {
  lives: number;
  /** Timestamp (game clock, ms) until which the player is invincible. */
  invincibleUntil: number;
  spawnPos: Vec;
}

export interface EnemyTank extends Tank {
  type: EnemyType;
  hp: number;
  score: number;
  /** AI timers, ms remaining. */
  ai: { turnMs: number; fireMs: number };
}

export interface Bullet {
  pos: Vec;
  dir: Direction;
  speed: number;
  owner: BulletOwner;
}

export const DIR_VEC: Record<Direction, Vec> = {
  [Direction.UP]: { x: 0, y: -1 },
  [Direction.DOWN]: { x: 0, y: 1 },
  [Direction.LEFT]: { x: -1, y: 0 },
  [Direction.RIGHT]: { x: 1, y: 0 },
};
