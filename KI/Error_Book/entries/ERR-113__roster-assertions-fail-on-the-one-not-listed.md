---
id: ERR-113
type: error
errorCode: "EVD-009"
severity: "high"
status: "recurring"
recurrence: 2
firstSeen: "2026-08-08"
tags:
  - "error/high"
  - "process/verification"
  - "domain/testing"
  - "project/guandan"
  - "errorCode/EVD-009"
  - ki/error-book
prevention: "「名单型」断言与「成组件」改动的风险**全在没列进来的那一个** —— 名单里每一项都绿，恰恰是漏项不报红的原因。凡写下一份枚举（熄灯清单 / 重脚本清单 / 一组同族节点 / 多条实现同一语义的路径），必须同时写一条**闭包判据**：按语义把全集扫出来与名单比对（「凡满足 X 的都必须在册」），而不是逐项核对已在册的"
leading_word: "roster"
aliases:
  - "ERR-113"
  - "roster-assertions-fail-on-the-one-not-listed"
  - "名单型断言的漏项"
mem_ref: "6ddbd2ab-80cb-4bd8-95d8-fb6e764bbae9"
mem_status: "linked"
related:
  - "Error_Book/entries/ERR-096__assertion-pinned-to-the-wrong-quantity.md"
  - "Error_Book/entries/ERR-078__edited-one-asset-variant-assertion-covered-only-that-one.md"
  - "Error_Book/entries/ERR-104__assumption-written-as-assertion-and-hollow-pin.md"
  - "Error_Book/entries/ERR-112__waiting-placed-on-the-side-that-dies-first.md"
---

# 名单型断言的风险全在「没列进来的那一个」—— 一天之内栽了四次

## 四次现场（同一天，同一份工作）

| # | 名单 | 漏掉的那一个 | 后果 |
|---|---|---|---|
| 1 | `applySettleContract` 的「熄灯组」（标题 / 级牌行 / 胜负角标 / 双上角标） | **`lblSettleMatch`**（整场结论行） | 它写的是 `active = hasMatchVerdict`，而服务端正常终局**恒带**该字段 ⇒ 不是边界分支，是**每次结算面上屏都多出一行**定稿里没有的字 |
| 2 | prefab 里成对/成组的节点（`sprTagWin`/`sprTagLose`、`badge_0..3`） | 编辑器里**看不见的那几枚** | 人只调了当前亮着的一枚，另外 12 枚留旧值；运行期一换胜负/名次就露馅 |
| 3 | 「驱动整场对局、需关掉公示窗」的脚本清单 | **`shell:friend:smoke`** | 它 juCount=0 要打几十副，时长 3s→5s 那天撞穿自己的 240s 预算；表现为超时红 + 断言总数从 38 掉到 36（超时把后续子断言一起吞掉），**而守门段全绿，因为名单里没有它** |
| 4 | 「服务端按住公示窗」的实现路径 | **`step_Playing` 的终局窗** | 断言只钉了 `pumpEvents` 那一处；终局那一副无人守 —— 少了它残牌 0 帧可见，而另一条的断言照样全绿 |

## 根因

名单型断言的形状是「对名单里每一项，检查 P 成立」。它对**在册项**很强，对**漏册项**完全无感 —— 而漏册恰恰是最常见的失败。更糟的是：**漏项时全绿**，绿得让人以为覆盖完整。

这与 [[ERR-096__assertion-pinned-to-the-wrong-quantity|ERR-096]]（守住的是一个碰巧相关的数字，不是真正的不变量）是同一族的两面：ERR-096 是**钉错了量**，本条是**钉漏了对象**。两者的共同点是「断言全绿」这件事本身不构成覆盖的证据。

## 修法：给每份名单配一条闭包判据

不要只遍历名单，要**按语义把全集扫出来，与名单求差**：

| 名单 | 闭包判据（把「全集」算出来） |
|---|---|
| 熄灯组 | 扫 `settleUI` 下**所有** `active` 被代码写过的节点，凡不在定稿里的都必须恒 false |
| 成组节点 | 同名族（`badge_*` / `sprTag*`）**四卡逐一比对**，要求同族同档取值一致（离散 ≤ 容差） |
| 重脚本清单 | 扫 `package.json` 里**所有**会驱动整场对局的脚本（判据：跑完整局的入口），逐一要求带关闭开关 |
| 多条实现路径 | 数「按住公示窗」的出现次数**恰为 2**，且**都直接读同一个常量**（不许各写字面量） |

第 4 行那条尤其有效：**「恰 N 处」比「至少 1 处」强得多** —— 它同时挡住「少了一处」和「多了一处各自漂移」。

## 预防规则

1. **写下枚举的同时写下闭包判据。** 一份名单若没有配套的「全集 − 名单 = ∅」检查，它守住的只是自己。
2. **计数优先于遍历**：能写「恰 N 处」就不要写「存在」。N 变了必须有人显式改，改的时候会被迫想一遍为什么。
3. **改一组里的一个，就要横向铺平整组**，并落一条「同族一致」的断言。运行期择一显示的节点族（Win/Lose、rank_0..3、常态/按下/禁用）尤其高危 —— 编辑器里只看得见当前那一枚。
4. **同一语义有多条实现路径时，每条各要一条实测**，不能用其中一条的绿替另一条背书（见 [[ERR-112__waiting-placed-on-the-side-that-dies-first|ERR-112]]：单局那条路漏出测试矩阵，恰是唯一失败的一条）。

> CI: Tier 2 only —— 「全集」的定义随领域而变（哪些节点算熄灯组、哪些脚本算驱动整场），静态规则表达不了；由各项目的落盘断言承担闭包判据。
