// Storage module (R2): localStorage best scores, fail-silent (data-model §14).

import {
  KEY_BEST_TOTAL,
  KEY_BEST_LEVEL,
  KEY_BEST_ENDLESS,
  KEY_BEST_COOP,
  KEY_MUTED,
} from '../core/constants';

function read(key: string): number {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    const n = raw === null || raw === undefined ? 0 : Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0; // privacy mode / quota — degrade silently (risk §15)
  }
}

function writeIfHigher(key: string, value: number): void {
  try {
    if (value > read(key)) globalThis.localStorage?.setItem(key, String(value));
  } catch {
    // degrade silently
  }
}

export function getBestTotal(): number {
  return read(KEY_BEST_TOTAL);
}

export function getBestLevel(): number {
  return read(KEY_BEST_LEVEL);
}

/** Submit a single-level settlement score (any LEVEL_CLEAR / run end). */
export function submitLevelScore(score: number): void {
  writeIfHigher(KEY_BEST_LEVEL, score);
}

/** Submit a full-run total (GAME_COMPLETE only). */
export function submitTotal(total: number): void {
  writeIfHigher(KEY_BEST_TOTAL, total);
}

// --- R3 additions (data-model §21) ---

export function getBestEndless(): number {
  return read(KEY_BEST_ENDLESS);
}

/** Submit an endless-run score (ENDLESS_OVER settlement only). */
export function submitEndless(score: number): void {
  writeIfHigher(KEY_BEST_ENDLESS, score);
}

// R5: co-op combined best (data-model §31).
export function getBestCoop(): number {
  return read(KEY_BEST_COOP);
}

export function submitCoop(total: number): void {
  writeIfHigher(KEY_BEST_COOP, total);
}

export function getMutedPref(): boolean {
  try {
    return globalThis.localStorage?.getItem(KEY_MUTED) === '1';
  } catch {
    return false;
  }
}

export function setMutedPref(muted: boolean): void {
  try {
    globalThis.localStorage?.setItem(KEY_MUTED, muted ? '1' : '0');
  } catch {
    // degrade silently
  }
}
