# 测试计划 R20 — 无尽曲线接续修正（F13 amend）

| 字段 | 值 |
|------|----|
| 轮次 | R20（调参/清债：无尽难度接续 + endlessConfig 派生） |
| 上游 | 共识 v19 §3.13 amend / AC-118 |
| 类型 | 修复轮（修 R17 回落 + 去魔法值）；测试 = 基线修订（endless 值）+ 1 新不变量 |

## 1. 影响面

| # | 影响点 | 处置 |
|---|--------|------|
| 1 | level.endlessConfig total 基数 `18` → 派生 LEVELS 末关总数（26） | 改（去硬编码） |
| 2 | level.endlessConfig interval 基数 `2000` → 派生 LEVELS 末关 spawnIntervalMs（1600） | 改（去硬编码） |
| 3 | 斜率（ENDLESS_TOTAL_STEP / INTERVAL_STEP / ARMOR_*）| 不变 |

## 2. 基线冲击预判

| 测试 | 旧 | 新 |
|------|----|----|
| endless.spec T-EN-1 [6/9/13/25] | 20/26/34/58 @ 1900/1600/MIN/MIN | 28/34/42/66 @ 1500/1200/MIN/MIN |
| coop-endless T-CE-1 enemyTotal | 20 | 28 |
| endless.spec armored ratio（>1/3、≈0.5）| — | 零冲击（断比例界非精确总数）|
| 新增 T-EN-9 无回落不变量 | — | endlessConfig(L_C+1).total ≥ 末关；interval ≤ 末关 |

**预判：endless 值测试修正性 churn（T-EN-1 ×4 + T-CE-1）+ 1 新不变量；其余零回归。**

## 3. 零回归硬指标

既有 315 测试除 §2 修正性 churn 外全绿。tsc 净。无回落不变量（T-EN-9）转绿。
