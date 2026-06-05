// Effects module (R3): visual effect entity lifecycle — explosions, sparks,
// score floats, player-hit flash (consensus §3.11, data-model §17).
// Pure visuals: NEVER consulted by collision or game logic.

import { EffectKind } from '../core/types';
import type { Vec } from '../core/types';
import type { World } from '../core/world';
import {
  EXPLOSION_MS,
  BASE_EXPLOSION_MS,
  SPARK_MS,
  SCORE_FLOAT_MS,
  FLASH_MS,
  TOAST_MS,
  FIELD,
} from '../core/constants';

/** Toast banner anchor (top-center). */
const TOAST_X = FIELD / 2;
const TOAST_Y = 20;

function spawn(world: World, effect: Omit<World['effects'][number], 'bornAt'>): void {
  world.effects.push({ ...effect, bornAt: world.clock });
}

/** Spawn a tank explosion at `pos`. Color distinguishes enemy vs player. */
export function spawnExplosion(world: World, pos: Vec, color: string): void {
  spawn(world, { kind: EffectKind.EXPLOSION, pos: { ...pos }, durationMs: EXPLOSION_MS, color });
}

/** Spawn the big base explosion (AC-23). */
export function spawnBaseExplosion(world: World, pos: Vec): void {
  spawn(world, { kind: EffectKind.BASE_EXPLOSION, pos: { ...pos }, durationMs: BASE_EXPLOSION_MS });
}

/** Spawn a small spark where a bullet hit brick/steel. */
export function spawnSpark(world: World, pos: Vec): void {
  spawn(world, { kind: EffectKind.SPARK, pos: { ...pos }, durationMs: SPARK_MS });
}

/** Spawn a rising '+N' score float at a kill position (AC-24). */
export function spawnScoreFloat(world: World, pos: Vec, score: number): void {
  spawn(world, {
    kind: EffectKind.SCORE_FLOAT,
    pos: { ...pos },
    durationMs: SCORE_FLOAT_MS,
    text: `+${score}`,
  });
}

/** Trigger the player-hit full-screen flash (AC-25). */
export function flashPlayer(world: World): void {
  world.flashUntil = world.clock + FLASH_MS;
}

/** R4: top-center achievement banner (consensus §3.16). */
export function spawnToast(world: World, text: string): void {
  spawn(world, {
    kind: EffectKind.TOAST,
    pos: { x: TOAST_X, y: TOAST_Y },
    durationMs: TOAST_MS,
    text,
  });
}

/** Expire effects whose lifetime has passed (clock-based — pause-safe). */
export function updateEffects(world: World): void {
  if (world.effects.length === 0) return;
  world.effects = world.effects.filter((e) => world.clock < e.bornAt + e.durationMs);
}
