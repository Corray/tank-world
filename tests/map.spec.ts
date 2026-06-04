// T-MAP-1~3 — map module (test-plan §3.1). Source rules: consensus §3.1 (1/4 sub-blocks).

import { describe, it, expect } from 'vitest';
import { GameMap, SUB_TL, SUB_TR, SUB_BL, SUB_BR } from '../src/map/map';
import { Terrain, Direction } from '../src/core/types';
import { emptyLayout } from './helpers';

function brickAt(row: number, col: number): GameMap {
  const layout = emptyLayout();
  layout[row][col] = Terrain.BRICK;
  return new GameMap(layout);
}

describe('T-MAP-1 brick hit destroys impact-side sub-blocks only', () => {
  it('bullet travelling UP removes the bottom pair', () => {
    const map = brickAt(6, 6);
    expect(map.hitBrick(6, 6, Direction.UP)).toBe(true);
    expect(map.subMask(6, 6)).toBe(SUB_TL | SUB_TR);
    expect(map.terrainAt(6, 6)).toBe(Terrain.BRICK);
  });

  it('bullet travelling RIGHT removes the left pair', () => {
    const map = brickAt(6, 6);
    map.hitBrick(6, 6, Direction.RIGHT);
    expect(map.subMask(6, 6)).toBe(SUB_TR | SUB_BR);
  });

  it('bullet travelling DOWN removes the top pair', () => {
    const map = brickAt(6, 6);
    map.hitBrick(6, 6, Direction.DOWN);
    expect(map.subMask(6, 6)).toBe(SUB_BL | SUB_BR);
  });

  it('bullet travelling LEFT removes the right pair', () => {
    const map = brickAt(6, 6);
    map.hitBrick(6, 6, Direction.LEFT);
    expect(map.subMask(6, 6)).toBe(SUB_TL | SUB_BL);
  });
});

describe('T-MAP-2 clearing all sub-blocks empties the cell', () => {
  it('two same-direction hits clear the cell to EMPTY', () => {
    const map = brickAt(6, 6);
    map.hitBrick(6, 6, Direction.UP);
    map.hitBrick(6, 6, Direction.UP);
    expect(map.subMask(6, 6)).toBe(0);
    expect(map.terrainAt(6, 6)).toBe(Terrain.EMPTY);
  });
});

describe('T-MAP-3 steel is indestructible', () => {
  it('hitBrick on steel changes nothing', () => {
    const layout = emptyLayout();
    layout[6][6] = Terrain.STEEL;
    const map = new GameMap(layout);
    expect(map.hitBrick(6, 6, Direction.UP)).toBe(false);
    expect(map.terrainAt(6, 6)).toBe(Terrain.STEEL);
  });
});
