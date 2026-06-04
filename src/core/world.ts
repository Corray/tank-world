// World: the single source of game state, owned by core (architecture §3.3).

import { PLAYER_LIVES, PLAYER_SPEED, CELL } from './constants';
import { GameState, Direction, type PlayerTank, type EnemyTank, type Bullet } from './types';
import { GameMap } from '../map/map';

export interface World {
  state: GameState;
  /** Game clock in ms; advances only while PLAYING (drives AC-11 freeze). */
  clock: number;
  map: GameMap;
  player: PlayerTank;
  enemies: EnemyTank[];
  bullets: Bullet[];
  score: number;
  spawnedCount: number;
  /** ms until the next spawn attempt is allowed. */
  spawnCooldownMs: number;
  spawnCursor: number;
}

/** Player spawn cell (12,4) — data-model §7. */
const PLAYER_SPAWN = { x: 4 * CELL + CELL / 2, y: 12 * CELL + CELL / 2 };

export function createPlayer(): PlayerTank {
  return {
    pos: { ...PLAYER_SPAWN },
    dir: Direction.UP,
    speed: PLAYER_SPEED,
    alive: true,
    lives: PLAYER_LIVES,
    invincibleUntil: 0,
    spawnPos: { ...PLAYER_SPAWN },
  };
}

export function createWorld(): World {
  return {
    state: GameState.READY,
    clock: 0,
    map: new GameMap(),
    player: createPlayer(),
    enemies: [],
    bullets: [],
    score: 0,
    spawnedCount: 0,
    spawnCooldownMs: 0,
    spawnCursor: 0,
  };
}
