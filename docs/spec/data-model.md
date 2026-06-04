# tank-world — 数据模型与状态机

| 版本 | 日期 | 变更摘要 |
|------|------|---------|
| v1 | 2026-06-04 | 初版（从共识 v1.2 推导，待 G3 确认） |

> 关联：共识文档 v1.2（规则源）/ architecture.md v1（承载结构）。〔默认〕= 可调常量，集中于 `core/constants.ts`。

---

## 1. 坐标系与核心常量

| 常量 | 值〔默认〕 | 说明 |
|------|-----------|------|
| `GRID` | 13×13 | 逻辑格数（共识 §3.1） |
| `CELL` | 32px | 格边长；画布 416×416 |
| `SUB` | 16px | 砖墙子块边长（每格 2×2 子块，共识 1/4 粒度） |
| `TANK_SIZE` | 28px | 坦克碰撞盒（略小于格，转向容错） |
| `PLAYER_SPEED` | 96 px/s | 基准速度 |
| `ENEMY_FAST_FACTOR` | 1.5 | 快速型倍率（共识 §3.3） |
| `BULLET_SPEED` | 192 px/s | 所有子弹同速〔默认〕 |
| `PLAYER_LIVES` | 3 | 共识 §3.2 |
| `INVINCIBLE_MS` | 2000 | 重生无敌（共识 §3.2） |
| `ENEMY_TOTAL` / `ENEMY_CONCURRENT` | 10 / 4 | 共识 §3.3 |
| `SPAWN_INTERVAL_MS` | 2000 | 出生间隔〔默认〕 |
| `LOGIC_HZ` | 60 | 固定时间步频率 |

坐标：像素连续坐标（G1 推断 1 已确认），实体位置 = 碰撞盒中心点。

## 2. 枚举（N4 强制 enum）

```ts
enum GameState { READY, PLAYING, PAUSED, VICTORY, DEFEAT }
enum Terrain   { EMPTY, BRICK, STEEL, BASE }
enum EnemyType { BASIC, FAST, ARMORED }
enum Direction { UP, DOWN, LEFT, RIGHT }
enum BulletOwner { PLAYER, ENEMY }
```

## 3. 实体模型

| 实体 | 字段 | 说明 |
|------|------|------|
| `Tank`（基） | `pos {x,y}` / `dir` / `speed` / `alive` | 共用运动与碰撞盒 |
| `PlayerTank` | + `lives` / `invincibleUntil` / `spawnPos` | AC-5 |
| `EnemyTank` | + `type` / `hp`(1/1/3) / `score`(100/200/400) / `aiState {moveTimer, fireTimer}` | AC-3,4 |
| `Bullet` | `pos` / `dir` / `speed` / `owner: BulletOwner` | 玩家同屏 ≤1 发由 player 模块持引用计数实现（共识 §3.2） |
| `GameMap` | `grid: Terrain[13][13]` / `brickSub: Map<cellIdx, 4bit>` | 子块位掩码：bit0~3 = 左上/右上/左下/右下存活 |
| `World` | `state` / `player` / `enemies[]` / `bullets[]` / `map` / `score` / `spawnedCount` / `spawnTimer` / `spawnPointCursor` | core 唯一持有（architecture §3.3） |

## 4. 游戏状态机

```
READY ──(任意操作键)──→ PLAYING ──(P)──→ PAUSED
                          │  ↑___(P)______│
                          ├──(敌全灭: spawned==10 且场上 alive==0)──→ VICTORY
                          ├──(基地被毁)──────────────────────────→ DEFEAT
                          └──(玩家死亡且 lives==0)────────────────→ DEFEAT
VICTORY / DEFEAT ──(重新开始)──→ READY（World 全重置，分数清零，G1 推断 4）
```

合法转换仅以上 7 条；任何其他转换 = 非法（测试计划覆盖）。

## 5. 碰撞矩阵（家族维度 SSoT——测试计划直接从此表推导）

| # | 主体 × 对象 | 规则 | AC |
|---|------------|------|----|
| C1 | 子弹 × 砖墙 | 摧毁命中侧子块（命中行/列的 1~2 个子块），子弹消失 | AC-2 |
| C2 | 子弹 × 钢墙 | 子弹消失，墙无损 | AC-2 |
| C3 | 子弹 × 基地 | 基地毁 → DEFEAT（不论敌我子弹） | AC-6 |
| C4 | 子弹 × 边界 | 子弹消失 | — |
| C5 | 玩家子弹 × 敌坦克 | hp−1；hp=0 → 毁灭 + 计分 | AC-4,5 |
| C6 | 敌子弹 × 玩家 | 非无敌：lives−1 + 原点重生；无敌期：子弹消失玩家无伤〔默认〕 | AC-5 |
| C7 | 玩家子弹 × 敌子弹 | 双双相消 | AC-12 |
| C8 | 敌子弹 × 敌子弹 | 互相穿透 | AC-12 |
| C9 | 敌子弹 × 敌坦克 | 穿透（敌不伤敌，共识 §3.3） | — |
| C10 | 坦克 × 砖/钢/基地 | 阻挡（基地不可碾压） | AC-1 |
| C11 | 坦克 × 坦克 | 互相阻挡，无伤害（G1 推断 2） | AC-1 |
| C12 | 坦克 × 边界 | 阻挡 | AC-1 |

## 6. 敌人出生调度

- 出生点：顶行格 (0,0) / (0,6) / (0,12)，cursor 轮转〔默认〕
- 出生条件：`场上敌数 < 4` 且 `spawnedCount < 10` 且 `目标出生点无坦克占用`（占用则顺延至下一 tick 重试——G1 推断 3）且 `距上次出生 ≥ 2s`
- 出生序列〔默认〕：`BASIC, BASIC, FAST, BASIC, ARMORED, FAST, BASIC, ARMORED, FAST, ARMORED`（4 普通 / 3 快速 / 3 装甲，难度渐进）

## 7. 地图布局约束

具体布局数据实现期定稿（13×13 字面量数组），**设计约束**：
- 基地位于底边中央 (12,6)，三面砖墙护圈（共识 §3.1）
- 玩家出生点 (12,4)〔默认，基地左侧〕；3 个敌人出生点周边 1 格净空
- 砖墙为主、钢墙少量点缀，保证任一出生点到基地存在可破坏路径

## 8. 风险标注（G3 要求）

| 风险 | 缓解 |
|------|------|
| 子弹×子块命中判定精度（子弹中心 vs 子块边界） | 以子弹命中点所在子块行/列对判定，单元测试锁边界 case |
| 浮点累积导致速度漂移 | 固定时间步（LOGIC_HZ=60），dt 恒定 |
| 同帧多碰撞次序歧义（如子弹同帧过墙又中坦克） | combat 单一处理顺序：先按移动路径步进检测（子弹按子块步长扫描），先命中先生效 |
| 玩家同屏 1 发与相消叠加（子弹被相消后能否立即再射） | 子弹消亡（任何原因）即释放发射权，单测覆盖 |

## 9. 实现切片（G3 用例依赖图 → 实现阶段顺序）

```
P1 工程骨架(Vite+TS+Vitest) + 主循环 + 地图渲染   ← 可见：静态战场
P2 玩家移动 + 地形/边界碰撞 (C10,12)              ← 可玩：开坦克
P3 射击 + 砖子块破坏 + 钢墙 (C1,2,4)              ← 可玩：拆墙
P4 敌人出生调度 + 3 类 AI (§6)                    ← 可见：敌人活动
P5 伤害结算 + 相消 + 基地 + 胜负 (C3,5~9 + 状态机) ← 完整对局
P6 HUD + 暂停 + 重开 (AC-7,8,11)                  ← 完整体验
P7 singlefile 打包 + AC 全量验收                   ← 交付
```

每片独立可运行验证（incremental-verification），P1→P7 严格顺序依赖。
