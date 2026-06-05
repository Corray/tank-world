# Audit 报告 — architecture phase（2026-06-05 首轮）

**范围：** architecture.md + modules.md ↔ src/ 实际结构 | **结论：** 1 发现（MEDIUM，文档停更类）

| 编号 | 严重度 | 分类 | 发现 |
|------|--------|------|------|
| F-ARCH-20260605-4c50 | MEDIUM | 偏差（停更） | architecture.md 停在 v1：§2 目录结构列 8 模块+tests，实际 src/ 为 **14 个模块目录**（level/powerup/storage/effects/audio/achievements 六个增量模块缺席）；§3.2 每帧管线缺 updatePowerups/updateEffects 步骤、未反映 players[] 复数化与双输入通道；modules.md 的 v1 依赖图同样未随增量更新（v2~v5 仅以增量表记录，图未重绘） |

**正向比对：** 技术选型四件套（TS/Canvas/Vite singlefile/Vitest）↔ 实际依赖 ✓；ADR-001 反转条件未触发 ✓；core 唯一持有 World、碰撞集中 combat、render/hud 只读三条约束抽查 ✓（grep 无模块间隐式全局引用）。
**反向比对：** .github/workflows（CI）已被共识 v5 §3.18 覆盖 ✓；无 spec 外架构产物。
