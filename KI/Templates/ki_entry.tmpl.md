---
id: "{KI-{NNN} | DEC-{NNN} | LES-{NNN}}"
type: "{decision | lesson}"
decision_type: "{adoption | rejection}"  # decision 专用;rejection=决定不做的(见 Internal_KI contract §10.3.1)
title: "{标题}"
status: "{active | deprecated | superseded}"  # superseded: rejection 被用户推翻时
created: "{YYYY-MM-DD}"
tags:
  - "ki/{decision | lesson}"
  - "{layer/KI | layer/Agent | ...}"
aliases:
  - "{ID}"
mem_ref: "{content_session_id | null}"  # claude-mem 双向关联,规则见 Internal_KI contract §3.8
mem_status: "{linked | unavailable}"    # 同上 §3.8(不可用→降级,不阻塞)
---

# {标题}

## Decision / Lesson
{核心内容}

## Rationale / Context
{原因或背景}

## Alternatives Considered
- {备选方案1}
- {备选方案2}

## Outcome / Evidence
{结果或证据}

## 关联
- [[相关条目|显示名]] — 简要说明
