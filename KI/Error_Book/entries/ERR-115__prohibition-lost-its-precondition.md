---
id: ERR-115
type: error
errorCode: "EVD-011"
severity: "high"
status: "resolved"
recurrence: 0
firstSeen: "2026-08-08"
tags:
  - "error/high"
  - "process/verification"
  - "domain/testing"
  - "ki/error-book"
  - "project/guandan"
  - "errorCode/EVD-011"
prevention: "把错题本结论落成**负向断言**时，前提被丢掉了 —— ERR-112 的『客户端争取不到自己没有的时间』只在「面板与内容同帧上屏」这个前提下成立，落成断言却写成无条件禁令『不许把面板延后』。前提消失后（服务端改为多按一段 + autoLeave=false），这条禁令从护栏变成路障，拦住了唯一正确的修法。**负向断言的失败信息里必须写明前提**（「因为 X，所以禁止 Y」）并配一条正向替代（「改做 Z」）；推翻自己立的禁令时不许删，要改写并留下推翻理由、证据、以及『再遇原症状时的正解』"
leading_word: "precondition"
aliases:
  - "ERR-115"
  - "prohibition-lost-its-precondition"
  - "禁令丢了前提"
mem_ref: "6ddbd2ab-80cb-4bd8-95d8-fb6e764bbae9"
mem_status: "linked"
related:
  - "Error_Book/entries/ERR-112__waiting-placed-on-the-side-that-dies-first.md"
  - "Error_Book/entries/ERR-104__assumption-written-as-assertion-and-hollow-pin.md"
  - "Error_Book/entries/ERR-108__assertions-hardcode-a-tunable-value.md"
  - "Internal_KI/patterns/PAT-046__guard-what-the-test-switch-turns-off.md"
---

# 我自己立的禁令，拦住了唯一正确的修法

## 案发

[[ERR-112__waiting-placed-on-the-side-that-dies-first|ERR-112]] 的结论「客户端争取不到自己没有的时间」被落成两条**负向断言**：

```js
check("A9.3 **负向** 不得再把 buildSettlePanel 当回调延后(实机证伪: 单局模式层被销毁, 定时器等不到)", …)
check("A9.4 **负向** renderSettle 内不得自起 scheduleOnce(同上, 客户端不许自己数时长)", …)
```

一天之后，真正的缺陷暴露出来：面板与残牌同帧上屏，把残牌整个盖死（见 [[ERR-114__measured-the-mechanism-not-the-outcome|ERR-114]]）。唯一的修法就是**把面板延后**。改完，这两条断言如实报红 —— **它们在拦正解**。

## 根因

ERR-112 的结论没错，但它是**有前提的**：

> 客户端等不到，**是因为**单局模式下服务端收场紧随结算，层在 1 秒内被销毁。

落成断言时，前提丢了，只剩结论，于是变成**无条件禁令**。后来前提被消解 —— 服务端改为按住 `SettleRevealSec + SettlePanelGraceSec`，且结算同帧发的 `Game_RoundResult` 会把 `autoLeave` 置 false，层不再被销毁 —— 禁令却还在原地站岗。

**一条丢了前提的禁令，无法被证伪，只能被绕过或删除。** 两条路都坏：绕过它等于放弃守卫，删掉它等于连原来的教训一起丢。

## 修法（本案实际做法）

不删，**改写**，并把三件东西一起写进断言注释：

1. **推翻理由 + 证据** —— 为什么原禁令的前提不再成立（现网实证：同帧弹面板致残牌 0 帧可见；`autoLeave=false` 使层存活）
2. **新约束** —— 从「不许延后」翻成「**必须**延后，且必须有取消路径、延时量必须取同一常量」
3. **再遇原症状时的正解** —— 「若日后实机再现面板一闪即走，正解是调大 `GD_SETTLE_PANEL_GRACE_SEC`，**不是**把延后改回同帧 —— 改回去等于让残牌重新 0 帧可见」

第 3 条最要紧：它把 ERR-112 的教训**保住**了，同时堵死了「回滚到旧写法」这条看似省事的退路。

## 预防规则

1. **负向断言的失败信息必须写明前提**，形如「因为 \<前提\>，所以禁止 \<做法\>」。前提可证伪，禁令才可复核；只写结论的禁令是死条文。
2. **每条负向禁令配一条正向替代**（「改做什么」）。呼应写作规范里的 Negation 原则 —— 纯否定式 steering 不告诉人往哪走。
3. **推翻自己立的禁令时不许删。** 改写 + 留推翻理由 + 留证据 + 留「原症状再现时的正解」。删掉等于把当初那次实机代价一并抹掉。
4. **错题本条目落成断言前先问：这条结论依赖什么前提？** 前提写不出来，说明结论还没想清楚，此时落断言只会把含糊固化。

> CI: Tier 2 only —— 「禁令是否携带前提」是语义判断。落地方式：写负向 check 时，失败信息必须能回答「前提是什么、改做什么」两问。
