## Requirement Package
- **ID**: REQ-{YYYYMMDD-HHMMSS}
- **Timestamp**: {ISO 8601}
- **Status**: DRAFT | APPROVED | SUPERSEDED

### User Request
> {用户原始请求原文,不做修改}

### Clarified Intent
{PM 理解后的结构化表述。明确"用户真正想要什么"。}

### Hidden Assumptions
> 挂载 P9 (Assumption Transparency)。显式列出 PM 分析需求时的所有隐含假设。

| # | 假设 | 信源 | 待澄清? |
|---|------|------|---------|
| A1 | {一句话} | 用户已确认 / 文档推断 / PM 推断 | 是 / 否 |
| A2 | {一句话} | {信源} | {是/否} |

> 若 standard tier 写 `None identified`,需在 Risk Notes 段说明理由。

### Scope
- {明确包含的功能/变更范围}
- {每项用一条 bullet}

### Out of Scope
- {明确不做的事项}
- {防止 scope creep 的边界}

### Constraints
- {技术约束:语言、框架、兼容性}
- {业务约束:时间、预算、依赖}
- {质量约束:性能、安全、测试覆盖}

### Acceptance Criteria
- [ ] AC-1: {可验证的陈述}
- [ ] AC-2: {可验证的陈述}
- [ ] AC-3: {可验证的陈述}

### Referenced Context
- **KI**: {关联的 Knowledge Item ID 列表,无则标 N/A}
- **Skills**: {建议的 skill 名称列表}
- **Failure Memory**: {历史错误模式引用,无则标 N/A}

### Risk Notes
- {PM 识别的风险,无则标 None identified}
