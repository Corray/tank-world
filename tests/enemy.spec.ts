// T-ENM-1~7 — enemy spawn scheduling + type attributes (test-plan §3.3, data-model §6).

import { describe, it, expect } from 'vitest';
import { EnemyType } from '../src/core/types';
import { createEnemy, trySpawnEnemy, SPAWN_CELLS } from '../src/enemy/enemy';
import {
  ENEMY_TOTAL,
  ENEMY_CONCURRENT,
  ENEMY_SPEED,
  ENEMY_FAST_FACTOR,
  ENEMY_HP,
  ENEMY_SCORE,
  SPAWN_INTERVAL_MS,
  STEP_MS,
  CELL,
} from '../src/core/constants';
import { makeWorld, cellCenter, addEnemy } from './helpers';
import type { World } from '../src/core/world';

/** Run only the spawner for `ms`. */
function runSpawner(world: World, ms: number): void {
  for (let t = 0; t < ms; t += STEP_MS) trySpawnEnemy(world, STEP_MS);
}

function killAll(world: World): void {
  for (const e of world.enemies) e.alive = false;
}

describe('T-ENM-1 spawn caps: concurrent ≤ 4, total ≤ 10', () => {
  // 骨架修正 2026-06-04：原断言「静止敌人下饱和到 4」不可满足——3 个出生点被
  // 静止敌人占满后第 4 辆按 defer 语义永远无法出生（与 T-ENM-2 联立无解）。
  // 改为两个可判定断言：①出生点占满时停在 3 且不叠出生；②场上 4 辆时即使出生点空闲也不再出生。
  it('stalls at 3 when stationary enemies occupy all spawn points (no stacking)', () => {
    const world = makeWorld();
    runSpawner(world, SPAWN_INTERVAL_MS * 8);
    expect(world.enemies.filter((e) => e.alive)).toHaveLength(SPAWN_CELLS.length);
  });

  it('no spawn while 4 enemies are alive even with free spawn points', () => {
    const world = makeWorld();
    for (const col of [2, 4, 8, 10]) addEnemy(world, EnemyType.BASIC, 6, col);
    runSpawner(world, SPAWN_INTERVAL_MS * 4);
    expect(world.enemies).toHaveLength(ENEMY_CONCURRENT);
  });

  it('total spawn count never exceeds 10', () => {
    const world = makeWorld();
    for (let round = 0; round < 8; round++) {
      runSpawner(world, SPAWN_INTERVAL_MS * 3);
      killAll(world);
    }
    expect(world.spawnedCount).toBe(ENEMY_TOTAL);
  });
});

describe('T-ENM-2 occupied spawn point defers, never stacks', () => {
  it('no spawn while the target point is occupied; spawns after it frees up', () => {
    const world = makeWorld();
    // Occupy the first spawn point with the player.
    world.players[0].pos = cellCenter(SPAWN_CELLS[0].row, SPAWN_CELLS[0].col);
    runSpawner(world, SPAWN_INTERVAL_MS * 4);
    expect(world.spawnedCount).toBe(0);
    // Free the point: move the player far away.
    world.players[0].pos = cellCenter(12, 6);
    runSpawner(world, SPAWN_INTERVAL_MS * 2);
    expect(world.spawnedCount).toBeGreaterThanOrEqual(1);
    const first = world.enemies[0];
    expect(first.pos).toEqual(cellCenter(SPAWN_CELLS[0].row, SPAWN_CELLS[0].col));
  });
});

describe('T-ENM-3 spawn point cursor rotation', () => {
  it('first three spawns land on (0,0) → (0,6) → (0,12)', () => {
    const world = makeWorld();
    world.players[0].pos = cellCenter(12, 6);
    runSpawner(world, SPAWN_INTERVAL_MS * 4);
    expect(world.enemies.length).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < 3; i++) {
      expect(world.enemies[i].pos).toEqual(
        cellCenter(SPAWN_CELLS[i % 3].row, SPAWN_CELLS[i % 3].col),
      );
    }
  });
});

// 基线修订 2026-06-04（共识 v2 §3.7/3.8）：v1 固定 SPAWN_SEQUENCE 废弃，
// 改为按构成生成（数据模型 §11）；断言改为构成计数 + 携带者位（AC-16）。
describe('T-ENM-4 spawn composition + carrier positions (L1)', () => {
  it('spawned types match L1 counts (4/3/3) and carriers sit at #4/#8', () => {
    const world = makeWorld();
    world.players[0].pos = cellCenter(12, 6);
    for (let round = 0; round < 8; round++) {
      runSpawner(world, SPAWN_INTERVAL_MS * 3);
      killAll(world);
    }
    const types = world.enemies.map((e) => e.type);
    expect(types).toHaveLength(ENEMY_TOTAL);
    expect(types.filter((t) => t === EnemyType.BASIC)).toHaveLength(4);
    expect(types.filter((t) => t === EnemyType.FAST)).toHaveLength(3);
    expect(types.filter((t) => t === EnemyType.ARMORED)).toHaveLength(3);
    const carrierIdx = world.enemies.flatMap((e, i) => (e.carrier ? [i + 1] : []));
    expect(carrierIdx).toEqual([4, 8]); // L1 total 10 → only positions 4/8
  });
});

describe('T-ENM-5/6/7 type attribute matrix (family: type × {speed, hp, score})', () => {
  const expected: Array<[EnemyType, number, number, number]> = [
    [EnemyType.BASIC, ENEMY_SPEED, ENEMY_HP.BASIC, ENEMY_SCORE.BASIC],
    [EnemyType.FAST, ENEMY_SPEED * ENEMY_FAST_FACTOR, ENEMY_HP.FAST, ENEMY_SCORE.FAST],
    [EnemyType.ARMORED, ENEMY_SPEED, ENEMY_HP.ARMORED, ENEMY_SCORE.ARMORED],
  ];
  for (const [type, speed, hp, score] of expected) {
    it(`${type}: speed=${speed} hp=${hp} score=${score}`, () => {
      const e = createEnemy(type, { x: CELL, y: CELL });
      expect(e.speed).toBe(speed);
      expect(e.hp).toBe(hp);
      expect(e.score).toBe(score);
    });
  }
});
