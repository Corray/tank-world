# R21 实现总结（L2）

**日期：** 2026-06-16 / **分支：** feature/r21-difficulty-persist / **关联：** PRD R21、共识 v20 §3.31 amend、AC-119、test-plan-r21

## 背景与做了什么

难度持久化——兑现 R19 留的「难度不持久化」TODO。难度选择经 localStorage 持久（createWorld 读取、cycleDifficulty 写入），跨会话/刷新恢复；fail-silent 默认 NORMAL（同 muted/最高分范式）。

## 关键决策与思考

1. **读取点 = createWorld**：每个新世界（含 restartToReady 后）都从 localStorage 恢复难度——单点覆盖所有「新局」路径。
2. **fail-silent NORMAL 锚**：getDifficulty 空/非法/无 localStorage → NORMAL（try/catch）→ 既有 createWorld().difficulty===NORMAL 测试零回归（实测零基线修订）。
3. **复用既有范式**：getDifficulty/setDifficulty 镜像 getMutedPref/setMutedPref（fail-silent localStorage），零新模式。
4. **值校验**：getDifficulty 只接受 'EASY'/'HARD' 字面，其余（含 'NORMAL'/垃圾值）归 NORMAL——非法值不会污染。

## 影响范围

3 文件：constants（KEY_DIFFICULTY）、storage（getDifficulty/setDifficulty fail-silent）、core（createWorld 读 getDifficulty、cycleDifficulty 写 setDifficulty）。其他零改。

## 验收实证

- **机器可验**：321/321（316 既有零回归 + 5 T-DPF-*），**零基线修订**（fail-silent NORMAL 锚），tsc 干净，39.51KB。
- **骨架锁定**：4d3e245，`git diff 4d3e245 -- tests/difficulty-persist.spec.ts` 空。
- **浏览器冒烟（真持久化）**：按 T → HARD，localStorage 存 'HARD'；**刷新页面 → 新世界恢复 HARD**（READY）——跨会话持久全链路活体验证。

## 已知残留

- 难度仅缩放敌速+出生间隔（R19 范围，不影响计分/档位）。
- 自主连作 R16~R21 六轮全闭环；产品功能已完整、无已知债，后续可考虑转向（dogfood 反哺 / 用户体验验收 / 暂停堆料）。
