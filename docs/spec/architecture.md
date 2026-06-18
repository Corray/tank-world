# tank-world — 架构设计

| 版本 | 日期 | 变更摘要 |
|------|------|---------|
| v4 | 2026-06-18 | R22 依赖治理：拆 combat↔player 循环依赖（damagePlayer 归位 combat），§3.5 更新，ADR-004，T-ARCH-1 不变量守护 |
| v3 | 2026-06-12 | F-ARCH-e75d 修复：R7~R13 七轮回填（状态机 7→11 态、六模式、管线补 shovel/中立道具/judge 路由、advance 间奏分支）+ **维护约定入档（根治）**+ ADR-002/003 关联 |
| v2 | 2026-06-05 | F-ARCH-4c50 修复：目录结构更新至 14 模块、管线补 powerups/effects 与 players[] 复数化、CI 管道补录（R2~R5 增量一次性回填） |
| v1 | 2026-06-04 | 初版（G2 评审通过：组合 A——TS + 裸 Canvas + Vite singlefile + Vitest） |

> 关联：共识文档 v13 / 模块清单 v12 / ADR-001-tech-stack / ADR-002-judge-mode-fork / ADR-003-advance-interlude-branch / ADR-004-combat-player-decouple
>
> **维护约定（2026-06-12 起，F-ARCH-e75d 根治）：** 凡某轮触及 GameState/GameMode 枚举、每帧管线（update.ts updateWorld 顺序）、GameLoop.advance 结构、模块新增/依赖方向之一，**该轮收尾文档 commit 必须同步本文件**（对照 code-map「关键链路变更时更新」同款约定——code-map 七轮全跟上，本文件两度停更，差异即约定有无）。

---

## 1. 技术栈（G2 决议）

| 层 | 选型 | 关键理由 |
|----|------|---------|
| 语言 | TypeScript 5.x（strict） | N4 状态用 enum/union 编译期锁定；状态机密集型逻辑 |
| 渲染 | Canvas 2D（裸，无引擎） | 13×13 几何图形体量；零运行时依赖；行为全可控 |
| 构建 | Vite + vite-plugin-singlefile | dev 热更；build 产单文件 HTML（JS 内联）→ AC-10 file:// 直开 |
| 测试 | Vitest | 与 Vite 同生态；逻辑模块单测（map/combat/enemy/core） |

替代方案对比与取舍 → 见 `docs/adr/ADR-001-tech-stack.md`。

## 2. 目录结构（与模块清单 1:1）

```
src/
├── main.ts              # 入口：组装依赖 + 启动主循环 + 模式入口接线（键 2~6）
├── core/                # 主循环（advance 双分支）、状态机（11 态）、管线、唯一 World
├── map/                 # 地形 7 类 + 1/4 子块 + 变体承载 + 铲子变钢/回砖（R12）
├── player/              # 玩家实体（players[] 复数，1~2 人）
├── enemy/               # 出生调度 + 四类 AI（威胁分层 + R11 Boss 阶段狂暴）+ 冻结门控（R12）
├── combat/              # 碰撞矩阵 C1~C17 SSoT + 冰面惯性 + 升级弹道（R10）
├── level/               # 三关配置 + 无尽公式 + VS/MELEE 竞技场 + 波次曲线（R13）
├── powerup/             # 7 道具掉落/拾取/效果 + VS 中立刷新 + 铲子到期（R12）
├── storage/             # localStorage 八档 + 静音偏好
├── effects/             # 纯视觉特效实体（R3）
├── audio/               # 程序化音效 dispatch/synth 两层（R3）
├── achievements/        # 8 成就触发/幂等/持久化（R4，团队语义 R7）
├── hud/                 # DOM 侧栏（模式分行/八档 BEST/成就明细）
├── input/               # 键盘双通道映射 + 模式入口键 2~6
└── render/              # Canvas 程序化绘制（草上层/特效/Boss HP 条/覆盖层 11 态文案）
tests/                   # Vitest 全量单测（277，见 CI 与 test-plan/INDEX）
.github/workflows/       # CI：PR 门禁(required check=test) + master 自动部署 Pages（Node24，R14 chore）
index.html
```

## 3. 运行时设计

### 3.1 主循环（AC-9 / AC-11 的承载）

- `requestAnimationFrame` 驱动 + **固定时间步累加器**（逻辑 60Hz，250ms tab-switch clamp）
- **冻结原则（R13 修订，见 ADR-003）**：clock 与实体更新单一门控（仅 PLAYING 推进）；WAVE_BREAK 自动间奏的倒计时在 advance 层**平行分支**推进（clock 仍冻结，AC-11 实质语义保持）。PAUSED 与各结算态 = 跳过 update、保留 render
<!-- v1「单一开关保证」表述已被 R13 修订（ADR-003）：advance 现为 PLAYING / WAVE_BREAK 双分支 -->

### 3.2 状态机（11 态）

```
READY → PLAYING ⇄ PAUSED
PLAYING → LEVEL_CLEAR → PLAYING（advanceLevel）        # PvE 战役/无尽过关
PLAYING → GAME_COMPLETE → 无尽入口 / R 新局            # 战役通关
PLAYING → DEFEAT → R 重试本关                          # L1~3 败北
PLAYING → ENDLESS_OVER → R 新局                        # 无尽死亡（结算档位）
PLAYING → VERSUS_ROUND → PLAYING（advanceVersusRound） # PvP 回合间奏（R8）
PLAYING → VERSUS_OVER → R 新局                         # best-of-3 终局（R8）
PLAYING → WAVE_BREAK → PLAYING（倒计时自动/按键提前）   # 波次间奏（R13，唯一自动间奏）
PLAYING → WAVE_OVER → R 新局                           # 波次死亡（结算档位）（R13）
```

详表（进入/退出条件与守卫）→ 数据模型状态机节。

### 3.3 每帧管线

```
input(双通道采集) → updatePlayers(逐玩家) → updatePowerups(拾取，先于 combat——风险 §15)
→ updateShovel(铲子到期回砖，R12) → spawnNeutralPowerup(仅 VERSUS，R8)
→ trySpawn/updateEnemies(出生调度 + AI；冻结门控首行，R12)
→ combat.update(子弹推进 + 碰撞矩阵 C1~C17) → updateEffects(纯视觉过期)
→ core.judge(路由：isPvP→judgeVersus / WAVE→judgeWave / PvE 默认，见 ADR-002)
→ render(全量重绘 + 草上层 + 特效 + 覆盖层) → hud
```
<!-- v2 管线已被上式取代（F-ARCH-e75d 回填）：v2 缺 updateShovel/spawnNeutralPowerup/judge 路由细分 -->

- 13×13 体量下全量重绘 << 1ms，不做脏矩形优化（YAGNI）

### 3.4 六模式与判定分叉（ADR-002）

| 模式 | 入口 | 玩家数 | 判定 | 档位 |
|------|------|--------|------|------|
| SOLO | 任意动作键 | 1 | judge PvE（战役/无尽） | best-level/total/endless |
| COOP | 2 | 2 | judge PvE | best-coop/coop-endless |
| VERSUS | 3 | 2 | judgeVersus（双条件+best-of-3） | 不写档（AC-57） |
| MELEE | 4 | 2 | judgeVersus（isPvP 复用） | 不写档 |
| WAVE | 5 | 1 | judgeWave（同图连续） | best-wave |
| CO-OP WAVE | 6 | 2 | judgeWave | best-coop-wave |

### 3.5 模块协作约束

- **core 持有唯一 world state**，各模块通过显式参数读写，禁止模块间隐式全局引用
- render / hud 对实体状态**只读**
- 碰撞判定集中在 combat（单一职责），不散落在各实体内
- **依赖治理（F-ARCH-608f 已拆，R22/ADR-004）**：原 combat ↔ player 运行时互依已解——damagePlayer 归位 combat（碰撞伤害解算 SSoT），player→combat 单向。依赖无环由 T-ARCH-1 不变量守护

## 4. 非功能映射

| 约束 | 架构保障 |
|------|---------|
| AC-9 60fps | 固定时间步 + 全量重绘的 O(实体数) 开销（峰值 ~20 实体） |
| AC-10 file:// | singlefile 构建产物（单 HTML，无外链资源） |
| AC-11 冻结 | advance 门控（PLAYING）+ 间奏平行分支不推 clock（ADR-003） |
| N4 enum/常量 | constants.ts 集中 + TS enum/union；CI 阶段 `tsc --noEmit` 把关 |
| N5 程序化绘制 | render 模块纯 Canvas API，无素材加载路径 |
