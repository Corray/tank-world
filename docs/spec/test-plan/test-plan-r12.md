# 测试计划 R12 — 道具补全·经典三件（F25）

| 字段 | 值 |
|------|----|
| 轮次 | R12（道具补全：SHOVEL / FREEZE / LIFE） |
| 上游 | 共识 v11 §3.25 / AC-81~87 |
| G3 产物 | 模式分叉清单 v6（本文件 §1）+ 基线冲击预判清单（§2，增量 7 家族第三次自我应用）+ 验收映射（§3）+ 用例清单（§4） |
| 方法 | 判据沿用 v4 两子类（新分支 grep 决策点 1:1 / 复用涌现声明）+ v5 重置点矩阵 + 增量 7 穷举映射/数据内容断言全扫 |

---

## 1. 模式分叉清单 v6（道具 × 模式矩阵 + 定时效果重置点）

### 1.1 新分支（grep 决策点 1:1）

| # | 决策点（file:anchor） | 分叉语义 |
|---|---------------------|---------|
| 1 | powerup applyEffect `case SHOVEL` → `isPvP(world.mode) ? picker.id : 1` | 加固哪侧基地：PvE/COOP 恒侧 1（共享基地）；VS/MELEE 拾取者己方 |
| 2 | powerup applyEffect `case FREEZE` → `world.freezeUntil = clock + FREEZE_MS` | 全局时钟（非 per-enemy 标记 → 窗口内新出生天然冻结） |
| 3 | powerup applyEffect `case LIFE` → `picker.lives += 1` | per-picker，无模式分叉，无上限 |
| 4 | enemy updateEnemies 顶部 `if (clock < freezeUntil) return` | 冻结门控：全场 NPC（含 BOSS）不移动不射击不减 AI 计时 |
| 5 | powerup updateShovel：到期 `restoreBrickCells(ring)` + 清零 | per-side 独立到期；全恢复为砖（含拾取前已毁格） |
| 6 | level loadLevel 清零 freezeUntil/shovelUntil | 定时效果不跨关（新写入点） |
| 7 | level setupVersus 清零 freezeUntil/shovelUntil | 不跨局（新写入点；setupMelee 经它复用） |

### 1.2 数据内容/穷举映射（增量 7 家族）

| # | 影响点 | 处置 |
|---|--------|------|
| 8 | types `PowerupType` | +SHOVEL/FREEZE/LIFE（3 新枚举值） |
| 9 | powerup `DROP_CYCLE` | 4→7：尾部追加 铲→冻→命（**数据内容断言族**，见 §2） |
| 10 | powerup `VS_DROP_CYCLE` | 3→4：+SHOVEL（不加 FREEZE/LIFE） |
| 11 | render `LETTER: Record<PowerupType, string>` | +3 项（漏=穷举编译错） |
| 12 | powerup applyEffect switch | +3 case（漏=道具拾取无效果，行为测试拦） |
| 13 | achievements `COLLECTOR_TYPES` | **维持 3 不动**（3/7 语义自然放宽非回归） |

### 1.3 复用/涌现（声明，无 grep token）

| # | 复用点 | 声明 |
|---|--------|------|
| 14 | MELEE NPC 携带者掉落 | 走 PvE DROP_CYCLE，7-cycle 自动生效，零改 |
| 15 | retryLevel / setupMelee 重置 | 分别经 loadLevel / setupVersus 涌现覆盖（#6/#7） |
| 16 | pickup per-picker 机制（updatePowerups） | 三新道具复用 C13′ 拾取判定，零改 |
| 17 | HUD 命数显示 | 读 p.lives，LIFE 生效后自动正确，零改 |
| 18 | createWorld 新字段初始化 | freezeUntil=0 / shovelUntil={1:0,2:0}（结构层，编译必需骨架先行） |

## 2. 基线冲击预判清单（grep 实证 2026-06-11）

grep 范围：`tests/**`（含 regression-* 族）中断言 DROP_CYCLE / VS_DROP_CYCLE / PowerupType 内容的测试。

| 测试 | 现断言 | 冲击 | 处置 |
|------|--------|------|------|
| **T-PWR-1**（powerup.spec.ts，4-cycle wrap） | 5 次掉落 = [盾,火,弹,星,盾] | **击中**：7-cycle 后第 5 个 = SHOVEL | **唯一预判修订**：改为 8 次掉落断言 7-cycle wrap，留痕 §3.25 |
| T-UP-8（upgrade.spec.ts，第 4 掉落=STAR） | powerups[3]=STAR | 零冲击（尾部追加保留前缀） | 不动 |
| T-VS-9a（versus.spec.ts，never bomb） | VS 池无 BOMB | 零冲击（新池仍无 BOMB） | 不动 |
| achievements COLLECTOR 系（onPickup 直调 3 类） | 拾 3 种解锁 | 零冲击（COLLECTOR_TYPES=3 不动） | 不动 |
| regression-qa2 / qa2b / coop / input 族 | — | grep 零命中 | 不动 |

**判据**：实现后基线修订若超出本清单（即 T-PWR-1 之外出现任何既有测试变红）= 预判失效信号，停下回 G3。

## 3. 验收条件 → 测试映射（AC-81~87）

| AC | 条件 | 测试 |
|----|------|------|
| AC-81 | 3 新类型 + 7-cycle + 穷举全扫 | T-ITM-1 + tsc（编译即验 #11） |
| AC-82 | SHOVEL 变钢/到期回砖/per-base | T-ITM-2/3/4/5 |
| AC-83 | FREEZE 全场定身/新出生同冻/刷新/不冻玩家 | T-ITM-6/7 |
| AC-84 | LIFE +1 无上限 | T-ITM-8 |
| AC-85 | VS 池 4-cycle 仅加铲 | T-ITM-9a/9b |
| AC-86 | 定时效果不跨关不跨局 | T-ITM-10 |
| AC-87 | 成就零回归 + 249 零回归 + 分叉清单 v6 | T-ITM-G1 + 全量回归 |

## 4. 用例清单（G4 骨架基线）

**骨架双层**（R5/R8/R9 三次复发已成方法）：结构层（枚举值/常量/world 字段/map 方法签名）编译必需，锁定时先行；行为层 FAIL→impl 转绿。

| 用例 | 前置 | 步骤 | 预期 | 骨架态 |
|------|------|------|------|--------|
| T-ITM-1 | — | 8 次 dropFromCarrier | [盾,火,弹,星,**铲,冻,命**,盾]（7-cycle wrap） | FAIL |
| T-ITM-2 | PvE，护圈 (12,5) 预先打空 | P1 拾 SHOVEL | 5 护圈格全 STEEL（含预毁格）；BASE 格不动 | FAIL |
| T-ITM-3 | 承 T-ITM-2 | 推进 SHOVEL_MS | 5 格全回 BRICK（修墙）；shovelUntil 清零 | FAIL |
| T-ITM-4 | COOP，P2 拾 | applyEffect | 加固侧 1（共享基地），非侧 2 | FAIL |
| T-ITM-5 | VERSUS，P2 拾 | applyEffect | 顶部基地护圈变钢；底部不动（per-side） | FAIL |
| T-ITM-6 | 场上敌人，拾 FREEZE | runWorld 窗口内/外 | 窗口内不移动不发弹；过期恢复移动射击 | FAIL |
| T-ITM-7 | 冻结窗口内 spawn 新 NPC | updateEnemies | 新 NPC 同样不动（全局时钟）| FAIL |
| T-ITM-8 | lives=7 拾 LIFE | applyEffect | lives=8（无上限）+ HUD 数据源同步 | FAIL |
| T-ITM-9a | VERSUS 中立刷新 ×4 周期 | runWorld | 出现 SHOVEL（4-cycle 含铲） | FAIL |
| T-ITM-9b | VERSUS 中立刷新 ×N | runWorld | 永不出现 FREEZE/LIFE/BOMB | 先绿（守护） |
| T-ITM-10 | freeze/shovel 激活后 | loadLevel / setupVersus | 两时钟清零 | FAIL |
| T-ITM-G1 | — | 常量断言 | COLLECTOR_TYPES=3 / ACHIEVEMENT_COUNT=8 | 先绿（守护） |
| T-ITM-G2 | — | 4 次掉落 | 前 4 仍 [盾,火,弹,星]（前缀保留守护） | 先绿（守护） |

## 5. 零回归硬指标

实现后既有 249 测试中，**除 T-PWR-1（§2 预判修订）外全绿不许变红**。重点回归：DROP_CYCLE 前缀（T-UP-8/T-ITM-G2）、VS 池无 BOMB（T-VS-9a）、成就（COLLECTOR/PURIST）、MELEE 携带者掉落、HUD 命数。已知边缘（非 AC）：铲子激活瞬间停在护圈格上的坦克可能被钢墙困住——经典同款行为，体验项不在验收。
