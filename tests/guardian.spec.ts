// T-GRD-1~7 + G1 — guardian boss (test-plan-r16 §3). R16：净新 = GUARDIAN 周期
// 自我护盾 + 三循环轮换。结构层（枚举/常量/速度/锚）锁定先行；行为层（护盾
// 免疫/周期/轮换）FAIL→impl 转绿。守护块 5/G1 先绿。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnemyType, BulletOwner, Direction, isBossType } from '../src/core/types';
import { createEnemy, updateEnemies } from '../src/enemy/enemy';
import { loadLevel, applyWave } from '../src/level/level';
import {
  GUARDIAN_HP,
  GUARDIAN_SCORE,
  GUARDIAN_SPEED_FACTOR,
  GUARD_CYCLE_MS,
  GUARD_RAGE_CYCLE_MS,
  ENEMY_SPEED,
  STEP_MS,
} from '../src/core/constants';
import { makeWorld, cellCenter, addEnemy, makeBullet, runCombat } from './helpers';

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

describe('T-GRD-1 guardian attributes (structure guard)', () => {
  it('hp 12 / score 1200 / slow 0.6x; isBossType anchors all three bosses', () => {
    const g = createEnemy(EnemyType.GUARDIAN, cellCenter(0, 6));
    expect(g.hp).toBe(GUARDIAN_HP);
    expect(g.score).toBe(GUARDIAN_SCORE);
    expect(g.speed).toBe(ENEMY_SPEED * GUARDIAN_SPEED_FACTOR);
    expect(isBossType(EnemyType.GUARDIAN)).toBe(true);
  });
});

describe('T-GRD-2 active self-shield absorbs player bullets', () => {
  it('a shielded guardian takes no damage; once it lapses it does', () => {
    const world = makeWorld();
    const g = addEnemy(world, EnemyType.GUARDIAN, 6, 6);
    g.guardUntil = world.clock + 9_999; // shield up
    world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 2000);
    expect(g.hp).toBe(GUARDIAN_HP); // absorbed
    g.guardUntil = 0; // shield down
    world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 2000);
    expect(g.hp).toBeLessThan(GUARDIAN_HP); // now it bites
  });
});

describe('T-GRD-3 guardian raises a shield on its cycle', () => {
  it('when the guard clock elapses, guardUntil moves into the future', () => {
    const world = makeWorld();
    const g = addEnemy(world, EnemyType.GUARDIAN, 6, 6);
    g.ai.guardMs = 0; // due this step
    updateEnemies(world, STEP_MS);
    expect(g.guardUntil).toBeGreaterThan(world.clock);
  });
});

describe('T-GRD-4 rage shortens the shield cycle', () => {
  it('hp ≤ 50% reloads at GUARD_RAGE_CYCLE_MS; healthy at GUARD_CYCLE_MS', () => {
    const world = makeWorld();
    const g = addEnemy(world, EnemyType.GUARDIAN, 6, 6);
    g.hp = Math.floor(GUARDIAN_HP / 2);
    g.ai.guardMs = 0;
    updateEnemies(world, STEP_MS);
    expect(g.ai.guardMs).toBe(GUARD_RAGE_CYCLE_MS);
    g.hp = GUARDIAN_HP;
    g.ai.guardMs = 0;
    updateEnemies(world, STEP_MS);
    expect(g.ai.guardMs).toBe(GUARD_CYCLE_MS);
  });
});

describe('T-GRD-5 guardian neither sprays nor summons (guard)', () => {
  it('a raging guardian fires a single bullet per volley', () => {
    const world = makeWorld();
    const g = addEnemy(world, EnemyType.GUARDIAN, 6, 6);
    g.hp = 1; // deep rage
    g.ai.fireMs = 0;
    updateEnemies(world, STEP_MS);
    expect(world.bullets.length).toBeLessThanOrEqual(1);
    expect(world.enemies.filter((e) => e.type === EnemyType.BASIC)).toHaveLength(0);
  });
});

describe('T-GRD-6 loadLevel milestone — L18 is a GUARDIAN', () => {
  it('endless milestone index 3 rotates to GUARDIAN (L8 BOSS / L13 SUMMONER / L18 GUARDIAN)', () => {
    const world = makeWorld();
    loadLevel(world, 18);
    expect(world.spawnSequence[world.spawnSequence.length - 1]).toBe(EnemyType.GUARDIAN);
  });
});

describe('T-GRD-7 applyWave milestone — wave 15 is a GUARDIAN', () => {
  it('wave milestone index 3 rotates to GUARDIAN', () => {
    const world = makeWorld();
    applyWave(world, 15);
    expect(world.spawnSequence[world.spawnSequence.length - 1]).toBe(EnemyType.GUARDIAN);
  });
});

describe('T-GRD-G1 isBossType covers the full boss family (guard)', () => {
  it('BOSS / SUMMONER / GUARDIAN are boss-family; BASIC is not', () => {
    expect(isBossType(EnemyType.BOSS)).toBe(true);
    expect(isBossType(EnemyType.SUMMONER)).toBe(true);
    expect(isBossType(EnemyType.GUARDIAN)).toBe(true);
    expect(isBossType(EnemyType.BASIC)).toBe(false);
  });
});
