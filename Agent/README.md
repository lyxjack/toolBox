# Agent Layer — 文件地图

> 自 toolBox `CLAUDE.md`「Layer Details」下放（REQ-20260803-184500），按需加载。

- Rules: `Agent/rules/` — constitution, iron_laws, plan_driven_mode, qa_standard, artifact_lifecycle, audit_ledger_mode, project_rules
- Roles: `Agent/roles/` — CTO, QA, Skill Governance
- Workflows: `Agent/workflow/` — cto_planning, execution (v2 支持串行/并发/蜂群), qa_verification, joint_approval, ki_maintenance, skill_ingestion
- Orchestrator: `Agent/orchestrator/strategy.md` — 串行/并发/蜂群选择指南
- Schemas: `Agent/schemas/` — task_dag, change_manifest, handoff, rework_order
- Templates: `Agent/templates/` — execution_plan, qa_report, delivery_cert, plan, audit_ledger, audit_report, req_impl_matrix
- Index: `Agent/index/` — skill_registry, duplicate_review
- Lint: `Agent/lint/` — error-book-linter, ki-integrity-linter
