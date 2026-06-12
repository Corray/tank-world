// T-SUM-1~9 + G1/G2 — summoner boss (test-plan-r15 §3). R15：净新 = SUMMONER
// 召唤 AI + bossTypeFor 轮换。结构层（枚举/常量/锚/桩）锁定先行；行为层
// FAIL→impl 转绿。守护块 1/G1/G2 先绿（8 为假绿形态，R13-G2 同款，已留痕）。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnemyType, GameState, isBossType } from '../src/core/types';
import { createEnemy, updateEnemies } from '../src/enemy/enemy';
import { loadLevel, applyWave, bossTypeFor } from '../src/level/level';
import { judge } from '../src/core/update';
import {
  SUMMONER_HP,
  SUMMONER_SCORE,
  SUMMON_MS,
  SUMMON_RAGE_MS,
  ENEMY_SPEED,
  ENEMY_CONCURRENT,
  STEP_MS,
  FREEZE_MS,
} from '../src/core/constants';
import { makeWorld, cellCenter, addEnemy } from './helpers';

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

/** A summoner alone on an empty field, timers parked except the summon clock. */
function makeSummoner(summonMs = 0) {
  const world = makeWorld();
  const s = addEnemy(world, EnemyType.SUMMONER, 6, 6);
  s.ai.fireMs = 999_999; // isolate summoning from shooting
  s.ai.turnMs = 999_999;
  s.ai.summonMs = summonMs;
  return { world, s };
}

describe('T-SUM-1 summoner attributes (structure guard)', () => {
  it('hp 6 / score 800 / base speed; isBossType anchors both bosses', () => {
    const s = createEnemy(EnemyType.SUMMONER, cellCenter(0, 6));
    expect(s.hp).toBe(SUMMONER_HP);
    expect(s.score).toBe(SUMMONER_SCORE);
    expect(s.speed).toBe(ENEMY_SPEED);
    expect(isBossType(EnemyType.SUMMONER)).toBe(true);
    expect(isBossType(EnemyType.BOSS)).toBe(true);
    expect(isBossType(EnemyType.BASIC)).toBe(false);
  });
});

describe('T-SUM-2 bossTypeFor — odd BOSS / even SUMMONER', () => {
  it('rotates deterministically by milestone index', () => {
    expect(bossTypeFor(1)).toBe(EnemyType.BOSS);
    expect(bossTypeFor(2)).toBe(EnemyType.SUMMONER);
    expect(bossTypeFor(3)).toBe(EnemyType.BOSS);
    expect(bossTypeFor(4)).toBe(EnemyType.SUMMONER);
  });
});

describe('T-SUM-3 loadLevel milestone rotation', () => {
  it('L3 and L8 end with BOSS; L13 ends with SUMMONER', () => {
    const world = makeWorld();
    loadLevel(world, 3);
    expect(world.spawnSequence[world.spawnSequence.length - 1]).toBe(EnemyType.BOSS);
    loadLevel(world, 8);
    expect(world.spawnSequence[world.spawnSequence.length - 1]).toBe(EnemyType.BOSS);
    loadLevel(world, 13);
    expect(world.spawnSequence[world.spawnSequence.length - 1]).toBe(EnemyType.SUMMONER);
  });
});

describe('T-SUM-4 applyWave milestone rotation', () => {
  it('wave 5 ends with BOSS; wave 10 ends with SUMMONER', () => {
    const world = makeWorld();
    applyWave(world, 5);
    expect(world.spawnSequence[world.spawnSequence.length - 1]).toBe(EnemyType.BOSS);
    applyWave(world, 10);
    expect(world.spawnSequence[world.spawnSequence.length - 1]).toBe(EnemyType.SUMMONER);
  });
});

describe('T-SUM-5 summoning adds a BASIC without touching spawn accounting', () => {
  it('one step at summonMs=0 → +1 BASIC; spawnedCount/enemyTotal unchanged', () => {
    const { world } = makeSummoner(0);
    const spawned = world.spawnedCount;
    const total = world.enemyTotal;
    updateEnemies(world, STEP_MS);
    const basics = world.enemies.filter((e) => e.type === EnemyType.BASIC);
    expect(basics).toHaveLength(1);
    expect(world.spawnedCount).toBe(spawned);
    expect(world.enemyTotal).toBe(total);
  });
});

describe('T-SUM-6 summoning respects the concurrent cap', () => {
  it('with ENEMY_CONCURRENT alive on field, no reinforcement appears', () => {
    const { world } = makeSummoner(0);
    for (let i = 1; i < ENEMY_CONCURRENT; i++) addEnemy(world, EnemyType.FAST, 2, 2 + i * 2);
    const before = world.enemies.length;
    updateEnemies(world, STEP_MS);
    expect(world.enemies.length).toBe(before);
  });
});

describe('T-SUM-7 rage halves the summon interval', () => {
  it('normal reload = SUMMON_MS; at hp ≤ 50% reload = SUMMON_RAGE_MS', () => {
    const { world, s } = makeSummoner(0);
    updateEnemies(world, STEP_MS); // summons, reloads at normal pace
    expect(s.ai.summonMs).toBe(SUMMON_MS);
    s.hp = Math.floor(SUMMONER_HP / 2);
    s.ai.summonMs = 0;
    updateEnemies(world, STEP_MS);
    expect(s.ai.summonMs).toBe(SUMMON_RAGE_MS);
  });
});

describe('T-SUM-8 freeze gates summoning (guard via global clock)', () => {
  it('inside a FREEZE window the summon clock never fires', () => {
    const { world } = makeSummoner(0);
    world.freezeUntil = world.clock + FREEZE_MS;
    updateEnemies(world, STEP_MS);
    expect(world.enemies.filter((e) => e.type === EnemyType.BASIC)).toHaveLength(0);
  });
});

describe('T-SUM-9 reinforcements count toward field clear', () => {
  it('killing the summoner alone does NOT clear; killing its spawn does', () => {
    const { world, s } = makeSummoner(0);
    world.spawnedCount = world.enemyTotal; // summoner is the staged last enemy
    updateEnemies(world, STEP_MS); // one BASIC called in
    s.alive = false; // decapitation…
    judge(world);
    expect(world.state).toBe(GameState.PLAYING); // …is not enough
    for (const e of world.enemies) e.alive = false;
    judge(world);
    expect(world.state).toBe(GameState.LEVEL_CLEAR);
  });
});

describe('T-SUM-G1 summoner never fires the three-way spread (guard)', () => {
  it('a raging summoner fires a single bullet per volley', () => {
    const { world, s } = makeSummoner(999_999);
    s.hp = 1; // deep in rage
    s.ai.fireMs = 0;
    updateEnemies(world, STEP_MS);
    expect(world.bullets.length).toBeLessThanOrEqual(1);
  });
});

describe('T-SUM-G2 non-milestones stay boss-free (guard, widens T-WAV-3)', () => {
  it('wave 4 and L7 contain no boss-family enemy at all', () => {
    const world = makeWorld();
    applyWave(world, 4);
    expect(world.spawnSequence.some((t) => isBossType(t))).toBe(false);
    loadLevel(world, 7);
    expect(world.spawnSequence.some((t) => isBossType(t))).toBe(false);
  });
});
