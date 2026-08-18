---
id: ERR-051
type: error
errorCode: ERR-051
severity: critical
status: resolved
recurrence: 0
firstSeen: "2026-07-12"
tags:
  - ki/error-book
  - error
  - severity/critical
  - domain/concurrency
  - language/python
prevention:
  - "拦截判据禁止做'跨时刻计数器比较'（入队时盖戳 vs 处理时 bump）：边界消息与其后续同波消息必然带旧戳，按戳拦截只会误杀队列积压中的正常消息"
  - "评估门禁真实效用：真正迟到的消息入队时已盖新戳，戳式门禁根本拦不住它——上线前先问'这个门禁能拦住谁'，答案若只有误伤对象就不该存在"
  - "拦截必须基于消息内容（局号/牌面/位置/去重键），不能基于时序侧信道；已有内容级防线时，时序门禁降级为纯观测计数"
  - "怀疑门禁误杀时用确定性复现：构造同一波突发（边界消息+副本+新局首消息）灌入真实门禁代码，数被杀条数"
mem_ref: cbdc9a4e-5ecf-4249-b3c1-4751fd1f432b
mem_status: linked
related:
  - "Error_Book/entries/ERR-050__recovery-path-swallowed-by-drop-path.md"
  - "Internal_KI/patterns/PAT-025__notready-parking-replaces-blocking-wait.md"
aliases:
  - "ERR-051"
  - "stale-epoch-false-kill"
---

# epoch 门禁误杀：入队时间戳 vs 处理时刻计数器的竞态

## 错误现象

gunzi_pro 测试服（三开关全开）room=124762：某座位出牌卡死，整局被服务器逐手代打。日志铁证：`GS_GameStart` 与新局报主 Turn 被 `reason=stale_epoch` 丢弃 → 该座位前置状态缺失 → 每条 Turn 泊车 8 秒超时回 101。

## 根因

epoch 戳在**入队时**盖、epoch 在**边界消息处理时**才 +1。局切换是一波消息突发：排在边界消息后面尚未处理的消息（GameStart 其余副本、新局首条报主）全带旧戳，边界一处理完全部被判"跨局旧消息"误杀。沙盒确定性复现：一波 6 条突发 **5 条被误杀**。更本质的缺陷：真正跨局迟到的消息入队时已盖**新**戳，此门禁在设计上就拦不住它——纯误伤机制，零真阳性。

## 修复

commit `5119163`：门禁降级为 `[EPOCH_LAG]` 纯观测（计数+verbose 日志），拦截交还旧代码的内容级防线（去重/局号/牌面/位置校验）。后续 100 桌压测实测 EPOCH_LAG 观测 ~6000 次/场、零误杀——若未废除即 6000 次误杀。见 [[ERR-050__recovery-path-swallowed-by-drop-path|ERR-050]]（同族教训：防护机制自己变成加害者）与 [[PAT-025__notready-parking-replaces-blocking-wait|PAT-025]]（epoch 门禁原属的 actor 改造）。
