# tank-world — Project Context

> **本文件 = 项目级 agent 上下文。** 会话启动时与 `~/.claude/CLAUDE.md`（全局）同时加载。
> 基于 agent-dev-standard `templates/CLAUDE.md.template` 生成（install 时点 2026-06-04 / standard@d38b215）。

---

## §Standard 路径（用户本地化字段）

```yaml
standard_path: /Users/chat/backend-ai-workflow/agent-dev-standard
```

引用 standard 文档时用绝对路径 `<standard_path>/docs/...` 展开。全局 `~/.claude/CLAUDE.md` 已 `@import` 19 条核心 rules，本字段仅用于项目级扩展引用。

---

## 项目元数据

| 字段 | 值 |
|------|----|
| **名称** | `tank-world` |
| **类型** | `business` |
| **流派** | `github` |
| **技术栈** | Web 游戏（JS/TS，浏览器端）`[TBD: 具体框架/构建工具待定型后补]` |
| **代码仓库（本地目录名）** | `tank-world`（单仓：代码 + docs 同仓） |
| **共享文档仓库** | 本仓 `docs/`（无独立 hub 仓） |
| **env.yaml 路径** | `docs/env.yaml` |
| **主干分支** | `master`（见 git-workflow rule §1，PR 合入，不直推） |

---

## Standard 引用（基础规则）

本项目采用 **agent-dev-standard** 工作规范。全局 `~/.claude/CLAUDE.md` 已 `@import` 全部核心 rules（spec-to-code-flow / problem-handling-pattern / artifact-based-handoff / task-lifecycle / issue-handling / fix-pattern-scan / research-first / git-workflow / security-review / tech-debt 等），无需重复引用。

项目级协议副本：`.claude/protocols/`（issue-process / issue-classification / async-review / role-taxonomy / rule-coverage / spec-tracker-sync / task-isolation-judgment；TAPD 系协议未装——本项目 GitHub 流派）。

### 架构约束适用范围声明（重要 — audit 误报防御）

`architecture-constraints.md` 中以下条款为 **Java/DDD 专属，本项目（JS/TS Web 游戏）不适用**：

- §1/§2 DDD 分层（Application/Domain/Adapter module 划分、Gateway 接口模式）
- §5 MapStruct 对象转换
- §6 DDL/索引评估（本项目暂无数据库；若引入则按 ddl-migration rule 补声明）
- §8 Java 线程池约束（JS 单线程模型；Web Worker 引入时另行约定）
- §10.1 Spotless + Google Java Format（非 Java；JS/TS 格式化工具定型后在此声明）

**仍然适用**：§9 日志约束、§10.2 代码中禁中文、§10.3 魔法值/枚举约束、第三方调用封装原则（§7 精神）。

---

## Issue 配置

| 项 | 值 |
|---|---|
| `issue_platform` | `github` |
| `issue_repo` | `[TBD: 仓库尚未建 GitHub remote，建 remote 后回填 owner/repo 并同步 24 labels]` |
| `doc_repo` | `./docs`（本仓内） |
| `adr_path` | `docs/adr` |
| `code_path` | `src` |
| `compile_cmd` | `[TBD: package.json 建立后填，预期 npm run build]` |
| `role` | `be` |

> 本项目 Issue / Bug 处理遵循 `rules/core/issue-handling.md`（5 场景纪律，Iron Law: NO HANDOFF WITHOUT EXPLICIT SCENARIO + COMMENT FIRST）+ `.claude/protocols/issue-process.md` + `issue-classification.md`（Step 0.5 四分类）。

---

## Flow 工作模式（GitHub 流派）

- **agent 启动加载顺序：** `~/.claude/CLAUDE.md`（全局）→ 本文件 → `docs/env.yaml`（按需）
- **BE 任务收尾 3 件套：** commit / push / Issue comment（缺一不算闭环）
- **commit + push 硬门禁：** handoff 收尾未 push = 未完成
- **commit message：** Conventional Commits 中文风格（`feat(scope): 描述`），禁 auto-close 关键词（`fixes #N` 等），用 `refs #N`
- **工时管理：** 弱约束，无需逐任务记录

---

## 会话日志

- 项目 spool：`./spool.md`（主题完成时 `/spool` 追加，不攒到会话结束）
- 全局 sessions 索引：`~/.claude/sessions.md`

---

## 问题记录载体（problem-handling-pattern 落位）

| 载体 | 路径 |
|------|------|
| problem-registry | `docs/problems/problem-registry.md` |
| fb-index | `docs/problems/fb-index.md` |
| findings-registry（audit 产出） | `docs/audit/findings-registry.md` |
| handoff（多人协作通道） | `docs/handoff/{pending,in-progress,completed/YYYY-MM}/` |

---

## 项目特定 context（PM 维护）

### 业务定位
- Web 浏览器端坦克游戏 `[TBD: 玩法/单多人/目标平台待共识文档明确]`

### 当前 active 阶段
- 项目初建（2026-06-04 接入 standard 工作流，代码未起步）
- 下一节点：共识文档 →业务模块清单（spec-to-code-flow 入口）

### 项目特殊约束（如有）
- TBD

---

## 项目特定 rules（非必填）

- 无（暂无 standard 未覆盖的特殊约束）

---

## 待办（install 收尾项）

- [ ] 建 GitHub remote → 回填 `issue_repo` → 用 standard `templates/labels.yml.template` 同步 24 labels（`gh` CLI）
- [ ] package.json / 构建工具定型 → 回填 `compile_cmd` + 技术栈字段
- [ ] 第一个需求启动时走 spec-to-code-flow：共识文档 → 模块清单 →（后续节点）
- [ ] 跑过 1-2 个需求后 `/install audit` 补装审查 skill + audit-rotation-plan

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-06-04 | 初建（standard@d38b215 手动 install：issue + spool skill / 7 protocols / 3 registry / handoff 骨架） |
