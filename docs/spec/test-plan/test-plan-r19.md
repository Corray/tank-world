# 测试计划 R19 — 难度选择系统 Difficulty（F31）

| 字段 | 值 |
|------|----|
| 轮次 | R19（难度档位横向系统） |
| 上游 | 共识 v18 §3.31 / AC-114~117 |
| G3 产物 | 影响面 checklist（§1）+ 零修订预判（§2）+ 用例清单（§3） |

## 1. 影响面 checklist

| # | 影响点 | 处置 | 类别 |
|---|--------|------|------|
| 1 | types Difficulty enum | 新增 | 结构 |
| 2 | constants DIFFICULTY_SPEED_FACTOR/INTERVAL_FACTOR（Record<Difficulty>，穷举三档）| 新增 | 结构 |
| 3 | world.difficulty + init NORMAL | 新增 | 结构 |
| 4 | game cycleDifficulty（READY-only 循环）| 新分支 | 行为 |
| 5 | enemy trySpawnEnemy：interval×factor + 新生敌速×factor | 新分支 | 行为 |
| 6 | input KeyD → onCycleDifficulty + main 接线 | 新分支 | 行为（入口）|
| 7 | hud DIFF 显示 + render READY D 提示 | 新分支 | 视觉（冒烟验）|

## 2. 零修订预判

| 风险点 | 现状 | 冲击 |
|--------|------|------|
| 既有 trySpawn 节奏测试（spawnCooldownMs/敌速）| NORMAL=1.0 | **零冲击**（NORMAL 双维 ×1.0 = 不缩放，零回归锚）|
| createEnemy 敌速属性测试（T-ENM/boss/summoner/guardian）| createEnemy 保持纯（缩放在 trySpawn 点）| 零冲击 |

**预判：零基线修订**（NORMAL=1.0 锚 + createEnemy 纯）。实测既有变红 = 预判失效。

## 3. 用例清单（G4 骨架基线）

| 用例 | 预期 | 骨架态 |
|------|------|--------|
| T-DIF-1 | 默认 NORMAL | 先绿（结构）|
| T-DIF-2 | D 在 READY 循环 NORMAL→HARD→EASY→NORMAL | FAIL |
| T-DIF-3 | PLAYING 中 cycleDifficulty no-op（锁定）| 先绿（守护）|
| T-DIF-4 | 因子表单调 + NORMAL=1.0 | 先绿（结构守护）|
| T-DIF-5 | HARD spawnCooldownMs = interval×0.75 | FAIL |
| T-DIF-6 | HARD 敌速 = base×1.2 | FAIL |
| T-DIF-7 | NORMAL 不缩放（零回归锚）| 先绿（守护）|

## 4. 零回归硬指标

既有 308 测试全绿不许变红（NORMAL=1.0 锚）。tsc 净。difficulty.spec 3 行为转绿。
