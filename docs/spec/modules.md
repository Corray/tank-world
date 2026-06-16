# tank-world — 业务模块清单

| 版本 | 日期 | 变更摘要 |
|------|------|---------|
| v17 | 2026-06-16 | R19 增量：无新模块；types（Difficulty enum）/core（World.difficulty + cycleDifficulty READY-only）/constants（DIFFICULTY_SPEED/INTERVAL_FACTOR 表）/enemy（trySpawnEnemy 缩放出生间隔+敌速）/input（KeyD）/hud（DIFF 显示）/render（READY D 提示）职责扩展；NORMAL=1.0 零回归锚（待 R19-G1/G2 确认） |
| v16 | 2026-06-16 | R18 增量：无新模块；core（World.comboCount/comboUntil + 初始化）/constants（COMBO_WINDOW_MS/STEP/CAP）/combat（C5 击杀连击倍率计分）/player（damagePlayer 重置连击）/level（loadLevel 重置连击）/hud（COMBO ×N 显示）职责扩展；update 头注释收尾（F-ARCH-5d32）（待 R18-G1/G2 确认） |
| v15 | 2026-06-16 | R17 增量：无新模块；constants（LEVEL_COUNT 3→5）/level（LEVELS +L4/L5 配置与布局；enterEndless/variantLayout/endlessConfig 三处硬编码债改 LEVEL_COUNT 派生）职责扩展；update/achievements/hud 经 LEVEL_COUNT 派生自动跟随（零改）；blast radius 影响面验证（待 R17-G1/G2 确认） |
| v14 | 2026-06-15 | R16 增量：无新模块；types（EnemyType.GUARDIAN + isBossType 扩三类 + ai.guardUntil? 字段）/constants（GUARDIAN HP 12/SCORE 1200 + GUARD_CYCLE/ACTIVE/RAGE_CYCLE + GUARDIAN_SPEED_FACTOR）/enemy（GUARDIAN 护盾计时 AI + 慢速）/combat（C5 扣血前 guardUntil 免疫门控）/level（bossTypeFor 三循环）/render（COLOR.enemy.GUARDIAN + 护盾环 + HP 条经 isBossType）职责扩展；judge/powerup/storage 零改（待 R16-G1/G2 确认） |
| v13 | 2026-06-12 | R15 增量：无新模块；types（EnemyType.SUMMONER + isBossType 锚）/constants（SUMMONER HP/SCORE/SUMMON_MS/RAGE + BOSS_HP 10→8）/enemy（SUMMONER 召唤 AI：周期召唤 BASIC+同屏上限+狂暴加速）/level（bossTypeFor 注入选型，loadLevel/applyWave 两处）/render（COLOR.enemy.SUMMONER + HP 条经 isBossType）职责扩展；combat/judge/powerup/storage 零改（召唤兵 fieldClear 涌现）（待 R15-G1/G2 确认） |
| v12 | 2026-06-12 | audit R14 fix 轮：覆盖性自检段扩展至 F1~F26 / AC-1~95（F-SPEC-39bc / F-ARCH-2016）；combat 依赖列修正（map → 实际六依赖 + combat↔player 运行时互依标注，F-ARCH-608f）；依赖图补 judge 路由与环标注 |
| v11 | 2026-06-11 | R13 增量：无新模块；core（GameMode.WAVE + GameState WAVE_BREAK/WAVE_OVER + world.wave/waveBreakMs + GameLoop.advance 间歇倒计时分支 + judge WAVE 分叉：波清→BREAK/死亡→OVER+档位 + restartToReady 扩 WAVE_OVER）/level（setupWave/startNextWave/waveConfig/isBossWave）/storage（第七八档 best-wave/best-coop-wave）/input（Digit5/6 入口）/hud（WAVE n + 两档 BEST）/render（BREAK/OVER overlay）/main（接线）职责扩展；enemy/combat/map/powerup/achievements 零改（待 R13-G1/G2 确认） |
| v10 | 2026-06-11 | R12 增量：无新模块；powerup（PowerupType 增 SHOVEL/FREEZE/LIFE + DROP_CYCLE 4→7 + VS 池 3→4 加铲 + applyEffect 三新分支）/map（护圈格变钢/回砖接口，仿 breakSteel）/core（shovelUntil per-base + freezeUntil 全局时钟 + loadLevel/retry/每局 setup 清零）/enemy（freezeUntil 门控：定身不移动不射击，含 Boss 与窗口内新出生）/player（lives+1）/render（三新道具图标）职责扩展；hud 命数显示零改（待 R12-G1/G2 确认） |
| v9 | 2026-06-09 | R11 增量：无新模块；enemy（EnemyType.BOSS + 阶段狂暴 AI：常态单发/狂暴三向弹幕+加速 + ENEMY_HP/SCORE 加 BOSS）/level（isBossLevel + loadLevel 注入 BOSS 到 spawnSequence 末位）/render（Boss HP 条 + COLOR.enemy 加 BOSS 穷举项）职责扩展；死亡即清场复用 fieldClear，零新胜负逻辑（待 R11-G1/G2 确认） |
| v8 | 2026-06-09 | R10 增量：无新模块；core（PlayerTank.level 字段 + 重置点矩阵：createPlayer/damagePlayer/retryLevel/setupVersus=L1，loadLevel 持久）/powerup（PowerupType.STAR + applyEffect 升级 + STAR 入掉落循环/VS 中立）/combat（firePlayerBullet level→弹速+cap、C2 L4 破钢门控）/map（breakSteel）/player（damagePlayer 死亡回 L1）/hud（LV 显示）/render（升级视觉 P1）职责扩展（待 R10-G1/G2 确认） |
| v7 | 2026-06-09 | R9 增量：无新模块；core（GameMode 增 MELEE，judge 路由 MELEE→judgeVersus 同逻辑 + isPvP 助手）/level（setupMelee：双基地+NPC 中立出生+enemyTotal>0+回合重置含 NPC 池）/enemy（MELEE 中立侧边出生点）/combat（C17 友军火力扩到 MELEE）/powerup（MELEE 走 NPC 携带者掉落，复用 §3.8）/input（按 4 进 MELEE）/hud（MELEE 比分双显）职责扩展（待 R9-G1/G2 确认） |
| v6 | 2026-06-08 | R8 增量：无新模块；core（GameMode 增 VERSUS + 回合状态/比分）/combat（C17 友军火力 VERSUS 反转 + 基地/命数归属到方）/level（VS 专用对称图 + 双基地 + best-of-3 回合 + 中立道具刷新 + enemy 不激活）/powerup（VS 中立点刷新来源，去炸弹）/input（按 3 进 VS）/render/hud（双基地/比分/VS 结算）职责扩展（待 R8-G1/G2 确认） |
| v5 | 2026-06-05 | R5 增量：无新模块；core（players[] 复数化+GameMode）/input（双键位映射）/combat（C6′/C11′/C13′/C17+per-player 发射权）/player（复数入口+兼容默认参）/level/storage/hud/render 职责扩展；新增 .github/workflows CI 管道（待 R5-G1 确认） |
| v4 | 2026-06-05 | R4 增量：新增 achievements 模块；map（三新地形+变体生成）/combat（C14~C16+冰面惯性）/level/render/hud 职责扩展（R4-G1 已确认） |
| v3 | 2026-06-04 | R3 增量：新增 effects / audio 两模块；level（无尽配置）/storage（best-endless+muted）/core/input/render/hud 职责扩展（R3-G1 已确认） |
| v2 | 2026-06-04 | R2 增量：新增 level / powerup / storage 三模块；core/enemy/hud 职责扩展（R2-G1 已确认） |
| v1.1 | 2026-06-04 | G1 通过；map 补 1/4 子块粒度职责，combat 补子弹相消（AC-12） |
| v1 | 2026-06-04 | 初版（从共识文档 v1.1 拆解，待 G1 确认） |

> **定位：** 需求到架构的桥梁。每个模块可独立描述职责边界；共识文档的每个能力（F1~F26）都有模块承接。

---

## 模块清单

| 模块 | 职责边界 | 对应共识文档 | 依赖 |
|------|---------|-------------|------|
| **core**（游戏核心） | 主循环（固定时间步）、全局游戏状态机（READY / PLAYING / PAUSED / VICTORY / DEFEAT）、实体生命周期调度 | §3.5 / F5 / AC-7,11 | input, 各实体模块 |
| **map**（地图地形） | 地图数据（13×13 格，砖墙含 1/4 子块状态）、地形枚举（砖/钢/空/基地）、格子/子块查询与破坏接口 | §3.1 / F1 / AC-2,6 | — |
| **player**（玩家坦克） | 玩家实体：移动意图、射击意图、命数、重生与无敌计时 | §3.2, §3.4 / F2 / AC-1,5 | input, map, combat |
| **enemy**（敌人系统） | 出生调度器（总量/同屏/出生点轮转）+ 3 类敌人 AI（巡逻、射击决策） | §3.3 / F3 / AC-3,4 | map, combat |
| **combat**（子弹与碰撞） | 子弹实体生命周期；碰撞判定矩阵（子弹×墙/坦克/基地/边界/敌我子弹相消、坦克×坦克/墙）；伤害结算 | F4 / §3.5 / AC-1,2,5,6,12 | map, player, powerup, effects, audio, achievements——与 player 存在运行时值导入互依（F-ARCH-608f 已知技术债，重构待 ADR） |
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

## 覆盖性自检（v12 全量，对应共识 v12 §2.1 F1~F26）

| 能力 | 承接模块 |
|------|---------|
| F1 地图 | map |
| F2 玩家坦克 | player |
| F3 敌方坦克 | enemy |
| F4 子弹与碰撞 | combat |
| F5 胜负判定 | core |
| F6 HUD 与计分 | hud |
| F7 难度平衡 | enemy（威胁分层）+ level/map（双层砖圈） |
| F8 关卡系统 | level |
| F9 道具系统 | powerup |
| F10 最高分存档 | storage |
| F11 打击感特效 | effects |
| F12 程序化音效 | audio |
| F13 无尽模式 | level + storage（best-endless）+ core（ENDLESS_OVER） |
| F14 扩展地形 | map + combat（冰面惯性 / 河阻挡） |
| F15 无尽地形变体 | map + level |
| F16 成就系统 | achievements |
| F17 本地双人合作 | core（players[]）+ input（双键位）+ combat / player |
| F18 CI 与发布 | .github/workflows（非运行时模块） |
| F19 2P 无尽 | level + storage（best-coop-endless） |
| F20 2P 成就 | achievements（团队语义） |
| F21 双人对战 VS | core（VERSUS / judgeVersus）+ combat（C17 反转）+ level（setupVersus）+ input / hud |
| F22 NPC 混战 VS | core（MELEE / isPvP 路由）+ level（setupMelee）+ enemy（中立出生）+ combat / input / hud |
| F23 坦克升级·星星 | powerup（STAR）+ combat（弹速 / cap / 破钢门控）+ player（死亡回 L1）+ map（breakSteel） |
| F24 Boss 战 | enemy（BOSS + 阶段狂暴 AI）+ level（末位注入）+ render（HP 条） |
| F25 道具补全·经典三件 | powerup（SHOVEL/FREEZE/LIFE）+ map（护圈变钢 / 回砖）+ core（双时钟）+ enemy（冻结门控）+ player（lives+1） |
| F26 波次防御 | core（WAVE 状态机 / judgeWave / advance 倒计时）+ level（waveConfig / startNextWave）+ storage（第七八档）+ input（Digit5/6）+ hud / render |

- F1~F26 ✅ 无能力悬空；AC-1~95 每条至少 1 个模块承接（AC-1~11 见模块表 AC 列；AC-12~95 的承接映射随各轮版本增量行与 test-plan INDEX 维护）✅
- input / render 为支撑模块，不对应业务能力，服务所有实体 ✅

## 模块间依赖图

```
input(双通道+模式键 2/3/4/5/6) → core(管线 + judge 路由：PvE / judgeVersus[VS·MELEE] / judgeWave[WAVE]) → {players[], enemy, powerup, combat, level} → map
                       ↓                                    ↘ achievements / storage / audio（事件钩子）
              combat ↔ player（运行时值导入互依：damagePlayer ↔ moveTank/applySlide/firePlayerBullet，F-ARCH-608f）
              effects（纯视觉，无回边）
                       ↓
              render / hud（只读全量状态）
```
<!-- v1 依赖图已被上图取代（F-ARCH-4c50）；v2~v5 模块以增量表记录，图于 R6 重绘；2026-06-12 fix 轮补 judge 路由（VS/MELEE/WAVE）与 combat↔player 环标注（F-ARCH-2016/608f） -->
