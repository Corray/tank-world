// Render module: procedural Canvas drawing, read-only over world state (N5).

import { GRID, CELL, SUB, FIELD, TANK_SIZE, BULLET_SIZE } from '../core/constants';
import { GameState, Terrain, Direction, BulletOwner, type EnemyType } from '../core/types';
import type { Tank } from '../core/types';
import { SUB_TL, SUB_TR, SUB_BL } from '../map/map';
import type { World } from '../core/world';

const COLOR = {
  brick: '#b5651d',
  brickMortar: '#7a4112',
  steel: '#c0c0c0',
  steelCore: '#e8e8e8',
  base: '#ffd700',
  player: '#4caf50',
  enemy: { BASIC: '#bdbdbd', FAST: '#42a5f5', ARMORED: '#ef5350' },
  bulletPlayer: '#ffffff',
  bulletEnemy: '#ff9800',
  overlayBg: 'rgba(0, 0, 0, 0.65)',
  overlayText: '#ffffff',
} as const;

export function render(ctx: CanvasRenderingContext2D, world: World): void {
  ctx.clearRect(0, 0, FIELD, FIELD);
  drawTerrain(ctx, world);
  for (const e of world.enemies) if (e.alive) drawTank(ctx, e, COLOR.enemy[e.type as EnemyType]);
  if (world.player.alive) drawPlayer(ctx, world);
  drawBullets(ctx, world);
  drawOverlay(ctx, world);
}

function drawTerrain(ctx: CanvasRenderingContext2D, world: World): void {
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const t = world.map.terrainAt(r, c);
      if (t === Terrain.BRICK) drawBrick(ctx, r, c, world.map.subMask(r, c));
      else if (t === Terrain.STEEL) drawSteel(ctx, r, c);
      else if (t === Terrain.BASE) drawBase(ctx, r, c, world.map.baseDestroyed);
    }
  }
}

function drawBrick(ctx: CanvasRenderingContext2D, row: number, col: number, mask: number): void {
  const bits = [SUB_TL, SUB_TR, SUB_BL, 8 /* SUB_BR */];
  for (let i = 0; i < 4; i++) {
    if ((mask & bits[i]) === 0) continue;
    const x = col * CELL + (i % 2) * SUB;
    const y = row * CELL + Math.floor(i / 2) * SUB;
    ctx.fillStyle = COLOR.brick;
    ctx.fillRect(x, y, SUB, SUB);
    ctx.strokeStyle = COLOR.brickMortar;
    ctx.strokeRect(x + 0.5, y + 0.5, SUB - 1, SUB - 1);
  }
}

function drawSteel(ctx: CanvasRenderingContext2D, row: number, col: number): void {
  const x = col * CELL;
  const y = row * CELL;
  ctx.fillStyle = COLOR.steel;
  ctx.fillRect(x, y, CELL, CELL);
  ctx.fillStyle = COLOR.steelCore;
  ctx.fillRect(x + 8, y + 8, CELL - 16, CELL - 16);
}

function drawBase(ctx: CanvasRenderingContext2D, row: number, col: number, destroyed: boolean): void {
  const x = col * CELL;
  const y = row * CELL;
  ctx.fillStyle = destroyed ? '#555' : COLOR.base;
  // Simple eagle: triangle body + head square.
  ctx.beginPath();
  ctx.moveTo(x + CELL / 2, y + 4);
  ctx.lineTo(x + 4, y + CELL - 4);
  ctx.lineTo(x + CELL - 4, y + CELL - 4);
  ctx.closePath();
  ctx.fill();
}

function drawTank(ctx: CanvasRenderingContext2D, tank: Tank, color: string): void {
  const half = TANK_SIZE / 2;
  const { x, y } = tank.pos;
  ctx.fillStyle = color;
  ctx.fillRect(x - half, y - half, TANK_SIZE, TANK_SIZE);
  // Barrel indicates facing.
  ctx.fillStyle = '#222';
  const bw = 6;
  const bl = half + 2;
  switch (tank.dir) {
    case Direction.UP:
      ctx.fillRect(x - bw / 2, y - bl, bw, bl);
      break;
    case Direction.DOWN:
      ctx.fillRect(x - bw / 2, y, bw, bl);
      break;
    case Direction.LEFT:
      ctx.fillRect(x - bl, y - bw / 2, bl, bw);
      break;
    case Direction.RIGHT:
      ctx.fillRect(x, y - bw / 2, bl, bw);
      break;
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, world: World): void {
  const invincible = world.clock < world.player.invincibleUntil;
  // Invincibility flicker: skip drawing every other 100ms slot.
  if (invincible && Math.floor(world.clock / 100) % 2 === 0) {
    drawTank(ctx, world.player, '#a5d6a7');
  } else {
    drawTank(ctx, world.player, COLOR.player);
  }
  if (invincible) {
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(
      world.player.pos.x - TANK_SIZE / 2 - 2,
      world.player.pos.y - TANK_SIZE / 2 - 2,
      TANK_SIZE + 4,
      TANK_SIZE + 4,
    );
  }
}

function drawBullets(ctx: CanvasRenderingContext2D, world: World): void {
  for (const b of world.bullets) {
    ctx.fillStyle = b.owner === BulletOwner.PLAYER ? COLOR.bulletPlayer : COLOR.bulletEnemy;
    ctx.fillRect(b.pos.x - BULLET_SIZE / 2, b.pos.y - BULLET_SIZE / 2, BULLET_SIZE, BULLET_SIZE);
  }
}

function drawOverlay(ctx: CanvasRenderingContext2D, world: World): void {
  const total = world.bankedScore + world.score;
  const messages: Partial<Record<GameState, string[]>> = {
    [GameState.READY]: ['TANK WORLD', 'Press any move/fire key to start'],
    [GameState.PAUSED]: ['PAUSED', 'Press P to resume'],
    [GameState.LEVEL_CLEAR]: [
      `LEVEL ${world.level} CLEAR!`,
      `Level score: ${world.lastLevelScore}   Total: ${total}`,
      'Press any move/fire key for next level',
    ],
    [GameState.GAME_COMPLETE]: [
      'YOU WIN!',
      `Total score: ${total}`,
      'Press R for a new run',
    ],
    [GameState.DEFEAT]: [
      'GAME OVER',
      `Total: ${total}`,
      `Press R to retry level ${world.level}`,
    ],
  };
  const lines = messages[world.state];
  if (!lines) return;
  ctx.fillStyle = COLOR.overlayBg;
  ctx.fillRect(0, 0, FIELD, FIELD);
  ctx.fillStyle = COLOR.overlayText;
  ctx.textAlign = 'center';
  lines.forEach((line, i) => {
    ctx.font = i === 0 ? 'bold 32px monospace' : '16px monospace';
    ctx.fillText(line, FIELD / 2, FIELD / 2 - 24 + i * 32);
  });
}
