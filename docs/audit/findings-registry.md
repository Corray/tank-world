# Findings Registry

所有审查发现的统一索引。每条发现有唯一编号，追踪从发现到处置的全生命周期。

**首次初始化**：2026-06-04

## 条目（2026-06-05 首轮全量审查）

| 编号 | 严重度 | 分类 | 摘要 | 报告 | 状态 |
|------|--------|------|------|------|------|
| F-SPEC-20260605-5c55 | MEDIUM | 偏差 | consensus §3.2「同屏 1 发」与 v2 双发矛盾，无取代标注 | 2026-06-05-spec.md | resolved（R6-C 直修，commit 见 git log） |
| F-SPEC-20260605-0643 | LOW | 偏差 | consensus §3.2 出生点「基地左侧」过时 | 2026-06-05-spec.md | resolved（R6-C 直修，commit 见 git log） |
| F-SPEC-20260605-98ef | LOW | 缺失 | AC-21 未标注定位裁定豁免 | 2026-06-05-spec.md | resolved（R6-C 直修，commit 见 git log） |
| F-ARCH-20260605-4c50 | MEDIUM | 偏差 | architecture/modules 停更 v1（8 vs 14 模块、管线缺步骤、复数化未反映） | 2026-06-05-architecture.md | resolved（R6-C 直修，commit 见 git log） |
| F-DM-20260605-6bc0 | MEDIUM | 偏差（家族×5） | data-model v1 五处被取代无标注 + ENEMY_SPEED 未入表 | 2026-06-05-data-model.md | resolved（R6-C 直修，commit 见 git log） |
| F-PROC-20260605-6fd2 | MEDIUM | 偏差 | CLAUDE.md 项目 context 六轮未更新（「代码未起步」） | 2026-06-05-behavior.md | resolved（R6-C 直修，commit 见 git log） |
| F-PROC-20260605-50a9 | MEDIUM | 风险 | 文档直推 master 与分支保护冲突（bypass 实证），需决策 | 2026-06-05-behavior.md | confirmed（待用户决策：docs 走 PR vs 声明 bypass 例外） |
| F-PROC-20260605-e0e8 | LOW | 缺失 | Code Map 伴生产物六轮未建 | 2026-06-05-behavior.md | resolved（R6-C 直修，commit 见 git log） |

> **编号格式 Migration(ADR-008 / 2026-05-25 起 / 多 dev 并发防撞号):**
> - 既有 `F-XXX-NNN`(如 `F-SPEC-042`)保留 / 不迁移
> - 新 entry 用 `F-XXX-YYYYMMDD-{hash}` 格式(如 `F-SPEC-20260525-a1b2`)
> - 编号生成: `code/scripts/generate-id.sh F-SPEC`(或具体 phase prefix)
> - 详见 `docs/docs/adr/ADR-008-multi-dev-concurrent-id-schema.md`

---

## 编号空间约定

每个 audit phase 用独立编号前缀（项目可自定，建议规则）：

| Phase | 编号前缀 | 例 |
|-------|--------|----|
| Spec | `GAP-NNN` | GAP-001 |
| API | `API-NNN` 或 `API-<MODULE>-NNN` | API-001 / API-LLM-001 |
| Behavior | `BHV-NNN` | BHV-001 |
| Architecture | `ARCH-NNN` | ARCH-001 |
| Integration | `F-INT-NNN` | F-INT-001 |
| Data Model | `F-DM-NNN` | F-DM-001 |
| Issue Process | `IPR-NNN` 或 `IPR-T-NNN` (trend) | IPR-001 / IPR-T-001 |
| Code-Doc Gap | `GAP-CDG-NNN` | GAP-CDG-001 |
| Rule Coverage | `RC-NNN` | RC-001 |

---

## 状态枚举

| 状态 | 含义 |
|------|------|
| `proposed` | 新发现，待 review 确认 |
| `confirmed` | 已确认有效，进入处理 |
| `fixing` | 处理中（有对应 handoff / Issue / commit）|
| `resolved` | 已解决，有证据（commit / artifact）|
| `dismissed` | 排除（误报 / 测试噪声 / 范围外，需 reason）|
| `deferred` | 已确认但推迟（需触发条件）|
| `merged` | 合并到另一条（需 merged-into 引用）|
| `escalated` | 升级（严重度 / 重新分类 / 改编号）|

---

## 维护规则

- 每次 audit 产出新 finding → 在此追加条目（status=proposed）
- 状态变更时同步本文件 + 原 audit 报告末尾追加勘误（audit 报告 immutable）
- 编号一旦分配，不可重用、不可重号

---

## 条目（按 phase 分组）

### Spec 审查

| 编号 | 首次发现 | 当前状态 | 说明 | 关联 |
|------|---------|---------|------|------|
| GAP-001 | 2026-06-04 | proposed | <一句话标题> | <audit 报告路径> |

### API 审查

| 编号 | 首次发现 | 当前状态 | 说明 | 关联 |
|------|---------|---------|------|------|
| API-001 | 2026-06-04 | proposed | <一句话标题> | <audit 报告路径> |

### Behavior 审查

| 编号 | 首次发现 | 当前状态 | 说明 | 关联 |
|------|---------|---------|------|------|
| BHV-001 | 2026-06-04 | proposed | <一句话标题> | <audit 报告路径> |

<!-- 按需追加更多 phase 段 -->

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-06-04 | 初建 |
