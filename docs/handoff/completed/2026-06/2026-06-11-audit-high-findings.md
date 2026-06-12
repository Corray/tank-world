---
date: 2026-06-11
from: PM/SA（audit 第二轮）
to: 执行层
priority: HIGH
related:
  - docs/audit/2026-06-11-spec.md
  - docs/audit/2026-06-11-data-model.md
  - docs/audit/findings-registry.md
kind: fix-dispatch（HIGH 例外独立 handoff）
status: completed
---

# Audit 第二轮 HIGH 发现 ×2 + 时限项 ×1

> artifact-based-handoff §HIGH 级别例外：凡 HIGH 必须独立 handoff，不沉底 /fix backlog。

## H1 — F-SPEC-20260611-509b：README 全面停更（HIGH）

仍写五轮/共识 v5/四档/3 道具；模式列表与键位缺 VS(3)/MELEE(4)/WAVE(5/6)。README 是 Pages 对外门面 + audit spec 输入映射成员（#15 教训二次复发）。
**期望**：本周内按 R7~R13 现状重写（13 轮/v12/八档/7 道具/六模式键位/277 测试）。

## H2 — F-DM-20260611-36e1：data-model 停更于 R7（HIGH）

R8~R13 六轮契约增量全缺失（约 30 常量 + 3 GameMode + 4 GameState + 5 PowerupType + EnemyType.BOSS + World 7 字段 + 2 存档档位）——契约层 SSoT 失效。
**期望**：本周内补全六轮增量 + 状态机 4 新值转换表 + 八档位统一清单（da4f/6226 同源可并修）。

## 时限项 — F-PROC-20260611-999d：CI Node20 弃用（MEDIUM 但硬时限 2026-06-16，5 天）

checkout@v4/setup-node@v4/upload-pages-artifact@v3 + node-version:20 → GitHub 强制 Node24。CI 是唯一 required check + 部署管道。
**期望**：独立 chore PR 升级 actions 版本 + node-version（触 .github/ 走 PR+CI 通道）。

## 验证场景（Check）

| 步骤 | 操作 | 预期 |
|------|------|------|
| A-1 | 读 README | 13 轮/六模式/键位 2~6/八档/277 测试全反映 |
| A-2 | 读 data-model.md 版本表 | 含 R8~R13 增量条目，版本 ≥ v6 |
| A-3 | gh run（chore PR 后） | CI 在 Node24 下 test+deploy 双绿 |

其余 25 条 MEDIUM/LOW 已在 findings-registry（proposed），按正常 /fix 节奏消化，不需等本 handoff。

---

## 完成记录（2026-06-12 by fix 轮）

- H1 README：整体重写（52 行，六模式/键位/八档/7 道具/CI 徽标验证真实）✓
- H2 data-model：v6 补全 §39~45（六轮增量+状态机 4 新值+八档清单，常量逐值核对）✓
- 时限项 CI：chore PR #24 merge dc4ea00，Node24 实测 test 绿 ✓
- 验证场景 A-1/A-2 通过；A-3 通过（PR #24 CI）
