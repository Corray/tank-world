// T-WAV-1~9 + G1~G3 — wave defense (test-plan-r13 §4). R13：净新 = WAVE 模式
// （同图连续/波次曲线/自动间奏/第七八档）。结构层（枚举/字段/常量/桩）锁定时
// 先行编译；行为层骨架阶段 FAIL→impl 转绿。守护块（G1/G3）锁定时即绿。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameState, GameMode, isPvP, Direction, PowerupType } from '../src/core/types';
import { createWorld, type World } from '../src/core/world';
import { GameLoop, startWave, restartToReady } from '../src/core/game';
import { judge, updateWorld } from '../src/core/update';
import {
  waveConfig,
  isBossWave,
  applyWave,
  startNextWave,
} from '../src/level/level';
import { EnemyType } from '../src/core/types';
import { isUnlocked, AchievementId } from '../src/achievements/achievements';
import {
  WAVE_BREAK_MS,
  WAVE_INTERVAL_MIN_MS,
  STEP_MS,
  KEY_BEST_WAVE,
  KEY_BEST_COOP_WAVE,
  KEY_BEST_LEVEL,
  KEY_BEST_TOTAL,
  KEY_BEST_ENDLESS,
  KEY_BEST_COOP,
  KEY_BEST_COOP_ENDLESS,
} from '../src/core/constants';
import { cellCenter, IDLE_INPUT } from './helpers';

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

/** READY world entered into wave mode (solo by default). */
function makeWave(coop = false): World {
  const world = createWorld();
  startWave(world, coop);
  return world;
}

/** Force the current wave to read as cleared (all spawned, field empty). */
function clearField(world: World): void {
  world.spawnedCount = world.enemyTotal;
  world.enemies = [];
  world.bullets = [];
}

const LEGACY_KEYS = [
  KEY_BEST_LEVEL,
  KEY_BEST_TOTAL,
  KEY_BEST_ENDLESS,
  KEY_BEST_COOP,
  KEY_BEST_COOP_ENDLESS,
];

describe('T-WAV-1 startWave enters wave mode on the L1 battlefield', () => {
  it('mode/wave/state set; L1 terrain loaded; waveConfig(1) staged', () => {
    const world = makeWave();
    expect(world.mode).toBe(GameMode.WAVE);
    expect(world.wave).toBe(1);
    expect(world.state).toBe(GameState.PLAYING);
    expect(world.map.terrainAt(12, 6)).toBe(3); // BASE — L1 battlefield
    const c = waveConfig(1);
    const total = c.enemyCounts.BASIC + c.enemyCounts.FAST + c.enemyCounts.ARMORED;
    expect(world.enemyTotal).toBe(total);
    expect(world.spawnSequence).toHaveLength(total);
    expect(world.players).toHaveLength(1);
  });

  it('co-op entry fields two players', () => {
    const world = makeWave(true);
    expect(world.mode).toBe(GameMode.WAVE);
    expect(world.players).toHaveLength(2);
  });
});

describe('T-WAV-2 waveConfig curve — size up, pace down, armor capped', () => {
  it('locks the default formula at waves 1 / 5 / 20', () => {
    const c1 = waveConfig(1);
    const c5 = waveConfig(5);
    const c20 = waveConfig(20);
    const total = (c: ReturnType<typeof waveConfig>) =>
      c.enemyCounts.BASIC + c.enemyCounts.FAST + c.enemyCounts.ARMORED;
    expect(total(c1)).toBe(10);
    expect(total(c5)).toBe(18);
    expect(total(c20)).toBe(48);
    expect(c1.spawnIntervalMs).toBe(1900);
    expect(c20.spawnIntervalMs).toBe(WAVE_INTERVAL_MIN_MS);
    expect(c20.enemyCounts.ARMORED / total(c20)).toBe(0.5); // cap reached
  });
});

describe('T-WAV-3 every 5th wave is a boss wave (last spawn = BOSS)', () => {
  it('isBossWave flags multiples of 5 only', () => {
    expect(isBossWave(5)).toBe(true);
    expect(isBossWave(10)).toBe(true);
    expect(isBossWave(1)).toBe(false);
    expect(isBossWave(4)).toBe(false);
    expect(isBossWave(6)).toBe(false);
  });

  it('applyWave(5) appends a BOSS and counts it; wave 4 has none', () => {
    const world = makeWave();
    applyWave(world, 5);
    const c5 = waveConfig(5);
    const total = c5.enemyCounts.BASIC + c5.enemyCounts.FAST + c5.enemyCounts.ARMORED;
    expect(world.spawnSequence[world.spawnSequence.length - 1]).toBe(EnemyType.BOSS);
    expect(world.enemyTotal).toBe(total + 1);
    applyWave(world, 4);
    expect(world.spawnSequence).not.toContain(EnemyType.BOSS);
  });
});

describe('T-WAV-4 wave cleared → WAVE_BREAK (no banking, no legacy buckets)', () => {
  it('break state with countdown; score untouched; six legacy buckets empty', () => {
    const world = makeWave();
    world.score = 500;
    clearField(world);
    judge(world);
    expect(world.state).toBe(GameState.WAVE_BREAK);
    expect(world.waveBreakMs).toBeGreaterThan(0);
    expect(world.score).toBe(500); // no banking in wave mode
    expect(world.bankedScore).toBe(0);
    for (const k of LEGACY_KEYS) expect(store.get(k)).toBeUndefined();
  });
});

describe('T-WAV-5 same-map continuity across waves', () => {
  it('terrain damage, field powerups and tank level survive startNextWave', () => {
    const world = makeWave();
    world.map.hitBrick(1, 1, Direction.UP); // chip a brick — lasting scar
    const scarred = world.map.subMask(1, 1);
    world.powerups.push({ type: PowerupType.LIFE, pos: cellCenter(6, 6) });
    world.players[0].level = 3;
    world.state = GameState.WAVE_BREAK;
    startNextWave(world);
    expect(world.wave).toBe(2);
    expect(world.state).toBe(GameState.PLAYING);
    expect(world.map.subMask(1, 1)).toBe(scarred); // map NOT rebuilt
    expect(world.powerups).toHaveLength(1); // field powerups kept
    expect(world.players[0].level).toBe(3); // upgrade kept
    const c2 = waveConfig(2);
    const total = c2.enemyCounts.BASIC + c2.enemyCounts.FAST + c2.enemyCounts.ARMORED;
    expect(world.enemyTotal).toBe(total); // wave 2 staged
    expect(world.spawnedCount).toBe(0);
  });
});

describe('T-WAV-6 WAVE_BREAK countdown auto-starts the next wave (advance layer)', () => {
  it('clock frozen during the break; next wave begins when it elapses', () => {
    const world = makeWave();
    world.state = GameState.WAVE_BREAK;
    world.waveBreakMs = WAVE_BREAK_MS;
    const loop = new GameLoop(
      world,
      (w, dt) => updateWorld(w, dt, IDLE_INPUT),
      () => {},
    );
    const clockBefore = world.clock;
    loop.advance(WAVE_BREAK_MS - STEP_MS);
    expect(world.state).toBe(GameState.WAVE_BREAK); // still counting
    expect(world.clock).toBe(clockBefore); // AC-11 freeze holds
    loop.advance(STEP_MS * 2);
    expect(loop.world.state).toBe(GameState.PLAYING);
    expect(loop.world.wave).toBe(2);
  });
});

describe('T-WAV-7 death settles WAVE_OVER into bucket seven (waves cleared)', () => {
  it('base down at wave 3 → best-wave 2; legacy buckets untouched', () => {
    const world = makeWave();
    world.wave = 3;
    world.map.destroyBase();
    judge(world);
    expect(world.state).toBe(GameState.WAVE_OVER);
    expect(store.get(KEY_BEST_WAVE)).toBe('2'); // died during wave 3
    for (const k of LEGACY_KEYS) expect(store.get(k)).toBeUndefined();
  });
});

describe('T-WAV-8 co-op wave writes bucket eight only (bucket isolation)', () => {
  it('co-op death → best-coop-wave, never best-wave', () => {
    const world = makeWave(true);
    world.wave = 2;
    world.map.destroyBase();
    judge(world);
    expect(world.state).toBe(GameState.WAVE_OVER);
    expect(store.get(KEY_BEST_COOP_WAVE)).toBe('1');
    expect(store.get(KEY_BEST_WAVE)).toBeUndefined();
  });
});

describe('T-WAV-9 WAVE_OVER → R → brand-new READY run', () => {
  it('restartToReady returns a fresh world', () => {
    const world = makeWave();
    world.state = GameState.WAVE_OVER;
    const next = restartToReady(world);
    expect(next).not.toBe(world);
    expect(next.state).toBe(GameState.READY);
  });
});

describe('T-WAV-G1 WAVE is a PvE-family mode (guard)', () => {
  it('isPvP(WAVE) is false', () => {
    expect(isPvP(GameMode.WAVE)).toBe(false);
  });
});

describe('T-WAV-G2 level-family achievements never fire in wave mode', () => {
  it('clearing a wave unlocks no NO_DEATH_LEVEL / PURIST', () => {
    const world = makeWave();
    clearField(world);
    judge(world);
    expect(isUnlocked(AchievementId.NO_DEATH_LEVEL)).toBe(false);
    expect(isUnlocked(AchievementId.PURIST)).toBe(false);
  });
});

describe('T-WAV-G3 legacy solo judging is untouched (guard)', () => {
  it('solo L1 field clear still routes to LEVEL_CLEAR', () => {
    const world = createWorld();
    world.state = GameState.PLAYING;
    clearField(world);
    judge(world);
    expect(world.state).toBe(GameState.LEVEL_CLEAR);
  });
});
