# Registry INSERT 建议 — architecture phase（2026-06-11）

> **状态：未消费。** 按 artifact-based-handoff §Consumer-Consumed Artifact 模式产出：audit-agent 只 INSERT 建议、不直接改 findings-registry。父会话消费（代 INSERT 到 `docs/audit/findings-registry.md` 条目表）后，将本文件移至 `docs/audit/processed-proposals/` 并在末尾 append 完成记录。
> 全部条目状态固定 `proposed`（audit-agent 硬约束：只 INSERT、不 UPDATE 既有行）。

## 建议 INSERT 行（findings-registry 表格式）

| 编号 | 严重度 | 分类 | 摘要 | 报告 | 状态 |
|------|--------|------|------|------|------|
| F-ARCH-20260611-e75d | MEDIUM | 偏差（复发） | architecture.md 停更 v2：R7~R13 七轮欠账（状态机 7→11 态、管线缺 updateShovel/spawnNeutralPowerup、advance WAVE_BREAK 分支修订「单一开关」原则未跟、五模式零提及、关联行过时）；与 F-ARCH-20260605-4c50 同模式复发 | 2026-06-11-architecture.md | proposed |
| F-ARCH-20260611-608f | MEDIUM | 风险 | combat ↔ player 运行时值导入循环依赖（damagePlayer ↔ moveTank/applySlide/firePlayerBullet），现靠函数提升工作、无文档标注；modules.md combat 依赖列仅写 map，实际六依赖 | 2026-06-11-architecture.md | proposed |
| F-ARCH-20260611-dd56 | MEDIUM | 缺失 | ADR 缺口：R8 judgeVersus 分叉 + isPvP 家族抽象（影响 5 模块、R13 复用成范式）与 R13 advance WAVE_BREAK 自动推进分支（修订 AC-11 冻结架构原则）均达 large-module §四 触发条件，docs/adr 仅 ADR-001 | 2026-06-11-architecture.md | proposed |
| F-ARCH-20260611-291d | LOW | 偏差 | code-map v7 查找表「存档档位」行写「五档 + muted」，实际七档（constants.ts 7 个 KEY_BEST_*），与自身 v7 变更行「第七八档」内部不一致 | 2026-06-11-architecture.md | proposed |
| F-ARCH-20260611-2016 | LOW | 偏差 | modules.md 覆盖性自检段停更（仅 F1~F6/AC-1~11，现 F26/AC-95）；模块间依赖图 R6 重绘后七轮未更新（VERSUS/MELEE/WAVE 路径与 combat→player 边缺位） | 2026-06-11-architecture.md | proposed |
| F-ARCH-20260611-5d32 | LOW | 偏差 | src/core/update.ts:1-2 头注释引用 architecture v1 旧管线（input→player→enemies→combat→judge，缺 powerups/shovel/effects），与停更文档双向失真 | 2026-06-11-architecture.md | proposed |

## 备注（供 review 定性参考）

- e75d 为复发项：建议 review 时同步评估系统性建议 1（architecture.md 加维护触发约定 + PP 落档），否则 v3 修完仍会三度复发。
- dd56 修复建议含 2 份 ADR-TBD（按 forward-reference integrity 不预占号，实装时 `ls docs/adr/` 取号）。
- 291d/2016/5d32 均为纯文档/注释直修类，可走 docs-only 直推例外（CLAUDE.md Flow 段 F-PROC-50a9 决议）。

---

## 代 INSERT 完成记录（2026-06-11 by 父会话）

- 全部条目已 INSERT 到 docs/audit/findings-registry.md（状态 proposed）
- problem-registry 以一行聚合登记（对齐 R6 先例）
- 归档路径：docs/audit/processed-proposals/
