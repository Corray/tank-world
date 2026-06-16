// Combat module: bullet lifecycle + the single collision matrix C1~C12
// (data-model §5). All collision rules live here — never inside entities.

import {
  FIELD,
  CELL,
  TANK_SIZE,
  BULLET_SIZE,
  BULLET_SPEED,
  PLAYER_BULLET_FAST_SPEED,
  PLAYER_BULLETS_BASE,
  PLAYER_BULLETS_DOUBLE,
  ICE_DECAY,
  ICE_STOP_THRESHOLD,
  COMBO_WINDOW_MS,
  COMBO_STEP,
  COMBO_CAP,
} from '../core/constants';
import { dropFromCarrier } from '../powerup/powerup';
import { spawnExplosion, spawnBaseExplosion, spawnSpark, spawnScoreFloat } from '../effects/effects';
import { playSound, SoundEvent } from '../audio/audio';
import { onEnemyKilled, onBrickDestroyed } from '../achievements/achievements';

/** Explosion primary colors (enemy vs player — consensus §3.11). */
const EXPLOSION_COLOR_ENEMY = '#ff7043';
import { Terrain, BulletOwner, isPvP, DIR_VEC } from '../core/types';
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

function spawnBullet(
  world: World,
  shooter: Tank,
  owner: BulletOwner,
  playerId?: 1 | 2,
  speed: number = BULLET_SPEED,
  breaksSteel: boolean = false,
): void {
  const vec = DIR_VEC[shooter.dir];
  const pos: Vec = {
    x: shooter.pos.x + vec.x * MUZZLE_OFFSET,
    y: shooter.pos.y + vec.y * MUZZLE_OFFSET,
  };
  world.bullets.push({ pos, dir: shooter.dir, speed, owner, playerId, breaksSteel });
}

/**
 * Fire a player's bullet. The on-screen cap is per-player (R5 §30); any death
 * path of a previous bullet releases that player's slot (T-PLY-3).
 * R6-D: explicit player arg — compat default removed.
 */
export function firePlayerBullet(world: World, player: PlayerTank): boolean {
  if (!player.alive) return false;
  // R10 §3.23: L3+ raises the cap to 2 (doubleFire shares it, no stacking past 2).
  const cap =
    player.level >= 3 || player.doubleFire ? PLAYER_BULLETS_DOUBLE : PLAYER_BULLETS_BASE;
  const onScreen = world.bullets.filter(
    (b) => b.owner === BulletOwner.PLAYER && b.playerId === player.id,
  ).length;
  if (onScreen >= cap) return false;
  // R10: L2+ faster bullets; L4 bullets break steel.
  const speed = player.level >= 2 ? PLAYER_BULLET_FAST_SPEED : BULLET_SPEED;
  spawnBullet(world, player, BulletOwner.PLAYER, player.id, speed, player.level >= 4);
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
      // R10 §3.23: L4 player bullets destroy steel; all others are blocked (AC-2).
      if (b.breaksSteel) {
        world.map.breakSteel(row, col);
        spawnSpark(world, b.pos);
        playSound(SoundEvent.HIT_BRICK);
        return false;
      }
      spawnSpark(world, b.pos); // C2
      playSound(SoundEvent.HIT_STEEL);
      return false;
    }
    if (terrain === Terrain.BASE) {
      world.map.destroyBase(row); // C3 — judge() flips to DEFEAT/ENDLESS_OVER (R8: row → VS side)
      spawnBaseExplosion(world, { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 });
      return false;
    }
    if (terrain === Terrain.BRICK && world.map.brickSolidAt(b.pos.x, b.pos.y)) {
      world.map.hitBrick(row, col, b.dir); // C1 — impact-side sub-blocks
      spawnSpark(world, b.pos);
      playSound(SoundEvent.HIT_BRICK);
      // fix #14（PM 决策 a）：DEMOLITION 仅玩家拆除计入（与炸弹不计分不计杀对齐）。
      if (b.owner === BulletOwner.PLAYER) onBrickDestroyed(world);
      return false;
    }

    // C5 — player bullet vs enemies.
    if (b.owner === BulletOwner.PLAYER) {
      const hit = world.enemies.find((e) => e.alive && bulletHitsTank(b, e));
      if (hit) {
        // R16 §3.28: guardian self-shield absorbs the hit (no damage, bullet gone).
        if (hit.guardUntil !== undefined && world.clock < hit.guardUntil) {
          return false;
        }
        hit.hp -= 1;
        if (hit.hp <= 0) {
          hit.alive = false;
          // R18 §3.30: combo — consecutive kills within the window scale score;
          // the first kill of a streak is ×1 (single kills are unchanged).
          world.comboCount = world.clock < world.comboUntil ? world.comboCount + 1 : 1;
          world.comboUntil = world.clock + COMBO_WINDOW_MS;
          const mult = 1 + COMBO_STEP * Math.min(world.comboCount - 1, COMBO_CAP);
          const awarded = Math.round(hit.score * mult);
          world.score += awarded;
          // R5: personal score attribution via bullet.playerId (§31).
          const killer = world.players.find((p) => p.id === b.playerId);
          if (killer) killer.score += awarded;
          // R2: carriers drop the next cycle powerup at the death spot (§3.8).
          if (hit.carrier) dropFromCarrier(world, hit.pos);
          // R3: kill feedback (AC-23/24).
          spawnExplosion(world, hit.pos, EXPLOSION_COLOR_ENEMY);
          spawnScoreFloat(world, hit.pos, awarded);
          playSound(SoundEvent.ENEMY_DOWN);
          onEnemyKilled(world); // R4: FIRST_BLOOD / CENTURION (§26)
        }
        return false;
      }
      // R8 §3.21 / R9 §3.22 (C17 reversed in PvP modes): a player bullet damages
      // the OPPOSING player; own bullets still pass through. SOLO/COOP keep full
      // pass-through.
      if (isPvP(world.mode)) {
        const foe = world.players.find(
          (p) => p.alive && p.id !== b.playerId && bulletHitsTank(b, p),
        );
        if (foe) {
          const invincible = world.clock < Math.max(foe.invincibleUntil, foe.shieldUntil);
          if (!invincible) {
            damagePlayer(world, foe);
            const killer = world.players.find((p) => p.id === b.playerId);
            if (killer) killer.kills += 1;
          }
          return false; // bullet consumed on contact (even if blocked by invincibility)
        }
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
