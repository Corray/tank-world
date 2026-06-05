// Player module: movement intent, firing intent, lives / respawn / invincibility
// (consensus §3.2, §3.17). R5: plural core with single-player compat defaults
// (data-model §29) — baseline call sites stay valid.

import { Direction } from '../core/types';
import type { PlayerTank } from '../core/types';
import { INVINCIBLE_MS } from '../core/constants';
import type { World } from '../core/world';
import type { InputState } from '../input/input';
import { moveTank, applySlide, firePlayerBullet } from '../combat/combat';
import { spawnExplosion, flashPlayer } from '../effects/effects';
import { playSound, SoundEvent } from '../audio/audio';

/** Player explosion color (distinct from enemies — consensus §3.11). */
const EXPLOSION_COLOR_PLAYER = '#aeea00';

/** Per-step update for ONE player (R6-D: explicit player arg, no defaults). */
export function updatePlayer(
  world: World,
  dtMs: number,
  input: InputState,
  player: PlayerTank,
): void {
  if (!player.alive) return;
  if (input.move) moveTank(world, player, input.move, dtMs);
  else applySlide(world, player, dtMs);
  if (input.fire) firePlayerBullet(world, player);
}

/** R5 pipeline entry: drive every player with its own input lane (§31). */
export function updatePlayers(world: World, dtMs: number, inputs: InputState[]): void {
  world.players.forEach((p, i) => {
    updatePlayer(world, dtMs, inputs[i] ?? { move: null, fire: false }, p);
  });
}

/**
 * A player got hit by an enemy bullet (C6′, non-invincible path): lose one
 * life and respawn at own spawn point, or stay dead on the last life.
 * judge() handles defeat once ALL players are dead (consensus §3.17).
 */
export function damagePlayer(world: World, player: PlayerTank): void {
  // R3: hit feedback at the death spot, before any respawn move (AC-23/25).
  spawnExplosion(world, player.pos, EXPLOSION_COLOR_PLAYER);
  flashPlayer(world);
  playSound(SoundEvent.PLAYER_DOWN);
  player.lives -= 1;
  player.doubleFire = false; // R2: double fire is lost on death (AC-18)
  player.shieldUntil = 0;
  player.slide = null; // R4: respawn never carries momentum (T-TER-6)
  if (player.lives > 0) {
    player.pos = { ...player.spawnPos };
    player.dir = Direction.UP;
    player.invincibleUntil = world.clock + INVINCIBLE_MS;
  } else {
    player.alive = false;
  }
}
