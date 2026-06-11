# 测试计划 R13 — 波次防御（F26）

| 字段 | 值 |
|------|----|
| 轮次 | R13（波次防御，PvE 第三循环） |
| 上游 | 共识 v12 §3.26 / AC-88~95 |
| G3 产物 | 模式分叉清单 v7（本文件 §1）+ 基线冲击预判（§2）+ 验收映射（§3)+ 用例清单（§4） |
| 方法 | 判据沿用两子类（新分支 grep 决策点 / 复用涌现声明）；本轮核心 = GameMode/GameState 双枚举扩展 + 档位写入点矩阵 |

---

## 1. 模式分叉清单 v7（GameMode/GameState 扩展 + 档位写入点）

### 1.1 新分支（grep 决策点 1:1）

| # | 决策点（file:anchor） | 分叉语义 |
|---|---------------------|---------|
| 1 | update judge `mode===WAVE → judgeWave` 路由（isPvP 拦截后、PvE 判定前） | WAVE 死亡/波清全部前拦，既有 PvE 路径零触碰（平行 judgeVersus 模式） |
| 2 | judgeWave 死亡 → WAVE_OVER + `coop ? submitCoopWave : submitWave`(wave−1) | 档位分离写入（第七/八档） |
| 3 | judgeWave 波清 → WAVE_BREAK + waveBreakMs=WAVE_BREAK_MS | 不走 LEVEL_CLEAR：不 bank、不调 onLevelCleared |
| 4 | game advance `state===WAVE_BREAK` 倒计时分支 | clock 不动仅倒计时；归零 → startNextWave（首个自动间奏） |
| 5 | main onAnyAction `WAVE_BREAK → startNextWave` | 按键提前开波 |
| 6 | game restartToReady 扩 `WAVE_OVER` | R → 全新 READY |
| 7 | input Digit5/Digit6 → onWave/onCoopWave + main 接线 | 模式入口 |
| 8 | hud `mode===WAVE` → `WAVE n` 替代 `LEVEL n/3` | HUD 分叉 |
| 9 | level applyWave `isBossWave(k)` → 末位注入 BOSS + total+1 | 复用 R11 注入模式 |

### 1.2 数据内容/穷举映射

| # | 影响点 | 处置 |
|---|--------|------|
| 10 | GameMode +WAVE / GameState +WAVE_BREAK/WAVE_OVER | 新枚举值；**render overlayLines 是 `Partial<Record<GameState>>` 非穷举**——加 2 条文案属人工补点（编译不拦，冒烟验），grep 实证 render.ts:309 |
| 11 | constants KEY_BEST_WAVE / KEY_BEST_COOP_WAVE + WAVE_BREAK_MS + waveConfig 曲线常量 | 新常量族 |
| 12 | storage getBestWave/submitWave/getBestCoopWave/submitCoopWave + hud BEST +2 行 | 纯复用 read/writeIfHigher 机械扩展 |

### 1.3 复用/涌现（声明，无 grep token）

| # | 复用点 | 声明 |
|---|--------|------|
| 13 | setupWave 经 loadLevel(world,1) 启动 | map/玩家/清场/定时时钟清零全复用；onLevelLoaded 启动时调用无害（levelStartLives 快照正当） |
| 14 | startNextWave **不经 loadLevel** | 同图连续四类状态（地形损耗/场上道具/升级/定时效果）涌现保留——§3.25 重置点矩阵的分叉新行 |
| 15 | trySpawnEnemy/SPAWN_CELLS | 零改（WAVE 非 MELEE 走顶行出生，L1 图出生点现成）；**CARRIER_POSITIONS 按 spawnedCount 每波重灌 → 每波都有携带者**（道具供给涌现正确） |
| 16 | main twoLane `mode!==SOLO` | coop wave 双通道涌现 ✓；solo wave 单通道 ✓ |
| 17 | isPvP 不含 WAVE | C17 友军火力 PvE 语义、judge 路由顺序涌现正确 |
| 18 | 关卡族成就钩子 | judgeWave 不调 onLevelCleared / startNextWave 不调 onLevelLoaded → NO_DEATH/FULL_CLEAR/PURIST/CAMPAIGN/ENDLESS_8 涌现不触发（AC-94） |
| 19 | spawnNeutralPowerup `mode===VERSUS` | WAVE 不投中立道具 ✓；携带者掉落走 7-cycle（#15） |

## 2. 基线冲击预判清单（grep 实证 2026-06-11）

grep 范围：`tests/**` 对 GameState/GameMode 的穷举断言（`Record<GameState`/`Object.keys/values`）——**零命中**（107 处引用全是用值非穷举）；judge 路径断言全在 SOLO/COOP/VS/MELEE 模式下，WAVE 前拦不触碰。

**预判：零基线修订**（纯加法轮——新 mode/state/档位，judge 早退分支不动既有路径）。实现后若任何既有测试变红 = 预判失效信号，停下回 G3。

## 3. 验收条件 → 测试映射（AC-88~95）

| AC | 条件 | 测试 |
|----|------|------|
| AC-88 | 按 5/6 进 WAVE；L1 图；wave=1；isPvP 不含 | T-WAV-1 + 冒烟（按键） |
| AC-89 | 曲线递增 + 每 5 波 Boss | T-WAV-2, T-WAV-3 |
| AC-90 | 波清→BREAK 倒计时自动开波；期间全冻 | T-WAV-4, T-WAV-6 |
| AC-91 | 同图连续四类状态保留 | T-WAV-5 |
| AC-92 | 死亡→WAVE_OVER 结算 wave−1 | T-WAV-7 |
| AC-93 | 七/八档隔离 + 六档零写入 | T-WAV-7/8/9 |
| AC-94 | 关卡族成就不触发 | T-WAV-G2（守护：波清后成就零解锁） |
| AC-95 | 263 零回归 + 清单 v7 | 全量回归 + T-WAV-G1 |

## 4. 用例清单（G4 骨架基线）

骨架双层：结构层（GameMode/GameState 枚举值、world 字段、constants、level/storage 函数签名）锁定先行编译；行为层 FAIL→impl 转绿。

| 用例 | 前置 | 步骤 | 预期 | 骨架态 |
|------|------|------|------|--------|
| T-WAV-1 | READY world | startWave(solo) | mode=WAVE/wave=1/L1 地形/waveConfig(1) 灌注/state=PLAYING | FAIL |
| T-WAV-2 | — | waveConfig(1/5/20) | total 递增；间隔递减至 cap 800；armored 比例 cap 0.5 | FAIL |
| T-WAV-3 | — | applyWave(5) | spawnSequence 末位 BOSS + enemyTotal=total+1；wave 4/6 无 BOSS | FAIL |
| T-WAV-4 | WAVE 进行中清场 | judge | state=WAVE_BREAK；不 bank（score 原样）；waveBreakMs>0；不写六档 | FAIL |
| T-WAV-5 | 波 1 打损地形+持有 STAR L3+场上道具 | startNextWave | 地形损耗保留/道具保留/level=3 保留/wave=2 | FAIL |
| T-WAV-6 | WAVE_BREAK | GameLoop.advance(WAVE_BREAK_MS+ε) | 自动 startNextWave→PLAYING wave+1；期间 clock 不动 | FAIL |
| T-WAV-7 | wave=3 基地被毁 | judge | WAVE_OVER；KEY_BEST_WAVE=2（wave−1）；六档零写入 | FAIL |
| T-WAV-8 | COOP wave 死亡 | judge | KEY_BEST_COOP_WAVE 写入；KEY_BEST_WAVE 不写（档位隔离） | FAIL |
| T-WAV-9 | WAVE_OVER | restartToReady | 返回全新 READY world | FAIL |
| T-WAV-G1 | — | isPvP(WAVE) | false（PvE 族守护） | 先绿 |
| T-WAV-G2 | WAVE 波清 | judge 后查成就 | 关卡族成就零解锁（onLevelCleared 未调） | 先绿（假绿\*） |
| T-WAV-G3 | SOLO L1 清场/死亡 | judge | 既有 LEVEL_CLEAR/DEFEAT 行为零回归（守护） | 先绿 |

\* T-WAV-G2 骨架态实测修正（2026-06-11）：原预测「误走 LEVEL_CLEAR → FAIL」，实测**假绿**——startWave 桩 no-op 使 world 停留 READY，judge 因 state 门控空转，断言 trivially 通过。守护力在实现后才真实成立（startWave 置 PLAYING + judgeWave 不调 onLevelCleared → 真绿）。**方法新形态留痕：行为守护块依赖前置桩时，骨架态可能假绿而非 FAIL**——骨架双层（R5/R8/R9）之外的第三形态，dogfood 素材。

## 5. 零回归硬指标

实现后既有 263 测试**全绿不许变红**（§2 预判零修订）。重点回归：judge 既有四模式路由（isPvP/PvE 路径）、六档写入点、LEVEL_CLEAR/DEFEAT/ENDLESS_OVER 流转、advance PLAYING 门（AC-11 冻结）。已知边缘（非 AC）：WAVE_BREAK 期间定时效果时钟（铲/冻）因 clock 冻结而顺延——同图连续语义下正当，留痕。
