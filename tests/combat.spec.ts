// T-CMB-1~13 — combat module, collision matrix C1~C12 (test-plan §3.2, data-model §5).

import { describe, it, expect } from 'vitest';
import { GameState, Terrain, Direction, BulletOwner, EnemyType } from '../src/core/types';
import { SUB_TL, SUB_TR, SUB_BR } from '../src/map/map';
import { moveTank } from '../src/combat/combat';
import { judge } from '../src/core/update';
import { ENEMY_SCORE, CELL, TANK_SIZE, STEP_MS, INVINCIBLE_MS } from '../src/core/constants';
import {
  makeWorld,
  emptyLayout,
  cellCenter,
  makeBullet,
  addEnemy,
  runCombat,
} from './helpers';

describe('T-CMB-1 (C1) bullet × brick: impact-side sub-blocks, bullet consumed', () => {
  it('rightward bullet eats the left pair of the brick', () => {
    const layout = emptyLayout();
    layout[6][6] = Terrain.BRICK;
    const world = makeWorld(layout);
    world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 500);
    expect(world.bullets).toHaveLength(0);
    expect(world.map.subMask(6, 6)).toBe(SUB_TR | SUB_BR);
  });

  it('upward bullet eats the bottom pair', () => {
    const layout = emptyLayout();
    layout[6][6] = Terrain.BRICK;
    const world = makeWorld(layout);
    world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(8, 6), Direction.UP));
    runCombat(world, 500);
    expect(world.bullets).toHaveLength(0);
    expect(world.map.subMask(6, 6)).toBe(SUB_TL | SUB_TR);
  });
});

describe('T-CMB-2 (C2) bullet × steel: bullet consumed, wall intact', () => {
  it('steel survives, bullet does not', () => {
    const layout = emptyLayout();
    layout[6][6] = Terrain.STEEL;
    const world = makeWorld(layout);
    world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 500);
    expect(world.bullets).toHaveLength(0);
    expect(world.map.terrainAt(6, 6)).toBe(Terrain.STEEL);
  });
});

describe('T-CMB-3 (C3) bullet × base: defeat regardless of owner', () => {
  for (const owner of [BulletOwner.PLAYER, BulletOwner.ENEMY]) {
    it(`${owner} bullet destroys the base`, () => {
      const layout = emptyLayout();
      layout[6][6] = Terrain.BASE;
      const world = makeWorld(layout);
      world.bullets.push(makeBullet(owner, cellCenter(6, 4), Direction.RIGHT));
      runCombat(world, 500);
      expect(world.map.baseDestroyed).toBe(true);
      judge(world);
      expect(world.state).toBe(GameState.DEFEAT);
    });
  }
});

describe('T-CMB-4 (C4) bullet × bounds: consumed at field edge', () => {
  it('upward bullet leaves the field and disappears', () => {
    const world = makeWorld();
    world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(1, 6), Direction.UP));
    runCombat(world, 1000);
    expect(world.bullets).toHaveLength(0);
  });
});

describe('T-CMB-5 (C5) player bullet × armored enemy: 3 hits, score on kill only', () => {
  it('hp 3→2→1→destroyed, +400 exactly once', () => {
    const world = makeWorld();
    const enemy = addEnemy(world, EnemyType.ARMORED, 6, 8);
    for (let hit = 1; hit <= 3; hit++) {
      world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT));
      runCombat(world, 1500);
      expect(world.bullets).toHaveLength(0);
      if (hit < 3) {
        expect(enemy.hp).toBe(3 - hit);
        expect(enemy.alive).toBe(true);
        expect(world.score).toBe(0);
      }
    }
    expect(enemy.alive).toBe(false);
    expect(world.score).toBe(ENEMY_SCORE.ARMORED);
  });
});

describe('T-CMB-6 (C6) enemy bullet × player', () => {
  it('non-invincible: one life lost, respawn at spawn point with invincibility', () => {
    const world = makeWorld();
    world.player.pos = cellCenter(6, 8);
    world.player.invincibleUntil = 0;
    world.clock = 10_000;
    world.bullets.push(makeBullet(BulletOwner.ENEMY, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 1500);
    expect(world.player.lives).toBe(2);
    expect(world.player.pos).toEqual(world.player.spawnPos);
    expect(world.player.invincibleUntil).toBeGreaterThanOrEqual(world.clock);
    expect(world.player.invincibleUntil).toBeLessThanOrEqual(world.clock + INVINCIBLE_MS);
  });

  it('invincible: bullet consumed, player unharmed in place', () => {
    const world = makeWorld();
    world.player.pos = cellCenter(6, 8);
    world.clock = 10_000;
    world.player.invincibleUntil = world.clock + 60_000;
    world.bullets.push(makeBullet(BulletOwner.ENEMY, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 1500);
    expect(world.bullets).toHaveLength(0);
    expect(world.player.lives).toBe(3);
    expect(world.player.pos).toEqual(cellCenter(6, 8));
  });
});

describe('T-CMB-7 (C7) player bullet × enemy bullet: mutual annihilation', () => {
  it('head-on bullets both disappear', () => {
    const world = makeWorld();
    world.player.pos = cellCenter(12, 0); // park player away from the bullet lane
    world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 2), Direction.RIGHT));
    world.bullets.push(makeBullet(BulletOwner.ENEMY, cellCenter(6, 10), Direction.LEFT));
    runCombat(world, 2000);
    expect(world.bullets).toHaveLength(0);
  });
});

describe('T-CMB-8 (C8) enemy bullets pass through each other', () => {
  it('crossing enemy bullets both survive the crossing', () => {
    const world = makeWorld();
    world.player.pos = cellCenter(12, 0);
    world.bullets.push(makeBullet(BulletOwner.ENEMY, cellCenter(6, 4), Direction.RIGHT));
    world.bullets.push(makeBullet(BulletOwner.ENEMY, cellCenter(6, 8), Direction.LEFT));
    runCombat(world, STEP_MS * 25); // enough to cross, not enough to leave field
    expect(world.bullets).toHaveLength(2);
  });
});

describe('T-CMB-9 (C9) enemy bullet passes through enemy tanks', () => {
  it('enemy tank takes no damage from friendly fire', () => {
    const world = makeWorld();
    world.player.pos = cellCenter(12, 0);
    const enemy = addEnemy(world, EnemyType.BASIC, 6, 8);
    world.bullets.push(makeBullet(BulletOwner.ENEMY, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, STEP_MS * 50);
    expect(enemy.alive).toBe(true);
    expect(enemy.hp).toBe(1);
  });
});

describe('T-CMB-10/12 (C10, C12) tank blocked by terrain and bounds', () => {
  for (const terrain of [Terrain.BRICK, Terrain.STEEL, Terrain.BASE]) {
    it(`tank cannot enter ${Terrain[terrain]}`, () => {
      const layout = emptyLayout();
      layout[6][7] = terrain;
      const world = makeWorld(layout);
      world.player.pos = cellCenter(6, 6);
      for (let i = 0; i < 120; i++) moveTank(world, world.player, Direction.RIGHT, STEP_MS);
      // Right edge of tank must not cross into the blocked cell.
      expect(world.player.pos.x + TANK_SIZE / 2).toBeLessThanOrEqual(7 * CELL);
      const blocked = moveTank(world, world.player, Direction.RIGHT, STEP_MS);
      expect(blocked).toBe(false);
    });
  }

  it('tank blocked at field boundary (C12)', () => {
    const world = makeWorld();
    world.player.pos = cellCenter(6, 12);
    for (let i = 0; i < 120; i++) moveTank(world, world.player, Direction.RIGHT, STEP_MS);
    expect(world.player.pos.x + TANK_SIZE / 2).toBeLessThanOrEqual(13 * CELL);
    expect(moveTank(world, world.player, Direction.RIGHT, STEP_MS)).toBe(false);
  });
});

describe('T-CMB-11 (C11) tanks block each other without damage', () => {
  it('player pushing into an enemy is blocked, both unharmed', () => {
    const world = makeWorld();
    world.player.pos = cellCenter(6, 6);
    const enemy = addEnemy(world, EnemyType.BASIC, 6, 7);
    for (let i = 0; i < 120; i++) moveTank(world, world.player, Direction.RIGHT, STEP_MS);
    // Boxes must not overlap.
    expect(enemy.pos.x - world.player.pos.x).toBeGreaterThanOrEqual(TANK_SIZE);
    expect(world.player.lives).toBe(3);
    expect(enemy.hp).toBe(1);
  });
});

describe('T-CMB-13 (§8 risk) same-step ordering: wall shields the tank behind it', () => {
  it('bullet stops at the brick, enemy right behind is unharmed', () => {
    const layout = emptyLayout();
    layout[6][6] = Terrain.BRICK;
    const world = makeWorld(layout);
    const enemy = addEnemy(world, EnemyType.BASIC, 6, 7);
    world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 5), Direction.RIGHT));
    runCombat(world, 1000);
    expect(world.bullets).toHaveLength(0);
    expect(enemy.alive).toBe(true);
    expect(world.map.subMask(6, 6)).toBe(SUB_TR | SUB_BR);
  });
});
