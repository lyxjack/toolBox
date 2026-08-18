---
id: ERR-111
type: error
errorCode: "EVD-008"
severity: "high"
status: "resolved"
recurrence: 0
firstSeen: "2026-08-08"
tags:
  - "error/high"
  - "process/verification"
  - "domain/ui"
  - "engine/cocos"
  - "project/guandan"
  - "errorCode/EVD-008"
  - ki/error-book
prevention: "拿**节点框**画到定稿上宣布「对齐」，是把 Agent 能算的东西当成了用户能看的东西 —— 节点框不是玩家看到的像素。凡宣称 UI 对齐，证据必须是**渲染面**（真机截图 / 用真素材合成 / 解码 alpha 包围盒后的可见沿），不能是 prefab 里的 transform。做不到就明说「只验了节点框，像素未验」，把不确定性交回用户，而不是让用户拿眼睛替你做验收"
leading_word: "evidence"
aliases:
  - "ERR-111"
  - "node-box-used-as-visual-evidence"
  - "拿节点框冒充视觉证据"
mem_ref: "6ddbd2ab-80cb-4bd8-95d8-fb6e764bbae9"
mem_status: "linked"
related:
  - "Error_Book/entries/ERR-107__mocked-preview-misrepresents-live-ui-in-user-choice.md"
  - "Error_Book/entries/ERR-110__identical-coords-are-not-pixel-alignment.md"
  - "Error_Book/entries/ERR-096__assertion-pinned-to-the-wrong-quantity.md"
  - "Error_Book/entries/ERR-104__assumption-written-as-assertion-and-hollow-pin.md"
ci_rules: []
---

# 拿节点框冒充视觉证据 —— 结果用户用眼睛替我做了整场验收

## 案发

掼蛋结算面按 8.7 定稿重做。Agent 每一轮都给用户出「叠合图」：把 prefab 里读出的**节点包围盒**画到定稿截图上，框压住了定稿元素就宣布「对齐,逐像素吻合」。

用户实际看到的却是一轮又一轮的错位，最后说：**「我现在是用我的眼睛把所有对齐的」** —— 定性为 P0 级过程灾难。

## 根因

Agent 混淆了两样东西：

| | Agent 能直接算的 | 玩家实际看到的 |
|---|---|---|
| 卡底 | 节点 contentSize / lpos | 图里 alpha>128 的本体（受留白影响，见 [[ERR-110__identical-coords-are-not-pixel-alignment|ERR-110]]） |
| Label | 节点框 | 字形墨迹（受 overflow / 自动尺寸影响，见 [[ERR-072__auto-sized-label-measured-empty-collides-at-runtime|ERR-072]]） |
| 按钮 | 节点框 | 实心药丸（图里还有描边发光，见下） |

**节点框对齐是"必要不充分"条件。** 用它当证据，等于用一个恒成立的量去证明一个不成立的结论 —— 与 [[ERR-104__assumption-written-as-assertion-and-hollow-pin|ERR-104]]（把假设写成断言）同型，只是这次假的是"证据的效力"而非"命题本身"。

## 三次同型量错（同一个错法犯三遍）

Agent 从定稿反解坐标时，用「行剖面 + 连通带」找元素，**把相邻元素并进了同一条带**，中心自然被拉偏：

| # | 元素 | 错值 | 真值 | 并错了什么 |
|---|---|---|---|---|
| 1 | 昵称 `lblNick` | y=74 | **44** | 把**头像框底缘**当成了昵称行 |
| 2 | 头像 `sprHead` | y=124 | **103.5** | 把**头像与右上缎带**并成一条带（缎带顶到 y=152 把中心拉高 21px） |
| 3 | 「继续游戏」钮 | 287×77 | **300×132 @scale1** | 量到的是**实心橙核心**，当成了整图范围，长宽比 2.34→3.73 横向压扁 39% |

三次都不是靠读代码发现的，**全是把框画到图上后一眼看出来的** —— 说明"叠合图"这个工具本身没错，错在 Agent 把**自己画的框**当结论，而不是把**框与底图的关系**交给眼睛（自己的或用户的）复核。

## 预防规则

1. **宣称 UI 对齐，证据必须落在渲染面。** 三种合格证据：① 真机/编辑器截图 ② 用**真实素材**在设计分辨率上合成（不是画方块） ③ 解码 alpha 包围盒算出的**可见沿**。prefab 的 transform **不是**证据。
2. **量任何元素前，先确认它的边界不与邻件相连。** 行剖面出现连续带时，把候选带**全部列出来**、再靠叠合图逐条辨认，不要拿"最像的那条"直接用。
3. **量按钮/卡片这类带描边发光的件，要分层量**：实心核心 / 含描边 / 完整不透明 三个包围盒都算出来，再判断定稿标的是哪一层。只量一层就下结论必错。
4. **自己先看一眼再交付。** 叠合图生成后 Agent 应当**自己读图**，而不是直接甩给用户。本案三处错位，Agent 一旦读图都当场看出来了 —— 省下的是用户的四轮返工。
5. **拿不到渲染证据时明说**：「只验了节点框，像素未验」。把不确定性交回用户，而不是用一句"逐像素吻合"把风险藏起来。

## 附带：一个域的结论不要套到另一个域

同案中 Agent 发现卡底有"留白不一致"问题后，**未经验证**就对用户断言「金蓝两种缎带的 y 本来就该不同（同一个病根）」。实测八张缎带源图 `s1~s4`/`b1~b4` 画布一律 95×94、本体一律 x[1,94] y[0,93] —— **完全相同，根本没有那个病根**。那 1.1px 差纯属手调噪声。

⇒ 「A 组素材有某问题」**推不出**「B 组素材也有」。每组素材各自解码，不许类推。

> CI: Tier 2 only — 这是证据方法论层面的约束，无法用静态代码模式表达。落地方式：UI 类任务在交付前自检「我给的证据是渲染面还是节点框？」

## 关联

- [[ERR-110__identical-coords-are-not-pixel-alignment|ERR-110]] 坐标相同不等于像素对齐（本案的技术根因）
- [[ERR-107__mocked-preview-misrepresents-live-ui-in-user-choice|ERR-107]] 给用户的选项预览是画的不是实测的（同族：证据失真污染用户决策）
- [[ERR-096__assertion-pinned-to-the-wrong-quantity|ERR-096]] 断言钉错了量，守住的是一个碰巧相关的数字（同族：钉的东西与要守的目标不是同一个 —— 那次钉错了量，本条钉错了证据面）
