// 回归测试 — issue #6（COOP 污染 best-level）+ #7（COOP 无尽提示残留）。
// FAIL→PASS：本文件先红后绿，修复 commit 引用 refs #6 #7。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameState, GameMode } from '../src/core/types';
import { createWorld } from '../src/core/world';
import { startCoop } from '../src/core/game';
import { judge } from '../src/core/update';
import { overlayLines } from '../src/render/render';
import { renderHud } from '../src/hud/hud';
import { KEY_BEST_LEVEL } from '../src/core/constants';

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

describe('issue #6 — COOP level settlement must not touch solo buckets (AC-43)', () => {
  it('COOP LEVEL_CLEAR leaves best-level untouched', () => {
    const world = createWorld();
    startCoop(world);
    world.score = 999;
    world.spawnedCount = world.enemyTotal;
    judge(world);
    expect(world.state).toBe(GameState.LEVEL_CLEAR);
    expect(store.get(KEY_BEST_LEVEL)).toBeUndefined();
  });

  it('SOLO LEVEL_CLEAR still writes best-level (no regression)', () => {
    const world = createWorld();
    world.state = GameState.PLAYING;
    world.score = 321;
    world.spawnedCount = world.enemyTotal;
    judge(world);
    expect(store.get(KEY_BEST_LEVEL)).toBe('321');
  });
});

describe('issue #7 — COOP GAME_COMPLETE screen must not advertise endless (AC-44)', () => {
  function complete(world: ReturnType<typeof createWorld>): void {
    world.level = 3;
    world.state = GameState.PLAYING;
    world.spawnedCount = world.enemyTotal;
    judge(world);
    expect(world.state).toBe(GameState.GAME_COMPLETE);
  }

  it('COOP completion lines contain no ENDLESS hint', () => {
    const world = createWorld();
    startCoop(world);
    complete(world);
    const lines = overlayLines(world)!.join(' | ');
    expect(lines).not.toContain('ENDLESS');
  });

  it('SOLO completion keeps the ENDLESS hint (no regression)', () => {
    const world = createWorld();
    world.mode = GameMode.SOLO;
    complete(world);
    expect(overlayLines(world)!.join(' | ')).toContain('ENDLESS');
  });
});

describe('issue #7 family — HUD key help follows the mode', () => {
  function hudText(coop: boolean): string {
    const world = createWorld();
    if (coop) startCoop(world);
    const el = { innerHTML: '' } as unknown as HTMLElement;
    renderHud(el, world);
    return el.innerHTML;
  }

  it('COOP shows per-player bindings', () => {
    const html = hudText(true);
    expect(html).toContain('P1: WASD+J');
    expect(html).toContain('P2: Arrows+Enter');
  });

  it('SOLO keeps the combined bindings', () => {
    const html = hudText(false);
    expect(html).toContain('WASD / Arrows');
  });
});
