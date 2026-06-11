# Registry INSERT 建议 — behavior phase（2026-06-11）

> 产出方：audit-agent（只能 INSERT proposed，不 UPDATE 既有行）。
> 消费方：父会话/PM 代 INSERT 到 `docs/audit/findings-registry.md`「Behavior 审查」段；消费后归档本文件至 `docs/audit/processed-proposals/`。

## 建议 INSERT（status=proposed）

| 编号 | 严重度 | 分类 | 摘要 | 报告 | 状态 |
|------|--------|------|------|------|------|
| F-PROC-20260611-999d | MEDIUM | 风险 | CI Actions Node20 运行时弃用未处理（checkout@v4/setup-node@v4/upload-pages-artifact@v3 + node-version:20），2026-06-16 强制 Node24——CI 为唯一 required check + 部署管道，硬时限 5 天 | 2026-06-11-behavior.md | proposed |
| F-PROC-20260611-514f | MEDIUM | 偏差（停更复发） | 门面文档停更复发（6fd2 同家族二次发生）：CLAUDE.md active 阶段仍写六轮/PR#1~10（实际 13 轮/PR#23）；README（AC-46 面）仍写五轮/共识 v5/四档/3 道具，键位缺 3/4/5/6，引用不存在的 CI 徽标 | 2026-06-11-behavior.md | proposed |
| F-PROC-20260611-a872 | LOW | 偏差（状态滞后） | test-plan/INDEX.md R13 行仍标「待 PR 合入」，PR #23 已合入（98316c2）未回写 | 2026-06-11-behavior.md | proposed |
| F-PROC-20260611-6ac3 | LOW | 改进建议 | R13 骨架修正（wave.spec.ts T-WAV-6，合规：仅驱动方式/断言零改/留痕）混入 feat commit 3a94fba——建议骨架修正独立 commit（test(skeleton-fix) 前缀）保持 diff 审计边界 | 2026-06-11-behavior.md | proposed |

## 附注（非 INSERT 项）

- AC 覆盖无 ❌ 缺口（86 ✅ / 8 🔶 豁免冒烟 / AC-44 取代）；S2 零命中；R11/R12 骨架 diff 为空——均为通过项，不入 registry。
- 514f 为同模式二次发生（6fd2 → 514f），达 project-patterns 建档阈值；本项目尚无 `docs/problems/project-patterns.md`，建议 PM 定性时一并决策是否建档首条 PP（tendency：轮次收尾无门面文档同步触发）。

---

## 代 INSERT 完成记录（2026-06-11 by 父会话）

- 全部条目已 INSERT 到 docs/audit/findings-registry.md（状态 proposed）
- problem-registry 以一行聚合登记（对齐 R6 先例）
- 归档路径：docs/audit/processed-proposals/
