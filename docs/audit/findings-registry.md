# Findings Registry

所有审查发现的统一索引。每条发现有唯一编号，追踪从发现到处置的全生命周期。

**首次初始化**：2026-06-04

## 条目（2026-06-11 第二轮全量审查 — R7~R13 七轮增量）

| 编号 | 严重度 | 分类 | 摘要 | 报告 | 状态 |
|------|--------|------|------|------|------|
| F-SPEC-20260611-509b | HIGH | 偏差 | README R6 后停更：五轮/v5/四档/3 道具，模式列表缺 VS/MELEE/WAVE（#15 教训复发） | 2026-06-11-spec.md | resolved（R14-fix 直修，commit 见 git log） |
| F-SPEC-20260611-c7ae | MEDIUM | 偏差（取代漏标家族） | consensus §3.3「三类型/总数10/顶部出生/随机AI」被 §3.24/§3.7/§3.22/§3.9 取代无标注（含 AC-3） | 2026-06-11-spec.md | resolved（R14-fix 直修，commit 见 git log） |
| F-SPEC-20260611-2c1c | MEDIUM | 偏差（取代漏标家族） | consensus §3.1「钢墙不可破坏」+ AC-2 被 R10 L4 破钢部分取代无标注 | 2026-06-11-spec.md | resolved（R14-fix 直修，commit 见 git log） |
| F-SPEC-20260611-0886 | MEDIUM | 偏差（取代漏标家族） | consensus §3.6「胜利=10 辆全灭」停留 MVP 语境，未指向各模式胜负分叉 | 2026-06-11-spec.md | resolved（R14-fix 直修，commit 见 git log） |
| F-SPEC-20260611-9f8f | MEDIUM | 偏差（取代漏标家族） | consensus §3.7/§3.13 敌人总数未反映 R11 boss 关 enemyTotal+1 | 2026-06-11-spec.md | resolved（R14-fix 直修，commit 见 git log） |
| F-SPEC-20260611-6fe4 | MEDIUM | 偏差（取代漏标家族） | consensus §3.10「两档最高分」已扩为八档无标注 | 2026-06-11-spec.md | resolved（R14-fix 直修，commit 见 git log） |
| F-SPEC-20260611-f506 | MEDIUM | 偏差（取代漏标家族） | consensus §3.8 道具表 3 行 + §2.1 F9「三种」未指引 7 类道具面（序列行已标、表未标） | 2026-06-11-spec.md | resolved（R14-fix 直修，commit 见 git log） |
| F-SPEC-20260611-0fb1 | LOW | 缺失 | consensus §3.4 操作总表未汇集 R3~R13 新键位（M/R/2/3/4/5/6/Enter） | 2026-06-11-spec.md | resolved（R14-fix 直修，commit 见 git log） |
| F-SPEC-20260611-85b4 | LOW | 偏差（取代漏标·轻微） | consensus §3.9 ARMORED「朝向玩家」未标 2P 后「最近存活玩家」语义 | 2026-06-11-spec.md | resolved（R14-fix 直修，commit 见 git log） |
| F-SPEC-20260611-2625 | LOW | 风险 | PvP 玩家弹×玩家弹相消/穿透行为共识全文未声明，需按实现回写 | 2026-06-11-spec.md | resolved（R14-fix 直修，commit 见 git log） |
| F-SPEC-20260611-39bc | LOW | 缺失 | modules.md 覆盖性自检段停更于 v1.1（仅 F1~F6/AC-1~11） | 2026-06-11-spec.md | resolved（R14-fix 直修，commit 见 git log） |
| F-ARCH-20260611-e75d | MEDIUM | 偏差（复发） | architecture.md 停更 v2：R7~R13 七轮欠账（状态机 7→11 态/管线缺步骤/五模式零提及）；F-ARCH-4c50 同模式复发，根治=补维护约定 | 2026-06-11-architecture.md | resolved（R14-fix 直修，commit 见 git log） |
| F-ARCH-20260611-608f | MEDIUM | 风险 | combat↔player 运行时值导入循环依赖，无文档标注；modules combat 依赖列仅写 map 实际六依赖 | 2026-06-11-architecture.md | resolved（R22 代码层拆除：damagePlayer 归位 combat，ADR-004，T-ARCH-1 不变量守护；文档已 deferred 段同步清） |
| F-ARCH-20260611-dd56 | MEDIUM | 缺失 | ADR 缺口：R8 judgeVersus/isPvP 家族抽象 + R13 advance WAVE_BREAK 分支（修订 AC-11 冻结原则）均达 LMP §四 触发，docs/adr 仅 ADR-001 | 2026-06-11-architecture.md | resolved（ADR-002/ADR-003 回溯落档） |
| F-ARCH-20260611-291d | LOW | 偏差 | code-map v7 查找表「五档+muted」与自身 v7 变更行「第七八档」内部不一致 | 2026-06-11-architecture.md | resolved（R14-fix 直修，commit 见 git log） |
| F-ARCH-20260611-2016 | LOW | 偏差 | modules.md 自检段停更 + 模块依赖图 R6 后七轮未更新 | 2026-06-11-architecture.md | resolved（R14-fix 直修，commit 见 git log） |
| F-ARCH-20260611-5d32 | LOW | 偏差 | update.ts 头注释引用 v1 旧管线（缺 powerups/shovel/effects） | 2026-06-11-architecture.md | deferred（src 注释改动待下一触 src 的 PR 顺带修，不单开 PR） |
| F-DM-20260611-36e1 | HIGH | 缺失/停更 | data-model 停更于 R7：R8~R13 六轮契约增量全缺失（约 30 常量+3 GameMode+4 GameState+5 PowerupType+EnemyType.BOSS+World 7 字段+2 档位） | 2026-06-11-data-model.md | resolved（R14-fix 直修，commit 见 git log） |
| F-DM-20260611-da4f | MEDIUM | 缺失 | GameState 4 新值（VERSUS_ROUND/OVER、WAVE_BREAK/OVER）无状态机文档，非法转换断言断档 | 2026-06-11-data-model.md | resolved（R14-fix 直修，commit 见 git log） |
| F-DM-20260611-3bd0 | MEDIUM | 偏差（取代漏标家族复发） | data-model 3 处被取代无标注：§29 player 别名（已移除）/§30 C17 穿透（isPvP 已反转）/§31 分叉清单无前向指针 | 2026-06-11-data-model.md | resolved（R14-fix 直修，commit 见 git log） |
| F-DM-20260611-4241 | LOW | 偏差 | data-model 版本表止于 v5 且「待 R5-G3 确认」未回写 | 2026-06-11-data-model.md | resolved（R14-fix 直修，commit 见 git log） |
| F-DM-20260611-64a0 | LOW | 偏差 | §3 实体表 v1 命名漂移残留（aiState vs ai{turnMs,fireMs} 等） | 2026-06-11-data-model.md | resolved（R14-fix 直修，commit 见 git log） |
| F-DM-20260611-be71 | LOW | 缺失 | BULLET_SIZE/ENEMY_TURN_INTERVAL_MS 未入常量表（v1/R2 遗留） | 2026-06-11-data-model.md | resolved（R14-fix 直修，commit 见 git log） |
| F-DM-20260611-6226 | LOW | 改进建议 | 存档档位无统一清单：10 key 散落五节，档位序数仅存代码注释 | 2026-06-11-data-model.md | resolved（R14-fix 直修，commit 见 git log） |
| F-PROC-20260611-999d | MEDIUM | 风险 | CI Actions Node20 弃用未处理（2026-06-16 强制 Node24，硬时限 5 天），CI 为唯一 required check+部署管道 | 2026-06-11-behavior.md | resolved（chore PR #24 merge dc4ea00，Node24 实测绿） |
| F-PROC-20260611-514f | MEDIUM | 偏差（停更复发） | 门面文档停更复发（6fd2 同家族）：CLAUDE.md active 段六轮/PR#1~10（实际 13 轮/PR#23）；README 键位缺 3/4/5/6 | 2026-06-11-behavior.md | resolved（R14-fix 直修，commit 见 git log） |
| F-PROC-20260611-a872 | LOW | 偏差 | test-plan/INDEX.md R13 行「待 PR 合入」未回写（PR #23 已合入） | 2026-06-11-behavior.md | resolved（R14-fix 直修，commit 见 git log） |
| F-PROC-20260611-6ac3 | LOW | 改进建议 | R13 骨架修正混入 feat commit——建议骨架修正独立 commit 保持 diff 审计边界 | 2026-06-11-behavior.md | resolved（PP-20260612-3a82 落档，下轮起执行） |

## 条目（2026-06-05 首轮全量审查）

| 编号 | 严重度 | 分类 | 摘要 | 报告 | 状态 |
|------|--------|------|------|------|------|
| F-SPEC-20260605-5c55 | MEDIUM | 偏差 | consensus §3.2「同屏 1 发」与 v2 双发矛盾，无取代标注 | 2026-06-05-spec.md | resolved（R6-C 直修，commit 见 git log） |
| F-SPEC-20260605-0643 | LOW | 偏差 | consensus §3.2 出生点「基地左侧」过时 | 2026-06-05-spec.md | resolved（R6-C 直修，commit 见 git log） |
| F-SPEC-20260605-98ef | LOW | 缺失 | AC-21 未标注定位裁定豁免 | 2026-06-05-spec.md | resolved（R6-C 直修，commit 见 git log） |
| F-ARCH-20260605-4c50 | MEDIUM | 偏差 | architecture/modules 停更 v1（8 vs 14 模块、管线缺步骤、复数化未反映） | 2026-06-05-architecture.md | resolved（R6-C 直修，commit 见 git log） |
| F-DM-20260605-6bc0 | MEDIUM | 偏差（家族×5） | data-model v1 五处被取代无标注 + ENEMY_SPEED 未入表 | 2026-06-05-data-model.md | resolved（R6-C 直修，commit 见 git log） |
| F-PROC-20260605-6fd2 | MEDIUM | 偏差 | CLAUDE.md 项目 context 六轮未更新（「代码未起步」） | 2026-06-05-behavior.md | resolved（R6-C 直修，commit 见 git log） |
| F-PROC-20260605-50a9 | MEDIUM | 风险 | 文档直推 master 与分支保护冲突（bypass 实证），需决策 | 2026-06-05-behavior.md | resolved（决议：docs-only bypass 例外入 CLAUDE.md Flow 段，含撤销触发；代码类严格 PR） |
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
