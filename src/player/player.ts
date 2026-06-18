// Player module: movement intent, firing intent, lives / respawn / invincibility
// (consensus §3.2, §3.17). R5: plural core with single-player compat defaults
// (data-model §29) — baseline call sites stay valid.

import type { PlayerTank } from '../core/types';
import type { World } from '../core/world';
import type { InputState } from '../input/input';
import { moveTank, applySlide, firePlayerBullet } from '../combat/combat';

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

// R22/ADR-004: damagePlayer moved to combat.ts (collision-damage SSoT) — breaks
// the old combat↔player import cycle. player.ts now depends on combat one-way.
