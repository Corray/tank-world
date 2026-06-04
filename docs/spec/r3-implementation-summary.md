# R3 实现总结（L2）

**日期：** 2026-06-04 / **分支：** feature/r3-feedback-endless / **关联：** PRD R3（accepted）、共识 v3、数据模型 §17~22

## 背景

R3 主题「让每一击都有回响」：补反馈层欠账（全程零特效零音效）+ 无尽模式抬高重玩天花板。范围 P0+P1（特效 / 音效 / 无尽）。

## 做了什么

- **S1 特效**：Effect 纯数据实体（kind/pos/bornAt/duration），生成点挂在 combat（击毁/火花/基地爆炸）与 player（死亡爆炸+白闪）；过期靠 clock 比较——暂停冻结零成本复用 AC-11 单闸门
- **S2 音效**：dispatch / synth 两层——dispatch 纯函数（事件→8 配方 + 静音门）node 可测；synth 层 WebAudio（oscillator/噪声 buffer + 包络），无 AudioContext 全链路静默降级；M 键静音持久化
- **S3 无尽**：`endlessConfig` 公式（总数 +2/关、间隔 −100ms 下限 1200、装甲占比封顶 50%、三图轮换）；`enterEndless` 带 1s 防误触窗口；死亡路由按 level 分流 DEFEAT（可重试）vs ENDLESS_OVER（结算 best-endless）
- **S4 验收**：120/120（基线 94 零修订）；44 特效同屏 61fps；无尽全链路与三档隔离浏览器实证

## 关键决策与思考

1. **特效不进碰撞世界**：Effect 与实体数组物理隔离，combat/moveTank 不感知其存在——「纯视觉」由结构保证而非约定（T-FX-7 sanity 锁底线）
2. **音效可测性靠分层而非 mock WebAudio**：dispatch 层输出配方对象，测试注入记录器；合成细节（包络/滤波）留在不可测层但全部 try/catch
3. **无尽复用 loadLevel 而非新通道**：level≥4 时配置源切到公式，推进/过关/计分管线零改动——LEVEL_CLEAR 在无尽照常工作是免费得到的
4. **判定时机统一在 judge**：GAME_COMPLETE 锚定防误触 wall 时间、ENDLESS_OVER 结算 best-endless，全部在状态翻转的同帧完成，画面层只读
5. **敌方射击不发声**（实现微调）：4 敌 ×1.8s 的射击音会刷屏，仅玩家射击发 FIRE 音——事件↔音效映射的有意偏离，记录于此

## 影响范围

新增 effects / audio 两模块（~250 行）+ level/storage/core/combat/player/powerup/input/render/hud 增量；**基线 94 块零修订**（R3-G1 预判兑现）。

## 已知残留

- 音效音色为合成 8-bit 风，主观质感待耳测——不达标走 PRD §5 采样内联路线（重评审体积）
- R2 顺延的 M-R2-1/2 终验仍挂账（PM 游玩实测）
- 无尽关地图为三图轮换，多样性有限——R4 扩展地形候选的天然挂点
