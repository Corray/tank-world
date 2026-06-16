// Render module: procedural Canvas drawing, read-only over world state (N5).

import { GRID, CELL, SUB, FIELD, TANK_SIZE, BULLET_SIZE, ENEMY_HP } from '../core/constants';
import { GameState, Terrain, Direction, BulletOwner, PowerupType, EffectKind, EnemyType, isBossType } from '../core/types';
import type { Tank, PlayerTank, EnemyTank } from '../core/types';
import { SUB_TL, SUB_TR, SUB_BL } from '../map/map';
import { POWERUP_SIZE } from '../powerup/powerup';
import { unlockedCount, ACHIEVEMENT_COUNT } from '../achievements/achievements';
import type { World } from '../core/world';

const COLOR = {
  brick: '#b5651d',
  brickMortar: '#7a4112',
  steel: '#c0c0c0',
  steelCore: '#e8e8e8',
  base: '#ffd700',
  player: '#4caf50',
  player2: '#7986cb',
  enemy: { BASIC: '#bdbdbd', FAST: '#42a5f5', ARMORED: '#ef5350', BOSS: '#ab47bc', SUMMONER: '#ff7043', GUARDIAN: '#26a69a' },
  bulletPlayer: '#ffffff',
  bulletEnemy: '#ff9800',
  overlayBg: 'rgba(0, 0, 0, 0.65)',
  overlayText: '#ffffff',
} as const;

export function render(ctx: CanvasRenderingContext2D, world: World): void {
  ctx.clearRect(0, 0, FIELD, FIELD);
  drawTerrain(ctx, world);
  drawPowerups(ctx, world);
  for (const e of world.enemies) {
    if (!e.alive) continue;
    // R2: carriers flicker between type color and gold (AC-16).
    const flicker = e.carrier && Math.floor(world.clock / 150) % 2 === 0;
    drawTank(ctx, e, flicker ? '#ffd700' : COLOR.enemy[e.type as EnemyType]);
    if (isBossType(e.type)) drawBossHp(ctx, e); // R11 boss / R15 summoner HP bar
    if (e.guardUntil !== undefined && world.clock < e.guardUntil) drawGuardRing(ctx, e); // R16
  }
  for (const p of world.players) if (p.alive) drawPlayer(ctx, world, p);
  drawBullets(ctx, world);
  drawBushOverlay(ctx, world); // bushes above tanks, below effects (AC-32)
  drawEffects(ctx, world);
  drawFlash(ctx, world);
  drawOverlay(ctx, world);
}

/** R3: visual effects — read-only, driven purely by clock age (AC-23~24). */
function drawEffects(ctx: CanvasRenderingContext2D, world: World): void {
  for (const e of world.effects) {
    const t = Math.min(1, (world.clock - e.bornAt) / e.durationMs); // 0..1 age
    if (e.kind === EffectKind.EXPLOSION || e.kind === EffectKind.BASE_EXPLOSION) {
      const maxR = e.kind === EffectKind.BASE_EXPLOSION ? CELL * 2 : CELL * 0.8;
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = e.color ?? '#ffab40';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.pos.x, e.pos.y, 4 + maxR * t, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(e.pos.x, e.pos.y, (4 + maxR * t) * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (e.kind === EffectKind.SPARK) {
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = '#fff59d';
      const s = 3 + 3 * (1 - t);
      ctx.fillRect(e.pos.x - s / 2, e.pos.y - s / 2, s, s);
      ctx.globalAlpha = 1;
    } else if (e.kind === EffectKind.SCORE_FLOAT) {
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(e.text ?? '', e.pos.x, e.pos.y - 18 * t);
      ctx.globalAlpha = 1;
    } else if (e.kind === EffectKind.TOAST) {
      // R4: achievement banner, top-center (AC-36).
      const alpha = t > 0.85 ? (1 - t) / 0.15 : 1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(e.pos.x - 120, e.pos.y - 12, 240, 24);
      ctx.strokeStyle = '#ffd700';
      ctx.strokeRect(e.pos.x - 120, e.pos.y - 12, 240, 24);
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(e.text ?? '', e.pos.x, e.pos.y + 4);
      ctx.globalAlpha = 1;
    }
  }
  ctx.lineWidth = 1;
}

/** R3: player-hit full-screen white flash, ≤200ms (AC-25). */
function drawFlash(ctx: CanvasRenderingContext2D, world: World): void {
  if (world.clock >= world.flashUntil) return;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.fillRect(0, 0, FIELD, FIELD);
}

/** R2: dropped powerups — white tile with a type letter (S/F/B). */
function drawPowerups(ctx: CanvasRenderingContext2D, world: World): void {
  const LETTER: Record<PowerupType, string> = {
    [PowerupType.SHIELD]: 'S',
    [PowerupType.DOUBLE_FIRE]: 'F',
    [PowerupType.BOMB]: 'B',
    [PowerupType.STAR]: '★',
    [PowerupType.SHOVEL]: '⛏',
    [PowerupType.FREEZE]: '❄',
    [PowerupType.LIFE]: '♥',
  };
  for (const pu of world.powerups) {
    const half = POWERUP_SIZE / 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(pu.pos.x - half, pu.pos.y - half, POWERUP_SIZE, POWERUP_SIZE);
    ctx.strokeStyle = '#e91e63';
    ctx.strokeRect(pu.pos.x - half + 1, pu.pos.y - half + 1, POWERUP_SIZE - 2, POWERUP_SIZE - 2);
    ctx.fillStyle = '#e91e63';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LETTER[pu.type], pu.pos.x, pu.pos.y + 1);
    ctx.textBaseline = 'alphabetic';
  }
}

function drawTerrain(ctx: CanvasRenderingContext2D, world: World): void {
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const t = world.map.terrainAt(r, c);
      if (t === Terrain.BRICK) drawBrick(ctx, r, c, world.map.subMask(r, c));
      else if (t === Terrain.STEEL) drawSteel(ctx, r, c);
      else if (t === Terrain.BASE) drawBase(ctx, r, c, world.map.baseDestroyedAt(r));
      else if (t === Terrain.WATER) drawWater(ctx, r, c);
      else if (t === Terrain.ICE) drawIce(ctx, r, c);
      // BUSH is drawn ABOVE tanks (drawBushOverlay) — consensus §3.14.
    }
  }
}

function drawWater(ctx: CanvasRenderingContext2D, row: number, col: number): void {
  const x = col * CELL;
  const y = row * CELL;
  ctx.fillStyle = '#1565c0';
  ctx.fillRect(x, y, CELL, CELL);
  ctx.strokeStyle = '#64b5f6';
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 12);
  ctx.lineTo(x + 14, y + 12);
  ctx.moveTo(x + 18, y + 22);
  ctx.lineTo(x + 28, y + 22);
  ctx.stroke();
}

function drawIce(ctx: CanvasRenderingContext2D, row: number, col: number): void {
  const x = col * CELL;
  const y = row * CELL;
  ctx.fillStyle = '#b3e5fc';
  ctx.fillRect(x, y, CELL, CELL);
  ctx.strokeStyle = '#e1f5fe';
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 26);
  ctx.lineTo(x + 26, y + 6);
  ctx.moveTo(x + 16, y + 28);
  ctx.lineTo(x + 28, y + 16);
  ctx.stroke();
}

/** R4: bushes hide tanks — drawn after tanks/bullets (AC-32). */
function drawBushOverlay(ctx: CanvasRenderingContext2D, world: World): void {
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (world.map.terrainAt(r, c) !== Terrain.BUSH) continue;
      const x = c * CELL;
      const y = r * CELL;
      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(x, y, CELL, CELL);
      ctx.fillStyle = '#43a047';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(x + 3 + (i % 2) * 16, y + 3 + Math.floor(i / 2) * 16, 10, 10);
      }
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

/** R11 §3.24 / R15: boss-family HP bar (hp / per-type max). */
/** R16 §3.28: guardian active-shield ring (cyan, reuses shield visual idiom). */
function drawGuardRing(ctx: CanvasRenderingContext2D, e: EnemyTank): void {
  ctx.strokeStyle = '#80cbc4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(e.pos.x, e.pos.y, TANK_SIZE / 2 + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;
}

function drawBossHp(ctx: CanvasRenderingContext2D, boss: EnemyTank): void {
  const w = TANK_SIZE;
  const x = boss.pos.x - w / 2;
  const y = boss.pos.y - TANK_SIZE / 2 - 7;
  // R15: per-type max HP — a summoner's bar drains against its own pool.
  const ratio = Math.max(0, boss.hp / ENEMY_HP[boss.type]);
  ctx.fillStyle = '#311b3b';
  ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = ratio > 0.5 ? '#ce93d8' : '#ff5252';
  ctx.fillRect(x, y, w * ratio, 4);
}

function drawPlayer(ctx: CanvasRenderingContext2D, world: World, p: PlayerTank): void {
  const baseColor = p.id === 1 ? COLOR.player : COLOR.player2;
  const flickColor = p.id === 1 ? '#a5d6a7' : '#b3e0f2';
  const invincible = world.clock < p.invincibleUntil;
  const shielded = world.clock < p.shieldUntil;
  // Invincibility flicker: alternate body shade every 100ms slot.
  if (invincible && Math.floor(world.clock / 100) % 2 === 0) {
    drawTank(ctx, p, flickColor);
  } else {
    drawTank(ctx, p, baseColor);
  }
  if (invincible || shielded) {
    // R2: shield powerup ring is cyan; respawn ring stays white (AC-17).
    ctx.strokeStyle = shielded ? '#00e5ff' : '#ffffff';
    ctx.strokeRect(
      p.pos.x - TANK_SIZE / 2 - 2,
      p.pos.y - TANK_SIZE / 2 - 2,
      TANK_SIZE + 4,
      TANK_SIZE + 4,
    );
  }
  // R10 §3.23: upgrade pips — one gold mark per level above L1.
  if (p.level > 1) {
    ctx.fillStyle = '#ffd700';
    for (let i = 0; i < p.level - 1; i++) {
      ctx.fillRect(p.pos.x - TANK_SIZE / 2 + i * 5, p.pos.y - TANK_SIZE / 2 - 5, 3, 3);
    }
  }
}

function drawBullets(ctx: CanvasRenderingContext2D, world: World): void {
  for (const b of world.bullets) {
    ctx.fillStyle = b.owner === BulletOwner.PLAYER ? COLOR.bulletPlayer : COLOR.bulletEnemy;
    ctx.fillRect(b.pos.x - BULLET_SIZE / 2, b.pos.y - BULLET_SIZE / 2, BULLET_SIZE, BULLET_SIZE);
  }
}

/**
 * Overlay text for the current state — exported for unit testing (fix #7).
 * GAME_COMPLETE is mode-aware: co-op has no endless entry (AC-44).
 */
export function overlayLines(world: World): string[] | null {
  const total = world.bankedScore + world.score;
  const endlessScore =
    world.endlessStartBanked >= 0 ? total - world.endlessStartBanked : 0;
  const vw = world.versusWins; // R8: round score P1 : P2 (§3.21)
  // R7 §3.19: endless hint in BOTH modes（清单 §35.1-1 门控移除）。
  const gameCompleteLines = [
    'YOU WIN!',
    `Total score: ${total}`,
    'Press any move/fire key for ENDLESS mode',
    'Press R for a new run',
  ];
  const messages: Partial<Record<GameState, string[]>> = {
    [GameState.READY]: [
      'TANK WORLD',
      'Press any move/fire key to start',
      'Press 2 CO-OP / 3 VERSUS / 4 MELEE',
      'Press 5 WAVE / 6 CO-OP WAVE',
      `Achievements: ${unlockedCount()}/${ACHIEVEMENT_COUNT}`,
    ],
    [GameState.PAUSED]: ['PAUSED', 'Press P to resume'],
    [GameState.LEVEL_CLEAR]: [
      `LEVEL ${world.level} CLEAR!`,
      `Level score: ${world.lastLevelScore}   Total: ${total}`,
      'Press any move/fire key for next level',
    ],
    [GameState.GAME_COMPLETE]: gameCompleteLines,
    [GameState.DEFEAT]: [
      'GAME OVER',
      `Total: ${total}`,
      `Press R to retry level ${world.level}`,
    ],
    [GameState.ENDLESS_OVER]: [
      'ENDLESS OVER',
      `Endless score: ${endlessScore}   Reached level ${world.level}`,
      'Press R for a new run',
    ],
    [GameState.VERSUS_ROUND]: [
      `ROUND TO P${world.versusRoundWinner}`,
      `Score   P1 ${vw[1]} : ${vw[2]} P2`,
      'Press any move/fire key for the next round',
    ],
    [GameState.VERSUS_OVER]: [
      `P${world.versusMatchWinner} WINS!`,
      `Final   P1 ${vw[1]} : ${vw[2]} P2`,
      'Press R for a new match',
    ],
    // R13 §3.26: wave-defense interlude + settlement.
    [GameState.WAVE_BREAK]: [
      `WAVE ${world.wave} CLEARED!`,
      `Score: ${total}`,
      `Next wave in ${Math.ceil(world.waveBreakMs / 1000)}s — any key to skip`,
    ],
    [GameState.WAVE_OVER]: [
      'WAVE OVER',
      `Survived ${world.wave - 1} wave${world.wave - 1 === 1 ? '' : 's'}   Score: ${total}`,
      'Press R for a new run',
    ],
  };
  return messages[world.state] ?? null;
}

function drawOverlay(ctx: CanvasRenderingContext2D, world: World): void {
  const lines = overlayLines(world);
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
