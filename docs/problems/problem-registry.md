# Problem Registry

**初始化日期**: 2026-06-04
**数据来源**: findings-registry（audit 产出）+ GitHub Issues + 开发中发现

> 项目级质量模式（tendency）见 `project-patterns.md`（可选独立文件） — 记录此项目特别容易犯哪几类错（PP-NNN）。

> **编号格式 Migration(ADR-008 / 2026-05-25 起 / 多 dev 并发防撞号):**
> - 既有 `P-NNN`（如 P-042）保留 / 不迁移 / 既有 ref 仍可用
> - 新 entry 用 `P-YYYYMMDD-{4-char-hash}` 格式(如 `P-20260525-a1b2`)
> - 编号生成: `code/scripts/generate-id.sh P`
> - 详见 `docs/docs/adr/ADR-008-multi-dev-concurrent-id-schema.md`

---

## 字段约定

| 字段 | 含义 |
|------|------|
| 编号 | `P-NNN` 项目内连续递增 |
| 来源 | `audit` / `issue` / `开发` / `用户反馈` 等 |
| 日期 | 首次记录日期 |
| 模块 | 业务模块名 |
| 标题 | 一句话描述 |
| 类型 | 缺失 / 偏差 / 风险 / 改进建议 |
| 层级 | 项目级 / 规则级（规则级会被上报全局）|
| 状态 | 见下文状态枚举 |
| 关联 | 关联 finding ID / Issue # / commit hash 等 |

---

## 状态枚举

与 findings-registry 一致：proposed / confirmed / fixing / resolved / dismissed / deferred / merged / escalated。

---

## 条目（按时间倒序，最新在顶部）

| 编号 | 来源 | 日期 | 模块 | 标题 | 类型 | 层级 | 状态 | 关联 |
|------|------|------|------|------|------|------|------|------|
| F-SPEC-20260605-5c55~98ef / F-ARCH-4c50 / F-DM-6bc0 / F-PROC-6fd2,50a9,e0e8 | audit | 2026-06-05 | spec/arch/dm/proc | 首轮全量审查 8 发现（5 MEDIUM / 3 LOW）：取代标注家族×7、两文档停更、CLAUDE.md 过时、直推与分支保护冲突、Code Map 缺——详见 findings-registry 与 docs/audit/2026-06-05-*.md | 偏差/风险/缺失 | 项目级 | proposed | R6-B 首轮审查 |
| P-20260605-88ee | 开发 | 2026-06-05 | 验证流程 | 验证债：4 项人工终验跨 4 轮挂账。**dismissed（2026-06-05 用户拍板）：项目定位确认为 agent-dev-standard 流程实验场，产品体验验证不在项目目的内**——非赖账，是范围裁定；若定位将来变更回产品，本条恢复 deferred | 风险 | 项目级 | dismissed | R5 PRD 定位拍板 / 共识 v5 |
| P-20260604-8acf | 开发 | 2026-06-04 | standard-install | 【最终定性】`business-gitignore.template` 冲突标记 = standard 本地**挂起 2 周的未完成 merge**（MERGE_HEAD=78db933）的工作区中间态；从未进任何 commit。已解决：merge d008ce0 完成并推送 | 缺陷 | 项目级（本地） | resolved | d008ce0 / FB 候选 conflict-marker-guard-gap |
| P-20260604-7852 | 开发 | 2026-06-04 | standard-install | 【最终定性】`06-templates.sh` 同上——未完成 merge 工作区中间态，非提交内容。已解决：取 theirs + bash -n 冒烟全过 + merge d008ce0 推送 | 缺陷 | 项目级（本地） | resolved | d008ce0 / FB 候选 conflict-marker-guard-gap |

<!-- 新发现追加上方 -->

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-06-04 | 初建 |
| 2026-06-04 | P-7852 / P-8acf 勘误：核实远端 origin/main 干净，冲突标记仅本地未推送 merge commit；规则级→项目级（本地），proposed→confirmed |
| 2026-06-04 | P-7852 / P-8acf 最终定性 + resolved：标记实为挂起 2 周未完成 merge 的工作区中间态（无任何 commit 含标记，第二版勘误"在 d38b215 内"亦不准确）；merge 已完成（d008ce0）推送，install.sh 恢复可用 |
