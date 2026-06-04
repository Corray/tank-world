# ADR-001 — MVP 技术选型：TS + 裸 Canvas + Vite(singlefile) + Vitest

- **状态：** Accepted（2026-06-04，G2 评审用户拍板）
- **关联：** 共识文档 v1.2 / architecture.md v1

## Context

桌面浏览器单机坦克大战 MVP。硬约束：AC-9（60fps）、AC-10（file:// 直开可玩——Chrome 在 file:// 下禁 ES module 跨源加载，排除常规多文件 module 产物）、N4（状态 enum 化）、N5（程序化绘制零素材）。体量：13×13 格、峰值约 20 个活动实体、8 个逻辑模块。

## Decision

1. **语言 TypeScript（strict）** — 状态机密集（游戏状态/敌人类型/地形/子块），enum + union 编译期锁非法状态
2. **渲染裸 Canvas 2D** — 不引入引擎
3. **构建 Vite + vite-plugin-singlefile** — dev 热更；产物单 HTML 内联 JS，满足 file:// 直开
4. **测试 Vitest** — 同生态零额外配置

## Alternatives Considered

| 方案 | 未采纳原因 |
|------|-----------|
| Phaser 3 | +1.2MB bundle、引擎黑盒调试成本、概念学习成本；对 20 实体体量收益小于代价。**适用反转条件：** 后续若快速堆玩法（物理/粒子/瓦片地图编辑），重新评估 |
| PixiJS + 自写逻辑 | 只覆盖渲染（本项目最简单部分），逻辑仍手写，依赖白增 |
| 零构建纯 JS 单文件 | 与 8 模块结构冲突（1500+ 行单文件）、丢 TS / N4 enum 保障 |

## Consequences

**正面：** 零运行时依赖；产物几十 KB；全链路代码可控；Vitest 直接测逻辑模块。

**负面（已知代价）：**
- 主循环/输入/碰撞全手写（约 +30% 逻辑代码量 vs Phaser）
- 后续若上联机或大量 sprite 特效，渲染层需重写迁移（当初省下的引擎成本届时偿还）
- 新成员需熟悉 TS + 手写游戏循环的代码风格
