---
id: ERR-059
type: error
errorCode: ERR-059
severity: medium
status: resolved
recurrence: 0
firstSeen: "2026-07-24"
tags:
  - ki/error-book
  - error
  - severity/medium
  - domain/process
  - language/javascript
prevention:
  - "重试型补救的审查对象必须是『累积的实际变更』（working tree / diff），绝不能是『重试回合的增量』——重试轮几乎总是空回合"
  - "审查范围锚定『最后一条消息/最近一轮』的机制，在任何 skip+retry 流程中都会被空回合天然绕过；设计重试前先回答：重试那一轮审的是什么？"
  - "门禁被跳过的回合，其产物必须显式补审（working-tree 级 review），不能寄望下一轮门禁自动覆盖"
ci_rules: []
mem_ref: 019f9771-430b-7532-9be5-557197ad8c0e
mem_status: linked
related:
  - "Error_Book/entries/ERR-038__delivery-claim-not-verified-against-git-diff.md"
  - "Error_Book/entries/ERR-058__same-event-parallel-repair-race-partial-success-fail-open.md"
aliases:
  - "ERR-059"
  - "empty-retry-turn-review"
---

# 修复后重试绕过复审：审查范围锚定"最后一轮"而非实际改动

## 错误现象

gate 开关失效的回合被跳过复审；辅助 hook 修好开关后指示"直接再 Stop 一次"。重试回合复审顺利通过——但产生编辑的那个回合的改动**从未被任何复审覆盖**。

## 根因

插件 stop 复审的 prompt 锚定 `last_assistant_message`（审"本回合干了什么"），重试回合的最后消息只是一句收尾话 → 复审空转通过。审查对象锚定错误，与 [[ERR-038__delivery-claim-not-verified-against-git-diff|ERR-038]] 同族：**声称被审过 ≠ 实际变更被审过**。

## 修复

所有 block 理由统一改为：停止前必须先对**实际改动**跑 working-tree 范围的真实复审（`review --wait`）并处理 findings，复审通过才允许停——即使插件门在出事回合跳过了，改动也被手动补审覆盖。

## 预防规则

见 frontmatter。ci_rules 评估：流程语义缺陷，无 lint 面，留空。

## 关联

- [[ERR-038__delivery-claim-not-verified-against-git-diff|ERR-038]] — 审查对象锚定错误家族
- [[ERR-058__same-event-parallel-repair-race-partial-success-fail-open|ERR-058]] — 上游竞态：正是它造出"被跳过的回合"
