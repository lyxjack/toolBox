---
id: ERR-098
type: error
errorCode: PORT-SEM-001
severity: high
status: resolved
recurrence: 0
firstSeen: "2026-08-04"
tags:
  - ki/error-book
  - error
  - severity/high
  - domain/guandan
  - domain/protocol
prevention:
  - "**移植参照实现的触发链之前, 先做一张生命周期对齐表**: 参照产品的『一局/一场/结算/重开』分别对应本作的什么。
    对不上的格子就是不能照抄的格子。本例滚子『一局 = 一场, 每次 RoundResult 都弹结算层』被平移进
    掼蛋『多副 = 一场』, 于是每一小局都弹整场级结算"
  - "**协议字段人人有消费者**: 消息体里凡带语义闸门字段(isFinal / over / phase / episodeOver),
    接线时必须能指认『消费它的那一行代码』; 指认不出 = 未接线, 不是『以后再说』。
    本例 episodeOver 字段服务端一直在发, 客户端拿它切了标题文案却没拿它当开面板的闸门"
  - "**文案分叉 ≠ 行为分叉**: 『标题都会写整场结束了』给人一种字段已接入的错觉。
    验收要分别验: 字段影响了什么文字, 与字段拦住了什么行为, 是两条独立断言"
ci_rules: []
mem_ref: b459b6b2-5df9-472a-92db-172861710d49
mem_status: linked
related:
  - Error_Book/entries/ERR-093__authoritative-broadcast-discarded-as-redundant.md
  - Error_Book/entries/ERR-067__exit-nav-relies-on-echo-blocked-by-state-gates.md
aliases:
  - ERR-098
  - 参照生命周期语义误植
  - ported-lifecycle-mismatch
---

# 参照实现的生命周期语义误植 —— 单局制的触发链被平移进整场制

## 错误现象

掼蛋金币经典场(从 2 打到 A, 多副连打为一整场)测试时, **每一小局打完都弹出结算面板**;
正确行为是仅当一方打过 A(或打满固定把数)整场结束时才弹一次。

## 根因分析

两层叠加:

1. **心智模型来自参照产品**: 母版打滚子的金币场是单局游戏 —— 一局即一场,
   每收到一条 `Game_RoundResult` 就 push 结算层, 再靠显式 `CoinGameAgain` 重开。
   这套『每次结算消息 = 弹层』的触发链被原样平移进掼蛋, 而掼蛋一条 `G_GD_Settle` 只是一小局。
2. **协议自带的闸门字段零消费**: 服务端每条 Settle 本就携带 `episodeOver`(过 A / 固定把数末副
   才为 true, 终局信息按契约并入最后一副)。客户端拿它切了「本局结束/整场结束」的**标题文案**、
   拿它触发战绩落库 —— 唯独没拿它当**开面板的闸门**。字段到了、看起来被用了、关键消费点缺席。

## 解决方案

渲染层补一行闸门: `if (vm.episodeOver) this.buildSettlePanel(vm)`(横竖两版同改)。
小局结算照走级牌刷新/进贡/落库, 只是不再弹层。服务端一行未动 —— 它从头就是对的。

诊断时的定位法(蜂群四路并勘的结论): 先证明服务端与金币链路无病(金币只在销房时一次性落账),
再顺 `G_GD_Settle → handler → renderSettle → buildSettlePanel` 触发链找到无条件调用点。

## 预防规则

- 抄参照产品的**触发链**之前, 先抄它的**生命周期定义**, 两边对齐了才许抄;
- 协议里已有的语义闸门字段, 接线评审时逐个指认消费者;
- 同族教训: [[ERR-093__authoritative-broadcast-discarded-as-redundant|ERR-093]] 是把权威广播当冗余丢掉,
  本条是把权威字段接了个装饰用途 —— 服务端说了算的信息, 客户端要么全信要么指认为什么不信;
  [[ERR-067__exit-nav-relies-on-echo-blocked-by-state-gates|ERR-067]] 同样死在『复用母版链路时没通读它的前置语义』。