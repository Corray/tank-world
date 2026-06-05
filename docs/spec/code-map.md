# tank-world — Code Map（代码拓扑索引）

| 版本 | 日期 | 变更摘要 |
|------|------|---------|
| v1 | 2026-06-05 | 初建（F-PROC-e0e8 补缺；spec-to-code-flow §6 伴生产物） |

> 维护约定：关键链路变更时更新（与实现总结同时落）。

## 入口与启动链

```
index.html → src/main.ts
  ├─ createWorld()                    core/world.ts   ← World 唯一状态源（players[] 复数）
  ├─ Keyboard.attach(window)          input/input.ts  ← 双通道映射 + blur 兜底
  └─ GameLoop.start()                 core/game.ts    ← rAF + 固定时间步 advance()
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
| 双人键位 | input/input.ts | SOLO_P1/COOP_P1/COOP_P2 映射表 |

## 跨模块事件钩子（隐式依赖，改动须同步检查）

- combat 击毁敌 → effects(爆炸/飘字) + audio(ENEMY_DOWN) + achievements(onEnemyKilled) + powerup(dropFromCarrier)
- powerup 拾取 → audio(PICKUP) + achievements(onPickup)
- judge 清关/死亡 → storage(submit*) + audio + achievements(onLevelCleared)
- loadLevel → achievements(onLevelLoaded) + 全玩家重置

## 已知技术债锚点

- `world.player` 别名 getter + 默认参兼容层（core/world.ts / player.ts / combat.ts）——R6-D 清理中
