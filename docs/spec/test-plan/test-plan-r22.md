# 测试计划 R22 — 拆 combat↔player 循环依赖（重构轮）

| 字段 | 值 |
|------|----|
| 轮次 | R22（依赖治理重构，清 F-ARCH-608f / ADR-004） |
| 上游 | 共识 v21 §AC-120 |
| 类型 | 纯重构（行为零变更）；交付物 = 依赖无环不变量 + 既有测试全绿 |

## 1. 影响面
| # | 影响点 | 处置 |
|---|--------|------|
| 1 | damagePlayer 从 player.ts 移到 combat.ts（函数体逐字不变）| 重构 |
| 2 | combat: 删 import player；增 INVINCIBLE_MS/flashPlayer/Direction(值)/EXPLOSION_COLOR_PLAYER | 重构 |
| 3 | player: 删孤立 import（Direction/INVINCIBLE_MS/effects/audio/EXPLOSION_COLOR_PLAYER 常量）| 重构 |
| 4 | 8 importers（update.ts + combo/powerup/terrain/upgrade/player/effects/coop.spec）re-point damagePlayer player→combat | 机械 churn |

## 2. 不变量 + 零回归
- **T-ARCH-1**（新）：combat.ts 不含 `from '../player'`（循环拆除，FAIL→PASS）；player.ts 仍 import combat（单向边保留，先绿守护）
- **行为零变更**：damagePlayer 体不变 → 既有 321 测试全绿即证

## 3. 用例
| 用例 | 预期 | 骨架态 |
|------|------|--------|
| T-ARCH-1a | combat 无 player import | FAIL（重构后 PASS）|
| T-ARCH-1b | player 仍依赖 combat | 先绿（守护）|
| 既有 321 | 全绿（行为零变更）| 既绿 |

## 4. 零回归硬指标
321 测试全绿 + T-ARCH-1a 转绿 + tsc 净 + 依赖无环。
