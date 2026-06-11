# Audit Report — data-model phase（第二轮）

**日期：** 2026-06-11
**范围：** docs/spec/data-model.md（v5，504 行）↔ src/core/constants.ts + src/core/types.ts + src/core/world.ts + src/storage/storage.ts + src/combat/combat.ts（抽查）
**上轮：** 2026-06-05（F-DM-20260605-6bc0：v1 五处被取代无标注，已修，标注 ①~⑤ 在档）
**铁律遵守：** 只记录不修，本轮零代码/文档改动。

---

## 总览

| 严重度 | 计数 |
|--------|------|
| HIGH | 1 |
| MEDIUM | 2 |
| LOW | 4 |

**核心结论：** data-model.md 停更于 R7（§38 / R7 实现切片），R8~R13 共 **6 轮增量完全缺失**——上轮预判的"停更概率高"成真。契约层 SSoT 自 R8 起失效，约 30 个常量、3 个 GameMode 值、4 个 GameState 值、5 个 PowerupType 值、EnemyType.BOSS、World 7 字段、2 个存档档位无 spec 对应。

---

## F-DM-20260611-36e1 — data-model 停更于 R7：R8~R13 六轮增量全缺失 【HIGH / 反向缺口】

**位置：** docs/spec/data-model.md 全文（末节为 §38 R7 实现切片）；缺失内容对应 src/core/constants.ts:117-198、types.ts、world.ts:64-79、storage.ts:95-112。

**证据（逐 R 轮缺口清单）：**

| 轮次 | 缺失常量（constants.ts） | 缺失枚举/类型（types.ts） | 缺失 World/存档 |
|------|------------------------|--------------------------|----------------|
| **R8 VS** | `VS_WINS_NEEDED`(2) / `VS_POWERUP_INTERVAL_MS`(12000) / `VS_SPAWN_P1`(12,2) / `VS_SPAWN_P2`(0,10) / `VS_POWERUP_CELLS`×2 | `GameMode.VERSUS` / `GameState.VERSUS_ROUND` / `VERSUS_OVER` / `PlayerTank.kills` | `versusWins` / `versusRoundWinner` / `versusMatchWinner` / `versusPowerupCooldownMs`（world.ts:65-71） |
| **R9 MELEE** | `MELEE_NPC_TOTAL`(12) / `MELEE_SPAWN_INTERVAL_MS`(2500) / `MELEE_NPC_COUNTS`(5/4/3) / `MELEE_SPAWN_CELLS`×2 | `GameMode.MELEE` / `isPvP()` 函数（types.ts:106-108，碰撞家族分叉的 SSoT 级谓词） | — |
| **R10 升级** | `MAX_TANK_LEVEL`(4) / `PLAYER_BULLET_FAST_SPEED`(×1.5) | `PowerupType.STAR` / `PlayerTank.level`(1..4) / `Bullet.breaksSteel` | — |
| **R11 Boss** | `BOSS_HP`(10) / `BOSS_SCORE`(1000) / `BOSS_FIRE_MS`(1000) / `BOSS_FIRE_RAGE_MS`(500) / `BOSS_ENDLESS_EVERY`(5)；`ENEMY_HP.BOSS` / `ENEMY_SCORE.BOSS` 表项 | `EnemyType.BOSS` | — |
| **R12 道具三件** | `SHOVEL_MS`(15000) / `FREEZE_MS`(8000) / `BASE_RING`(双侧 5 格×2) | `PowerupType.SHOVEL` / `FREEZE` / `LIFE` | `freezeUntil` / `shovelUntil`（world.ts:73-75） |
| **R13 波次** | `WAVE_BREAK_MS`(5000) / `WAVE_TOTAL_BASE`(8) / `WAVE_TOTAL_STEP`(2) / `WAVE_ARMOR_BASE`(0.15) / `WAVE_ARMOR_STEP`(0.03) / `WAVE_ARMOR_CAP`(0.5) / `WAVE_INTERVAL_BASE_MS`(2000) / `WAVE_INTERVAL_STEP_MS`(100) / `WAVE_INTERVAL_MIN_MS`(800) / `WAVE_BOSS_EVERY`(5) | `GameMode.WAVE` / `GameState.WAVE_BREAK` / `WAVE_OVER` | `wave` / `waveBreakMs`（world.ts:77-79）；`KEY_BEST_WAVE` / `KEY_BEST_COOP_WAVE`（第七/八档） |

**佐证（代码侧悬空引用）：** constants.ts:124 注释 `(data-model §VS)` 指向不存在的章节；storage.ts:95 注释写 `data-model: consensus §3.26`——作者已知 data-model 无对应节而直接挂 consensus，停更被实现层默认接受。

**影响：** 碰撞矩阵（PvP 友军火力反转）、状态机（4 新值）、模式分叉清单（§31/§35 止于 SOLO/COOP 二分，现已 5 模式）、存档档位等"测试计划直接从此表推导"的 SSoT 章节全部落后实现 6 轮。

**建议：** 补 R8~R13 六节增量（仿 R2~R7 增量体例：常量表 + 枚举/字段 + 碰撞矩阵增量 + 状态机增量 + 分叉清单 v3 + 档位表），并把 §35 分叉清单升级为含 VERSUS/MELEE/WAVE 的 v3。

---

## F-DM-20260611-da4f — GameState 11 值中 4 值无状态机文档 【MEDIUM / 状态机完整性】

**位置：** data-model §4（v1，已标史迹）/ §10（R2）/ §20（R3）；types.ts:3-22。

**证据：** 代码 GameState 共 11 值；data-model 状态机图累计覆盖 7 值（READY/PLAYING/PAUSED/LEVEL_CLEAR/GAME_COMPLETE/DEFEAT/ENDLESS_OVER）。以下转换无任何 spec 表述：
- `VERSUS_ROUND`（回合间歇：进入条件/按键续局/与 VERSUS_OVER 的 best-of-3 边界）
- `VERSUS_OVER`（达 `VS_WINS_NEEDED` 后的终局与 R 重开语义）
- `WAVE_BREAK`（自动倒计时 `WAVE_BREAK_MS` + 按键跳过——world.waveBreakMs 注明走 advance 层非 clock，这一非常规设计更需要 spec 锁定）
- `WAVE_OVER`（结算 + R 重开）

「合法转换仅以上 N 条；任何其他转换 = 非法」的家族断言（§4 尾注）自 R3 后未再延续，非法转换家族（T-SM-6 延续线）对 4 新状态无推导依据。

**建议：** 在 R8/R13 增量节内补状态机扩展图（替换 §20 体例），并显式列非法转换家族边界。

---

## F-DM-20260611-3bd0 — 被取代无标注家族复发：3 处（R6 F-DM-6bc0 同款） 【MEDIUM / 标注缺失】

**取代标注分层呈现（检查项 7）：**
- **一级 grep（`取代` 关键字）：5 命中**（§1 SPAWN_INTERVAL_MS / §2 GameState / §4 状态机 / §6 出生序列 / §7 玩家出生点）——全部为上轮 F-DM-6bc0 ①~⑤ 的存量标注，**本轮零新增标注**。
- **二级语义比对：发现 3 处新被取代且无标注：**

| # | 位置 | spec 现文 | 实际取代者 | 代码证据 |
|---|------|----------|-----------|---------|
| a | §29 | "`world.player` 保留为 players[0] 的只读别名 getter" | R6-D 已移除别名 | world.ts:28-29 注释 "R6-D: legacy `player` alias removed — explicit players[] access only" |
| b | §30 C17 | "玩家子弹 × 玩家坦克**互相穿透**"（无条件） | R8/R9 在 PvP 模式反转：命中对方玩家结算伤害 + kills | combat.ts:242-258（`isPvP(world.mode)` 分支）；types.ts:105-108 |
| c | §31 | 模式分叉清单（含"成就钩子全部 gate 掉""无尽 COOP 无入口"） | §35 分叉清单 v2 已整体取代（且 §35 自身又被 R8~R13 三新模式落后） | §35 标 "v2" 但 §31 处无前向指针标注 |

**影响：** 与上轮同根因——增量节取代早期节后不回写标注，读者按早期节实现会做出与代码相反的行为（C17 尤甚：PvP 下穿透 vs 伤害是对局规则级差异）。

**建议：** 三处补 `<!-- 已被 X 取代 -->` 标注（沿用 F-DM-6bc0 标注格式，编号续 ⑥⑦⑧）。

---

## F-DM-20260611-4241 — 版本表停更：R7 增量在文但无 v6 条目，v5 仍标"待确认" 【LOW / 文档卫生】

**位置：** data-model.md:3-9 版本表。

**证据：** 版本表最高 v5（2026-06-05，R5 增量，且备注仍为"待 R5-G3 确认"未回写确认结论）；但文内已存在 R7 增量（§35~38，对应共识 v6）。R7 写入时未加版本行，R8~R13 停更后版本表彻底失真。

**建议：** 回写 v5 确认状态；补 v6（R7）行；后续 R8~R13 补录时一并补版本行。

---

## F-DM-20260611-64a0 — v1 字段命名漂移残留（上轮未覆盖） 【LOW / 正向偏差】

**位置：** data-model §3 实体模型表。

**证据：**
- `EnemyTank.aiState {moveTimer, fireTimer}` vs 代码 `ai: { turnMs, fireMs }`（types.ts:151）
- `World` 行列 `spawnTimer` / `spawnPointCursor` vs 代码 `spawnCooldownMs` / `spawnCursor`（world.ts:47-48）

值语义一致，仅命名漂移；属 v1 史迹但 §3 未像 §4 那样标注史迹状态，亦未更新命名。

**建议：** §3 表更新字段名，或加史迹标注指向 types.ts/world.ts 为命名权威。

---

## F-DM-20260611-be71 — §1 常量表反向缺口：BULLET_SIZE / ENEMY_TURN_INTERVAL_MS 未入表 【LOW / 反向缺口】

**位置：** data-model §1 常量表；constants.ts:24、49。

**证据：** 上轮补录了 `ENEMY_SPEED`（F-DM-6bc0 反向项），但同为 v1/R2 期常量的 `BULLET_SIZE`(8px，碰撞判定参与量，combat.ts:275 用于 bulletHitsTank) 与 `ENEMY_TURN_INTERVAL_MS`(1500，§13 仅文字提及"turn 计时"无数值) 仍不在任何常量表。

**建议：** 补入 §1（BULLET_SIZE）与 §13（ENEMY_TURN_INTERVAL_MS）。

---

## F-DM-20260611-6226 — 存档档位无统一清单：八档散落五节 + R13 两档缺失 【LOW / 结构性】

**位置：** data-model §14 / §21 / §26 / §31 / §36；storage.ts:3-12。

**证据：** 实现侧 localStorage key 共 10 个：best-total / best-level（§14）、best-endless / muted（§21）、achievements / kills（§26）、best-coop（§31 仅分叉表内提及）、best-coop-endless（§36"第六档"）、**best-wave / best-coop-wave（R13 第七/八档，spec 零对应**——缺失本体计入 F-…-36e1，此处记结构问题）。档位语义（何时写/比较规则/互不污染断言）无 consolidated 表，"第六档/七档/八档"的序数只存在于代码注释。

**建议：** 增设"存档档位总表"一节（key / 写入时机 / 比较语义 / 所属模式），R13 补录时一并落。

---

## 正向核对结果（通过项，无发现）

- §1 常量表 13 项全部值一致（SPAWN_INTERVAL_MS 已有取代标注，代码 3000 = per-level L1 值，注释自洽）[已验证]
- R2~R7 常量 24 项（LEVEL_COUNT/CARRIER_POSITIONS/SHIELD_MS/PLAYER_BULLETS_*/AI_BIAS_PROBABILITY/4 存档 key/特效 5 时长/无尽 6 参数/ICE_*/TOAST_MS/VARIANT_*/KEY_BEST_COOP/KEY_BEST_COOP_ENDLESS）全部与 spec 值一致 [已验证]
- 碰撞矩阵抽查：C5 多 HP（hp−1 → 0 时毁灭+计分，combat.ts:225-239，BOSS 10HP 走同路径）对齐；C6′/C9/C13/C14~C16 结构对齐；C17 见 F-…-3bd0b
- §19 endlessConfig 公式：level.ts:383 `total = 18 + ENDLESS_TOTAL_STEP * k` 与 spec 一致（注：基数 18 为行内字面量，无 ENDLESS_TOTAL_BASE 常量——N4 边缘，未单列发现）
- §36 per-player levelStartLives 快照、world.levelStartLives 保留：与 types.ts:139 / world.ts:63 一致

---

## 系统性建议

1. **根因是"增量节随轮次写、回写纪律无门禁"**：R2~R7 每轮都补了 data-model 增量节，R8 起断档——恰与 R8 引入第三模式（VERSUS）的复杂度跃升同步。建议把"data-model 增量节落档"列为每轮 G3 的硬性 checklist 项（无增量节不过 G3），而非依赖事后 audit 兜底。
2. **被取代标注两轮复发同族**（上轮 5 处、本轮 3 处）：建议固化机制——任何增量节取代早期段落时，同 commit 内回写 `<!-- 已被 §X 取代 -->`；audit 侧把"一级 grep 计数 + 二级语义比对"作为本 phase 常驻检查项（本轮已执行，见 F-…-3bd0）。
3. **分叉清单（§35 体例）是好资产但需要版本化节奏**：§31→§35 的 v1→v2 升级证明该体例有效；5 模式时代建议直接以 `isPvP` 谓词 + 模式 × 行为矩阵重构为 v3，避免逐对枚举爆炸。
4. **悬空引用是停更的早期信号**：constants.ts "(data-model §VS)" 这类指向不存在章节的注释，可作为后续 audit 的低成本前哨 grep 模式。
