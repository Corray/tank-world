// T-EN-1~9 — endless mode (test-plan-r3 §2.3, data-model §19/§20).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameState, Terrain } from '../src/core/types';
import { judge } from '../src/core/update';
import { togglePause, restartToReady } from '../src/core/game';
import { LEVELS, endlessConfig, enterEndless, loadLevel, retryLevel } from '../src/level/level';
import { updatePlayer } from '../src/player/player';
import {
  ENDLESS_INTERVAL_MIN_MS,
  ENDLESS_CONFIRM_DELAY_MS,
  KEY_BEST_TOTAL,
  KEY_BEST_ENDLESS,
  STEP_MS,
} from '../src/core/constants';
import { makeWorld } from './helpers';
import { createWorld } from '../src/core/world';

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

/** Drive a world to GAME_COMPLETE legitimately (R17: L5 clear, LEVEL_COUNT 3→5). */
function completeRun(world = createWorld()): typeof world {
  loadLevel(world, 5);
  world.state = GameState.PLAYING;
  world.score = 100; // non-zero so best-total actually persists
  world.spawnedCount = world.enemyTotal;
  judge(world);
  expect(world.state).toBe(GameState.GAME_COMPLETE);
  return world;
}

describe('T-EN-1 endless config formula sampling', () => {
  // R17 基线修订（LEVEL_COUNT 3→5）：endless 深度 k=level-LEVEL_COUNT，level 参数 +2
  // 保持同 k → 同 total/interval（曲线不变，仅起点平移）。
  const cases: Array<[number, number, number]> = [
    // [level, expected total, expected interval]
    [6, 20, 1900], // k=1
    [9, 26, 1600], // k=4
    [13, 34, ENDLESS_INTERVAL_MIN_MS], // k=8, interval floor
    [25, 58, ENDLESS_INTERVAL_MIN_MS], // k=20
  ];
  for (const [level, total, interval] of cases) {
    it(`L${level}: total ${total}, interval ${interval}`, () => {
      const cfg = endlessConfig(level);
      const sum = cfg.enemyCounts.BASIC + cfg.enemyCounts.FAST + cfg.enemyCounts.ARMORED;
      expect(sum).toBe(total);
      expect(cfg.spawnIntervalMs).toBe(interval);
    });
  }

  it('armored ratio grows and caps at 50% (L25)', () => {
    const l4 = endlessConfig(6); // k=1 (first endless)
    const l23 = endlessConfig(25); // k=20
    const ratio = (c: typeof l4.enemyCounts) =>
      c.ARMORED / (c.BASIC + c.FAST + c.ARMORED);
    expect(ratio(l4.enemyCounts)).toBeGreaterThan(1 / 3);
    expect(ratio(l23.enemyCounts)).toBeCloseTo(0.5, 1);
  });
});

// 基线修订 2026-06-05（共识 v4 §3.15）：无尽图由「骨架引用」改为「骨架的确定性
// 地形变体克隆」，引用相等断言失效。改为骨架签名格断言（签名格不在变体槽位内）。
describe('T-EN-2 endless map rotation L1→L2→L3 (skeleton signatures)', () => {
  // Signature cells unique per skeleton and outside VARIANT_SLOTS:
  // L1: steel at (3,6); L2: steel at (1,1); L3: steel at (11,2).
  function skeletonOf(layout: number[][]): number {
    if (layout[3][6] === 2 && layout[1][1] !== 2) return 1;
    if (layout[1][1] === 2) return 2;
    if (layout[11][2] === 2) return 3;
    return 0;
  }

  // R17 基线修订（LEVEL_COUNT 3→5）：无尽起点 L6，baseIdx=(level-6)%5（5-cycle）。
  // L6/L7/L8→skel 1/2/3（L1/L2/L3 base）；L9/L10→L4/L5 base（skeletonOf 不识别，记 0）；
  // L11 回绕 →skel 1。本测试覆盖可识别的 3 骨架 + 5-cycle 回绕。
  it('L6/L7/L8 rotate through skeletons 1/2/3; L11 wraps to 1 (5-cycle)', () => {
    expect(skeletonOf(endlessConfig(6).layout)).toBe(1);
    expect(skeletonOf(endlessConfig(7).layout)).toBe(2);
    expect(skeletonOf(endlessConfig(8).layout)).toBe(3);
    expect(skeletonOf(endlessConfig(11).layout)).toBe(1);
    void LEVELS;
  });
});

describe('T-EN-3 entering endless from GAME_COMPLETE', () => {
  it('after the confirm window: PLAYING L6, banked snapshot, lives kept', () => {
    const world = completeRun();
    world.players[0].lives = 2;
    const banked = world.bankedScore;
    enterEndless(world, world.gameCompleteWallMs + ENDLESS_CONFIRM_DELAY_MS + 100);
    expect(world.state).toBe(GameState.PLAYING);
    expect(world.level).toBe(6); // R17: 无尽起点 L4→L6
    expect(world.endlessStartBanked).toBe(banked);
    expect(world.players[0].lives).toBe(2); // not reset (consensus §3.13)
    expect(world.map.terrainAt(12, 6)).toBe(Terrain.BASE); // L1 layout loaded
  });
});

describe('T-EN-4 endless level clear keeps the normal interlude', () => {
  it('L4 clear → LEVEL_CLEAR (not GAME_COMPLETE)', () => {
    const world = completeRun();
    enterEndless(world, world.gameCompleteWallMs + ENDLESS_CONFIRM_DELAY_MS + 100);
    world.spawnedCount = world.enemyTotal;
    judge(world);
    expect(world.state).toBe(GameState.LEVEL_CLEAR);
  });
});

describe('T-EN-5 three best-score buckets stay isolated', () => {
  it('endless death writes best-endless only; best-total untouched', () => {
    const world = completeRun(); // writes best-total via judge
    const bestTotalAfterRun = store.get(KEY_BEST_TOTAL);
    expect(bestTotalAfterRun).toBeDefined();
    enterEndless(world, world.gameCompleteWallMs + ENDLESS_CONFIRM_DELAY_MS + 100);
    world.score = 900; // endless-segment score
    world.map.destroyBase();
    judge(world);
    expect(world.state).toBe(GameState.ENDLESS_OVER);
    expect(store.get(KEY_BEST_ENDLESS)).toBe('900');
    expect(store.get(KEY_BEST_TOTAL)).toBe(bestTotalAfterRun); // not polluted
  });
});

describe('T-EN-6 endless death settles the endless segment', () => {
  it('banked growth during endless counts into the settlement', () => {
    const world = completeRun();
    enterEndless(world, world.gameCompleteWallMs + ENDLESS_CONFIRM_DELAY_MS + 100);
    // Clear L4 (banks 500), then die in L5 with 300 on the board.
    world.score = 500;
    world.spawnedCount = world.enemyTotal;
    judge(world); // LEVEL_CLEAR, banks 500
    world.state = GameState.PLAYING;
    loadLevel(world, 7); // R17: next endless level (L5 now campaign; >LEVEL_COUNT needed)
    world.score = 300;
    world.players[0].lives = 0;
    world.players[0].alive = false;
    judge(world);
    expect(world.state).toBe(GameState.ENDLESS_OVER);
    expect(store.get(KEY_BEST_ENDLESS)).toBe('800'); // 500 + 300
  });
});

describe('T-EN-7 ENDLESS_OVER illegal transitions', () => {
  it('pause / fire / retry are no-ops; R starts a fresh run', () => {
    const world = makeWorld();
    world.state = GameState.ENDLESS_OVER;
    togglePause(world);
    expect(world.state).toBe(GameState.ENDLESS_OVER);
    updatePlayer(world, STEP_MS, { move: null, fire: true }, world.players[0]);
    retryLevel(world); // DEFEAT-only — must refuse
    expect(world.state).toBe(GameState.ENDLESS_OVER);
    const fresh = restartToReady(world);
    expect(fresh).not.toBe(world);
    expect(fresh.state).toBe(GameState.READY);
    expect(fresh.level).toBe(1);
  });
});

describe('T-EN-8 anti-misfire window on GAME_COMPLETE', () => {
  it('entry ignored inside the window, accepted after', () => {
    const world = completeRun();
    enterEndless(world, world.gameCompleteWallMs + ENDLESS_CONFIRM_DELAY_MS - 500);
    expect(world.state).toBe(GameState.GAME_COMPLETE); // too early
    enterEndless(world, world.gameCompleteWallMs + ENDLESS_CONFIRM_DELAY_MS + 1);
    expect(world.state).toBe(GameState.PLAYING);
  });
});

describe('T-EN-9 regression: DEFEAT + retry stays for L1~3', () => {
  it('death on L2 still routes to DEFEAT with retry semantics', () => {
    const world = createWorld();
    loadLevel(world, 2);
    world.state = GameState.PLAYING;
    world.map.destroyBase();
    judge(world);
    expect(world.state).toBe(GameState.DEFEAT); // not ENDLESS_OVER
    retryLevel(world);
    expect(world.state).toBe(GameState.PLAYING);
    expect(world.level).toBe(2);
  });
});
