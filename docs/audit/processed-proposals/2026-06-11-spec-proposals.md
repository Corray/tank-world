# Registry INSERT 建议清单 — /audit spec 2026-06-11

> 产出方：audit-agent（只能 INSERT proposed，不 UPDATE 既有行）。
> 消费方：父会话代 INSERT 到 docs/audit/findings-registry.md，消费后归档至 docs/audit/processed-proposals/。

## 建议 INSERT 行（findings-registry 表格行格式）

| 编号 | 严重度 | 分类 | 摘要 | 报告 | 状态 |
|------|--------|------|------|------|------|
| F-SPEC-20260611-509b | HIGH | 偏差 | README R6 后停更：五轮/v5/5 份测试计划/四档/3 道具/模式列表缺 VS/MELEE/WAVE（#15 教训复发） | 2026-06-11-spec.md | proposed |
| F-SPEC-20260611-c7ae | MEDIUM | 偏差（取代漏标家族） | consensus §3.3「三种类型/总数 10/顶部出生点/随机巡逻 AI」被 §3.24/§3.7/§3.22/§3.9 取代无标注（含 AC-3） | 2026-06-11-spec.md | proposed |
| F-SPEC-20260611-2c1c | MEDIUM | 偏差（取代漏标家族） | consensus §3.1「钢墙不可破坏」+ AC-2 被 R10 L4 破钢（§3.23/AC-72）部分取代无标注 | 2026-06-11-spec.md | proposed |
| F-SPEC-20260611-0886 | MEDIUM | 偏差（取代漏标家族） | consensus §3.6「胜利=10 辆全灭」停留 MVP 语境，未指向 §3.7 与各模式胜负分叉 | 2026-06-11-spec.md | proposed |
| F-SPEC-20260611-9f8f | MEDIUM | 偏差（取代漏标家族） | consensus §3.7 L3=18 与 §3.13 无尽总数公式未反映 R11 boss 关 enemyTotal+1（§3.24） | 2026-06-11-spec.md | proposed |
| F-SPEC-20260611-6fe4 | MEDIUM | 偏差（取代漏标家族） | consensus §3.10「两档最高分」已扩为八档（§3.13/§3.17/§3.19/§3.26）无标注 | 2026-06-11-spec.md | proposed |
| F-SPEC-20260611-f506 | MEDIUM | 偏差（取代漏标家族） | consensus §3.8 道具表 3 行 + §2.1 F9「三种」未指引 7 类道具面（§3.23/§3.25；序列行已标、表未标） | 2026-06-11-spec.md | proposed |
| F-SPEC-20260611-0fb1 | LOW | 缺失 | consensus §3.4 操作总表未汇集 R3~R13 新键位（M/R/2/3/4/5/6/Enter） | 2026-06-11-spec.md | proposed |
| F-SPEC-20260611-85b4 | LOW | 偏差（取代漏标家族·轻微） | consensus §3.9 ARMORED「朝向玩家」源头未标 2P 后「最近存活玩家」语义（§3.17） | 2026-06-11-spec.md | proposed |
| F-SPEC-20260611-2625 | LOW | 风险 | PvP 模式下玩家子弹×玩家子弹相消/穿透行为共识全文未声明（§3.5/§3.21 缺位，需按实现回写） | 2026-06-11-spec.md | proposed |
| F-SPEC-20260611-39bc | LOW | 缺失 | modules.md 覆盖性自检段停更于 v1.1（仅 F1~F6/AC-1~11，13 轮未扩展） | 2026-06-11-spec.md | proposed |

---

## 代 INSERT 完成记录（2026-06-11 by 父会话）

- 全部条目已 INSERT 到 docs/audit/findings-registry.md（状态 proposed）
- problem-registry 以一行聚合登记（对齐 R6 先例）
- 归档路径：docs/audit/processed-proposals/
