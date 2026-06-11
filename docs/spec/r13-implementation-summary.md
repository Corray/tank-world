# R13 实现总结（L2）

**日期：** 2026-06-11 / **分支：** feature/r13-wave-defense / **关联：** PRD R13、共识 v12 §3.26、AC-88~95、test-plan-r13（分叉清单 v7 + 零修订预判）

## 背景与做了什么

波次防御——PvE 第三循环。核心区隔 = **同图连续作战**（无尽是清关换图全重置；波次是 L1 一张图打到死，地形损耗/道具/升级跨波累积）。波次曲线递增、每 5 波 Boss、波间 5s 倒计时自动开波（按键可提前）、第七/八档 best-wave 分离。

## 关键决策与思考

1. **judgeWave 整体前拦（平行 judgeVersus 模式）**：judge 在 isPvP 拦截后加 `mode===WAVE` 早退分支——死亡→WAVE_OVER+档位、波清→WAVE_BREAK，全程不触碰既有 PvE 路径（不 bank、不调 onLevelCleared、不写六档）。既有路由零改动 = 零回归预判成立的结构保证。
2. **WAVE_BREAK 是首个自动间奏——advance 层新分支**：既有间奏全是按键流转；倒计时放 `GameLoop.advance`（与 PLAYING 平行的状态分支），`world.clock` 不动、updateWorld 不跑 → AC-11 冻结语义保持，仅 waveBreakMs 递减归零自动 startNextWave。可单测（T-WAV-6 走 advance 直驱）。
3. **setupWave 经 loadLevel(1) / startNextWave 不经**：启动复用全部重置逻辑（地图/玩家/时钟清零）；跨波只重灌 spawn 字段（applyWave）——同图连续四类状态（地形/道具/升级/定时效果）靠「不调用」涌现保留，零新状态字段。
4. **档位分流按 players.length 而非 mode**：WAVE 单一 mode 下 solo/coop 用人数分流第七/八档；writeIfHigher 的 `value>read` 条件天然挡掉 cleared=0 的空跑写入。
5. **每波都有道具携带者（涌现红利）**：applyWave 重置 spawnedCount → CARRIER_POSITIONS（4/8/12）每波重新命中 → 7-cycle 道具供给跨波持续，铲子修墙的战略循环自然成立。

## 实现期发现（2 处，均留痕）

- **骨架修正 ×1（T-WAV-6）**：原驱动 `advance(4983ms)` 撞上 250ms tab-switch clamp（game.ts）——改逐步 advance（与 rAF 真实驱动一致），断言语义不变。教训：骨架驱动方式须对齐宿主层的防御性 clamp。
- **G3 涌现声明错误 ×1（清单 #16）**：原声明「main twoLane=mode!==SOLO 涌现正确」——实际 solo WAVE（mode≠SOLO）会被误判双通道致键位减半。修正为 `players.length>1`（既有四模式语义等价）。教训：涌现声明也要逐条核值域，新枚举值加入后「≠某值」式判定全部要过一遍。
- **G2 假绿形态（骨架阶段实测）**：行为守护块依赖前置桩时骨架态可能 trivially 绿而非 FAIL（startWave 桩 no-op → judge 因 state 门控空转）——骨架双层之外的第三形态，dogfood 素材。

## 影响范围

8 文件：types（GameMode.WAVE + GameState 2 值）、constants（曲线常量族 + 2 KEY）、world（wave/waveBreakMs）、level（waveConfig/isBossWave/applyWave/setupWave/startNextWave）、game（startWave + advance 分支 + restartToReady 扩展）、update（judgeWave + 路由）、storage（第七八档 4 函数）、input（Digit5/6）、main（接线 + twoLane 修正 + 间奏提前开波）、hud（WAVE n + 2 BEST 行）、render（2 overlay + READY 提示）。enemy/combat/map/powerup/achievements **零改**。

## 验收实证

- **机器可验**：277/277（263 既有零回归 + 14 T-WAV-*，基线修订 0——零修订预判精确兑现），tsc 干净，单文件 36.02KB（+2.18KB）。
- **骨架锁定**：b003540；唯一骨架改动 = T-WAV-6 驱动方式修正（显式留痕，断言未动）。
- **浏览器冒烟（`__world` 活体）**：按 5 进 WAVE → HUD「WAVE 2」截图（倒计时在观测间隙自动开了第二波——自动间奏活体实证）+ ENEMY 12（waveConfig(2) ✓）+ BEST WAVE/CO-OP WAVE 两档新行；死于 wave 2 → WAVE_OVER + best-wave=1（wave−1 ✓）+ coop 档与六档全 null（隔离 ✓）。

## 已知残留

- 波次曲线/间歇时长未调参（8+2k / 5s 为〔默认〕）——体验项。
- WAVE_BREAK 期间定时效果时钟（铲/冻）因 clock 冻结顺延——同图连续语义下正当（test-plan §5 留痕）。
- 波清瞬间残留子弹被清（战场平静语义）；BREAK 期间玩家也冻结不能走位——经典波次同款。
