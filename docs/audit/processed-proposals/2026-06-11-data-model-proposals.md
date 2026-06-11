# Registry INSERT 建议 — 2026-06-11 data-model audit（第二轮）

> 消费方：父会话代 INSERT 到 `docs/audit/findings-registry.md`。
> 所有条目 status = `proposed`（audit-agent 硬约束：只 INSERT，不 UPDATE/DELETE）。
> 消费后请归档本文件至 `docs/audit/processed-proposals/`。

| ID | 严重度 | 分类 | 标题 | 位置 | 状态 | 来源 |
|----|--------|------|------|------|------|------|
| F-DM-20260611-36e1 | HIGH | 反向缺口/Spec 停更 | data-model 停更于 R7：R8~R13 六轮增量全缺失（VS/MELEE/升级/Boss/R12 道具三件/R13 波次，约 30 常量 + 3 GameMode + 4 GameState + 5 PowerupType + EnemyType.BOSS + World 7 字段 + 2 存档档位） | docs/spec/data-model.md（末节 §38）↔ constants.ts:117-198 / types.ts / world.ts:64-79 / storage.ts:95-112 | proposed | audit 2026-06-11 data-model |
| F-DM-20260611-da4f | MEDIUM | 状态机完整性 | GameState 11 值中 4 值（VERSUS_ROUND/VERSUS_OVER/WAVE_BREAK/WAVE_OVER）无任何状态机文档，非法转换家族断言断档 | data-model §4/§10/§20 ↔ types.ts:3-22 | proposed | audit 2026-06-11 data-model |
| F-DM-20260611-3bd0 | MEDIUM | 被取代无标注（F-DM-6bc0 同族复发） | 3 处被取代无标注：§29 player 别名（R6-D 已移除）/ §30 C17 穿透（R8/R9 isPvP 反转）/ §31 分叉清单（§35 v2 取代无前向指针）；一级 grep 5 命中全为存量标注 | data-model §29/§30/§31 ↔ world.ts:28-29 / combat.ts:242-258 | proposed | audit 2026-06-11 data-model |
| F-DM-20260611-4241 | LOW | 文档卫生 | 版本表停更：止于 v5 且"待 R5-G3 确认"未回写；R7 增量在文无 v6 条目 | data-model.md:3-9 | proposed | audit 2026-06-11 data-model |
| F-DM-20260611-64a0 | LOW | 正向偏差/命名漂移 | §3 实体表 v1 命名漂移残留：aiState{moveTimer,fireTimer} vs ai{turnMs,fireMs}；spawnTimer/spawnPointCursor vs spawnCooldownMs/spawnCursor | data-model §3 ↔ types.ts:151 / world.ts:47-48 | proposed | audit 2026-06-11 data-model |
| F-DM-20260611-be71 | LOW | 反向缺口（v1/R2 遗留） | BULLET_SIZE(8) / ENEMY_TURN_INTERVAL_MS(1500) 未入常量表（上轮仅补录 ENEMY_SPEED） | data-model §1/§13 ↔ constants.ts:24,49 | proposed | audit 2026-06-11 data-model |
| F-DM-20260611-6226 | LOW | 结构性 | 存档档位无统一清单：10 key 散落五节，"第六/七/八档"序数仅存在于代码注释 | data-model §14/§21/§26/§31/§36 ↔ storage.ts:3-12 | proposed | audit 2026-06-11 data-model |

## 备注（给定性方）

- 36e1 为 HIGH：若按 artifact-based-handoff §HIGH 级别例外，确认后需独立 handoff，不沉底 /fix backlog。
- 3bd0 与上轮 F-DM-20260605-6bc0 同族二次复发（同模式 ≥2 次）——可评估是否升 PP 条目（project-patterns："增量节取代早期段落不回写标注"tendency）+ 系统性建议 1（G3 硬性 checklist 项）。
- da4f / 6226 的缺失本体都含在 36e1 内，分列是为了维度独立定性（状态机/档位表结构），合并处理（merged-into 36e1）亦合理，由 review 方裁定。

---

## 代 INSERT 完成记录（2026-06-11 by 父会话）

- 全部条目已 INSERT 到 docs/audit/findings-registry.md（状态 proposed）
- problem-registry 以一行聚合登记（对齐 R6 先例）
- 归档路径：docs/audit/processed-proposals/
