// Entry point: wire modules together and start the loop (architecture §2).

import { GameLoop, startGame, startCoop, togglePause, restartToReady } from './core/game';
import { advanceLevel, retryLevel, enterEndless } from './level/level';
import { toggleMute } from './audio/audio';
import { createWorld } from './core/world';
import { GameState, GameMode } from './core/types';
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
  (world, dt) => {
    const coop = world.mode === GameMode.COOP;
    updateWorld(world, dt, [keyboard.stateFor(1, coop), keyboard.stateFor(2, coop)]);
  },
  (world) => {
    render(ctx, world);
    renderHud(hudEl, world);
  },
);

keyboard.onAnyAction = () => {
  startGame(loop.world); // READY → PLAYING
  if (loop.world.state === GameState.LEVEL_CLEAR) advanceLevel(loop.world);
  // R3: GAME_COMPLETE → endless (guarded by the anti-misfire window).
  if (loop.world.state === GameState.GAME_COMPLETE) enterEndless(loop.world, Date.now());
};
keyboard.onPause = () => togglePause(loop.world);
keyboard.onMute = () => toggleMute();
keyboard.onCoop = () => startCoop(loop.world); // READY + "2" (AC-38)
keyboard.onRestart = () => {
  if (loop.world.state === GameState.DEFEAT) {
    retryLevel(loop.world); // R2: retry current level (AC-15)
    return;
  }
  const next = restartToReady(loop.world); // GAME_COMPLETE → fresh run
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
