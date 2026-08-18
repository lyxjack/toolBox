---
id: ERR-{NNN}
type: error
errorCode: "{BUILD-001 | REQ-001 | BHV-001 | ISO-001 | EVD-001}"
severity: "{critical | high | medium | low}"
status: "{open | resolved | recurring}"
recurrence: 0
firstSeen: "{YYYY-MM-DD}"
tags:
  - "error/{severity}"
  - "{engine/cocos | engine/unity | ...}"
  - "{tool/MCP | tool/python | ...}"
  - "{asset/prefab | asset/scene | ...}"
  - "errorCode/{errorCode}"
  - ki/error-book
prevention: "{一句话预防措施,须含 leading_word}"
leading_word: "{单个预训练概念词,如 tight/red/blast-radius;规范见 Error_Book contract §7.2.1}"
aliases:
  - "ERR-{NNN}"
mem_ref: "{content_session_id | null}"  # claude-mem 双向关联,规则见 Internal_KI contract §3.8
mem_status: "{linked | unavailable}"    # 同上 §3.8(不可用→降级,不阻塞)
# ci_rules:                          # 可选 — 可被 CI 自动拦截的静态规则
#   - type: "file-pattern-ban"       # 类型: file-pattern-ban | code-pattern-ban | code-pattern-require
#     pattern: "{regex}"             # 匹配模式 (正则表达式)
#     message: "{拦截提示信息}"
---

# {错误标题}

## 错误现象
{描述错误的外在表现}

## 根因分析
{错误发生的根本原因}

## 解决方案
{正确的做法}

## 预防规则
{Agent 在什么情况下应该回忆起这条记录}

## 关联
- [[相关条目|显示名]] — 简要说明
