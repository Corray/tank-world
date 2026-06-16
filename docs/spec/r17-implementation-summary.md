# R17 实现总结（L2）

**日期：** 2026-06-16 / **分支：** feature/r17-campaign-l45 / **关联：** PRD R17、共识 v16 §3.29、AC-106~109、test-plan-r17

## 背景与做了什么

战役 3→5 关（`LEVEL_COUNT` 3→5），+L4/L5 两关卡。本质是**基础常量 blast radius 压测**——验证派生项零改红利、修正硬编码债、量化影响面方法的预判精度。

## 关键决策与思考

1. **派生 vs 硬编码**：8 处 src 用 `LEVEL_COUNT` 表达 → 自动跟随零改（红利）；3 处硬编码债（enterEndless loadLevel(4)、variantLayout `level-4`、endlessConfig `level-3`）→ 改 LEVEL_COUNT 派生。这是本轮核心教训的正反样本。
2. **里程碑平移自洽**：战役终点 L3→L5、无尽里程碑 L8/L13/L18→L10/L15/L20，全部经 isBossLevel/bossTypeFor 的 LEVEL_COUNT 派生自动平移，三循环序数不变。
3. **ENDLESS_8 不派生**：成就名绑定数字 8，保字面 `level≥8`（副作用略易达成，已知接受）——派生与命名语义的取舍。
4. **endless 曲线平移不重构**：endlessConfig k 改 `level-LEVEL_COUNT`（保 k=1 起点），`18`/`2000` 基数 magic 未动（重构出范围）。副作用：L5(26 敌)→无尽 L6(20 敌) 有难度回落，属体验项〔默认〕。

## blast radius 影响面预判对账（本轮方法核心交付）

- **§2 预判 ~14 churn 站点；实测 35 站点**（含 1 个 var-name grep 漏网）。**~21 处未预判** = method-miss，价值在于暴露 grep 盲区：
  - **endless.spec 派生函数值测试**（T-EN-1 endlessConfig(L) 值断言、T-EN-2 variantLayout 骨架轮换、armored ratio）——我 grep 了 `LEVEL_COUNT`/`loadLevel(3)`/`GAME_COMPLETE`，但漏了**对派生函数的直接 value 断言**（endlessConfig/variantLayout 在特定 level 的输出值）。这些靠 level 参数 +2 保 k/baseIdx 不变即可平移。
  - **variant.spec 完全未 grep**（变量 baseIdx 公式变 → variantLayout(4) 负模崩溃）。
  - **coop-endless `loadLevel(w2, 3)`**：grep 模板 `loadLevel(world, 3)` 是 var-name 绑定的，漏了 `w2`。
- **实现期另发现 VARIANT_SLOTS 索引耦合**（§2 表外）：VARIANT_SLOTS 与 LEVELS 按 index 耦合（variantLayout 用 `VARIANT_SLOTS[baseIdx]`），LEVELS +2 而 SLOTS 不补 → 无尽 L9/L10 轮到 L4/L5 base 时 `undefined` 崩溃。补 2 组安全 EMPTY 槽位。
- **方法升级（dogfood）**：blast radius grep 必须含 ①派生函数的直接 value 断言（不只常量直接用法）②var-name 无关的模式（`loadLevel\(\w+, 3\)` 而非 `loadLevel(world, 3)`）③被改函数的 index-耦合数据结构。本轮「预判 → 实现 → 实测 fail-list 对账 → 补漏」流程本身是有效兜底——实测 fail-list 是真值源，预判是上限尝试。

## 影响范围

**src（5 改动点）**：constants（LEVEL_COUNT 3→5）；level（+L4_LAYOUT/L5_LAYOUT、LEVELS +2、VARIANT_SLOTS +2、enterEndless/variantLayout/endlessConfig 三债修正）。**派生零改验证**：update/achievements/hud 经 LEVEL_COUNT 自动跟随。
**tests（churn 35 处 + 新增）**：9 文件基线修订（boss/summoner/guardian/level/endless/variant/coop/coop-endless/achievements/regression-coop）+ campaign.spec.ts 新覆盖 5 块。

## 验收实证

- **机器可验**：301/301（296 既有，35 基线修订全部完成 + campaign.spec 5 新；零意外残留），tsc 干净，单文件 38.27KB（+1.05KB）。
- **新覆盖**：T-CAMP-1（5 关递进）/2（L4/L5 curated 配置）/3（L5 GAME_COMPLETE、L4 LEVEL_CLEAR）/4（无尽 L6 起）/5（里程碑 5/10/15/20）。
- **L4/L5 布局校验**：复用既有 T-MAPV-3/level.spec 不变量检查（base/ring/spawn/13×13/含三地形）全绿——新布局合规。
- 浏览器冒烟：本轮纯关卡数据+常量，逻辑由单测充分覆盖；视觉冒烟从略（受本会话工具通道限制，且无新视觉元素）。

## 已知残留

- 无尽难度回落（L5→L6 敌人数）——endlessConfig 基数 magic 未重构，体验项〔默认〕。
- ENDLESS_8 字面 8（略易达成）——已知接受。
- F-ARCH-5d32（update.ts 头注释）本轮触 update.ts 但仅 import 行（LEVEL_COUNT 已在），注释未顺带改——继续 deferred（拟 R18 调参轮收尾）。
