---
id: "EXEC-2026-07-28-hand-stack-flip-and-one-tap-arrange"
type: execution_log
req_ref: "REQ-20260727-234602"
status: "pass"
created: "2026-07-28"
tags:
  - execution_log
  - req-tracking
  - ki/internal
  - project/guandan
  - engine/cocos
related:
  - "Error_Book/entries/ERR-071__hit-rect-not-following-selection-lift.md"
  - "Error_Book/entries/ERR-072__auto-sized-label-measured-empty-collides-at-runtime.md"
  - "Error_Book/entries/ERR-073__lazy-init-leaves-prefab-clone-template-visible.md"
  - "Error_Book/entries/ERR-066__hidden-tab-raf-freeze-engine-boot-blackscreen.md"
  - "Internal_KI/patterns/PAT-033__derive-on-frozen-kernel-for-free-invariants.md"
aliases:
  - "EXEC-2026-07-28-hand-stack-flip-and-one-tap-arrange"
mem_ref: "019fa7b1-dd43-7361-8bf9-de0826a56d46"
mem_status: "linked"
---

# 掼蛋横版手牌堆叠翻转 + 一键理牌 + 底部布局按参照产品重排

## User Intent (Original)

用户拿**成熟掼蛋产品的实拍截图**做参照，提两点差异：

1. 「图片二的牌形堆放是**最下面的一张牌在最上面**然后叠加，我希望你效仿。」
2. 「成熟产品有一个按钮是**一键理牌**功能，会帮玩家把牌按一定道理理牌。」（附理牌前/后同局对比图）

并交代：「成熟产品**出牌的牌面和手牌的牌面是不一样的**。我们现有的牌面可以当成出牌的牌面。
我已经让美工重新做所有的牌面……这样在从下到上叠加的时候可以明确看到数字以及花色。」

第二轮（QA 抛出遮挡缺陷后）：「你可以借鉴这个截图。**把按钮往上移动**。所有的比例你也可以
按照成熟产品的去走。你都做完之后要**和 codex 交叉审计**确保都没问题。」

## 需求拆解轨迹

### 勘查先行改变了工作量判断

动手前逐项核对现状，发现**大半已经存在**：

| 项 | 现状 | 差 |
|---|---|---|
| 按点数分列、级牌置顶、炸弹聚合 | `gd-rules/display.displayColumns` 已实现 | 无 |
| 每列纵向堆叠、底行对齐基线 | `gd-client-core/cardLayout.layoutColumns` 已实现 | 无 |
| **列内前后序** | `z = column*1000 + (colLen-1-row)` 顶张在前 | **反了** |
| 一键理牌 | 无（`hint/minHands` 只回数字不回分解） | 缺整块 |

⇒ 需求 1 从「重做手牌排布」缩成**一行 z 序翻转**；工作量重心全在需求 2。
**这一步勘查值回票价** —— 若按字面理解直接动排布，会重写一套已经正确的几何。

### 关键设计决策

| 决策 | 取舍 |
|---|---|
| 理牌算法**不自己写拆牌 DP**，而是架在冻结的 `classify.generate()` 之上 | 换来「每组恒为合法牌型」这条免证明不变量，见 [[PAT-033__derive-on-frozen-kernel-for-free-invariants\|PAT-033]]。先实测 `generate` 27 张最多 2458 组合 / <2ms 才敢走这条路 |
| 中文牌型标签**不进 gd-rules** | 规则包保持语言中立，文案映射留客户端 |
| 组底标用 prefab 内**可见模板 + 运行期克隆** | IL13「数据驱动可变数量集合」豁免面；模板必须可见可编辑 → 埋下 [[ERR-073__lazy-init-leaves-prefab-clone-template-visible\|ERR-073]] 的幽灵窗口 |
| 手牌面/出牌面分离**只交规格不预埋代码** | 新牌面尚不存在且不能进平台只读 bundle，预埋 `variant` 分支属投机性泛化；改为把实测推导出的硬约束（顶部 24px 内必须读出点数+花色）准确交给美工 |

## 变更轨迹（两轮）

### 第一轮 — 功能实现

- `gd-rules/src/arrange/index.ts`（新增）：优先级贪心 × 12 变体取优，确定幂等
- `gd-client-core/src/cardLayout.ts`：`layoutColumns` 增开 `offsetY` 入参
- `WMGDPokerHandCards_l.ts`：z 序翻转、理牌模式、组底标克隆、列步进自适应
- `WMGDGameLayer_l.ts` + prefab：`btnTidy`、`tplGroupTag` 两件编辑器实体节点
- 12 项 arrange 测试 / 全量 151 测试绿

**QA 抛出 D-1（真缺陷）**：理牌后 5~6 张长列被操作条压住上半截。量化后判定
**不是参数问题** —— 手牌可用纵向带宽仅 174.6 世界像素，而 6 张列需 ~232。
三条候选路子都要动美工件，属产品决策 ⇒ **不擅自改，带图带数上报用户**。

### 第二轮 — 用户裁定后按参照产品比例重排

把参照图量成占屏高的纵向节奏：出牌区 10~28% → 按钮带 33~43% → 手牌最高列顶 52% → 手牌底 90%。
换算到 1280×720 后发现**我们的手牌底沿 −287.4 恰好就是它的 90%** —— 缺的正是把中间各带整体上提。

`nodeActionBar` −88→+105、`out_0` −20→+5、`out_2` 120→240、`seatView_2` 居中→偏右、
`COL_TOP_LIMIT` 135→230、`OY_MAX` 40→46；另加 `growTouchBox`（触摸盒随最高列动态撑高，
否则长列上方几张**收不到 TOUCH 事件**）。

重排中自查出 [[ERR-072__auto-sized-label-measured-empty-collides-at-runtime\|ERR-072]]。

## Codex 交叉审计结果

对抗式只读审计 10m39s。**A（arrange 纯模块）与 C（主层接线）零缺陷**；B（手牌组件）3 条，逐条亲验：

| # | 亲验结论 | 处置 |
|---|---|---|
| B-1 命中盒不跟随选中上浮 | **属实，且比 Codex 举的例子严重一个数量级**（穷举 450548 采样点 → 修复前 96822 处错判） | 已修，见 [[ERR-071__hit-rect-not-following-selection-lift\|ERR-071]] |
| B-2 八炸/十炸列越界侵入出牌区 | 属实，越界 9~47px | **记档不修**（ERR-063 三问） |
| B-3 发牌前模板未隐藏出现幽灵标签 | 属实 | 已修，见 [[ERR-073__lazy-init-leaves-prefab-clone-template-visible\|ERR-073]] |

## 闸门

| 项 | 结果 |
|---|---|
| 全量回归 | 29 文件 / 151 测试全绿，零回归 |
| 类型检查 | gd-rules 双目标 + 客户端本案文件 0 错 |
| prefab 落盘只读复核 + 全带碰撞审计 | 无节点甩飞、6 张列不撞任何占位 |
| 命中一致性穷举探针 | 450548 采样点 0 错判 |
| preview 实屏 | 登录→高级场→整局全链；运行期断言模板已隐藏 / 触摸盒 1160×496 / 理牌态跨新局保持 |

用户亲验：「验收没问题。」

## 可复用产出

- [[PAT-033__derive-on-frozen-kernel-for-free-invariants|PAT-033]] 派生功能架在冻结内核之上
- [[ERR-071__hit-rect-not-following-selection-lift|ERR-071]] 命中盒必须跟随渲染位移
- [[ERR-072__auto-sized-label-measured-empty-collides-at-runtime|ERR-072]] 自适应 Label 按空态尺寸排版
- [[ERR-073__lazy-init-leaves-prefab-clone-template-visible|ERR-073]] 懒初始化留下幽灵模板
- [[ERR-066__hidden-tab-raf-freeze-engine-boot-blackscreen|ERR-066]] 补遗⑤：泵改用 Web Worker 定时器

## 遗留

- 手牌专用牌面美术**待美工交付**；规格与集成说明已落 `.in-process/active/20260727-234602/art/手牌面规格增补.md`（含 PDF）
- `isValidArrangement` 不通过时退回默认排布这条降级路径**无自动化覆盖**（记档）
- 八炸/十炸超长列越界（记档不修）
- 本案改动**未提交 git**（用户未下令）
