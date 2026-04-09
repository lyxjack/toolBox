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
prevention: "{一句话预防措施}"
aliases:
  - "ERR-{NNN}"
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
