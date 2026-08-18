---
id: ERR-105
type: error
errorCode: "EVD-006"
severity: "high"
status: "resolved"
recurrence: 0
firstSeen: "2026-08-04"
tags:
  - "error/high"
  - "testing/fixture"
  - "concurrency/phase"
  - "project/guandan"
  - "errorCode/EVD-006"
  - ki/error-book
prevention: "测试夹具若把相邻状态压进同一拍（`setStatus` 紧跟 `handleUpdate`），两状态之间的真实时间窗在测试里**结构性地不存在** —— 不是断言写漏，是夹具看不见。凡防护对象是「相位之间的空窗」，回归钉必须**绕开夹具**、手工只切状态不推进时钟"
leading_word: "blind"
aliases:
  - "ERR-105"
  - "fixture-collapses-phases-so-the-gap-cannot-exist"
mem_ref: "019fcf3c-5330-7da3-98d7-3bc8bd4a2146"
mem_status: "linked"
related:
  - "Error_Book/entries/ERR-104__assumption-written-as-assertion-and-hollow-pin.md"
  - "Error_Book/entries/ERR-098__ported-reference-lifecycle-semantics-mismatch.md"
---

# 夹具把两个状态压成一拍，于是那 100 毫秒的空窗在测试里根本不存在

## 错误现象

掼蛋快速模式为"盲选加倍"设了一道相位闸：前奏期间重连快照要扣掉手牌与回合信息，防止玩家先看牌再决定加倍。闸装好了，冒烟里盲选期/亮牌静默期的断言**全绿**。

终审审计用探针实测，在**盲选窗开启之前**打了一发重连请求：

```
quickPreGameActive = false   quickDoubles = null
userCards = 27 张            ← 盲选窗都还没开
turn = {chairNo:3, timeout:0}← 首出座位剧透 + 假「不限时」信号
```

**闸修的两件事，在这段窗口里一件都没修上。**

## 根因

两层：

**① 代码侧**：闸抬晚了一个状态。`core.start()` 在 `handleStatus(RoundStart)` 就把 27×4 张牌发完了，而平台的 `step_RoundStart` 要 `await yieldTimeout(0.1)` 才切到 Playing —— 中间约 100ms（房 tick 50ms ≈ 2 拍）里闸还没抬。而 `GS_Sync` 是客户端**可随时主动上行**、走 `onMessage` 直路不进 yield 缓存的，玩家收到 `GS_RoundStart` 的同一瞬间刷一发即可命中。

**② 测试侧（本条的重点）**：夹具让这段窗口不可能被观测到。

```ts
async function startEpisode(room) {
    room.setStatus(RoomStatus.RoundStart)
    ;(room as any).dt_ = 0.2
    ;(room as any).handleUpdate(0)      // ← 与上一行之间没有任何"时间"
    await flush()
}
```

`setStatus` 与 `handleUpdate(0.2)` 连着做，RoundStart→Playing 被压进同一拍。**所有经由这个夹具的用例，都无法在两状态之间插入任何观测。**

## 为什么自查没抓到

这不是"断言写漏了"——**再写多少条断言都抓不到**，因为被测系统在夹具里根本走不到那个状态。覆盖率、断言条数、负控数量这些指标全都正常，盲区却是结构性的。

这类盲区的识别特征：**你要防的是"两件事之间"的窗口，而夹具把这两件事绑成了一件。**

## 解决方案

代码修法一行：把抬闸移到建核处，不等 `step_Playing`。

回归钉**刻意绕开夹具**：

```ts
// 这一节刻意不用 startEpisode() —— 那个夹具把两状态压成一拍,
// 这段窗口在测试里结构性不存在(不是断言写漏, 是夹具看不见)。
room.setStatus(RoomStatus.RoundStart)     // 只切状态, **一拍都不推进**
check("空窗自检: 此刻牌已在裁判核里(核已 start, 27 张)", ...)   // 先证明窗口真实存在
check("空窗自检: 盲选窗尚未开(quickDoubles 仍为 null)", ...)
;(room as any).handleUserOnline(0)
check("★ 相位空窗内重连 **拿不到手牌**", sGap.userCards === undefined)
check("★ 相位空窗内重连 **拿不到 turn**", sGap.turn === undefined)
```

前两条是 [[ERR-104__assumption-written-as-assertion-and-hollow-pin|有效性自检]]：先证明"我确实站在那段空窗里"，后面的断言才有意义。

## 预防规则

1. **看一眼夹具做了什么，再决定断言写在哪**。夹具是被测系统的一部分：它压掉的时间、它替你调用的顺序、它替你 flush 的队列，都是你观测不到的区域。
2. **凡防护对象是"相位之间"的窗口（闸门、锁、可见性），回归钉必须手工构造那个中间态**，不能走一站到底的便利夹具。
3. **写钉子前先问：被测系统在这个夹具里到得了那个状态吗？** 到不了的话，断言写得再漂亮也是装饰。
4. 与 [[ERR-104__assumption-written-as-assertion-and-hollow-pin|ERR-104]] 合看：**空钉有两种** —— 一种是样本没踩中分支（概率盲区），一种是夹具走不到状态（结构盲区）。两种都表现为"绿而无信息"。

## 关联

- [[ERR-104__assumption-written-as-assertion-and-hollow-pin|ERR-104]] —— 同批次姊妹条：那条讲样本盲区，本条讲夹具盲区。
- [[ERR-098__ported-reference-lifecycle-semantics-mismatch|ERR-098]] —— 同属"生命周期/时序被想窄了"，只是那条错在移植语义，本条错在观测手段。
