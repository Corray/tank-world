// HUD module: DOM side panel showing score / lives / enemies remaining (AC-8).

import { ENEMY_TOTAL } from '../core/constants';
import type { World } from '../core/world';

export function enemiesRemaining(world: World): number {
  const unspawned = ENEMY_TOTAL - world.spawnedCount;
  const aliveOnField = world.enemies.filter((e) => e.alive).length;
  return unspawned + aliveOnField;
}

export function renderHud(el: HTMLElement, world: World): void {
  el.innerHTML = [
    `<div>SCORE&nbsp;&nbsp;${world.score}</div>`,
    `<div>LIVES&nbsp;&nbsp;${world.player.lives}</div>`,
    `<div>ENEMY&nbsp;&nbsp;${enemiesRemaining(world)}</div>`,
    `<hr/>`,
    `<div style="font-size:11px;color:#888">Move: WASD / Arrows<br/>Fire: Space / J<br/>Pause: P &nbsp; Restart: R</div>`,
  ].join('');
}
