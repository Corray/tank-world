// T-DPF-1~4 + G1 — difficulty persistence (R21 §3.31). 结构层（KEY + storage 桩 +
// createWorld/cycleDifficulty 接线）锁定先行；行为层（fail-silent 读写）FAIL→impl
// 转绿。守护块 4/G1 先绿。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Difficulty } from '../src/core/types';
import { getDifficulty, setDifficulty } from '../src/storage/storage';
import { createWorld } from '../src/core/world';
import { cycleDifficulty } from '../src/core/game';
import { KEY_DIFFICULTY } from '../src/core/constants';

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

describe('T-DPF-1 set/get round-trips through localStorage', () => {
  it('setDifficulty(HARD) → getDifficulty() === HARD', () => {
    setDifficulty(Difficulty.HARD);
    expect(getDifficulty()).toBe(Difficulty.HARD);
    setDifficulty(Difficulty.EASY);
    expect(getDifficulty()).toBe(Difficulty.EASY);
  });
});

describe('T-DPF-2 createWorld restores the persisted difficulty', () => {
  it('a fresh world picks up the stored tier', () => {
    setDifficulty(Difficulty.HARD);
    expect(createWorld().difficulty).toBe(Difficulty.HARD);
  });
});

describe('T-DPF-3 cycleDifficulty persists the new choice', () => {
  it('after cycling, the stored value matches the world', () => {
    const world = createWorld(); // READY, NORMAL
    cycleDifficulty(world); // → HARD
    expect(world.difficulty).toBe(Difficulty.HARD);
    expect(getDifficulty()).toBe(Difficulty.HARD);
  });
});

describe('T-DPF-4 empty / invalid storage falls back to NORMAL (guard)', () => {
  it('no stored value → NORMAL; garbage → NORMAL', () => {
    expect(getDifficulty()).toBe(Difficulty.NORMAL); // empty
    globalThis.localStorage!.setItem(KEY_DIFFICULTY, 'BOGUS');
    expect(getDifficulty()).toBe(Difficulty.NORMAL); // invalid
  });
});

describe('T-DPF-G1 KEY_DIFFICULTY is defined (structure guard)', () => {
  it('the storage key exists', () => {
    expect(KEY_DIFFICULTY).toContain('difficulty');
  });
});
