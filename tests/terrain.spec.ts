// T-TER-1~9 — terrain interactions + ice inertia (test-plan-r4 §2.1, data-model §23/§24).

import { describe, it, expect } from 'vitest';
import { Terrain, Direction, BulletOwner, EnemyType } from '../src/core/types';
import { moveTank } from '../src/combat/combat';
import { updatePlayer } from '../src/player/player';
import { damagePlayer } from '../src/combat/combat';
import { updateEnemies } from '../src/enemy/enemy';
import { loadLevel } from '../src/level/level';
import { createWorld } from '../src/core/world';
import { CELL, TANK_SIZE, STEP_MS } from '../src/core/constants';
import { SUB_ALL } from '../src/map/map';
import { makeWorld, emptyLayout, cellCenter, makeBullet, addEnemy, runCombat, IDLE_INPUT } from './helpers';
import type { InputState } from '../src/input/input';

const RIGHT: InputState = { move: Direction.RIGHT, fire: false };

function tick(world: ReturnType<typeof makeWorld>, input: InputState, steps: number): void {
  for (let i = 0; i < steps; i++) updatePlayer(world, STEP_MS, input, world.players[0]);
}

describe('T-TER-1 bush: passable for tanks, transparent for bullets', () => {
  it('tank drives through bush; bullet flies over and hits the brick beyond', () => {
    const layout = emptyLayout();
    layout[6][6] = Terrain.BUSH;
    layout[6][8] = Terrain.BRICK;
    const world = makeWorld(layout);
    world.players[0].pos = cellCenter(6, 5);
    tick(world, RIGHT, 40);
    expect(world.players[0].pos.x).toBeGreaterThan(6 * CELL); // drove into the bush cell
    world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 1500);
    expect(world.map.subMask(6, 8)).not.toBe(SUB_ALL); // brick beyond got hit
  });
});

describe('T-TER-2 water: blocks tanks, lets bullets pass (C14/C15)', () => {
  it('tank is stopped at the bank; bullet crosses and hits the far brick', () => {
    const layout = emptyLayout();
    layout[6][7] = Terrain.WATER;
    layout[6][9] = Terrain.BRICK;
    const world = makeWorld(layout);
    world.players[0].pos = cellCenter(6, 6);
    for (let i = 0; i < 120; i++) moveTank(world, world.players[0], Direction.RIGHT, STEP_MS);
    expect(world.players[0].pos.x + TANK_SIZE / 2).toBeLessThanOrEqual(7 * CELL);
    world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 5), Direction.RIGHT));
    runCombat(world, 1500);
    expect(world.map.subMask(6, 9)).not.toBe(SUB_ALL);
  });
});

describe('T-TER-3 ice: releasing input keeps the tank sliding, stops ≤0.6s', () => {
  it('coasts after release and settles', () => {
    const layout = emptyLayout();
    for (let c = 3; c <= 10; c++) layout[6][c] = Terrain.ICE;
    const world = makeWorld(layout);
    world.players[0].pos = cellCenter(6, 4);
    tick(world, RIGHT, 30); // build momentum on ice
    const atRelease = world.players[0].pos.x;
    tick(world, IDLE_INPUT, 6); // 100ms of coasting
    const coasted = world.players[0].pos.x;
    expect(coasted).toBeGreaterThan(atRelease); // still sliding
    tick(world, IDLE_INPUT, 36); // up to 0.7s total after release
    const settled = world.players[0].pos.x;
    tick(world, IDLE_INPUT, 12);
    expect(world.players[0].pos.x).toBe(settled); // fully stopped
  });
});

describe('T-TER-4 ice slide never penetrates walls', () => {
  it('slide stops flush at steel', () => {
    const layout = emptyLayout();
    layout[6][4] = Terrain.ICE;
    layout[6][5] = Terrain.ICE;
    layout[6][6] = Terrain.ICE;
    layout[6][7] = Terrain.STEEL;
    const world = makeWorld(layout);
    world.players[0].pos = cellCenter(6, 4);
    tick(world, RIGHT, 30);
    tick(world, IDLE_INPUT, 60); // coast into the wall
    expect(world.players[0].pos.x + TANK_SIZE / 2).toBeLessThanOrEqual(7 * CELL);
    const rest = world.players[0].pos.x;
    tick(world, IDLE_INPUT, 12);
    expect(world.players[0].pos.x).toBe(rest); // momentum cleared at the wall
  });
});

describe('T-TER-5 leaving ice kills the momentum', () => {
  it('slide stops promptly after crossing onto plain ground', () => {
    const layout = emptyLayout();
    layout[6][4] = Terrain.ICE;
    layout[6][5] = Terrain.ICE;
    const world = makeWorld(layout);
    world.players[0].pos = cellCenter(6, 4);
    tick(world, RIGHT, 25);
    tick(world, IDLE_INPUT, 60);
    // Center may exit the ice strip but must stop within a small overshoot.
    expect(world.players[0].pos.x).toBeLessThanOrEqual(6 * CELL + 12);
  });
});

describe('T-TER-6 level load / respawn clear momentum', () => {
  it('loadLevel and damagePlayer reset slide', () => {
    const world = createWorld();
    world.players[0].slide = { dir: Direction.RIGHT, speed: 96 };
    loadLevel(world, 2);
    expect(world.players[0].slide ?? null).toBeNull();
    world.players[0].slide = { dir: Direction.LEFT, speed: 96 };
    damagePlayer(world, world.players[0]);
    expect(world.players[0].slide ?? null).toBeNull();
  });
});

describe('T-TER-7 no drift on plain ground (regression of T-PLY-4 semantics)', () => {
  it('movement then release on empty ground stops immediately', () => {
    const world = makeWorld();
    world.players[0].pos = cellCenter(6, 6);
    tick(world, RIGHT, 10);
    const stopped = world.players[0].pos.x;
    tick(world, IDLE_INPUT, 30);
    expect(world.players[0].pos.x).toBe(stopped);
  });
});

describe('T-TER-8 AI does not jam at the river bank', () => {
  it('a blocked enemy re-rolls its direction within bounded steps', () => {
    const layout = emptyLayout();
    layout[6][7] = Terrain.WATER;
    const world = makeWorld(layout);
    world.players[0].pos = cellCenter(12, 0);
    const enemy = addEnemy(world, EnemyType.BASIC, 6, 6);
    enemy.dir = Direction.RIGHT;
    const startX = enemy.pos.x;
    for (let i = 0; i < 120; i++) updateEnemies(world, STEP_MS);
    const turnedOrMoved =
      enemy.dir !== Direction.RIGHT ||
      Math.abs(enemy.pos.x - startX) > 1 ||
      Math.abs(enemy.pos.y - cellCenter(6, 6).y) > 1;
    expect(turnedOrMoved).toBe(true);
  });
});

describe('T-TER-9 AI is symmetric on ice', () => {
  it('an enemy moving on ice acquires slide momentum', () => {
    const layout = emptyLayout();
    for (let c = 2; c <= 10; c++) layout[6][c] = Terrain.ICE;
    const world = makeWorld(layout);
    world.players[0].pos = cellCenter(12, 0);
    const enemy = addEnemy(world, EnemyType.BASIC, 6, 6);
    updateEnemies(world, STEP_MS);
    expect(enemy.slide ?? null).not.toBeNull();
  });
});
