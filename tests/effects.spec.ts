// T-FX-1~7 — visual effects lifecycle (test-plan-r3 §2.1, data-model §17).

import { describe, it, expect } from 'vitest';
import { EffectKind, EnemyType, Terrain, Direction, BulletOwner, GameState } from '../src/core/types';
import { updateEffects } from '../src/effects/effects';
import { damagePlayer } from '../src/combat/combat';
import { GameLoop } from '../src/core/game';
import { updateWorld } from '../src/core/update';
import {
  EXPLOSION_MS,
  BASE_EXPLOSION_MS,
  SPARK_MS,
  SCORE_FLOAT_MS,
  FLASH_MS,
  ENEMY_SCORE,
  TANK_SIZE,
  STEP_MS,
} from '../src/core/constants';
import { makeWorld, emptyLayout, cellCenter, makeBullet, addEnemy, runCombat, IDLE_INPUT } from './helpers';

describe('T-FX-1 enemy kill spawns explosion + score float', () => {
  it('EXPLOSION and SCORE_FLOAT appear at the kill position', () => {
    const world = makeWorld();
    const enemy = addEnemy(world, EnemyType.FAST, 6, 8);
    world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 2000);
    expect(enemy.alive).toBe(false);
    const explosion = world.effects.find((e) => e.kind === EffectKind.EXPLOSION);
    const float = world.effects.find((e) => e.kind === EffectKind.SCORE_FLOAT);
    expect(explosion).toBeDefined();
    expect(explosion!.pos).toEqual(enemy.pos);
    expect(explosion!.durationMs).toBe(EXPLOSION_MS);
    expect(float).toBeDefined();
    expect(float!.text).toBe(`+${ENEMY_SCORE.FAST}`);
  });
});

describe('T-FX-2 base destruction spawns the big explosion', () => {
  it('BASE_EXPLOSION with 800ms duration', () => {
    const layout = emptyLayout();
    layout[6][6] = Terrain.BASE;
    const world = makeWorld(layout);
    world.bullets.push(makeBullet(BulletOwner.ENEMY, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 1000);
    expect(world.map.baseDestroyed).toBe(true);
    const boom = world.effects.find((e) => e.kind === EffectKind.BASE_EXPLOSION);
    expect(boom).toBeDefined();
    expect(boom!.durationMs).toBe(BASE_EXPLOSION_MS);
  });
});

describe('T-FX-3 brick/steel hits spawn sparks', () => {
  for (const t of [Terrain.BRICK, Terrain.STEEL]) {
    it(`${Terrain[t]} hit → SPARK`, () => {
      const layout = emptyLayout();
      layout[6][6] = t;
      const world = makeWorld(layout);
      world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT));
      runCombat(world, 1000);
      const spark = world.effects.find((e) => e.kind === EffectKind.SPARK);
      expect(spark).toBeDefined();
      expect(spark!.durationMs).toBe(SPARK_MS);
    });
  }
});

describe('T-FX-4 effects expire by clock', () => {
  it('an effect older than its duration is removed', () => {
    const world = makeWorld();
    world.effects.push({
      kind: EffectKind.SCORE_FLOAT,
      pos: cellCenter(6, 6),
      bornAt: world.clock,
      durationMs: SCORE_FLOAT_MS,
      text: '+100',
    });
    world.clock += SCORE_FLOAT_MS - 1;
    updateEffects(world);
    expect(world.effects).toHaveLength(1);
    world.clock += 2;
    updateEffects(world);
    expect(world.effects).toHaveLength(0);
  });
});

describe('T-FX-5 pause freezes effects (loop gate reuse)', () => {
  it('no expiry while PAUSED', () => {
    const world = makeWorld();
    world.effects.push({
      kind: EffectKind.EXPLOSION,
      pos: cellCenter(6, 6),
      bornAt: world.clock,
      durationMs: EXPLOSION_MS,
    });
    world.state = GameState.PAUSED;
    const loop = new GameLoop(world, (w, dt) => updateWorld(w, dt, IDLE_INPUT), () => {});
    loop.advance(EXPLOSION_MS * 4);
    expect(world.effects).toHaveLength(1);
  });
});

describe('T-FX-6 player hit triggers flash + explosion', () => {
  it('flashUntil set within the 200ms budget', () => {
    const world = makeWorld();
    world.clock = 30_000;
    const before = world.players[0].pos;
    damagePlayer(world, world.players[0]);
    expect(world.flashUntil).toBe(world.clock + FLASH_MS);
    expect(FLASH_MS).toBeLessThanOrEqual(200);
    const explosion = world.effects.find((e) => e.kind === EffectKind.EXPLOSION);
    expect(explosion).toBeDefined();
    expect(explosion!.pos).toEqual(before);
  });
});

describe('T-FX-7 effects never affect entity behaviour (sanity)', () => {
  it('a wall of effects does not block tank movement', () => {
    const world = makeWorld();
    world.players[0].pos = cellCenter(6, 6);
    for (let c = 0; c < 13; c++) {
      world.effects.push({
        kind: EffectKind.EXPLOSION,
        pos: cellCenter(6, c),
        bornAt: world.clock,
        durationMs: 10_000,
      });
    }
    const before = world.players[0].pos.x;
    runCombat(world, 0); // no-op sanity anchor
    updateWorld(world, STEP_MS * 10, { move: Direction.RIGHT, fire: false });
    expect(world.players[0].pos.x).toBeGreaterThan(before);
    void TANK_SIZE;
  });
});
