---
id: ERR-050
type: error
errorCode: ERR-050
severity: medium
status: resolved
recurrence: 0
firstSeen: "2026-07-11"
tags:
  - ki/error-book
  - error
  - severity/medium
  - domain/architecture
  - language/python
prevention:
  - "处理链中'恢复类'检查必须排在'丢弃类'检查之前：去重/网关先跑就会把重发吞成 101，恢复功能永远轮不到"
  - "叠加多个特性开关时，为每条消息画一次处理链顺序图：早先加的丢弃型优化（去重/限流/网关）是后加的恢复型功能（重放/重试/补偿）的天然天敌"
  - "端到端桩测必须覆盖'开关叠加'形态，单开关各自通过不代表叠加通过"
mem_ref: cbdc9a4e-5ecf-4249-b3c1-4751fd1f432b
mem_status: linked
related:
  - "Error_Book/entries/ERR-049__resend-detection-missing-server-intent-dimension.md"
  - "Internal_KI/patterns/PAT-023__old-new-replay-equivalence-verification.md"
aliases:
  - "ERR-050"
  - "gate-eats-replay"
---

# 恢复路径被丢弃路径吞掉：入队网关去重先于重放检查

## 错误现象

gunzi_pro Phase 3 端到端桩测：断链重发的 Turn 预期重放同一张牌，实际返回 101。重放功能形同虚设——而这正是旧版死循环的入口。

## 根因

早一个阶段（解堵塞 E1）加的入队前网关在**路由层**做只读去重探测，重复消息直接 101 不进队列。断链重发的 Turn 与已处理的 Turn 同 key → 被网关当重复副本吞掉，永远到不了 worker 里的重放检查。两个功能各自正确，**叠加顺序错误**。

## 修复

重放检查前置到网关内部、排在去重探测**之前**：先问"这是不是需要重放的重发"，再问"这是不是该丢的重复"。语义顺位：恢复 > 丢弃。

## 预防规则

见 frontmatter。结构化表述：消息处理链的正确顺位是
`身份校验 → 恢复类（重放/补偿） → 丢弃类（去重/网关/限流） → 正常处理`，
任何把丢弃类前移的"优化"都要检查它吞掉的集合里有没有恢复类的目标。

## 关联

- [[ERR-049__resend-detection-missing-server-intent-dimension|ERR-049]] — 同一功能的另一缺陷（判别维度缺失）
- [[PAT-023__old-new-replay-equivalence-verification|PAT-023]] — 桩测+回放双层验证抓出两者
