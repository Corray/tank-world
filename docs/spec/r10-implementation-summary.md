# R10 实现总结（L2）

**日期：** 2026-06-09 / **分支：** feature/r10-tank-upgrade / **关联：** PRD R10、共识 v9 §3.23、AC-68~75、test-plan-r10（分叉清单 v5）

## 背景与做了什么

坦克升级·星星——经典 Battle City 标志机制，**首个局内持久成长**（半持久：死亡前持久）。拾星 L1→L4（快弹/二发/破钢），死亡回 L1，全模式启用，per-player。横向机制（非新模式）。

## 关键决策与思考

1. **升级效果集中在开火点**：firePlayerBullet 读 `player.level` → 弹速(L2，bullet.speed)/cap(L3)/breaksSteel(L4，bullet.breaksSteel)。子弹携带 `breaksSteel` 标志，敌弹无此标志 → **永不破钢**（AC-2 天然守）。combat C2 加 `b.breaksSteel` 门控 + `map.breakSteel`（仿 destroyBase）。
2. **doubleFire 对齐零回归**：`cap = (level≥3 || doubleFire) ? 2 : 1`。低级坦克拾 doubleFire 仍 2 发（AC-18 不变）；L3+ 与 doubleFire 不叠加（封 2）。
3. **重置点矩阵（本轮核心）**：level 在 5 类重置点的处置——createPlayer/damagePlayer/retryLevel/setupVersus = **L1**（4 类归零），**loadLevel 故意不重置**（跨关/无尽保留升级 = PvE 成长回报）。一处 setupVersus 编辑覆盖 VS+MELEE（advanceVersusRound 分发）。
4. **死亡回 L1 一条规则双目的**：PvE 给「失之可惜」张力 + PvP 自然抑滚雪球（领先方一死掉回 L1）——验证了 PM 设计巧思，VS/MELEE 无需平衡特例。
5. **STAR 来源**：DROP_CYCLE 3→4 cycle（护盾→双发→炸弹→星）+ VS_DROP_CYCLE 加星（仍无炸弹）。

## 分叉清单 v5 + 基线冲击预判的关键教训

- 分叉清单 v5（test-plan-r10 §1）：重置点矩阵 5 类全覆盖 + 10 其余写入点，沿用 v4 两子类判据，loadLevel「故意不重置」单列决策点。决策点 grep（`.level=1`/`level≥n`/`breaksSteel`/STAR）= 12。
- **基线冲击预判漏判 1 处（dogfood，待反哺 #33 增量 7）**：改 DROP_CYCLE（3→4 cycle）必然击中**断言其内容**的既有测试 `powerup.spec T-PWR-1`（断言「→bomb→shield 回绕」），但 G3 预判未覆盖。零回归门禁正确暴露 → 1 处**基线修订**（T-PWR-1 改 4-cycle wrap，§3.23 留痕）。
  - **方法补丁**：断言强度扫描（增量 1）+ regression 族枚举（增量 4）的**再补一维**——「改某常量/数据结构的**内容**（如 DROP_CYCLE/枚举序列）时，须 grep 直接断言其内容的测试」。前几轮的家族扫描聚焦「行为分叉点」，漏了「数据内容断言」这一类。

## 影响范围

9 文件：types（PlayerTank.level + PowerupType.STAR + Bullet.breaksSteel）、constants（MAX_TANK_LEVEL/快弹速）、world（createPlayer level=1）、powerup（STAR 入循环×2 + applyEffect 升级）、combat（firePlayerBullet 三效果 + spawnBullet 参数 + C2 L4 破钢）、map（breakSteel）、player（damagePlayer 回 L1）、level（retryLevel/setupVersus 回 L1）、hud（LV 显示）、render（升级 pips + STAR letter）。

## 验收实证

- **机器可验**：241/241（225 R9/既有零回归 + 16 升级），tsc 干净，单文件 32.31KB。基线修订 1 处（T-PWR-1）。
- **浏览器冒烟**：开局 → 设 P1 LV3 + 放 STAR → HUD `LIVES 3 LV3`、坦克金色升级 pips、STAR 道具 `★` 渲染全实证。
- **骨架锁定**：`git diff 2c89cff -- tests/upgrade.spec.ts` 空（未篡改）；测试改动仅 powerup.spec.ts（基线修订，非骨架）。

## 已知残留

- L2「快弹」与「同屏发数」的手感平衡未实测调参（属体验项，定位裁定不在验收）。
- 升级视觉（pips）为最小实现（S9 P1）；坦克外观随级精细化未做。
