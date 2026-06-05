// T-ACH-1~10 — achievements: triggers / idempotency / persistence (test-plan-r4 §2.3).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  AchievementId,
  ACHIEVEMENT_LABEL,
  unlock,
  isUnlocked,
  unlockedCount,
  onPickup,
} from '../src/achievements/achievements';
import { GameState, EffectKind, EnemyType, Terrain, Direction, BulletOwner, PowerupType } from '../src/core/types';
import { judge } from '../src/core/update';
import { loadLevel } from '../src/level/level';
import { createWorld } from '../src/core/world';
import { updatePowerups } from '../src/powerup/powerup';
import { KEY_ACHIEVEMENTS, KEY_KILLS } from '../src/core/constants';
import { makeWorld, emptyLayout, cellCenter, makeBullet, addEnemy, runCombat } from './helpers';

let store: Map<string, string>;

beforeEach(() => {
  store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  };
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).localStorage;
});

function killOneEnemy(world = makeWorld()): typeof world {
  addEnemy(world, EnemyType.BASIC, 6, 8);
  world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT));
  runCombat(world, 2000);
  return world;
}

function clearLevel(world: ReturnType<typeof createWorld>): void {
  world.state = GameState.PLAYING;
  world.spawnedCount = world.enemyTotal;
  world.enemies.forEach((e) => (e.alive = false));
  judge(world);
}

describe('T-ACH-1 FIRST_BLOOD on the first kill', () => {
  it('combat kill unlocks + emits a toast', () => {
    const world = killOneEnemy();
    expect(isUnlocked(AchievementId.FIRST_BLOOD)).toBe(true);
    const toast = world.effects.find((e) => e.kind === EffectKind.TOAST);
    expect(toast).toBeDefined();
    expect(toast!.text).toContain(ACHIEVEMENT_LABEL[AchievementId.FIRST_BLOOD]);
  });
});

describe('T-ACH-2 NO_DEATH_LEVEL', () => {
  it('clearing at full snapshot lives unlocks', () => {
    const world = createWorld();
    loadLevel(world, 1);
    clearLevel(world);
    expect(isUnlocked(AchievementId.NO_DEATH_LEVEL)).toBe(true);
  });

  it('clearing after losing a life does not unlock', () => {
    const world = createWorld();
    loadLevel(world, 1);
    world.player.lives = world.levelStartLives - 1;
    clearLevel(world);
    expect(isUnlocked(AchievementId.NO_DEATH_LEVEL)).toBe(false);
  });
});

describe('T-ACH-3 FULL_CLEAR on campaign completion', () => {
  it('L3 settle unlocks', () => {
    const world = createWorld();
    loadLevel(world, 3);
    clearLevel(world);
    expect(world.state).toBe(GameState.GAME_COMPLETE);
    expect(isUnlocked(AchievementId.FULL_CLEAR)).toBe(true);
  });
});

describe('T-ACH-4 ENDLESS_8 on reaching level 8', () => {
  it('loadLevel(8) unlocks; loadLevel(7) does not', () => {
    const world = createWorld();
    loadLevel(world, 7);
    expect(isUnlocked(AchievementId.ENDLESS_8)).toBe(false);
    loadLevel(world, 8);
    expect(isUnlocked(AchievementId.ENDLESS_8)).toBe(true);
  });
});

describe('T-ACH-5 COLLECTOR needs all three powerup types in one run', () => {
  it('three distinct types unlock; two do not', () => {
    const world = makeWorld();
    onPickup(world, PowerupType.SHIELD);
    onPickup(world, PowerupType.DOUBLE_FIRE);
    expect(isUnlocked(AchievementId.COLLECTOR)).toBe(false);
    onPickup(world, PowerupType.BOMB);
    expect(isUnlocked(AchievementId.COLLECTOR)).toBe(true);
  });

  it('integration: pickup via updatePowerups feeds the hook', () => {
    const world = makeWorld();
    world.player.pos = cellCenter(6, 6);
    world.powerups.push({ type: PowerupType.SHIELD, pos: cellCenter(6, 6) });
    updatePowerups(world);
    expect(world.runPickupTypes).toContain(PowerupType.SHIELD);
  });
});

describe('T-ACH-6 DEMOLITION when the last brick falls', () => {
  it('clearing the only brick cell unlocks', () => {
    const layout = emptyLayout();
    layout[6][6] = Terrain.BRICK;
    const world = makeWorld(layout);
    world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 1200);
    world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 1200);
    expect(world.map.brickCellsRemaining()).toBe(0);
    expect(isUnlocked(AchievementId.DEMOLITION)).toBe(true);
  });

  it('a brickless layout never triggers it', () => {
    const layout = emptyLayout();
    layout[6][6] = Terrain.STEEL;
    const world = makeWorld(layout);
    world.bullets.push(makeBullet(BulletOwner.PLAYER, cellCenter(6, 4), Direction.RIGHT));
    runCombat(world, 1200);
    expect(isUnlocked(AchievementId.DEMOLITION)).toBe(false);
  });
});

describe('T-ACH-7 PURIST: full clear with zero pickups', () => {
  it('clean run unlocks both FULL_CLEAR and PURIST', () => {
    const world = createWorld();
    loadLevel(world, 3);
    clearLevel(world);
    expect(isUnlocked(AchievementId.PURIST)).toBe(true);
  });

  it('any pickup forfeits PURIST but not FULL_CLEAR', () => {
    const world = createWorld();
    loadLevel(world, 3);
    onPickup(world, PowerupType.SHIELD);
    clearLevel(world);
    expect(isUnlocked(AchievementId.FULL_CLEAR)).toBe(true);
    expect(isUnlocked(AchievementId.PURIST)).toBe(false);
  });
});

describe('T-ACH-8 CENTURION at 100 cumulative kills', () => {
  it('the 100th kill across runs unlocks', () => {
    store.set(KEY_KILLS, '99');
    killOneEnemy();
    expect(store.get(KEY_KILLS)).toBe('100');
    expect(isUnlocked(AchievementId.CENTURION)).toBe(true);
  });
});

describe('T-ACH-9 unlock is idempotent', () => {
  it('second unlock returns false and emits no extra toast', () => {
    const world = makeWorld();
    expect(unlock(world, AchievementId.FIRST_BLOOD)).toBe(true);
    expect(unlock(world, AchievementId.FIRST_BLOOD)).toBe(false);
    const toasts = world.effects.filter((e) => e.kind === EffectKind.TOAST);
    expect(toasts).toHaveLength(1);
  });
});

describe('T-ACH-10 persistence restore', () => {
  it('unlocked set is restored from storage; count is correct', () => {
    store.set(KEY_ACHIEVEMENTS, JSON.stringify([AchievementId.FIRST_BLOOD, AchievementId.FULL_CLEAR]));
    expect(isUnlocked(AchievementId.FIRST_BLOOD)).toBe(true);
    expect(isUnlocked(AchievementId.COLLECTOR)).toBe(false);
    expect(unlockedCount()).toBe(2);
  });
});
