// T-MEL-1~11 — NPC melee / mixed VS (test-plan-r9 §3). R9 骨架：MELEE = VERSUS
// + NPC 第三方。结构断言（编译必需）锁定时先绿；行为断言（NPC 出生/双条件胜负含
// NPC 毁基地/友军火力扩 MELEE/回合 NPC 池/HUD）骨架阶段 FAIL→impl 转绿。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameState, GameMode, Direction, BulletOwner, PowerupType, EnemyType } from '../src/core/types';
import { startGame, startCoop, startVersus, startMelee } from '../src/core/game';
import { judge } from '../src/core/update';
import { createWorld } from '../src/core/world';
import { firePlayerBullet } from '../src/combat/combat';
import { updatePowerups } from '../src/powerup/powerup';
import { advanceVersusRound } from '../src/level/level';
import { isUnlocked, AchievementId } from '../src/achievements/achievements';
import { renderHud } from '../src/hud/hud';
import { GameMap } from '../src/map/map';
import {
  PLAYER_LIVES,
  CELL,
  MELEE_NPC_TOTAL,
  ENEMY_SCORE,
  KEY_BEST_TOTAL,
  KEY_BEST_LEVEL,
  KEY_BEST_ENDLESS,
  KEY_BEST_COOP,
  KEY_BEST_COOP_ENDLESS,
} from '../src/core/constants';
import { emptyLayout, cellCenter, makeBullet, addEnemy, runCombat, runWorld } from './helpers';
import type { World } from '../src/core/world';

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

/** Melee world (PLAYING). Optional layout override for self-contained combat tests. */
function makeMelee(layout?: number[][]): World {
  const world = createWorld();
  startMelee(world);
  if (layout) world.map = new GameMap(layout);
  return world;
}

describe('T-MEL-1 entering melee', () => {
  it('key "4" → mode MELEE, two players, PLAYING', () => {
    const world = createWorld();
    startMelee(world);
    expect(world.mode).toBe(GameMode.MELEE);
    expect(world.players).toHaveLength(2);
    expect(world.state).toBe(GameState.PLAYING);
  });

  it('SOLO / COOP / VERSUS entries unchanged (zero regression)', () => {
    const solo = createWorld();
    startGame(solo);
    expect(solo.mode).toBe(GameMode.SOLO);
    const coop = createWorld();
    startCoop(coop);
    expect(coop.mode).toBe(GameMode.COOP);
    const vs = createWorld();
    startVersus(vs);
    expect(vs.mode).toBe(GameMode.VERSUS);
  });
});

describe('T-MEL-2 melee arena setup', () => {
  it('P1 bottom / P2 top spawn; NPC pool > 0', () => {
    const world = createWorld();
    startMelee(world);
    expect(world.players[0].pos).toEqual(cellCenter(12, 2));
    expect(world.players[1].pos).toEqual(cellCenter(0, 10));
    expect(world.enemyTotal).toBe(MELEE_NPC_TOTAL);
  });
});

describe('T-MEL-3 NPCs spawn from neutral side cells (not the top row)', () => {
  it('spawned NPC sits at a mid-row neutral cell', () => {
    const world = makeMelee();
    runWorld(world, 60);
    expect(world.enemies.length).toBeGreaterThan(0);
    // Neutral cells are mid-rows (row 6); the PvE top row would be y ≈ 16.
    expect(world.enemies.every((e) => e.pos.y > CELL * 3)).toBe(true);
  });
});

describe('T-MEL-4 (C6′ reuse) NPC bullet damages a player', () => {
  it('an enemy bullet downs a non-invincible player', () => {
    const world = makeMelee(emptyLayout());
    world.clock = 10_000;
    world.players[1].pos = cellCenter(6, 6);
    world.players[1].invincibleUntil = 0;
    world.bullets.push(makeBullet(BulletOwner.ENEMY, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 1500);
    expect(world.players[1].lives).toBe(PLAYER_LIVES - 1);
  });
});

describe('T-MEL-5 dual-condition win (reused R8 judge), base destruction by ANY cause', () => {
  it('5a: P1 destroys P2 base → P1 wins the round', () => {
    const world = makeMelee();
    world.map.destroyBase(0); // P2 base (top)
    judge(world);
    expect(world.versusRoundWinner).toBe(1);
    expect(world.versusWins[1]).toBe(1);
    expect(world.state).toBe(GameState.VERSUS_ROUND);
  });

  it('5b: P1 base falls (e.g. by NPC) → P2 wins (cause-agnostic)', () => {
    const world = makeMelee();
    world.map.destroyBase(12); // P1 base (bottom)
    judge(world);
    expect(world.versusRoundWinner).toBe(2);
    expect(world.versusWins[2]).toBe(1);
  });
});

describe('T-MEL-6 (C5 reuse) NPC kills score per-player', () => {
  it("P1's NPC kill raises players[0].score only", () => {
    const world = makeMelee(emptyLayout());
    world.players[0].pos = cellCenter(6, 2);
    world.players[0].dir = Direction.RIGHT;
    world.players[1].pos = cellCenter(2, 2);
    addEnemy(world, EnemyType.BASIC, 6, 8);
    firePlayerBullet(world, world.players[0]);
    runCombat(world, 2000);
    expect(world.players[0].score).toBe(ENEMY_SCORE.BASIC);
    expect(world.players[1].score).toBe(0);
  });
});

describe('T-MEL-7 friendly fire reversed in MELEE (and regression elsewhere)', () => {
  it('7a: MELEE — P1 bullet downs P2', () => {
    const world = makeMelee(emptyLayout());
    world.clock = 10_000;
    world.players[0].pos = cellCenter(6, 2);
    world.players[0].dir = Direction.RIGHT;
    world.players[1].pos = cellCenter(6, 6);
    world.players[1].invincibleUntil = 0;
    firePlayerBullet(world, world.players[0]);
    runCombat(world, 2000);
    expect(world.players[1].lives).toBe(PLAYER_LIVES - 1);
  });

  it('7b: VERSUS friendly fire unchanged (regression)', () => {
    const world = createWorld();
    startVersus(world);
    world.map = new GameMap(emptyLayout());
    world.clock = 10_000;
    world.players[0].pos = cellCenter(6, 2);
    world.players[0].dir = Direction.RIGHT;
    world.players[1].pos = cellCenter(6, 6);
    world.players[1].invincibleUntil = 0;
    firePlayerBullet(world, world.players[0]);
    runCombat(world, 2000);
    expect(world.players[1].lives).toBe(PLAYER_LIVES - 1);
  });

  it('7c: COOP bullets still pass through (zero regression)', () => {
    const world = createWorld();
    startCoop(world);
    world.map = new GameMap(emptyLayout());
    world.clock = 10_000;
    world.players[0].pos = cellCenter(6, 2);
    world.players[0].dir = Direction.RIGHT;
    world.players[1].pos = cellCenter(6, 6);
    world.players[1].invincibleUntil = 0;
    firePlayerBullet(world, world.players[0]);
    runCombat(world, 2000);
    expect(world.players[1].lives).toBe(PLAYER_LIVES);
  });
});

describe('T-MEL-8 bomb clears NPCs, not players', () => {
  it('picking bomb wipes field NPCs while both players survive', () => {
    const world = makeMelee(emptyLayout());
    world.players[0].pos = cellCenter(6, 6);
    world.players[1].pos = cellCenter(2, 2);
    addEnemy(world, EnemyType.BASIC, 6, 8);
    addEnemy(world, EnemyType.FAST, 4, 4);
    world.powerups.push({ type: PowerupType.BOMB, pos: cellCenter(6, 6) });
    updatePowerups(world);
    expect(world.enemies.every((e) => !e.alive)).toBe(true);
    expect(world.players[0].alive).toBe(true);
    expect(world.players[1].alive).toBe(true);
  });
});

describe('T-MEL-9 best-of-3 round resets the NPC pool', () => {
  it('round win → interlude; advance revives both + refills NPC pool', () => {
    const world = makeMelee();
    world.map.destroyBase(0); // P1 wins round 1
    judge(world);
    expect(world.state).toBe(GameState.VERSUS_ROUND);
    expect(world.versusWins).toEqual({ 1: 1, 2: 0 });
    advanceVersusRound(world);
    expect(world.state).toBe(GameState.PLAYING);
    expect(world.players[0].lives).toBe(PLAYER_LIVES);
    expect(world.players[1].lives).toBe(PLAYER_LIVES);
    expect(world.enemyTotal).toBe(MELEE_NPC_TOTAL); // NPC pool refilled
    expect(world.spawnedCount).toBe(0);
    expect(world.versusWins).toEqual({ 1: 1, 2: 0 }); // wins preserved
  });
});

describe('T-MEL-10 melee writes no buckets and unlocks no achievements', () => {
  it('a round resolution touches none of the five score buckets / no FIRST_BLOOD', () => {
    const world = makeMelee();
    world.map.destroyBase(0);
    judge(world);
    for (const k of [KEY_BEST_TOTAL, KEY_BEST_LEVEL, KEY_BEST_ENDLESS, KEY_BEST_COOP, KEY_BEST_COOP_ENDLESS]) {
      expect(store.get(k)).toBeUndefined();
    }
    expect(isUnlocked(AchievementId.FIRST_BLOOD)).toBe(false);
  });
});

describe('T-MEL-11 HUD shows the melee state', () => {
  it('renders a VS round marker + both players', () => {
    const world = makeMelee();
    world.players[0].score = 300;
    const el = { innerHTML: '' } as unknown as HTMLElement;
    renderHud(el, world);
    expect(el.innerHTML).toContain('VS');
    expect(el.innerHTML).toContain('P2');
  });
});
