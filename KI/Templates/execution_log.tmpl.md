---
id: "EXEC-{YYYY-MM-DD}-{REQ-slug}"
type: execution_log
req_ref: "REQ-{YYYYMMDD-HHMMSS}"
status: "{pass | fail | partial}"
created: "{YYYY-MM-DD}"
tags:
  - execution_log
  - req-tracking
  - ki/internal
related: []  # wiki link 数组，可空；冷启动时允许 0 引用（加 bootstrap: true）
aliases:
  - "EXEC-{YYYY-MM-DD}-{REQ-slug}"
mem_ref: "{content_session_id | null}"  # claude-mem 双向关联：产出本条的 session（sdk_sessions.content_session_id）；降级时 null
mem_status: "{linked | unavailable}"    # linked=写入时已验证存在；unavailable=claude-mem 不可用（降级，不阻塞）
---

# {一句话标题：本次执行交付了什么}

## User Intent (Original)
{用户原始请求一行原样转录，保留口语化表达}

## PM Clarified Intent
{PM 澄清后的真实意图：去歧义、补默认、明确边界}

## Hidden Assumptions Surfaced
- A1: {假设内容} — 挂载 P9（验证策略）
- A2: {假设内容} — 挂载 P9
- AN: {假设内容}

## CTO Plan Summary
- 任务数：{N}
- 执行模式：{Serial | Parallel | Swarm}
- 关键依赖：{task X → task Y 的强依赖说明}

## Execution Outcome
- 结果：{PASS | FAIL | PARTIAL}
- AC 命中率：{M/N}（M 条验收标准中通过 N 条）
- 主要偏差：{若 FAIL/PARTIAL，列出未达标项}

## Lessons Extracted
1. {可沉淀经验 1} — 见 [[LES-{NNN}]] 或 [[PAT-{NNN}]]
2. {可沉淀经验 2} — 见 [[ERR-{NNN}__slug|ERR-{NNN}]]
3. {可沉淀经验 3}

## Cross-References
- [[REQ-{YYYYMMDD-HHMMSS}]] — 原始需求包
- [[PAT-{NNN}__slug|PAT-{NNN}]] — 沿用的正确模式
- [[ERR-{NNN}__slug|ERR-{NNN}]] — 触发的预防规则
