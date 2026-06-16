// T-DIF-1~7 — difficulty selection (test-plan-r19 §3). R19：净新 = 难度缩放 +
// READY 切换。结构层（Difficulty enum/world 字段/因子表）锁定先行；行为层
// （cycleDifficulty/trySpawn 缩放）FAIL→impl 转绿。NORMAL=1.0 零回归锚。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameState, Difficulty } from '../src/core/types';
import { createWorld } from '../src/core/world';
import { cycleDifficulty } from '../src/core/game';
import { trySpawnEnemy } from '../src/enemy/enemy';
import {
  ENEMY_SPEED,
  DIFFICULTY_SPEED_FACTOR,
  DIFFICULTY_INTERVAL_FACTOR,
} from '../src/core/constants';
import { makeWorld } from './helpers';

beforeEach(() => {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  };
});
afterEach(() => {
  delete (globalThis as Record<string, unknown>).localStorage;
});

describe('T-DIF-1 default difficulty is NORMAL (structure guard)', () => {
  it('a fresh world starts on NORMAL', () => {
    expect(createWorld().difficulty).toBe(Difficulty.NORMAL);
  });
});

describe('T-DIF-2 D cycles difficulty in READY', () => {
  it('NORMAL → HARD → EASY → NORMAL', () => {
    const world = createWorld(); // READY by default
    expect(world.state).toBe(GameState.READY);
    cycleDifficulty(world);
    expect(world.difficulty).toBe(Difficulty.HARD);
    cycleDifficulty(world);
    expect(world.difficulty).toBe(Difficulty.EASY);
    cycleDifficulty(world);
    expect(world.difficulty).toBe(Difficulty.NORMAL);
  });
});

describe('T-DIF-3 difficulty is locked once PLAYING (guard)', () => {
  it('cycleDifficulty is a no-op outside READY', () => {
    const world = createWorld();
    world.difficulty = Difficulty.HARD;
    world.state = GameState.PLAYING;
    cycleDifficulty(world);
    expect(world.difficulty).toBe(Difficulty.HARD); // unchanged
  });
});

describe('T-DIF-4 factor tables are monotonic; NORMAL is the 1.0 anchor (guard)', () => {
  it('interval HARD<NORMAL<EASY; speed EASY<NORMAL<HARD; NORMAL=1.0', () => {
    expect(DIFFICULTY_INTERVAL_FACTOR[Difficulty.NORMAL]).toBe(1.0);
    expect(DIFFICULTY_SPEED_FACTOR[Difficulty.NORMAL]).toBe(1.0);
    expect(DIFFICULTY_INTERVAL_FACTOR[Difficulty.HARD]).toBeLessThan(1.0);
    expect(DIFFICULTY_INTERVAL_FACTOR[Difficulty.EASY]).toBeGreaterThan(1.0);
    expect(DIFFICULTY_SPEED_FACTOR[Difficulty.HARD]).toBeGreaterThan(1.0);
    expect(DIFFICULTY_SPEED_FACTOR[Difficulty.EASY]).toBeLessThan(1.0);
  });
});

describe('T-DIF-5 HARD shortens the spawn interval', () => {
  it('spawnCooldownMs after a spawn = interval × HARD factor', () => {
    const world = makeWorld();
    world.difficulty = Difficulty.HARD;
    world.spawnCooldownMs = 0;
    trySpawnEnemy(world, 0);
    expect(world.spawnCooldownMs).toBe(
      world.spawnIntervalMs * DIFFICULTY_INTERVAL_FACTOR[Difficulty.HARD],
    );
  });
});

describe('T-DIF-6 HARD speeds up spawned enemies', () => {
  it('a BASIC spawned on HARD moves at base × HARD speed factor', () => {
    const world = makeWorld();
    world.difficulty = Difficulty.HARD;
    world.spawnCooldownMs = 0;
    trySpawnEnemy(world, 0);
    const spawned = world.enemies[world.enemies.length - 1];
    expect(spawned.speed).toBe(ENEMY_SPEED * DIFFICULTY_SPEED_FACTOR[Difficulty.HARD]);
  });
});

describe('T-DIF-7 NORMAL applies no scaling (zero-regression guard)', () => {
  it('NORMAL spawn keeps base interval and base speed', () => {
    const world = makeWorld();
    world.difficulty = Difficulty.NORMAL;
    world.spawnCooldownMs = 0;
    const baseInterval = world.spawnIntervalMs;
    trySpawnEnemy(world, 0);
    expect(world.spawnCooldownMs).toBe(baseInterval);
    expect(world.enemies[world.enemies.length - 1].speed).toBe(ENEMY_SPEED);
  });
});
