// Achievements module (R4): trigger judging, idempotent unlock, persistence,
// toast emission, progress query (consensus §3.16, data-model §26).

import type { World } from '../core/world';
import type { PowerupType } from '../core/types';

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

/** Idempotent unlock: persists + emits a toast only on first unlock. */
export function unlock(world: World, id: AchievementId): boolean {
  void world;
  void id;
  return false; // TODO(slice-W4)
}

export function isUnlocked(id: AchievementId): boolean {
  void id;
  return false; // TODO(slice-W4)
}

export function unlockedCount(): number {
  return 0; // TODO(slice-W4)
}

/** Hook: an enemy was destroyed (FIRST_BLOOD / CENTURION / DEMOLITION via map). */
export function onEnemyKilled(world: World): void {
  void world;
  // TODO(slice-W4)
}

/** Hook: a brick sub-block was destroyed — DEMOLITION when the level runs dry. */
export function onBrickDestroyed(world: World): void {
  void world;
  // TODO(slice-W4)
}

/** Hook: a powerup was picked up (COLLECTOR; PURIST tracking). */
export function onPickup(world: World, type: PowerupType): void {
  void world;
  void type;
  // TODO(slice-W4)
}

/** Hook: a level settled as cleared (NO_DEATH_LEVEL / FULL_CLEAR / PURIST). */
export function onLevelCleared(world: World): void {
  void world;
  // TODO(slice-W4)
}

/** Hook: a level was loaded (ENDLESS_8). */
export function onLevelLoaded(world: World): void {
  void world;
  // TODO(slice-W4)
}
