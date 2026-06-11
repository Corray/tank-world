// Game core: fixed-timestep main loop + game state machine (architecture §3.1).

import { STEP_MS } from './constants';
import { GameState, GameMode } from './types';
import { createWorld, createPlayer, type World } from './world';
import { setupVersus, setupMelee } from '../level/level';

export type UpdateFn = (world: World, dtMs: number) => void;
export type RenderFn = (world: World) => void;

/** Legal state transitions — any other transition is a bug (data-model §4). */
export function startGame(world: World): void {
  if (world.state === GameState.READY) world.state = GameState.PLAYING;
}

/** R5 §3.17: READY + key "2" → local co-op (adds P2, switches mode). */
export function startCoop(world: World): void {
  if (world.state !== GameState.READY) return;
  world.mode = GameMode.COOP;
  world.players.push(createPlayer(2));
  world.state = GameState.PLAYING;
}

/** R8 §3.21: READY + key "3" → local versus (adds P2, loads the VS arena). */
export function startVersus(world: World): void {
  if (world.state !== GameState.READY) return;
  world.mode = GameMode.VERSUS;
  world.players.push(createPlayer(2));
  setupVersus(world);
  world.state = GameState.PLAYING;
}

/** R9 §3.22: READY + key "4" → NPC melee (VERSUS + NPC third party). */
export function startMelee(world: World): void {
  if (world.state !== GameState.READY) return;
  world.mode = GameMode.MELEE;
  world.players.push(createPlayer(2));
  setupMelee(world);
  world.state = GameState.PLAYING;
}

/** R13 §3.26: READY + key "5"/"6" → wave defense, solo or co-op（G4 骨架桩）. */
export function startWave(_world: World, _coop: boolean): void {}

export function togglePause(world: World): void {
  if (world.state === GameState.PLAYING) world.state = GameState.PAUSED;
  else if (world.state === GameState.PAUSED) world.state = GameState.PLAYING;
}

/**
 * R semantics split (data-model §10):
 * GAME_COMPLETE → brand-new run (fresh world, READY).
 * DEFEAT → retry the CURRENT level (handled by level.retryLevel, not here).
 */
export function restartToReady(world: World): World {
  if (
    world.state === GameState.GAME_COMPLETE ||
    world.state === GameState.ENDLESS_OVER ||
    world.state === GameState.VERSUS_OVER // R8 §3.21: match over → fresh run (READY)
  ) {
    return createWorld(); // full reset: scores, lives, map sub-blocks, spawn counters
  }
  return world;
}

export class GameLoop {
  private accumulator = 0;
  private lastTs = 0;
  private rafId = 0;

  constructor(
    public world: World,
    private update: UpdateFn,
    private renderFrame: RenderFn,
  ) {}

  /**
   * Advance game time by `deltaMs` in fixed steps. Updates run only while
   * PLAYING — this single gate implements the AC-11 full freeze.
   * Extracted from the rAF tick so it is unit-testable (T-SM-5).
   */
  advance(deltaMs: number): void {
    this.accumulator += Math.min(deltaMs, 250); // clamp huge tab-switch gaps
    while (this.accumulator >= STEP_MS) {
      if (this.world.state === GameState.PLAYING) {
        this.world.clock += STEP_MS;
        this.update(this.world, STEP_MS);
      }
      this.accumulator -= STEP_MS;
    }
  }

  start(): void {
    this.lastTs = performance.now();
    const tick = (ts: number) => {
      this.advance(ts - this.lastTs);
      this.lastTs = ts;
      this.renderFrame(this.world);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
  }
}
