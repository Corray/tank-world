# R7 实现总结（L2）

**日期：** 2026-06-05 / **分支：** feature/r7-coop-unbound / **关联：** PRD R7、共识 v6、数据模型 §35~38

## 背景与做了什么

2P 无尽（第六档 best-coop-endless）+ 全 8 成就团队语义（改判 v5）+ **写入点级分叉清单 v2 方法首秀**（hub #33 预采纳实证）。

## 关键决策与思考

1. **清单方法的三连战果**：①AC-51 达标（17 行=17 grep 命中）②设计期捕获 submitEndless 无门控隐患（#6 同款，零成本预防）③识别两顿免费午餐（COLLECTOR/PURIST 因 runPickupTypes 本就 world 级聚合而零代码）——方法价值从「推断」变「实证」
2. **NO_DEATH 团队判定走 per-player 快照**（PlayerTank.levelStartLives），world 级旧快照保留以零触碰既有测试
3. **修订预判 2 实 3**：漏网的是 issue #7 回归测试（断言 v5 行为，被 v6 合法反转）——断言强度扫描的范围缺口：**regression-* 测试族与 spec 测试族要分开枚举**，方法补丁入 dogfood

## 实现小事故记录

python 批量删 gate 时静默吃掉 onLevelCleared 的后续替换（assert 缺失的代价），靠骨架 FAIL 暴露——「机械重构也要逐处 assert」教训。

## 影响范围

第六档 + 团队语义 + 门控移除（~80 行变更）；基线修订 3 处全留痕。

## 已知残留

2P 无尽难度曲线未模拟（双人火力 vs 递增敌量，PM 盲点声明续挂）；M-R7-2 toast 视觉人工项。
