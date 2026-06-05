// 回归测试 — issue #13（重试个人分清零）+ #14（DEMOLITION 限玩家拆除）。
// FAIL→PASS；PM 决策依据见各 issue 的决策记录 comment。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnemyType, Direction, BulletOwner } from '../src/core/types';
import { createWorld } from '../src/core/world';
import { startCoop } from '../src/core/game';
import { judge } from '../src/core/update';
import { retryLevel } from '../src/level/level';
import { makeWorld, cellCenter, makeBullet, addEnemy, runCombat } from './helpers';

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

describe('issue #13 — retry zeroes personal scores (PM 决策 a)', () => {
  it('both players personal scores reset on retry; banked kept', () => {
    const world = createWorld();
    startCoop(world);
    world.players[0].score = 300;
    world.players[1].score = 200;
    world.bankedScore = 700;
    world.players.forEach((p) => { p.lives = 0; p.alive = false; });
    judge(world);
    retryLevel(world);
    expect(world.players[0].score).toBe(0);
    expect(world.players[1].score).toBe(0);
    expect(world.bankedScore).toBe(700); // 前关累计保留不变
  });

  it('invariant: after retry + one kill, sum(personal) === world.score', () => {
    const world = makeWorld();
    world.players[0].score = 100; // 上一次尝试的残留（模拟）
    world.players[0].lives = 0;
    world.players[0].alive = false;
    judge(world);
    retryLevel(world);
    addEnemy(world, EnemyType.BASIC, 6, 8);
    world.players[0].pos = cellCenter(6, 2);
    world.players[0].dir = Direction.RIGHT;
    world.bullets.push({ ...makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT), playerId: 1 });
    runCombat(world, 2000);
    expect(world.players[0].score).toBe(world.score); // 不变量恢复
  });
});
