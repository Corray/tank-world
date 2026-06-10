// T-BOSS-1~7 — Boss fight (test-plan-r11 §3). R11：高复用（多 HP/fieldClear/C5 全
// 复用），净新仅 isBossLevel+注入 + 阶段 AI。结构/复用断言锁定时先绿；净新行为
// （isBossLevel/注入/三向弹幕）骨架阶段 FAIL→impl 转绿。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameState, EnemyType, Direction } from '../src/core/types';
import { startVersus, startMelee } from '../src/core/game';
import { judge } from '../src/core/update';
import { createWorld } from '../src/core/world';
import { createEnemy, updateEnemies } from '../src/enemy/enemy';
import { firePlayerBullet } from '../src/combat/combat';
import { loadLevel, isBossLevel } from '../src/level/level';
import { ENEMY_HP, ENEMY_SCORE, BOSS_HP, BOSS_SCORE, STEP_MS } from '../src/core/constants';
import { makeWorld, emptyLayout, cellCenter, runCombat } from './helpers';

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

describe('T-BOSS-1 isBossLevel — campaign end + endless milestones', () => {
  it('L3 and every 5th endless level are boss levels; others are not', () => {
    expect(isBossLevel(3)).toBe(true); // campaign climax
    expect(isBossLevel(8)).toBe(true); // endless L8 (3+5)
    expect(isBossLevel(13)).toBe(true);
    expect(isBossLevel(1)).toBe(false);
    expect(isBossLevel(2)).toBe(false);
    expect(isBossLevel(4)).toBe(false);
    expect(isBossLevel(7)).toBe(false);
  });
});

describe('T-BOSS-2 loadLevel injects a BOSS as the last enemy on boss levels', () => {
  it('L3 spawn sequence ends with BOSS and enemyTotal includes it', () => {
    const world = makeWorld();
    loadLevel(world, 3);
    const seq = world.spawnSequence;
    expect(seq[seq.length - 1]).toBe(EnemyType.BOSS);
    expect(world.enemyTotal).toBe(19); // L3 base 18 + 1 boss
  });
});

describe('T-BOSS-3 BOSS attributes', () => {
  it('high HP and high score', () => {
    const boss = createEnemy(EnemyType.BOSS, cellCenter(0, 6));
    expect(boss.hp).toBe(BOSS_HP);
    expect(boss.score).toBe(BOSS_SCORE);
  });
});

describe('T-BOSS-4 phase rage', () => {
  it('4a: HP ≤ 50% fires a three-way spread in one tick', () => {
    const world = makeWorld(emptyLayout());
    const boss = createEnemy(EnemyType.BOSS, cellCenter(2, 6));
    boss.alive = true;
    boss.hp = Math.floor(BOSS_HP / 2); // rage threshold
    boss.dir = Direction.DOWN;
    boss.ai.fireMs = 0;
    world.enemies.push(boss);
    const before = world.bullets.length;
    updateEnemies(world, STEP_MS);
    expect(world.bullets.length - before).toBe(3);
  });

  it('4b: HP > 50% fires a single bullet', () => {
    const world = makeWorld(emptyLayout());
    const boss = createEnemy(EnemyType.BOSS, cellCenter(2, 6));
    boss.alive = true;
    boss.hp = BOSS_HP; // normal phase
    boss.dir = Direction.DOWN;
    boss.ai.fireMs = 0;
    world.enemies.push(boss);
    const before = world.bullets.length;
    updateEnemies(world, STEP_MS);
    expect(world.bullets.length - before).toBe(1);
  });
});

describe('T-BOSS-5 boss death → score + field clear (reuse)', () => {
  it('killing the last-standing boss banks BOSS_SCORE and clears the level', () => {
    const world = makeWorld(emptyLayout());
    world.enemyTotal = 1;
    world.spawnedCount = 1; // boss is the only/last enemy
    const boss = createEnemy(EnemyType.BOSS, cellCenter(6, 8));
    boss.alive = true;
    boss.hp = 1; // one-shot for the test
    world.enemies.push(boss);
    world.players[0].pos = cellCenter(6, 2);
    world.players[0].dir = Direction.RIGHT;
    firePlayerBullet(world, world.players[0]);
    runCombat(world, 2000);
    expect(world.score).toBe(BOSS_SCORE);
    judge(world);
    expect(world.state).toBe(GameState.LEVEL_CLEAR);
  });
});

describe('T-BOSS-6 boss is PvE-only (no boss in VS / MELEE)', () => {
  it('VERSUS has no enemies; MELEE spawn sequence has no BOSS', () => {
    const vs = createWorld();
    startVersus(vs);
    expect(vs.enemyTotal).toBe(0);
    const mel = createWorld();
    startMelee(mel);
    expect(mel.spawnSequence.includes(EnemyType.BOSS)).toBe(false);
  });
});

describe('T-BOSS-7 existing enemy types unchanged (exhaustive-map regression)', () => {
  it('BASIC/FAST/ARMORED hp & score keep their values', () => {
    expect(ENEMY_HP.BASIC).toBe(1);
    expect(ENEMY_HP.ARMORED).toBe(3);
    expect(ENEMY_SCORE.FAST).toBe(200);
    expect(createEnemy(EnemyType.ARMORED, cellCenter(0, 0)).hp).toBe(3);
  });
});
