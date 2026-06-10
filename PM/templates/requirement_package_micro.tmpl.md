## Requirement Package (Micro)
- **ID**: REQ-{YYYYMMDD-HHMMSS}
- **Complexity**: micro
- **Status**: DRAFT | APPROVED | SUPERSEDED

> Micro 单一文件包；PM + CTO Plan + QA Evidence 合并落本。任何字段不满足即升级 standard（见 `PM/pm_workflow.md` Step 4.5 "升级路径"）。

### Intent
{用户原始请求一行 + PM 澄清后的真实意图一行}

### Hidden Assumptions
> 挂载 P9 (Assumption Transparency)。micro tier 弱化:允许 `None identified`。

`None identified` — 或一行假设(若触及新功能/新接口/业务/跨层/schema/storage 关键词,**禁止** None identified,改填至少 1 条;否则升级 standard)。

### Scope
- {改动 1}
- {改动 2}（≤ 2 文件 / ≤ 30 行）

### Out of Scope
- {防 scope creep 的边界，至少 1 条}

### Acceptance Criteria
- [ ] AC-1: {可验证陈述（grep/diff/数值/视觉）}
- [ ] AC-2: {同上}

### Touched Files
- `path/to/file1`（修改 / 新建）
- `path/to/file2`（修改）

### Plan（取代 standard 的 execution_plan + task_dag）
- 工具：{Edit / MCP / Bash}
- 步骤：{1. … 2. … 3. …}（≤ 5 步，无 DAG）
- Reuse 引用：{现有 KI/skill/pattern 路径，或 N/A}

### QA Evidence（取代 standard 的 verification_log + qa_report）
| Layer | 检查项 | 结果 |
|-------|--------|------|
| L1 Build | 编译/类型 | PASS/FAIL/N/A |
| L2 Requirement | 逐条 AC 命中 | PASS/FAIL |
| L3 Behavior | 核心路径目检 / 运行时 | PASS/FAIL/PENDING |
| L4 Isolation | git diff 仅命中 Touched Files | PASS/FAIL |
| L5 Evidence | 本文件落盘 + 状态机 | PASS |

**Verdict**: {APPROVED / REJECTED}（双方意见见 state.json.history）

### Risk / Note
{1-2 句，可为空}
