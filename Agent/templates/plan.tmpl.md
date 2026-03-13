# Execution Plan
<!-- 
  命名: {date}__{project}__plan__{id}__{slug}.md
  位置: .in-process/active/{run_id}/
  状态: active | superseded | closed | archived
-->

- **Plan ID**: PLAN-{id}
- **Run Ref**: REQ-{run_id}
- **Created**: {ISO 8601}
- **Status**: active
- **Last Updated**: {ISO 8601}

---

## Objective
{一句话描述本次执行的目标}

## Scope
- **In**: {包含的范围}
- **Out**: {排除的范围}

## Constraints
- {技术约束}
- {业务约束}
- {质量约束}

---

## File Tracking

### Files Read
<!-- 每读一个新文件时追加。格式: - [x] path (行号范围/目的) -->
- [ ] {path/to/file} — {读取目的}

### Files To Modify (Planned)
<!-- 规划阶段填写。如新增计划外文件需 CTO 批准并记 Status Log -->
- [ ] {path/to/file} — {修改目的}

### Files Actually Modified
<!-- 实际修改后追加。QA 会对照此列表与 change_manifest -->
- [ ] {path/to/file} — {+N/-M lines} — {修改内容}

---

## Steps

### Phase 1: {阶段名}
- [ ] Step 1.1: {具体动作}
- [ ] Step 1.2: {具体动作}

### Phase 2: {阶段名}
- [ ] Step 2.1: {具体动作}
- [ ] Step 2.2: {具体动作}

---

## Findings
<!-- 执行过程中的重要发现。如需整改,创建独立 audit 工件 -->
| # | Finding | Impact | Action |
|---|---------|--------|--------|
| F1 | {发现} | {影响} | {处理方式} |

## Risks
| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|------------|
| R1 | {风险} | H/M/L | H/M/L | {缓解措施} |

## Blockers
<!-- 阻塞项。发现时立即记录 -->
| # | Blocker | Reported | Resolution | Resolved |
|---|---------|----------|------------|----------|
| B1 | {描述} | {时间} | {方案} | Yes/No |

---

## Status Log
<!-- 关键节点的时间线。最新在最上 -->
| Timestamp | Event | Notes |
|-----------|-------|-------|
| {time} | Plan created | — |

## Next Actions
<!-- 当前应该做什么。每个 step 完成后更新 -->
1. {下一步动作}

---

## Cross References
- **Audit**: {对应 audit 工件 ID,无则 N/A}
- **Upstream**: {requirement_package.md}
- **Downstream**: {task_dag.json, change_manifests/}
