# R19 实现总结（L2）

**日期：** 2026-06-16 / **分支：** feature/r19-difficulty / **关联：** PRD R19、共识 v18 §3.31、AC-114~117、test-plan-r19

## 背景与做了什么

难度选择系统——与模式正交的横向维度（难度 × 模式）。三档 EASY/NORMAL/HARD（默认 NORMAL），缩放敌人速度 + 出生间隔；READY 按 T 循环、PLAYING 锁定；全模式生效。

## 关键决策与思考

1. **NORMAL=1.0 双维零回归锚**：`DIFFICULTY_SPEED_FACTOR/INTERVAL_FACTOR` 的 NORMAL 项均为 1.0 → 既有出生节奏/敌速测试零冲击（同 R18 首杀×1、R17 派生零改的设计锚习惯）。**实测零基线修订**，预判精确兑现。
2. **缩放在 trySpawn 单点，createEnemy 保持纯**：不改 createEnemy 签名 → createEnemy 敌速属性测试（T-ENM/boss/summoner/guardian）零冲击；难度只在 spawn 调度点叠加。
3. **READY-only 锁定**：cycleDifficulty 检查 `state===READY`，局内不可改难度（避免中途变难度的不公平）。
4. **正交设计**：难度是 world 级独立维度，与 GameMode 正交——任意模式（含波次/无尽/MELEE）自动叠加缩放，零模式分叉。

## 浏览器冒烟捕获的集成 bug（本轮关键）

- **D/WASD 键冲突**：初版用 `KeyD` 作难度切换键，但 `D` 是 WASD-右移动键（∈ ALL_GAME_KEYS）——输入层先匹配 `onAnyAction`（开始游戏），难度分支**永不可达**。单测 T-DIF-2 直调 cycleDifficulty 绕过输入层，未暴露此 bug；**浏览器冒烟（按 d → state 直接 PLAYING、难度不变）一次抓出**。
- **修复**：改 `KeyT`（tier，非移动键），同步 render/hud/consensus/PRD 标签。重新冒烟验证全链路：READY 按 T 循环 HARD→EASY→NORMAL、Enter 后难度锁定（HARD 带入 PLAYING、局内 T 被忽略）。
- **教训（dogfood）**：新增「READY 可用的命令键」必须避开 ALL_GAME_KEYS（WASD/方向/Space/J/Enter）——与既有 M/P/R 命令键同族约束；纯逻辑单测无法覆盖「输入层 key 路由」，此类入口 bug 必须浏览器冒烟兜底。

## 影响范围

7 文件：types（Difficulty enum）、constants（SPEED/INTERVAL_FACTOR 因子表）、world（difficulty 字段+init NORMAL）、game（cycleDifficulty READY-only）、enemy（trySpawnEnemy 双维缩放）、input（KeyT→onCycleDifficulty）、main（接线）、hud（DIFF 显示）、render（READY T 提示）。createEnemy/judge/storage 零改。

## 验收实证

- **机器可验**：315/315（308 既有零回归 + 7 T-DIF-*），**零基线修订**（NORMAL=1.0 锚），tsc 干净，单文件 39.14KB（+0.53KB）。
- **骨架锁定**：dd7860c，`git diff dd7860c -- tests/difficulty.spec.ts` 空（实现期零篡改；含 D→T 键名修复，因测试 key-agnostic 直调 cycleDifficulty 不受影响）。
- **浏览器冒烟**：T 键全链路（input→handler→cycleDifficulty）通过；READY 循环 + PLAYING 锁定活体验证；HUD DIFF 显示。

## 已知残留

- 难度不持久化（每会话默认 NORMAL）——设计决策。
- 难度仅缩放敌速+出生间隔，不影响 Boss HP/掉率/计分——本轮范围限定。
