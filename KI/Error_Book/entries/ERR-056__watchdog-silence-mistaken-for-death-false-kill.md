---
id: ERR-056
type: error
errorCode: ERR-056
severity: high
status: resolved
recurrence: 0
firstSeen: "2026-07-24"
tags:
  - ki/error-book
  - error
  - severity/high
  - domain/concurrency
  - language/shell
prevention:
  - "看护/门禁的自动处置（cancel/kill/重派）必须基于硬存活证据：进程存在性连续多轮为否 + 状态仍 running；时序停滞（更新戳/日志不动）只能触发调查，不能触发处置"
  - "『状态不可读』是独立第三态，不得并入『死亡』：state 可能被清理而 runner 仍活着，此时重派 = 同一任务双跑（--write 型任务尤其危险）"
  - "自动重派前必须确认无存活 runner（ps 按命令名核对，防 pid 复用误判）"
  - "长任务看护用三值退出码语义：0=终态完成 / 2=硬证据死亡可自动处置 / 3=仅调查；调用方按码分流，禁止把 3 当 2 处理"
ci_rules: []
mem_ref: 019f9771-430b-7532-9be5-557197ad8c0e
mem_status: linked
related:
  - "Error_Book/entries/ERR-051__enqueue-stamp-vs-process-bump-cross-time-gate-false-kill.md"
  - "Internal_KI/patterns/PAT-029__two-tier-liveness-watchdog-for-background-jobs.md"
aliases:
  - "ERR-056"
  - "silence-is-not-death"
---

# 看护把"安静"当"死亡"：无更新即判死会误杀健康长任务

## 错误现象

Codex 后台 job 看护脚本初版：status + updatedAt 连续两轮轮询（约 10 分钟）无变化即判"卡死"，立刻 `cancel` + 重派。Codex stop 复审拦下：模型长思考、长命令执行期间本来就不产生进度事件，健康长任务必被误杀。

## 根因

把时序侧信道（更新戳停滞）当成了死亡证据。安静 ≠ 死亡——真正的判据在进程本身的存在性，与 [[ERR-051__enqueue-stamp-vs-process-bump-cross-time-gate-false-kill|ERR-051]] 的 epoch 戳误杀同族：**时序信号做拦截判据只产生误伤**。

## 修复

两级判定：
- **exit 2（硬证据死亡，可自动处置）**：job 记录中的 pid 连续两轮检查不存在（`kill -0` 失败且 `ps` 命令名不含 runner 特征）而状态仍 queued/running → 自动 cancel + 重派。
- **exit 3（仅调查）**：安静约 30 分钟 / 超 60 分钟硬上限 / 状态不可读 → 先 `ps -p <pid>`、tail 日志、复查 status；有实锤才处置，健康慢任务带更高阈值重启看护。状态不可读时必须先确认无存活 runner 才允许重派（防双跑）。

## 预防规则

见 frontmatter。ci_rules 评估：设计审查类缺陷，无机械 lint 面，留空。

## 关联

- [[ERR-051__enqueue-stamp-vs-process-bump-cross-time-gate-false-kill|ERR-051]] — 同族：时序侧信道判据零真阳性、纯误伤
- [[PAT-029__two-tier-liveness-watchdog-for-background-jobs|PAT-029]] — 修复后沉淀的看护协议
