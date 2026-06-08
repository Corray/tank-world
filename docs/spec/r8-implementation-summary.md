# R8 实现总结（L3）

**日期：** 2026-06-08 / **分支：** feature/r8-versus-mode / **关联：** PRD R8、共识 v7 §3.21、AC-52~59、test-plan-r8（分叉清单 v3）

## 背景与做了什么

双人对战 VS——**首个对抗阵营模式**（此前 SOLO/COOP 均为 PvE 同阵营）。纯 PvP 对称竞技场 + 友军火力反转 + 双条件胜负（毁对方基地或清对方命数）+ best-of-3 回合 + 中立点定时刷新道具（去炸弹）+ VS 不写六档。写入点级分叉清单 v3 方法第三轮（首含 VERSUS 维度）。

## 关键决策与思考

1. **judge 分叉而非改造**：`judgeVersus` 独立分支，在 PvE clear 检查**前**拦截（`update.ts judge` 顶部 `mode===VERSUS` 路由）。否则 VS 的 0 敌人会触发 `allSpawned&&fieldClear` → 误进 LEVEL_CLEAR（T-VS-4 守护此点）。
2. **双基地零新 Terrain**：复用 `BASE` 格，`GameMap` 加 `destroyedBaseRows: Set` + `versusBaseDown(side)`（按行 ≷ GRID/2 判顶/底）+ `baseDestroyedAt(row)`（PvE 回退到单 `baseDestroyed` 布尔，零回归）。combat C3 改传 `row`。
3. **友军火力复用 playerId**：R5 为计分归属加的 `Bullet.playerId` 恰是 VS 归属基础——C17 加 VERSUS 分支（`playerId!==target.id`→`damagePlayer`+killer.kills++；`===`→穿透），**子弹结构零重构**。SOLO/COOP 穿透保留（T-VS-6d 守护）。
4. **敌人零分支兜底**：`setupVersus` 设 `enemyTotal=0`，复用 `trySpawnEnemy` 既有 `spawnedCount≥enemyTotal` 守卫——主链不加 mode 判断。
5. **新增 2 状态隔离 PvE 语义**：`VERSUS_ROUND`（间场）+ `VERSUS_OVER`（总结算），不复用 LEVEL_CLEAR/DEFEAT（规避 PRD 反例段警告的「与重试逻辑串味」）。
6. **中立道具新来源**：VS 无携带者，`spawnNeutralPowerup` 定时（12s）在中线对称点刷护盾/双发交替、防堆叠、排除炸弹。

## 分叉清单 v3 方法实证（AC-59）

18 写入点全枚举、16 行 `VERSUS≠`（test-plan-r8 §1）。三态（SOLO/COOP/VERSUS）逐行 + 测试归属驱动 19 个 T-VS-* 骨架。设计期此法直接圈定 judge/C17/双基地/storage 四类高风险点，**无写入点遗漏**（对比 #6「三层同漏」根因结构性预防）。

## 偏离与 dogfood 素材

1. **编译原子性致 7 结构守护提前绿**（test-skeleton-lock 大重构边界，**第二次复发**，R5 复数化同款）：VERSUS 枚举值/字段必须先存在骨架才能编译，故 startVersus 结构性骨架使 T-VS-1 等 7 个结构/回归断言在锁定时已绿；12 个行为断言全 FAIL→impl 转绿。骨架文件 `git diff` 锁定后全程零篡改（已验证空 diff）。→ **复发达阈值，建议 standard 形式化「大重构骨架双层」：结构层（编译必需，可先绿）vs 行为层（必须 FAIL→PASS）**。
2. **AC-59「行数=grep 命中数」判据在「单写入点多 token 引用」时偏离**：`grep VERSUS\|versus\|VS_` 得 66 raw token，但逻辑写入点仅 16（一个写入点如 judgeVersus 含多处 versusWins 引用）。→ v2（R7）的 `mode===` grep 是「一点一命中」，v3 的 VERSUS 分支是「一点多引用」，判据需细化为「**逻辑写入点数**」而非「token 命中数」。方法新边界，补给 #33。

## 影响范围

9 文件：types（GameMode.VERSUS+2 状态+kills）、constants（VS 常量）、world（versusWins 等 4 字段）、game（startVersus+restart）、map（双基地建模）、level（VS_LAYOUT+setupVersus+advanceVersusRound）、update（judge 路由+judgeVersus+中立刷新接线）、combat（C17 反转+C3 行归属）、powerup（spawnNeutralPowerup）、input（onVersus+Digit3+stateFor 泛化）、hud（VS 分支）、render（双基地 per-side+VS overlay+READY 提示）。

## 验收实证

- **机器可验**：210/210（191 现有零回归 + 19 VERSUS），tsc 干净，单文件构建 31.27KB。
- **浏览器冒烟**（集成层补 units 盲区）：按 3 进 VS → mode=VERSUS/P1(12,2)UP/P2(0,10)DOWN/enemyTotal=0/双基地渲染/VS HUD 比分行/中立护盾实时刷出，截图 r8-versus-entry.png 留证。

## 已知残留

- VS 平衡未调（双基地距离/护圈厚度 vs「偷家秒胜」手感，PRD 反例段盲点声明续挂）；属人工体验项，按 §1 定位裁定不在验收范围。
- best-of-3 同帧双负（两基地同帧被毁）走「P1 优先」简化，未做平局——极低概率边界，已注释。
