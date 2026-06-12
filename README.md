# Tank World 🛡️

[![ci](https://github.com/Corray/tank-world/actions/workflows/ci.yml/badge.svg)](https://github.com/Corray/tank-world/actions/workflows/ci.yml)

经典坦克大战（Battle City 风格）——**单文件、零运行时依赖**的浏览器游戏，十三轮迭代（MVP / R2~R13）持续交付。

**▶ 在线游玩：** https://corray.github.io/tank-world/ （或下载 `dist/index.html` 双击即玩）

![双人合作模式](docs/assets/screenshot.png)

## 六种模式（标题画面按键进入）

| 按键 | 模式 | 说明 |
|------|------|------|
| 任意行动键 | 1P 战役 | 3 关递进 + 全通后无尽模式（难度无限递增），战役终点与无尽里程碑出 Boss |
| `2` | CO-OP 双人合作 | 2P 共守基地，独立键位 / 命数 / 计分，可接无尽 |
| `3` | VERSUS 双人对战 | 纯 PvP 对称竞技场，友军火力反转，双条件胜负 + best-of-3 |
| `4` | MELEE 混战 | 对战叠 NPC 第三方 hazard 的乱斗 |
| `5` | WAVE 波次防御 | 同图连续守基生存，波次递增 + 每 5 波 Boss + 倒计时自动开波 |
| `6` | CO-OP WAVE | 双人波次防御 |

## 操作

| 按键 | 功能 |
|------|------|
| WASD / 方向键 | 移动（单人双绑定；双人 P1=WASD、P2=方向键） |
| Space / J / Enter | 开火（单人 Space+J；双人 P1=J、P2=Enter） |
| P / R / M | 暂停 / 重开 / 静音 |

## 内容

- 6 种地形：砖墙（1/4 子块破坏）/ 钢墙 / 草丛（隐身）/ 河流 / 冰面（惯性滑行）/ 基地
- 7 种道具：护盾 / 双发 / 炸弹 / 星星（升级 L1→L4，L4 破钢）/ 铲子 / 冻结 / 加命
- 4 类敌人 AI（含 Boss：多 HP + HP 条 + 阶段狂暴）、8 个本地成就
- 最高分本地存档八档（七项分模式 / 分人数最高分 + 静音偏好）

## 技术

TypeScript + 裸 Canvas 2D（无引擎）+ Vite（singlefile）+ Vitest。277 个单元测试 + CI required check（`tsc --noEmit` 类型检查 + 全量测试门禁）+ master 合入自动部署 GitHub Pages。

```bash
npm ci && npm run dev    # 开发
npm run build            # 构建单文件 dist/index.html
npx vitest run           # 测试
```

## 工作流声明

本项目同时是 **agent-dev-standard** AI 协作工作流的公开实验场：十三轮迭代全部经由「PRD → 共识文档 → 设计门禁（G1~G3）→ 测试骨架锁定（G4）→ 实现 → 验收 → PR」流程交付，并经两轮全量审计（R6 / R14），全程留痕可审计。

- 全链路 spec 文档：[`docs/spec/`](docs/spec/)（共识 v12 / 模块清单 / 代码地图 / 12 份测试计划执行记录）
- 决策与问题留痕：[`docs/prd/`](docs/prd/) / [`docs/problems/`](docs/problems/) / [`docs/adr/`](docs/adr/) / [`docs/audit/`](docs/audit/)
