// Player module: movement intent, firing intent, lives / respawn / invincibility
// (consensus §3.2, data-model §3).

import { Direction } from '../core/types';
import { INVINCIBLE_MS } from '../core/constants';
import type { World } from '../core/world';
import type { InputState } from '../input/input';
import { moveTank, firePlayerBullet } from '../combat/combat';

/** Per-step player update: apply input to movement and firing. */
export function updatePlayer(world: World, dtMs: number, input: InputState): void {
  const p = world.player;
  if (!p.alive) return;
  if (input.move) moveTank(world, p, input.move, dtMs);
  if (input.fire) firePlayerBullet(world);
}

/**
 * Player got hit by an enemy bullet (C6, non-invincible path):
 * lose one life and respawn at the spawn point with a 2s invincibility
 * window, or stay dead on the last life (judge() flips to DEFEAT).
 */
export function damagePlayer(world: World): void {
  const p = world.player;
  p.lives -= 1;
  p.doubleFire = false; // R2: double fire is lost on death (AC-18)
  p.shieldUntil = 0;
  if (p.lives > 0) {
    p.pos = { ...p.spawnPos };
    p.dir = Direction.UP;
    p.invincibleUntil = world.clock + INVINCIBLE_MS;
  } else {
    p.alive = false;
  }
}
