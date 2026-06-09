// T-UP-1~10 — tank upgrade / star (test-plan-r10 §3). R10：首个局内持久成长。
// 重点 = level 重置点矩阵（5 类：4 归 L1 + loadLevel 持久）。结构断言锁定时先绿；
// 行为断言（升级效果/cap/破钢/重置点/HUD）骨架阶段 FAIL→impl 转绿。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameState, Direction, BulletOwner, PowerupType, Terrain } from '../src/core/types';
import { startVersus, startMelee } from '../src/core/game';
import { createWorld } from '../src/core/world';
import { firePlayerBullet } from '../src/combat/combat';
import { updatePowerups, dropFromCarrier } from '../src/powerup/powerup';
import { loadLevel, retryLevel, setupVersus, setupMelee } from '../src/level/level';
import { damagePlayer } from '../src/player/player';
import { renderHud } from '../src/hud/hud';
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

describe('T-UP-1 star raises level, caps at 4', () => {
  it('pickup → +1 level; five stars cap at L4', () => {
    const world = makeWorld();
    const p = world.players[0];
    p.pos = cellCenter(6, 6);
    for (let i = 0; i < 5; i++) {
      world.powerups.push({ type: PowerupType.STAR, pos: cellCenter(6, 6) });
      updatePowerups(world);
    }
    expect(p.level).toBe(4); // 1→2→3→4→4(capped)→4(capped)
  });
});

describe('T-UP-2 L2 makes bullets faster', () => {
  it('L2 bullet speed > L1 bullet speed', () => {
    const world = makeWorld(emptyLayout());
    const p = world.players[0];
    p.pos = cellCenter(6, 2);
    p.dir = Direction.RIGHT;
    p.level = 1;
    firePlayerBullet(world, p);
    const l1 = world.bullets[0].speed;
    world.bullets = [];
    p.level = 2;
    firePlayerBullet(world, p);
    expect(world.bullets[0].speed).toBeGreaterThan(l1);
  });
});

describe('T-UP-3 fire cap rises at L3', () => {
  it('L1 cap 1; L3 cap 2', () => {
    const world = makeWorld(emptyLayout());
    const p = world.players[0];
    p.pos = cellCenter(6, 2);
    p.dir = Direction.RIGHT;
    p.level = 1;
    expect(firePlayerBullet(world, p)).toBe(true);
    expect(firePlayerBullet(world, p)).toBe(false); // L1 capped at 1
    world.bullets = [];
    p.level = 3;
    expect(firePlayerBullet(world, p)).toBe(true);
    expect(firePlayerBullet(world, p)).toBe(true); // L3 second slot
    expect(firePlayerBullet(world, p)).toBe(false); // L3 capped at 2
  });
});

describe('T-UP-4 L4 breaks steel; lower levels and enemies do not', () => {
  it('4a: L4 player bullet destroys a steel cell', () => {
    const layout = emptyLayout();
    layout[6][10] = Terrain.STEEL;
    const world = makeWorld(layout);
    const p = world.players[0];
    p.pos = cellCenter(6, 2);
    p.dir = Direction.RIGHT;
    p.level = 4;
    firePlayerBullet(world, p);
    runCombat(world, 2000);
    expect(world.map.terrainAt(6, 10)).toBe(Terrain.EMPTY);
  });

  it('4b: L1 player bullet is blocked, steel intact (AC-2 regression)', () => {
    const layout = emptyLayout();
    layout[6][10] = Terrain.STEEL;
    const world = makeWorld(layout);
    const p = world.players[0];
    p.pos = cellCenter(6, 2);
    p.dir = Direction.RIGHT;
    p.level = 1;
    firePlayerBullet(world, p);
    runCombat(world, 2000);
    expect(world.map.terrainAt(6, 10)).toBe(Terrain.STEEL);
  });

  it('4c: enemy bullet never breaks steel', () => {
    const layout = emptyLayout();
    layout[6][10] = Terrain.STEEL;
    const world = makeWorld(layout);
    world.bullets.push(makeBullet(BulletOwner.ENEMY, cellCenter(6, 2), Direction.RIGHT));
    runCombat(world, 2000);
    expect(world.map.terrainAt(6, 10)).toBe(Terrain.STEEL);
  });
});

describe('T-UP-5 doubleFire alignment (no stacking past 2)', () => {
  it('5a: L1 + doubleFire → cap 2 (AC-18 regression)', () => {
    const world = makeWorld(emptyLayout());
    const p = world.players[0];
    p.pos = cellCenter(6, 2);
    p.dir = Direction.RIGHT;
    p.level = 1;
    p.doubleFire = true;
    expect(firePlayerBullet(world, p)).toBe(true);
    expect(firePlayerBullet(world, p)).toBe(true);
    expect(firePlayerBullet(world, p)).toBe(false); // capped at 2
  });

  it('5b: L3 + doubleFire → still 2 (no stack to 3)', () => {
    const world = makeWorld(emptyLayout());
    const p = world.players[0];
    p.pos = cellCenter(6, 2);
    p.dir = Direction.RIGHT;
    p.level = 3;
    p.doubleFire = true;
    expect(firePlayerBullet(world, p)).toBe(true);
    expect(firePlayerBullet(world, p)).toBe(true);
    expect(firePlayerBullet(world, p)).toBe(false); // still 2
  });
});

describe('T-UP-6 death resets to L1', () => {
  it('losing a life drops the tank to L1', () => {
    const world = makeWorld(emptyLayout());
    world.clock = 10_000;
    const p = world.players[0];
    p.level = 3;
    p.pos = cellCenter(6, 6);
    p.invincibleUntil = 0;
    damagePlayer(world, p);
    expect(p.level).toBe(1);
  });
});

describe('T-UP-7 reset-point matrix (4 reset to L1 / loadLevel persists)', () => {
  it('7a: createPlayer starts at L1', () => {
    expect(createWorld().players[0].level).toBe(1);
  });

  it('7b: retryLevel resets to L1', () => {
    const world = makeWorld();
    world.players[0].level = 3;
    world.state = GameState.DEFEAT;
    retryLevel(world);
    expect(world.players[0].level).toBe(1);
  });

  it('7c: setupVersus / setupMelee reset to L1', () => {
    const vs = createWorld();
    startVersus(vs);
    vs.players[0].level = 3;
    setupVersus(vs);
    expect(vs.players[0].level).toBe(1);
    const mel = createWorld();
    startMelee(mel);
    mel.players[0].level = 3;
    setupMelee(mel);
    expect(mel.players[0].level).toBe(1);
  });

  it('7d: loadLevel PRESERVES level (cross-level upgrade persists)', () => {
    const world = makeWorld();
    world.players[0].level = 3;
    loadLevel(world, 2);
    expect(world.players[0].level).toBe(3);
  });
});

describe('T-UP-8 star enters the carrier drop cycle (4-cycle)', () => {
  it('the 4th carrier drop is a STAR', () => {
    const world = makeWorld(emptyLayout());
    for (let i = 0; i < 4; i++) dropFromCarrier(world, cellCenter(2, 2));
    expect(world.powerups[3].type).toBe(PowerupType.STAR);
  });
});

describe('T-UP-9 upgrade applies in all modes (VERSUS)', () => {
  it('picking a star in VERSUS raises level', () => {
    const world = createWorld();
    startVersus(world);
    const p = world.players[0];
    p.pos = cellCenter(6, 6);
    world.powerups.push({ type: PowerupType.STAR, pos: cellCenter(6, 6) });
    updatePowerups(world);
    expect(p.level).toBe(2);
  });
});

describe('T-UP-10 HUD shows tank level', () => {
  it('renders an LV indicator', () => {
    const world = makeWorld();
    world.players[0].level = 3;
    const el = { innerHTML: '' } as unknown as HTMLElement;
    renderHud(el, world);
    expect(el.innerHTML).toContain('LV');
  });
});
