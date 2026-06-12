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
| **技术栈** | TypeScript + Canvas 2D（无引擎）+ Vite(singlefile) + Vitest（ADR-001，G2 拍板） |
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
| `issue_repo` | `Corray/tank-world`（private，2026-06-04 建，24 labels 已同步） |
| `doc_repo` | `./docs`（本仓内） |
| `adr_path` | `docs/adr` |
| `code_path` | `src` |
| `compile_cmd` | `npm run build`（类型检查 `npx tsc --noEmit`；测试 `npx vitest run`） |
| `role` | `be` |

> 本项目 Issue / Bug 处理遵循 `rules/core/issue-handling.md`（5 场景纪律，Iron Law: NO HANDOFF WITHOUT EXPLICIT SCENARIO + COMMENT FIRST）+ `.claude/protocols/issue-process.md` + `issue-classification.md`（Step 0.5 四分类）。

---

## Audit 输入映射

| Phase | Spec 侧输入 | 实现侧输入 | 状态 |
|-------|------------|-----------|------|
| spec | `docs/prd/*.md` + `docs/spec/consensus.md` + `docs/spec/modules.md` + `README.md`（refs #15 堵反向盲区） | —（自身质量审查） | 启用 |
| architecture | `docs/spec/consensus.md` + `docs/spec/modules.md` + `docs/spec/architecture.md` + `docs/adr/` | `src/` 目录结构与管线 | 启用 |
| data-model | `docs/spec/data-model.md`（碰撞矩阵/常量表/状态机/分叉清单） | `src/core/constants.ts` + `src/core/types.ts` + 各模块实现 | 启用（替代 api phase：纯前端无 HTTP API，契约层 = 数据模型与模块间接口） |
| behavior | `docs/spec/consensus.md` §5 AC + `docs/spec/test-plan/` | `tests/` + CI | 启用 |
| api | — | — | **裁剪**：无 HTTP API（见 data-model phase） |
| integration | — | — | **裁剪**：无第三方服务/SDK（Web Audio/localStorage 为平台 API，归 data-model phase 对照） |
| issue-process | GitHub Issues + labels | — | 启用（按需） |

- `audit_dir`: `docs/audit/`
- 安全基线裁剪声明：S1 裸接口（无后端 Controller，N/A）/ S3 OAuth（无认证，N/A）/ S2 凭证扫描照常执行

## Flow 工作模式（GitHub 流派）

- **agent 启动加载顺序：** `~/.claude/CLAUDE.md`（全局）→ 本文件 → `docs/env.yaml`（按需）
- **BE 任务收尾 3 件套：** commit / push / Issue comment（缺一不算闭环）
- **commit + push 硬门禁：** handoff 收尾未 push = 未完成
- **commit message：** Conventional Commits 中文风格（`feat(scope): 描述`），禁 auto-close 关键词（`fixes #N` 等），用 `refs #N`
- **分支保护例外（F-PROC-50a9 决议 2026-06-05）：** docs-only commit（spec/prd/audit/registry/spool 等纯文档）允许 admin 直推 master（bypass required check）；任何触及 `src/`、`tests/`、构建配置的 commit **必须**走 PR+CI | 撤销触发：误把代码混入「文档直推」一次即收紧为全量 PR
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
- 经典坦克大战（Battle City 风格）：六模式（1P 战役+无尽 / CO-OP / VERSUS / MELEE / WAVE / CO-OP WAVE）、6 地形、7 道具、Boss 战、8 成就；在线可玩 https://corray.github.io/tank-world/
- **同时为 agent-dev-standard 流程实验场**（共识 v5 §1 定位裁定）：人工体验验证不在验收范围

### 当前 active 阶段
- 十三轮迭代完成（MVP/R2~R5 功能轮 + QA 修复轮 + R6 审计轮 + R7~R13 功能轮）+ R14 第二轮全量审计，PR #1~#24 全合入；两轮审计 = R6 / R14
- 代码地图见 `docs/spec/code-map.md`（v7）；R15 候选池：Boss 扩展、战役新关卡、调参轮

### 项目特殊约束（如有）
- TBD

---

## 项目特定 rules（非必填）

- 无（暂无 standard 未覆盖的特殊约束）

---

## 待办（install 收尾项）

- [x] 建 GitHub remote → 回填 `issue_repo` → 同步 24 labels（2026-06-04 完成，origin = git@github.com:Corray/tank-world.git）
- [x] package.json / 构建工具定型 → 回填 `compile_cmd` + 技术栈字段（2026-06-04 G2 拍板，ADR-001；npm 工程在实现阶段初始化）
- [x] 第一个需求启动走 spec-to-code-flow（2026-06-04：共识 v1.2 + 模块清单 + 架构均评审通过，G1/G2 已过）
- [x] 跑过 1-2 个需求后 `/install audit` 补装审查 skill（已装 .claude/skills/audit，R6/R14 两轮实跑；rotation-plan 以「玩法轮间隔穿插审计轮」节奏替代）

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-06-04 | 初建（standard@d38b215 手动 install：issue + spool skill / 7 protocols / 3 registry / handoff 骨架） |
| 2026-06-04 | 回填 issue_repo = Corray/tank-world（private）；24 labels 同步完成 |
