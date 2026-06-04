// Input module: keyboard events → semantic commands (consensus §3.4).
// Dual bindings: arrows + WASD for movement, Space/J for fire, P pause, R restart.

import { Direction } from '../core/types';

export interface InputState {
  /** Currently held movement direction (last pressed wins), or null. */
  move: Direction | null;
  fire: boolean;
}

const MOVE_KEYS: Record<string, Direction> = {
  ArrowUp: Direction.UP,
  ArrowDown: Direction.DOWN,
  ArrowLeft: Direction.LEFT,
  ArrowRight: Direction.RIGHT,
  KeyW: Direction.UP,
  KeyS: Direction.DOWN,
  KeyA: Direction.LEFT,
  KeyD: Direction.RIGHT,
};

const FIRE_KEYS = new Set(['Space', 'KeyJ']);

export class Keyboard {
  private held: Direction[] = [];
  private fireHeld = false;
  /** One-shot flags consumed by the game each frame. */
  onPause: () => void = () => {};
  onRestart: () => void = () => {};
  onAnyAction: () => void = () => {};

  attach(target: Window): void {
    target.addEventListener('keydown', (e) => {
      const dir = MOVE_KEYS[e.code];
      if (dir) {
        e.preventDefault();
        if (!this.held.includes(dir)) this.held.push(dir);
        this.onAnyAction();
      } else if (FIRE_KEYS.has(e.code)) {
        e.preventDefault();
        this.fireHeld = true;
        this.onAnyAction();
      } else if (e.code === 'KeyP') {
        this.onPause();
      } else if (e.code === 'KeyR') {
        this.onRestart();
      }
    });
    target.addEventListener('keyup', (e) => {
      const dir = MOVE_KEYS[e.code];
      if (dir) this.held = this.held.filter((d) => d !== dir);
      if (FIRE_KEYS.has(e.code)) this.fireHeld = false;
    });
  }

  state(): InputState {
    return { move: this.held[this.held.length - 1] ?? null, fire: this.fireHeld };
  }
}
