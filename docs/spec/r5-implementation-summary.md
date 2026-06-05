# R5 实现总结（L2）

**日期：** 2026-06-05 / **分支：** feature/r5-coop-pipeline / **关联：** PRD R5（accepted）、共识 v5、数据模型 §29~34

## 背景

定位裁定（流程实验场）后的首轮：本地双人合作压测「破坏单数假设的结构性重构」，CI+Pages 压测发布管道维度。验证债 dismissed、双人触发条件改判废除均已留痕。

## 做了什么

- **V1 复数化**：`world.player` → `players: PlayerTank[]`（唯一状态）+ 兼容外缘（players[0] 只读别名 getter + damagePlayer/firePlayerBullet/updatePlayer 默认参）——**基线 147 块零修订兑现**
- **V2/V3 双人**：READY+2 进 COOP；双输入通道（SOLO 合并键位/COOP 分离键位）；C6′/C11′/C13′/C17 碰撞扩展；per-player 发射权与道具归属；子弹 playerId 计分归属；全员判负；best-coop 独立档；成就与无尽 COOP gate
- **V4 管道**：转 public；CI（PR→tsc+vitest 门禁 / master→build+Pages 部署）；master 分支保护 required check=test（补 git-workflow §1 四轮豁口）；README+双人截图
- **V5 验收**：166/166；真实键盘双通道并行实证；**CI 门禁在 PR #5 上自验通过**

## 关键决策与思考

1. **兼容外缘是「彻底复数化」的正确打开方式**：状态唯一在 players[]，别名 getter 零状态复制——147 块基线零修订证明「大重构不必然打爆测试资产」，关键在断言强度预判（R4 教训方法首次全程应用，预判 100% 命中）
2. **C17 友军穿透零代码**：玩家子弹本就只查敌人表——白名单碰撞设计第二次免费兑现扩展（第一次是 R4 子弹穿新地形）
3. **输入通道按 press-order 重写**：从「方向数组+开火布尔」改为「按键序列+映射推导」，SOLO/COOP 仅映射表不同——模式分叉收敛到数据而非逻辑
4. **CI 的 deploy/test 分 job**：PR 只跑 test（快），master 才 build+部署——AC-45 在本 PR 上自验是流程闭环的优雅时刻

## 预判与偏离记录（dogfood 数据）

- **预判兑现**：「基线零修订」预判（含断言强度扫描）100% 命中——R4 失误教训形成的方法第一次完整验证
- **偏离发现**：复数化的**编译原子性**（World 结构不能半改）把骨架先行窗口挤掉，coop 骨架后置为验证规格——test-skeleton-lock 在「大重构型 feature」上的真实边界，dogfood 报告增量素材

## 影响范围

8 个模块复数化改造 + input 重写 + CI 管道（~350 行变更）；基线零修订；别名 getter 为显式技术债（R6 清理候选）。

## 已知残留

- Pages 首次部署随 PR 合入触发（M-R5-3 合入后复验）
- 键盘 ghosting：部分键盘 3 键以上同时按可能丢键（硬件限制，README 不另声明，留此记录）
- 别名 getter 清理 + 2P 无尽/成就开放 = R6 候选
