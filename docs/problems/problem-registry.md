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
| P-20260604-8acf | 开发 | 2026-06-04 | standard-install | standard 仓库 `templates/business-gitignore.template` 含未解决 git 冲突标记（`<<<<<<< HEAD` / `>>>>>>> 78db933`），渲染产物会带冲突标记 | 缺陷 | 规则级 | proposed | agent-dev-standard@d38b215 |
| P-20260604-7852 | 开发 | 2026-06-04 | standard-install | standard 仓库 `install/modules/06-templates.sh` §7 .gitignore 段含未解决 git 冲突标记，直接跑 install.sh 会在 module 06 报语法错误中断 | 缺陷 | 规则级 | proposed | agent-dev-standard@d38b215 |

<!-- 新发现追加上方 -->

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-06-04 | 初建 |
