---
id: ERR-107
type: error
errorCode: "EVD-007"
severity: "high"
status: "resolved"
recurrence: 0
firstSeen: "2026-08-04"
tags:
  - "error/high"
  - "process/decision"
  - "domain/ui"
  - "project/guandan"
  - "errorCode/EVD-007"
  - ki/error-book
prevention: "给用户做选择题时，凡是 preview / 描述在刻画**现存组件长什么样**，必须先取得该组件的**真实渲染证据**（截图、或读出底图内容与可见性），禁止由「节点上挂着 Sprite + Label」这类**结构事实**推演视觉外观 —— 结构存在 ≠ 视觉可见。拿不到实测就在预览里明写「未实测，按结构推演」，把不确定性交回用户"
leading_word: "preview"
aliases:
  - "ERR-107"
  - "mocked-preview-misrepresents-live-ui"
  - "预览失真污染用户决策"
mem_ref: "f3e347d5-25d2-479e-a561-c9141d27907b"
mem_status: "linked"
related:
  - "Error_Book/entries/ERR-084__placeholder-decorations-survive-real-asset-swap.md"
  - "Error_Book/entries/ERR-104__assumption-written-as-assertion-and-hollow-pin.md"
  - "Internal_KI/patterns/PAT-038__ui-options-aligned-to-commit-semantics.md"
---

# 给用户的选项预览是我画的，不是实测的 —— 用户在一张不实示意图上拍了板

## 错误现象

掼蛋大厅入口重排（REQ-20260804-195048）。「比赛模式」要从上排大卡（301×207，挂 spine 动画）挪到下排小钮位（208×175）。
小钮长什么样是产品决策，于是用 `AskUserQuestion` 请用户定夺，推荐项配了这样一张 preview：

```
下排右 (397,-114) 208×175
┌──────────────┐
│              │
│   比赛模式    │  ← Label fs34
│              │
└──────────────┘
底板 = 与「自建/推倒胡」同款
```

用户选了它。改完截图一看：

- 该钮实际渲染是**一行裸文字**，底下什么都没有；
- 旁边「自建模式」「经典推倒胡」各有一张真卡面图，三个钮**根本不同款**；
- 预览里那个方框和"底板 = 与自建/推倒胡同款"这句话，**都不成立**。

用户选的选项本身没错（"复刻现状"确实是最省的），但**"复刻现状"到底长什么样，用户从头到尾不知道**。

## 根因分析

预览是从**结构事实**推演出来的**视觉断言**：

| 我读到的（真） | 我画出的（假） |
|---|---|
| `btn_expectation` 节点挂着 `cc.Sprite`，`_spriteFrame = ad8a609b@f9941` | "它有一张底板" |
| 兄弟节点 `btn_create` 的 Sprite 也是 `ad8a609b@f9941` | "底板与自建模式同款" |
| 子节点只有一个 `classicLabel`（fs34） | "底板中央一行字" |

前两行的推理断在同一处：`btn_create` 底下**另有** `pic_create` 子节点（`1818886e@f9941`）承载真正的卡面，而 `btn_expectation` **没有**这个子节点。共享的 `ad8a609b` 只是一张近乎不可见的垫图。
**同一个 spriteFrame uuid，在有卡面子节点的钮上和没有的钮上，看起来是两个东西。**

更根本的一层：当时完全有条件实测 —— 编辑器开着，`cocos_capture screenshot` 一调就有，`ad8a609b` 那张图 `Read` 一下就知道是什么。我没做，因为潜意识里把"我读懂了节点结构"当成了"我知道它长什么样"。

## 与既有条目的关系：盲区前移

[[ERR-084__placeholder-decorations-survive-real-asset-swap|ERR-084]] 的母题是「验收清单里没有的项，检出率恒为零」——那次的盲区在**验收阶段**（渲染态不在 JSON 断言面上）。
本条是同一母题**前移到了决策阶段**：提问时没验的事实，照样会污染用户的选择。

两者危害不对等：

- 验收漏判 → 事后补测还能救；
- **决策污染 → 不可逆**。用户已经基于错误信息拍了板，后续所有工作都长在这个板上，等发现时返工面已经铺开。

所以「先取证再开口」这条规矩，在**面向用户输出**时比在验收时更严，不是更松。

## 解决方案

**当轮**：改完后主动截图比对，发现实况与预览不符，**当场向用户更正**并列出三条补救路（维持现状 / 请美术出 208×175 小卡图 / 把旧 spine 缩进小钮），交回用户重新裁定。没有掩盖，也没有假装预览是对的。

**规则化**（见 frontmatter `prevention`）：

1. preview 若在刻画**现存组件**：先截图或读出底图内容，用实测画；
2. preview 若在刻画**尚不存在的产物**（新做的界面）：可以画，但要标「示意」；
3. 拿不到实测证据时，**宁可不画框**，用文字写"沿用该钮现有外观（未实测，按结构推演）"——把不确定性交回用户，而不是替用户消化掉；
4. 自检一句话：**「这张图我是看见的，还是想出来的？」**

## 预防规则

见 frontmatter。一句话：**结构存在不等于视觉可见；给用户看的图，必须是看见过的图。**

ci_rules 评估：本条约束的是 Agent 提问行为，无可静态检出的代码面，故不设 CI 规则，靠本条召回。

## 关联

- [[ERR-084__placeholder-decorations-survive-real-asset-swap|ERR-084]] — 同母题「没验的项检出率恒为零」，那次盲区在验收，本条前移到决策
- [[ERR-104__assumption-written-as-assertion-and-hollow-pin|ERR-104]] — 姊妹病：那条是把假设写进**断言**，本条是把假设画进**给用户的预览**；两者都让"没验过的东西"披上了确定性的外衣
- [[PAT-038__ui-options-aligned-to-commit-semantics|PAT-038]] — 选项设计的正面模式，本条是它的反面教材
