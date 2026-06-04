// HUD module: DOM side panel — score / lives / enemies / level / bests / mute
// (AC-8, AC-20, AC-26, AC-28).

import type { World } from '../core/world';
import { getBestTotal, getBestLevel, getBestEndless } from '../storage/storage';
import { isMuted } from '../audio/audio';
import { LEVEL_COUNT } from '../core/constants';

export function enemiesRemaining(world: World): number {
  const unspawned = world.enemyTotal - world.spawnedCount;
  const aliveOnField = world.enemies.filter((e) => e.alive).length;
  return unspawned + aliveOnField;
}

export function renderHud(el: HTMLElement, world: World): void {
  const levelLabel =
    world.level > LEVEL_COUNT ? `${world.level}/&infin;` : `${world.level}/${LEVEL_COUNT}`;
  el.innerHTML = [
    `<div>LEVEL&nbsp;&nbsp;${levelLabel}</div>`,
    `<div>SCORE&nbsp;&nbsp;${world.bankedScore + world.score}</div>`,
    `<div>LIVES&nbsp;&nbsp;${world.player.lives}</div>`,
    `<div>ENEMY&nbsp;&nbsp;${enemiesRemaining(world)}</div>`,
    `<hr/>`,
    `<div style="font-size:11px;color:#aaa">BEST TOTAL&nbsp;&nbsp;${getBestTotal()}<br/>BEST LEVEL&nbsp;&nbsp;${getBestLevel()}<br/>BEST ENDLESS&nbsp;&nbsp;${getBestEndless()}</div>`,
    `<hr/>`,
    `<div style="font-size:11px;color:#888">Move: WASD / Arrows<br/>Fire: Space / J<br/>Pause: P &nbsp; Restart: R<br/>Sound: M (${isMuted() ? 'muted' : 'on'})</div>`,
  ].join('');
}
