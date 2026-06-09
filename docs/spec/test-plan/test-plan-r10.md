# 测试计划 R10 — 坦克升级系统·星星（F23）

| 字段 | 值 |
|------|----|
| 轮次 | R10（坦克升级·星星，横向机制） |
| 上游 | 共识 v9 §3.23 / AC-68~75 |
| G3 产物 | 模式分叉清单 v5（本文件 §1，**重置点矩阵全覆盖**）+ 验收映射（§2）+ 用例清单（§3） |
| 方法 | 写入点级第五轮——首压「局内持久成长（level）的重置点矩阵」；判据沿用 v4 两子类（新分支 grep 决策点 / 复用涌现声明）|

---

## 1. 模式分叉清单 v5（G3 产物 / AC-75 载体）

**核心 = level 重置点矩阵**（#13 重置点矩阵同源升级——首次跨「持久 vs 重置」维度）。判据沿用增量 5/6 两子类。

### 1.1 level 重置点矩阵（AC-74 核心）

| 重置点（file:anchor） | level 处置 | 子类 | 测试 |
|----------------------|-----------|------|------|
| createPlayer（world.ts:80）| **=1** 初始 | 新分支 | T-UP-7a |
| damagePlayer（player.ts:47 损命）| **=1** 死亡回 L1 | 新分支 | T-UP-6 |
| retryLevel（level.ts:197 败北重试）| **=1** | 新分支 | T-UP-7b |
| setupVersus（level.ts:226 每局，覆盖 MELEE）| **=1** | 新分支 | T-UP-7c |
| **loadLevel（level.ts:167 过关/无尽）** | **持久不变**（跨关保留）| **决策点：故意不重置** | T-UP-7d |

> loadLevel 是「故意不重置」决策点——必须显式标注，否则 audit/后人误以为漏改（#13 类风险的反向：这里漏「不动」反而对，漏「动」才错）。

### 1.2 其余写入点

| # | 写入点 | 行为 | 子类 | 测试 |
|---|--------|------|------|------|
| 1 | types PlayerTank.level + PowerupType.STAR + Bullet.breaksSteel | 字段 | 新分支 | T-UP-1 |
| 2 | powerup applyEffect STAR | level=min(4,+1) | 新分支 | T-UP-1 |
| 3 | powerup DROP_CYCLE 加 STAR（4-cycle）| 携带者掉星 | 新分支 | T-UP-8 |
| 4 | powerup VS_DROP_CYCLE 加 STAR | VS 中立刷星 | 新分支 | T-UP-8 |
| 5 | combat firePlayerBullet cap | (level≥3‖doubleFire)?2:1 | 新分支 | T-UP-3,5 |
| 6 | combat firePlayerBullet 弹速 | level≥2 → ×1.5 | 新分支 | T-UP-2 |
| 7 | combat C2 钢墙 | L4 玩家弹破钢（breaksSteel 门控）| 新分支 | T-UP-4 |
| 8 | map breakSteel | 钢格→EMPTY | 复用/涌现（仿 destroyBase）| T-UP-4 |
| 9 | hud LV 显示 | `LV{n}` | 新分支 | T-UP-10 |
| 10 | 全模式 per-player | VS/MELEE 升级生效（无 mode 门控=涌现）| 复用/涌现 | T-UP-9 |

**判据（AC-75）**：新分支子类 grep 决策点 1:1（`STAR`/`.level`/`breaksSteel`）；复用/涌现子类（map.breakSteel 仿 destroyBase、全模式无门控）以「复用既有路径」声明。loadLevel「故意不重置」单列决策点。

---

## 2. 验收条件 → 测试映射（AC-68~75）

| AC | 条件 | 测试 |
|----|------|------|
| AC-68 | 拾星 L1→L4 封顶；STAR 入掉落循环+VS 中立；per-player | T-UP-1, T-UP-8 |
| AC-69 | 四级效果：L2 快弹 / L3 二发 / L4 破钢 | T-UP-2, T-UP-3, T-UP-4 |
| AC-70 | 损命重生 → 回 L1 | T-UP-6 |
| AC-71 | doubleFire 对齐 cap；AC-18 零回归 | T-UP-5（含低级 doubleFire 仍 2 发）|
| AC-72 | L4 破钢；<L4 不破（AC-2 零回归）；敌弹永不破钢 | T-UP-4a/b/c |
| AC-73 | 全模式启用；死亡回 L1 抑滚雪球 | T-UP-9 |
| AC-74 | 重置点矩阵（5 类，loadLevel 持久）| T-UP-6, T-UP-7a/b/c/d |
| AC-75 | 分叉清单 v5 重置点全覆盖 + 两子类判据 | 元验收 |

---

## 3. 用例清单（G4 骨架基线 — 每条=一个 FAIL 测试块）

| 用例 | 前置 | 步骤 | 预期 |
|------|------|------|------|
| T-UP-1 | 玩家 L1 | 拾 STAR ×1/×5 | level 1→2；连拾封顶 L4（第 5 次仍 4）|
| T-UP-2 | L1 vs L2 玩家开火 | 比子弹 speed | L2 弹速 > L1（×1.5）|
| T-UP-3 | L1/L2/L3 玩家 | 连发 | L1/L2 上限 1 发；L3 上限 2 发 |
| T-UP-4a | L4 玩家子弹朝钢墙 | runCombat | 钢墙格变 EMPTY |
| T-UP-4b | L1 玩家子弹朝钢墙（回归）| runCombat | 钢墙不损、子弹被挡（AC-2）|
| T-UP-4c | 敌方子弹朝钢墙 | runCombat | 钢墙不损（敌弹永不破钢）|
| T-UP-5a | L1 玩家 + doubleFire（回归）| 连发 | 上限 2 发（AC-18 不变）|
| T-UP-5b | L3 玩家 + doubleFire | 连发 | 上限仍 2 发（不叠加到 3）|
| T-UP-6 | L3 玩家被敌弹命中重生 | damagePlayer | level=1（死亡回 L1）|
| T-UP-7a | createPlayer | — | level=1 |
| T-UP-7b | L3 玩家 DEFEAT → retryLevel | — | level=1 |
| T-UP-7c | L3 玩家 → setupVersus / setupMelee | — | level=1（每局新坦克）|
| T-UP-7d | L3 玩家 → loadLevel(下一关) | — | level **保持 3**（跨关持久）|
| T-UP-8 | carrier 掉落循环推进 | 第 4 个掉落 | 出现 STAR（4-cycle）；VS_DROP_CYCLE 含 STAR |
| T-UP-9 | VERSUS 玩家拾 STAR | — | level 升（全模式启用）；VS 中死亡回 L1 |
| T-UP-10 | L3 玩家 | renderHud | 含 `LV` 等级显示 |

---

## 4. 零回归硬指标

R10 是横向增量。实现后既有 225 测试（含 19 VERSUS + 15 MELEE）+ 全部**全绿不许变红**。重点回归：AC-2（钢墙不可破，仅 L4 玩家弹例外）、AC-18（doubleFire 2 发，低级坦克不变）、各模式 loadLevel/retryLevel 既有行为。
