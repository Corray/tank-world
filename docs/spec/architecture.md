# tank-world — 架构设计

| 版本 | 日期 | 变更摘要 |
|------|------|---------|
| v2 | 2026-06-05 | F-ARCH-4c50 修复：目录结构更新至 14 模块、管线补 powerups/effects 与 players[] 复数化、CI 管道补录（R2~R5 增量一次性回填） |
| v1 | 2026-06-04 | 初版（G2 评审通过：组合 A——TS + 裸 Canvas + Vite singlefile + Vitest） |

> 关联：共识文档 v1.2 / 模块清单 v1.1 / ADR-001-tech-stack

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
├── main.ts              # 入口：组装依赖 + 启动主循环
├── core/                # 主循环、状态机（7 态）、管线、唯一 World（players[] 复数化）
├── map/                 # 地形 7 类 + 1/4 子块 + 变体承载
├── player/              # 玩家实体（R5 起复数，兼容外缘见数据模型 §29）
├── enemy/               # 出生调度 + 三类 AI（威胁分层）
├── combat/              # 碰撞矩阵 C1~C17 SSoT + 冰面惯性运动模型
├── level/               # 三关配置 + 无尽公式 + 推进/重试（R2/R3）
├── powerup/             # 道具掉落/拾取/三效果（R2）
├── storage/             # localStorage 五档 + 静音偏好（R2/R3/R5）
├── effects/             # 纯视觉特效实体（R3）
├── audio/               # 程序化音效 dispatch/synth 两层（R3）
├── achievements/        # 8 成就触发/幂等/持久化（R4）
├── hud/                 # DOM 侧栏（双人行/成就明细）
├── input/               # 键盘双通道映射（SOLO/COOP）
└── render/              # Canvas 程序化绘制（草上层/特效/覆盖层）
tests/                   # Vitest 全量单测（数字随轮增长，见 CI）
.github/workflows/       # CI：PR 门禁 + master 自动部署 Pages（R5）
index.html
```

## 3. 运行时设计

### 3.1 主循环（AC-9 / AC-11 的承载）

- `requestAnimationFrame` 驱动 + **固定时间步累加器**（逻辑 60Hz）：渲染帧率波动不影响移动速度与碰撞精度
- 暂停（PAUSED）= 跳过 update、保留 render（画面冻结 + 暂停提示），计时器不累加 → AC-11 的「一切冻结」由单一开关保证

### 3.2 每帧管线

```
input(双通道采集) → updatePlayers(逐玩家) → updatePowerups(拾取，先于 combat——风险 §15)
→ trySpawn/updateEnemies(出生调度 + AI) → combat.update(子弹推进 + 碰撞矩阵 C1~C17)
→ updateEffects(纯视觉过期) → core.judge(按 mode/level 路由四种终态)
→ render(全量重绘 + 草上层 + 特效 + 覆盖层) → hud
```
<!-- v1 管线已被上式取代（F-ARCH-4c50）；v1 原文省略 powerup/effects/复数化 -->

- 13×13 体量下全量重绘 << 1ms，不做脏矩形优化（YAGNI）

### 3.3 模块协作约束

- **core 持有唯一 world state**，各模块通过显式参数读写，禁止模块间隐式全局引用
- render / hud 对实体状态**只读**
- 碰撞判定集中在 combat（单一职责），不散落在各实体内

## 4. 非功能映射

| 约束 | 架构保障 |
|------|---------|
| AC-9 60fps | 固定时间步 + 全量重绘的 O(实体数) 开销（峰值 ~20 实体） |
| AC-10 file:// | singlefile 构建产物（单 HTML，无外链资源） |
| N4 enum/常量 | constants.ts 集中 + TS enum/union；CI 阶段 `tsc --noEmit` 把关 |
| N5 程序化绘制 | render 模块纯 Canvas API，无素材加载路径 |
