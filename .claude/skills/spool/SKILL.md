---
name: spool
description: Append topic summary to the project session spool log. Use when a topic/milestone is complete, to capture it before context compression or session end.
disable-model-invocation: false
installed-from: agent-dev-standard@d38b215
installed-on: 2026-06-04
---

# /spool — 项目会话日志追加

**目的：** 主题完成时主动追加 spool 条目，不攒到会话结束。防止上下文压缩丢失关键决策 / 产出。

**动机：** CLAUDE.md 里"主题完成时主动追加"是描述型约束，对 AI 默认行为效果有限。本 skill 是机制化入口——提供显式工具，配合 task-lifecycle 集成 + `/wrap-up` 前置扫描形成兜底。

> **起源：** 反哺自团队 rule 基线（absorbed-from-rule: 8b51731）/ standard 独立维护 / 不回流（standard 版与基线各自演化）。

---

## 输入

- `$ARGUMENTS`（可组合）：
  - `--topic="<short label>"` — 主题标签（如 `issue-#26 skill 反哺落地`）
  - `--summary="<text>"` — 显式摘要文本；不提供则 AI 从最近上下文自动提炼
  - `--session-role="<role>"` — 会话角色（如 `<project> 执行层`），首次创建当日 section 用
  - `--dry-run` — 只展示将要写入的内容，不实际写入

**示例：**
```
/spool --topic="issue-#26 skill 反哺落地" --summary="4 skill 升 product 化；P1~P7 落地；双仓 sync。"
/spool   # AI 自动判断 topic/summary
/spool --dry-run --topic="xxx"
```

---

## Spool 位置

| Scope | 路径 | 维护者 |
|-------|-----|-------|
| project | `<project-root>/spool.md` | 项目执行层会话 |

- 本 skill 写**项目 spool**（`<project>/spool.md`）——install 时在项目 CLAUDE.md「会话日志」段配置路径。
- 路径以 install 配置 / 项目 CLAUDE.md 为准；默认项目根 `spool.md`。

---

## 格式约定

**Spool 文件结构：**

```markdown
## YYYY-MM-DD · <session-role>

**<topic-1>：** <summary>

**<topic-2>：** <summary>

---

## YYYY-MM-DD · <session-role>

...
```

- 同一天同一角色 → 复用当日 section，追加新 topic
- 跨天 / 换角色 → 新建 section（先加 `---` 分隔符 + `## YYYY-MM-DD · <role>` 标题）
- topic 用粗体标题，summary 一段文字
- 主 section 之间用 `---` 分隔

---

## 执行流程

### Step 1 — 确定 session-role

session-role 从上下文推断或用默认 `<project-name> 执行层`（项目执行层会话）。

### Step 2 — 生成摘要（若 `--summary` 未提供）

1. 回顾最近上下文的主题主干（用户请求 + 执行动作 + 关键决策 + 产出物）
2. 生成 2~5 句话摘要，遵循格式约定
3. **不展开细节**——spool 是索引性日志，不是完整记录
4. **粘上关键路径**（产出物文件路径 / commit hash），方便将来回溯

### Step 3 — 读目标 spool 文件

1. 读 `spool.md` 末尾（spool 按日期**正序**排列，新条目追加到末尾）
2. 检查今天日期 + session-role 的 section 是否已存在：
   - **存在** → 追加 topic 到该 section 末尾
   - **不存在** → 新建 section

### Step 4 — 写入

1. `--dry-run` → 展示将要写入的内容，不写
2. 正常 → Edit 工具追加
3. 写入成功 → 一句话确认（不回报整个 spool 内容）

### Step 5 — 漏落检查（可选）

如果是主题完成时主动调用，在写入前问自己：
- 这个主题是否已经有 spool 条目？（避免重复写）
- 上一个主题的 spool 写了吗？（补漏）

如果被从 `/wrap-up` 或 task 收尾流程调用，可跳过此检查（宿主已处理）。

---

## 被其他 skill / 流程调用的场景

| 触发点 | 谁调 | 传参 |
|-------|------|-----|
| `/audit` Step 6 后 | audit skill | `--topic=audit-<phase>` |
| `/issue` Step 6b | issue skill | `--topic=issue-#N` |
| `/wrap-up` 前置扫描发现漏落 | wrap-up | 逐个补 |
| 用户主动触发 | 用户 | 视情况 |

---

## 约束

1. **不自动判定"主题完成"**——主题边界 AI 难识别，依赖宿主 skill 触发或用户显式调用
2. **幂等**——重复写同一主题不覆盖，追加前先检查（topic 标签匹配则跳过）
3. **摘要精炼**——只捕关键信息（who did what / decision / deliverables / open question）
4. **不替代 task 文件**——spool 是索引，task 文件是过程记录

---

## 与 /wrap-up 的分工

| 维度 | /spool | /wrap-up |
|------|--------|---------|
| 触发时机 | 主题完成时 / 被调用时 | 会话收尾时 |
| 产出 | 一条 spool 条目 | 完整收尾（spool + sessions + commit + push）|
| 频率 | 多次 / 会话 | 1 次 / 会话 |
| 范围 | 单主题 | 全会话扫描 |

`/wrap-up` 的 Step 1 会先扫描本次会话 spool 覆盖率，漏的主题调 `/spool` 补齐。

---

## Tier

**core / per-project** — 每个项目独立装一份到 `<project>/.claude/skills/spool/`（写项目 spool）。详见 ADR-005 skill tier 语义。
