# Audit Report — architecture phase（第二轮）

**日期：** 2026-06-11
**Phase：** architecture（Spec 侧 consensus v12 / modules v11 / architecture v2 / code-map v7 / ADR-001 ↔ 实现侧 src/ 14 模块 + update.ts / game.ts / main.ts）
**上轮：** 2026-06-05（F-ARCH-20260605-4c50 → R6-C 修复，architecture/modules 回填至 v2）
**审计范围：** 正向覆盖 / 反向覆盖 / architecture.md 停更检查 / ADR 缺口 / 跨模块依赖 / code-map 锚点抽查
**铁律遵守：** 只记录不修，未改任何代码/文档

---

## 发现汇总

| 编号 | 严重度 | 分类 | 摘要 |
|------|--------|------|------|
| F-ARCH-20260611-e75d | MEDIUM | 偏差（复发） | architecture.md 停更 v2：R7~R13 七轮欠账（状态机 7→11 态、管线缺步、advance 分支、五模式零提及） |
| F-ARCH-20260611-608f | MEDIUM | 风险 | combat ↔ player 运行时值导入循环依赖；模块清单 combat 依赖列（仅 map）与实际六依赖不符 |
| F-ARCH-20260611-dd56 | MEDIUM | 缺失 | ADR 缺口：R8 judge 分叉/isPvP 抽象、R13 advance 状态分支均为架构级决策，docs/adr 仅 ADR-001 |
| F-ARCH-20260611-291d | LOW | 偏差 | code-map v7 查找表「存档档位」行写「五档 + muted」，与自身 v7 变更行「第七八档」内部不一致 |
| F-ARCH-20260611-2016 | LOW | 偏差 | modules.md 覆盖性自检段停更（仅 F1~F6 / AC-1~11，现 F26 / AC-95）；依赖图 R6 重绘后七轮未更新 |
| F-ARCH-20260611-5d32 | LOW | 偏差 | update.ts 头注释引用 v1 旧管线（缺 powerups/shovel/effects），与停更的 architecture §3.2 双向失真 |

**计数：** HIGH 0 / MEDIUM 3 / LOW 3，共 6 条。

---

## F-ARCH-20260611-e75d — architecture.md 停更 v2（R7~R13 七轮欠账，复发）

- **严重度：** MEDIUM
- **分类：** 偏差（与上轮 F-ARCH-20260605-4c50 同模式复发：R6-C 修到 v2 后再停更七轮）
- **位置：** `docs/spec/architecture.md`（版本表止于 v2 / 2026-06-05）
- **证据（六处具体缺口）：**
  1. **状态机计数过时**：§2 core 行写「状态机（7 态）」；实际 `src/core/types.ts:3-22` GameState 已 11 态（R8 增 VERSUS_ROUND/VERSUS_OVER，R13 增 WAVE_BREAK/WAVE_OVER 均未反映）。
  2. **§3.2 管线缺步**：实际管线（`src/core/update.ts:26-34`）为 `updatePlayers → updatePowerups → updateShovel(R12) → spawnNeutralPowerup(VERSUS 分支, R8) → trySpawnEnemy → updateEnemies → updateCombat → updateEffects → judge`；architecture §3.2 缺 updateShovel 与 spawnNeutralPowerup 两步。
  3. **judge 路由描述过时**：§3.2 写「core.judge(按 mode/level 路由四种终态)」；实际 judge（update.ts:97-145）已是三叉路由（isPvP→judgeVersus / WAVE→judgeWave / 战役-无尽），可达终态 7 种（DEFEAT/ENDLESS_OVER/LEVEL_CLEAR/GAME_COMPLETE/VERSUS_ROUND/VERSUS_OVER + WAVE_BREAK/WAVE_OVER）。
  4. **§3.1「单一开关」原则已被修订未跟文档**：§3.1 写「暂停 = 跳过 update…AC-11 的『一切冻结』由单一开关保证」；R13 在 `src/core/game.ts:95-100` 给 advance() 加了第二个推进分支（WAVE_BREAK 状态下 waveBreakMs 倒计时继续走，自动 startNextWave）。代码注释自辩「clock stays frozen, AC-11 semantics hold」，但「单一开关」这一架构原则事实上已变为「PLAYING 推进逻辑 + WAVE_BREAK 推进倒计时」双分支，文档未修订。
  5. **GameMode 零提及**：五模式（SOLO/COOP/VERSUS/MELEE/WAVE，types.ts:94-103）与 isPvP 家族抽象（types.ts:106-108）在 architecture.md 完全缺位——这是 R8~R13 最大的架构面变化。
  6. **头部关联行过时**：写「共识文档 v1.2 / 模块清单 v1.1」；实际 consensus 已 v12、modules 已 v11。§1 测试范围「map/combat/enemy/core」也已远超（master 277 测试覆盖全模块）。
- **对照基准：** code-map.md 同期已勤更至 v7（每轮一版），modules.md 至 v11——三份文档中唯 architecture.md 掉队，缺口可由 code-map v2~v7 变更行逐条回填。
- **建议：** 起一次 v3 回填（参照 R6-C 的一次性回填模式）：状态机 11 态、五模式 + isPvP、管线补 2 步、judge 三叉路由、§3.1 增补 WAVE_BREAK 倒计时分支的取舍说明（或指向新 ADR，见 dd56）。同时给 architecture.md 加与 code-map 相同的「关键链路变更时更新」维护约定，根治复发。

---

## F-ARCH-20260611-608f — combat ↔ player 循环依赖 + 模块清单依赖列失真

- **严重度：** MEDIUM
- **分类：** 风险（代码层）+ 偏差（文档层）
- **位置：** `src/combat/combat.ts` ↔ `src/player/player.ts`；`docs/spec/modules.md` 模块清单表 combat 行 + 模块间依赖图
- **证据：**
  - **运行时值导入循环**：combat.ts `import { damagePlayer } from '../player/player'`（值导入）；player.ts `import { moveTank, applySlide, firePlayerBullet } from '../combat/combat'`（值导入）→ ESM 循环依赖。当前因函数声明提升（hoisting）+ 调用发生在模块初始化之后而正常工作，但若任一侧引入模块顶层立即求值的常量/类继承，会出现 undefined 初始化故障——属隐性架构风险，且现状无任何文档/注释标注此环的存在与安全前提。
  - **模块清单依赖列失真**：modules.md combat 行依赖列仅写「map」；实际 combat 值依赖 map/player/powerup/achievements/audio/effects 六个模块。其中 achievements/audio/effects 可由依赖图的「事件钩子」注释解释，但 `damagePlayer`（直接业务调用，非钩子）与 `dropFromCarrier`（powerup）两条边在依赖图与清单表均无体现。code-map「跨模块事件钩子」段记录了 combat→powerup(dropFromCarrier)，但 combat→player 这条最强的环边三份文档均未登记。
  - **附带核查（无环确认）**：core/world → level 为值依赖（LEVELS/generateSpawnSequence），level → core 仅 type-only + 共享底层 types/constants，运行时无环；enemy → combat 单向，无环。全仓仅 combat↔player 一处真环。
- **建议：** 二选一：(a) 解环——damagePlayer 改为事件/回调注入（与 effects/audio 钩子同型），或移到 player 侧由 combat 返回伤害事实；(b) 显式接受——在 architecture.md §3.3 模块协作约束补「combat↔player 已知环 + 安全前提（仅函数互调，无顶层求值）」标注，并同步修正 modules.md combat 依赖列。两者均需把六依赖如实回填清单表。

---

## F-ARCH-20260611-dd56 — ADR 缺口：R8 judge 分叉 / R13 advance 状态分支

- **严重度：** MEDIUM
- **分类：** 缺失（流程产物）
- **位置：** `docs/adr/`（仅 ADR-001-tech-stack，2026-06-04 后零新增；期间过了 R7~R13 七轮）
- **证据（两个明确达到 ADR 触发条件的决策）：**
  1. **R8/R9 judge 分叉 + isPvP 家族抽象**：judgeVersus（update.ts:48-64）建立了与 PvE 完全平行的胜负体系（双条件败北/best-of-3/不写存档），isPvP(mode)（types.ts:106）成为 C17 友军火力 + judge 路由的单一锚，影响 core/combat/level/hud/input 五模块——符合 large-module §四 触发条件 1（影响多模块的架构调整）与 3（有明显取舍：平行分叉 vs 统一状态机扩展）。R13 judgeWave 再次复用同一分叉模式（update.ts:107 前拦），证明该决策已成为可复用范式，更应有 ADR 沉淀。
  2. **R13 advance() WAVE_BREAK 自动推进分支**：game.ts:89-103 在固定时间步循环内为非 PLAYING 状态开了第二个推进通道，修订了 architecture §3.1「一切冻结由单一开关保证」的既有原则。取舍论证（「clock 冻结故 AC-11 语义保持，仅倒计时走」）目前只存在于代码注释——这正是 ADR 应承载的内容（未来 PAUSED×WAVE_BREAK 交互、新增自动间奏状态时需要回溯此论证）。
  - 当前决策痕迹散落在 consensus 决议行（v7/v12 变更摘要）与 r8/r13-implementation-summary，无独立 ADR；CLAUDE.md 已配置 `adr_path: docs/adr`。
- **建议：** 补记 2 份追溯性 ADR：ADR-TBD「PvP/WAVE 胜负判定平行分叉模式（judge 路由 + isPvP 锚）」、ADR-TBD「固定时间步循环的状态化推进分支（WAVE_BREAK 倒计时）与 AC-11 冻结语义边界」。R14 起架构级决策按 large-module §四 在编码前评估 ADR。

---

## F-ARCH-20260611-291d — code-map v7「存档档位」行过时（内部不一致）

- **严重度：** LOW
- **分类：** 偏差
- **位置：** `docs/spec/code-map.md` 查找表「存档档位」行
- **证据：** 该行写「五档 + muted」；实际 `src/core/constants.ts:67-198` 已有 7 个分数档 KEY（BEST_TOTAL/LEVEL/ENDLESS/COOP/COOP_ENDLESS/WAVE/COOP_WAVE）+ muted，storage.ts 对应 submitWave/submitCoopWave 已落（R13）。code-map 自身 v7 变更行写「第七八档」、v5 行写「档位按 players.length 分流第七八档」——版本表与查找表内部不一致，查找表行漏更。
- **建议：** 查找表该行改为「七档（solo×4 + coop×3）+ muted」或与 data-model 档位术语对齐的等价表述。

---

## F-ARCH-20260611-2016 — modules.md 覆盖性自检段 + 依赖图停更

- **严重度：** LOW
- **分类：** 偏差
- **位置：** `docs/spec/modules.md` §覆盖性自检 + §模块间依赖图
- **证据：** 覆盖性自检段仅列「F1~F6 / AC-1~11」；consensus v12 已到 F26 / AC-95，R7~R13 新增能力（F19~F26）的模块承接自检缺位（实际承接关系在版本表增量行有记录，但自检段失去「无能力悬空」的全景验证功能）。依赖图注释写「图于 R6 重绘」，重绘后 R7~R13 未再更新——VERSUS/MELEE/WAVE 路径、combat→player 边（见 608f）均不在图上。
- **建议：** 自检段升级为 F1~F26 → 模块映射表（或显式声明「F7+ 见版本表增量行」收窄自检段职责）；依赖图随 e75d 的 architecture v3 回填一并重绘。

---

## F-ARCH-20260611-5d32 — update.ts 头注释引用 v1 旧管线

- **严重度：** LOW
- **分类：** 偏差（代码注释）
- **位置：** `src/core/update.ts:1-2`
- **证据：** 注释写「Per-frame pipeline (architecture §3.2): input → player → enemies → combat → judge」——缺 powerups/shovel/effects 三步，是 architecture v1 的管线描述（连 v2 修复后的版本都未跟上）；其引用的 architecture §3.2 本身又停更（见 e75d），形成代码注释与文档双向失真。
- **建议：** 随 e75d 修复时同步把该注释改为与函数体一致的完整管线（或仅留「see architecture §3.2」避免双处维护）。

---

## 正反向覆盖与锚点抽查结果（无发现项的核查记录）

- **正向 14/14**：modules.md v11 列出的 14 模块（core/map/player/enemy/combat/hud/input/render/level/powerup/storage/effects/audio/achievements）在 src/ 均有对应目录与实现文件。✅
- **反向 14/14**：src/ 全部 14 个模块目录 + main.ts 在 modules.md / architecture.md §2 有登记，无未登记模块。架构选型有 ADR-001 支撑。✅
- **code-map v7 锚点抽查 7 处**：6 准 1 过时——translate/refreshSlide/applySlide（combat.ts:64/82/103 ✅）、judgeWave 前拦 + advance WAVE_BREAK（update.ts:107 / game.ts:95 ✅）、isPvP（types.ts:106 ✅）、updateShovel + enemy 冻结门控 updateEnemies 首行（update.ts:28 / enemy.ts:80 ✅）、map.breakSteel/fortifyCells/restoreBrickCells（map.ts:152/157/166 ✅）、level.waveConfig/applyWave/setupVersus/setupMelee（level.ts:306/328/248/283 ✅）、存档档位行 ❌（见 291d）。
- **R6 修复项回归**：F-ARCH-20260605-4c50 修复产物（v2 管线/14 模块/复数化）本身仍准确，但未持续维护（见 e75d）。

---

## 系统性建议

1. **architecture.md 的停更是复发模式（两轮审计同一发现）**——对照实验已天然存在：code-map.md 有「关键链路变更时更新（与实现总结同时落）」的维护约定，七轮全跟上（v1→v7）；architecture.md 无此约定，七轮零更新。根治方案不是再修一次，而是给 architecture.md 加同款约定 + 在每轮实现总结模板里加「architecture.md 是否需更」检查项。建议落 project-patterns 条目（PP 候选：「项目级基线文档若无显式维护触发约定则必停更」）。
2. **「judge 前拦分叉」已成事实范式**（R8 judgeVersus → R9 isPvP 复用 → R13 judgeWave 同型），但范式本身无文档锚——新模式 R14+ 再加分叉时无 ADR 可循。补追溯性 ADR（dd56）的价值不在记历史，在锁定「加新模式 = 加前拦分叉 + 不碰六档既有写入点」的扩展契约。
3. **依赖关系的三处记录（modules 清单表/依赖图、code-map 钩子段）各自部分失真**，建议收敛 SSoT：清单表只记「设计依赖」，code-map 钩子段记「实际边」，并在 audit 时 grep import 核对——本轮 grep 全量 import 仅 10 分钟成本，可作为 architecture phase 固定步骤。
