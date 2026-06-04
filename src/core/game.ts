// Game core: fixed-timestep main loop + game state machine (architecture §3.1).

import { STEP_MS } from './constants';
import { GameState } from './types';
import { createWorld, type World } from './world';

export type UpdateFn = (world: World, dtMs: number) => void;
export type RenderFn = (world: World) => void;

/** Legal state transitions — any other transition is a bug (data-model §4). */
export function startGame(world: World): void {
  if (world.state === GameState.READY) world.state = GameState.PLAYING;
}

export function togglePause(world: World): void {
  if (world.state === GameState.PLAYING) world.state = GameState.PAUSED;
  else if (world.state === GameState.PAUSED) world.state = GameState.PLAYING;
}

export function restartToReady(world: World): World {
  if (world.state === GameState.VICTORY || world.state === GameState.DEFEAT) {
    return createWorld(); // full reset: score, lives, map sub-blocks, spawn counters
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

  start(): void {
    this.lastTs = performance.now();
    const tick = (ts: number) => {
      this.accumulator += Math.min(ts - this.lastTs, 250); // clamp huge tab-switch gaps
      this.lastTs = ts;
      while (this.accumulator >= STEP_MS) {
        if (this.world.state === GameState.PLAYING) {
          this.world.clock += STEP_MS;
          this.update(this.world, STEP_MS);
        }
        this.accumulator -= STEP_MS;
      }
      this.renderFrame(this.world);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
  }
}
