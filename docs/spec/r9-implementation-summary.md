# R9 实现总结（L2）

**日期：** 2026-06-09 / **分支：** feature/r9-melee-mode / **关联：** PRD R9、共识 v8 §3.22、AC-60~67、test-plan-r9（分叉清单 v4）

## 背景与做了什么

NPC 混战 VS（强化对战）——**首个 PvE + PvP 同场**模式。R8 VERSUS 叠 NPC 第三方 hazard：双玩家互斗 + NPC 持续出生（威胁双方+双基地）。胜负完全沿用 R8 双条件（毁对方基地或清对方命数），NPC 毁基地=该方负。高复用、低重构面。

## 关键决策与思考

1. **judgeVersus 零新增、完全复用**：MELEE 胜负逻辑与 VS **完全相同**（双基地双条件 best-of-3）。judge 路由 `mode===VERSUS` 抽象为 `isPvP(mode)`（=VERSUS\|\|MELEE），judgeVersus 一行不改即服务两模式。**关键洞察**：`versusBaseDown(side)` 判「基地塌没塌」与毁因无关 → NPC 毁基地天然走同一判定（AC-62），浏览器冒烟活体抓到 NPC 破 P1 基地→P2 胜该局。
2. **isPvP 助手消化决策点**：C17 友军火力 + judge 路由两处 `mode===VERSUS` 抽象为 `isPvP()` 单一锚——既扩到 MELEE，又呼应 dogfood 增量 5「锚决策点」。
3. **setupMelee 复用 setupVersus**：`setupMelee = setupVersus + 覆盖 NPC 三字段`（enemyTotal/spawnSequence/spawnInterval）——DRY，竞技场/双基地/玩家位全复用。
4. **NPC 中立出生点**：顶行 SPAWN_CELLS 是 P2 侧+基地格，不可用；trySpawnEnemy 加 mode 分支用 MELEE_SPAWN_CELLS (6,1)/(6,11)（VS 竞技场空地、等距双基地）。G3 前自查发现初稿 (6,0)/(6,12) 是钢角，已修正。
5. **道具/炸弹零改**：NPC 携带者掉落（dropFromCarrier）随 enemyTotal>0 自然激活；炸弹清场 NPC（既有 `for e of enemies`）天然适配双玩家场——不伤玩家、清场=否定对手 NPC 分。

## 分叉清单 v4 方法实证（AC-67）+ 判据再细化

- 15 写入点、14 行 MELEE≠（test-plan-r9 §1）。**采纳 dogfood 增量 5「锚决策点」**：决策点 grep（`isPvP`/`mode===MELEE`）= **7**，杜绝 v3（VERSUS）的 raw-token 虚高（66）。
- **新发现（判据再细化，补给 #33）**：14 行 MELEE≠ 实分两子类——**「新分支」7 行**（有 grep 决策 token：C17/judge/startMelee/hud/enemy 出生/level 分发/isPvP 定义）vs **「复用/涌现」7 行**（NPC 计分走 C5、携带掉落涌现、twoLane 被 `!==SOLO` 覆盖——**无新 token**）。即「行数=逻辑写入点数」judge 应分两档机器核验：新分支档 grep 决策点 1:1；复用档以「复用既有路径」声明（非 grep）。这是增量 5「锚决策点」的下一层细化。

## 影响范围

7 文件：types（GameMode.MELEE + isPvP 助手）、constants（MELEE 常量）、game（startMelee）、level（setupMelee + advanceVersusRound 分发）、enemy（trySpawnEnemy mode 分支出生点）、update（judge 路由 isPvP）、combat（C17 isPvP）、hud（MELEE 分支）、input（onMelee/Digit4）、main（接线）、render（READY 提示）。judgeVersus **零改**（纯复用）。

## 验收实证

- **机器可验**：225/225（210 R8/既有零回归 + 15 MELEE），tsc 干净，单文件 31.77KB。
- **浏览器冒烟**：按 4 → mode=MELEE/双基地/enemyTotal=12/NPC 中立出生并漫游/MELEE HUD（VS P1 0:1 P2 MELEE + 双 score）；**活体抓到 NPC 毁 P1 基地→P2 胜该局**（AC-62 机制自然演示）。

## 已知残留

- **平衡观察**：浏览器实测 NPC ~5s 即破基地（护圈对 NPC 持续火力偏薄）——属人工体验/手感项，按 §1 定位裁定不在验收范围；若将来转产品需评估护圈加厚或 NPC 出生远离基地。
- best-of-3 同帧双基地皆毁的极低概率边界沿用 R8「P1 优先」简化。
