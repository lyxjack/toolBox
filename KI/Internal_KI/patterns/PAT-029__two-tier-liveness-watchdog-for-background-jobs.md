---
id: PAT-029
type: pattern
title: "后台长任务两级存活看护（安静≠死亡）"
status: active
created: "2026-07-24"
trigger_condition: user_explicit
tags:
  - ki/internal
  - pattern
  - trigger/user_explicit
  - domain/concurrency
mem_ref: 019f9771-430b-7532-9be5-557197ad8c0e
mem_status: linked
related:
  - "Error_Book/entries/ERR-056__watchdog-silence-mistaken-for-death-false-kill.md"
  - "Error_Book/entries/ERR-051__enqueue-stamp-vs-process-bump-cross-time-gate-false-kill.md"
aliases:
  - "PAT-029"
  - "two-tier-watchdog"
---

# 后台长任务两级存活看护

## 适用场景

任何"派发后台长任务 → 定期查状态 → 直到给出结果，卡死要纠正"的看护需求（本例：Codex 后台 job，脚本 `~/.claude/hooks/codex-watchdog.sh`）。

## 核心结构

固定周期轮询（默认 300s），**证据分级决定退出码，退出码决定调用方动作**：

| 退出码 | 判定 | 证据 | 调用方动作 |
|---|---|---|---|
| 0 | 终态完成 | status 进入 completed/failed 等终态 | 取 result 呈现 |
| 2 | 硬证据死亡 | 进程连续 N 轮（默认 2）不存在（`kill -0` 失败 + `ps` 命令名核对防 pid 复用）而状态仍 queued/running | 自动 cancel + 重派 + 告知用户 |
| 3 | 仅调查 | 安静 M 轮（默认 6≈30min）/ 超硬上限（默认 60min）/ 状态不可读 | ps + tail 日志 + 复查 status；实锤才处置；健康则带更高阈值重启看护；不可读时先确认无存活 runner 才许重派 |

参数全部可调：`<job-id> [interval] [max-min] [dead-confirm-polls] [quiet-max-polls]`。

## 设计要点

1. **安静只是软信号**：进度戳/日志停滞触发调查，绝不触发处置（[[ERR-056__watchdog-silence-mistaken-for-death-false-kill|ERR-056]]）。
2. **硬证据要抗竞态**：进程消失需连续多轮确认（任务恰在读状态与查存活之间完成的窗口）。
3. **"不可读"独立三态**：状态查询失败 ≠ 死亡，重派前必须排查孤儿 runner，防双跑。
4. 看护进程以 background 方式挂载，退出即唤醒调用方按码分流。

## 关联

- [[ERR-056__watchdog-silence-mistaken-for-death-false-kill|ERR-056]] — 本模式的反例起源
- [[ERR-051__enqueue-stamp-vs-process-bump-cross-time-gate-false-kill|ERR-051]] — 时序侧信道判据不可靠的先例
