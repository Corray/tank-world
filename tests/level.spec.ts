// T-LVL-1~9 — level progression / retry / scoring layers (test-plan-r2 §2.1).

import { describe, it, expect } from 'vitest';
import { GameState, EnemyType, Terrain, Direction } from '../src/core/types';
import { GameLoop, togglePause, restartToReady } from '../src/core/game';
import { judge, updateWorld } from '../src/core/update';
import { createWorld } from '../src/core/world';
import { LEVELS, generateSpawnSequence, loadLevel, advanceLevel, retryLevel } from '../src/level/level';
import { SUB_ALL } from '../src/map/map';
import { PLAYER_LIVES, LEVEL_COUNT } from '../src/core/constants';
import { makeWorld, addEnemy, cellCenter } from './helpers';
import { PowerupType } from '../src/core/types';

function clearField(world: ReturnType<typeof makeWorld>): void {
  world.spawnedCount = world.enemyTotal;
  for (const e of world.enemies) e.alive = false;
}

describe('T-LVL-1 level clear banks the level score', () => {
  it('L1 clear → LEVEL_CLEAR, score banks, levelScore resets', () => {
    const world = makeWorld();
    world.score = 500;
    clearField(world);
    judge(world);
    expect(world.state).toBe(GameState.LEVEL_CLEAR);
    expect(world.bankedScore).toBe(500);
    expect(world.score).toBe(0);
    expect(world.lastLevelScore).toBe(500);
  });
});

describe('T-LVL-2 advancing to the next level', () => {
  it('LEVEL_CLEAR → PLAYING(L2) with fresh per-level state', () => {
    const world = makeWorld();
    world.score = 300;
    clearField(world);
    judge(world);
    world.powerups.push({ type: PowerupType.SHIELD, pos: cellCenter(6, 6) });
    advanceLevel(world);
    expect(world.state).toBe(GameState.PLAYING);
    expect(world.level).toBe(2);
    expect(world.enemyTotal).toBe(14);
    expect(world.spawnIntervalMs).toBe(2500);
    expect(world.spawnedCount).toBe(0);
    expect(world.enemies).toHaveLength(0);
    expect(world.powerups).toHaveLength(0);
    expect(world.spawnSequence).toHaveLength(14);
    // L2 layout actually loaded: (1,1) is STEEL in LEVELS[1].
    expect(world.map.terrainAt(1, 1)).toBe(Terrain.STEEL);
  });
});

describe('T-LVL-3 clearing the last level completes the run', () => {
  it('L3 clear → GAME_COMPLETE (not LEVEL_CLEAR)', () => {
    const world = createWorld();
    loadLevel(world, 3);
    world.state = GameState.PLAYING;
    world.bankedScore = 1000;
    world.score = 700;
    clearField(world);
    judge(world);
    expect(world.state).toBe(GameState.GAME_COMPLETE);
    expect(world.bankedScore).toBe(1700);
  });
});

describe('T-LVL-4 retry resets exactly the six fields (AC-15)', () => {
  it('level kept; levelScore/lives/map/powerups/spawns reset; banked kept', () => {
    const world = createWorld();
    loadLevel(world, 2);
    world.state = GameState.PLAYING;
    world.score = 300;
    world.bankedScore = 700;
    world.players[0].lives = 1;
    world.players[0].doubleFire = true;
    world.map.hitBrick(12, 5, Direction.UP);
    world.powerups.push({ type: PowerupType.BOMB, pos: cellCenter(6, 6) });
    world.spawnedCount = 5;
    world.state = GameState.DEFEAT;

    retryLevel(world);

    expect(world.state).toBe(GameState.PLAYING);
    expect(world.level).toBe(2); // not back to L1
    expect(world.score).toBe(0);
    expect(world.bankedScore).toBe(700);
    expect(world.players[0].lives).toBe(PLAYER_LIVES);
    expect(world.players[0].doubleFire).toBe(false); // death path loses double fire
    expect(world.powerups).toHaveLength(0);
    expect(world.spawnedCount).toBe(0);
    expect(world.map.subMask(12, 5)).toBe(SUB_ALL); // map sub-blocks restored
  });
});

describe('T-LVL-5 new run after GAME_COMPLETE clears everything', () => {
  it('R from GAME_COMPLETE → READY at L1 with zeroed scores', () => {
    const world = createWorld();
    world.state = GameState.GAME_COMPLETE;
    world.bankedScore = 2000;
    world.level = 3;
    const fresh = restartToReady(world);
    expect(fresh).not.toBe(world);
    expect(fresh.level).toBe(1);
    expect(fresh.bankedScore).toBe(0);
    expect(fresh.score).toBe(0);
  });
});

describe('T-LVL-6 LEVELS config matches consensus §3.7', () => {
  it('totals 10/14/18, intervals 3000/2500/2000', () => {
    const totals = LEVELS.map(
      (l) => l.enemyCounts.BASIC + l.enemyCounts.FAST + l.enemyCounts.ARMORED,
    );
    expect(totals).toEqual([10, 14, 18]);
    expect(LEVELS.map((l) => l.spawnIntervalMs)).toEqual([3000, 2500, 2000]);
    expect(LEVELS).toHaveLength(LEVEL_COUNT);
  });

  it('layouts are 13×13, pairwise different, base + double ring present', () => {
    const seen = new Set<string>();
    for (const l of LEVELS) {
      expect(l.layout).toHaveLength(13);
      for (const row of l.layout) expect(row).toHaveLength(13);
      seen.add(JSON.stringify(l.layout));
      expect(l.layout[12][6]).toBe(Terrain.BASE);
      // Double ring sample cells (AC-22): outer ring row 10 / inner row 11.
      expect(l.layout[10][4]).toBe(Terrain.BRICK);
      expect(l.layout[10][8]).toBe(Terrain.BRICK);
      expect(l.layout[11][5]).toBe(Terrain.BRICK);
      // Enemy spawn cells clear.
      expect(l.layout[0][0]).toBe(Terrain.EMPTY);
      expect(l.layout[0][6]).toBe(Terrain.EMPTY);
      expect(l.layout[0][12]).toBe(Terrain.EMPTY);
    }
    expect(seen.size).toBe(3); // pairwise different
  });
});

describe('T-LVL-7 lives carry across levels', () => {
  it('clearing L1 with 2 lives keeps 2 lives in L2', () => {
    const world = makeWorld();
    world.players[0].lives = 2;
    clearField(world);
    judge(world);
    advanceLevel(world);
    expect(world.level).toBe(2);
    expect(world.players[0].lives).toBe(2);
  });
});

describe('T-LVL-8 illegal transitions in R2 states', () => {
  it('pause is a no-op in LEVEL_CLEAR / GAME_COMPLETE', () => {
    const world = makeWorld();
    world.state = GameState.LEVEL_CLEAR;
    togglePause(world);
    expect(world.state).toBe(GameState.LEVEL_CLEAR);
    world.state = GameState.GAME_COMPLETE;
    togglePause(world);
    expect(world.state).toBe(GameState.GAME_COMPLETE);
  });

  it('no update (thus no firing) while DEFEAT', () => {
    const world = makeWorld();
    world.state = GameState.DEFEAT;
    const loop = new GameLoop(
      world,
      (w, dt) => updateWorld(w, dt, { move: null, fire: true }),
      () => {},
    );
    loop.advance(500);
    expect(world.bullets).toHaveLength(0);
  });
});

describe('T-LVL-9 spawn sequence generation (data-model §11)', () => {
  it('L2 counts 5/5/4 → 14 entries, round-robin interleave from the head', () => {
    const seq = generateSpawnSequence(LEVELS[1].enemyCounts);
    expect(seq).toHaveLength(14);
    expect(seq.filter((t) => t === EnemyType.BASIC)).toHaveLength(5);
    expect(seq.filter((t) => t === EnemyType.FAST)).toHaveLength(5);
    expect(seq.filter((t) => t === EnemyType.ARMORED)).toHaveLength(4);
    expect(seq.slice(0, 6)).toEqual([
      EnemyType.BASIC,
      EnemyType.FAST,
      EnemyType.ARMORED,
      EnemyType.BASIC,
      EnemyType.FAST,
      EnemyType.ARMORED,
    ]);
  });

  it('exhausted type drops out of the rotation (L2 tail is B,F)', () => {
    const seq = generateSpawnSequence(LEVELS[1].enemyCounts);
    expect(seq.slice(12)).toEqual([EnemyType.BASIC, EnemyType.FAST]);
  });
});

describe('addEnemy helper sanity for R2 worlds', () => {
  it('makeWorld still defaults to L1 numbers', () => {
    const world = makeWorld();
    expect(world.level).toBe(1);
    expect(world.enemyTotal).toBe(10);
    void addEnemy;
  });
});
