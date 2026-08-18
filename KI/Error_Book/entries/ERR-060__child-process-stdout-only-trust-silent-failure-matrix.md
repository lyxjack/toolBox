---
id: ERR-060
type: error
errorCode: ERR-060
severity: medium
status: resolved
recurrence: 0
firstSeen: "2026-07-24"
tags:
  - ki/error-book
  - error
  - severity/medium
  - domain/robustness
  - language/javascript
prevention:
  - "spawnSync 结果四元组 error / signal / status / stderr 必须全查：spawn 失败、超时被杀、非零退出时 stdout 恰好都是空，只看 stdout 会把它们全当成功"
  - "『JSON.parse 成功』≠『结构有效』：字段形状校验缺省拒绝——合法但无预期字段的输出（{}、数组、裸数字）必须升格告警，不得静默忽略"
  - "空字符串在 ?? 后备链中是陷阱（'' ?? x 返回 ''）：外部输入字段先 trim 归一化为 null 再走后备链，否则空字段吞掉兄弟字段携带的真实原因"
  - "与『成功时零输出』的子进程约定配合的判定原则：非空 stdout 一律异常信号；空 stdout 仅在 exit 0 且 stderr 也为空时才可信"
ci_rules:
  - "grep 审计：出现 spawnSync( 的文件必须同时出现对 .error 与 .status 的检查，缺一报警"
mem_ref: 019f9771-430b-7532-9be5-557197ad8c0e
mem_status: linked
related:
  - "Error_Book/entries/ERR-050__recovery-path-swallowed-by-drop-path.md"
  - "Internal_KI/patterns/PAT-005__async-error-handling.md"
aliases:
  - "ERR-060"
  - "stdout-only-trust"
---

# 子进程结果只信 stdout：静默失败面矩阵（含空串短路）

## 错误现象

内联 gate 断言连续三轮被复审抓出静默失败：① spawn 失败/超时被杀/非零退出 → stdout 为空 → 被当成功；② 输出为合法但形状不符的 JSON（`{}`、数组、裸数字）→ 解析成功、字段取不到 → 无声跳过；③ 告警字段为空串 `""` → `typeof` 判"是字符串"、`??` 不跳过空串 → 短路后备链，真实失败原因被吞成空告警。

## 根因

信任面只铺在 stdout 内容上，进程级结果（error/signal/status/stderr）与字段级有效性（形状、非空）全部裸奔。三个缺陷共享同一模式：**"没有坏消息"被当成"好消息"**，与 [[ERR-050__recovery-path-swallowed-by-drop-path|ERR-050]] 的"吞掉"家族同源。

## 修复

判定原则重建：子进程约定成功时零输出 → 非空 stdout 一律异常，可识别的告警字段（trim 归一化后非空的字符串）才转发，其余升格；空 stdout 仅在 exit 0 且 stderr 为空时可信；error/signal/status/stderr 逐项检查，各自升格为带原文片段的可见告警。

## 预防规则

见 frontmatter。ci_rules：spawnSync 检查项可 grep 审计，已列。

## 关联

- [[ERR-050__recovery-path-swallowed-by-drop-path|ERR-050]] — "吞掉"家族
- [[PAT-005__async-error-handling|PAT-005]] — 异步错误处理正面模式
