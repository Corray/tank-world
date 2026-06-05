// 回归测试 — issue #8（窗口失焦按键残留）。refs #8。

import { describe, it, expect } from 'vitest';
import { Direction } from '../src/core/types';
import { Keyboard } from '../src/input/input';

type Listener = (ev: unknown) => void;

function fakeWindow() {
  const winListeners = new Map<string, Listener[]>();
  const docListeners = new Map<string, Listener[]>();
  const doc = {
    visibilityState: 'visible' as string,
    addEventListener: (type: string, fn: Listener) => {
      docListeners.set(type, [...(docListeners.get(type) ?? []), fn]);
    },
  };
  const target = {
    document: doc,
    addEventListener: (type: string, fn: Listener) => {
      winListeners.set(type, [...(winListeners.get(type) ?? []), fn]);
    },
  } as unknown as Window;
  const fire = (type: string, ev: unknown = {}) =>
    winListeners.get(type)?.forEach((fn) => fn(ev));
  const fireDoc = (type: string) => docListeners.get(type)?.forEach((fn) => fn({}));
  return { target, fire, fireDoc, doc };
}

function keyEvent(code: string) {
  return { code, preventDefault: () => {} };
}

describe('issue #8 — focus loss releases all held keys', () => {
  it('blur clears held movement and fire keys', () => {
    const { target, fire } = fakeWindow();
    const kb = new Keyboard();
    kb.attach(target);
    fire('keydown', keyEvent('KeyD'));
    fire('keydown', keyEvent('KeyJ'));
    expect(kb.stateFor(1, false)).toEqual({ move: Direction.RIGHT, fire: true });
    fire('blur');
    expect(kb.stateFor(1, false)).toEqual({ move: null, fire: false });
  });

  it('tab-hide (visibilitychange→hidden) also clears held keys', () => {
    const { target, fire, fireDoc, doc } = fakeWindow();
    const kb = new Keyboard();
    kb.attach(target);
    fire('keydown', keyEvent('ArrowLeft'));
    expect(kb.stateFor(1, false).move).toBe(Direction.LEFT);
    doc.visibilityState = 'hidden';
    fireDoc('visibilitychange');
    expect(kb.stateFor(1, false).move).toBeNull();
  });

  it('keys pressed after refocus work normally (no sticky state)', () => {
    const { target, fire } = fakeWindow();
    const kb = new Keyboard();
    kb.attach(target);
    fire('keydown', keyEvent('KeyW'));
    fire('blur');
    fire('keydown', keyEvent('KeyS'));
    expect(kb.stateFor(1, false).move).toBe(Direction.DOWN);
  });
});
