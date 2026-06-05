# tank-world — 数据模型与状态机

| 版本 | 日期 | 变更摘要 |
|------|------|---------|
| v5 | 2026-06-05 | R5 增量：§29~32（players[] 复数化策略/双人碰撞扩展 C17/模式分叉/CI 管道）（待 R5-G3 确认） |
| v4 | 2026-06-05 | R4 增量：§23~27（地形扩展 C14~C16/冰面惯性/变体生成/成就模型）（R4-G3 已确认） |
| v3 | 2026-06-04 | R3 增量：§17~21（特效/音效/无尽/状态机 ENDLESS_OVER/存档新档位）（R3-G3 已确认） |
| v2 | 2026-06-04 | R2 增量：§10~14（关卡/道具/AI 分层/存档/状态机扩展），碰撞矩阵增 C13（R2-G3 已确认） |
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
| `ENEMY_SPEED` | 96 px/s | 敌方基准速度（与玩家同值，独立常量便于分调）（F-DM-6bc0 反向项补录） |
| `ENEMY_FAST_FACTOR` | 1.5 | 快速型倍率（共识 §3.3） |
| `BULLET_SPEED` | 192 px/s | 所有子弹同速〔默认〕 |
| `PLAYER_LIVES` | 3 | 共识 §3.2 |
| `INVINCIBLE_MS` | 2000 | 重生无敌（共识 §3.2） |
| `ENEMY_TOTAL` / `ENEMY_CONCURRENT` | 10 / 4 | 共识 §3.3 |
| `SPAWN_INTERVAL_MS` | 2000 | 出生间隔〔默认〕<!-- 已被 §11 取代：per-level 3000/2500/2000（F-DM-6bc0① 标注） --> |
| `LOGIC_HZ` | 60 | 固定时间步频率 |

坐标：像素连续坐标（G1 推断 1 已确认），实体位置 = 碰撞盒中心点。

## 2. 枚举（N4 强制 enum）

```ts
enum GameState { READY, PLAYING, PAUSED, VICTORY, DEFEAT } // 已被 §10/§20 取代：VICTORY→LEVEL_CLEAR/GAME_COMPLETE，增 ENDLESS_OVER（F-DM-6bc0② 标注）
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

## 4. 游戏状态机 <!-- 已被 §10（R2）与 §20（R3）取代，本节为 v1 史迹（F-DM-6bc0③ 标注） -->

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
- 出生序列〔默认〕：`BASIC, BASIC, FAST, BASIC, ARMORED, FAST, BASIC, ARMORED, FAST, ARMORED`（4 普通 / 3 快速 / 3 装甲，难度渐进）<!-- 已被 §11 取代：按构成轮转生成（F-DM-6bc0④ 标注） -->

## 7. 地图布局约束

具体布局数据实现期定稿（13×13 字面量数组），**设计约束**：
- 基地位于底边中央 (12,6)，三面砖墙护圈（共识 §3.1）
- 玩家出生点 (12,4)〔默认，基地左侧〕<!-- 已被 §11/§31 取代：P1=(12,2)、P2=(12,10)（F-DM-6bc0⑤ 标注） -->；3 个敌人出生点周边 1 格净空
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

---

# R3 增量（共识 v3 §3.11~3.13 推导）

## 17. 特效模型（effects 模块）

```ts
enum EffectKind { EXPLOSION, BASE_EXPLOSION, SPARK, SCORE_FLOAT }
interface Effect {
  kind: EffectKind;
  pos: Vec;
  bornAt: number;        // world.clock
  durationMs: number;    // 常量表：400 / 800 / 150 / 600
  text?: string;         // SCORE_FLOAT 用（'+100' 等）
  color?: string;        // 爆炸主色（敌/玩家区分）
}
// World 增量：effects: Effect[]; flashUntil: number（受击全屏白闪截止钟）
```

- 生成点：combat 击毁敌（EXPLOSION+SCORE_FLOAT）/ damagePlayer（EXPLOSION + flashUntil=clock+150ms〔默认〕）/ 基地毁（BASE_EXPLOSION）/ 子弹命中砖钢（SPARK）
- `updateEffects(world)`：按 clock 过期清除——纯函数式时间判断，**不参与任何碰撞**（AC-23）
- 暂停冻结天然成立：clock 不前进 → 特效静止（沿用 AC-11 单闸门）

## 18. 音效模型（audio 模块，两层分离设计）

```ts
enum SoundEvent { FIRE, HIT_BRICK, HIT_STEEL, ENEMY_DOWN, PLAYER_DOWN, PICKUP, LEVEL_CLEAR, DEFEAT }
// dispatch 层（可单测）：playSound(event) → muted 判断 + 配方选择 → synth 层
// synth 层（浏览器 only）：WebAudio oscillator/noise + envelope；node 环境静默降级
```

- 配方概要〔默认，实现微调〕：射击=方波短促 / 命中砖=噪声脆响 / 钢=金属高频 / 击毁=噪声爆裂 / 玩家死=下行扫频 / 拾取=上行双音 / 过关=三连上行 / 失败=低频长音
- `muted` 状态：内存 + `tank-world.muted` 持久化；M 键 toggle（input 模块新指令）
- AudioContext 懒初始化，首次按键 resume（autoplay 策略）；无 AudioContext 环境（node/老浏览器）全链路静默降级

## 19. 无尽模式（level 模块扩展）

```ts
function endlessConfig(level: number): LevelConfig {   // level ≥ 4
  const k = level - 3;
  const layout = LEVELS[(level - 4) % 3].layout;       // L1→L2→L3 轮换
  const total = 18 + 2 * k;
  const armoredRatio = Math.min(0.5, 1 / 3 + 0.05 * k);
  const ARMORED = Math.round(total * armoredRatio);
  const FAST = Math.round((total - ARMORED) / 2);
  const BASIC = total - ARMORED - FAST;
  const spawnIntervalMs = Math.max(1200, 2000 - 100 * k);
  return { layout, enemyCounts: { BASIC, FAST, ARMORED }, spawnIntervalMs };
}
```

- `loadLevel` 扩展：level ≤ 3 用 LEVELS 表，level ≥ 4 用 endlessConfig
- **进入无尽**：GAME_COMPLETE 画面按操作键 → `enterEndless(world)`：记录 `endlessStartBanked = bankedScore`，loadLevel(4)，state=PLAYING；命数不重置（共识 §3.13）
- **无尽结算分** = `bankedScore + score − endlessStartBanked`（仅 L4 起的累计）
- World 增量：`endlessStartBanked: number`（非无尽期为 −1 哨兵〔默认〕，用于判别是否处于无尽 run）

## 20. 状态机扩展（替换 §10 图）

```
GAME_COMPLETE ──(R)──→ READY(全新 run)
      └──(操作键)──→ PLAYING(L4 无尽，enterEndless)
PLAYING(L≥4) ──(本关敌全灭)──→ LEVEL_CLEAR ──(操作键)──→ PLAYING(L+1)   ← 照旧
PLAYING(L≥4) ──(基地毁/命尽)──→ ENDLESS_OVER（结算 best-endless）──(R)──→ READY(全新 run)
```

- 新枚举值 `GameState.ENDLESS_OVER`；**无尽死亡无重试**（DEFEAT-R 重试仅 L1~3）
- ENDLESS_OVER 中 P/射击/操作键均无效（非法转换家族延续）
- judge 扩展：死亡分支按 `level > 3` 路由 DEFEAT vs ENDLESS_OVER；ENDLESS_OVER 时提交 `submitEndless(无尽结算分)`

## 21. 存档扩展 + R3 风险

```ts
const KEY_BEST_ENDLESS = 'tank-world.best-endless';  // 无尽段累计分
const KEY_MUTED = 'tank-world.muted';                // '1' / '0'
```

| 风险 | 缓解 |
|------|------|
| 特效数量峰值（炸弹清场 = 同帧 N 个爆炸+飘字）GC 压力 | Effect 为纯数据对象，数组过滤复用；AC-31 压测覆盖 |
| WebAudio 在 node 测试环境不存在 | dispatch/synth 两层分离，synth 全部 try/catch + 环境探测 |
| GAME_COMPLETE 操作键二义（截图/误触立即进无尽） | 进入 GAME_COMPLETE 后 1s 内忽略操作键〔默认，防误触〕 |
| best-total 与 best-endless 档位互渗 | T-EN-5 显式断言互不污染 |

## 22. R3 实现切片

```
S1 特效全链路（实体/生成点/过期/白闪/渲染）
S2 音效两层（dispatch+synth+静音持久化+M 键）
S3 无尽模式（endlessConfig/enterEndless/ENDLESS_OVER/best-endless）
S4 打包 + 压测（AC-31）+ 浏览器验收
```

---

# R4 增量（共识 v4 §3.14~3.16 推导）

## 23. 地形扩展

```ts
enum Terrain { EMPTY=0, BRICK=1, STEEL=2, BASE=3, BUSH=4, WATER=5, ICE=6 }
```

**碰撞矩阵增量：**

| # | 主体 × 对象 | 规则 | AC |
|---|------------|------|----|
| C14 | 坦克 × 河流 | 阻挡（`solidForTankAt` 返回 true） | AC-33 |
| C15 | 子弹 × 草/河/冰 | 穿透——`advanceBullet` 仅拦 BRICK/STEEL/BASE，新地形**结构性免费成立** | AC-32,33 |
| C16 | 坦克 × 冰面 | 通行 + 惯性滑行（§24） | AC-34 |
| — | 草丛 | 纯渲染层规则（坦克上层绘制），无碰撞条目 | AC-32 |

## 24. 冰面惯性运动模型（combat 扩展）

```ts
// Tank 增量字段（optional，向后兼容既有测试对象字面量）：
interface Tank { ...; slide?: { dir: Direction; speed: number } | null }
```

- **进入条件**：坦克中心所在格为 ICE 时，每次主动移动刷新 `slide = {dir, speed: tank.speed}`
- **滑行**：无主动移动的帧，若 `slide` 存在 → 按 slide 方向推进，速度乘衰减系数 `ICE_DECAY`〔默认每帧 0.92 @60Hz，≈0.5s 滑停〕，低于阈值（8px/s〔默认〕）清零
- **约束**：滑行走 `moveTank` 同一受阻逻辑（不穿墙不出界，受阻即清 slide）；**离开冰面格即清 slide**（立即停）
- **AI 对称**：敌人同规则（updateEnemies 的移动同样刷新/受滑行影响）
- `loadLevel` / 重生清 slide（换关与死亡不带惯性）

## 25. 无尽地形变体（确定性）

- 每张布局配 `VARIANT_SLOTS`：人工标注的 12 个安全空地格（**排除出生点、护圈、护圈正面通路**——靠候选表而非通路分析保证可玩，risk 见 §27）
- 变体生成：以关号为种子的确定性 LCG（自实现，不用 Math.random）选取 `6 + seed % 5` 个槽位，地形按 草→河→冰 循环填充
- 同关号 → 同变体（可测可复现，AC-35）；仅 level ≥ 4 应用变体，L1~L3 用手工改版图

## 26. 成就模型（achievements 模块）

```ts
enum AchievementId { FIRST_BLOOD, NO_DEATH_LEVEL, FULL_CLEAR, ENDLESS_8, COLLECTOR, DEMOLITION, PURIST, CENTURION }
// 存储：tank-world.achievements = JSON id 数组；tank-world.kills = 累计击杀数
// World 追踪字段（run 级，restart 清零）：
//   runPickupTypes: PowerupType[]（COLLECTOR/PURIST）
//   levelStartLives: number（NO_DEATH_LEVEL，loadLevel 时快照）
```

| 钩子位置 | 成就 |
|---------|------|
| combat 击毁敌 | FIRST_BLOOD / CENTURION（累计计数持久化）/ DEMOLITION 由 hitBrick 后砖计数归零触发 |
| powerup 拾取 | COLLECTOR（types 集齐 3） |
| judge LEVEL_CLEAR/GAME_COMPLETE | NO_DEATH_LEVEL（lives === levelStartLives）/ FULL_CLEAR / PURIST（FULL_CLEAR 且 runPickupTypes 空） |
| loadLevel | ENDLESS_8（level ≥ 8） |

- `unlock(id)` 幂等：已解锁直接返回；新解锁 → 持久化 + `EffectKind.TOAST`（2.5s 顶部横幅）
- map 需提供 `brickCellsRemaining(): number`（DEMOLITION 判定）
- toast 无音效〔默认〕

## 27. R4 风险标注

| 风险 | 缓解 |
|------|------|
| 变体河流堵死通路 | 不做通路分析，**候选槽位表人工标注**保安全；T-MAPV-2 锁出生点/护圈不被覆盖 |
| 冰面惯性与既有测试对象兼容 | `slide` 为 optional 字段；预判基线零修订，T-PLY-4「无输入不漂移」在非冰地面天然成立 |
| 惯性手感翻车 | ICE_DECAY 集中常量；降级路径（延迟停止）在共识 OPEN-R4-1 预留 |
| DEMOLITION 在无砖关卡空触发 | 触发条件含「该关初始砖数 ≥ 1」 |
| toast 与状态覆盖层重叠 | toast 渲染于 overlay 之下、HUD 区之上（顶部横幅位） |

## 28. R4 实现切片

```
W1 地形三件套（enum/碰撞 C14~C16/渲染层）+ L1~L3 改版图
W2 冰面惯性（slide 模型 + AI 对称 + 清理时机）
W3 无尽变体（VARIANT_SLOTS + LCG + 接入 loadLevel）
W4 成就全链路（8 触发 + 幂等 + toast + READY/HUD 展示）
W5 打包 + 浏览器验收
```

---

# R5 增量（共识 v5 §3.17~3.18 推导）

## 29. players[] 复数化策略（核心结构决议的实施方案）

```ts
enum GameMode { SOLO = 'SOLO', COOP = 'COOP' }
interface PlayerTank { ...; id: 1 | 2; score: number }   // 个人累计分（展示用，跨关不清）
interface Bullet { ...; playerId?: 1 | 2 }               // 玩家子弹归属（发射权/计分）
// World：players: PlayerTank[]（唯一状态）+ mode: GameMode
```

**兼容外缘（基线零修订的实现手段，G1 重点确认项）**：
- `world.player` 保留为 **players[0] 的只读别名 getter**（零状态复制，非 player2 式平行字段——不违背「彻底复数化」决议：状态唯一在 players[]，别名仅为 v1~v4 基线 147 块提供稳定接口；新代码一律用 players[]）
- `damagePlayer(world, player = world.players[0])` / `firePlayerBullet(world, player = ...)` / `updatePlayer(world, dt, input, player = ...)` —— 默认参保持单数调用兼容，管线层新增 `updatePlayers` 复数入口
- 断言强度扫描结论（R4 教训方法落地）：基线对 `world.player` 全部为**属性访问与字段赋值**（无整体替换赋值、无引用相等断言）→ 别名 getter 下预判**基线零修订**

## 30. 碰撞矩阵扩展

| # | 主体 × 对象 | 规则 | AC |
|---|------------|------|----|
| C6′ | 敌弹 × 任一玩家 | 命中即该玩家结算（无敌/护盾个人判） | AC-40 |
| C11′ | 玩家 × 玩家 | 互阻不互伤（tankAreaFree 含全体 players） | AC-41 |
| C13′ | 玩家 × 道具 | 按拾取者结算，效果归个人；炸弹仍全场 | AC-42 |
| **C17** | 玩家子弹 × 玩家坦克 | **互相穿透**（玩家子弹跳过全部玩家） | AC-41 |

发射权：`bullets.filter(owner=PLAYER && playerId===p.id).length < cap(p)`，cap 按该玩家 doubleFire。

## 31. 模式分叉点（全清单——分叉藏漏是本轮最大风险）

| 分叉点 | SOLO | COOP |
|--------|------|------|
| 开局 | 操作键（既有） | READY 按 2 |
| players | [P1] | [P1, P2]，P2 spawn (12,10)、键位 Arrows+Enter |
| 判负 | P1 死 | **全员**死 或 基地毁 |
| 计分入档 | 三档照旧 | 合计入 `best-coop`（新 key），三档不写 |
| 成就钩子 | 照常 | **全部 gate 掉** |
| 无尽入口 | GAME_COMPLETE 操作键 | **无入口**（enterEndless 拒绝 COOP） |
| AI ARMORED 目标 | P1 | 最近存活玩家 |
| 重试 | P1 复活满命 | 双复活满命 |
| HUD | 现状 | 双行（P1/P2 各 lives+score）+ 合计 |

## 32. CI 与发布管道

- `.github/workflows/ci.yml`：PR → `npm ci && npx tsc --noEmit && npx vitest run`；master push → build + `actions/deploy-pages`（官方 Pages workflow，`dist/` 为 artifact）
- 仓库转 public + Pages 开启（build_type=workflow）
- 风险：Pages 首次部署需仓库设置生效，CI 红灯案例在 PR 实测（AC-45 的 [M] 验证）

## 33. R5 风险标注

| 风险 | 缓解 |
|------|------|
| 模式分叉点遗漏（最大风险） | §31 全清单 + 测试计划逐行映射；audit 候选检查项 |
| 别名 getter 被新代码滥用 | 代码注释标 deprecated + 实现总结声明；R6 候选清理项 |
| per-player 发射权与相消叠加 | 沿用 4 消亡路径语义，playerId 维度单测 |
| 转 public 后历史可见 | 已评审确认（含勘误链公开） |

## 34. R5 实现切片

```
V1 复数化内核 + 兼容外缘（players[]/mode/别名/默认参）→ 基线 147 全绿即里程碑
V2 双人模式（开局选择/键位/出生/判负/重试/HUD）
V3 双人战斗语义（C6′/C11′/C13′/C17/发射权/计分/best-coop/gate 成就与无尽）
V4 CI workflow + 转 public + Pages + README
V5 浏览器双人验收 + dogfood 重构样本数据记录
```

---

# R7 增量（共识 v6 §3.19~3.20 推导）

## 35. 模式分叉清单 v2（写入点级，AC-51 判据：行数 = grep 命中数）

**grep 基准（2026-06-05，src 全量）：** mode 分叉 8 + storage 写入 4 + 成就钩子 5 = **17 行**

### 35.1 mode 分叉点（grep `GameMode.|mode ===|mode !==` 排除定义/导入，8 命中）

| # | 调用点 | 现行为 | R7 处置 |
|---|--------|--------|---------|
| 1 | render.ts:278 overlayLines 无尽提示 SOLO 门控 | COOP 不显示 | **移除门控**（双模式均显示，AC-47） |
| 2 | update.ts:67 submitLevelScore SOLO 门控 | COOP 不写 best-level | 不变（含 2P 无尽关） |
| 3 | update.ts:72 submitCoop/Total 分叉 | 全通入账分流 | 不变 |
| 4 | main.ts:25 输入双通道 | 键位映射分流 | 不变 |
| 5 | achievements.ts:96 coopGated | COOP 全禁 | **整体移除**（§35.3 逐钩子团队语义替代） |
| 6 | game.ts:18 startCoop | 模式设置 | 不变 |
| 7 | level.ts:221 enterEndless SOLO 门控 | COOP 被拒 | **移除门控**（AC-47） |
| 8 | hud.ts:26 双人行分叉 | P1/P2 行 | 扩展：+BEST CO-OP∞ 第六档行 |

### 35.2 storage 写入点（grep `submit*(` 调用处，4 命中）

| # | 调用点 | 现行为 | R7 处置 |
|---|--------|--------|---------|
| 9 | update.ts:52 submitEndless | **无 mode 门控**（COOP 原不可达） | **⚠️ 必须分叉**：COOP→`submitCoopEndless`（第六档 KEY_BEST_COOP_ENDLESS）/ SOLO→原档——**方法设计期抓获的 #6 同款隐患** |
| 10 | update.ts:67 submitLevelScore | SOLO 门控 | 不变（同 #2） |
| 11 | update.ts:72 submitCoop | COOP 全通 | 不变 |
| 12 | update.ts:73 submitTotal | SOLO 全通 | 不变 |

### 35.3 成就钩子调用点（grep `on*(` 调用处，5 命中；coopGated 移除后逐钩子语义）

| # | 调用点 | R7 团队语义 |
|---|--------|------------|
| 13 | update.ts:62 onLevelCleared | NO_DEATH=**全员**满命（需 per-player levelStartLives 快照，见 §36）；FULL_CLEAR/PURIST 团队语义（runPickupTypes 本就 world 级=团队合计，**免费**） |
| 14 | combat.ts:197 onBrickDestroyed | DEMOLITION 模式无关，直接开放 |
| 15 | combat.ts:218 onEnemyKilled | FIRST_BLOOD/CENTURION 任一玩家计入；kills 跨模式累计（OPEN-R7-3） |
| 16 | powerup.ts:46 onPickup | COLLECTOR 团队合计（world 级聚合，免费） |
| 17 | level.ts:150 onLevelLoaded | ENDLESS_8 模式无关，直接开放 |

## 36. 结构增量

```ts
const KEY_BEST_COOP_ENDLESS = 'tank-world.best-coop-endless';  // 第六档
// PlayerTank 增量：levelStartLives: number（NO_DEATH 全员判定的 per-player 快照，loadLevel 时落）
// world.levelStartLives 保留（SOLO 兼容）但判定改用 per-player 快照统一逻辑
```

## 37. 基线冲击预判（断言强度扫描）

恰 2 处，均为 spec 行为反转所致的**必然修订**（v6 改判依据齐备）：
- T-2P-16「achievements gated off in co-op」→ 断言被 §3.20 反转
- T-2P-17「no endless entry for co-op」→ 断言被 §3.19 反转
其余 173 块无 world.player 类引用风险（R6-D 已清），预判零额外修订。

## 38. R7 实现切片

```
X1 第六档 + submitEndless 分叉（§35.2-9 隐患修复先行）+ enterEndless/overlay 门控移除
X2 成就团队语义（coopGated 移除 + per-player 快照 + 逐钩子）
X3 HUD 第六档行 + 浏览器验收 + 基线修订 2 处（依据 v6）
```
