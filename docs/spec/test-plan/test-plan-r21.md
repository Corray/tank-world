# 测试计划 R21 — 难度持久化（§3.31 amend）

| 字段 | 值 |
|------|----|
| 轮次 | R21（难度 localStorage 持久化） |
| 上游 | 共识 v20 §3.31 amend / AC-119 |

## 1. 影响面
| # | 影响点 | 处置 | 类别 |
|---|--------|------|------|
| 1 | constants KEY_DIFFICULTY | 新增 | 结构 |
| 2 | storage getDifficulty/setDifficulty（fail-silent）| 新增 | 行为（桩→impl）|
| 3 | world.createWorld difficulty = getDifficulty() | 接线 | 结构 |
| 4 | game.cycleDifficulty → setDifficulty | 接线 | 结构 |

## 2. 零修订预判
fail-silent getDifficulty 空/非法→NORMAL → 既有 createWorld().difficulty===NORMAL 零回归（实测 316 baseline 绿）。**预判零基线修订。**

## 3. 用例（G4 骨架）
| 用例 | 预期 | 骨架态 |
|------|------|--------|
| T-DPF-1 | set/get round-trip | FAIL |
| T-DPF-2 | createWorld 恢复持久难度 | FAIL |
| T-DPF-3 | cycleDifficulty 写入 | FAIL |
| T-DPF-4 | 空/非法 → NORMAL | 先绿（守护）|
| T-DPF-G1 | KEY_DIFFICULTY 定义 | 先绿 |

## 4. 零回归
既有 316 全绿（fail-silent NORMAL 锚）；tsc 净；difficulty-persist 3 行为转绿。
