# R18 实现总结（L2）

**日期：** 2026-06-16 / **分支：** feature/r18-combo / **关联：** PRD R18、共识 v17 §3.30、AC-110~113、test-plan-r18

## 背景与做了什么

连击计分（Combo）——时间窗内连续击杀累积分数倍率（首杀 ×1，封顶 ×2），为「枪杀」加节奏维度。per-world 共享 streak；死亡/换关重置。顺带清 R14 审计遗留的 F-ARCH-5d32（update.ts 头注释）。自主三连收官轮。

## 关键决策与思考

1. **首杀 ×1 = 单杀零回归锚**：`comboCount=1 → mult=1`，单次击杀计分与既有完全一致。这一设计让所有既有单杀计分测试零冲击——**零基线修订预判精确兑现**（实测 0 churn）。
2. **lazy 窗口判定，无 active tick**：连击在 combat 击杀点惰性判定（`clock < comboUntil ? +1 : 1`），不需每帧 decay；HUD 显示由 `clock < comboUntil` 派生。最小侵入。
3. **per-world 共享 streak**：co-op 双人共用连击，鼓励协作连杀（非 per-player）。
4. **倍率封顶 ×2**：`1 + 0.1×min(combo-1, 10)`，COMBO_CAP=10 给整 ×2 上限（骨架期把 CAP 9→10 校正以匹配「×2」语义）。
5. **重置点**：死亡（damagePlayer）+ 换关（loadLevel）；窗口过期靠下次击杀 lazy 归 1。与 R12 定时效果、R10 升级的重置点矩阵同族（不同生命周期）。

## 影响范围

6 文件：world（comboCount/comboUntil 字段+init）、constants（COMBO_WINDOW_MS/STEP/CAP）、combat（C5 击杀连击倍率 + 飘字 awarded）、player（damagePlayer 重置）、level（loadLevel 重置）、hud（COMBO ×N）。+ update.ts 头注释收尾（F-ARCH-5d32）。judge/storage/enemy 零改。

## 验收实证

- **机器可验**：308/308（301 既有零回归 + 7 T-CMB-*），**零基线修订**（首杀 ×1 设计保证，预判精确兑现），tsc 干净，单文件 38.61KB（+0.34KB）。
- **骨架锁定**：f341edb，`git diff f341edb -- tests/combo.spec.ts` 空（实现期零篡改）。
- **5d32 收尾**：update.ts 头注释从 v1 旧管线（input→player→enemies→combat→judge）更新为当前管线（含 powerups/shovel/中立道具/judge 路由）——该 finding deferred 三轮（R14→R17）后于本轮触 update.ts 时清理。
- 浏览器冒烟：连击逻辑由单测充分覆盖（T-CMB-1~6）；HUD COMBO ×N 为视觉项。

## 自主三连（R16~R18）收官说明

- R16 GUARDIAN（Boss 谱系第三维度）/ R17 战役 L4-L5（LEVEL_COUNT blast radius）/ R18 连击计分。三轮覆盖：敌人系统扩展 → 基础常量影响面 → 计分机制纵深，彼此正交。
- R16 经历会话工具通道污染事故并恢复（详见 r16 总结）；R17 暴露 blast radius grep 盲区（method-miss 已记）；R18 零事故零 churn 收官。

## 已知残留

- 连击音效/特效未升级（飘字复用既有，体验项）。
- endless 难度回落（R17 遗留，endlessConfig 基数 magic）——体验项，未处理。
- F-ARCH-5d32 本轮已清（不再 deferred）。
