// 回归测试 — issue #14（DEMOLITION 限玩家拆除，PM 决策 a）。FAIL→PASS。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terrain, Direction, BulletOwner } from '../src/core/types';
import { isUnlocked, AchievementId } from '../src/achievements/achievements';
import { makeWorld, emptyLayout, cellCenter, makeBullet, runCombat } from './helpers';

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

function brickWorld() {
  const layout = emptyLayout();
  layout[6][6] = Terrain.BRICK;
  const world = makeWorld(layout);
  world.players[0].pos = cellCenter(12, 0);
  return world;
}

describe('issue #14 — DEMOLITION is player-only', () => {
  it('enemy bullets clearing the last brick do NOT unlock', () => {
    const world = brickWorld();
    for (const _ of [1, 2]) {
      world.bullets.push(makeBullet(BulletOwner.ENEMY, cellCenter(6, 4), Direction.RIGHT));
      runCombat(world, 1200);
    }
    expect(world.map.brickCellsRemaining()).toBe(0);
    expect(isUnlocked(AchievementId.DEMOLITION)).toBe(false);
  });

  it('player bullets clearing the last brick still unlock (regression)', () => {
    const world = brickWorld();
    for (const _ of [1, 2]) {
      world.bullets.push({ ...makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT), playerId: 1 as const });
      runCombat(world, 1200);
    }
    expect(isUnlocked(AchievementId.DEMOLITION)).toBe(true);
  });

  it('mixed clearing: player landing the last hit unlocks', () => {
    const world = brickWorld();
    world.bullets.push(makeBullet(BulletOwner.ENEMY, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 1200);
    world.bullets.push({ ...makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT), playerId: 1 as const });
    runCombat(world, 1200);
    expect(isUnlocked(AchievementId.DEMOLITION)).toBe(true);
  });
});
