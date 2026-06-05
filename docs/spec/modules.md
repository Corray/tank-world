# tank-world — 业务模块清单

| 版本 | 日期 | 变更摘要 |
|------|------|---------|
| v5 | 2026-06-05 | R5 增量：无新模块；core（players[] 复数化+GameMode）/input（双键位映射）/combat（C6′/C11′/C13′/C17+per-player 发射权）/player（复数入口+兼容默认参）/level/storage/hud/render 职责扩展；新增 .github/workflows CI 管道（待 R5-G1 确认） |
| v4 | 2026-06-05 | R4 增量：新增 achievements 模块；map（三新地形+变体生成）/combat（C14~C16+冰面惯性）/level/render/hud 职责扩展（R4-G1 已确认） |
| v3 | 2026-06-04 | R3 增量：新增 effects / audio 两模块；level（无尽配置）/storage（best-endless+muted）/core/input/render/hud 职责扩展（R3-G1 已确认） |
| v2 | 2026-06-04 | R2 增量：新增 level / powerup / storage 三模块；core/enemy/hud 职责扩展（R2-G1 已确认） |
| v1.1 | 2026-06-04 | G1 通过；map 补 1/4 子块粒度职责，combat 补子弹相消（AC-12） |
| v1 | 2026-06-04 | 初版（从共识文档 v1.1 拆解，待 G1 确认） |

> **定位：** 需求到架构的桥梁。每个模块可独立描述职责边界；共识文档的每个能力（F1~F6）都有模块承接。

---

## 模块清单

| 模块 | 职责边界 | 对应共识文档 | 依赖 |
|------|---------|-------------|------|
| **core**（游戏核心） | 主循环（固定时间步）、全局游戏状态机（READY / PLAYING / PAUSED / VICTORY / DEFEAT）、实体生命周期调度 | §3.5 / F5 / AC-7,11 | input, 各实体模块 |
| **map**（地图地形） | 地图数据（13×13 格，砖墙含 1/4 子块状态）、地形枚举（砖/钢/空/基地）、格子/子块查询与破坏接口 | §3.1 / F1 / AC-2,6 | — |
| **player**（玩家坦克） | 玩家实体：移动意图、射击意图、命数、重生与无敌计时 | §3.2, §3.4 / F2 / AC-1,5 | input, map, combat |
| **enemy**（敌人系统） | 出生调度器（总量/同屏/出生点轮转）+ 3 类敌人 AI（巡逻、射击决策） | §3.3 / F3 / AC-3,4 | map, combat |
| **combat**（子弹与碰撞） | 子弹实体生命周期；碰撞判定矩阵（子弹×墙/坦克/基地/边界/敌我子弹相消、坦克×坦克/墙）；伤害结算 | F4 / §3.5 / AC-1,2,5,6,12 | map |
| **hud**（界面与计分） | 得分累计、HUD 渲染（分/命/敌余量）、胜负画面、重新开始 | §3.5 / F6 / AC-7,8 | core |
| **input**（输入） | 键盘事件 → 语义指令（方向/射击/暂停/重开），双键位支持 | §3.4 / AC-1,11 | — |
| **render**（渲染） | Canvas 程序化绘制：地形、坦克、子弹、特效（爆炸/无敌闪烁）；R2 增：道具/携带者闪烁/过关与全通画面 | N5 / AC-9,14,16,17 | 各实体只读状态 |
| **level**（关卡，R2 新增） | 三关配置（布局/敌构成/出生间隔）、关卡推进状态、当前关重试与计分分层（本关/累计） | §3.7 / F8 / AC-13,14,15 | core, map |
| **powerup**（道具，R2 新增） | 携带者标记、掉落生成、拾取判定、三种效果与时限管理 | §3.8 / F9 / AC-16~19 | core, player, enemy |
| **storage**（存档，R2 新增） | localStorage 两档最高分读写与展示数据源 | §3.10 / F10 / AC-20 | core |

**R2 既有模块职责扩展**：core（状态机增 LEVEL_CLEAR / GAME_COMPLETE）、enemy（AI 威胁分层 + 携带者标记，§3.9）、hud（关卡号/最高分展示）、combat（玩家×道具拾取判定并入碰撞矩阵）。

| 模块（R3 新增） | 职责边界 | 对应共识文档 | 依赖 |
|------|---------|-------------|------|
| **effects**（特效） | 特效实体生命周期（爆炸/火花/飘字/白闪），纯视觉无碰撞，暂停冻结 | §3.11 / F11 / AC-23~25,31 | core（事件源：combat/player） |
| **audio**（音效） | 8 类事件音的程序化合成；dispatch 层（事件→配方+静音判断）与 synth 层（WebAudio）分离以便单测；M 键静音持久化 | §3.12 / F12 / AC-26,27 | input, storage |

**R3 既有模块职责扩展**：level（无尽关动态配置生成 + ENDLESS_OVER 结算）、storage（best-endless / muted 两个新 key）、core（状态机增 ENDLESS_OVER；GAME_COMPLETE 增「继续无尽」转换）、input（M 键）、render（特效绘制 + 白闪 + LEVEL n/∞）、hud（静音状态 + best-endless 展示）、combat/player（击毁/受击事件发射给 effects 与 audio）。

| 模块（R4 新增） | 职责边界 | 对应共识文档 | 依赖 |
|------|---------|-------------|------|
| **achievements**（成就） | 8 成就的触发判定、幂等解锁、持久化、toast 发射、进度查询 | §3.16 / F16 / AC-36,37 | storage, effects（TOAST）；事件源 combat/powerup/level |

**R4 既有模块职责扩展**：map（Terrain 增 BUSH/WATER/ICE + 变体确定性生成）、combat（C14 坦克×河阻挡、冰面惯性运动模型）、level（L1~L3 改版图 + 无尽变体接入 + 成就钩子）、render（草渲染在坦克上层、新地形贴图、TOAST 横幅）、hud（成就进度 n/8 + 明细）、effects（EffectKind 增 TOAST）。

## 覆盖性自检

- F1→map / F2→player / F3→enemy / F4→combat / F5→core / F6→hud ✅ 无能力悬空
- AC-1~11 每条至少 1 个模块承接（见表中 AC 列）✅
- input / render 为支撑模块，不对应业务能力，服务所有实体 ✅

## 模块间依赖图

```
input(双通道) → core(管线) → {players[], enemy, powerup, combat, level} → map
                       ↓                                    ↘ achievements / storage / audio（事件钩子）
              effects（纯视觉，无回边）
                       ↓
              render / hud（只读全量状态）
```
<!-- v1 依赖图已被上图取代（F-ARCH-4c50）；v2~v5 模块以增量表记录，图于 R6 重绘 -->
