// T-CMB-1~6 + G1 — combo scoring (test-plan-r18 §3). R18：净新 = 连击倍率计分。
// 结构层（world.comboCount/comboUntil + 常量）锁定先行；行为层（combat 倍率/重置）
// FAIL→impl 转绿。守护块 3/G1 先绿（首杀 ×1 = 单杀零回归）。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnemyType, BulletOwner, Direction } from '../src/core/types';
import { loadLevel } from '../src/level/level';
import { damagePlayer } from '../src/player/player';
import {
  ENEMY_SCORE,
  COMBO_WINDOW_MS,
  COMBO_CAP,
  COMBO_STEP,
} from '../src/core/constants';
import { makeWorld, emptyLayout, cellCenter, addEnemy, makeBullet, runCombat } from './helpers';

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

const BASIC = ENEMY_SCORE.BASIC; // 100

/** Kill one BASIC at (6,8) with a player bullet from (6,4); returns after combat. */
function killOne(world: ReturnType<typeof makeWorld>): void {
  addEnemy(world, EnemyType.BASIC, 6, 8);
  world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT));
  runCombat(world, 1000);
}

describe('T-CMB-1 consecutive kills within the window build a combo', () => {
  it('2nd kill → comboCount 2, scored ×1.1 (100 + 110 = 210)', () => {
    const world = makeWorld();
    killOne(world); // combo 1, +100
    killOne(world); // combo 2 (within 3s), +110
    expect(world.comboCount).toBe(2);
    expect(world.score).toBe(BASIC + Math.round(BASIC * (1 + COMBO_STEP)));
  });
});

describe('T-CMB-2 a kill after the window resets the streak to 1', () => {
  it('idle past COMBO_WINDOW_MS → next kill scores at ×1 again', () => {
    const world = makeWorld();
    killOne(world); // combo 1
    runCombat(world, COMBO_WINDOW_MS + 500); // idle, window lapses
    killOne(world); // combo back to 1, +100 (not 110)
    expect(world.comboCount).toBe(1);
    expect(world.score).toBe(BASIC + BASIC);
  });
});

describe('T-CMB-3 single kill is unmultiplied (zero-regression guard)', () => {
  it('first kill scores exactly base value, combo 1', () => {
    const world = makeWorld();
    killOne(world);
    expect(world.score).toBe(BASIC);
    expect(world.comboCount).toBe(1);
  });
});

describe('T-CMB-4 multiplier caps at ×2', () => {
  it('a deep streak awards at most round(base × 2)', () => {
    const world = makeWorld(emptyLayout());
    world.comboCount = 50; // already deep in a streak
    world.comboUntil = world.clock + COMBO_WINDOW_MS;
    killOne(world); // comboCount 51 → mult = 1 + STEP*min(50, CAP)= ×2
    expect(world.comboCount).toBe(51);
    expect(world.score).toBe(Math.round(BASIC * (1 + COMBO_STEP * COMBO_CAP)));
  });
});

describe('T-CMB-5 player death breaks the streak', () => {
  it('damagePlayer resets comboCount/comboUntil to 0', () => {
    const world = makeWorld();
    world.comboCount = 5;
    world.comboUntil = world.clock + COMBO_WINDOW_MS;
    damagePlayer(world, world.players[0]);
    expect(world.comboCount).toBe(0);
    expect(world.comboUntil).toBe(0);
  });
});

describe('T-CMB-6 level transition resets the streak', () => {
  it('loadLevel zeroes the combo (fresh level)', () => {
    const world = makeWorld();
    world.comboCount = 7;
    world.comboUntil = world.clock + COMBO_WINDOW_MS;
    loadLevel(world, 2);
    expect(world.comboCount).toBe(0);
    expect(world.comboUntil).toBe(0);
  });
});

describe('T-CMB-G1 combo constants exist (structure guard)', () => {
  it('window / step / cap are defined; cap yields a ×2 ceiling', () => {
    expect(COMBO_WINDOW_MS).toBeGreaterThan(0);
    expect(1 + COMBO_STEP * COMBO_CAP).toBeCloseTo(2.0, 5);
  });
});
