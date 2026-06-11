# Audit 执行日志 — architecture phase（2026-06-11）

**执行者：** audit-agent（只读，铁律遵守：未改任何代码/文档）
**分支：** feature/r11-boss（工作区 clean，审计对象为当前 checkout）

---

## 读取清单

### Spec 侧
| 文件 | 版本/状态 | 行数 |
|------|----------|------|
| docs/spec/consensus.md | v12（2026-06-11，R13 并入） | 515 |
| docs/spec/modules.md | v11（2026-06-11） | 68 |
| docs/spec/architecture.md | **v2（2026-06-05，停更）** | 79 |
| docs/spec/code-map.md | v7（2026-06-11） | 67 |
| docs/adr/ | 仅 ADR-001-tech-stack | — |
| docs/audit/findings-registry.md | 上轮 8 条全 resolved | — |

### 实现侧
| 文件 | 用途 | 行数 |
|------|------|------|
| src/ 全目录 | 14 模块目录清点 | 19 个 .ts |
| src/core/update.ts | 每帧管线 + judge 三叉 | 145 |
| src/core/game.ts | 主循环 advance + 状态机入口 | 119 |
| src/main.ts | 接线 | 73 |
| src/core/types.ts | GameState 11 态 / GameMode 5 模式 / isPvP（节选） | — |
| grep 全量 import（src/*/*.ts + main.ts） | 跨模块依赖矩阵 | 89 条 import |
| 锚点抽查节选：combat.ts / enemy.ts / map.ts / level.ts / storage.ts / render.ts / input.ts / constants.ts | code-map 锚点核验 | — |

---

## 检查项执行记录

| # | 检查项 | 结果 |
|---|--------|------|
| 1 | 正向：模块清单 v11 → src/ | **14/14 覆盖**（core/map/player/enemy/combat/hud/input/render/level/powerup/storage/effects/audio/achievements 全有对应目录）；architecture §3.2 管线 vs update.ts 实际顺序 → **缺 updateShovel + spawnNeutralPowerup 两步，judge 路由描述过时**（F-e75d） |
| 2 | 反向：src/ → 文档 | **14/14 登记**，无未登记模块；选型有 ADR-001 支撑 ✅ |
| 3 | architecture.md 停更检查 | **确认停更 v2**：R7~R13 六处具体缺口（11 态/管线/judge/advance 分支/五模式/关联行）→ F-e75d（与上轮 F-ARCH-20260605-4c50 同模式复发） |
| 4 | ADR 缺口 | R8 judge 分叉 + isPvP、R13 advance WAVE_BREAK 分支两项达 ADR 触发条件而无 ADR → F-dd56 |
| 5 | 跨模块依赖（grep import） | **combat ↔ player 值导入真环 1 处**（damagePlayer ↔ moveTank/applySlide/firePlayerBullet）→ F-608f；core/world→level 值依赖 + level→core type-only 无运行时环 ✅；enemy→combat 单向 ✅ |
| 6 | code-map v7 锚点抽查 | 抽 7 处（超额于要求的 5）：**6 准 1 过时**（存档档位行「五档」→ 实际七档，F-291d） |

---

## 正反向计数与覆盖率

| 维度 | 计数 | 覆盖率 |
|------|------|--------|
| 模块正向（清单→代码） | 14/14 | 100% |
| 模块反向（代码→文档） | 14/14 | 100% |
| 管线步骤（architecture §3.2 vs update.ts） | 7/9 步在文档（缺 updateShovel/spawnNeutralPowerup） | 78% |
| GameState 态（architecture vs types.ts） | 7/11 在文档 | 64% |
| GameMode（architecture vs types.ts） | 0/5 在文档（architecture 未建模式概念） | 0% |
| code-map 锚点抽查 | 6/7 准确 | 86% |
| ADR 覆盖（架构级决策） | 1/3（tech-stack 有；judge 分叉、advance 分支无） | 33% |

---

## 发现计数

HIGH 0 / **MEDIUM 3**（e75d 停更复发、608f 循环依赖+清单失真、dd56 ADR 缺口）/ **LOW 3**（291d 档位行、2016 自检段、5d32 代码注释）

## 产出物

- 报告：docs/audit/2026-06-11-architecture.md
- 本日志：docs/audit/2026-06-11-architecture-log.md
- registry INSERT 建议：docs/audit/2026-06-11-architecture-proposals.md（6 条，状态 proposed，待父会话代 INSERT）
