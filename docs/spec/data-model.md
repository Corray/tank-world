# tank-world — 数据模型与状态机

| 版本 | 日期 | 变更摘要 |
|------|------|---------|
| v2 | 2026-06-04 | R2 增量：§10~14（关卡/道具/AI 分层/存档/状态机扩展），碰撞矩阵增 C13（待 R2-G3 确认） |
| v1 | 2026-06-04 | 初版（从共识 v1.2 推导，G3 已确认） |

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

---

# R2 增量（共识 v2 §3.7~3.10 推导）

## 10. 状态机扩展（替换 §4）

```
READY ──(操作键)──→ PLAYING ──(P)──→ PAUSED（互通）
                      │
                      ├──(本关敌全灭 且 当前关 < 3)──→ LEVEL_CLEAR ──(操作键)──→ PLAYING(下一关)
                      ├──(本关敌全灭 且 当前关 = 3)──→ GAME_COMPLETE ──(R)──→ READY(L1 全新 run)
                      └──(基地毁 / 命尽)──→ DEFEAT ──(R)──→ PLAYING(当前关重试)
```

- 新增枚举值：`GameState.LEVEL_CLEAR` / `GameState.GAME_COMPLETE`
- **DEFEAT 的 R 语义变更**（v1 为回 READY 全重置）：重试当前关——命数重置 3、本关得分清零、地图与道具重置、累计得分保留（AC-15）
- LEVEL_CLEAR / GAME_COMPLETE / DEFEAT 中暂停与射击无效（非法转换家族延续 T-SM-6）

## 11. 关卡模型

```ts
interface LevelConfig {
  layout: number[][];            // 13×13，三关各不相同
  enemyCounts: { BASIC: number; FAST: number; ARMORED: number };
  spawnIntervalMs: number;
}
const LEVELS: LevelConfig[3]     // L1 4/3/3@3000 · L2 5/5/4@2500 · L3 6/6/6@2000（共识 §3.7）
```

- World 增量字段：`level`(1~3) / `levelScore`(本关) / `bankedScore`(前关累计)；展示总分 = banked + level
- 出生序列改为**按构成生成**：每关按「普→快→装甲循环交错」生成定序数组〔默认，可测〕；携带者位 = 第 4/8/12 个
- 关卡地图设计约束（追加 v1 §7）：双层砖护圈（AC-22）；三关布局可辨识不同；钢墙比例随关数上升

## 12. 道具模型

```ts
enum PowerupType { SHIELD, DOUBLE_FIRE, BOMB }
interface Powerup { type: PowerupType; pos: Vec; }        // 场上待拾取
// World 增量：powerups: Powerup[]; powerupDropCursor（护盾→火力→炸弹循环）
// PlayerTank 增量：shieldUntil(ms, 复用 invincibleUntil 语义但独立字段); doubleFire: boolean
// EnemyTank 增量：carrier: boolean（闪烁标识 + 死亡掉落）
```

- **C13（碰撞矩阵增量）**：玩家 × 道具——box 重叠即拾取，效果即时生效；敌人/子弹与道具不交互
- 效果规则：护盾 10s 刷新制；火力 2 发上限（死亡回 1 / 过关保留）；炸弹全屏场上敌即死**不计分**、未出生不受影响（AC-19）
- 无敌判定合并：`isInvincible = clock < max(invincibleUntil, shieldUntil)`（C6 走同一分支）

## 13. AI 威胁分层（enemy 增量）

- 转向决策时（受阻或 turn 计时到）：BASIC 纯随机；FAST 50% 选朝**基地**方向分量；ARMORED 50% 选朝**玩家**方向分量；其余情况回落随机
- `ENEMY_FIRE_INTERVAL_MS` 1200 → 1800〔默认，手感调〕；出生间隔改为 per-level（§11）

## 14. 存档模型

```ts
const KEY_BEST_TOTAL = 'tank-world.best-total';   // 仅 GAME_COMPLETE 时比较写入
const KEY_BEST_LEVEL = 'tank-world.best-level';   // 任意单关结算（LEVEL_CLEAR/全通时本关分）比较写入
```

- 读失败/无值按 0；写失败（隐私模式）静默降级不影响游戏（风险标注）
- 展示位：READY / LEVEL_CLEAR / GAME_COMPLETE / DEFEAT 画面 + HUD 常驻〔默认〕

## 15. R2 风险标注

| 风险 | 缓解 |
|------|------|
| DEFEAT-R 重试语义与 v1「全重置」并存混淆 | restartToReady 仅保留给 GAME_COMPLETE；DEFEAT 走新 retryLevel()，单测锁两条路径 |
| 炸弹与同帧子弹击杀竞争（计分歧义） | 拾取处理在 combat 之前执行：炸弹即死的敌人不再参与本帧碰撞 |
| 火力 2 发与相消/死亡叠加 | 发射权按「场上玩家子弹数 < 上限」动态判定，沿用 4 消亡路径释放语义 |
| localStorage 异常（隐私模式/配额） | try/catch 包裹，降级为会话内最高分 |

## 16. R2 实现切片

```
Q1 状态机扩展 + 关卡推进/重试 + 计分分层（LEVEL_CLEAR/GAME_COMPLETE/retry）
Q2 三关地图 + 构成生成 + per-level 出生间隔 + 双层护圈
Q3 AI 威胁分层 + 射击间隔重调
Q4 道具全链路（携带者→掉落→拾取→三效果）
Q5 存档 + 画面/HUD 展示
Q6 平衡试调（指标：首局存活≥60s）+ 打包验收
```
