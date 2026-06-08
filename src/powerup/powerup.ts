// Powerup module (R2): carrier drops, pickup detection (C13), three effects
// (consensus §3.8, data-model §12).

import { PowerupType } from '../core/types';
import type { Vec, PlayerTank } from '../core/types';
import type { World } from '../core/world';
import { TANK_SIZE, SHIELD_MS } from '../core/constants';
import { playSound, SoundEvent } from '../audio/audio';
import { onPickup } from '../achievements/achievements';

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

/** R8 §3.21: VERSUS has no carriers — neutral powerups (shield/double-fire,
 *  no bomb) respawn on a timer at mid-line cells. G4 骨架桩：impl 阶段填充。 */
export function spawnNeutralPowerup(world: World, dtMs: number): void {
  void world; // stub
  void dtMs;
}

/**
 * Pickup pass (runs BEFORE combat each step — risk §15: bomb kills must
 * exclude enemies from same-frame bullet scoring). Pickup is player-only
 * (C13′); effects belong to the picker (R5 §30).
 */
export function updatePowerups(world: World): void {
  if (world.powerups.length === 0) return;
  const reach = (TANK_SIZE + POWERUP_SIZE) / 2;
  world.powerups = world.powerups.filter((pu) => {
    const picker = world.players.find(
      (p) =>
        p.alive &&
        Math.abs(pu.pos.x - p.pos.x) < reach &&
        Math.abs(pu.pos.y - p.pos.y) < reach,
    );
    if (!picker) return true;
    applyEffect(world, pu.type, picker);
    playSound(SoundEvent.PICKUP); // R3 (AC-26)
    onPickup(world, pu.type); // R4: COLLECTOR / PURIST tracking (§26; COOP gated inside)
    return false;
  });
}

function applyEffect(world: World, type: PowerupType, picker: PlayerTank): void {
  switch (type) {
    case PowerupType.SHIELD:
      // Re-pickup refreshes the window (consensus §3.8); per-picker (AC-42).
      picker.shieldUntil = world.clock + SHIELD_MS;
      break;
    case PowerupType.DOUBLE_FIRE:
      picker.doubleFire = true;
      break;
    case PowerupType.BOMB:
      // Field wipe, no scoring, no drops from bombed carriers (consensus AC-19).
      for (const e of world.enemies) e.alive = false;
      break;
  }
}
