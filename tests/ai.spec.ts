// T-AI-1~3 — enemy threat layering, statistical assertions (test-plan-r2 §2.2).
// Toward-direction = dominant-axis direction from enemy to target.

import { describe, it, expect } from 'vitest';
import { EnemyType, Direction } from '../src/core/types';
import { decideDirection } from '../src/enemy/enemy';
import { makeWorld, addEnemy, cellCenter } from './helpers';

const N = 200;

function ratio(picks: Direction[], dir: Direction): number {
  return picks.filter((d) => d === dir).length / picks.length;
}

function decide(type: EnemyType, row: number, col: number): Direction[] {
  const world = makeWorld();
  world.players[0].pos = cellCenter(1, 11); // player parked top-right
  const enemy = addEnemy(world, type, row, col);
  return Array.from({ length: N }, () => decideDirection(world, enemy));
}

describe('T-AI-1 FAST biases toward the base', () => {
  it('from (1,1) the dominant toward-base direction (DOWN) lands in [40%, 75%]', () => {
    // Base (12,6): dy=11 rows ≫ dx=5 cols → dominant DOWN.
    const r = ratio(decide(EnemyType.FAST, 1, 1), Direction.DOWN);
    expect(r).toBeGreaterThanOrEqual(0.4);
    expect(r).toBeLessThanOrEqual(0.75);
  });
});

describe('T-AI-2 ARMORED biases toward the player', () => {
  it('from (1,1) with player at (1,11) RIGHT lands in [40%, 75%]', () => {
    const r = ratio(decide(EnemyType.ARMORED, 1, 1), Direction.RIGHT);
    expect(r).toBeGreaterThanOrEqual(0.4);
    expect(r).toBeLessThanOrEqual(0.75);
  });
});

describe('T-AI-3 BASIC stays uniform', () => {
  it('each direction lands in [15%, 35%]', () => {
    const picks = decide(EnemyType.BASIC, 6, 6);
    for (const d of [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT]) {
      const r = ratio(picks, d);
      expect(r).toBeGreaterThanOrEqual(0.15);
      expect(r).toBeLessThanOrEqual(0.35);
    }
  });
});
