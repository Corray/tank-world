// T-MAPV-1~4 — revised maps + deterministic endless variants (test-plan-r4 §2.2).

import { describe, it, expect } from 'vitest';
import { Terrain } from '../src/core/types';
import { LEVELS, variantLayout, loadLevel } from '../src/level/level';
import { createWorld } from '../src/core/world';
import { GRID } from '../src/core/constants';

/** Structural invariants every battle layout must keep (consensus AC-22/§3.1). */
function assertInvariants(layout: number[][] | readonly number[][]): void {
  expect(layout[12][6]).toBe(Terrain.BASE);
  for (const c of [4, 5, 6, 7, 8]) {
    expect(layout[10][c]).toBe(Terrain.BRICK);
    expect(layout[11][c]).toBe(Terrain.BRICK);
  }
  expect(layout[12][5]).toBe(Terrain.BRICK);
  expect(layout[12][7]).toBe(Terrain.BRICK);
  for (const c of [0, 6, 12]) expect(layout[0][c]).toBe(Terrain.EMPTY);
  expect(layout[12][2]).toBe(Terrain.EMPTY); // player spawn
}

describe('T-MAPV-1 variant determinism', () => {
  // R17 基线修订（LEVEL_COUNT 3→5）：无尽起点 L6；L6/L11 同 L1 骨架（baseIdx 0）。
  it('same level → identical variant; same skeleton different level → different', () => {
    expect(variantLayout(6)).toEqual(variantLayout(6));
    expect(variantLayout(11)).toEqual(variantLayout(11));
    // L6 and L11 share the L1 skeleton but must differ in terrain placement.
    expect(variantLayout(6)).not.toEqual(variantLayout(11));
  });
});

describe('T-MAPV-2 variants never touch protected cells', () => {
  it('spawn cells / ring / base / player spawn survive variants L6~L11', () => {
    // R17: endless starts at L6 (LEVEL_COUNT+1); L6~L11 covers the full 5-cycle.
    for (let level = 6; level <= 11; level++) {
      assertInvariants(variantLayout(level));
    }
  });
});

describe('T-MAPV-3 revised campaign maps contain the new terrains', () => {
  it('each LEVELS layout has ≥1 bush, water and ice + keeps invariants', () => {
    for (const lv of LEVELS) {
      const flat = lv.layout.flat();
      expect(flat).toContain(Terrain.BUSH);
      expect(flat).toContain(Terrain.WATER);
      expect(flat).toContain(Terrain.ICE);
      assertInvariants(lv.layout);
    }
  });
});

describe('T-MAPV-4 variants apply to endless levels only', () => {
  it('L1~L3 load the raw LEVELS layouts unchanged', () => {
    const world = createWorld();
    for (let level = 1; level <= 3; level++) {
      loadLevel(world, level);
      const expected = LEVELS[level - 1].layout;
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          expect(world.map.terrainAt(r, c)).toBe(expected[r][c]);
        }
      }
    }
  });
});
