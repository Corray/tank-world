// Powerup module (R2): carrier drops, pickup detection (C13), three effects
// (consensus §3.8, data-model §12).

import { PowerupType } from '../core/types';
import type { Vec } from '../core/types';
import type { World } from '../core/world';

/** Pickup box edge for a dropped powerup, px (module-local by usage scope). */
export const POWERUP_SIZE = 24;

/** Fixed drop cycle: shield → double-fire → bomb (consensus §3.8, not random). */
export const DROP_CYCLE: readonly PowerupType[] = [
  PowerupType.SHIELD,
  PowerupType.DOUBLE_FIRE,
  PowerupType.BOMB,
];

/** A carrier died: drop the next powerup in the cycle at its death position. */
export function dropFromCarrier(world: World, pos: Vec): void {
  void world;
  void pos;
  // TODO(slice-Q4)
}

/**
 * Pickup pass (runs BEFORE combat each step — risk §15: bomb kills must
 * exclude enemies from same-frame bullet scoring).
 */
export function updatePowerups(world: World): void {
  void world;
  // TODO(slice-Q4)
}
