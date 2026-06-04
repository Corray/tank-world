// T-STO-1~4 — best-score persistence with fail-silent semantics (test-plan-r2 §2.4).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getBestTotal,
  getBestLevel,
  submitTotal,
  submitLevelScore,
} from '../src/storage/storage';

function installFakeStorage(): Map<string, string> {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  };
  return store;
}

function installThrowingStorage(): void {
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('denied');
    },
  };
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).localStorage;
});

describe('T-STO-1 first write', () => {
  beforeEach(installFakeStorage);
  it('submitTotal persists the first total', () => {
    submitTotal(5000);
    expect(getBestTotal()).toBe(5000);
  });
});

describe('T-STO-2 compare-write semantics', () => {
  beforeEach(installFakeStorage);
  it('higher overwrites, lower does not downgrade', () => {
    submitTotal(5000);
    submitTotal(3000);
    expect(getBestTotal()).toBe(5000);
    submitTotal(6000);
    expect(getBestTotal()).toBe(6000);
  });
});

describe('T-STO-3 best single-level score', () => {
  beforeEach(installFakeStorage);
  it('any level settlement competes for best-level', () => {
    submitLevelScore(800);
    submitLevelScore(400);
    expect(getBestLevel()).toBe(800);
    submitLevelScore(1200);
    expect(getBestLevel()).toBe(1200);
  });
});

describe('T-STO-4 storage failure degrades silently', () => {
  it('throwing localStorage yields 0 reads and non-throwing writes', () => {
    installThrowingStorage();
    expect(getBestTotal()).toBe(0);
    expect(getBestLevel()).toBe(0);
    expect(() => submitTotal(100)).not.toThrow();
  });

  it('absent localStorage (node default) also degrades to 0', () => {
    delete (globalThis as Record<string, unknown>).localStorage;
    expect(getBestTotal()).toBe(0);
    expect(() => submitLevelScore(100)).not.toThrow();
  });
});
