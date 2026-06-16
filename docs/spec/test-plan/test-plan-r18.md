# 测试计划 R18 — 连击计分 Combo（F30）

| 字段 | 值 |
|------|----|
| 轮次 | R18（连击倍率计分 + 5d32 收尾） |
| 上游 | 共识 v17 §3.30 / AC-110~113 |
| G3 产物 | 影响面 checklist（§1）+ 基线冲击预判（§2）+ 用例清单（§3） |

## 1. 影响面 checklist

| # | 影响点 | 处置 | 类别 |
|---|--------|------|------|
| 1 | world.ts World.comboCount/comboUntil + createWorld init 0 | 新增 | 结构 |
| 2 | constants COMBO_WINDOW_MS/STEP/CAP（3000/0.1/10）| 新增 | 结构 |
| 3 | combat C5 击杀块：bump combo + mult 计分（world+killer 分 + 飘字） | 新分支 | 行为 |
| 4 | player damagePlayer：重置 combo | 新分支 | 行为 |
| 5 | level loadLevel：重置 combo | 新分支 | 行为 |
| 6 | hud：COMBO ×N 显示（连击激活时） | 新分支 | 行为（视觉，冒烟验）|
| 7 | update.ts 头注释 F-ARCH-5d32 收尾 | 文档修正 | 收尾 |

## 2. 基线冲击预判

| 风险点 | 现状 | 冲击 |
|--------|------|------|
| 单杀计分测试（combat/boss/powerup/melee 等 `score).toBe(base)`）| 单杀 | **零冲击**（首杀 mult=1 设计保证）|
| 多杀-精确总分测试 | grep 实证：无「窗内连杀断言精确总分」的既有用例（多 HP 单杀 combat.spec / bomb 不计分 / 单杀为主）| 零冲击 |

**预判：零基线修订**（首杀 ×1 是单杀零回归的设计锚）。实测出现既有测试变红 = 预判失效信号。

## 3. 用例清单（G4 骨架基线）

| 用例 | 预期 | 骨架态 |
|------|------|--------|
| T-CMB-1 | 窗内 2 杀 → comboCount=2，score=100+110 | FAIL |
| T-CMB-2 | 窗过期后击杀 → comboCount 重置 1，score=100+100 | FAIL |
| T-CMB-3 | 单杀 score=base，comboCount=1 | FAIL（comboCount=1 需 impl）|
| T-CMB-4 | 深连击封顶 ×2（round(base×2)）| FAIL |
| T-CMB-5 | damagePlayer 重置 combo 0 | FAIL |
| T-CMB-6 | loadLevel 重置 combo 0 | FAIL |
| T-CMB-G1 | COMBO 常量存在；1+STEP×CAP=2.0（结构守护）| 先绿 |

## 4. 零回归硬指标

既有 301 测试全绿不许变红（§2 预判零修订，首杀 ×1 保证）。tsc 净。新增 combo.spec 6 行为转绿。
