# R15 实现总结（L2）

**日期：** 2026-06-12 / **分支：** feature/r15-summoner / **关联：** PRD R15、共识 v14 §3.27、AC-96~101、test-plan-r15

## 背景与做了什么

Boss 扩展——召唤型 SUMMONER（低 HP+周期增援）+ 里程碑按序交替（奇 BOSS/偶 SUMMONER，战役恒 BOSS）+ BOSS_HP 调参 10→8（R11 僵持债）。BOSS=火力型 / SUMMONER=消耗型，「斩首 vs 清兵」战术抉择。

## 关键决策与思考

1. **召唤兵不动 spawn 账目**：trySummon 直接 push enemies，spawnedCount/enemyTotal 零触碰 → fieldClear「全灭才过」天然覆盖召唤兵（AC-99 零新胜负逻辑——R11 末位注入同款红利第二次兑现）。
2. **isBossType 锚（isPvP 同款模式）**：HP 条渲染与未来 Boss 系判定收口到单点；顺带把 drawBossHp 分母从硬编码 BOSS_HP 改 `ENEMY_HP[type]`（SUMMONER 血条比例正确性——实现中发现的隐性穷举点，G3 清单外补获）。
3. **召唤位置策略**：邻近 1~2 格八向找 tankAreaFree 空位，找不到本次作废（不排队）——简单且与同屏上限（ENEMY_CONCURRENT 复用）双重限流。
4. **里程碑序数各系独立**：战役恒 idx1；无尽 (level−3)/5；波次 wave/5——T-WAV-3（wave5=BOSS）与 T-BOSS（L3/L8=BOSS）全兼容，交替规则零基线冲击。
5. **狂暴差异化**：SUMMONER 狂暴=召唤加速（4s→2s），射击保持普通单发——与 BOSS 三向弹幕区隔（T-SUM-G1 锁定）。

## 方法链第四证 + 假绿形态第三例

- **穷举映射家族第四证**：G3 修正认知——ENEMY_HP/SCORE/COLOR.enemy 是 `as const` 对象，编译拦截在**使用点索引**（createEnemy/render）而非定义点；加键即过，本轮零编译插曲。**数值断言族预判精确兑现**：BOSS_HP 10→8 零基线修订（boss.spec 全经常量引用）。
- **假绿形态第三例（T-SUM-6）**：预判 FAIL 实测假绿（同屏上限断言依赖召唤桩）——R13-G2/T-SUM-8 同款累积至 3 例，形态规律：**「X 时不发生 Y」型守护断言在 Y 的实现桩为 no-op 时必假绿**。dogfood 素材（可形式化为骨架态预判规则）。

## 影响范围

4 文件：types（EnemyType.SUMMONER + isBossType + ai.summonMs?）、constants（HP/SCORE 表 +SUMMONER、SUMMON_MS/RAGE、BOSS 10→8）、enemy（trySummon + 召唤计时分支 + createEnemy summonMs 初始化）、level（bossTypeFor + 两注入点改选型）、render（色板 + HP 条 per-type 分母 + isBossType）。combat/judge/powerup/storage/hud **零改**。

## 验收实证

- **机器可验**：288/288（277 既有零回归 + 11 T-SUM-*，基线修订 0——零修订预判兑现），tsc 干净，单文件 36.65KB（+0.63KB）。
- **骨架锁定**：b3b52eb，`git diff -- tests/summoner.spec.ts` 空（6 FAIL→PASS 未篡改）。
- **浏览器冒烟（`__world` 活体）**：注入 SUMMONER（summonMs=300）→ 800ms 后召唤 +1 BASIC 且 spawnedCount=1/enemyTotal=10 不动（账目隔离实证）；橙红色 #ff7043 坦克 + 头顶 HP 条渲染截图实证。

## 已知残留

- SUMMONER 数值（HP 6/召唤 4s/2s）未调参——体验项〔默认〕。
- 召唤兵恒 BASIC（控变量）；GUARDIAN 第三 Boss 留候选池。
- F-ARCH-5d32（update.ts 头注释）原计划本轮顺带——本轮未触 update.ts，继续 deferred 至下一触及 PR。
