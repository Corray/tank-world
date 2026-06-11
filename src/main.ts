// Entry point: wire modules together and start the loop (architecture §2).

import { GameLoop, startGame, startCoop, startVersus, startMelee, startWave, togglePause, restartToReady } from './core/game';
import { advanceLevel, retryLevel, enterEndless, advanceVersusRound, startNextWave } from './level/level';
import { toggleMute } from './audio/audio';
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
  (world, dt) => {
    // R13 修正：按玩家数而非 mode 分键位——solo WAVE 是单人非 SOLO mode，
    // 仍用全键位；既有四模式语义等价（SOLO=1 人，COOP/VS/MELEE=2 人）。
    const twoLane = world.players.length > 1;
    updateWorld(world, dt, [keyboard.stateFor(1, twoLane), keyboard.stateFor(2, twoLane)]);
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
  // R8 §3.21: VERSUS_ROUND interlude → next round.
  if (loop.world.state === GameState.VERSUS_ROUND) advanceVersusRound(loop.world);
  // R13 §3.26: a key during the wave break skips the countdown.
  if (loop.world.state === GameState.WAVE_BREAK) startNextWave(loop.world);
};
keyboard.onPause = () => togglePause(loop.world);
keyboard.onMute = () => toggleMute();
keyboard.onCoop = () => startCoop(loop.world); // READY + "2" (AC-38)
keyboard.onVersus = () => startVersus(loop.world); // READY + "3" (AC-52)
keyboard.onMelee = () => startMelee(loop.world); // READY + "4" (AC-60)
keyboard.onWave = () => startWave(loop.world, false); // READY + "5" (AC-88)
keyboard.onCoopWave = () => startWave(loop.world, true); // READY + "6" (AC-88)
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
