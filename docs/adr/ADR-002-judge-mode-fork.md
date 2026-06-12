# ADR-002 — judge 按模式整体分叉 + isPvP 家族抽象

- **状态：** Accepted（回溯性 ADR，2026-06-12 落档；决策实际发生于 R8 2026-06-08 / R9 扩展 / R13 复用）
- **关联：** 共识 §3.21/§3.22/§3.26 / code-map v7 / F-ARCH-20260611-dd56（ADR 缺口 finding 的回填）

## Context

R8 引入 VERSUS 时，胜负判定与 PvE（清场过关 / 基地毁败北）完全不同（双条件回合制 + best-of-3）。可选路径：(a) 在既有 `judge` 内逐条件加 mode 分支；(b) 按模式整体分叉出独立 judge 函数，主 judge 只做路由。

## Decision

**按模式整体分叉**：`judge` 顶部路由——`isPvP(mode) → judgeVersus`（R8，R9 的 MELEE 复用同函数）；`mode===WAVE → judgeWave`（R13 平行复制该范式）。配套抽象 `isPvP(mode) = VERSUS || MELEE`（types.ts），作 C17 友军火力反转、applyEffect 铲子归属、judge 路由的**单一判定锚**。

## Consequences

- ✅ 三轮实证（R8/R9/R13）：新模式 = 新 judge 函数 + 一行路由，既有路径零触碰——零回归预判三次精确兑现的结构基础
- ✅ isPvP 让 R9 MELEE 以零改复用 judgeVersus（spool R9 实证）
- ⚠️ 模式数增长时 judge 路由链变长；若未来模式超载（>6），考虑表驱动路由
- ⚠️ judgeWave 与 judge PvE 段存在 allSpawned/fieldClear 重复表达——接受（分叉独立性优先于 DRY）

## Alternatives Considered

| 方案 | 未采纳原因 |
|------|-----------|
| judge 内逐条件 mode 分支 | 条件交织（死亡路由×清场路由×档位写入），每加模式全函数重审，回归面不可控 |
| 每模式独立 update 管线 | 管线 95% 共享（移动/碰撞/道具），仅判定不同——过度分叉 |
