# 测试计划 R16 — GUARDIAN 第三 Boss（F28）

| 字段 | 值 |
|------|----|
| 轮次 | R16（防御型 Boss + 三循环轮换） |
| 上游 | 共识 v15 §3.28 / AC-102~105 |
| G3 产物 | EnemyType 扩展影响面 checklist（§1，家族第五证）+ 基线冲击预判（§2）+ 用例清单（§3） |

## 1. EnemyType.GUARDIAN 扩展影响面（grep 实证 2026-06-15）

| # | 影响点 | 处置 | 类别 |
|---|--------|------|------|
| 1 | types EnemyType.GUARDIAN + isBossType 扩三类 + EnemyTank.guardUntil? + ai.guardMs? | 新增 | 结构 |
| 2 | constants ENEMY_HP/SCORE `as const` +GUARDIAN（12/1200）；拦截点=使用点索引 | **穷举** | 结构 |
| 3 | render COLOR.enemy +GUARDIAN（`COLOR.enemy[type]` 索引） | **穷举** | 结构 |
| 4 | enemy createEnemy speed GUARDIAN=0.6× + ai.guardMs 初始化 | 新分支（T-GRD-1 先绿） | 结构 |
| 5 | enemy updateEnemies GUARDIAN guard 块（周期开盾 + 狂暴缩周期） | 新分支 | 行为 |
| 6 | combat C5 扣血前 guardUntil 免疫门控 | 新分支 | 行为 |
| 7 | level bossTypeFor 二→三循环 [BOSS,SUMMONER,GUARDIAN][(idx-1)%3] | 改值 | 行为 |
| 8 | render drawGuardRing 护盾环 + HP 条经 isBossType | 新分支（视觉，冒烟验） | 行为 |

## 2. 基线冲击预判（grep 实证）

| 断言点 | 现状 | 冲击 |
|--------|------|------|
| summoner.spec T-SUM-2 bossTypeFor(3)/(4) | 二循环 BOSS/SUMMONER | **唯一修订**：三循环 GUARDIAN/BOSS（数值断言族，预判内） |
| summoner.spec T-SUM-3 L13 / T-SUM-4 wave10 | idx2=SUMMONER | 零冲击（三循环 idx2 仍 SUMMONER） |
| boss.spec L3/L8 末位 BOSS / wave.spec wave5 | idx1=BOSS | 零冲击（三循环 idx1 仍 BOSS） |
| boss.spec 狂暴 BOSS_HP/2、ENEMY_HP 既有键 | 常量引用 | 零冲击（GUARDIAN 纯新增键） |

**预判：唯一基线修订 = T-SUM-2**（bossTypeFor 语义升级的内容断言）。超此即方法失效信号。

## 3. 用例清单（G4 骨架基线）

| 用例 | 预期 | 骨架态 |
|------|------|--------|
| T-GRD-1 | createEnemy(GUARDIAN)：hp 12/score 1200/speed 0.6× | 先绿（结构） |
| T-GRD-2 | 护盾期玩家子弹免疫（hp 不变）；过期后扣血 | FAIL |
| T-GRD-3 | guardMs 归零 → guardUntil 推到未来（开盾） | FAIL |
| T-GRD-4 | hp≤50% 周期=GUARD_RAGE_CYCLE_MS；常态=GUARD_CYCLE_MS | FAIL |
| T-GRD-5 | 狂暴 GUARDIAN 单步只 1 弹、不召唤（与 BOSS/SUMMONER 差异化） | 先绿（普通单发分支） |
| T-GRD-6 | loadLevel(18) 末位 GUARDIAN（idx3） | FAIL |
| T-GRD-7 | applyWave(15) 末位 GUARDIAN（idx3） | FAIL |
| T-GRD-G1 | isBossType 含 BOSS/SUMMONER/GUARDIAN，不含 BASIC | 先绿 |
| T-SUM-2（改） | bossTypeFor 三循环（1 BOSS/2 SUMMONER/3 GUARDIAN/4 BOSS） | FAIL（基线修订，桩态二循环） |

## 4. 零回归硬指标

既有 288 全绿不许变红（§2 预判仅 T-SUM-2 修订）。重点：T-SUM-3/4、T-BOSS-* 全套、穷举索引点 tsc、T-WAV-3。

## 5. 流程备注（恢复事故，2026-06-16 补记）

本轮实现期遭遇会话工具输出通道被污染（伪造的 commit/测试/PR 结果），一度误判进度。靠 sentinel round-trip 校验恢复真实状态后，确认实现已落盘但骨架从未锁定。采用「Edit 精确回退行为三处至桩 → 骨架 FAIL 验证 → 锁定 → 重应用」恢复 FAIL→PASS 纪律。详见 r16 实现总结。
