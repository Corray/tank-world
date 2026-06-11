// Powerup module (R2): carrier drops, pickup detection (C13), three effects
// (consensus §3.8, data-model §12).

import { PowerupType } from '../core/types';
import type { Vec, PlayerTank } from '../core/types';
import type { World } from '../core/world';
import { TANK_SIZE, SHIELD_MS, CELL, VS_POWERUP_INTERVAL_MS, VS_POWERUP_CELLS, MAX_TANK_LEVEL } from '../core/constants';
import { playSound, SoundEvent } from '../audio/audio';
import { onPickup } from '../achievements/achievements';

/** Pickup box edge for a dropped powerup, px (module-local by usage scope). */
export const POWERUP_SIZE = 24;

/** Fixed drop cycle: shield → double-fire → bomb → star (R10 §3.23, 4-cycle). */
export const DROP_CYCLE: readonly PowerupType[] = [
  PowerupType.SHIELD,
  PowerupType.DOUBLE_FIRE,
  PowerupType.BOMB,
  PowerupType.STAR,
];

/** A carrier died: drop the next powerup in the cycle at its death position. */
export function dropFromCarrier(world: World, pos: Vec): void {
  const type = DROP_CYCLE[world.powerupDropCursor % DROP_CYCLE.length];
  world.powerupDropCursor += 1;
  world.powerups.push({ type, pos: { ...pos } });
}

/** R8 §3.21 / R10 §3.23: VERSUS neutral cycle — shield/double-fire/star, NO bomb. */
const VS_DROP_CYCLE: readonly PowerupType[] = [
  PowerupType.SHIELD,
  PowerupType.DOUBLE_FIRE,
  PowerupType.STAR,
];

/**
 * R8 §3.21: VERSUS has no carriers — neutral powerups respawn on a timer at
 * mid-line symmetric cells (shield/double-fire alternate, never a bomb). A
 * cell already holding a powerup is skipped so they do not pile up.
 */
export function spawnNeutralPowerup(world: World, dtMs: number): void {
  world.versusPowerupCooldownMs -= dtMs;
  if (world.versusPowerupCooldownMs > 0) return;
  world.versusPowerupCooldownMs = VS_POWERUP_INTERVAL_MS;
  const idx = world.powerupDropCursor;
  world.powerupDropCursor += 1;
  const [row, col] = VS_POWERUP_CELLS[idx % VS_POWERUP_CELLS.length];
  const pos = { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
  if (world.powerups.some((pu) => pu.pos.x === pos.x && pu.pos.y === pos.y)) return;
  world.powerups.push({ type: VS_DROP_CYCLE[idx % VS_DROP_CYCLE.length], pos });
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

/** R12 §3.25: expire per-side shovel fortification (G4 骨架桩：impl 阶段填充). */
export function updateShovel(_world: World): void {}

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
    case PowerupType.STAR:
      // R10: raise tank level, capped at MAX_TANK_LEVEL (§3.23).
      picker.level = Math.min(MAX_TANK_LEVEL, picker.level + 1) as 1 | 2 | 3 | 4;
      break;
  }
}
