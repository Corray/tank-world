// T-SM-1~8 — game state machine + scoring HUD source (test-plan §3.4, data-model §4).

import { describe, it, expect } from 'vitest';
import { GameState, EnemyType, Direction, BulletOwner } from '../src/core/types';
import { GameLoop, startGame, togglePause, restartToReady } from '../src/core/game';
import { judge, updateWorld } from '../src/core/update';
import { createWorld } from '../src/core/world';
import { enemiesRemaining } from '../src/hud/hud';
import { ENEMY_TOTAL, PLAYER_LIVES, STEP_MS } from '../src/core/constants';
import { makeWorld, addEnemy, cellCenter, makeBullet, runCombat, IDLE_INPUT } from './helpers';

describe('T-SM-1 READY → PLAYING on action', () => {
  it('startGame transitions READY to PLAYING', () => {
    const world = createWorld();
    expect(world.state).toBe(GameState.READY);
    startGame(world);
    expect(world.state).toBe(GameState.PLAYING);
  });
});

describe('T-SM-2 score accumulation + HUD data source', () => {
  it('enemiesRemaining = unspawned + alive on field', () => {
    const world = makeWorld();
    expect(enemiesRemaining(world)).toBe(ENEMY_TOTAL);
    addEnemy(world, EnemyType.BASIC, 0, 0); // spawnedCount 1, alive 1
    expect(enemiesRemaining(world)).toBe(ENEMY_TOTAL);
    world.enemies[0].alive = false;
    expect(enemiesRemaining(world)).toBe(ENEMY_TOTAL - 1);
  });

  it('score only grows', () => {
    const world = makeWorld();
    addEnemy(world, EnemyType.BASIC, 6, 8);
    world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 2000);
    const after = world.score;
    expect(after).toBeGreaterThan(0);
    runCombat(world, 500);
    expect(world.score).toBe(after);
  });
});

describe('T-SM-3 both defeat entries', () => {
  it('base destroyed → DEFEAT', () => {
    const world = makeWorld();
    world.map.destroyBase();
    judge(world);
    expect(world.state).toBe(GameState.DEFEAT);
  });

  it('lives exhausted → DEFEAT', () => {
    const world = makeWorld();
    world.players[0].lives = 0;
    world.players[0].alive = false;
    judge(world);
    expect(world.state).toBe(GameState.DEFEAT);
  });
});

describe('T-SM-4 same-frame base + lives defeat: single DEFEAT, idempotent', () => {
  it('both conditions in one frame yield exactly DEFEAT', () => {
    const world = makeWorld();
    world.map.destroyBase();
    world.players[0].lives = 0;
    world.players[0].alive = false;
    judge(world);
    expect(world.state).toBe(GameState.DEFEAT);
    judge(world); // second judgement must not change or throw
    expect(world.state).toBe(GameState.DEFEAT);
  });
});

describe('T-SM-5 pause freezes everything', () => {
  it('PLAYING ↔ PAUSED toggling', () => {
    const world = makeWorld();
    togglePause(world);
    expect(world.state).toBe(GameState.PAUSED);
    togglePause(world);
    expect(world.state).toBe(GameState.PLAYING);
  });

  it('no clock/entity advance while paused (loop-level gate)', () => {
    const world = makeWorld();
    addEnemy(world, EnemyType.BASIC, 0, 0);
    world.bullets.push(makeBullet(BulletOwner.ENEMY, cellCenter(6, 6), Direction.RIGHT));
    togglePause(world);
    const loop = new GameLoop(world, (w, dt) => updateWorld(w, dt, IDLE_INPUT), () => {});
    const bulletX = world.bullets[0].pos.x;
    const clock = world.clock;
    loop.advance(1000);
    expect(world.clock).toBe(clock);
    expect(world.bullets[0].pos.x).toBe(bulletX);
  });
});

describe('T-SM-6 illegal transitions are no-ops', () => {
  it('pause toggle ignored outside PLAYING/PAUSED', () => {
    const world = createWorld(); // READY
    togglePause(world);
    expect(world.state).toBe(GameState.READY);
  });

  it('startGame ignored in DEFEAT', () => {
    const world = makeWorld();
    world.state = GameState.DEFEAT;
    startGame(world);
    expect(world.state).toBe(GameState.DEFEAT);
  });

  it('victory judgement does not fire while PAUSED', () => {
    const world = makeWorld();
    world.spawnedCount = ENEMY_TOTAL; // field clear + all spawned
    world.state = GameState.PAUSED;
    judge(world);
    expect(world.state).toBe(GameState.PAUSED);
  });

  it('restart ignored while PLAYING', () => {
    const world = makeWorld();
    world.score = 500;
    const same = restartToReady(world);
    expect(same).toBe(world);
    expect(same.score).toBe(500);
  });
});

// 基线修订 2026-06-04（共识 v2 §3.7，数据模型 §10）：VICTORY 拆分为
// LEVEL_CLEAR（L1/L2）与 GAME_COMPLETE（L3）。L1 清场断言改为 LEVEL_CLEAR。
describe('T-SM-7 tenth kill with clear field → LEVEL_CLEAR (level 1 of 3)', () => {
  it('all spawned + none alive on L1 → LEVEL_CLEAR', () => {
    const world = makeWorld();
    world.spawnedCount = ENEMY_TOTAL;
    const e = addEnemy(world, EnemyType.BASIC, 6, 8);
    world.spawnedCount = ENEMY_TOTAL; // addEnemy bumped it; restore exact total
    judge(world);
    expect(world.state).toBe(GameState.PLAYING); // one still alive
    e.alive = false;
    judge(world);
    expect(world.state).toBe(GameState.LEVEL_CLEAR);
  });
});

// 基线修订 2026-06-04（数据模型 §10）：全新 run 入口从 VICTORY 改为 GAME_COMPLETE
//（DEFEAT 的 R 改走 retryLevel，由 T-LVL-4 覆盖）。
describe('T-SM-8 restart fully resets the world', () => {
  it('fresh world from GAME_COMPLETE: score, lives, map, spawn counters', () => {
    const world = makeWorld();
    world.state = GameState.GAME_COMPLETE;
    world.score = 1234;
    world.players[0].lives = 1;
    world.spawnedCount = ENEMY_TOTAL;
    world.map.hitBrick(1, 1, Direction.UP); // damage the default map? (custom empty here)
    const fresh = restartToReady(world);
    expect(fresh).not.toBe(world);
    expect(fresh.state).toBe(GameState.READY);
    expect(fresh.score).toBe(0);
    expect(fresh.players[0].lives).toBe(PLAYER_LIVES); // R6-D 迁移（fresh.player 漏网点，CI 红灯拦截后补）
    expect(fresh.spawnedCount).toBe(0);
    expect(fresh.bullets).toHaveLength(0);
    expect(fresh.enemies).toHaveLength(0);
    // Default map restored: brick ring cell next to the base is intact.
    expect(fresh.map.subMask(11, 5)).toBeGreaterThan(0);
  });
});

describe('GameLoop fixed timestep accounting', () => {
  it('advance(1s) while PLAYING ticks the clock by ~1s in STEP_MS quanta', () => {
    const world = makeWorld();
    const loop = new GameLoop(world, () => {}, () => {});
    loop.advance(STEP_MS * 10);
    expect(world.clock).toBeCloseTo(STEP_MS * 10, 3);
  });
});
