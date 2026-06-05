# Audit 报告 — data-model phase（2026-06-05 首轮，api phase 等价物）

**范围：** data-model.md 34 节 ↔ constants.ts/types.ts/实现 | **结论：** 1 发现（MEDIUM，取代标注家族主命中区）

| 编号 | 严重度 | 分类 | 发现 |
|------|--------|------|------|
| F-DM-20260605-6bc0 | MEDIUM | 偏差（家族：v1 被取代无标注 ×5） | data-model v1 五处与现行实现矛盾且无取代标注：①§1 `SPAWN_INTERVAL_MS=2000`（现 per-level 3000/2500/2000，§11 取代）②§2 GameState 枚举含 VICTORY 无 LEVEL_CLEAR/GAME_COMPLETE/ENDLESS_OVER（§10/§20 取代）③§4 状态机 7 条（同前取代）④§6 固定出生序列（§11 构成生成取代）⑤§7 玩家出生点 (12,4)（§11/§31 取代为 (12,2)+(12,10)）。附反向轻微项：`ENEMY_SPEED` 常量未入 §1 表（实现有、文档无） |

**正向比对：** 碰撞矩阵 C1~C17 逐行 ↔ combat.ts 实现 ✓（含 C15/C17 两处「结构性免费」声明与代码一致）；现行常量表（§1 之外各节）↔ constants.ts 抽查 12 项 ✓；存档五 key ↔ storage.ts ✓；无尽公式 §19 ↔ endlessConfig ✓。
**Family-scan（Step 4.6）：** 一级=「v1 段落取代标注缺失」grep 全 spec 命中 7 处（consensus 2 + data-model 5），已修 0 / 未修 7 / 合理差集 0；二级触发判据（嵌套/backstop 8 类）无命中——本轮发现均为文档层，无代码层家族。
**安全（Step 4.5）：** S2 凭证扫描 src/ 全量——无硬编码凭证（KEY_* 均为 localStorage 键名常量）✓；S1/S3 按 CLAUDE.md 裁剪声明 N/A。
