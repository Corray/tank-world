// T-CE-1~5 + T-ACH2-1~7 — 2P 无尽与成就团队语义（test-plan-r7，清单 v2 逐行推导）。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameState, GameMode, EnemyType, Direction, BulletOwner, PowerupType, Terrain } from '../src/core/types';
import { startCoop } from '../src/core/game';
import { judge } from '../src/core/update';
import { createWorld } from '../src/core/world';
import { loadLevel, enterEndless } from '../src/level/level';
import { firePlayerBullet } from '../src/combat/combat';
import { onPickup, isUnlocked, AchievementId } from '../src/achievements/achievements';
import { overlayLines } from '../src/render/render';
import {
  KEY_BEST_COOP_ENDLESS,
  KEY_BEST_ENDLESS,
  KEY_BEST_COOP,
  KEY_KILLS,
  ENDLESS_CONFIRM_DELAY_MS,
} from '../src/core/constants';
import { makeWorld, emptyLayout, cellCenter, makeBullet, addEnemy, runCombat } from './helpers';
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

function coopComplete(): World {
  const world = createWorld();
  startCoop(world);
  loadLevel(world, 5); // R17 基线修订（LEVEL_COUNT 3→5）：战役终点 L3→L5
  world.state = GameState.PLAYING;
  world.score = 100;
  world.spawnedCount = world.enemyTotal;
  judge(world);
  expect(world.state).toBe(GameState.GAME_COMPLETE);
  return world;
}

function intoEndless(world: World): void {
  enterEndless(world, world.gameCompleteWallMs + ENDLESS_CONFIRM_DELAY_MS + 100);
  expect(world.state).toBe(GameState.PLAYING);
}

describe('T-CE-1 co-op endless entry', () => {
  it('after the window: PLAYING L6 with both players, endless config live', () => {
    const world = coopComplete();
    intoEndless(world);
    expect(world.level).toBe(6); // R17: 无尽起点 L4→L6
    expect(world.players).toHaveLength(2);
    expect(world.enemyTotal).toBe(20);
    expect(world.mode).toBe(GameMode.COOP);
  });
});

describe('T-CE-2 sixth bucket isolation (COOP endless → best-coop-endless only)', () => {
  it('co-op endless death settles into the sixth bucket exclusively', () => {
    const world = coopComplete();
    const bestCoopAfterRun = store.get(KEY_BEST_COOP);
    intoEndless(world);
    world.score = 700;
    world.map.destroyBase();
    judge(world);
    expect(world.state).toBe(GameState.ENDLESS_OVER);
    expect(store.get(KEY_BEST_COOP_ENDLESS)).toBe('700');
    expect(store.get(KEY_BEST_ENDLESS)).toBeUndefined(); // solo bucket untouched
    expect(store.get(KEY_BEST_COOP)).toBe(bestCoopAfterRun); // campaign bucket untouched
  });
});

describe('T-CE-3 solo endless regression (still the solo bucket)', () => {
  it('solo endless death writes best-endless, not the sixth bucket', () => {
    const world = createWorld();
    loadLevel(world, 5); // R17: 战役终点 L3→L5
    world.state = GameState.PLAYING;
    world.score = 100;
    world.spawnedCount = world.enemyTotal;
    judge(world);
    enterEndless(world, world.gameCompleteWallMs + ENDLESS_CONFIRM_DELAY_MS + 100);
    world.score = 300;
    world.players[0].lives = 0;
    world.players[0].alive = false;
    judge(world);
    expect(world.state).toBe(GameState.ENDLESS_OVER);
    expect(store.get(KEY_BEST_ENDLESS)).toBe('300');
    expect(store.get(KEY_BEST_COOP_ENDLESS)).toBeUndefined();
  });
});

describe('T-CE-4 co-op endless progression', () => {
  it('clearing L4 keeps the interlude; lives carry per player', () => {
    const world = coopComplete();
    world.players[1].lives = 2;
    intoEndless(world);
    world.spawnedCount = world.enemyTotal;
    judge(world);
    expect(world.state).toBe(GameState.LEVEL_CLEAR);
    loadLevel(world, 5);
    expect(world.players[0].lives).toBe(3);
    expect(world.players[1].lives).toBe(2);
  });
});

describe('T-CE-5 endless hint shows in both modes (v5 assertion reversed)', () => {
  it('COOP GAME_COMPLETE lines now contain the ENDLESS hint', () => {
    const world = coopComplete();
    expect(overlayLines(world)!.join(' | ')).toContain('ENDLESS');
  });
});

describe('T-ACH2 team-semantics achievement matrix', () => {
  it('T-ACH2-2 NO_DEATH: both at full lives unlocks; one damaged forfeits', () => {
    const w1 = createWorld();
    startCoop(w1);
    w1.spawnedCount = w1.enemyTotal;
    judge(w1);
    expect(isUnlocked(AchievementId.NO_DEATH_LEVEL)).toBe(true);

    store.clear();
    const w2 = createWorld();
    startCoop(w2);
    w2.players[1].lives = 2; // P2 掉过命
    w2.spawnedCount = w2.enemyTotal;
    judge(w2);
    expect(isUnlocked(AchievementId.NO_DEATH_LEVEL)).toBe(false);
  });

  it('T-ACH2-3 COLLECTOR: team aggregate across players', () => {
    const world = createWorld();
    startCoop(world);
    onPickup(world, PowerupType.SHIELD); // 记为 P1 拾取（hook 不分人，world 级聚合）
    onPickup(world, PowerupType.DOUBLE_FIRE);
    expect(isUnlocked(AchievementId.COLLECTOR)).toBe(false);
    onPickup(world, PowerupType.BOMB); // P2 补齐第三种
    expect(isUnlocked(AchievementId.COLLECTOR)).toBe(true);
  });

  it('T-ACH2-4 PURIST: team zero-pickup full clear unlocks; any pickup forfeits', () => {
    const w1 = coopComplete();
    void w1;
    expect(isUnlocked(AchievementId.PURIST)).toBe(true);

    store.clear();
    const w2 = createWorld();
    startCoop(w2);
    loadLevel(w2, 5); // R17: 战役终点 L3→L5（FULL_CLEAR 在 L5 触发）
    w2.state = GameState.PLAYING;
    onPickup(w2, PowerupType.SHIELD);
    w2.spawnedCount = w2.enemyTotal;
    judge(w2);
    expect(isUnlocked(AchievementId.FULL_CLEAR)).toBe(true);
    expect(isUnlocked(AchievementId.PURIST)).toBe(false);
  });

  it('T-ACH2-5 CENTURION: kills accumulate across modes', () => {
    store.set(KEY_KILLS, '99');
    const world = makeWorld();
    startCoopOnPlaying(world);
    addEnemy(world, EnemyType.BASIC, 6, 8);
    world.players[0].pos = cellCenter(6, 2);
    world.players[0].dir = Direction.RIGHT;
    firePlayerBullet(world, world.players[0]);
    runCombat(world, 2000);
    expect(store.get(KEY_KILLS)).toBe('100');
    expect(isUnlocked(AchievementId.CENTURION)).toBe(true);
  });

  it('T-ACH2-6 DEMOLITION unlocks in COOP', () => {
    const layout = emptyLayout();
    layout[6][6] = Terrain.BRICK;
    const world = makeWorld(layout);
    startCoopOnPlaying(world);
    world.players[1].pos = cellCenter(12, 10);
    world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 1200);
    world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 1200);
    expect(isUnlocked(AchievementId.DEMOLITION)).toBe(true);
  });

  it('T-ACH2-7 SOLO semantics sentinel (no regression)', () => {
    const world = createWorld();
    world.state = GameState.PLAYING;
    world.spawnedCount = world.enemyTotal;
    judge(world);
    expect(isUnlocked(AchievementId.NO_DEATH_LEVEL)).toBe(true); // SOLO 满命过关照旧
    expect(isUnlocked(AchievementId.FULL_CLEAR)).toBe(false); // L1 非全通
  });
});

/** COOP on an already-PLAYING world（绕过 READY 闸，仅测试用）。 */
function startCoopOnPlaying(world: World): void {
  world.state = GameState.READY;
  startCoop(world);
}
