# Audit 执行日志 — behavior phase（2026-06-11 第二轮）

**执行者：** audit-agent（只记录不修）
**输入：** docs/spec/consensus.md（v12, 515 行）/ docs/spec/test-plan/（INDEX + 13 份）/ tests/（27 spec 文件）/ .github/workflows/ci.yml / package.json / README.md / git 历史（骨架 commit 26a313e、293e124、b003540）

---

## 执行步骤

```
[1] 读 INDEX.md + consensus.md §5（AC-1~95 全表）+ 上轮报告 2026-06-05-behavior.md（基线复用：AC-1~46 首轮已逐条核 ✓）
[2] grep "describe(" tests/*.spec.ts → 全量 describe 清单（27 文件）
[3] 提取 13 份测试计划的 AC→测试映射（mvp/r8~r13 有显式 AC 表；r2~r7 走用例 ID 推导，与上轮核对结论复用）
[4] npx vitest run → 277/277 全绿（27 文件，15.8s）
[5] CI 检查：ci.yml 全文（PR 门禁 tsc+vitest / master deploy）+ package.json scripts + README
[6] S2 安全扫描：grep key/secret/token/password/credential（src/ + tests/ + .github/）
[7] 骨架锁定抽查：git diff 26a313e..HEAD -- tests/boss.spec.ts（空）/ 293e124..HEAD -- tests/items.spec.ts（空）/ b003540..HEAD -- tests/wave.spec.ts（1 hunk，逐行甄别断言零改）
[8] 反向检查：T-* 族 ↔ 计划锚 / regression-* ↔ issue 锚 / 无锚差集 2 处（基础设施 sanity）
[9] 写报告 + proposals + 本日志
```

---

## AC 覆盖率统计表（AC-1~95）

**图例：** ✅ 单测/CI 机制覆盖 | 🔶 浏览器冒烟/定位裁定豁免（v5 §1，非缺口） | ⛔ 已被改判取代 | ❌ 无覆盖且非豁免

| AC | 测试锚（tests/ 实际 describe） | 状态 |
|----|------------------------------|------|
| AC-1 | T-PLY-1~4 / T-CMB-10/12 | ✅ |
| AC-2 | T-CMB-1,2 / T-MAP-1~3（+T-UP-4 <L4 零回归） | ✅ |
| AC-3 | T-ENM-1~4 | ✅ |
| AC-4 | T-ENM-5/6/7（type×{speed,hp,score} 矩阵） | ✅ |
| AC-5 | T-CMB-6 / T-PLY-5,6 | ✅ |
| AC-6 | T-CMB-3 / T-SM-3 | ✅ |
| AC-7 | T-SM-2（+M-1 目视） | ✅ |
| AC-8 | M-2（HUD 目视；数据源 T-SM-2 兜底） | 🔶 |
| AC-9 | M-3（60fps） | 🔶 |
| AC-10 | M-4（file:// 部署） | 🔶 |
| AC-11 | T-SM-5,6（+T-WAV-6 间歇期冻结沿用） | ✅ |
| AC-12 | T-CMB-7,8 | ✅ |
| AC-13 | T-LVL-6（LEVELS 配置+三图两两不同） | ✅ |
| AC-14 | T-LVL-1/2/3（画面文案目视 M-R2-4） | ✅ |
| AC-15 | T-LVL-4（六字段逐一断言） | ✅ |
| AC-16 | T-LVL-9 + T-PWR-1/2 + T-ENM-4（carrier 位；闪烁目视 M-R2-3） | ✅ |
| AC-17 | T-PWR-4 | ✅ |
| AC-18 | T-PWR-5/6/7（+T-UP-5 doubleFire 对齐零回归） | ✅ |
| AC-19 | T-PWR-8/9 | ✅ |
| AC-20 | T-STO-1/2/3（+M-R2-5 刷新目视） | ✅ |
| AC-21 | 平衡实测——定位裁定豁免（P-20260605-88ee dismissed，consensus 已标注；代理指标见 test-plan-r2 §5） | 🔶 |
| AC-22 | T-LVL-6（双层圈采样格 level.spec.ts:126）+ T-MAPV-2（护圈保护不变量） | ✅ |
| AC-23 | T-FX-1/2/3/5/7 | ✅ |
| AC-24 | T-FX-1（score float） | ✅ |
| AC-25 | T-FX-6（flash 触发+时长由 clock 过期 T-FX-4） | ✅ |
| AC-26 | T-AU-1（8 事件独立 recipe）/ T-AU-2/3（静音即时+持久）（可辨识度听感 [M]） | ✅ |
| AC-27 | M-R3-3（file:// 单文件+首键出声）；T-AU-4 兜底降级 | 🔶 |
| AC-28 | T-EN-3/8（入口+防误触；HUD n/∞ 目视） | ✅ |
| AC-29 | T-EN-1（公式采样） | ✅ |
| AC-30 | T-EN-5/6/7 | ✅ |
| AC-31 | M-R3-5（峰值 60fps） | 🔶 |
| AC-32 | T-TER-1（遮挡渲染层目视） | ✅ |
| AC-33 | T-TER-2/8 | ✅ |
| AC-34 | T-TER-3/4/5/9（+T-TER-6/7 边界回归） | ✅ |
| AC-35 | T-MAPV-1/3/4 | ✅ |
| AC-36 | T-ACH-1~10（8 成就+幂等+持久化） | ✅ |
| AC-37 | READY n/8 + 明细列表（渲染目视） | 🔶 |
| AC-38 | T-2P-1/2 | ✅ |
| AC-39 | T-2P-6 + regression-coop（HUD key help follows the mode） | ✅ |
| AC-40 | T-2P-3/4/5 | ✅ |
| AC-41 | T-2P-9/10 | ✅ |
| AC-42 | T-2P-7/11 | ✅ |
| AC-43 | T-2P-14/15 + regression-coop issue #6 | ✅ |
| AC-44 | 已被 v6 AC-47/49 取代（consensus 有标注；regression-coop issue #7 断言已反转） | ⛔ |
| AC-45 | ci.yml（PR→tsc+vitest 门禁 / master→build+Pages）+ PR #18~#23 实跑实证 | ✅ |
| AC-46 | README 含玩法/截图/工作流声明/spec 指引（结构在；**内容停更 → F-PROC-20260611-514f**） | 🔶 |
| AC-47 | T-CE-1/5 + T-2P-17（v6 反转） | ✅ |
| AC-48 | T-CE-2/3/4 | ✅ |
| AC-49 | T-2P-16（v6 反转）+ T-ACH2 矩阵 | ✅ |
| AC-50 | T-ACH2（NO_DEATH 团队/COLLECTOR 合计/PURIST 零拾取） | ✅ |
| AC-51 | 元验收：分叉清单 v2 17 行=grep 17 命中（test-plan-r7 §4 留痕） | ✅ |
| AC-52 | T-VS-1/2 + 入口回归 | ✅ |
| AC-53 | T-VS-6（三态）+ regression-coop（C17 不变） | ✅ |
| AC-54 | T-VS-7/8 | ✅ |
| AC-55 | T-VS-3/7 | ✅ |
| AC-56 | T-VS-13 | ✅ |
| AC-57 | T-VS-11 + T-VS-5（六档快照） | ✅ |
| AC-58 | T-VS-9 | ✅ |
| AC-59 | 元验收：分叉清单 v3（test-plan-r8 留痕） | ✅ |
| AC-60 | T-MEL-1 + 入口回归 | ✅ |
| AC-61 | T-MEL-2/3/4 | ✅ |
| AC-62 | T-MEL-5（对手毁+NPC 毁两路） | ✅ |
| AC-63 | T-MEL-6 | ✅ |
| AC-64 | T-MEL-7（含三模回归段） | ✅ |
| AC-65 | T-MEL-8 | ✅ |
| AC-66 | T-MEL-9 | ✅ |
| AC-67 | 元验收：分叉清单 v4（test-plan-r9 留痕） | ✅ |
| AC-68 | T-UP-1/8 | ✅ |
| AC-69 | T-UP-2/3/4 | ✅ |
| AC-70 | T-UP-6 | ✅ |
| AC-71 | T-UP-5 | ✅ |
| AC-72 | T-UP-4（a/b/c：L4 破钢 / <L4 不破 / 敌弹永不破） | ✅ |
| AC-73 | T-UP-9 | ✅ |
| AC-74 | T-UP-6/7（重置点矩阵 4 重置+loadLevel 持久） | ✅ |
| AC-75 | 元验收：分叉清单 v5（test-plan-r10 留痕） | ✅ |
| AC-76 | T-BOSS-1/2/6 | ✅ |
| AC-77 | T-BOSS-3/5（HP 条渲染目视） | ✅ |
| AC-78 | T-BOSS-4 | ✅ |
| AC-79 | T-BOSS-5 | ✅ |
| AC-80 | tsc（穷举编译验）+ T-BOSS-7 | ✅ |
| AC-81 | T-ITM-1 + tsc | ✅ |
| AC-82 | T-ITM-2/3/4/5 | ✅ |
| AC-83 | T-ITM-6/7 | ✅ |
| AC-84 | T-ITM-8 | ✅ |
| AC-85 | T-ITM-9a/9b | ✅ |
| AC-86 | T-ITM-10 | ✅ |
| AC-87 | T-ITM-G1/G2 + 全量回归（263 基线绿） | ✅ |
| AC-88 | T-WAV-1 + T-WAV-G1（isPvP 守护）（按键冒烟） | ✅ |
| AC-89 | T-WAV-2/3 | ✅ |
| AC-90 | T-WAV-4/6 | ✅ |
| AC-91 | T-WAV-5 | ✅ |
| AC-92 | T-WAV-7 | ✅ |
| AC-93 | T-WAV-7/8/9 | ✅ |
| AC-94 | T-WAV-G2 + T-WAV-G3 | ✅ |
| AC-95 | 全量回归（277 绿）+ T-WAV-G1 + 元验收（分叉清单 v7） | ✅ |

### 覆盖率汇总

| 状态 | 条数 | 占比（有效 94 = 95 − 1 取代） |
|------|------|------------------------------|
| ✅ 单测/CI 覆盖 | 86 | 91.5% |
| 🔶 浏览器冒烟/豁免（定位裁定，非缺口） | 8 | 8.5% |
| ❌ 无覆盖且非豁免 | **0** | 0% |
| ⛔ 已取代（AC-44） | 1 | — |

---

## 反向比对明细

- **T-* 族（23 文件）**：全部可追溯到对应轮测试计划用例表 ✓
- **regression-* 族（4 文件）**：regression-input→#8、regression-coop→#6/#7、regression-qa2→#13、regression-qa2b→#14，均有 issue 锚 ✓
- **合理差集（2 处，非 AC 载体，维持上轮判定）**：`level.spec.ts:198`（addEnemy helper sanity）、`game.spec.ts:166`（GameLoop fixed timestep，数据模型循环契约）

## 测试计数链核验

| 轮 | INDEX 声明 | 增量自洽 |
|----|-----------|---------|
| MVP→R13 | 60 / 94 / 120 / 147 / 166 / 186 / 210 / 225(+15 MELEE) / 241(+16 UP) / 249(+8 BOSS) / 263(+14 ITM) / 277(+14 WAV) | ✓ |
| 实测 | `npx vitest run` = **277/277 全绿，27 文件**（2026-06-11） | ✓ |

注：任务背景称「26 个 spec 文件」，实测为 27（ls tests/*.spec.ts + vitest 报告一致）；helpers.ts 非 spec。README 无硬编码测试数字。INDEX R13 行「待 PR 合入」滞后 → F-PROC-20260611-a872。

## CI 完整性核验

- PR + master push 均跑 `npm ci → tsc --noEmit → vitest run`（全量）✓；deploy 仅 master push 且 `needs: test` ✓；build 含 tsc 二次把关 ✓
- **Node20 弃用风险未处理**（checkout@v4 / setup-node@v4 / upload-pages-artifact@v3 + node-version:20）→ F-PROC-20260611-999d

## S2 安全扫描

- `grep -rniE "key|secret|token|password|credential" src/`：命中均为键盘码（KeyW 等）/ localStorage 存档键名（KEY_BEST_* 常量族）/ Map 键，无凭证语义
- `secret|password|credential|api[_-]?key|bearer` 于 src/ + tests/ + .github/：**零命中** ✓

## 骨架锁定抽查明细

| 轮 | commit | diff 结果 | 甄别 |
|----|--------|----------|------|
| R11 | 26a313e（8 个 T-BOSS it 块 / 7 describe） | 空 | ✅ |
| R12 | 293e124（T-ITM 14 块） | 空 | ✅ |
| R13 | b003540（T-WAV 14 块） | T-WAV-6 单 hunk：`loop.advance(大跨度)` → 逐步循环（advance 层 250ms clamp 所致）；4 条 expect 逐字未动；inline 留痕注释（2026-06-11，含理由） | ✅ 修正合规；载体改进建议 → F-PROC-20260611-6ac3 |
