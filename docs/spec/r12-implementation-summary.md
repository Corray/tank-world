# R12 实现总结（L2）

**日期：** 2026-06-11 / **分支：** feature/r12-powerups / **关联：** PRD R12、共识 v11 §3.25、AC-81~87、test-plan-r12（分叉清单 v6 + 基线冲击预判）

## 背景与做了什么

道具补全·经典三件——SHOVEL（基地护圈临时变钢+到期回砖）/ FREEZE（全场 NPC 定身）/ LIFE（加命无上限）。掉落循环 4→7（尾部追加保留前缀），VS 中立池 3→4 仅加铲。首个**非 per-player 定时全局效果**（shovelUntil per-base / freezeUntil 全局时钟）。

## 关键决策与思考

1. **freezeUntil 全局时钟而非逐敌标记**：updateEnemies 顶部一行门控 `clock < freezeUntil → return`——移动/射击/AI 计时一并停；窗口内新出生 NPC 天然冻结（AC-83 的「同冻」语义零额外代码），含 Boss。
2. **shovelUntil per-base（Record<1|2>）**：PvE/COOP 恒侧 1（共享基地——COOP P2 拾铲加固的是共同基地，applyEffect 用 `isPvP(mode) ? picker.id : 1` 一个决策点收口）；VS/MELEE 双方各自时钟互不干扰。
3. **到期全恢复为砖 = 免快照字段**：经典 Battle City 行为（含拾取前已毁格），restoreBrickCells 直接置 BRICK+SUB_ALL 满掩码——不需要存「拾取时状态快照」，状态机少一层。
4. **重置点零清理负担**：loadLevel/setupVersus 重建 GameMap，护圈地形随新图自然复位——重置点只需清两个时钟（不跨关不跨局，AC-86）；与 STAR「loadLevel 故意持久」构成重置点矩阵「持久 vs 重置」对照样本。
5. **VS 池仅加铲**：FREEZE 在纯 PvP 无目标、LIFE 拖 best-of-3 节奏（R8 双条件胜负之一是清命数）——拍板留痕 OPEN-R12-1/4。

## 增量 7 教训的预防性应用（第三证，本轮唯一预判修订精确兑现）

- G3 预判：穷举映射唯一缺口 = render `LETTER: Record<PowerupType,string>`；数据内容断言唯一冲击 = T-PWR-1（4-cycle wrap）。
- 实测：tsc 在结构层阶段**只报 LETTER 一处**（预判 1:1 命中）；全量转绿过程中**唯一基线修订 = T-PWR-1 改 8 次掉落断言 7-cycle wrap**（预判内，留痕注释），其余 249 测试零触碰。
- 方法链状态：R10 事后被拦 → R11 事前预补 → **R12 预判与实测 1:1**——「穷举映射/数据内容断言」家族方法已稳定内化。

## 影响范围

6 文件（实现）：types（PowerupType +3）、constants（SHOVEL_MS/FREEZE_MS/BASE_RING）、world（freezeUntil/shovelUntil 字段）、powerup（7-cycle/VS 4-cycle/applyEffect 3 case/updateShovel）、map（fortifyCells/restoreBrickCells）、enemy（冻结门控一行）、level（两重置点清零）、update（接 updateShovel）、render（LETTER +3 图标 ⛏❄♥）。combat/judge/hud/achievements **零改**（命数 HUD 读 p.lives 涌现正确；COLLECTOR_TYPES 维持 3）。

## 验收实证

- **机器可验**：263/263（249 既有 + 14 T-ITM-*，唯一基线修订 T-PWR-1 预判内），tsc 干净，单文件 33.84KB（+0.93KB）。
- **骨架锁定**：`git diff 293e124 -- tests/items.spec.ts` 空（11 FAIL→PASS 唯一路径未篡改；3 守护锁定时先绿）。
- **浏览器冒烟（dev `__world` 注入活体实证）**：铲子拾取 → 护圈五格全钢渲染（截图）；LIFE → HUD LIVES 3→4；FREEZE → 敌坦克 700ms 位置纹丝不动；Collector 成就经 ⛏❄♥ 三新道具自然解锁（3/7 语义放宽活体复证）；❄/♥/⛏ 图标渲染实证。

## 已知残留

- 铲子激活瞬间停在护圈格上的坦克可能被钢墙暂困——经典同款行为，体验项不在验收（test-plan-r12 §5 留痕）。
- FREEZE 不停已发射子弹（冻坦克不冻弹道）——经典语义，spec 未承诺。
- 数值未调参（15s 铲 / 8s 冻为〔默认〕）——体验项。
