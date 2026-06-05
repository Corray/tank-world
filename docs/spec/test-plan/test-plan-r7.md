# tank-world R7 — 测试计划

| 版本 | 日期 | 变更摘要 |
|------|------|---------|
| v1 | 2026-06-05 | 初版（从共识 v6 AC-47~51 + 分叉清单 v2（§35）推导，待 R7-G3 确认） |

> 基线 175 块回归；**预判修订恰 2 处**（T-2P-16/17，spec 反转所致，依据 v6 §3.19/3.20）。
> 用例从分叉清单 v2 **逐行推导**——17 行清单中每个「处置=变更」行至少 1 用例（#6 类缺陷的结构性预防）。

## 1. 家族维度（清单驱动）

| 家族 | 来源清单行 | 用例段 |
|------|-----------|--------|
| 第六档隔离 | §35.2-9 | T-CE-2/3（双向：COOP 无尽只写第六档；SOLO 无尽不写第六档） |
| 无尽入口双模式 | §35.1-1/7 | T-CE-1 + 提示行断言 |
| 成就团队语义 ×8 | §35.3-13~17 | T-ACH2-1~6 |
| SOLO 零回归 | 全清单「不变」行 | 基线 173 块 + T-ACH2-7 显式哨兵 |

## 2. 用例清单 [U]（tests/coop-endless.spec.ts + achievements 增量）

| ID | 场景 | 预期 |
|----|------|------|
| T-CE-1 | COOP GAME_COMPLETE 防误触窗口后操作键 | → PLAYING L4，players 仍 2 人，无尽公式生效 |
| T-CE-2 | COOP 无尽死亡 | → ENDLESS_OVER；分入 **best-coop-endless**；best-endless/best-coop/其余三档全部不变 |
| T-CE-3 | SOLO 无尽死亡（回归） | 仍写 best-endless；第六档不变 |
| T-CE-4 | COOP 无尽过关推进 | LEVEL_CLEAR 照常 → L5；命数各自带入 |
| T-CE-5 | 无尽提示行 | overlayLines(GAME_COMPLETE) 双模式均含 ENDLESS 行（v5 断言反转） |
| T-ACH2-1 | COOP 击杀 | FIRST_BLOOD 解锁；kills+1 |
| T-ACH2-2 | NO_DEATH 团队判定 | 双满命过关解锁；任一人掉命不解锁 |
| T-ACH2-3 | COLLECTOR 团队合计 | P1 拾 2 种 + P2 拾 1 种 → 解锁 |
| T-ACH2-4 | PURIST 团队零拾取 | COOP 零拾取全通解锁；任一人拾取不解锁 |
| T-ACH2-5 | CENTURION 跨模式 | kills=99（存量）+ COOP 1 杀 → 解锁 |
| T-ACH2-6 | DEMOLITION/ENDLESS_8 在 COOP | 均可解锁 |
| T-ACH2-7 | SOLO 语义哨兵 | SOLO 各成就触发行为与 R6 基线一致（抽 3 项） |

## 3. 手动验收 [M]

| ID | 场景 | 预期 |
|----|------|------|
| M-R7-1 | 浏览器 2P 通关进无尽 | 入口可见可用；HUD n/∞+CO-OP+第六档行 |
| M-R7-2 | 成就 toast 在 COOP | 达成横幅正常 |

## 4. 通过标准

基线 175（含 2 处声明修订）+ R7 新增全绿；AC-51 在 G3 门禁核验（清单 17 行 = grep 17 命中 ✓ 已核）。

## 5. 执行记录（2026-06-05）

**[U]：** 186/186；基线修订 **3 处**（预判 2 + 漏网 1：regression-coop.spec issue #7 回归断言被 v6 反转——断言强度扫描未覆盖 regression-* 测试族，方法盲区入 dogfood）。
**[M]：** M-R7-1 ✅（浏览器实证：COOP 全通→操作键→L4/∞ CO-OP 双人保持 + HUD 第六档行）；M-R7-2 toast 由 T-ACH2 单测覆盖，视觉留人工（实验场口径）。
**AC-51：** 清单 17 行 = grep 17 命中 ✓（G3 已核）；清单驱动设计期捕获 submitEndless 隐患 1 例 + 免费午餐识别 2 例（COLLECTOR/PURIST 团队语义零代码）。
