// Effects module (R3): visual effect entity lifecycle — explosions, sparks,
// score floats, player-hit flash (consensus §3.11, data-model §17).
// Pure visuals: NEVER consulted by collision or game logic.

import { EffectKind } from '../core/types';
import type { Vec } from '../core/types';
import type { World } from '../core/world';

/** Spawn a tank explosion at `pos`. Color distinguishes enemy vs player. */
export function spawnExplosion(world: World, pos: Vec, color: string): void {
  void world;
  void pos;
  void color;
  // TODO(slice-S1)
}

/** Spawn the big base explosion (AC-23). */
export function spawnBaseExplosion(world: World, pos: Vec): void {
  void world;
  void pos;
  // TODO(slice-S1)
}

/** Spawn a small spark where a bullet hit brick/steel. */
export function spawnSpark(world: World, pos: Vec): void {
  void world;
  void pos;
  // TODO(slice-S1)
}

/** Spawn a rising '+N' score float at a kill position (AC-24). */
export function spawnScoreFloat(world: World, pos: Vec, score: number): void {
  void world;
  void pos;
  void score;
  // TODO(slice-S1)
}

/** Trigger the player-hit full-screen flash (AC-25). */
export function flashPlayer(world: World): void {
  void world;
  // TODO(slice-S1)
}

/** Expire effects whose lifetime has passed (clock-based — pause-safe). */
export function updateEffects(world: World): void {
  void world;
  // TODO(slice-S1)
}

void EffectKind;
