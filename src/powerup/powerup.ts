// Powerup module (R2): carrier drops, pickup detection (C13), three effects
// (consensus §3.8, data-model §12).

import { PowerupType } from '../core/types';
import type { Vec } from '../core/types';
import type { World } from '../core/world';
import { TANK_SIZE, SHIELD_MS } from '../core/constants';

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
  const type = DROP_CYCLE[world.powerupDropCursor % DROP_CYCLE.length];
  world.powerupDropCursor += 1;
  world.powerups.push({ type, pos: { ...pos } });
}

/**
 * Pickup pass (runs BEFORE combat each step — risk §15: bomb kills must
 * exclude enemies from same-frame bullet scoring). Pickup is player-only (C13).
 */
export function updatePowerups(world: World): void {
  const p = world.player;
  if (!p.alive || world.powerups.length === 0) return;
  const reach = (TANK_SIZE + POWERUP_SIZE) / 2;
  world.powerups = world.powerups.filter((pu) => {
    const overlap =
      Math.abs(pu.pos.x - p.pos.x) < reach && Math.abs(pu.pos.y - p.pos.y) < reach;
    if (!overlap) return true;
    applyEffect(world, pu.type);
    return false;
  });
}

function applyEffect(world: World, type: PowerupType): void {
  switch (type) {
    case PowerupType.SHIELD:
      // Re-pickup refreshes the window (consensus §3.8).
      world.player.shieldUntil = world.clock + SHIELD_MS;
      break;
    case PowerupType.DOUBLE_FIRE:
      world.player.doubleFire = true;
      break;
    case PowerupType.BOMB:
      // Field wipe, no scoring, no drops from bombed carriers (consensus AC-19).
      for (const e of world.enemies) e.alive = false;
      break;
  }
}
