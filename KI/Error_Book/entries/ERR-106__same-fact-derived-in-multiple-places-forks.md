---
id: ERR-106
type: error
errorCode: "BHV-013"
severity: "high"
status: "resolved"
recurrence: 0
firstSeen: "2026-08-04"
tags:
  - "error/high"
  - "domain/settlement"
  - "architecture/single-source"
  - "project/guandan"
  - "errorCode/BHV-013"
  - ki/error-book
prevention: "改一个**派生口径**（胜负、名次、金额这类被多处各自算出来的结论）之前，先 grep 全仓「还有谁在算同一件事」。只改自己眼前那一处，等于把分叉往后挪；正解是让它在产生的那一刻落一份缓存，所有消费方同吃一份"
leading_word: "fork"
aliases:
  - "ERR-106"
  - "same-fact-derived-in-multiple-places-forks"
mem_ref: "019fcf3c-5330-7da3-98d7-3bc8bd4a2146"
mem_status: "linked"
related:
  - "Error_Book/entries/ERR-095__presentation-slot-vs-data-index-conflated.md"
  - "Error_Book/entries/ERR-104__assumption-written-as-assertion-and-hollow-pin.md"
---

# 同一个"整场胜方"算了三遍 —— 面板说红队胜、战绩记平局、回放又改判

## 错误现象

修完"翻到 A 的局被误判平局"（结算面板口径）之后，自查复核时发现**同一个事实在全仓被算了四遍**：

| 消费方 | 代码 | 当时状态 |
|---|---|---|
| 结算广播 `Settle.matchWinnerTeam` | `fixedJuWinnerTeam(e.winnerTeam)` | ✅ 已修 |
| 战绩上报 `reportMatchRecords` | `fixedJuWinnerTeam()` ← **无参** | ❌ 仍走级差 |
| `episodeWinnerTeam()` | `fixedJuWinnerTeam()` ← **无参** | ❌ 仍走级差 |
| 回放存档 `saveFinalReplay` | `fixedJuWinnerTeam()` ← **无参** | ❌ 仍走级差 |

后果：翻到 A 的那一局，**玩家面板显示"红队胜"、平台战绩记 Draw、回放打开又变成平局** —— 同一局三个口径互相打架，而金币是按第四个口径（本副胜方）发的。

## 根因

`fixedJuWinnerTeam()` 是个**派生函数**：它不存事实，它每次被调用都现算一遍（读两队级牌下标比大小）。于是"整场胜方"这个事实在系统里没有唯一副本，四个消费方各自调一次、各自得一个答案。

平时四处答案一致，**只有在边界情形（两队同级）才分叉** —— 分叉点恰恰是最需要它们一致的地方。

我第一版修法只给结算广播那一处传了参数。**那不是修复，是把分叉从"四处都错"变成"三处错一处对"**，更难查。

## 为什么自查没抓到

- 冒烟只断言了下发报文 `Settle.matchWinnerTeam`，**没有任何一条断言去看战绩/回放里的胜方**。消费方多而断言面窄。
- 改动是"给函数加一个可选参数"，看起来是纯增量、零风险，于是没有触发"谁还在调它"的检索本能。

## 解决方案

不逐处补参数，而是**消灭派生**：在事实产生的那一刻算好、落一份缓存，所有消费方同吃。

```ts
// deal-settled 判定收场的那一刻算一次并落缓存
if (overWinner != null) this.d.matchWinnerTeam = overWinner

// 消费方一律先认缓存, 缺失(异常收场)才回落现算
const cached = this.d != null ? this.d.matchWinnerTeam : null
const winnerTeam = cached != null ? cached : (…现算…)
```

回归钉钉的是**同源性**而非数值：

```ts
check("★ d.matchWinnerTeam 缓存 ≡ 下发的 matchWinnerTeam(战绩/回放同吃这份)",
    A.d.matchWinnerTeam === stA.matchWinnerTeam)
check("★ 缓存值绝不是 -1(战绩不会被记成 Draw)",
    A.d.matchWinnerTeam === 0 || A.d.matchWinnerTeam === 1)
```

## 预防规则

1. **改派生口径前，先 `grep` 函数名找出全部调用点**，一个个问"它算的是不是同一件事"。只改眼前一处 = 把分叉往后挪。
2. **凡"同一事实被多处各自算出来"，迟早分叉**；分叉必定发生在边界情形（同分、并列、零、极值），也就是最要命的地方。正解是**在产生点落缓存 + 消费方只读**。
3. **给函数加可选参数改行为，是高危改动**：老调用点全都静默走旧分支，且编译器不会提醒。加参数时把"未传参"当成一种需要审视的调用来对待。
4. 断言要覆盖**每一个消费方**，不能只覆盖最显眼的那个（本案只断言了下发报文，漏了战绩与回放）。

## 关联

- [[ERR-095__presentation-slot-vs-data-index-conflated|ERR-095]] —— **同族**：那次是同一份数据有"展示序/数据序"两种表示而被混用，本条是同一个事实有多份各自计算的副本。都属"单一真源缺位"。
- [[ERR-104__assumption-written-as-assertion-and-hollow-pin|ERR-104]] —— 同一批次：那条是断言没信息量，本条是断言面太窄。
