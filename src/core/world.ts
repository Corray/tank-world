// World: the single source of game state, owned by core (architecture §3.3).

import { PLAYER_LIVES, PLAYER_SPEED, CELL } from './constants';
import {
  GameState,
  GameMode,
  Direction,
  type PlayerTank,
  type EnemyTank,
  type Bullet,
  type Powerup,
  type EnemyType,
  type Effect,
  type PowerupType,
} from './types';
import { GameMap } from '../map/map';
import { LEVELS, generateSpawnSequence } from '../level/level';

export interface World {
  state: GameState;
  /** Game clock in ms; advances only while PLAYING (drives AC-11 freeze). */
  clock: number;
  map: GameMap;
  /** R5: solo vs co-op (mode fork list in data-model §31). */
  mode: GameMode;
  /**
   * THE player state — length 1 (SOLO) or 2 (COOP). Single source.
   * R6-D: legacy `player` alias removed — explicit players[] access only.
   */
  players: PlayerTank[];
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
  /** R3: live visual effects (pure data, no collision — data-model §17). */
  effects: Effect[];
  /** R3: player-hit white flash deadline (game clock, ms). */
  flashUntil: number;
  /** R3: bankedScore at endless entry; -1 sentinel = not in an endless run. */
  endlessStartBanked: number;
  /** R3: wall-clock ms when GAME_COMPLETE was entered (anti-misfire window). */
  gameCompleteWallMs: number;
  /** R4: distinct powerup types picked up this run (COLLECTOR / PURIST). */
  runPickupTypes: PowerupType[];
  /** R4: lives snapshot at level load (NO_DEATH_LEVEL). */
  levelStartLives: number;
  /** R8 VERSUS: round wins per side (best-of-3, §3.21). */
  versusWins: Record<1 | 2, number>;
  /** R8 VERSUS: winner of the last settled round (interlude display); null = none. */
  versusRoundWinner: 1 | 2 | null;
  /** R8 VERSUS: match winner once a side reaches VS_WINS_NEEDED; null = ongoing. */
  versusMatchWinner: 1 | 2 | null;
  /** R8 VERSUS: ms until the next neutral powerup spawn (§3.21). */
  versusPowerupCooldownMs: number;
}

/** Player spawn cells: P1 (12,2) / P2 (12,10) — data-model §11/§31. */
const PLAYER_SPAWNS: Record<1 | 2, { x: number; y: number }> = {
  1: { x: 2 * CELL + CELL / 2, y: 12 * CELL + CELL / 2 },
  2: { x: 10 * CELL + CELL / 2, y: 12 * CELL + CELL / 2 },
};

export function createPlayer(id: 1 | 2 = 1): PlayerTank {
  const spawn = PLAYER_SPAWNS[id];
  return {
    id,
    pos: { ...spawn },
    dir: Direction.UP,
    speed: PLAYER_SPEED,
    alive: true,
    lives: PLAYER_LIVES,
    invincibleUntil: 0,
    spawnPos: { ...spawn },
    shieldUntil: 0,
    doubleFire: false,
    score: 0,
    levelStartLives: PLAYER_LIVES,
    kills: 0,
  };
}

export function createWorld(): World {
  const l1 = LEVELS[0];
  return {
    state: GameState.READY,
    clock: 0,
    map: new GameMap(l1.layout),
    mode: GameMode.SOLO,
    players: [createPlayer(1)],
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
    effects: [],
    flashUntil: 0,
    endlessStartBanked: -1,
    gameCompleteWallMs: 0,
    runPickupTypes: [],
    levelStartLives: PLAYER_LIVES,
    versusWins: { 1: 0, 2: 0 },
    versusRoundWinner: null,
    versusMatchWinner: null,
    versusPowerupCooldownMs: 0,
  };
}
