# ADR-003 — GameLoop.advance 状态分支与「单一开关冻结」原则修订

- **状态：** Accepted（回溯性 ADR，2026-06-12 落档；决策实际发生于 R13 2026-06-11）
- **关联：** 共识 §3.26 / architecture.md §3.1（AC-11 冻结）/ F-ARCH-20260611-dd56 回填

## Context

AC-11 的「一切冻结」自 MVP 起由 advance 的单一门控实现：`state===PLAYING` 才推进 clock + update。R13 波次防御需要**自动间奏**（WAVE_BREAK 倒计时自动开下波）——倒计时必须在非 PLAYING 状态下推进，与「非 PLAYING 即全静止」原则冲突。可选：(a) WAVE_BREAK 也算 PLAYING（clock 继续走）；(b) wall-clock 锚点在 render 回调检查（gameCompleteWallMs 先例）；(c) advance 内加平行状态分支，仅推进倒计时不推进 clock。

## Decision

**advance 内平行状态分支（c）**：`else if (state===WAVE_BREAK) { waveBreakMs -= STEP_MS; 归零 → startNextWave }`。原则从「单一开关」修订为「**clock 与实体更新仍单一门控（仅 PLAYING）；间奏自有计时器在 advance 层平行推进**」。

## Consequences

- ✅ AC-11 实质语义保持：clock 不动、updateWorld 不跑，实体/子弹/特效/定时效果全冻（T-WAV-6 断言锁定）
- ✅ 倒计时走固定时间步——可单测（对照 wall-clock 方案不可控、依赖 Date.now）
- ✅ 与 250ms tab-switch clamp 协同：后台标签页时间隙被钳，倒计时不会一次跳完
- ⚠️ architecture.md §3.1「单一开关」表述需同步修订（本 ADR 即触发）
- ⚠️ 后续若再加自动间奏状态，advance 分支链增长——两个以上时抽状态处理表

## Alternatives Considered

| 方案 | 未采纳原因 |
|------|-----------|
| WAVE_BREAK 算 PLAYING | clock 走 → 铲/冻/盾定时效果在间奏被消耗，违背同图连续语义；敌人/子弹需逐系统加 BREAK 门控，冻结面不可控 |
| wall-clock 锚 + render 层检查 | 不可单测（Date.now 不可控）；render 层做状态流转违背分层（render 只读约束） |
