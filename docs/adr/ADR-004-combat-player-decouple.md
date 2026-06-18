# ADR-004 — 拆 combat ↔ player 运行时循环依赖（damagePlayer 归位 combat）

- **状态：** Accepted（2026-06-18，R22；落实 R14 审计 F-ARCH-20260611-608f 的「代码重构待独立 ADR」）
- **关联：** F-ARCH-608f / architecture.md §3.5 已知技术债 / large-module §四（架构级触发 ADR）

## Context

R14 审计发现 combat ↔ player 运行时值导入循环依赖（F-ARCH-608f）：
- `player.ts` import `{ moveTank, applySlide, firePlayerBullet }` ← combat（玩家用 combat 物理/发射原语）
- `combat.ts` import `{ damagePlayer }` ← player（combat 碰撞解算时对玩家施加伤害）

两条边各自语义自洽，故成环。现靠 ESM 函数提升（hoisting）运行无误，但依赖图有环 = 初始化顺序脆弱 + 分层不清。审计 resolved（文档化），代码重构 deferred 待本 ADR。

## Decision

**`damagePlayer` 归位 `combat.ts`**，打破 `combat→player` 边：

- combat 是**碰撞伤害解算 SSoT**——它已内联敌人受击解算（`hit.hp -= 1` / 击杀计分 / 爆炸）；玩家受击伤害解算与之对称，本就属 combat 职责。
- 移动后：`player.ts` 不再被 combat 依赖；`player→combat` 成单向（玩家用 combat 原语），分层清晰（player = 输入意图+移动编排，combat = 物理/碰撞/伤害 SSoT）。
- `damagePlayer` 函数体**逐字不变**（纯归位，零行为变更）；其依赖（Direction/INVINCIBLE_MS/flashPlayer/spawnExplosion/playSound）随迁，import 两侧重对账。

## Consequences

- ✅ 依赖图无环（机器可验：combat 源码不含 `from '../player'`，新增不变量测试）
- ✅ 行为零变更（damagePlayer 体不变 → 既有 321 测试全绿即证）
- ✅ 分层明确：combat = 碰撞/伤害 SSoT（敌+玩家受击同处解算）
- ⚠️ 8 处 damagePlayer 导入者（update.ts + 7 测试）re-point player→combat（机械 churn，预判内）
- ⚠️ combat 模块体量增（可接受——伤害解算聚合反而更内聚）

## Alternatives Considered

| 方案 | 未采纳原因 |
|------|-----------|
| 事件/命中列表（combat 记录命中，pipeline 后置施伤）| 改变帧内施伤时机（爆炸/音效从碰撞当刻移到 combat 后），引入排序风险；本可零行为变更的事做成有风险 |
| 回调注入（update.ts 注入 damagePlayer 给 combat）| 间接层增复杂度，无实质收益 |
| 移 moveTank/firePlayerBullet 出 combat | 它们是 combat 物理核心，移出反破坏分层 |
