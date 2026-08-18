---
id: PAT-044
type: pattern
title: "坑位内容互换 —— UI 入口重排不搬节点，只换坑里装的东西"
status: active
created: "2026-08-04"
trigger_condition: user_explicit
tags:
  - ki/internal
  - pattern
  - trigger/user_explicit
  - domain/ui
  - engine/cocos
aliases:
  - "PAT-044"
  - "slot-content-swap"
  - "坑位内容互换"
mem_ref: "f3e347d5-25d2-479e-a561-c9141d27907b"
mem_status: "linked"
related:
  - "Error_Book/entries/ERR-021__cocos-prefab-create-loses-subchildren-properties.md"
  - "Error_Book/entries/ERR-084__placeholder-decorations-survive-real-asset-swap.md"
  - "Error_Book/entries/ERR-107__mocked-preview-misrepresents-live-ui-in-user-choice.md"
complements:
  - "Internal_KI/patterns/PAT-036__art-asset-intake-to-onscreen.md"
---

# 坑位内容互换：需求说"把 A 挪到 B 的位置"，但你不该搬节点

## 适用场景

用户用**搬家语言**描述一次 UI 重排 —— "把比赛模式放到快速模式的地方"、"这个图标换到那个位置" —— 而这些位置（坑位）**规格并不相同**：尺寸不同、底板不同、有的挂 spine 有的挂 Label、Widget 锚定各异。

典型场景：游戏大厅玩法入口重排、设置页选项调序、底部导航栏换位。

## 核心洞察

**用户描述的是"我要看到的结果"，不是"你要执行的操作"。**

把节点真搬过去，要连底板、`contentSize`、Widget 锚定、子树一起搬，还要处理两坑规格差；而**只换每个坑里装的东西 + 换点击去向**，玩家侧观感完全等同，改动面小一个量级。

掼蛋大厅实测对比（REQ-20260804-195048，三个坑位轮换）：

| 路线 | 触及面 | 风险 |
|---|---|---|
| 搬节点 | 3 节点坐标 + 3 套底板 + 3 组 contentSize + Widget + 子树迁移 | 必踩 [[ERR-021__cocos-prefab-create-loses-subchildren-properties\|ERR-021]]（子树属性丢失）；两坑尺寸不同还要重排版 |
| **换坑内容** | 1 张图 + 1 个 `active` + 3 处 clickEvent + 3 处文字 | 坐标一个没动，几何风险归零 |

## 步骤

### 1. 先把每个坑位量清楚（**动手前，不可跳过**）

对每个坑位落一张实测表：`_lpos` / `UITransform._contentSize` / Sprite 的 `_spriteFrame`+`_type`+`_sizeMode`+`_color` / 子节点清单与各自组件 / Button 的 clickEvent 三元组 / Widget 锚定。

三条最容易漏、且直接改变方案的：

| 量什么 | 为什么决定成败 |
|---|---|
| **卡面文字是 Label 还是烧在图/图集里** | 掼蛋本例：坑① 的 spine 图集 `dx.png` 上**本就印着「经典模式」四字** → 改名后那张卡画面零改动，白省一块美术。反过来若文字烧在图里而你以为是 Label，改名就会哑火 |
| **Sprite 的 `sizeMode`** | `CUSTOM(0)` = 新图被约束到节点现有尺寸（本例 329×225 图进 301×207 坑，形变 0.56%，**"新图更宽会重叠"的风险自动归零**）；`TRIMMED(1)` = 节点被图撑大，必须重新算版面 |
| **clickEvent 挂在哪个组件上** | 本例坑① 的 handler 挂在节点自己的 `DLMJLobbyGameItem` 上（内含 `gameID_` 分流），另两坑挂在层脚本上。不查这一步，接线会指向"另一张卡上的组件"，形成跨节点隐式耦合 |

### 2. 画一张「坑位 → 终态显示 → 终态去向」三列表，交用户确认

用户确认的是**终态**，不是实现路线。路线是你的事。
⚠️ 若表里要描述"某个坑现在长什么样"，先截图 —— 见 [[ERR-107__mocked-preview-misrepresents-live-ui-in-user-choice|ERR-107]]，凭结构推演出来的外观描述会污染用户决策。

### 3. 换内容（一次 edit-mode 内做完，串行）

- 换图：Sprite `_spriteFrame` 传**裸 UUID** `<uuid>@f9941`；同时复位 `_color` 为白、清点兄弟占位件（[[ERR-084__placeholder-decorations-survive-real-asset-swap|ERR-084]] 换图三件套）
- 退场旧内容：优先 `active=false` 而非删节点 —— **可逆**（旧内容日后要回来只需翻一个 bool），且避开 ERR-021
- 换去向：clickEvent 三元组统一到同一个宿主组件上，别留跨节点指向

### 4. 补一张「节点名 ↔ 现语义」对照表，落进代码注释

这是本模式**唯一的真实代价**：节点名会与语义永久漂移（`template_match` 里装的不再是比赛模式）。
对照表至少落三处：宿主脚本注释、执行计划、change manifest。不落 = 给后人埋雷。

### 5. 验收：落盘断言 + 视觉断言，缺一不可

落盘断言查"未被改的坑要逐字段相同"（坐标/尺寸/底板/子资源 uuid），比只查"改了的地方对不对"更能抓越界。
另配负控（故意错值必须报红），防空钉。

## 反模式

| 反模式 | 正确做法 |
|---|---|
| 听到"挪到那个位置"就去改坐标 | 先量两坑规格；规格不同时换内容几乎总是更优 |
| 为省事把 B 坑的点击事件指向 A 坑节点上的组件（可做到 0 行代码） | 宁可在宿主脚本加 4 行语义明确的方法。跨节点隐式耦合没有编译期保护，后人重构 A 必断 B |
| 删掉退场的旧子树 | `active=false`，可逆且避开 ERR-021 |
| 改完只查改动点 | 断言必须覆盖"**应当没变**的字段"，那才是越界的检出面 |
| 节点名漂移了不留对照 | 三处落表，代码注释是必选项 |

## 关联

- [[PAT-036__art-asset-intake-to-onscreen|PAT-036]] — 本模式第 3 步"换图"要用到的资产入库前置
- [[ERR-021__cocos-prefab-create-loses-subchildren-properties|ERR-021]] — 搬节点/删节点路线的主要风险源
- [[ERR-084__placeholder-decorations-survive-real-asset-swap|ERR-084]] — 换图三件套与占位件退场
- [[ERR-107__mocked-preview-misrepresents-live-ui-in-user-choice|ERR-107]] — 第 2 步向用户确认终态时的取证要求
