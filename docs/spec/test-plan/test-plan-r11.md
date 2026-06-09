# 测试计划 R11 — Boss 战（F24）

| 字段 | 值 |
|------|----|
| 轮次 | R11（Boss 战，PvE 高潮） |
| 上游 | 共识 v10 §3.24 / AC-76~80 |
| G3 产物 | EnemyType 扩展影响面 checklist（本文件 §1，**自我应用增量 7**）+ 验收映射（§2）+ 用例清单（§3） |
| 方法 | Boss 非模式分叉（不产分叉清单）；G3 核心 = 加 `EnemyType.BOSS` 的**穷举映射影响面**（增量 7「数据内容/穷举映射」家族的首次预防性应用）|

---

## 1. EnemyType.BOSS 扩展影响面 checklist（G3 产物 / AC-80 载体）

**增量 7 教训自查**：加一个 enum 值会击中所有**穷举 `Record<EnemyType>` / by-type 索引**。逐点列举（漏一个 → 编译错或运行时 undefined）：

| # | 影响点（file:anchor） | 处置 | 类别 |
|---|---------------------|------|------|
| 1 | types EnemyType.BOSS | 新枚举值 | 新增 |
| 2 | constants ENEMY_HP（:44 `as const`）| 加 `BOSS: 10` | **穷举映射**（漏=createEnemy `ENEMY_HP[type]` 编译错）|
| 3 | constants ENEMY_SCORE（:46）| 加 `BOSS: 1000` | **穷举映射** |
| 4 | render COLOR.enemy（:19）| 加 `BOSS: <色>` | **穷举映射**（漏=`COLOR.enemy[type]` 编译错）|
| 5 | enemy createEnemy speed（:36）| BOSS 用默认 ENEMY_SPEED（仅 FAST 特判，无需改）| 复用 |
| 6 | enemy createEnemy hp/score（:39/40）| 自动读 ENEMY_HP/SCORE（映射更新后即对）| 复用 |
| 7 | level isBossLevel + loadLevel 注入 | BOSS append spawnSequence 末位 + enemyTotal+1 | 新分支 |
| 8 | enemy updateEnemies Boss AI | 常态单发 / 狂暴（hp≤BOSS_HP/2）三向+加速 | 新分支 |
| 9 | render Boss HP 条 | 存活 boss 头顶 hp/BOSS_HP | 新分支（视觉，browser 验）|
| 10 | combat C5 多 HP 命中 | 复用（ARMORED hp=3 同机制）| 复用 |
| 11 | judge fieldClear 过关 | 复用（boss 末位死即清场）| 复用 |

**判据（AC-80）**：穷举映射 3 处（#2/3/4）全补 = tsc 通过（编译即验）；既有 BASIC/FAST/ARMORED 的 hp/score/render 零回归（T-BOSS-7）。

---

## 2. 验收条件 → 测试映射（AC-76~80）

| AC | 条件 | 测试 |
|----|------|------|
| AC-76 | BOSS 在 L3 + 无尽每 5 关出现作末位敌人；仅 PvE | T-BOSS-1, T-BOSS-2, T-BOSS-6 |
| AC-77 | 多 HP 多次命中 + 高分 + HP 条 | T-BOSS-3（属性）, T-BOSS-5（多 HP+分）, HP 条 browser |
| AC-78 | 阶段狂暴 HP≤50% 三向+加速；>50% 单发 | T-BOSS-4 |
| AC-79 | Boss 死亡=fieldClear 过关 + BOSS_SCORE | T-BOSS-5 |
| AC-80 | 穷举映射全补 + 既有敌人零回归 | tsc + T-BOSS-7 |

---

## 3. 用例清单（G4 骨架基线 — 每条=一个 FAIL 测试块）

| 用例 | 前置 | 步骤 | 预期 |
|------|------|------|------|
| T-BOSS-1 | — | isBossLevel(3/8/13)=T；(1/2/4/5/6/7)=F | 战役终点 + 无尽每 5 关 |
| T-BOSS-2 | — | loadLevel(world,3) | spawnSequence 末位=BOSS；enemyTotal=baseL3+1 |
| T-BOSS-3 | createEnemy(BOSS) | — | hp=BOSS_HP、score=BOSS_SCORE |
| T-BOSS-4a | boss hp≤BOSS_HP/2，fireMs≤0 | updateEnemies | 一帧生成 3 发（三向弹幕）|
| T-BOSS-4b | boss hp>BOSS_HP/2，fireMs≤0 | updateEnemies | 一帧生成 1 发（常态单发）|
| T-BOSS-5 | boss 为唯一敌（spawnedCount=enemyTotal），玩家击杀 | runCombat + judge | world.score+=BOSS_SCORE；state→LEVEL_CLEAR/过关 |
| T-BOSS-6 | VS / MELEE 局 | startVersus/startMelee | enemies 无 BOSS（VS enemyTotal=0 / MELEE spawnSequence 无 boss）|
| T-BOSS-7 | — | createEnemy(BASIC/FAST/ARMORED) | hp/score 同既有（1/1/3，100/200/400）零回归 |

---

## 4. 零回归硬指标

R11 加 EnemyType 是横向增量。实现后既有 241 测试**全绿不许变红**。重点回归：ENEMY_HP/SCORE/render 穷举映射只**新增** BOSS 项不改既有（T-BOSS-7 + tsc）；既有敌人 AI / 出生调度 / fieldClear 过关行为不变；VS/MELEE 无 boss（仅 PvE loadLevel 注入）。
