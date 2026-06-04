# tank-world R3 — 测试计划

| 版本 | 日期 | 变更摘要 |
|------|------|---------|
| v1.1 | 2026-06-04 | 执行完毕：120/120（基线 94 零修订 + R3 26）；[M] 记录见 §5 |
| v1 | 2026-06-04 | 初版（从共识 v3 AC-23~31 + 数据模型 §17~21 推导，R3-G3 已确认） |

> 载体：**[U]** Vitest / **[M]** 浏览器手动。v1+v2 共 94 断言块为回归基线。
> **基线冲击预判：零修订**——R3 不改既有语义（GAME_COMPLETE 操作键此前无行为，新增不冲突）；实现中若发现需修订，按 R2 同款约定（独立 commit + 逐条依据）。

---

## 1. 家族维度枚举

| 家族 | 维度展开 | 用例段 |
|------|---------|--------|
| 特效 × 事件源 | {敌毁, 玩家死, 基地毁, 命中砖, 命中钢, 击杀计分} × {生成, 时长, 过期} | §2.1 |
| 音效 × 事件 | 8 类事件 → dispatch 配方映射逐一 | §2.2 |
| 静音 × 路径 | {即时生效, 持久化, 重载恢复, 无 AudioContext 降级} | §2.2 |
| 无尽公式 × 采样关 | {L4, L7, L11, L23} 采样断言（总数/间隔下限/装甲封顶） | §2.3 |
| 无尽 × 状态机 | {进入, 过关推进, 死亡结算, 无重试, 非法转换} | §2.3 |
| 档位隔离 | best-total / best-level / best-endless 三档互不污染 | §2.3 |

## 2. 用例清单 [U]

### 2.1 特效（tests/effects.spec.ts）

| ID | 场景 | 预期 |
|----|------|------|
| T-FX-1 | 玩家子弹击毁敌人 | 生成 EXPLOSION + SCORE_FLOAT（text=对应分值）于击毁点 |
| T-FX-2 | 基地被毁 | 生成 BASE_EXPLOSION（duration 800ms） |
| T-FX-3 | 子弹命中砖 / 钢 | 各生成 SPARK（150ms） |
| T-FX-4 | 时钟超过 bornAt+duration | updateEffects 清除该特效 |
| T-FX-5 | 暂停期间 | clock 冻结 → 特效不过期不推进（loop 闸门复用） |
| T-FX-6 | 玩家被击中（非无敌） | flashUntil = clock+150ms；EXPLOSION 生成于受击点 |
| T-FX-7 | 特效存在时实体行为不变 | 坦克/子弹穿过特效区域，碰撞结果与无特效一致（sanity） |

### 2.2 音效（tests/audio.spec.ts，dispatch 层）

| ID | 场景 | 预期 |
|----|------|------|
| T-AU-1 | 8 类 SoundEvent 逐一 playSound | synth 层收到对应配方调用（spy/记录器注入） |
| T-AU-2 | muted=true 时 playSound | synth 层零调用 |
| T-AU-3 | toggleMute | 状态翻转 + localStorage('tank-world.muted') 同步（mock） |
| T-AU-4 | 无 AudioContext 环境 | 全链路不抛错（node 原生环境即此 case） |
| T-AU-5 | 战斗集成：击毁敌触发 ENEMY_DOWN，命中砖触发 HIT_BRICK | 事件源接线正确（记录器断言） |

### 2.3 无尽模式（tests/endless.spec.ts）

| ID | 场景 | 预期 |
|----|------|------|
| T-EN-1 | endlessConfig 采样 L4/L7/L11/L23 | L4: 总 20/间隔 1900；L7: 总 26/1600；L11: 间隔=1200（下限触底）；L23: 装甲占比=50%（封顶）；各关 BASIC+FAST+ARMORED=总数 |
| T-EN-2 | 地图轮换 | L4=L1 图 / L5=L2 图 / L6=L3 图 / L7=L1 图 |
| T-EN-3 | GAME_COMPLETE 按操作键 | enterEndless：state=PLAYING / level=4 / endlessStartBanked=入口时 banked / 命数不重置 |
| T-EN-4 | 无尽关清场 | → LEVEL_CLEAR 照旧，操作键 → L5 |
| T-EN-5 | 三档隔离 | 全通写 best-total；无尽死亡只写 best-endless（=L4 起累计）；best-total/best-level 数值不被无尽改变 |
| T-EN-6 | 无尽死亡（基地毁 或 命尽） | → ENDLESS_OVER（非 DEFEAT）；submitEndless(banked+score−endlessStartBanked) |
| T-EN-7 | ENDLESS_OVER 非法转换 | P/射击无效；retryLevel 拒绝（非 DEFEAT）；R → 全新 run（READY/L1/分数清零） |
| T-EN-8 | GAME_COMPLETE 防误触窗口 | 进入后 1s 内操作键不触发 enterEndless，1s 后触发 |
| T-EN-9 | DEFEAT-R 重试仅限 L1~3 | level≤3 死亡仍走 DEFEAT + 重试语义（回归保护） |

## 3. 手动验收 [M]

| ID | 场景 | 预期 |
|----|------|------|
| M-R3-1 | 特效观感 | 爆炸/火花/飘字可辨识、不遮挡操作；白闪 ≤200ms 不晕 |
| M-R3-2 | 音效区分度 | 8 类事件闭眼可辨；M 键即时静音；刷新后保持 |
| M-R3-3 | file:// 单文件 | 产物单文件，首键后音效可用（AC-27） |
| M-R3-4 | 无尽体验 | GAME_COMPLETE「继续无尽」入口可见；HUD LEVEL n/∞；递增可感知 |
| M-R3-5 | 性能压测 | 炸弹清场峰值特效 + 音效开启全程 60fps（AC-31） |

## 4. 通过标准

回归 94 块全绿 + R3 新增全绿 + [M] 勾完；[M] 中音效质感主观项不达 → 触发 PRD §5 采样路线重评审（不算验收失败）。

## 5. 执行记录（2026-06-04）

**[U]：** 120/120 全绿（基线 94 **零修订**兑现 + R3 26）；tsc 零错误。

**[M] 浏览器验收**（Playwright @ dev server，__world 调试缝驱动）：

| ID | 结果 | 证据 |
|----|------|------|
| M-R3-1 特效观感 | ✅(实证) / ☑(主观) | 真实击杀产生 EXPLOSION+飘字"+100"+计分；爆炸双环/飘字/火花/携带者金色闪烁截图捕获；主观「不晕不挡」留人工 |
| M-R3-2 音效区分度 | ✅(静音链路) / ☑(耳测) | 8 配方两两不同由 T-AU-1 锁定；M 键静音 → localStorage='1' + HUD "muted" 实证；音色主观质感需人耳 |
| M-R3-3 file:// 单文件 | ✅(结构) / ☑(人工) | 产物 21.96KB 单文件无外链；双击复核留人工 |
| M-R3-4 无尽体验 | ✅ | 全链路实证：GAME_COMPLETE(banked 555)→防误触窗口→L4(敌 20/间隔 1900/HUD "4/∞")→死亡→ENDLESS_OVER(无尽分 240)→三档隔离(555/777/240) |
| M-R3-5 性能压测 | ✅ | 44 特效同屏 rAF 采样 61fps |

**残留（不阻塞）**：音效音色耳测（不达标走 PRD §5 采样路线重评审）/ 特效主观手感 / file:// 双击——均人工项；R2 顺延的 M-R2-1/2 终验仍挂账。
