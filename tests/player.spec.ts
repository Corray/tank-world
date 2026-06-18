// T-PLY-1~6 — player module (test-plan §3.3). Sources: consensus §3.2/§3.4.

import { describe, it, expect } from 'vitest';
import { GameState, Terrain, Direction, BulletOwner, EnemyType } from '../src/core/types';
import { updatePlayer } from '../src/player/player';
import { damagePlayer } from '../src/combat/combat';
import { judge } from '../src/core/update';
import { STEP_MS, INVINCIBLE_MS } from '../src/core/constants';
import {
  makeWorld,
  emptyLayout,
  cellCenter,
  addEnemy,
  runCombat,
  IDLE_INPUT,
} from './helpers';
import type { InputState } from '../src/input/input';

const FIRE: InputState = { move: null, fire: true };

function tickPlayer(world: ReturnType<typeof makeWorld>, input: InputState, steps = 1): void {
  for (let i = 0; i < steps; i++) updatePlayer(world, STEP_MS, input, world.players[0]);
}

describe('T-PLY-1 four-direction movement', () => {
  const cases: Array<[Direction, 'x' | 'y', 1 | -1]> = [
    [Direction.UP, 'y', -1],
    [Direction.DOWN, 'y', 1],
    [Direction.LEFT, 'x', -1],
    [Direction.RIGHT, 'x', 1],
  ];
  for (const [dir, axis, sign] of cases) {
    it(`moves ${dir}`, () => {
      const world = makeWorld();
      world.players[0].pos = cellCenter(6, 6);
      const before = world.players[0].pos[axis];
      tickPlayer(world, { move: dir, fire: false }, 10);
      expect(world.players[0].dir).toBe(dir);
      expect(Math.sign(world.players[0].pos[axis] - before)).toBe(sign);
    });
  }
});

describe('T-PLY-2 one player bullet on screen', () => {
  it('second fire while bullet alive is ignored', () => {
    const world = makeWorld();
    world.players[0].pos = cellCenter(12, 6);
    world.players[0].dir = Direction.UP;
    tickPlayer(world, FIRE);
    expect(world.bullets.filter((b) => b.owner === BulletOwner.PLAYER)).toHaveLength(1);
    tickPlayer(world, FIRE, 5);
    expect(world.bullets.filter((b) => b.owner === BulletOwner.PLAYER)).toHaveLength(1);
  });
});

describe('T-PLY-3 firing right is restored after every bullet-death path', () => {
  it('path: bullet hit a brick', () => {
    const layout = emptyLayout();
    layout[8][6] = Terrain.BRICK;
    const world = makeWorld(layout);
    world.players[0].pos = cellCenter(11, 6);
    world.players[0].dir = Direction.UP;
    tickPlayer(world, FIRE);
    runCombat(world, 1000);
    expect(world.bullets).toHaveLength(0);
    tickPlayer(world, FIRE);
    expect(world.bullets).toHaveLength(1);
  });

  it('path: bullet left the field', () => {
    const world = makeWorld();
    world.players[0].pos = cellCenter(1, 6);
    world.players[0].dir = Direction.UP;
    tickPlayer(world, FIRE);
    runCombat(world, 1000);
    expect(world.bullets).toHaveLength(0);
    tickPlayer(world, FIRE);
    expect(world.bullets).toHaveLength(1);
  });

  it('path: bullet annihilated with an enemy bullet', () => {
    const world = makeWorld();
    world.players[0].pos = cellCenter(6, 2);
    world.players[0].dir = Direction.RIGHT;
    tickPlayer(world, FIRE);
    world.bullets.push({
      pos: cellCenter(6, 10),
      dir: Direction.LEFT,
      speed: 192,
      owner: BulletOwner.ENEMY,
    });
    runCombat(world, 2000);
    expect(world.bullets).toHaveLength(0);
    tickPlayer(world, FIRE);
    expect(world.bullets.filter((b) => b.owner === BulletOwner.PLAYER)).toHaveLength(1);
  });

  it('path: bullet killed an enemy', () => {
    const world = makeWorld();
    world.players[0].pos = cellCenter(6, 2);
    world.players[0].dir = Direction.RIGHT;
    addEnemy(world, EnemyType.BASIC, 6, 8);
    tickPlayer(world, FIRE);
    runCombat(world, 2000);
    expect(world.bullets).toHaveLength(0);
    tickPlayer(world, FIRE);
    expect(world.bullets).toHaveLength(1);
  });
});

describe('T-PLY-4 no input → no drift', () => {
  it('player stays put without input', () => {
    const world = makeWorld();
    world.players[0].pos = cellCenter(6, 6);
    tickPlayer(world, IDLE_INPUT, 60);
    expect(world.players[0].pos).toEqual(cellCenter(6, 6));
  });
});

describe('T-PLY-5 respawn with invincibility window', () => {
  it('damage respawns at spawn point with 2s invincibility', () => {
    const world = makeWorld();
    world.clock = 30_000;
    world.players[0].pos = cellCenter(3, 3);
    damagePlayer(world, world.players[0]);
    expect(world.players[0].lives).toBe(2);
    expect(world.players[0].alive).toBe(true);
    expect(world.players[0].pos).toEqual(world.players[0].spawnPos);
    expect(world.players[0].invincibleUntil).toBe(world.clock + INVINCIBLE_MS);
  });
});

describe('T-PLY-6 last life lost → defeat, no respawn', () => {
  it('defeat on losing the final life', () => {
    const world = makeWorld();
    world.players[0].lives = 1;
    damagePlayer(world, world.players[0]);
    expect(world.players[0].alive).toBe(false);
    expect(world.players[0].lives).toBe(0);
    judge(world);
    expect(world.state).toBe(GameState.DEFEAT);
  });
});
