# tank-world R5 — 测试计划

| 版本 | 日期 | 变更摘要 |
|------|------|---------|
| v1.1 | 2026-06-05 | 执行完毕：166/166（基线 147 **零修订兑现**）；[M] 见 §5；骨架后置偏离声明 |
| v1 | 2026-06-05 | 初版（从共识 v5 AC-38~46 + 数据模型 §29~32 推导，R5-G3 已确认） |

> 载体：**[U]** Vitest / **[M]** 浏览器手动 + CI 实跑。基线 147 块回归。
> **基线冲击预判（含断言强度扫描，R4 教训方法）：零修订**——`world.player` 别名 getter + 默认参兼容外缘下，基线全部为属性访问/字段赋值，无引用相等与整体替换；若实现中翻车按约定独立 commit 修订。

---

## 1. 家族维度枚举

| 家族 | 维度展开 | 用例段 |
|------|---------|--------|
| 模式分叉点 | §31 全清单 9 行逐行映射（开局/players/判负/计分/成就/无尽/AI/重试/HUD 数据源） | §2.1/2.2 |
| per-player 独立性 | {输入, 发射权, 命数重生, 道具效果, 计分} × P1/P2 | §2.2 |
| 碰撞扩展 | C6′（敌弹×P2）/ C11′（玩家互阻）/ C17（友军穿透） | §2.2 |
| 档位隔离 | best-coop 与单人三档互不污染 × {COOP 写, SOLO 不写} | §2.3 |
| 兼容回归 | SOLO 行为与 v4 完全一致（别名/默认参契约） | §2.3 |

## 2. 用例清单 [U]

### 2.1 模式与判负（tests/coop.spec.ts）

| ID | 场景 | 预期 |
|----|------|------|
| T-2P-1 | 进入 COOP | players.length=2；P2 出生 (12,10)、id=2；mode=COOP |
| T-2P-2 | READY 选择 | 按 2 → COOP 开局；操作键 → SOLO（players.length=1，既有行为） |
| T-2P-3 | 判负三态 | P1 命尽 alive=false 游戏继续；P2 再尽 → DEFEAT；基地毁即败（任一存活也败） |
| T-2P-4 | 重试 | 双复活满命、各回出生点；level/banked 语义同 1P 重试 |
| T-2P-5 | COOP 过关推进 | LEVEL_CLEAR/GAME_COMPLETE 照常；命数各自跨关保留 |

### 2.2 双人战斗语义（tests/coop.spec.ts 续）

| ID | 场景 | 预期 |
|----|------|------|
| T-2P-6 | 双输入独立 | P1 输入仅动 players[0]，P2 输入仅动 players[1]，同帧并行不串扰 |
| T-2P-7 | 发射权 per-player | P1 子弹在场不阻 P2 开火；各自 doubleFire 上限独立 |
| T-2P-8 | C6′ | 敌弹命中 P2 → 仅 P2 掉命重生（无敌/护盾按 P2 个人判）；P1 不受影响 |
| T-2P-9 | C11′ | P1 推 P2：互阻、零伤害 |
| T-2P-10 | C17 | P1 子弹穿过 P2 击中其后砖墙；P2 子弹同理 |
| T-2P-11 | 道具归属 | P2 拾取护盾/双发 → 仅 P2 生效；炸弹任一人拾取全场清 |
| T-2P-12 | 计分归属 | P1 击杀 → players[0].score 与 world.score 同涨，players[1].score 不变 |
| T-2P-13 | AI 目标 | ARMORED 朝最近**存活**玩家偏置（P1 死后转向 P2，统计断言） |

### 2.3 档位、gate 与兼容（tests/coop.spec.ts 续）

| ID | 场景 | 预期 |
|----|------|------|
| T-2P-14 | best-coop 档 | COOP 全通 → 合计写 best-coop；best-total/level/endless 不动 |
| T-2P-15 | SOLO 不写 coop 档 | 单人全通 best-coop 不变 |
| T-2P-16 | 成就 gate | COOP 局击杀/过关/拾取均不解锁任何成就 |
| T-2P-17 | 无尽 gate | COOP 的 GAME_COMPLETE 后 enterEndless 拒绝（状态不变） |
| T-2P-18 | 兼容契约 | SOLO 下 players.length=1 且 world.player === players[0]（别名引用一致） |

## 3. 手动验收 [M]

| ID | 场景 | 预期 |
|----|------|------|
| M-R5-1 | 真实双人同键盘操控 | 双键位同时按互不干扰（键盘 ghosting 留设备差异声明） |
| M-R5-2 | CI 门禁实跑 | PR 上 tsc+vitest 必跑且绿；（红灯阻合入由 GitHub 分支规则或人工纪律承担，见执行记录） |
| M-R5-3 | Pages 链接 | master 合入后公网 URL 可玩 |
| M-R5-4 | README | 玩法/截图/工作流声明齐 |
| M-R5-5 | HUD 双行 | P1/P2 lives+score 各自显示 + 合计 |

## 4. 通过标准

基线 147 全绿（V1 切片完成即里程碑）+ R5 新增全绿 + CI 在真实 PR 上跑绿 + Pages 可访问。

## 5. 执行记录（2026-06-05）

**[U]：** 166/166（基线 147 + coop 19）；tsc 零错误。**基线零修订预判精确兑现**（兼容外缘策略：别名 getter + 默认参）。
**偏离声明**：复数化的编译原子性（World 结构改动无法半做）将 coop 骨架挤到实现后落地，本轮骨架为「验证规格」而非 FAIL-first——test-skeleton-lock 在大重构型 feature 上的边界发现，入 dogfood 报告增量。

**[M] 验收**：

| ID | 结果 | 证据 |
|----|------|------|
| M-R5-1 双人操控 | ✅ | 真实键盘事件：Digit2 进 COOP；P1 按 D 右移、P2 按 ← 左移**同窗并行互不串扰**（80→114 / 336→302） |
| M-R5-2 CI 门禁 | ✅ | PR #5 上 `test` check 实跑 15s 通过；deploy 在 PR 事件正确跳过；master 分支保护 required check=test 已启用 |
| M-R5-3 Pages | ☑(待合入) | Pages 已启用（workflow 模式，URL 既定）；首次部署随 PR 合入触发，合入后复验 |
| M-R5-4 README | ✅ | 玩法/双人截图/工作流声明齐（docs/assets/screenshot.png） |
| M-R5-5 HUD 双行 | ✅ | 「LEVEL 1/3 CO-OP / P1 ♥3 / P2 ♥3 / BEST CO-OP」截图验证 |

**残留（不阻塞）**：M-R5-3 合入后复验 Pages URL；键盘 ghosting 设备差异留声明。
