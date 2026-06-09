# 测试计划 R9 — NPC 混战 VS（F22，强化对战）

| 字段 | 值 |
|------|----|
| 轮次 | R9（NPC 混战 VS，强化对战，独立 epic） |
| 上游 | 共识 v8 §3.22 / AC-60~67 |
| G3 产物 | 模式分叉清单 v4（本文件 §1）+ 验收映射（§2）+ 用例清单（§3） |
| 方法 | 写入点级分叉清单第四轮——首压「PvE + PvP 同时激活（三方）」；**采纳 dogfood 增量 5 判据细化**：行数=逻辑写入点数、锚决策点（非全 token） |

---

## 1. 模式分叉清单 v4（G3 产物 / AC-67 载体）

**枚举法（采纳增量 5 细化）**：锚**决策点**——`GameMode.MELEE` 引用 / `isPvP()` 调用 / MELEE 专属 setup/spawn 分支。一个逻辑写入点 = 一行（即使内部多 token 引用）。

**机器可验判据（AC-67）**：实现后 `grep -nE "MELEE|isPvP" src/`（排除注释/enum 定义）的**决策点**行数 = 本清单标 `MELEE≠` 的逻辑写入点行数。区别于 v3（VERSUS 是「一点多引用」致 grep 虚高，增量 5 已上报 #33）——v4 用决策点锚定杜绝虚高。

| # | 逻辑写入点（file:anchor） | SOLO/COOP | VERSUS | MELEE | 测试归属 |
|---|------------------------|-----------|--------|-------|---------|
| 1 | types.ts GameMode.MELEE + `isPvP(mode)` 助手 | — | isPvP=true | **isPvP=true**（新值）| T-MEL-1 |
| 2 | game.ts startMelee（类比 startVersus） | — | startVersus | **新增**：mode=MELEE + setupMelee | T-MEL-1 |
| 3 | level.ts setupMelee（新） | — | setupVersus（enemyTotal=0）| **enemyTotal>0 + NPC 中立出生 + 双基地 + 玩家位** | T-MEL-2 |
| 4 | level.ts advanceVersusRound 分发 | — | setupVersus | **mode===MELEE → setupMelee**（NPC 池重置） | T-MEL-9 |
| 5 | update.ts judge 路由 | PvE judge | `mode===VERSUS`→judgeVersus | **isPvP→judgeVersus**（双条件胜负同逻辑复用） | T-MEL-5 |
| 6 | combat.ts C17 友军火力 | 穿透 | `mode===VERSUS` 互伤 | **isPvP 互伤**（互斗同 VS） | T-MEL-7 |
| 7 | update.ts 中立道具刷新 | — | `mode===VERSUS` 刷新 | **不触发**（MELEE 走 NPC 携带者）| T-MEL-8 |
| 8 | enemy.ts trySpawnEnemy 出生点 | 顶行 SPAWN_CELLS | enemyTotal=0 不出生 | **MELEE 中立侧边点 (6,1)/(6,11)** | T-MEL-3 |
| 9 | enemy NPC 计分（combat C5 复用）| 写 world.score+killer.score | n/a（无 NPC）| **per-player NPC 分**（复用 playerId 归属）| T-MEL-6 |
| 10 | NPC 携带者掉落（combat C5 dropFromCarrier 复用）| 掉落 | n/a | **4/8/12 NPC 携带、死亡掉落**（enemyTotal>0 自然激活）| T-MEL-8 |
| 11 | input.ts onMelee + Digit4 | — | onVersus/Digit3 | **新增 onMelee/Digit4** | T-MEL-1 |
| 12 | main.ts onMelee 接线 + twoLane | twoLane=mode!==SOLO（MELEE 已覆盖，无改） | — | **onMelee=startMelee** | T-MEL-1 |
| 13 | hud.ts MELEE 分支 | coop 分支 | versus（⚔kills）| **MELEE（score 双显 + 回合行）** | T-MEL-11 |
| 14 | render.ts READY 画面 | — | +3 提示 | **+4 MELEE 提示** | （视觉，非单测）|
| 15 | judgeVersus 复用（NPC 毁基地归属） | — | 对手毁基地 | **NPC 毁基地 = 该方负**（versusBaseDown 与毁因无关，零改判） | T-MEL-5 |

**标 `MELEE≠` 的逻辑写入点**：#1~13,15 = **14 行**（#14 渲染非单测、twoLane 无改不计）。决策点 grep（`MELEE`/`isPvP`）应 ≈14（一点一锚，杜绝 v3 虚高）。

---

## 2. 验收条件 → 测试映射（AC-60~67）

| AC | 条件 | 测试用例 |
|----|------|---------|
| AC-60 | READY 按 4 进 MELEE；1/2/3 零回归 | T-MEL-1 + regression（VERSUS/COOP/SOLO 入口） |
| AC-61 | NPC 持续出生/中立点/威胁双方+双基地/ARMORED 偏好 | T-MEL-2, T-MEL-3, T-MEL-4 |
| AC-62 | 双条件胜负 + NPC 毁某基地=该方负 | T-MEL-5（对手毁 + NPC 毁两路） |
| AC-63 | NPC 击杀 per-player 计分；比分不决胜负 | T-MEL-6 |
| AC-64 | MELEE 友军火力反转；NPC 伤任一玩家；VERSUS/COOP 零回归 | T-MEL-7 + regression-versus（C17）|
| AC-65 | NPC 携带者掉落；三道具全开；炸弹清场 NPC 不伤玩家 | T-MEL-8 |
| AC-66 | best-of-3；每局重置含 NPC 池 | T-MEL-9 |
| AC-67 | 分叉清单 v4 行数=逻辑写入点数（锚决策点）| 元验收（grep 决策点）|

---

## 3. 用例清单（G4 骨架基线 — 每条=一个 FAIL 测试块）

| 用例 | 前置 | 步骤 | 预期 |
|------|------|------|------|
| T-MEL-1 | READY | 按 4 / startMelee | mode=MELEE, 2 players, PLAYING；1/2/3 入口 mode 不变（零回归）|
| T-MEL-2 | READY | startMelee | P1(12,2)/P2(0,10) 位；enemyTotal>0；NPC 出生点=中立侧边 |
| T-MEL-3 | MELEE 局 | runWorld N | enemies 从中立点出现（非顶行），数量受 concurrent 限 |
| T-MEL-4 | MELEE, NPC 子弹朝 P2 非无敌 | runCombat | P2 损命（C6′ NPC 伤玩家）|
| T-MEL-5a | MELEE | P1 子弹毁 P2 基地 | P1 胜该局（同 VS）|
| T-MEL-5b | MELEE | NPC 子弹毁 P1 基地 | P2 胜该局（NPC 毁基地=该方负，与毁因无关）|
| T-MEL-6 | MELEE, P1 子弹击杀 NPC | runCombat | P1.score+=NPC 分；P2.score 不变（per-player 归属）|
| T-MEL-7a | MELEE, P1 子弹朝 P2 | runCombat | P2 损命（友军火力反转）|
| T-MEL-7b | VERSUS（回归）, P1 子弹朝 P2 | runCombat | P2 损命（VS 友军火力不回归）|
| T-MEL-7c | COOP（回归）, P1 子弹朝 P2 | runCombat | P2 穿透不损命（零回归）|
| T-MEL-8a | MELEE | 第 4 个 NPC 出生 | 该 NPC carrier=true |
| T-MEL-8b | MELEE, 拾取炸弹, 场上有 NPC + 两玩家 | updatePowerups | 全 NPC 死、两玩家存活 |
| T-MEL-8c | MELEE 局 | advance | 不触发中立道具刷新（powerups 不自动增，仅 NPC 掉落来源）|
| T-MEL-9 | MELEE, P1 胜局 1 | judge → advanceVersusRound | VERSUS_ROUND→PLAYING；双方满命；enemyTotal>0 重置（NPC 池回满）|
| T-MEL-10 | MELEE | 打完一局快照六档 | 五档 localStorage 不写；成就不解锁 |
| T-MEL-11 | MELEE 局 | renderHud | 含 P1/P2 score 双显 + 回合比分行 |

**家族维度（三态扩四态）**：每个 §1 `MELEE≠` 点，VERSUS/COOP/SOLO 行为必有 regression 守护（不回归）；MELEE 行为有 T-MEL-* 正向用例。R8 的 19 个 versus.spec + R9 新增不许变红。

---

## 4. 零回归硬指标

MELEE 纯增量。实现后 R8 基线（210 测试，含 19 VERSUS）+ 全部既有**全绿不许变红**；新增 T-MEL-* 全绿。VERSUS 的 C17 反转/judge/中立道具、SOLO/COOP 全路径零回归。
