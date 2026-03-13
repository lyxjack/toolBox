## Execution Plan
- **Requirement Ref**: REQ-{id}
- **Timestamp**: {ISO 8601}
- **Status**: DRAFT | APPROVED | AMENDED

### Architecture Decision
{方案概述:用什么技术路线,为什么。}

### Reuse Audit
| 已有能力 | 路径 / Skill | 可复用? | 决定 |
|----------|-------------|---------|------|
| {能力1} | {path} | Yes/Partial/No | 复用 / 改造 / 不用 |
| {能力2} | {path} | ... | ... |

**结论**: {复用了 X 个现有 skill/code,新建了 Y 个}

### Skill Mapping
| Task ID | Skill | 加载路径 | 置信度 |
|---------|-------|---------|--------|
| T1 | {name} | {path} | {0.xx} |
| T2 | {name} | {path} | {0.xx} |

### Task DAG Summary
{文字描述 task 依赖关系。详细结构在 task_dag.json}

### Risk Assessment
| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| {风险1} | H/M/L | H/M/L | {措施} |

### Verification Plan
{告诉 QA 应该验什么。逐条列出验证要点。}
- [ ] VP-1: {验证点}
- [ ] VP-2: {验证点}

### Minimal Change Rationale
{论证为什么当前方案是最小化修改。如果不是最小修改,说明原因。}
