// Achievements module (R4): trigger judging, idempotent unlock, persistence,
// toast emission, progress query (consensus §3.16, data-model §26).

import type { World } from '../core/world';
import type { PowerupType } from '../core/types';
import { KEY_ACHIEVEMENTS, KEY_KILLS, LEVEL_COUNT } from '../core/constants';
import { spawnToast } from '../effects/effects';

/** Trigger thresholds (consensus §3.16). */
const CENTURION_KILLS = 100;
const COLLECTOR_TYPES = 3;
const ENDLESS_8_LEVEL = 8;

export enum AchievementId {
  FIRST_BLOOD = 'FIRST_BLOOD',
  NO_DEATH_LEVEL = 'NO_DEATH_LEVEL',
  FULL_CLEAR = 'FULL_CLEAR',
  ENDLESS_8 = 'ENDLESS_8',
  COLLECTOR = 'COLLECTOR',
  DEMOLITION = 'DEMOLITION',
  PURIST = 'PURIST',
  CENTURION = 'CENTURION',
}

export const ACHIEVEMENT_COUNT = Object.keys(AchievementId).length;

/** Human-readable toast labels (English only in code, N4 §10.2). */
export const ACHIEVEMENT_LABEL: Record<AchievementId, string> = {
  [AchievementId.FIRST_BLOOD]: 'First Blood',
  [AchievementId.NO_DEATH_LEVEL]: 'Untouchable',
  [AchievementId.FULL_CLEAR]: 'Campaign Complete',
  [AchievementId.ENDLESS_8]: 'Endless Eight',
  [AchievementId.COLLECTOR]: 'Collector',
  [AchievementId.DEMOLITION]: 'Demolition Expert',
  [AchievementId.PURIST]: 'Purist',
  [AchievementId.CENTURION]: 'Centurion',
};

// Persistence is storage-backed with NO module cache: test isolation comes
// from fresh localStorage mocks; absence of storage degrades silently.

function readSet(): Set<string> {
  try {
    const raw = globalThis.localStorage?.getItem(KEY_ACHIEVEMENTS);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSet(set: Set<string>): void {
  try {
    globalThis.localStorage?.setItem(KEY_ACHIEVEMENTS, JSON.stringify([...set]));
  } catch {
    // degrade silently
  }
}

function readKills(): number {
  try {
    const n = Number(globalThis.localStorage?.getItem(KEY_KILLS) ?? 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeKills(n: number): void {
  try {
    globalThis.localStorage?.setItem(KEY_KILLS, String(n));
  } catch {
    // degrade silently
  }
}

/** Idempotent unlock: persists + emits a toast only on first unlock. */
export function unlock(world: World, id: AchievementId): boolean {
  const set = readSet();
  if (set.has(id)) return false;
  set.add(id);
  writeSet(set);
  spawnToast(world, `Achievement: ${ACHIEVEMENT_LABEL[id]}`);
  return true;
}

export function isUnlocked(id: AchievementId): boolean {
  return readSet().has(id);
}

export function unlockedCount(): number {
  return readSet().size;
}

/** Hook: an enemy was destroyed (FIRST_BLOOD / CENTURION). */
export function onEnemyKilled(world: World): void {
  unlock(world, AchievementId.FIRST_BLOOD);
  const kills = readKills() + 1;
  writeKills(kills);
  if (kills >= CENTURION_KILLS) unlock(world, AchievementId.CENTURION);
}

/** Hook: a brick was hit — DEMOLITION when the level's bricks run dry. */
export function onBrickDestroyed(world: World): void {
  if (world.map.brickCellsRemaining() === 0) unlock(world, AchievementId.DEMOLITION);
}

/** Hook: a powerup was picked up (COLLECTOR; PURIST forfeits via tracking). */
export function onPickup(world: World, type: PowerupType): void {
  if (!world.runPickupTypes.includes(type)) world.runPickupTypes.push(type);
  if (world.runPickupTypes.length >= COLLECTOR_TYPES) {
    unlock(world, AchievementId.COLLECTOR);
  }
}

/** Hook: a level settled as cleared (NO_DEATH_LEVEL / FULL_CLEAR / PURIST). */
export function onLevelCleared(world: World): void {
  if (world.player.lives === world.levelStartLives) {
    unlock(world, AchievementId.NO_DEATH_LEVEL);
  }
  if (world.level === LEVEL_COUNT) {
    unlock(world, AchievementId.FULL_CLEAR);
    if (world.runPickupTypes.length === 0) unlock(world, AchievementId.PURIST);
  }
}

/** Hook: a level was loaded (ENDLESS_8). */
export function onLevelLoaded(world: World): void {
  if (world.level >= ENDLESS_8_LEVEL) unlock(world, AchievementId.ENDLESS_8);
}
