---
id: ERR-061
type: error
errorCode: ERR-061
severity: medium
status: resolved
recurrence: 0
firstSeen: "2026-07-24"
tags:
  - ki/error-book
  - error
  - severity/medium
  - domain/concurrency
  - language/javascript
prevention:
  - "调用『读全文件→改一键→写回全文件』型 API 前，先确认该文件还承载谁的数据：config 与运行时记录（jobs）同文件时，写 config 就是在赌 jobs 不被并发更新"
  - "高频断言必须幂等短路（check-before-write）：目标值已达成则零写入——稳态零写入把无锁 RMW 的碰撞窗口压缩到冷启动一瞬"
  - "无锁共享 JSON 的 RMW 与并发写者互覆（lost update），写频率本身就是风险面：能不写就不写"
ci_rules: []
mem_ref: 019f9771-430b-7532-9be5-557197ad8c0e
mem_status: linked
related:
  - "Error_Book/entries/ERR-036__state-json-duplicate-currentstate-key-on-transition.md"
  - "Error_Book/entries/ERR-058__same-event-parallel-repair-race-partial-success-fail-open.md"
aliases:
  - "ERR-061"
  - "config-write-clobbers-jobs"
---

# 全量读改写覆盖并发写者：每 prompt 写 config 会踩掉活跃 job 记录

## 错误现象

review gate 断言最初每条 prompt 调用厂商 `setConfig` 落一次开关。Codex 复审指出：`setConfig` 的实现是读整个 `state.json` → 改 config 键 → **整文件写回**，而同一文件还承载 jobs 数组——运行中的 job 进程随时在更新自己的记录，断言进程用旧快照写回即把它覆盖（lost update），可回退 job 状态甚至弄丢新建 job。

## 根因

无锁多进程环境对共享 JSON 做全量 RMW；且断言以每 prompt 的高频运行，把小概率碰撞窗口放大成常态暴露。`state.json` 同时承载配置与运行时数据，与 [[ERR-036__state-json-duplicate-currentstate-key-on-transition|ERR-036]] 同一个文件家族的另一种翻车。

## 修复

先读后写：每个状态根先 `getConfig` 检查，开关已为 true 则纯读跳过（零字节写入）；仅在缺失/false 时写一次。稳态下断言是只读操作，写只发生在冷启动/状态被清后的一瞬。

## 预防规则

见 frontmatter。ci_rules 评估：需理解文件承载语义，无机械 lint 面，留空。

## 关联

- [[ERR-036__state-json-duplicate-currentstate-key-on-transition|ERR-036]] — state.json 家族先例
- [[ERR-058__same-event-parallel-repair-race-partial-success-fail-open|ERR-058]] — 同一加固链上的并行竞态
