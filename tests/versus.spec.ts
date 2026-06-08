// T-VS-1~13 — local versus / 1v1 PvP (test-plan-r8 §3). R8 骨架：编译原子性
// 致部分结构断言在桩存在时先绿（大重构边界，dogfood 偏离声明见实现总结）；
// 行为断言（友军火力反转/judge 分叉/回合/中立道具）骨架阶段全 FAIL→impl 转绿。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  GameState,
  GameMode,
  Direction,
  BulletOwner,
  PowerupType,
} from '../src/core/types';
import { startGame, startCoop, startVersus } from '../src/core/game';
import { judge } from '../src/core/update';
import { createWorld } from '../src/core/world';
import { firePlayerBullet } from '../src/combat/combat';
import { updatePowerups } from '../src/powerup/powerup';
import { setupVersus, advanceVersusRound } from '../src/level/level';
import { isUnlocked, AchievementId } from '../src/achievements/achievements';
import { overlayLines } from '../src/render/render';
import { renderHud } from '../src/hud/hud';
import {
  PLAYER_LIVES,
  BULLET_SPEED,
  VS_WINS_NEEDED,
  VS_POWERUP_INTERVAL_MS,
  VS_SPAWN_P1,
  VS_SPAWN_P2,
  KEY_BEST_TOTAL,
  KEY_BEST_LEVEL,
  KEY_BEST_ENDLESS,
  KEY_BEST_COOP,
  KEY_BEST_COOP_ENDLESS,
} from '../src/core/constants';
import { GameMap } from '../src/map/map';
import { emptyLayout, cellCenter, runCombat, runWorld } from './helpers';
import type { World } from '../src/core/world';

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

/** Versus world (PLAYING). Optional layout override for self-contained combat tests. */
function makeVersus(layout?: number[][]): World {
  const world = createWorld();
  startVersus(world);
  if (layout) world.map = new GameMap(layout);
  return world;
}

describe('T-VS-1 entering versus', () => {
  it('key "3" → mode VERSUS, two players, PLAYING', () => {
    const world = createWorld();
    startVersus(world);
    expect(world.mode).toBe(GameMode.VERSUS);
    expect(world.players).toHaveLength(2);
    expect(world.players[1].id).toBe(2);
    expect(world.state).toBe(GameState.PLAYING);
  });

  it('SOLO / COOP entries unchanged (zero regression)', () => {
    const solo = createWorld();
    startGame(solo);
    expect(solo.mode).toBe(GameMode.SOLO);
    const coop = createWorld();
    startCoop(coop);
    expect(coop.mode).toBe(GameMode.COOP);
    const vs = createWorld();
    startVersus(vs);
    expect(vs.mode).toBe(GameMode.VERSUS);
  });
});

describe('T-VS-2 versus arena setup', () => {
  it('P1 at bottom spawn, P2 at top spawn (symmetric), no NPCs', () => {
    const world = createWorld();
    startVersus(world);
    expect(world.players[0].pos).toEqual(cellCenter(...VS_SPAWN_P1));
    expect(world.players[1].pos).toEqual(cellCenter(...VS_SPAWN_P2));
    expect(world.enemyTotal).toBe(0);
  });
});

describe('T-VS-3 pure PvP — no enemies ever spawn', () => {
  it('enemies stay empty after running the pipeline', () => {
    const world = makeVersus();
    runWorld(world, 5000);
    expect(world.enemies).toHaveLength(0);
    expect(world.spawnedCount).toBe(0);
  });
});

describe('T-VS-4 judge fork blocks the PvE clear path', () => {
  it('0 enemies does NOT trigger LEVEL_CLEAR/GAME_COMPLETE in versus', () => {
    const world = makeVersus();
    world.enemyTotal = 0;
    world.spawnedCount = 0;
    judge(world);
    expect(world.state).toBe(GameState.PLAYING);
  });
});

describe('T-VS-5 six score buckets stay untouched in versus', () => {
  it('a full match writes none of the five score buckets', () => {
    const world = makeVersus();
    // round 1: P2 base falls → P1 wins
    world.map.destroyBase(0);
    judge(world);
    advanceVersusRound(world);
    // round 2: P2 base falls again → P1 takes the match
    world.map.destroyBase(0);
    judge(world);
    expect(world.state).toBe(GameState.VERSUS_OVER);
    for (const k of [KEY_BEST_TOTAL, KEY_BEST_LEVEL, KEY_BEST_ENDLESS, KEY_BEST_COOP, KEY_BEST_COOP_ENDLESS]) {
      expect(store.get(k)).toBeUndefined();
    }
  });
});

describe('T-VS-6 friendly fire is REVERSED in versus', () => {
  it('6a: P1 bullet hits P2 → P2 loses a life, P1 frags +1', () => {
    const world = makeVersus(emptyLayout());
    world.clock = 10_000;
    world.players[0].pos = cellCenter(6, 2);
    world.players[0].dir = Direction.RIGHT;
    world.players[1].pos = cellCenter(6, 6);
    world.players[1].invincibleUntil = 0;
    world.players[1].shieldUntil = 0;
    firePlayerBullet(world, world.players[0]);
    runCombat(world, 2000);
    expect(world.players[1].lives).toBe(PLAYER_LIVES - 1);
    expect(world.players[0].kills).toBe(1);
  });

  it('6b: own bullet passes through self (no self-damage)', () => {
    const world = makeVersus(emptyLayout());
    world.clock = 10_000;
    world.players[0].pos = cellCenter(6, 6);
    world.players[0].invincibleUntil = 0;
    world.bullets.push({
      pos: cellCenter(6, 2),
      dir: Direction.RIGHT,
      speed: BULLET_SPEED,
      owner: BulletOwner.PLAYER,
      playerId: 1,
    });
    runCombat(world, 2000);
    expect(world.players[0].lives).toBe(PLAYER_LIVES);
  });

  it('6c: invincible/shielded foe takes no damage from the opponent', () => {
    const world = makeVersus(emptyLayout());
    world.clock = 10_000;
    world.players[0].pos = cellCenter(6, 2);
    world.players[0].dir = Direction.RIGHT;
    world.players[1].pos = cellCenter(6, 6);
    world.players[1].invincibleUntil = world.clock + 5000;
    firePlayerBullet(world, world.players[0]);
    runCombat(world, 2000);
    expect(world.players[1].lives).toBe(PLAYER_LIVES);
  });

  it('6d: COOP friendly bullets still pass through (zero regression)', () => {
    const world = createWorld();
    startCoop(world);
    world.map = new GameMap(emptyLayout());
    world.clock = 10_000;
    world.players[0].pos = cellCenter(6, 2);
    world.players[0].dir = Direction.RIGHT;
    world.players[1].pos = cellCenter(6, 6);
    world.players[1].invincibleUntil = 0;
    firePlayerBullet(world, world.players[0]);
    runCombat(world, 2000);
    expect(world.players[1].lives).toBe(PLAYER_LIVES);
  });
});

describe('T-VS-7 win by destroying the opponent base', () => {
  it("P2's base falling hands P1 the round", () => {
    const world = makeVersus();
    world.map.destroyBase(0); // P2 base (top row)
    judge(world);
    expect(world.versusRoundWinner).toBe(1);
    expect(world.versusWins[1]).toBe(1);
    expect(world.state).toBe(GameState.VERSUS_ROUND);
  });
});

describe('T-VS-8 win by depleting the opponent lives', () => {
  it('P2 out of lives hands P1 the round', () => {
    const world = makeVersus();
    world.players[1].lives = 0;
    world.players[1].alive = false;
    judge(world);
    expect(world.versusRoundWinner).toBe(1);
    expect(world.versusWins[1]).toBe(1);
  });
});

describe('T-VS-9 neutral powerups (no bomb, timed mid-line spawn)', () => {
  it('9a: a neutral powerup appears after the interval, never a bomb', () => {
    const world = makeVersus();
    expect(world.powerups).toHaveLength(0);
    runWorld(world, VS_POWERUP_INTERVAL_MS + 100);
    expect(world.powerups.length).toBeGreaterThan(0);
    expect(world.powerups.every((pu) => pu.type !== PowerupType.BOMB)).toBe(true);
  });

  it('9b: a picked powerup belongs to the picker only', () => {
    const world = makeVersus(emptyLayout());
    world.players[0].pos = cellCenter(6, 6);
    world.players[1].pos = cellCenter(2, 2);
    world.powerups.push({ type: PowerupType.DOUBLE_FIRE, pos: cellCenter(6, 6) });
    updatePowerups(world);
    expect(world.players[0].doubleFire).toBe(true);
    expect(world.players[1].doubleFire).toBe(false);
  });
});

describe('T-VS-10 HUD shows the versus state', () => {
  it('renders both players + a VS round marker', () => {
    const world = makeVersus();
    const el = { innerHTML: '' } as unknown as HTMLElement;
    renderHud(el, world);
    expect(el.innerHTML).toContain('VS');
  });
});

describe('T-VS-11 versus settlement screen', () => {
  it('VERSUS_OVER overlay names the winner', () => {
    const world = makeVersus();
    world.state = GameState.VERSUS_OVER;
    world.versusMatchWinner = 1;
    world.versusWins = { 1: 2, 2: 0 };
    const lines = overlayLines(world);
    expect(lines).not.toBeNull();
    expect(lines!.some((l) => l.includes('P1'))).toBe(true);
  });
});

describe('T-VS-12 achievements do NOT fire in versus', () => {
  it('a versus frag never unlocks FIRST_BLOOD', () => {
    const world = makeVersus(emptyLayout());
    world.clock = 10_000;
    world.players[0].pos = cellCenter(6, 2);
    world.players[0].dir = Direction.RIGHT;
    world.players[1].pos = cellCenter(6, 6);
    world.players[1].invincibleUntil = 0;
    world.players[1].lives = 1;
    firePlayerBullet(world, world.players[0]);
    runCombat(world, 2000);
    expect(isUnlocked(AchievementId.FIRST_BLOOD)).toBe(false);
  });
});

describe('T-VS-13 best-of-3 round flow', () => {
  it('13a: a round win → interlude, then advance revives both, wins preserved', () => {
    const world = makeVersus();
    world.players[0].lives = 1;
    world.players[1].lives = 0;
    world.players[1].alive = false;
    judge(world); // P1 wins round 1
    expect(world.state).toBe(GameState.VERSUS_ROUND);
    expect(world.versusWins).toEqual({ 1: 1, 2: 0 });
    advanceVersusRound(world);
    expect(world.state).toBe(GameState.PLAYING);
    expect(world.players[0].lives).toBe(PLAYER_LIVES);
    expect(world.players[1].lives).toBe(PLAYER_LIVES);
    expect(world.players[1].alive).toBe(true);
    expect(world.versusWins).toEqual({ 1: 1, 2: 0 });
  });

  it('13b: reaching VS_WINS_NEEDED ends the match (VERSUS_OVER)', () => {
    const world = makeVersus();
    world.versusWins = { 1: VS_WINS_NEEDED - 1, 2: 0 };
    world.players[1].lives = 0;
    world.players[1].alive = false;
    judge(world);
    expect(world.versusWins[1]).toBe(VS_WINS_NEEDED);
    expect(world.state).toBe(GameState.VERSUS_OVER);
    expect(world.versusMatchWinner).toBe(1);
  });
});

// 元验收：setupVersus 被 startVersus 调用（分叉清单 v3 #2 写入点存在性）。
void setupVersus;
