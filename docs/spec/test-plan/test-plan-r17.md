# 测试计划 R17 — 战役扩展 L4/L5（LEVEL_COUNT 3→5，F29）

| 字段 | 值 |
|------|----|
| 轮次 | R17（基础常量 blast radius：LEVEL_COUNT 3→5） |
| 上游 | 共识 v16 §3.29 / AC-106~109 |
| G3 产物 | LEVEL_COUNT 影响面 checklist（§1）+ **基线冲击全量预判**（§2，blast radius 方法核心）+ 新覆盖用例（§3） |
| 方法说明 | 本轮为基础常量 refactor（非新行为），测试工作 ≈ 全量基线修订。预判先行（本文件）→ 实现 → 实测 churn 对账预判（§2 末）。新覆盖入 campaign.spec.ts。 |

## 1. LEVEL_COUNT 影响面 checklist（src，sentinel-grep 实证 2026-06-16）

### 1a. 派生项——零改自动跟随（红利验证，8 处）

| # | file:line | 语义 | LEVEL_COUNT=5 后 |
|---|-----------|------|------------------|
| 1 | update.ts:114 `level > LEVEL_COUNT` | 无尽判定 | 自动：L6+ 为无尽 |
| 2 | update.ts:134 `level === LEVEL_COUNT` | GAME_COMPLETE 触发 | 自动：L5 通关 |
| 3 | level.ts:167 `level === LEVEL_COUNT` | 战役终点 boss | 自动：L5 终点 |
| 4 | level.ts:169 `(level-LEVEL_COUNT)%BOSS_ENDLESS_EVERY` | 无尽里程碑 | 自动：L10/L15/L20 |
| 5 | level.ts:191 boss idx | 轮换序数 | 自动 |
| 6 | achievements.ts:121 `level === LEVEL_COUNT` | FULL_CLEAR/PURIST | 自动：L5 |
| 7 | hud.ts:25 `level/${LEVEL_COUNT}` | 关卡显示 | 自动：n/5 |
| 8 | level.ts:173 `level <= LEVELS.length` | 战役 vs 无尽配置 | 自动：LEVELS 增至 5 |

### 1b. 硬编码债——必须改（3 处）

| # | file:line | 现状 | 改为 |
|---|-----------|------|------|
| 9 | level.ts:414 enterEndless | `loadLevel(world, 4)` | `loadLevel(world, LEVEL_COUNT + 1)` |
| 10 | level.ts:375 variantLayout baseIdx | `(level - 4) % LEVELS.length` | `(level - LEVEL_COUNT - 1) % LEVELS.length` |
| 11 | level.ts:391 endlessConfig k | `level - 3` | `level - LEVEL_COUNT` |

### 1c. 新增

| # | 内容 |
|---|------|
| 12 | constants LEVEL_COUNT 3→5 |
| 13 | level.ts L4_LAYOUT/L5_LAYOUT + LEVELS +2（22 敌 7/7/8 间隔 1800；26 敌 8/9/9 间隔 1600）|

## 2. 基线冲击全量预判（blast radius 核心 — 实现前列全）

| 测试文件:位置 | 现断言（LEVEL_COUNT=3 语义）| 修订为（=5 语义）|
|---------------|------|------|
| boss.spec T-BOSS-1 | isBossLevel 3/8/13=T，1/2/4/7=F | 5/10/15=T；3/8/13=F；1/2/4=F |
| boss.spec T-BOSS-2 | loadLevel(3) 末位 BOSS | loadLevel(5) 末位 BOSS |
| summoner.spec T-SUM-3 | loadLevel 3/8/13 → BOSS/BOSS/SUMMONER | loadLevel 5/10/15 → BOSS/BOSS/SUMMONER |
| guardian.spec T-GRD-6 | loadLevel(18) → GUARDIAN | loadLevel(20) → GUARDIAN |
| level.spec T-LVL（L3 clear→GAME_COMPLETE）| world.level=3 clear → GAME_COMPLETE | =5 |
| level.spec T-LVL-5（new run）| world.level=3 | =5 |
| level.spec LEVELS toHaveLength | `toHaveLength(LEVEL_COUNT)` | **零改**（已派生，LEVELS 增至 5 自洽）|
| endless.spec driveToGameComplete helper | loadLevel(3) 清场→GAME_COMPLETE | loadLevel(5) |
| endless.spec L4 clear→LEVEL_CLEAR | loadLevel(5) line 140 区域 | 复核：L4 仍 LEVEL_CLEAR ✓；若断 L5 则改 |
| endless.spec enterEndless→L4 | 入无尽后 level=4 | level=6 |
| coop-endless.spec | loadLevel(3)→GAME_COMPLETE（39,82）；loadLevel(5)（106）| 3→5；5→7 区域复核 |
| coop.spec | loadLevel(3)→GAME_COMPLETE（262,267,274,302,306）| →5 |
| achievements.spec | loadLevel(3)→GAME_COMPLETE+FULL_CLEAR（78,80）| →5；loadLevel(7,8) ENDLESS_8 **零改**（字面 8 保留）|
| regression-coop.spec | world.level=3→GAME_COMPLETE（52,56）| →5 |

**对账规则**：实现后实测失败断言集 == 本表。出现表外失败 = 预判遗漏（method-miss，记录）；表内未失败 = 语义判断误（复核）。

## 3. 新覆盖用例（campaign.spec.ts，FAIL→PASS）

| 用例 | 预期 | 骨架态（LEVEL_COUNT=3 时）|
|------|------|--------|
| T-CAMP-1 | LEVELS 长度=5；L4/L5 enemyCounts=22/26、间隔 1800/1600 | FAIL（仅 3 关）|
| T-CAMP-2 | loadLevel(4)/loadLevel(5) 用 LEVELS 配置（非 endlessConfig）；地形含基地 (12,6) | FAIL |
| T-CAMP-3 | L5 清场 → GAME_COMPLETE；L4 清场 → LEVEL_CLEAR | FAIL |
| T-CAMP-4 | enterEndless 后 world.level === LEVEL_COUNT+1（6）| FAIL |
| T-CAMP-5 | isBossLevel(5/10/15/20)=T；isBossLevel(3/8/4/6/7)=F | FAIL |
| T-CAMP-6 | 派生零改守护：LEVEL_COUNT===5 且 hud 关卡分母派生 | 先绿/FAIL |

## 4. 零回归硬指标

实现后：§2 表内基线修订完成、§3 新用例转绿、其余测试零回归。tsc 净。blast radius 验证 = 实测 churn 与 §2 预判一致（这是本轮的方法交付）。
