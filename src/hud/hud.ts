// HUD module: DOM side panel — score / lives / enemies / level / bests / mute
// (AC-8, AC-20, AC-26, AC-28).

import type { World } from '../core/world';
import { getBestTotal, getBestLevel, getBestEndless, getBestCoop, getBestCoopEndless } from '../storage/storage';
import { isMuted } from '../audio/audio';
import { LEVEL_COUNT } from '../core/constants';
import { GameMode } from '../core/types';
import {
  AchievementId,
  ACHIEVEMENT_LABEL,
  ACHIEVEMENT_COUNT,
  isUnlocked,
  unlockedCount,
} from '../achievements/achievements';

export function enemiesRemaining(world: World): number {
  const unspawned = world.enemyTotal - world.spawnedCount;
  const aliveOnField = world.enemies.filter((e) => e.alive).length;
  return unspawned + aliveOnField;
}

export function renderHud(el: HTMLElement, world: World): void {
  const levelLabel =
    world.level > LEVEL_COUNT ? `${world.level}/&infin;` : `${world.level}/${LEVEL_COUNT}`;
  const coop = world.mode === GameMode.COOP;
  const versus = world.mode === GameMode.VERSUS;
  const w = world.versusWins;
  const playerRows =
    coop || versus
      ? world.players
          .map(
            (p) =>
              `<div>P${p.id}&nbsp;&nbsp;♥${p.lives}&nbsp;&nbsp;${versus ? `⚔${p.kills}` : p.score}</div>`,
          )
          .join('')
      : `<div>LIVES&nbsp;&nbsp;${world.players[0].lives}</div>`;
  const topLine = versus
    ? `<div>VS&nbsp;&nbsp;P1&nbsp;${w[1]}&nbsp;:&nbsp;${w[2]}&nbsp;P2</div>`
    : `<div>LEVEL&nbsp;&nbsp;${levelLabel}${coop ? '&nbsp;CO-OP' : ''}</div>`;
  el.innerHTML = [
    topLine,
    `<div>SCORE&nbsp;&nbsp;${world.bankedScore + world.score}</div>`,
    playerRows,
    `<div>ENEMY&nbsp;&nbsp;${enemiesRemaining(world)}</div>`,
    `<hr/>`,
    `<div style="font-size:11px;color:#aaa">BEST TOTAL&nbsp;&nbsp;${getBestTotal()}<br/>BEST LEVEL&nbsp;&nbsp;${getBestLevel()}<br/>BEST ENDLESS&nbsp;&nbsp;${getBestEndless()}<br/>BEST CO-OP&nbsp;&nbsp;${getBestCoop()}<br/>BEST CO-OP&infin;&nbsp;&nbsp;${getBestCoopEndless()}</div>`,
    `<hr/>`,
    `<div style="font-size:11px;color:#aaa">ACH&nbsp;&nbsp;${unlockedCount()}/${ACHIEVEMENT_COUNT}</div>`,
    `<div style="font-size:10px;line-height:1.5">${achievementRows()}</div>`,
    `<hr/>`,
    // fix #7 family: key help follows the mode (co-op/versus bindings differ, AC-39).
    coop || versus
      ? `<div style="font-size:11px;color:#888">P1: WASD+J<br/>P2: Arrows+Enter<br/>Pause: P &nbsp; Restart: R<br/>Sound: M (${isMuted() ? 'muted' : 'on'})</div>`
      : `<div style="font-size:11px;color:#888">Move: WASD / Arrows<br/>Fire: Space / J<br/>Pause: P &nbsp; Restart: R<br/>Sound: M (${isMuted() ? 'muted' : 'on'})</div>`,
  ].join('');
}

function achievementRows(): string {
  return Object.values(AchievementId)
    .map((id) => {
      const got = isUnlocked(id);
      const color = got ? '#ffd700' : '#555';
      return `<span style="color:${color}">${got ? '★' : '☆'} ${ACHIEVEMENT_LABEL[id]}</span>`;
    })
    .join('<br/>');
}
