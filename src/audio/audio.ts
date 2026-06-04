// Audio module (R3): procedural sound synthesis with a testable dispatch layer
// (consensus §3.12, data-model §18). dispatch (event → recipe + mute gate) is
// pure and unit-testable; synth (WebAudio) degrades silently outside browsers.

export enum SoundEvent {
  FIRE = 'FIRE',
  HIT_BRICK = 'HIT_BRICK',
  HIT_STEEL = 'HIT_STEEL',
  ENEMY_DOWN = 'ENEMY_DOWN',
  PLAYER_DOWN = 'PLAYER_DOWN',
  PICKUP = 'PICKUP',
  LEVEL_CLEAR = 'LEVEL_CLEAR',
  DEFEAT = 'DEFEAT',
}

/** A synth instruction — event tag + procedural recipe parameters. */
export interface SoundRecipe {
  event: SoundEvent;
  wave: 'square' | 'sawtooth' | 'sine' | 'triangle' | 'noise';
  /** Start/end frequency, Hz (sweep when different). */
  freqFrom: number;
  freqTo: number;
  durMs: number;
  volume: number;
}

export type SynthFn = (recipe: SoundRecipe) => void;

/** Replace the synth backend (tests inject a recorder; default is WebAudio). */
export function setSynth(fn: SynthFn | null): void {
  void fn;
  // TODO(slice-S2)
}

export function isMuted(): boolean {
  return false; // TODO(slice-S2)
}

/** Toggle mute; persists to localStorage (fail-silent). Returns new state. */
export function toggleMute(): boolean {
  return false; // TODO(slice-S2)
}

/** Dispatch a game event to the synth unless muted (AC-26). */
export function playSound(event: SoundEvent): void {
  void event;
  // TODO(slice-S2)
}
