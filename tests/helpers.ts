// Shared test utilities. Tests build worlds with custom layouts to isolate cases.

import { GRID, CELL, BULLET_SPEED, STEP_MS } from '../src/core/constants';
import { GameState, Direction, BulletOwner, EnemyType } from '../src/core/types';
import type { Bullet, EnemyTank } from '../src/core/types';
import { GameMap } from '../src/map/map';
import { createWorld, type World } from '../src/core/world';
import { createEnemy } from '../src/enemy/enemy';
import { updateWorld } from '../src/core/update';
import { updateCombat } from '../src/combat/combat';
import type { InputState } from '../src/input/input';

/** A fully empty 13x13 layout (mutable copy each call). */
export function emptyLayout(): number[][] {
  return Array.from({ length: GRID }, () => Array(GRID).fill(0));
}

/** World in PLAYING state with the given layout (default: empty field). */
export function makeWorld(layout: number[][] = emptyLayout()): World {
  const world = createWorld();
  world.map = new GameMap(layout);
  world.state = GameState.PLAYING;
  return world;
}

/** Pixel center of cell (row, col). */
export function cellCenter(row: number, col: number): { x: number; y: number } {
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
}

export function makeBullet(
  owner: BulletOwner,
  pos: { x: number; y: number },
  dir: Direction,
): Bullet {
  return { pos: { ...pos }, dir, speed: BULLET_SPEED, owner };
}

export function addEnemy(
  world: World,
  type: EnemyType,
  row: number,
  col: number,
): EnemyTank {
  const e = createEnemy(type, cellCenter(row, col));
  e.alive = true;
  world.enemies.push(e);
  world.spawnedCount += 1;
  return e;
}

export const IDLE_INPUT: InputState = { move: null, fire: false };

/** Run the full update pipeline for `ms` in fixed steps. */
export function runWorld(world: World, ms: number, input: InputState = IDLE_INPUT): void {
  for (let t = 0; t < ms; t += STEP_MS) {
    world.clock += STEP_MS;
    updateWorld(world, STEP_MS, input);
  }
}

/** Run only the combat stage for `ms` in fixed steps (no AI / no player). */
export function runCombat(world: World, ms: number): void {
  for (let t = 0; t < ms; t += STEP_MS) {
    world.clock += STEP_MS;
    updateCombat(world, STEP_MS);
  }
}
