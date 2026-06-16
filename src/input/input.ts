// Input module: keyboard events → semantic commands (consensus §3.4, §3.17).
// SOLO: P1 uses both bindings (arrows+WASD, Space+J — v1 behavior).
// COOP: P1 = WASD + J; P2 = Arrows + Enter (AC-39).

import { Direction } from '../core/types';

export interface InputState {
  /** Currently held movement direction (last pressed wins), or null. */
  move: Direction | null;
  fire: boolean;
}

interface KeyMapping {
  moves: Record<string, Direction>;
  fires: ReadonlySet<string>;
}

const WASD_MOVES: Record<string, Direction> = {
  KeyW: Direction.UP,
  KeyS: Direction.DOWN,
  KeyA: Direction.LEFT,
  KeyD: Direction.RIGHT,
};

const ARROW_MOVES: Record<string, Direction> = {
  ArrowUp: Direction.UP,
  ArrowDown: Direction.DOWN,
  ArrowLeft: Direction.LEFT,
  ArrowRight: Direction.RIGHT,
};

const SOLO_P1: KeyMapping = {
  moves: { ...WASD_MOVES, ...ARROW_MOVES },
  fires: new Set(['Space', 'KeyJ']),
};
const COOP_P1: KeyMapping = { moves: WASD_MOVES, fires: new Set(['KeyJ']) };
const COOP_P2: KeyMapping = { moves: ARROW_MOVES, fires: new Set(['Enter']) };

const ALL_GAME_KEYS = new Set([
  ...Object.keys(SOLO_P1.moves),
  'Space',
  'KeyJ',
  'Enter',
]);

export class Keyboard {
  /** Codes currently held, in press order (last movement key wins). */
  private pressOrder: string[] = [];
  /** One-shot callbacks wired by main. */
  onPause: () => void = () => {};
  onRestart: () => void = () => {};
  onAnyAction: () => void = () => {};
  /** R3: M key mute toggle (consensus §3.12). */
  onMute: () => void = () => {};
  /** R5: READY + "2" → co-op (consensus §3.17). */
  onCoop: () => void = () => {};
  /** R8: READY + "3" → versus (consensus §3.21). */
  onVersus: () => void = () => {};
  /** R9: READY + "4" → NPC melee (consensus §3.22). */
  onMelee: () => void = () => {};
  /** R13 §3.26: READY + "5" / "6" → wave defense (solo / co-op). */
  onWave: () => void = () => {};
  onCoopWave: () => void = () => {};
  /** R19 §3.31: READY + "D" → cycle difficulty (EASY/NORMAL/HARD). */
  onCycleDifficulty: () => void = () => {};

  attach(target: Window): void {
    target.addEventListener('keydown', (e) => {
      if (ALL_GAME_KEYS.has(e.code)) {
        e.preventDefault();
        if (!this.pressOrder.includes(e.code)) this.pressOrder.push(e.code);
        this.onAnyAction();
      } else if (e.code === 'KeyP') {
        this.onPause();
      } else if (e.code === 'KeyR') {
        this.onRestart();
      } else if (e.code === 'KeyM') {
        this.onMute();
      } else if (e.code === 'Digit2') {
        this.onCoop();
      } else if (e.code === 'Digit3') {
        this.onVersus();
      } else if (e.code === 'Digit4') {
        this.onMelee();
      } else if (e.code === 'Digit5') {
        this.onWave();
      } else if (e.code === 'Digit6') {
        this.onCoopWave();
      } else if (e.code === 'KeyD') {
        this.onCycleDifficulty();
      }
    });
    target.addEventListener('keyup', (e) => {
      this.pressOrder = this.pressOrder.filter((c) => c !== e.code);
    });
    // fix #8: keyup events are lost while unfocused — clear held keys on
    // blur (and tab-hide as a fallback) so tanks stop when focus returns.
    target.addEventListener('blur', () => this.releaseAll());
    target.document?.addEventListener?.('visibilitychange', () => {
      if (target.document.visibilityState === 'hidden') this.releaseAll();
    });
  }

  /** Drop every held key (focus loss — keyup will never arrive). */
  releaseAll(): void {
    this.pressOrder = [];
  }

  /** Input lane for a player slot. `twoPlayer` (COOP or VERSUS) → split
   *  bindings P1=WASD+J / P2=Arrows+Enter; SOLO → P1 uses both (AC-39/§3.21). */
  stateFor(playerId: 1 | 2, twoPlayer: boolean): InputState {
    const mapping = twoPlayer ? (playerId === 1 ? COOP_P1 : COOP_P2) : SOLO_P1;
    let move: Direction | null = null;
    for (const code of this.pressOrder) {
      if (mapping.moves[code]) move = mapping.moves[code]; // last pressed wins
    }
    const fire = this.pressOrder.some((c) => mapping.fires.has(c));
    return { move, fire };
  }

}
