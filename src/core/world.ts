// World: the single source of game state, owned by core (architecture §3.3).

import { PLAYER_LIVES, PLAYER_SPEED, CELL } from './constants';
import {
  GameState,
  Direction,
  type PlayerTank,
  type EnemyTank,
  type Bullet,
  type Powerup,
  type EnemyType,
} from './types';
import { GameMap } from '../map/map';
import { LEVELS, generateSpawnSequence } from '../level/level';

export interface World {
  state: GameState;
  /** Game clock in ms; advances only while PLAYING (drives AC-11 freeze). */
  clock: number;
  map: GameMap;
  player: PlayerTank;
  enemies: EnemyTank[];
  bullets: Bullet[];
  /** Current-level score (banks into bankedScore on LEVEL_CLEAR, AC-15). */
  score: number;
  /** R2: accumulated score of previously cleared levels. */
  bankedScore: number;
  /** R2: last settled level score, kept for the interlude screen. */
  lastLevelScore: number;
  /** R2: current level, 1-based. */
  level: number;
  /** R2: this level's enemy total / spawn order / spawn interval. */
  enemyTotal: number;
  spawnSequence: EnemyType[];
  spawnIntervalMs: number;
  spawnedCount: number;
  /** ms until the next spawn attempt is allowed. */
  spawnCooldownMs: number;
  spawnCursor: number;
  /** R2: dropped powerups on the field + fixed drop cycle cursor. */
  powerups: Powerup[];
  powerupDropCursor: number;
}

/** Player spawn cell (12,2) — data-model §11 (moved left for the double ring). */
const PLAYER_SPAWN = { x: 2 * CELL + CELL / 2, y: 12 * CELL + CELL / 2 };

export function createPlayer(): PlayerTank {
  return {
    pos: { ...PLAYER_SPAWN },
    dir: Direction.UP,
    speed: PLAYER_SPEED,
    alive: true,
    lives: PLAYER_LIVES,
    invincibleUntil: 0,
    spawnPos: { ...PLAYER_SPAWN },
    shieldUntil: 0,
    doubleFire: false,
  };
}

export function createWorld(): World {
  const l1 = LEVELS[0];
  return {
    state: GameState.READY,
    clock: 0,
    map: new GameMap(l1.layout),
    player: createPlayer(),
    enemies: [],
    bullets: [],
    score: 0,
    bankedScore: 0,
    lastLevelScore: 0,
    level: 1,
    enemyTotal: l1.enemyCounts.BASIC + l1.enemyCounts.FAST + l1.enemyCounts.ARMORED,
    spawnSequence: generateSpawnSequence(l1.enemyCounts),
    spawnIntervalMs: l1.spawnIntervalMs,
    spawnedCount: 0,
    spawnCooldownMs: 0,
    spawnCursor: 0,
    powerups: [],
    powerupDropCursor: 0,
  };
}
