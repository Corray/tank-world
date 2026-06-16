# R20 实现总结（L2）

**日期：** 2026-06-16 / **分支：** feature/r20-endless-curve / **关联：** PRD R20、共识 v19 §3.13 amend、AC-118、test-plan-r20

## 背景与做了什么

调参/清债轮：修 R17 引入的无尽难度回落 + 消除 endlessConfig 硬编码魔法值（18/2000）。endless 难度基数改为**派生 LEVELS 末关**——无尽接续战役峰值并递增，不再倒挂。

## 关键决策与思考

1. **回归根因**：R17 战役 3→5 后，endlessConfig 仍用硬编码 `18`（旧 L3 敌数）/`2000`（旧 L3 间隔）作基数 → 无尽 L6=20 敌/1900ms < 战役 L5=26 敌/1600ms，难度倒挂。`18`/`2000` 本就是「战役末关快照」的硬编码，战役一改就失真。
2. **派生消除硬编码（呼应 R17 主题）**：基数改 `LEVELS[末].enemyCounts 总数`（26）+ `LEVELS[末].spawnIntervalMs`（1600）。endless L6（k=1）= 28 敌/1500ms ≥ L5，递增。战役关数/难度再变时 endless 自动跟随——R17「派生 vs 硬编码」教训的二次应用。
3. **斜率不变**：仅平移基数，ENDLESS_TOTAL_STEP/INTERVAL_STEP/ARMOR_* 不动——最小修复，不重设计曲线。
4. **范围限定**：只修有真实回归 + tech-debt 的项；纯体验数值（NPC 护圈/铲冻/SUMMONER/Boss HP）**本轮不动**——无 bug、不验收平衡、避免无机器可验收益的 churn。

## 影响范围

1 文件（实现）：level.endlessConfig（total/interval 基数派生 LEVELS 末关，去 18/2000）。constants/其他零改（未新增常量——派生优于新魔法值）。

## 验收实证

- **机器可验**：316/316（315 既有 + T-EN-9 无回落不变量；基线修订 = T-EN-1 ×4 + T-CE-1 enemyTotal，全部 §2 预判内），tsc 干净，39.23KB。
- **骨架锁定**：7508602，`git diff 7508602 -- tests/endless.spec.ts tests/coop-endless.spec.ts` 空（实现期零篡改）。
- **无回落不变量（T-EN-9）**：endlessConfig(LEVEL_COUNT+1) 总数 28 ≥ 战役末关 26 ✓；间隔 1500 ≤ 1600 ✓。回归已修。
- endless 新曲线：L6=28/1500、L9=34/1200、L13=42/1200、L25=66/1200（接续递增）。

## 已知残留

- 纯体验数值未调（设计决策，本轮范围限定）。
- ENDLESS_8 字面 8（已知接受）。
