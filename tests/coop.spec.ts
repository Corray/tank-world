// T-2P-1~18 — local co-op (test-plan-r5 §2). 本轮骨架为验证规格（复数化原子性
// 致骨架后置，dogfood 偏离声明见实现总结）。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  GameState,
  GameMode,
  Terrain,
  Direction,
  BulletOwner,
  PowerupType,
  EnemyType,
} from '../src/core/types';
import { startGame, startCoop } from '../src/core/game';
import { judge, updateWorld } from '../src/core/update';
import { createWorld } from '../src/core/world';
import { updatePlayer, damagePlayer } from '../src/player/player';
import { firePlayerBullet, moveTank } from '../src/combat/combat';
import { updatePowerups } from '../src/powerup/powerup';
import { loadLevel, retryLevel, enterEndless } from '../src/level/level';
import { decideDirection } from '../src/enemy/enemy';
import { isUnlocked, AchievementId } from '../src/achievements/achievements';
import {
  PLAYER_LIVES,
  CELL,
  TANK_SIZE,
  STEP_MS,
  SHIELD_MS,
  KEY_BEST_COOP,
  KEY_BEST_TOTAL,
  ENDLESS_CONFIRM_DELAY_MS,
} from '../src/core/constants';
import { SUB_ALL } from '../src/map/map';
import { makeWorld, emptyLayout, cellCenter, makeBullet, addEnemy, runCombat } from './helpers';
import type { World } from '../src/core/world';
import type { InputState } from '../src/input/input';

const IDLE: InputState = { move: null, fire: false };

let store: Map<string, string>;

beforeEach(() => {
  store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  };
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).localStorage;
});

/** Co-op world on an empty field (PLAYING). */
function makeCoop(layout: number[][] = emptyLayout()): World {
  const world = createWorld();
  startCoop(world);
  world.map = new (Object.getPrototypeOf(world.map).constructor)(layout);
  return world;
}

describe('T-2P-1 entering co-op', () => {
  it('two players, P2 at (12,10) with id 2, mode COOP', () => {
    const world = createWorld();
    startCoop(world);
    expect(world.mode).toBe(GameMode.COOP);
    expect(world.players).toHaveLength(2);
    expect(world.players[1].id).toBe(2);
    expect(world.players[1].pos).toEqual(cellCenter(12, 10));
    expect(world.state).toBe(GameState.PLAYING);
  });
});

describe('T-2P-2 READY mode selection', () => {
  it('action key → SOLO single player; "2" path → COOP; coop refused mid-game', () => {
    const solo = createWorld();
    startGame(solo);
    expect(solo.mode).toBe(GameMode.SOLO);
    expect(solo.players).toHaveLength(1);
    startCoop(solo); // not READY anymore → refused
    expect(solo.players).toHaveLength(1);
  });
});

describe('T-2P-3 defeat needs ALL players down (or the base)', () => {
  it('P1 out → game continues; P2 out → DEFEAT', () => {
    const world = makeCoop();
    world.players[0].lives = 0;
    world.players[0].alive = false;
    judge(world);
    expect(world.state).toBe(GameState.PLAYING);
    world.players[1].lives = 0;
    world.players[1].alive = false;
    judge(world);
    expect(world.state).toBe(GameState.DEFEAT);
  });

  it('base destroyed defeats even with both alive', () => {
    const world = makeCoop();
    world.map.destroyBase();
    judge(world);
    expect(world.state).toBe(GameState.DEFEAT);
  });
});

describe('T-2P-4 retry revives both at full lives', () => {
  it('both players back with 3 lives at own spawn', () => {
    const world = makeCoop();
    world.players[0].lives = 0;
    world.players[0].alive = false;
    world.players[1].lives = 0;
    world.players[1].alive = false;
    judge(world);
    retryLevel(world);
    expect(world.state).toBe(GameState.PLAYING);
    for (const p of world.players) {
      expect(p.lives).toBe(PLAYER_LIVES);
      expect(p.alive).toBe(true);
      expect(p.pos).toEqual(p.spawnPos);
    }
  });
});

describe('T-2P-5 co-op level progression keeps per-player lives', () => {
  it('lives carry across levels per player', () => {
    const world = makeCoop();
    world.players[1].lives = 2;
    world.spawnedCount = world.enemyTotal;
    judge(world);
    expect(world.state).toBe(GameState.LEVEL_CLEAR);
    loadLevel(world, 2);
    expect(world.players[0].lives).toBe(3);
    expect(world.players[1].lives).toBe(2);
  });
});

describe('T-2P-6 input lanes are independent', () => {
  it('P1 lane moves only P1; P2 lane moves only P2', () => {
    const world = makeCoop();
    world.players[0].pos = cellCenter(6, 3);
    world.players[1].pos = cellCenter(6, 9);
    const p1x = world.players[0].pos.x;
    const p2x = world.players[1].pos.x;
    updateWorld(world, STEP_MS * 10, [{ move: Direction.RIGHT, fire: false }, IDLE]);
    expect(world.players[0].pos.x).toBeGreaterThan(p1x);
    expect(world.players[1].pos.x).toBe(p2x);
    updateWorld(world, STEP_MS * 10, [IDLE, { move: Direction.LEFT, fire: false }]);
    expect(world.players[1].pos.x).toBeLessThan(p2x);
  });
});

describe('T-2P-7 fire cap is per player', () => {
  it("P1's live bullet does not block P2; double-fire caps are personal", () => {
    const world = makeCoop();
    world.players[0].pos = cellCenter(6, 2);
    world.players[1].pos = cellCenter(8, 2);
    world.players[0].dir = Direction.RIGHT;
    world.players[1].dir = Direction.RIGHT;
    expect(firePlayerBullet(world, world.players[0])).toBe(true);
    expect(firePlayerBullet(world, world.players[0])).toBe(false); // P1 capped
    expect(firePlayerBullet(world, world.players[1])).toBe(true); // P2 unaffected
    world.players[1].doubleFire = true;
    expect(firePlayerBullet(world, world.players[1])).toBe(true); // P2 second slot
    expect(firePlayerBullet(world, world.players[1])).toBe(false); // P2 capped at 2
  });
});

describe('T-2P-8 (C6′) enemy bullet hits exactly the struck player', () => {
  it('P2 takes the hit and respawns; P1 untouched', () => {
    const world = makeCoop();
    world.clock = 10_000;
    world.players[0].pos = cellCenter(2, 2);
    world.players[1].pos = cellCenter(6, 8);
    world.players[1].invincibleUntil = 0;
    world.bullets.push(makeBullet(BulletOwner.ENEMY, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 1500);
    expect(world.players[1].lives).toBe(2);
    expect(world.players[1].pos).toEqual(world.players[1].spawnPos);
    expect(world.players[0].lives).toBe(3);
  });
});

describe('T-2P-9 (C11′) players block each other without damage', () => {
  it('P1 pushing into P2 is blocked; both unharmed', () => {
    const world = makeCoop();
    world.players[0].pos = cellCenter(6, 6);
    world.players[1].pos = cellCenter(6, 7);
    for (let i = 0; i < 120; i++) moveTank(world, world.players[0], Direction.RIGHT, STEP_MS);
    expect(world.players[1].pos.x - world.players[0].pos.x).toBeGreaterThanOrEqual(TANK_SIZE);
    expect(world.players[0].lives).toBe(3);
    expect(world.players[1].lives).toBe(3);
  });
});

describe('T-2P-10 (C17) friendly bullets pass through players', () => {
  it("P1's bullet flies through P2 and eats the brick beyond", () => {
    const layout = emptyLayout();
    layout[6][10] = Terrain.BRICK;
    const world = makeCoop(layout);
    world.players[0].pos = cellCenter(6, 2);
    world.players[0].dir = Direction.RIGHT;
    world.players[1].pos = cellCenter(6, 6); // in the line of fire
    firePlayerBullet(world, world.players[0]);
    runCombat(world, 2000);
    expect(world.players[1].lives).toBe(3); // untouched
    expect(world.map.subMask(6, 10)).not.toBe(SUB_ALL); // brick beyond got hit
  });
});

describe('T-2P-11 powerup belongs to the picker', () => {
  it('P2 picks shield/double-fire → only P2 buffed; bomb clears for everyone', () => {
    const world = makeCoop();
    world.players[0].pos = cellCenter(2, 2);
    world.players[1].pos = cellCenter(6, 6);
    world.powerups.push({ type: PowerupType.SHIELD, pos: cellCenter(6, 6) });
    updatePowerups(world);
    expect(world.players[1].shieldUntil).toBe(world.clock + SHIELD_MS);
    expect(world.players[0].shieldUntil).toBe(0);
    world.powerups.push({ type: PowerupType.DOUBLE_FIRE, pos: cellCenter(6, 6) });
    updatePowerups(world);
    expect(world.players[1].doubleFire).toBe(true);
    expect(world.players[0].doubleFire).toBe(false);
    addEnemy(world, EnemyType.BASIC, 2, 10);
    world.powerups.push({ type: PowerupType.BOMB, pos: cellCenter(6, 6) });
    updatePowerups(world);
    expect(world.enemies.every((e) => !e.alive)).toBe(true);
  });
});

describe('T-2P-12 score attribution by bullet ownership', () => {
  it("P1's kill raises players[0].score and world.score only", () => {
    const world = makeCoop();
    world.players[0].pos = cellCenter(6, 2);
    world.players[0].dir = Direction.RIGHT;
    world.players[1].pos = cellCenter(2, 2);
    addEnemy(world, EnemyType.FAST, 6, 8);
    firePlayerBullet(world, world.players[0]);
    runCombat(world, 2000);
    expect(world.score).toBe(200);
    expect(world.players[0].score).toBe(200);
    expect(world.players[1].score).toBe(0);
  });
});

describe('T-2P-13 ARMORED hunts the nearest alive player', () => {
  it('bias flips to P2 once P1 is down (statistical)', () => {
    const world = makeCoop();
    world.players[0].alive = false; // P1 down
    world.players[0].lives = 0;
    world.players[1].pos = cellCenter(1, 11);
    const enemy = addEnemy(world, EnemyType.ARMORED, 1, 1);
    const picks = Array.from({ length: 200 }, () => decideDirection(world, enemy));
    const right = picks.filter((d) => d === Direction.RIGHT).length / picks.length;
    expect(right).toBeGreaterThanOrEqual(0.4); // toward P2 at (1,11)
    expect(right).toBeLessThanOrEqual(0.75);
  });
});

describe('T-2P-14/15 best-coop bucket isolation', () => {
  it('co-op completion writes best-coop only', () => {
    const world = makeCoop();
    loadLevel(world, 3);
    world.state = GameState.PLAYING;
    world.score = 800;
    world.spawnedCount = world.enemyTotal;
    judge(world);
    expect(world.state).toBe(GameState.GAME_COMPLETE);
    expect(store.get(KEY_BEST_COOP)).toBe('800');
    expect(store.get(KEY_BEST_TOTAL)).toBeUndefined(); // solo bucket untouched
  });

  it('solo completion never writes best-coop', () => {
    const world = makeWorld();
    loadLevel(world, 3);
    world.state = GameState.PLAYING;
    world.score = 500;
    world.spawnedCount = world.enemyTotal;
    judge(world);
    expect(store.get(KEY_BEST_TOTAL)).toBe('500');
    expect(store.get(KEY_BEST_COOP)).toBeUndefined();
  });
});

describe('T-2P-16 achievements are gated off in co-op', () => {
  it('kill / clear / pickup unlock nothing in COOP', () => {
    const world = makeCoop();
    addEnemy(world, EnemyType.BASIC, 6, 8);
    world.players[0].pos = cellCenter(6, 2);
    world.players[0].dir = Direction.RIGHT;
    firePlayerBullet(world, world.players[0]);
    runCombat(world, 2000);
    expect(isUnlocked(AchievementId.FIRST_BLOOD)).toBe(false);
    world.spawnedCount = world.enemyTotal;
    world.enemies.forEach((e) => (e.alive = false));
    judge(world);
    expect(isUnlocked(AchievementId.NO_DEATH_LEVEL)).toBe(false);
  });
});

describe('T-2P-17 no endless entry for co-op', () => {
  it('enterEndless refuses COOP GAME_COMPLETE', () => {
    const world = makeCoop();
    loadLevel(world, 3);
    world.state = GameState.PLAYING;
    world.spawnedCount = world.enemyTotal;
    judge(world);
    expect(world.state).toBe(GameState.GAME_COMPLETE);
    enterEndless(world, world.gameCompleteWallMs + ENDLESS_CONFIRM_DELAY_MS + 100);
    expect(world.state).toBe(GameState.GAME_COMPLETE); // refused
  });
});

describe('T-2P-18 solo compat contract', () => {
  it('SOLO world: single player and live alias identity', () => {
    const world = createWorld();
    expect(world.mode).toBe(GameMode.SOLO);
    expect(world.players).toHaveLength(1);
    expect(world.player).toBe(world.players[0]); // alias is the same object
    updatePlayer(world, STEP_MS, IDLE); // default-param path still works
    void damagePlayer;
    void CELL;
  });
});
