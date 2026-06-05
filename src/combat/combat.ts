// Combat module: bullet lifecycle + the single collision matrix C1~C12
// (data-model §5). All collision rules live here — never inside entities.

import {
  FIELD,
  CELL,
  TANK_SIZE,
  BULLET_SIZE,
  BULLET_SPEED,
  PLAYER_BULLETS_BASE,
  PLAYER_BULLETS_DOUBLE,
  ICE_DECAY,
  ICE_STOP_THRESHOLD,
} from '../core/constants';
import { dropFromCarrier } from '../powerup/powerup';
import { spawnExplosion, spawnBaseExplosion, spawnSpark, spawnScoreFloat } from '../effects/effects';
import { playSound, SoundEvent } from '../audio/audio';
import { onEnemyKilled, onBrickDestroyed } from '../achievements/achievements';

/** Explosion primary colors (enemy vs player — consensus §3.11). */
const EXPLOSION_COLOR_ENEMY = '#ff7043';
import { Terrain, BulletOwner, DIR_VEC } from '../core/types';
import type { World } from '../core/world';
import type { Bullet, EnemyTank, PlayerTank, Tank, Direction, Vec } from '../core/types';
import { damagePlayer } from '../player/player';

/** Max pixels a bullet moves per inner sub-step (anti-tunneling, risk §8.3). */
const BULLET_SUBSTEP_PX = 4;
/** Max pixels a tank moves per inner sub-step. */
const TANK_SUBSTEP_PX = 1;
/** Muzzle offset from tank center to bullet center. */
const MUZZLE_OFFSET = TANK_SIZE / 2 + BULLET_SIZE / 2;

// ---------------------------------------------------------------------------
// Tank movement (C10 terrain / C11 tanks / C12 bounds)
// ---------------------------------------------------------------------------

/** Whether a TANK_SIZE box centered at (x, y) is free of terrain/bounds/tanks. */
export function tankAreaFree(world: World, x: number, y: number, self?: Tank): boolean {
  const half = TANK_SIZE / 2;
  if (x - half < 0 || x + half > FIELD || y - half < 0 || y + half > FIELD) return false;

  // Terrain sampling: corners + edge midpoints (≤16px spacing covers SUB=16 grid).
  const e = 0.01; // inset so flush contact does not count as overlap
  const xs = [x - half + e, x, x + half - e];
  const ys = [y - half + e, y, y + half - e];
  for (const sx of xs) {
    for (const sy of ys) {
      if (world.map.solidForTankAt(sx, sy)) return false;
    }
  }

  // Other tanks: boxes must not overlap (flush contact allowed). R5 C11′: all players.
  const others: Tank[] = [...world.players, ...world.enemies];
  for (const t of others) {
    if (t === self || !t.alive) continue;
    if (Math.abs(t.pos.x - x) < TANK_SIZE && Math.abs(t.pos.y - y) < TANK_SIZE) return false;
  }
  return true;
}

/** Advance a tank along `dir` at `speed` in 1px sub-steps; no facing change. */
function translate(world: World, tank: Tank, dir: Direction, speed: number, dtMs: number): boolean {
  const vec = DIR_VEC[dir];
  let remaining = (speed * dtMs) / 1000;
  let moved = false;
  while (remaining > 0) {
    const d = Math.min(TANK_SUBSTEP_PX, remaining);
    const nx = tank.pos.x + vec.x * d;
    const ny = tank.pos.y + vec.y * d;
    if (!tankAreaFree(world, nx, ny, tank)) break;
    tank.pos.x = nx;
    tank.pos.y = ny;
    moved = true;
    remaining -= d;
  }
  return moved;
}

/** R4 C16: standing on ice after an active move keeps momentum; else clears it. */
function refreshSlide(world: World, tank: Tank): void {
  tank.slide = world.map.iceAt(tank.pos.x, tank.pos.y)
    ? { dir: tank.dir, speed: tank.speed }
    : null;
}

/**
 * Try to move a tank in `dir`. Turns first, then advances until blocked by
 * terrain / bounds / another tank. Refreshes ice momentum (C16).
 */
export function moveTank(world: World, tank: Tank, dir: Direction, dtMs: number): boolean {
  tank.dir = dir;
  const moved = translate(world, tank, dir, tank.speed, dtMs);
  refreshSlide(world, tank);
  return moved;
}

/**
 * R4 C16: coast a sliding tank one fixed step (called when there is no active
 * move). Momentum decays per step; clears on stop / block / leaving the ice.
 */
export function applySlide(world: World, tank: Tank, dtMs: number): void {
  const slide = tank.slide;
  if (!slide) return;
  if (!world.map.iceAt(tank.pos.x, tank.pos.y)) {
    tank.slide = null; // left the ice → stop immediately (data-model §24)
    return;
  }
  slide.speed *= ICE_DECAY;
  if (slide.speed < ICE_STOP_THRESHOLD) {
    tank.slide = null;
    return;
  }
  const moved = translate(world, tank, slide.dir, slide.speed, dtMs);
  if (!moved) tank.slide = null; // blocked mid-slide → momentum dies at the wall
}

// ---------------------------------------------------------------------------
// Firing
// ---------------------------------------------------------------------------

function spawnBullet(world: World, shooter: Tank, owner: BulletOwner, playerId?: 1 | 2): void {
  const vec = DIR_VEC[shooter.dir];
  const pos: Vec = {
    x: shooter.pos.x + vec.x * MUZZLE_OFFSET,
    y: shooter.pos.y + vec.y * MUZZLE_OFFSET,
  };
  world.bullets.push({ pos, dir: shooter.dir, speed: BULLET_SPEED, owner, playerId });
}

/**
 * Fire a player's bullet. The on-screen cap is per-player (R5 §30); any death
 * path of a previous bullet releases that player's slot (T-PLY-3).
 * Default param keeps v1~v4 single-player call sites valid (data-model §29).
 */
export function firePlayerBullet(world: World, player: PlayerTank = world.players[0]): boolean {
  if (!player.alive) return false;
  const cap = player.doubleFire ? PLAYER_BULLETS_DOUBLE : PLAYER_BULLETS_BASE;
  const onScreen = world.bullets.filter(
    (b) => b.owner === BulletOwner.PLAYER && b.playerId === player.id,
  ).length;
  if (onScreen >= cap) return false;
  spawnBullet(world, player, BulletOwner.PLAYER, player.id);
  playSound(SoundEvent.FIRE); // player shots only — enemy fire would spam (impl note)
  return true;
}

/** Fire an enemy bullet from the given tank (no on-screen cap per enemy). */
export function fireEnemyBullet(world: World, enemy: EnemyTank): void {
  if (!enemy.alive) return;
  spawnBullet(world, enemy, BulletOwner.ENEMY);
}

// ---------------------------------------------------------------------------
// Bullet advance + collision matrix
// ---------------------------------------------------------------------------

export function updateCombat(world: World, dtMs: number): void {
  const survivors: Bullet[] = [];
  for (const bullet of world.bullets) {
    if (advanceBullet(world, bullet, dtMs)) survivors.push(bullet);
  }
  world.bullets = annihilate(survivors);
}

/** Advance one bullet; returns false if it was consumed (C1~C6, C9 skip). */
function advanceBullet(world: World, b: Bullet, dtMs: number): boolean {
  const vec = DIR_VEC[b.dir];
  let remaining = (b.speed * dtMs) / 1000;
  while (remaining > 0) {
    const d = Math.min(BULLET_SUBSTEP_PX, remaining);
    b.pos.x += vec.x * d;
    b.pos.y += vec.y * d;
    remaining -= d;

    // C4 — field bounds.
    if (b.pos.x < 0 || b.pos.x > FIELD || b.pos.y < 0 || b.pos.y > FIELD) return false;

    // C1/C2/C3 — terrain at the bullet center.
    const row = Math.floor(b.pos.y / CELL);
    const col = Math.floor(b.pos.x / CELL);
    const terrain = world.map.terrainAt(row, col);
    if (terrain === Terrain.STEEL) {
      spawnSpark(world, b.pos); // C2
      playSound(SoundEvent.HIT_STEEL);
      return false;
    }
    if (terrain === Terrain.BASE) {
      world.map.destroyBase(); // C3 — judge() flips to DEFEAT/ENDLESS_OVER
      spawnBaseExplosion(world, { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 });
      return false;
    }
    if (terrain === Terrain.BRICK && world.map.brickSolidAt(b.pos.x, b.pos.y)) {
      world.map.hitBrick(row, col, b.dir); // C1 — impact-side sub-blocks
      spawnSpark(world, b.pos);
      playSound(SoundEvent.HIT_BRICK);
      onBrickDestroyed(world); // R4: DEMOLITION when bricks run dry (§26)
      return false;
    }

    // C5 — player bullet vs enemies.
    if (b.owner === BulletOwner.PLAYER) {
      const hit = world.enemies.find((e) => e.alive && bulletHitsTank(b, e));
      if (hit) {
        hit.hp -= 1;
        if (hit.hp <= 0) {
          hit.alive = false;
          world.score += hit.score;
          // R5: personal score attribution via bullet.playerId (§31).
          const killer = world.players.find((p) => p.id === b.playerId);
          if (killer) killer.score += hit.score;
          // R2: carriers drop the next cycle powerup at the death spot (§3.8).
          if (hit.carrier) dropFromCarrier(world, hit.pos);
          // R3: kill feedback (AC-23/24).
          spawnExplosion(world, hit.pos, EXPLOSION_COLOR_ENEMY);
          spawnScoreFloat(world, hit.pos, hit.score);
          playSound(SoundEvent.ENEMY_DOWN);
          onEnemyKilled(world); // R4: FIRST_BLOOD / CENTURION (§26)
        }
        return false;
      }
      // R5 C17: player bullets pass through ALL player tanks (no friendly fire).
    } else {
      // C6′ — enemy bullet vs any player (C9: enemy tanks are skipped entirely).
      for (const p of world.players) {
        if (!p.alive || !bulletHitsTank(b, p)) continue;
        // R2: shield powerup shares the invincibility branch (data-model §12).
        const invincible = world.clock < Math.max(p.invincibleUntil, p.shieldUntil);
        if (!invincible) damagePlayer(world, p);
        return false; // bullet consumed either way
      }
    }
  }
  return true;
}

function bulletHitsTank(b: Bullet, t: Tank): boolean {
  const reach = (TANK_SIZE + BULLET_SIZE) / 2;
  return Math.abs(b.pos.x - t.pos.x) < reach && Math.abs(b.pos.y - t.pos.y) < reach;
}

/** C7 player×enemy bullets annihilate; C8 enemy×enemy pass through. */
function annihilate(bullets: Bullet[]): Bullet[] {
  const dead = new Set<Bullet>();
  for (const a of bullets) {
    if (a.owner !== BulletOwner.PLAYER || dead.has(a)) continue;
    for (const b of bullets) {
      if (b.owner !== BulletOwner.ENEMY || dead.has(b)) continue;
      if (
        Math.abs(a.pos.x - b.pos.x) < BULLET_SIZE &&
        Math.abs(a.pos.y - b.pos.y) < BULLET_SIZE
      ) {
        dead.add(a);
        dead.add(b);
        break;
      }
    }
  }
  return dead.size === 0 ? bullets : bullets.filter((b) => !dead.has(b));
}
