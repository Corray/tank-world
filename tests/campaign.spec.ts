// T-CAMP-1~5 — campaign expansion L4/L5 (test-plan-r17 §3). R17：LEVEL_COUNT 3→5
// blast radius。新覆盖：L4/L5 配置、L5 终点 GAME_COMPLETE、无尽 L6 起、里程碑平移。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameState, Terrain, EnemyType } from '../src/core/types';
import { createWorld } from '../src/core/world';
import { loadLevel, isBossLevel, LEVELS, enterEndless } from '../src/level/level';
import { judge } from '../src/core/update';
import { LEVEL_COUNT, ENDLESS_CONFIRM_DELAY_MS } from '../src/core/constants';

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

function clearField(world: ReturnType<typeof createWorld>): void {
  world.spawnedCount = world.enemyTotal;
  world.enemies = [];
}

describe('T-CAMP-1 campaign is five levels with progressive difficulty', () => {
  it('LEVEL_COUNT=5; L4=22 enemies/1800ms, L5=26/1600ms', () => {
    expect(LEVEL_COUNT).toBe(5);
    expect(LEVELS).toHaveLength(5);
    const total = (i: number) =>
      LEVELS[i].enemyCounts.BASIC + LEVELS[i].enemyCounts.FAST + LEVELS[i].enemyCounts.ARMORED;
    expect(total(3)).toBe(22);
    expect(LEVELS[3].spawnIntervalMs).toBe(1800);
    expect(total(4)).toBe(26);
    expect(LEVELS[4].spawnIntervalMs).toBe(1600);
  });
});

describe('T-CAMP-2 L4/L5 load from LEVELS (campaign, not endless variant)', () => {
  it('loadLevel(4)/loadLevel(5) use the curated layouts with a base at (12,6)', () => {
    const world = createWorld();
    loadLevel(world, 4);
    expect(world.map.terrainAt(12, 6)).toBe(Terrain.BASE);
    expect(world.enemyTotal).toBe(22);
    loadLevel(world, 5);
    // L5 is the campaign climax → a BOSS is appended (enemyTotal 26 + 1).
    expect(world.enemyTotal).toBe(27);
    expect(world.spawnSequence[world.spawnSequence.length - 1]).toBe(EnemyType.BOSS);
  });
});

describe('T-CAMP-3 campaign end shifts to L5', () => {
  it('L5 clear → GAME_COMPLETE; L4 clear → LEVEL_CLEAR', () => {
    const w1 = createWorld();
    loadLevel(w1, 4);
    w1.state = GameState.PLAYING;
    clearField(w1);
    judge(w1);
    expect(w1.state).toBe(GameState.LEVEL_CLEAR); // L4 is not the end

    const w2 = createWorld();
    loadLevel(w2, 5);
    w2.state = GameState.PLAYING;
    clearField(w2);
    judge(w2);
    expect(w2.state).toBe(GameState.GAME_COMPLETE); // L5 is
  });
});

describe('T-CAMP-4 endless starts after the campaign (L6)', () => {
  it('enterEndless lands on LEVEL_COUNT+1', () => {
    const world = createWorld();
    world.state = GameState.GAME_COMPLETE;
    world.gameCompleteWallMs = 0;
    enterEndless(world, ENDLESS_CONFIRM_DELAY_MS + 100);
    expect(world.level).toBe(LEVEL_COUNT + 1);
    expect(world.level).toBe(6);
  });
});

describe('T-CAMP-5 boss milestones shift with LEVEL_COUNT', () => {
  it('isBossLevel: 5/10/15/20 true; 3/8/4/6/7 false', () => {
    for (const l of [5, 10, 15, 20]) expect(isBossLevel(l)).toBe(true);
    for (const l of [3, 4, 6, 7, 8]) expect(isBossLevel(l)).toBe(false);
  });
});
