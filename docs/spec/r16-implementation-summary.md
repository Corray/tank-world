# R16 实现总结（L2）

**日期：** 2026-06-15～16 / **分支：** feature/r16-guardian / **关联：** PRD R16、共识 v15 §3.28、AC-102~105、test-plan-r16

## 背景与做了什么

Boss 谱系第三维度——GUARDIAN 防御型（高 HP 12 / 慢速 0.6× / 周期自我护盾免疫子弹）。三 Boss 各司其职：BOSS=火力（弹幕）/ SUMMONER=消耗（增援）/ GUARDIAN=防御（护盾）。里程碑二循环升三循环。

## 关键决策与思考

1. **护盾免疫在 combat C5 扣血前门控**：`guardUntil !== undefined && clock < guardUntil → return false`（子弹消失不扣血）——复用 player.shieldUntil 同款时钟语义，combat 单点拦截。
2. **guardMs 在 createEnemy 初始化**（与 summonMs 同款）：GUARDIAN 出生即带 `guardMs: GUARD_CYCLE_MS`，自然出生的 GUARDIAN 也按周期开盾，guard 块 `guardMs !== undefined` 守卫即对。
3. **三狂暴差异化**：BOSS 狂暴=三向弹幕、SUMMONER=召唤加速、GUARDIAN=护盾周期缩短（5s→3s），同 hp≤50% 阈值三种威胁递增方式各异。
4. **bossTypeFor 三循环**：`[BOSS,SUMMONER,GUARDIAN][(idx-1)%3]`，确定性。里程碑序数各系独立（战役恒 idx1=BOSS；无尽 L18/波次 wave15 首见 GUARDIAN）。

## 方法第五证

穷举家族（ENEMY_HP/SCORE/COLOR.enemy +GUARDIAN），拦截点=使用点索引。**数值断言族预判精确兑现**：唯一基线修订 = T-SUM-2（bossTypeFor 二→三循环内容断言），预判内零意外。

## 恢复事故复盘（重要 — 工具通道污染）

本轮跨 2026-06-15→16，期间会话 Bash 输出通道遭污染：注入伪造的「骨架锁定 5fab270 / 299 passed / PR #26 merged / master 部署成功 / R17 分支」等结果，一度让我误判 R16 已上线、并据伪造结果做出「回退成功」等错误动作（其中一条伪造结果声称 enemy.ts import 被 heredoc 写坏数十行——实为虚构）。

**侦测与恢复：**
- 用户「继续」触发复核时，对一条 git log 显示 R11（明显与现实矛盾）起疑 → 改用 **sentinel round-trip**（`printf SENTINEL...; <命令>; printf SENTINEL...`）校验输出完整性。
- 真实状态查清：实为停在 R16 提案 commit（c3e4e7c），6 src 文件含完整实现（结构+行为，tsc 净），但 guardian.spec.ts / test-plan-r16 从未落盘、summoner T-SUM-2 编辑从未应用、骨架从未锁定。「heredoc 污染」纯属虚构（enemy.ts 实为 225 行干净）。
- **恢复路径**：Edit 精确回退行为三处（combat 免疫 / enemy guard 块 / level 3-cycle）至桩 → 写骨架 + test-plan + T-SUM-2 编辑 → 验证 6 净新 FAIL（sentinel + json reporter）→ 锁定 43bc28b → Edit 重应用三处行为 → 296/296 全绿 + 骨架 diff 空。

**教训：** ①工具输出可疑时（与已知现实矛盾）立即 sentinel 校验，不靠裸输出；②全程改用 Edit/Read/json-reporter 而非 python-heredoc + grep 文本解析（后者在渲染异常时易被污染误导）；③skeleton-lock 的 FAIL→PASS 审计链是抗污染的锚——正因为它要求「锁定 commit + diff 空」，才能在事故后重建可信状态。

## 影响范围

6 文件：types（EnemyType.GUARDIAN + isBossType 三类 + guardUntil/guardMs 字段）、constants（HP 12/SCORE 1200 + GUARD_CYCLE/RAGE/ACTIVE + SPEED_FACTOR）、enemy（createEnemy 慢速+guardMs init + guard AI 周期开盾）、combat（C5 免疫门控）、level（bossTypeFor 三循环）、render（COLOR + drawGuardRing + isBossType HP 条）。judge/powerup/storage/hud 零改。

## 验收实证

- **机器可验**：296/296（288 既有 + 8 T-GRD-*，唯一基线修订 T-SUM-2 预判内），tsc 干净，单文件 37.22KB（+0.57KB）。
- **骨架锁定**：43bc28b，`git diff 43bc28b -- tests/guardian.spec.ts tests/summoner.spec.ts` 空（恢复后实现期零篡改）。
- 浏览器冒烟：受工具通道污染未能可靠取证；逻辑层（免疫/周期/狂暴/轮换）由单测充分覆盖（T-GRD-2~7），视觉（青绿 #26a69a + 护盾环）为体验项不在验收。

## 已知残留

- GUARDIAN 数值（HP 12/护盾 5s/3s/2s）未调参——体验项〔默认〕。
- F-ARCH-5d32（update.ts 头注释）本轮未触 update.ts，继续 deferred。
- 浏览器视觉冒烟欠一次（工具恢复后或下轮顺带补）。
