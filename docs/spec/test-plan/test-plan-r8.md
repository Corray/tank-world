# 测试计划 R8 — 双人对战 VS（F21）

| 字段 | 值 |
|------|----|
| 轮次 | R8（双人对战 VS，独立 epic） |
| 上游 | 共识 v7 §3.21 / AC-52~59 |
| G3 产物 | 模式分叉清单 v3（本文件 §1）+ 验收映射（§2）+ 用例清单（§3） |
| 方法 | R7「写入点级分叉清单」第三轮——首次含**对抗阵营（VERSUS）**维度，前两轮 SOLO/COOP 同为 PvE |

---

## 1. 模式分叉清单 v3（G3 产物 / AC-59 载体）

**枚举法**：grep `GameMode\.`/`mode ===`/`world\.mode` 全命中（src，排除 types.ts）+ VERSUS 激活的全部新写入点（C17 友军火力 / 双基地归属 / 命数归属 / 敌人禁用 / 道具中立刷新 / 新状态）。每行标 SOLO / COOP / VERSUS 三态行为与测试归属。

**机器可验判据（AC-59）**：实现后 `grep -rn "VERSUS\|judgeVersus\|versus" src/` 命中行数 = 本清单标 `VERSUS≠` 的写入点行数（±0）；杜绝语义级抽象行。

| # | 写入点（file:anchor） | SOLO | COOP | VERSUS | 测试归属 |
|---|----------------------|------|------|--------|---------|
| 1 | main.ts:25 mode flag | solo 输入 | coop 双键位 | **versus 双键位**（P1 WASD+J / P2 方向+Enter，复用 coop 键映射） | T-VS-1 |
| 2 | game.ts `startVersus`（新增，类比 startCoop） | — | push P2 / mode=COOP | **新增**：push P2 / mode=VERSUS / 装载 VS 图（双基地） | T-VS-2 |
| 3 | world.ts:96 mode 初始 | SOLO 默认 | — | — | 回归 |
| 4 | update.ts:28 trySpawnEnemy | 出生 | 出生 | **VS enemyTotal=0 → 不出生**（已有 spawnedCount≥total 守卫，零分支兜底） | T-VS-3 |
| 5 | update.ts judge() | PvE 判定 | PvE 判定 | **judgeVersus 分叉**（在 clear 检查前；否则 0 敌人=立即 LEVEL_CLEAR 误触） | T-VS-4 |
| 6 | update.ts:53 submitCoopEndless | endless | coop endless | **不写**（VS 无无尽） | 回归 |
| 7 | update.ts:69 submitLevelScore | 写 best-level | skip | **不写** | T-VS-5 |
| 8 | update.ts:74 submitCoop | — | 写 best-coop | **不写** | T-VS-5 |
| 9 | combat.ts:223 C17 友军火力 | 穿透 | 穿透 | **反转**：`playerId≠target.id` → 命中互伤；`=` → 穿透自身 | T-VS-6 |
| 10 | combat.ts:189 destroyBase (C3) | 单基地→DEFEAT | 单基地→DEFEAT | **双基地**：按位置归属到防守方 → 对方胜该局 | T-VS-7 |
| 11 | map 基地建模（baseDestroyed 单布尔） | 单基地 | 单基地 | **per-side 双基地销毁追踪**（按行判 P1 底/P2 顶） | T-VS-7 |
| 12 | judge 命数归属（update.ts:48 allPlayersDead） | 全员命尽→DEFEAT | 同 | **某一方命尽 → 对方胜该局**（不是全员） | T-VS-8 |
| 13 | powerup dropFromCarrier | 携带者掉落 | 携带者掉落 | **无携带者**；改中立点定时刷新 `spawnNeutralPowerup` | T-VS-9 |
| 14 | powerup DROP_CYCLE（含 BOMB） | 护盾/双发/炸弹 | 同 | **VS 排除 BOMB**（护盾/双发交替） | T-VS-9 |
| 15 | hud.ts:26 coop flag | 单人 HUD | coop HUD | **VS HUD**：P1/P2 命数+击杀 + 回合比分 X:Y | T-VS-10 |
| 16 | render 基地/结算 | 单基地 | 单基地 | **双基地绘制 + VS 结算画面**（胜者/比分） | T-VS-11 |
| 17 | achievements 钩子（onLevelCleared 等） | 触发 | 团队触发 | **VS 不触发**（judgeVersus 不调钩子；无敌人=onEnemyKilled 不触发） | T-VS-12 |
| 18 | 新状态 VERSUS_ROUND / VERSUS_OVER | — | — | **回合间场 + 总结算**（best-of-3，先胜 2 局） | T-VS-13 |

**标 `VERSUS≠`（行为与 SOLO/COOP 不同）的写入点**：#1,2,4,5,7,8,9,10,11,12,13,14,15,16,17,18 = **16 行**（#3 mode 初始、#6 endless 为零回归/不适用，不计 VERSUS 分支）。

---

## 2. 验收条件 → 测试映射（AC-52~59）

| AC | 条件 | 测试用例 |
|----|------|---------|
| AC-52 | READY 按 3 进 VERSUS；1/2 零回归 | T-VS-1, T-VS-2 + regression（SOLO/COOP 入口不变） |
| AC-53 | 友军火力反转三态（互伤/自穿/无敌免伤）；SOLO/COOP 零回归 | T-VS-6（三态）+ regression-coop（C17 穿透不变） |
| AC-54 | 双条件胜负：毁基地或清命数→对方负，先达者胜局 | T-VS-7（基地）, T-VS-8（命数） |
| AC-55 | 纯 PvP 无 NPC；双基地对称带护圈 | T-VS-3, T-VS-7 |
| AC-56 | best-of-3：先胜 2 局；间场比分；每局满命/地图/道具重置 | T-VS-13 |
| AC-57 | VS 结算显示胜者+战绩+比分；VS 不写存档（六档零污染） | T-VS-11, T-VS-5（六档快照前后相等） |
| AC-58 | VS 道具：护盾/双发个人化、无炸弹、中立刷新 | T-VS-9 |
| AC-59 | 分叉清单 v3 行数 = grep 命中数 | 元验收（CI/手验 grep VERSUS） |

---

## 3. 用例清单（G4 骨架基线 — 每条 = 一个 FAIL 测试块）

| 用例 | 前置 | 步骤 | 预期 |
|------|------|------|------|
| T-VS-1 | READY | 按 3 | mode=VERSUS, state=PLAYING, players.length=2 |
| T-VS-2 | READY | startVersus | P2 在顶部出生点；VS 图双基地就位 |
| T-VS-3 | VS 局 | advance N 帧 | enemies 恒为空，trySpawnEnemy 不产敌 |
| T-VS-4 | VS 局, 0 敌人 | judge | **不**进 LEVEL_CLEAR（PvE clear 路径被 VERSUS 屏蔽） |
| T-VS-5 | VS 局 | 快照六档 → 打完一局 → 比对 | 六档 localStorage 值前后完全相等 |
| T-VS-6a | VS, P1 子弹朝 P2 | P2 非无敌 | P2 损 1 命（互伤） |
| T-VS-6b | VS, P1 子弹朝 P1 自身 | — | 穿透，P1 不掉命 |
| T-VS-6c | VS, P2 无敌期, P1 子弹命中 | — | P2 不掉命（无敌对对手生效） |
| T-VS-6d | COOP, P1 子弹朝 P2 | — | 穿透不互伤（零回归） |
| T-VS-7 | VS | P1 子弹毁 P2 基地 | P1 胜该局（roundWins[1]++） |
| T-VS-8 | VS, P2 剩 1 命 | P1 子弹击杀 P2 | P1 胜该局 |
| T-VS-9a | VS 局 | advance ~12s | 中立点出现护盾/双发（非炸弹） |
| T-VS-9b | VS | P1 拾取双发 | 仅 P1 doubleFire（个人化） |
| T-VS-10 | VS 局 | 渲染 HUD | 含 P1/P2 命数+击杀 + 比分 X:Y |
| T-VS-11 | VS, 某方先胜 2 局 | — | VERSUS_OVER，结算含胜者+比分 |
| T-VS-12 | VS 局 | 任意击杀 | 无成就解锁（achievements 状态不变） |
| T-VS-13a | VS, P1 胜第 1 局 | — | VERSUS_ROUND 间场，比分 1:0 |
| T-VS-13b | VERSUS_ROUND | 进下一局 | 双方满命/地图重置/道具清空 |

**家族维度（三态枚举，杜绝写入点遗漏）**：每个 §1 标 `VERSUS≠` 的写入点，其 SOLO/COOP 行为必有对应 regression 守护（不回归）；VERSUS 行为必有对应 T-VS-* 正向用例。

---

## 4. 零回归硬指标

VERSUS 是纯增量。实现后现有 191 测试**全绿不许变红**；新增 T-VS-* 全绿。SOLO/COOP 的 C17 穿透、单基地判定、存档写入路径行为不变。
