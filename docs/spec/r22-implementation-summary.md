# R22 实现总结（L2）

**日期：** 2026-06-18 / **分支：** feature/r22-decouple-combat-player / **关联：** PRD R22、ADR-004、共识 v21 §AC-120、test-plan-r22

## 背景与做了什么

重构轮——拆 combat ↔ player 运行时循环依赖（R14 审计 F-ARCH-608f，当时文档化、代码重构 deferred 待 ADR）。`damagePlayer` 从 player.ts 归位 combat.ts，打破 `combat→player` 边，行为零变更。清掉项目唯一登记在案的真实技术债。

## 关键决策与思考

1. **归位而非事件化**：combat 已是碰撞伤害解算 SSoT（内联敌人受击 hp--/计分/爆炸）；玩家受击伤害解算与之对称，本属 combat。`damagePlayer` 移入 combat = 分层归位，比「命中列表后置施伤」零风险（后者改帧内施伤时机，引入排序风险）。
2. **player→combat 单向边保留**：player 用 combat 物理原语（moveTank/applySlide/firePlayerBullet）是合理依赖（实体用物理），不动。拆的是反向的 combat→player。
3. **行为逐字不变**：damagePlayer 函数体原样迁移（含 R18 combo 重置 / R10 升级清零 / 重生无敌），import 两侧对账——既有 321 测试全绿即证零回归。
4. **机器可验交付**：新增 T-ARCH-1 依赖无环不变量（Vite `?raw` 读源码断言 combat 不含 `from '../player'`），FAIL→PASS 锚住「环已拆」；避开 @types/node（用 tsconfig 已有的 vite/client `?raw` 类型）。

## 影响范围

- **combat.ts**：+damagePlayer（体不变）+ imports（INVINCIBLE_MS/flashPlayer/Direction 值化/EXPLOSION_COLOR_PLAYER 常量）；删 `import damagePlayer from player`。
- **player.ts**：删 damagePlayer + 随之孤立的 Direction/INVINCIBLE_MS/effects/audio 导入 + EXPLOSION_COLOR_PLAYER 常量；updatePlayer 仅留 combat 原语依赖。
- **7 测试文件**：damagePlayer 导入 player→combat re-point（机械 churn，split 文件保留 updatePlayer from player）。
- update.ts 不受影响（import updatePlayers，未变）。

## 验收实证

- **机器可验**：323/323（321 既有零回归 + 2 T-ARCH-1），tsc 干净，单文件 39.50KB（−0.01KB，纯迁移）。
- **依赖无环**：combat.ts `from '../player'` 命中 = 0；T-ARCH-1 绿（环拆 + player→combat 单向边守护）。
- **骨架锁定**：9c3ad0c，`git diff 9c3ad0c -- tests/architecture.spec.ts` 空。
- **行为零变更**：damagePlayer 体逐字未改 + 321 既有测试全绿 = 重构无行为副作用。

## 已知残留

- 无。项目唯一登记技术债（F-ARCH-608f）本轮代码层清除——findings-registry 标 code-resolved，architecture.md §3.5 债务注记移除。
