// Entry point: wire modules together and start the loop (architecture §2).

import { GameLoop, startGame, togglePause, restartToReady } from './core/game';
import { createWorld } from './core/world';
import { GameState } from './core/types';
import { Keyboard } from './input/input';
import { render } from './render/render';
import { updateWorld } from './core/update';
import { renderHud } from './hud/hud';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D context unavailable');

const hudEl = document.getElementById('hud') as HTMLDivElement;

const keyboard = new Keyboard();
keyboard.attach(window);

const loop = new GameLoop(
  createWorld(),
  (world, dt) => updateWorld(world, dt, keyboard.state()),
  (world) => {
    render(ctx, world);
    renderHud(hudEl, world);
  },
);

keyboard.onAnyAction = () => startGame(loop.world);
keyboard.onPause = () => togglePause(loop.world);
keyboard.onRestart = () => {
  const next = restartToReady(loop.world);
  if (next !== loop.world) loop.world = next;
};

loop.start();

// Expose for debugging in dev tools.
declare global {
  interface Window {
    __world?: unknown;
  }
}
if (import.meta.env.DEV) {
  Object.defineProperty(window, '__world', { get: () => loop.world });
  void GameState;
}
