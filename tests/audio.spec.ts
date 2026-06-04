// T-AU-1~5 — audio dispatch layer (test-plan-r3 §2.2, data-model §18).
// Only the dispatch layer is unit-tested; WebAudio synth degrades silently.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SoundEvent,
  playSound,
  setSynth,
  toggleMute,
  isMuted,
  type SoundRecipe,
} from '../src/audio/audio';
import { EnemyType, Terrain, Direction, BulletOwner } from '../src/core/types';
import { KEY_MUTED } from '../src/core/constants';
import { makeWorld, emptyLayout, cellCenter, makeBullet, addEnemy, runCombat } from './helpers';

let received: SoundRecipe[] = [];

beforeEach(() => {
  received = [];
  setSynth((r) => received.push(r));
  if (isMuted()) toggleMute(); // normalize to unmuted
});

afterEach(() => {
  setSynth(null);
  delete (globalThis as Record<string, unknown>).localStorage;
});

describe('T-AU-1 every event maps to its own recipe', () => {
  it('8 events → 8 distinct recipes tagged with the event', () => {
    const events = Object.values(SoundEvent);
    expect(events).toHaveLength(8);
    for (const ev of events) playSound(ev);
    expect(received.map((r) => r.event)).toEqual(events);
    // Distinctness proxy: recipe parameter tuples are pairwise different (AC-26).
    const signatures = new Set(received.map((r) => `${r.wave}|${r.freqFrom}|${r.freqTo}|${r.durMs}`));
    expect(signatures.size).toBe(8);
  });
});

describe('T-AU-2 mute gates the synth', () => {
  it('no synth calls while muted', () => {
    toggleMute();
    expect(isMuted()).toBe(true);
    playSound(SoundEvent.FIRE);
    playSound(SoundEvent.ENEMY_DOWN);
    expect(received).toHaveLength(0);
  });
});

describe('T-AU-3 mute toggle persists', () => {
  it('toggleMute writes the localStorage pref', () => {
    const store = new Map<string, string>();
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
    const muted = toggleMute();
    expect(store.get(KEY_MUTED)).toBe(muted ? '1' : '0');
    const back = toggleMute();
    expect(store.get(KEY_MUTED)).toBe(back ? '1' : '0');
    expect(back).toBe(!muted);
  });
});

describe('T-AU-4 missing AudioContext degrades silently', () => {
  it('default synth path does not throw in node', () => {
    setSynth(null); // restore default (WebAudio) synth
    expect(() => playSound(SoundEvent.FIRE)).not.toThrow();
  });
});

describe('T-AU-5 combat wiring emits the right events', () => {
  it('enemy kill → ENEMY_DOWN; brick hit → HIT_BRICK', () => {
    const world = makeWorld();
    addEnemy(world, EnemyType.BASIC, 6, 8);
    world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 2000);
    expect(received.some((r) => r.event === SoundEvent.ENEMY_DOWN)).toBe(true);

    received = [];
    const layout = emptyLayout();
    layout[6][6] = Terrain.BRICK;
    const world2 = makeWorld(layout);
    world2.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world2, 1000);
    expect(received.some((r) => r.event === SoundEvent.HIT_BRICK)).toBe(true);
  });
});
