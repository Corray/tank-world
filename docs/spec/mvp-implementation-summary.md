# MVP 实现总结（L2）

**日期：** 2026-06-04 / **分支：** feature/mvp-core-gameplay / **关联：** 共识 v1.2、架构 v1、数据模型 v1、ADR-001

## 背景

tank-world 首个需求：经典坦克大战 MVP（共识文档 v1.2 范围）。从共识到代码走完 spec-to-code-flow 全链路，G1/G2/G3 三道门禁均经用户确认。

## 做了什么

按数据模型 §9 切片 P1~P7 增量实现，每片可运行验证：

- **P1 骨架**：Vite+TS（strict）+ singlefile 工程；固定时间步主循环（`GameLoop.advance` 与 rAF 解耦）；地图模块（13×13 + 砖墙 4bit 子块掩码）；程序化 Canvas 渲染；键盘双键位输入
- **P2~P5 玩法**：坦克移动碰撞（1px 子步推进至受阻）、射击与 1/4 子块破坏、敌人出生调度（轮转 cursor + defer 语义）与三类 AI（随机巡逻带向下偏置）、伤害结算/子弹相消/胜负判定
- **P6 体验**：HUD（DOM 侧栏）/ 暂停 / 重开（World 整体重建）
- **P7 交付**：单文件产物 11.86KB（gzip 4.96KB）

## 关键决策与思考

1. **碰撞全部集中在 combat 单模块**（C1~C12 矩阵直译为代码），实体内零碰撞逻辑——改规则只动一处，矩阵行号可直接对查文档
2. **子步推进代替连续碰撞检测**：子弹 4px / 坦克 1px 子步，体量小性能无虞，换来"先命中先生效"的确定性次序（数据模型风险 §8.3 的实现解）
3. **暂停 = 主循环单闸门**：`advance()` 仅在 PLAYING 推进 clock 与 update，冻结语义不散落各实体
4. **重开 = 重建 World 而非逐字段清理**：杜绝漏清字段类 bug
5. **player⇄combat 存在模块级循环引用**（combat 调 damagePlayer / player 调 moveTank）：函数级引用无初始化依赖，ESM 安全；若后续扩展建议引入事件回调解耦

## 模块结构

```
core(game/world/update/constants/types) → 主循环、状态机、管线、唯一 World
map → 地形 + 子块；player / enemy → 实体与 AI；combat → 碰撞矩阵 SSoT
render / hud → 只读绘制；input → 键盘语义化
```

## 影响范围

全部为新增代码（src/ 16 文件、~1100 行），无存量改动。CLAUDE.md 技术栈与 compile_cmd 已回填。

## 已知残留

- 敌人 AI 为随机巡逻（共识〔默认〕如此），无寻路——后续若做关卡难度可演进
- 胜利画面视觉与 file:// 双击为人工复核项（不阻塞）
- `large-module` 触发条件回看：本次为新建完整模块群（L2 级），方案已在 G1~G3 门禁中确认，未走单独 LMP 流程（门禁覆盖了同等沟通量）
