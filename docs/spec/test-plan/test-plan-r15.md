# 测试计划 R15 — Boss 扩展·SUMMONER（F27）

| 字段 | 值 |
|------|----|
| 轮次 | R15（召唤型 Boss + 里程碑轮换 + HP 调参） |
| 上游 | 共识 v14 §3.27 / AC-96~101 |
| G3 产物 | EnemyType 扩展影响面 checklist（§1，家族第四证）+ 基线冲击预判（§2）+ 用例清单（§3） |

## 1. EnemyType.SUMMONER 扩展影响面（grep 实证 2026-06-12）

| # | 影响点 | 处置 | 类别 |
|---|--------|------|------|
| 1 | types EnemyType.SUMMONER + `isBossType(t)=BOSS\|\|SUMMONER` 锚 | 新增 | 结构 |
| 2 | constants ENEMY_HP/ENEMY_SCORE `as const` 表 +SUMMONER（6/800） | **穷举**（拦截点=createEnemy `ENEMY_HP[type]` 索引，使用点报错非定义点——形态修正 R11 认知） | 结构 |
| 3 | render COLOR.enemy +SUMMONER（拦截点=`COLOR.enemy[e.type]` 索引） | **穷举** | 结构 |
| 4 | render:35 HP 条 `type===BOSS` → `isBossType(type)` | 新分支（决策点 1） | 行为 |
| 5 | enemy:92 AI `type===BOSS` 旁加 SUMMONER 平行分支（召唤计时/上限/狂暴加速；射击走普通单发） | 新分支（决策点 2） | 行为 |
| 6 | level:189（loadLevel）/338（applyWave）注入 `EnemyType.BOSS` → `bossTypeFor(idx)` | 新分支（决策点 3/4） | 行为 |
| 7 | EnemyTank.ai 加 summonMs 可选字段 + createEnemy SUMMONER 初始化 | 结构+行为 | — |
| 8 | combat/judge/powerup/storage | 零改声明：召唤兵 push enemies 不动 spawnedCount/enemyTotal → fieldClear 涌现；C5 多 HP 复用；FREEZE 全局门控涌现冻召唤 | 复用 |

## 2. 基线冲击预判（grep 实证）

| 断言点 | 现状 | 冲击 |
|--------|------|------|
| boss.spec:62 狂暴阈值 | `Math.floor(BOSS_HP/2)` 常量引用 | BOSS_HP 10→8 **零冲击**（跟随） |
| tests 全文 `toBe(10)`/`toBe(1000)` 断 BOSS 属性 | 零命中（全经 BOSS_HP/BOSS_SCORE） | 零冲击 |
| wave.spec:117 T-WAV-3 applyWave(5) 末位 BOSS | wave5=里程碑 idx1=奇=BOSS | **零冲击**（交替规则兼容） |
| boss.spec L3 末位 BOSS | 战役恒 BOSS | 零冲击 |

**预判：零基线修订**（家族第四证——若实测出现任何修订即方法失效信号）。

## 3. 用例清单（G4 骨架基线）

| 用例 | 预期 | 骨架态 |
|------|------|--------|
| T-SUM-1 | createEnemy(SUMMONER)：hp=6/score=800/基准速度 | 先绿（结构数据） |
| T-SUM-2 | bossTypeFor(1/3)=BOSS，(2/4)=SUMMONER | FAIL |
| T-SUM-3 | loadLevel：L3/L8 末位 BOSS，L13 末位 SUMMONER | FAIL |
| T-SUM-4 | applyWave：wave5=BOSS，wave10=SUMMONER | FAIL |
| T-SUM-5 | summonMs 归零 → +1 BASIC；spawnedCount/enemyTotal 不变 | FAIL |
| T-SUM-6 | 同屏 4 alive → 跳过召唤 | 先绿（**假绿**实测修正：依赖召唤桩，同 T-SUM-8/R13-G2 形态——预判 FAIL 失准，假绿形态第三例累积） |
| T-SUM-7 | hp≤3 狂暴 → 召唤间隔=SUMMON_RAGE_MS（常态=SUMMON_MS） | FAIL |
| T-SUM-8 | FREEZE 窗口内不召唤 | 先绿（**假绿**：依赖召唤桩，R13-G2 同形态，实现后真守护） |
| T-SUM-9 | SUMMONER 末位死后召唤兵存活 → 不过关；清完 → LEVEL_CLEAR | FAIL |
| T-SUM-G1 | 狂暴 SUMMONER 单步只发 1 弹（无三向，与 BOSS 差异） | 先绿（普通分支即单发） |
| T-SUM-G2 | wave4 / L7 无任何 isBossType 敌（扩 T-WAV-3 只查 BOSS 的弱化点） | 先绿 |

## 4. 零回归硬指标

既有 277 全绿不许变红（§2 预判零修订）。重点：T-BOSS-* 全套（HP 调参跟随）、T-WAV-3、穷举索引点 tsc。
