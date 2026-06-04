// HUD module: DOM side panel — score / lives / enemies / level / bests (AC-8, AC-20).

import type { World } from '../core/world';
import { getBestTotal, getBestLevel } from '../storage/storage';

export function enemiesRemaining(world: World): number {
  const unspawned = world.enemyTotal - world.spawnedCount;
  const aliveOnField = world.enemies.filter((e) => e.alive).length;
  return unspawned + aliveOnField;
}

export function renderHud(el: HTMLElement, world: World): void {
  el.innerHTML = [
    `<div>LEVEL&nbsp;&nbsp;${world.level}/3</div>`,
    `<div>SCORE&nbsp;&nbsp;${world.bankedScore + world.score}</div>`,
    `<div>LIVES&nbsp;&nbsp;${world.player.lives}</div>`,
    `<div>ENEMY&nbsp;&nbsp;${enemiesRemaining(world)}</div>`,
    `<hr/>`,
    `<div style="font-size:11px;color:#aaa">BEST TOTAL&nbsp;&nbsp;${getBestTotal()}<br/>BEST LEVEL&nbsp;&nbsp;${getBestLevel()}</div>`,
    `<hr/>`,
    `<div style="font-size:11px;color:#888">Move: WASD / Arrows<br/>Fire: Space / J<br/>Pause: P &nbsp; Restart: R</div>`,
  ].join('');
}
