# tank-world — 项目质量模式（tendency）

**启动日期：** 2026-06-12
**维护者：** PM + 执行层（提原材料）

---

## 已知 tendency

### PP-20260612-7d1f — 轮次收尾缺「门面/承载文档」同步触发

- **首次出现**：F-PROC-20260605-6fd2（CLAUDE.md 六轮未更）；二次：F-ARCH-20260605-4c50（architecture 停更 v1）；三次集中复发：R14 审计 F-SPEC-509b（README）/ F-ARCH-e75d（architecture 又七轮）/ F-DM-36e1（data-model 六轮）/ F-PROC-514f（CLAUDE.md 又七轮）
- **模式描述**：每轮收尾纪律覆盖「实现总结 + code-map + test-plan 回写 + spool」，但**不在收尾清单里的文档**（README / CLAUDE.md context 段 / architecture / data-model）持续停更——修一次只还一次账，下一轮继续欠
- **危害**：对外门面失真（README 是 Pages 入口）；契约层 SSoT 失效（data-model）；audit 每轮重复抓同族
- **remediation**：**把文档同步做成触发式约定而非记忆**——architecture v3 已入档维护约定（触发条件=枚举/管线/advance/模块依赖变更）；data-model v6 同款（触发=常量/枚举/字段/档位变更）；README+CLAUDE.md 触发=新模式/新键位/轮次合入。对照组证明有效：code-map 因有「关键链路变更时更新」约定七轮全跟上
- **实例**：
  - R6 审计：4c50/6fd2 首发，当轮修复
  - R14 审计：同族 4 文档再发（509b/e75d/36e1/514f），fix 轮修复 + 约定入档

### PP-20260612-3a82 — 骨架修正应独立 commit（diff 审计边界）

- **首次出现**：F-PROC-20260611-6ac3（R13 wave.spec.ts T-WAV-6 驱动方式修正混入 feat commit 3a94fba）
- **模式描述**：实现期发现骨架自身缺陷（驱动方式/环境假设错误，非断言问题）时，修正与功能实现挤进同一 commit——`git diff <骨架commit> -- <骨架文件>` 非空时，无法一眼区分「合规修正」与「篡改断言」
- **危害**：test-skeleton-lock 的机器化校验（diff 为空）失效后，甄别成本从 diff 一行变成逐断言人工比对（R14 behavior 审计实际付出了这个成本）
- **remediation**：骨架修正用独立 commit（`test(skeleton-fix): <原因>`），断言改动为零的声明写进 commit message；feat commit 保持骨架文件零触碰
- **实例**：
  - R13：3a94fba 混入（审计甄别合规但成本高）——下轮起执行
