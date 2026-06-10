---
id: PAT-{NNN}
type: pattern
title: "{模式标题}"
status: active
created: "{YYYY-MM-DD}"
tags:
  - "pattern/{category}"
  - "{engine/cocos | engine/unity | ...}"
  - ki/pattern
complements:
  - "[[ERR-{NNN}__slug|ERR-{NNN}]]"
trigger_condition: "user_explicit"  # Cat 3 (业务硬逻辑) 用 user_explicit; Cat 7 (代码可复用) 用 quality_audit; 两者都用 both
aliases:
  - "PAT-{NNN}"
mem_ref: "{content_session_id | null}"  # claude-mem 双向关联：产出本条的 session（sdk_sessions.content_session_id）；降级时 null
mem_status: "{linked | unavailable}"    # linked=写入时已验证存在；unavailable=claude-mem 不可用（降级，不阻塞）
---

# {模式标题}

## 适用场景
{何时使用此模式}

## 步骤
1. {步骤1}
2. {步骤2}

## 反模式
| 错误做法 | 正确做法 | 关联错误 |
|---------|---------|---------|
| {错误} | {正确} | [[ERR-NNN]] |

## 关联错误
- [[ERR-{NNN}__slug|ERR-{NNN}]] — 简要说明
