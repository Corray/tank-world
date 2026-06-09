# tank-world — Code Map（代码拓扑索引）

| 版本 | 日期 | 变更摘要 |
|------|------|---------|
| v3 | 2026-06-09 | R9 MELEE：isPvP 助手统一 PvP 判定；judge/C17 经 isPvP 扩 MELEE；judgeVersus 复用（零改）；setupMelee=setupVersus+NPC 池；NPC 中立出生点 |
| v2 | 2026-06-08 | R8 VERSUS：judge 增 judgeVersus 分叉；双基地建模；C17 友军火力反转；VS 入口与中立道具 |
| v1 | 2026-06-05 | 初建（F-PROC-e0e8 补缺；spec-to-code-flow §6 伴生产物） |

> 维护约定：关键链路变更时更新（与实现总结同时落）。

## 入口与启动链

```
index.html → src/main.ts
  ├─ createWorld()                    core/world.ts   ← World 唯一状态源（players[] 复数）
  ├─ Keyboard.attach(window)          input/input.ts  ← 双通道映射 + blur 兜底；2=COOP / 3=VERSUS
  └─ GameLoop.start()                 core/game.ts    ← rAF + 固定时间步 advance()

模式入口：startGame(SOLO) / startCoop(2) / startVersus(3) / startMelee(4) → core/game.ts；VS/MELEE 经 level.setupVersus/setupMelee 装载竞技场（MELEE=VS+NPC 池）
```

## 每帧主链（core/update.ts updateWorld）

```
updatePlayers → updatePowerups(先于 combat) → trySpawnEnemy → updateEnemies
→ updateCombat(碰撞矩阵 C1~C17 唯一结算点) → updateEffects → judge(四终态路由)
渲染侧（loop 每帧）：render/render.ts(地形→实体→草上层→特效→覆盖层) + hud/hud.ts
```

## 关键查找表（改 X 去哪儿）

| 要改什么 | 去哪个文件 | 锚点 |
|---------|-----------|------|
| 数值/手感（速度/时长/上限） | core/constants.ts | 全部集中，禁散落 |
| 碰撞/伤害规则 | combat/combat.ts | C 编号注释 ↔ data-model §5/§30 |
| 冰面惯性 | combat/combat.ts | translate/refreshSlide/applySlide |
| 状态机转换 | core/game.ts + core/update.ts judge | data-model §10/§20 |
| 关卡/无尽配置 | level/level.ts | LEVELS / endlessConfig / VARIANT_SLOTS |
| 道具效果 | powerup/powerup.ts | applyEffect(归拾取者) |
| 成就触发 | achievements/achievements.ts | on* 钩子（COOP 全 gate） |
| 音效配方 | audio/audio.ts | RECIPES（dispatch 可测层） |
| 存档档位 | storage/storage.ts + constants KEY_* | 五档 + muted |
| 双人键位 | input/input.ts | SOLO_P1/COOP_P1/COOP_P2 映射表（VS 复用 COOP 双键位）|
| VS/MELEE 胜负/回合 | core/update.ts judgeVersus + level.ts advanceVersusRound | 双条件胜负/best-of-3；双基地=map.versusBaseDown；judge 路由经 isPvP（VS+MELEE 共用）|
| PvP 模式判定 | core/types.ts isPvP(mode) | =VERSUS\|\|MELEE；C17 + judge 路由的单一锚 |
| VS/MELEE 友军火力 | combat/combat.ts | C17 经 isPvP 分支（playerId≠target.id 互伤）|
| VS 道具来源 | powerup/powerup.ts spawnNeutralPowerup | 中立点定时刷新（仅 VS）|
| MELEE NPC | enemy/enemy.ts trySpawnEnemy + level.ts setupMelee | enemyTotal=12 + 中立出生点 (6,1)/(6,11)；道具走 NPC 携带者掉落 |

## 跨模块事件钩子（隐式依赖，改动须同步检查）

- combat 击毁敌 → effects(爆炸/飘字) + audio(ENEMY_DOWN) + achievements(onEnemyKilled) + powerup(dropFromCarrier)
- powerup 拾取 → audio(PICKUP) + achievements(onPickup)
- judge 清关/死亡 → storage(submit*) + audio + achievements(onLevelCleared)
- loadLevel → achievements(onLevelLoaded) + 全玩家重置

## 已知技术债锚点

- `world.player` 别名 getter + 默认参兼容层（core/world.ts / player.ts / combat.ts）——R6-D 清理中
