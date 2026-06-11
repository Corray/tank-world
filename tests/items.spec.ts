// T-ITM-1~10 + G1/G2 — powerup trio (test-plan-r12 §4). R12：净新 = 三新道具
// （铲/冻/命）+ 7-cycle + 定时效果生命周期。结构层（枚举/常量/字段/桩）锁定时
// 先行编译；行为层骨架阶段 FAIL→impl 转绿。守护块（9b/G1/G2）锁定时即绿。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameMode, PowerupType, EnemyType, Terrain } from '../src/core/types';
import { createWorld, createPlayer } from '../src/core/world';
import { startVersus } from '../src/core/game';
import { loadLevel, setupVersus } from '../src/level/level';
import { updateEnemies } from '../src/enemy/enemy';
import {
  dropFromCarrier,
  updatePowerups,
  updateShovel,
} from '../src/powerup/powerup';
import {
  onPickup,
  isUnlocked,
  AchievementId,
  ACHIEVEMENT_COUNT,
} from '../src/achievements/achievements';
import { SUB_ALL } from '../src/map/map';
import {
  SHOVEL_MS,
  FREEZE_MS,
  BASE_RING,
  STEP_MS,
  VS_POWERUP_INTERVAL_MS,
} from '../src/core/constants';
import { makeWorld, emptyLayout, cellCenter, addEnemy, runWorld } from './helpers';

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

/** Empty field with the PvE base at (12,6) and its inner brick ring. */
function baseLayout(): number[][] {
  const l = emptyLayout();
  l[12][6] = 3;
  for (const [r, c] of BASE_RING[1]) l[r][c] = 1;
  return l;
}

/** Drop a powerup onto the picker and run the pickup pass. */
function pickUp(world: ReturnType<typeof makeWorld>, type: PowerupType, picker = 0): void {
  const p = world.players[picker];
  world.powerups.push({ type, pos: { ...p.pos } });
  updatePowerups(world);
}

describe('T-ITM-1 carrier drop cycle is the 7-cycle (wrap)', () => {
  it('8 drops: shield→double-fire→bomb→star→shovel→freeze→life→shield', () => {
    const world = makeWorld();
    for (let i = 0; i < 8; i++) dropFromCarrier(world, cellCenter(2, 2));
    expect(world.powerups.map((p) => p.type)).toEqual([
      PowerupType.SHIELD,
      PowerupType.DOUBLE_FIRE,
      PowerupType.BOMB,
      PowerupType.STAR,
      PowerupType.SHOVEL,
      PowerupType.FREEZE,
      PowerupType.LIFE,
      PowerupType.SHIELD,
    ]);
  });
});

describe('T-ITM-2 shovel fortifies the base ring to steel', () => {
  it('all 5 ring cells turn STEEL (incl. a pre-destroyed one); base untouched', () => {
    const l = baseLayout();
    l[12][5] = 0; // pre-destroyed ring cell — shovel still covers it
    const world = makeWorld(l);
    world.players[0].pos = cellCenter(6, 6);
    pickUp(world, PowerupType.SHOVEL);
    for (const [r, c] of BASE_RING[1]) {
      expect(world.map.terrainAt(r, c)).toBe(Terrain.STEEL);
    }
    expect(world.map.terrainAt(12, 6)).toBe(Terrain.BASE);
    expect(world.shovelUntil[1]).toBeGreaterThan(0);
  });
});

describe('T-ITM-3 shovel expiry restores the full ring to fresh brick', () => {
  it('after SHOVEL_MS every ring cell is a full-mask BRICK and the clock clears', () => {
    const l = baseLayout();
    l[12][5] = 0;
    const world = makeWorld(l);
    world.players[0].pos = cellCenter(6, 6);
    pickUp(world, PowerupType.SHOVEL);
    world.clock += SHOVEL_MS + STEP_MS;
    updateShovel(world);
    for (const [r, c] of BASE_RING[1]) {
      expect(world.map.terrainAt(r, c)).toBe(Terrain.BRICK);
      expect(world.map.subMask(r, c)).toBe(SUB_ALL);
    }
    expect(world.shovelUntil[1]).toBe(0);
  });
});

describe('T-ITM-4 co-op shovel fortifies the SHARED bottom base (side 1)', () => {
  it('P2 picking in COOP fortifies side 1, never side 2', () => {
    const world = makeWorld(baseLayout());
    world.mode = GameMode.COOP;
    world.players.push(createPlayer(2));
    world.players[1].pos = cellCenter(6, 6);
    pickUp(world, PowerupType.SHOVEL, 1);
    for (const [r, c] of BASE_RING[1]) {
      expect(world.map.terrainAt(r, c)).toBe(Terrain.STEEL);
    }
    expect(world.shovelUntil[1]).toBeGreaterThan(0);
    expect(world.shovelUntil[2]).toBe(0);
  });
});

describe('T-ITM-5 versus shovel fortifies the PICKER side only', () => {
  it('P2 picking in VERSUS hardens the top ring; bottom ring stays brick', () => {
    const world = createWorld();
    startVersus(world);
    world.players[1].pos = cellCenter(6, 6);
    pickUp(world, PowerupType.SHOVEL, 1);
    for (const [r, c] of BASE_RING[2]) {
      expect(world.map.terrainAt(r, c)).toBe(Terrain.STEEL);
    }
    for (const [r, c] of BASE_RING[1]) {
      expect(world.map.terrainAt(r, c)).toBe(Terrain.BRICK);
    }
    expect(world.shovelUntil[2]).toBeGreaterThan(0);
    expect(world.shovelUntil[1]).toBe(0);
  });
});

describe('T-ITM-6 freeze immobilizes NPCs for the window', () => {
  it('frozen enemies neither move nor fire; both resume after expiry', () => {
    const world = makeWorld();
    const e = addEnemy(world, EnemyType.BASIC, 6, 6);
    e.ai.fireMs = 0;
    world.players[0].pos = cellCenter(12, 12);
    pickUp(world, PowerupType.FREEZE);
    const before = { ...e.pos };
    updateEnemies(world, STEP_MS);
    expect(e.pos).toEqual(before); // no movement while frozen
    expect(world.bullets).toHaveLength(0); // no fire while frozen
    world.clock += FREEZE_MS + STEP_MS;
    updateEnemies(world, STEP_MS);
    expect(world.bullets.length).toBeGreaterThan(0); // fires again after expiry
  });
});

describe('T-ITM-7 NPCs spawned inside the freeze window are frozen too', () => {
  it('a fresh enemy added during the window does not move or fire', () => {
    const world = makeWorld();
    world.players[0].pos = cellCenter(12, 12);
    pickUp(world, PowerupType.FREEZE);
    const e = addEnemy(world, EnemyType.FAST, 3, 3); // spawned mid-window
    e.ai.fireMs = 0;
    const before = { ...e.pos };
    updateEnemies(world, STEP_MS);
    expect(e.pos).toEqual(before);
    expect(world.bullets).toHaveLength(0);
  });
});

describe('T-ITM-8 life grants +1 life, uncapped', () => {
  it('lives 7 → 8 on pickup', () => {
    const world = makeWorld();
    world.players[0].lives = 7;
    world.players[0].pos = cellCenter(6, 6);
    pickUp(world, PowerupType.LIFE);
    expect(world.players[0].lives).toBe(8);
  });
});

/** Collect neutral-spawn types over N intervals (field cleared between). */
function collectNeutralTypes(cycles: number): PowerupType[] {
  const world = createWorld();
  startVersus(world);
  const seen: PowerupType[] = [];
  for (let i = 0; i < cycles; i++) {
    runWorld(world, VS_POWERUP_INTERVAL_MS + 100);
    seen.push(...world.powerups.map((pu) => pu.type));
    world.powerups = [];
  }
  return seen;
}

describe('T-ITM-9a versus neutral pool includes the shovel (4-cycle)', () => {
  it('a SHOVEL appears within 4 spawn intervals', () => {
    expect(collectNeutralTypes(4)).toContain(PowerupType.SHOVEL);
  });
});

describe('T-ITM-9b versus neutral pool never spawns freeze/life/bomb', () => {
  it('8 spawn intervals yield no FREEZE, LIFE or BOMB', () => {
    const seen = collectNeutralTypes(8);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen).not.toContain(PowerupType.FREEZE);
    expect(seen).not.toContain(PowerupType.LIFE);
    expect(seen).not.toContain(PowerupType.BOMB);
  });
});

describe('T-ITM-10 timed effects never cross levels or rounds', () => {
  it('loadLevel zeroes freezeUntil and both shovel clocks', () => {
    const world = makeWorld();
    world.freezeUntil = 123_456;
    world.shovelUntil = { 1: 111, 2: 222 };
    loadLevel(world, 2);
    expect(world.freezeUntil).toBe(0);
    expect(world.shovelUntil).toEqual({ 1: 0, 2: 0 });
  });

  it('setupVersus zeroes freezeUntil and both shovel clocks', () => {
    const world = createWorld();
    startVersus(world);
    world.freezeUntil = 999;
    world.shovelUntil = { 1: 5, 2: 7 };
    setupVersus(world);
    expect(world.freezeUntil).toBe(0);
    expect(world.shovelUntil).toEqual({ 1: 0, 2: 0 });
  });
});

describe('T-ITM-G1 achievement surface is untouched (guard)', () => {
  it('ACHIEVEMENT_COUNT stays 8; COLLECTOR still unlocks at 3 distinct types', () => {
    expect(ACHIEVEMENT_COUNT).toBe(8);
    const world = makeWorld();
    onPickup(world, PowerupType.SHOVEL);
    onPickup(world, PowerupType.FREEZE);
    expect(isUnlocked(AchievementId.COLLECTOR)).toBe(false);
    onPickup(world, PowerupType.LIFE);
    expect(isUnlocked(AchievementId.COLLECTOR)).toBe(true);
  });
});

describe('T-ITM-G2 7-cycle preserves the legacy 4-prefix (guard)', () => {
  it('the first 4 drops stay shield→double-fire→bomb→star', () => {
    const world = makeWorld();
    for (let i = 0; i < 4; i++) dropFromCarrier(world, cellCenter(2, 2));
    expect(world.powerups.map((p) => p.type)).toEqual([
      PowerupType.SHIELD,
      PowerupType.DOUBLE_FIRE,
      PowerupType.BOMB,
      PowerupType.STAR,
    ]);
  });
});
