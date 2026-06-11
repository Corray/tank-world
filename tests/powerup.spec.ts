// T-PWR-1~10 — powerup lifecycle / effects (test-plan-r2 §2.3, data-model §12).

import { describe, it, expect } from 'vitest';
import { GameState, EnemyType, Direction, BulletOwner, PowerupType } from '../src/core/types';
import { dropFromCarrier, updatePowerups } from '../src/powerup/powerup';
import { updatePlayer, damagePlayer } from '../src/player/player';
import { judge, updateWorld } from '../src/core/update';
import { advanceLevel } from '../src/level/level';
import { SHIELD_MS, STEP_MS } from '../src/core/constants';
import { makeWorld, addEnemy, cellCenter, makeBullet, runCombat, IDLE_INPUT } from './helpers';
import type { InputState } from '../src/input/input';

const FIRE: InputState = { move: null, fire: true };

describe('T-PWR-1 carrier death drops the cycle powerup', () => {
  it('combat kill of a carrier drops SHIELD first (cycle head)', () => {
    const world = makeWorld();
    const enemy = addEnemy(world, EnemyType.BASIC, 6, 8);
    enemy.carrier = true;
    world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 2000);
    expect(enemy.alive).toBe(false);
    expect(world.powerups).toHaveLength(1);
    expect(world.powerups[0].type).toBe(PowerupType.SHIELD);
    expect(world.powerups[0].pos).toEqual(enemy.pos);
  });

  // 基线修订 2026-06-09（共识 v9 §3.23）：DROP_CYCLE 3→4 cycle（加 STAR）。
  // 基线修订 2026-06-11（共识 v11 §3.25，test-plan-r12 §2 预判内）：4→7 cycle
  // （尾部追加 铲→冻→命），wrap 断言扩到 8 次掉落；前缀守护见 T-ITM-G2。
  it('drop cycle: shield → double-fire → bomb → star → shovel → freeze → life → shield (7-cycle wrap)', () => {
    const world = makeWorld();
    const pos = cellCenter(6, 6);
    for (let i = 0; i < 8; i++) dropFromCarrier(world, pos);
    expect(world.powerups.map((p) => p.type)).toEqual([
      PowerupType.SHIELD,
      PowerupType.DOUBLE_FIRE,
      PowerupType.BOMB,
      PowerupType.STAR,
      PowerupType.SHOVEL,
      PowerupType.FREEZE,
      PowerupType.LIFE,
      PowerupType.SHIELD,
    ]);
  });
});

describe('T-PWR-2 non-carrier death drops nothing', () => {
  it('plain enemy kill leaves no powerup', () => {
    const world = makeWorld();
    addEnemy(world, EnemyType.BASIC, 6, 8);
    world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 2000);
    expect(world.powerups).toHaveLength(0);
  });
});

describe('T-PWR-3 pickup is player-only (C13)', () => {
  it('player overlapping picks up; effect applies; powerup removed', () => {
    const world = makeWorld();
    world.players[0].pos = cellCenter(6, 6);
    world.powerups.push({ type: PowerupType.SHIELD, pos: cellCenter(6, 6) });
    updatePowerups(world);
    expect(world.powerups).toHaveLength(0);
    expect(world.players[0].shieldUntil).toBe(world.clock + SHIELD_MS);
  });

  it('enemy overlapping does not pick up', () => {
    const world = makeWorld();
    world.players[0].pos = cellCenter(12, 0);
    addEnemy(world, EnemyType.BASIC, 6, 6);
    world.powerups.push({ type: PowerupType.BOMB, pos: cellCenter(6, 6) });
    updatePowerups(world);
    expect(world.powerups).toHaveLength(1);
  });
});

describe('T-PWR-4 shield effect window', () => {
  it('shielded player survives a hit (bullet consumed), then turns vulnerable', () => {
    const world = makeWorld();
    world.clock = 10_000;
    world.players[0].pos = cellCenter(6, 8);
    world.players[0].shieldUntil = world.clock + SHIELD_MS;
    world.bullets.push(makeBullet(BulletOwner.ENEMY, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 1500);
    expect(world.bullets).toHaveLength(0);
    expect(world.players[0].lives).toBe(3);
    // Window expired → next hit damages.
    world.clock = world.players[0].shieldUntil + 1;
    world.players[0].invincibleUntil = 0;
    world.bullets.push(makeBullet(BulletOwner.ENEMY, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 1500);
    expect(world.players[0].lives).toBe(2);
  });

  it('re-pickup refreshes the deadline', () => {
    const world = makeWorld();
    world.clock = 50_000;
    world.players[0].pos = cellCenter(6, 6);
    world.players[0].shieldUntil = world.clock + 1000; // stale shield
    world.powerups.push({ type: PowerupType.SHIELD, pos: cellCenter(6, 6) });
    updatePowerups(world);
    expect(world.players[0].shieldUntil).toBe(world.clock + SHIELD_MS);
  });
});

describe('T-PWR-5 double fire allows two on-screen bullets', () => {
  it('2 allowed, 3rd rejected, slot frees on bullet death', () => {
    const world = makeWorld();
    world.players[0].pos = cellCenter(6, 2);
    world.players[0].dir = Direction.RIGHT;
    world.players[0].doubleFire = true;
    updatePlayer(world, STEP_MS, FIRE, world.players[0]);
    world.players[0].pos = cellCenter(8, 2); // move so 2nd bullet spawns apart
    updatePlayer(world, STEP_MS, FIRE, world.players[0]);
    expect(world.bullets).toHaveLength(2);
    updatePlayer(world, STEP_MS, FIRE, world.players[0]);
    expect(world.bullets).toHaveLength(2); // 3rd rejected
    runCombat(world, 3000); // both leave the field
    expect(world.bullets).toHaveLength(0);
    updatePlayer(world, STEP_MS, FIRE, world.players[0]);
    expect(world.bullets).toHaveLength(1);
  });
});

describe('T-PWR-6 double fire is lost on death', () => {
  it('damagePlayer clears doubleFire', () => {
    const world = makeWorld();
    world.players[0].doubleFire = true;
    damagePlayer(world, world.players[0]);
    expect(world.players[0].doubleFire).toBe(false);
  });
});

describe('T-PWR-7 double fire survives level clear', () => {
  it('advanceLevel keeps doubleFire (AC-18)', () => {
    const world = makeWorld();
    world.players[0].doubleFire = true;
    world.spawnedCount = world.enemyTotal;
    judge(world);
    expect(world.state).toBe(GameState.LEVEL_CLEAR);
    advanceLevel(world);
    expect(world.players[0].doubleFire).toBe(true);
  });
});

describe('T-PWR-8 bomb kills the field without scoring', () => {
  it('all alive enemies die, score unchanged, spawning continues', () => {
    const world = makeWorld();
    world.score = 100;
    addEnemy(world, EnemyType.BASIC, 2, 2);
    addEnemy(world, EnemyType.FAST, 2, 10);
    addEnemy(world, EnemyType.ARMORED, 8, 6);
    world.players[0].pos = cellCenter(12, 0);
    world.powerups.push({ type: PowerupType.BOMB, pos: cellCenter(12, 0) });
    updatePowerups(world);
    expect(world.enemies.every((e) => !e.alive)).toBe(true);
    expect(world.score).toBe(100);
    expect(world.spawnedCount).toBe(3); // unspawned quota untouched
  });
});

describe('T-PWR-9 bomb beats same-frame bullet scoring (risk §15)', () => {
  it('enemy bombed in the pickup phase cannot be scored by a bullet that frame', () => {
    const world = makeWorld();
    const enemy = addEnemy(world, EnemyType.BASIC, 6, 8);
    // Bullet one sub-step away from the enemy.
    world.bullets.push(
      makeBullet(BulletOwner.PLAYER, { x: enemy.pos.x - 20, y: enemy.pos.y }, Direction.RIGHT),
    );
    world.players[0].pos = cellCenter(12, 0);
    world.powerups.push({ type: PowerupType.BOMB, pos: cellCenter(12, 0) });
    updateWorld(world, STEP_MS, IDLE_INPUT);
    expect(enemy.alive).toBe(false);
    expect(world.score).toBe(0); // bomb kill — never scored
  });
});

describe('T-PWR-10 field powerups are cleared on level transition', () => {
  it('unpicked powerups vanish at advanceLevel', () => {
    const world = makeWorld();
    world.powerups.push({ type: PowerupType.DOUBLE_FIRE, pos: cellCenter(3, 3) });
    world.spawnedCount = world.enemyTotal;
    judge(world);
    advanceLevel(world);
    expect(world.powerups).toHaveLength(0);
  });
});
