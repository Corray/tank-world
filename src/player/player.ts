// Player module: movement intent, firing intent, lives / respawn / invincibility
// (consensus §3.2, data-model §3).

import type { World } from '../core/world';
import type { InputState } from '../input/input';

/** Per-step player update: apply input to movement and firing. */
export function updatePlayer(world: World, dtMs: number, input: InputState): void {
  void world;
  void dtMs;
  void input;
  // TODO(slice-P2 movement, slice-P3 firing)
}

/**
 * Player got hit by an enemy bullet (C6, non-invincible path):
 * lose one life and respawn, or trigger defeat on the last life.
 */
export function damagePlayer(world: World): void {
  void world;
  // TODO(slice-P5)
}
