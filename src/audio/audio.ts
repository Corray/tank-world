// Audio module (R3): procedural sound synthesis with a testable dispatch layer
// (consensus §3.12, data-model §18). dispatch (event → recipe + mute gate) is
// pure and unit-testable; synth (WebAudio) degrades silently outside browsers.

import { getMutedPref, setMutedPref } from '../storage/storage';

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

/** Procedural recipes — 8-bit flavored, pairwise distinct (AC-26). */
const RECIPES: Record<SoundEvent, Omit<SoundRecipe, 'event'>> = {
  [SoundEvent.FIRE]: { wave: 'square', freqFrom: 880, freqTo: 440, durMs: 70, volume: 0.18 },
  [SoundEvent.HIT_BRICK]: { wave: 'noise', freqFrom: 800, freqTo: 800, durMs: 60, volume: 0.2 },
  [SoundEvent.HIT_STEEL]: { wave: 'triangle', freqFrom: 2200, freqTo: 1800, durMs: 50, volume: 0.15 },
  [SoundEvent.ENEMY_DOWN]: { wave: 'noise', freqFrom: 400, freqTo: 100, durMs: 300, volume: 0.3 },
  [SoundEvent.PLAYER_DOWN]: { wave: 'sawtooth', freqFrom: 600, freqTo: 80, durMs: 500, volume: 0.3 },
  [SoundEvent.PICKUP]: { wave: 'sine', freqFrom: 660, freqTo: 1320, durMs: 180, volume: 0.25 },
  [SoundEvent.LEVEL_CLEAR]: { wave: 'square', freqFrom: 523, freqTo: 1046, durMs: 450, volume: 0.25 },
  [SoundEvent.DEFEAT]: { wave: 'sine', freqFrom: 220, freqTo: 110, durMs: 800, volume: 0.3 },
};

export type SynthFn = (recipe: SoundRecipe) => void;

let synthOverride: SynthFn | null = null;
let muted: boolean | null = null; // lazy-initialized from storage

/** Replace the synth backend (tests inject a recorder; null restores WebAudio). */
export function setSynth(fn: SynthFn | null): void {
  synthOverride = fn;
}

export function isMuted(): boolean {
  if (muted === null) muted = getMutedPref();
  return muted;
}

/** Toggle mute; persists to localStorage (fail-silent). Returns new state. */
export function toggleMute(): boolean {
  muted = !isMuted();
  setMutedPref(muted);
  return muted;
}

/** Dispatch a game event to the synth unless muted (AC-26). */
export function playSound(event: SoundEvent): void {
  if (isMuted()) return;
  const recipe: SoundRecipe = { event, ...RECIPES[event] };
  if (synthOverride) {
    synthOverride(recipe);
    return;
  }
  webAudioSynth(recipe);
}

// ---------------------------------------------------------------------------
// Synth layer — WebAudio; silently absent outside browsers (risk §21).
// ---------------------------------------------------------------------------

let ctx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function ensureContext(): AudioContext | null {
  try {
    const AC = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') void ctx.resume(); // autoplay policy: post-keypress
    return ctx;
  } catch {
    return null;
  }
}

function webAudioSynth(recipe: SoundRecipe): void {
  const ac = ensureContext();
  if (!ac) return;
  try {
    const gain = ac.createGain();
    const t0 = ac.currentTime;
    const dur = recipe.durMs / 1000;
    gain.gain.setValueAtTime(recipe.volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    gain.connect(ac.destination);

    if (recipe.wave === 'noise') {
      if (!noiseBuffer) {
        noiseBuffer = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      const src = ac.createBufferSource();
      src.buffer = noiseBuffer;
      const filter = ac.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(recipe.freqFrom, t0);
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, recipe.freqTo), t0 + dur);
      src.connect(filter).connect(gain);
      src.start(t0);
      src.stop(t0 + dur);
    } else {
      const osc = ac.createOscillator();
      osc.type = recipe.wave;
      osc.frequency.setValueAtTime(recipe.freqFrom, t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, recipe.freqTo), t0 + dur);
      osc.connect(gain);
      osc.start(t0);
      osc.stop(t0 + dur);
    }
  } catch {
    // degrade silently
  }
}
