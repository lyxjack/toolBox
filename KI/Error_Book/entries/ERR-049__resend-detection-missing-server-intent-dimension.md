---
id: ERR-049
type: error
errorCode: ERR-049
severity: high
status: resolved
recurrence: 0
firstSeen: "2026-07-11"
tags:
  - ki/error-book
  - error
  - severity/high
  - domain/idempotency
  - language/python
prevention:
  - "重发/重复检测的等价判定必须包含'对端此刻在等什么'的意图维度，不能只比较'请求长得一样'"
  - "同一主体合法地连续发起相同形状的请求（赢墩连出、重试型业务）是常态；缓存重放窗口要用协议状态（期望位/序号）判别，宁可漏放（走正常流程）不可误放"
  - "重放类功能上线前必须用真实流量日志回放对照，等价候选/连出类边角只有真实牌局能暴露"
mem_ref: cbdc9a4e-5ecf-4249-b3c1-4751fd1f432b
mem_status: linked
related:
  - "Internal_KI/patterns/PAT-023__old-new-replay-equivalence-verification.md"
  - "Error_Book/entries/ERR-050__recovery-path-swallowed-by-drop-path.md"
aliases:
  - "ERR-049"
  - "resend-vs-consecutive-turn"
---

# 重发检测缺"服务器意图"维度：赢墩连出被误判为断链重发

## 错误现象

gunzi_pro Phase 3 出牌重放缓存上线回放验证时，room 38556022 出现连锁差异：一次合法出牌被替换成了上一手的重放，后续 6 条响应雪崩偏移。

## 根因

重放窗口判定只用了【position 匹配 + 本地序列未推进 + 未确认】三个维度。但在滚子规则里，**赢墩者下一手继续领出**——同一位置合法地连续收到两个一模一样形状的 Game_Turn。三个维度全部满足，第二个合法新 Turn 被误判为"断链重发"，重放了上一手的牌。

## 修复

补上判别子：`env.current_turn_position`（本地期望位）。
- 期望位 **==** 该位置 → 引擎正在等它出**新**的一手（赢墩连出）→ 走正常出牌；
- 期望位**已移走** + 序列未推进 + 未确认 → 服务器在重问**旧**的一手 → 重放。

一行条件，语义上是把"请求相似性"升级为"对端意图判定"。

## 预防规则

见 frontmatter。一句话：**判断"这是不是重发"，本质是判断"对端此刻在等新答案还是旧答案"，必须有协议状态参与，不能只看请求内容。**

## 关联

- [[PAT-023__old-new-replay-equivalence-verification|PAT-023]] — 抓出本缺陷的回放方法论（真实牌局日志的价值）
- [[ERR-050__recovery-path-swallowed-by-drop-path|ERR-050]] — 同一功能上线时暴露的另一缺陷
