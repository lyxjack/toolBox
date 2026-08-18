---
id: PAT-030
type: pattern
title: "fail-closed 开关断言：多根写入 × 三挂载点 × 失败面全升格"
status: active
created: "2026-07-24"
trigger_condition: user_explicit
tags:
  - ki/internal
  - pattern
  - trigger/user_explicit
  - domain/architecture
mem_ref: 019f9771-430b-7532-9be5-557197ad8c0e
mem_status: linked
related:
  - "Error_Book/entries/ERR-057__env-dependent-state-root-write-a-read-b-fail-open.md"
  - "Error_Book/entries/ERR-058__same-event-parallel-repair-race-partial-success-fail-open.md"
  - "Error_Book/entries/ERR-060__child-process-stdout-only-trust-silent-failure-matrix.md"
  - "Internal_KI/patterns/PAT-022__dpop-htu-fail-closed-self-base-url.md"
aliases:
  - "PAT-030"
  - "fail-closed-flag-assertion"
---

# fail-closed 开关断言：多根写入 × 三挂载点 × 失败面全升格

## 适用场景

第三方系统的强制门依赖一个**你无法改其读取逻辑**的开关（本例：Codex 插件 stop-review-gate 读 per-workspace 状态文件），要求该门全局、持续、fail-closed 地生效。

## 核心结构

**多根写入**（对付 [[ERR-057__env-dependent-state-root-write-a-read-b-fail-open|ERR-057]] 的写A读B）：
枚举读者可能解析到的全部状态根（env 指向 / 已知 data dir 通配 / fallback），通过厂商自己的解析库逐根断言；先读后写（已达成则零写入，见 [[ERR-061__full-state-rmw-overwrites-concurrent-writer|ERR-061]]）。

**三挂载点**（时机各司其职）:
1. **会话开始**（startup|resume|clear）：同步毫秒级直写——禁 async，禁带慢探测的 setup 路径（[[ERR-058__same-event-parallel-repair-race-partial-success-fail-open|ERR-058]] 的竞态）。
2. **关键任务回合内联**：按需断言（本例限含关键词的 prompt），子进程失败面全升格（[[ERR-060__child-process-stdout-only-trust-silent-failure-matrix|ERR-060]]）。
3. **事件端强制兜底**：门读取的同一事件里做**全根纯读验证**——全真才放行；修出来的/失败的一律 block，理由携带收敛路径（含对被跳过回合的 working-tree 补审指令，见 [[ERR-059__repair-retry-skips-edit-turn-review-scope-anchor|ERR-059]]）。

**错误处理阶梯**：依赖系统不存在 = 静默（无门可保护）；部分失败 = stderr 记录；全失败 = prompt 端 advisory（systemMessage + 上下文注入）、事件端 block。

## 关联

- [[PAT-022__dpop-htu-fail-closed-self-base-url|PAT-022]] — fail-closed 家族先例
- [[ERR-057__env-dependent-state-root-write-a-read-b-fail-open|ERR-057]] / [[ERR-058__same-event-parallel-repair-race-partial-success-fail-open|ERR-058]] / [[ERR-059__repair-retry-skips-edit-turn-review-scope-anchor|ERR-059]] / [[ERR-060__child-process-stdout-only-trust-silent-failure-matrix|ERR-060]] / [[ERR-061__full-state-rmw-overwrites-concurrent-writer|ERR-061]] — 本模式吸收的六轮复审教训
