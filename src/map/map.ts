// Map module: 13x13 terrain grid + brick sub-block state (data-model §3/§7).
// Brick destruction granularity is 1/4 sub-blocks (consensus §3.1, G1 decision).

import { GRID, CELL, SUB } from '../core/constants';
import { Terrain, Direction } from '../core/types';

/** Sub-block bit positions within a brick cell: TL=1, TR=2, BL=4, BR=8. */
export const SUB_TL = 1;
export const SUB_TR = 2;
export const SUB_BL = 4;
export const SUB_BR = 8;
export const SUB_ALL = SUB_TL | SUB_TR | SUB_BL | SUB_BR;

// Layout legend: 0 EMPTY / 1 BRICK / 2 STEEL / 3 BASE.
// Design constraints (data-model §7): base at (12,6) with brick ring,
// player spawn (12,4), enemy spawns (0,0)/(0,6)/(0,12) kept clear.
// prettier-ignore
const LAYOUT: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
  [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
  [0, 1, 1, 0, 1, 1, 2, 1, 1, 0, 1, 1, 0],
  [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
  [0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0],
  [1, 1, 0, 1, 1, 0, 2, 0, 1, 1, 0, 1, 1],
  [0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0],
  [0, 2, 0, 0, 0, 1, 1, 1, 0, 0, 0, 2, 0],
  [0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0],
  [0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0],
  [0, 1, 0, 0, 0, 1, 3, 1, 0, 0, 0, 1, 0],
];

export class GameMap {
  private grid: Terrain[][];
  /** Alive sub-block mask per brick cell, keyed by row * GRID + col. */
  private brickSub: Map<number, number>;
  baseDestroyed = false;
  /** R8: rows of base cells that fell — per-side VERSUS judging (§3.21). */
  private destroyedBaseRows = new Set<number>();

  constructor(layout: number[][] = LAYOUT) {
    this.grid = layout.map((row) => row.map((v) => v as Terrain));
    this.brickSub = new Map();
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (this.grid[r][c] === Terrain.BRICK) {
          this.brickSub.set(r * GRID + c, SUB_ALL);
        }
      }
    }
  }

  terrainAt(row: number, col: number): Terrain {
    if (row < 0 || row >= GRID || col < 0 || col >= GRID) return Terrain.STEEL;
    return this.grid[row][col];
  }

  subMask(row: number, col: number): number {
    return this.brickSub.get(row * GRID + col) ?? 0;
  }

  /**
   * Whether a pixel point is blocked for tank movement.
   * Bricks block while any sub-block in the point's sub-cell survives.
   */
  solidForTankAt(x: number, y: number): boolean {
    const row = Math.floor(y / CELL);
    const col = Math.floor(x / CELL);
    const t = this.terrainAt(row, col);
    if (t === Terrain.STEEL || t === Terrain.BASE) return true;
    if (t === Terrain.WATER) return true; // C14 — blocks tanks, not bullets (R4)
    if (t === Terrain.BRICK) {
      return (this.subMask(row, col) & this.subBitAt(row, col, x, y)) !== 0;
    }
    return false; // EMPTY / BUSH / ICE are passable
  }

  /** Brick cells with any surviving sub-block (DEMOLITION judging, R4 §26). */
  brickCellsRemaining(): number {
    return this.brickSub.size;
  }

  /** Whether the tank center at (x, y) stands on ice (C16). */
  iceAt(x: number, y: number): boolean {
    return this.terrainAt(Math.floor(y / CELL), Math.floor(x / CELL)) === Terrain.ICE;
  }

  /** Whether an alive brick sub-block covers pixel (x, y). Used by bullets (C1). */
  brickSolidAt(x: number, y: number): boolean {
    const row = Math.floor(y / CELL);
    const col = Math.floor(x / CELL);
    if (this.terrainAt(row, col) !== Terrain.BRICK) return false;
    return (this.subMask(row, col) & this.subBitAt(row, col, x, y)) !== 0;
  }

  /** Sub-block bit covering pixel (x, y) inside brick cell (row, col). */
  private subBitAt(row: number, col: number, x: number, y: number): number {
    const right = x - col * CELL >= SUB;
    const bottom = y - row * CELL >= SUB;
    if (!right && !bottom) return SUB_TL;
    if (right && !bottom) return SUB_TR;
    if (!right && bottom) return SUB_BL;
    return SUB_BR;
  }

  /**
   * Destroy the brick sub-blocks on the impact side (consensus 1/4 granularity):
   * the two sub-blocks of the row/column facing the bullet's travel direction.
   * Returns true if anything was destroyed.
   */
  hitBrick(row: number, col: number, bulletDir: Direction): boolean {
    if (this.terrainAt(row, col) !== Terrain.BRICK) return false;
    const key = row * GRID + col;
    const mask = this.brickSub.get(key) ?? 0;
    if (mask === 0) return false;

    let impact: number;
    switch (bulletDir) {
      case Direction.UP:
        impact = SUB_BL | SUB_BR; // bullet travels up, hits bottom side
        break;
      case Direction.DOWN:
        impact = SUB_TL | SUB_TR;
        break;
      case Direction.LEFT:
        impact = SUB_TR | SUB_BR; // bullet travels left, hits right side
        break;
      case Direction.RIGHT:
        impact = SUB_TL | SUB_BL;
        break;
    }

    let next = mask & ~impact;
    // If the impact side was already gone, the bullet penetrates to the far side.
    if (next === mask) next = 0;
    if (next === 0) {
      this.brickSub.delete(key);
      this.grid[row][col] = Terrain.EMPTY;
    } else {
      this.brickSub.set(key, next);
    }
    return true;
  }

  destroyBase(row?: number): void {
    this.baseDestroyed = true;
    if (row !== undefined) this.destroyedBaseRows.add(row);
  }

  /** R10 §3.23: a L4 tank bullet destroys a steel cell (→ EMPTY). */
  breakSteel(row: number, col: number): void {
    if (this.terrainAt(row, col) === Terrain.STEEL) this.grid[row][col] = Terrain.EMPTY;
  }

  /** R8: whether the base cell in `row` has fallen; falls back to the single
   *  PvE flag when no per-row record exists (zero PvE regression). */
  baseDestroyedAt(row: number): boolean {
    return this.destroyedBaseRows.size > 0 ? this.destroyedBaseRows.has(row) : this.baseDestroyed;
  }

  /** R8 §3.21: a side's base is down — P1 = bottom half, P2 = top half. */
  versusBaseDown(side: 1 | 2): boolean {
    for (const r of this.destroyedBaseRows) {
      if (side === 1 && r >= GRID / 2) return true;
      if (side === 2 && r < GRID / 2) return true;
    }
    return false;
  }
}
