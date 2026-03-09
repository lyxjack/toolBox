# toolBox — Enterprise AI Agent Workspace

## Five-Layer Architecture

本系统采用五层架构，每层职责单一、边界清晰。

| 层 | 位置 | 职责 |
|----|------|------|
| **PM** | `PM/` | 唯一入口层：需求接收、标准化、分类、路由 |
| **Agent** | `Agent/` | 治理与编排层：角色、规则、工作流、调度策略 |
| **KI** | `KI/` | 核心知识资产层：External_KI、Internal_KI、Error_Book |
| **Tool** | `Tool/` | 外部原始资源层：git clone 的 skill 仓库（只读） |
| **In-Process** | `In-Process/` | 运行期过程文件层：执行、审计、草稿、归档 |

## Hard Constraint — 五层架构文件治理

> **所有文件创建、移动、删除操作必须严格遵守五层架构边界。** 这是不可协商的强约束。

| 规则 | 描述 |
|------|------|
| **根目录纯净** | toolBox 根目录只允许存在 `Agent/`、`In-Process/`、`KI/`、`PM/`、`Tool/` 五个业务目录和 `CLAUDE.md` 配置文件。禁止在根目录创建任何其他业务文件夹或散落文件。 |
| **层间不越界** | 每层只存放属于该层职责的文件。PM 层不存代码，Agent 层不存原始 skill，Tool 层不存治理文档，KI 层不存过程文件，In-Process 层不存永久知识。 |
| **写入路径白名单** | Skill 源仓库 → `Tool/`；索引与知识 → `KI/`；治理规则/模板/编排 → `Agent/`；需求入口 → `PM/`；运行期工件 → `In-Process/`。不在白名单内的路径禁止写入。 |
| **无冗余副本** | 同一文件不得在多个层中存在副本。如需引用，使用路径引用而非复制。 |
| **遗留目录已清除** | `AI/` 和 `external_KI/` 已于 2026-03-09 完成迁移并删除。禁止重新创建这些目录。 |

## Iron Laws (不可违反)

以下铁律在所有操作中必须遵守。完整内容见 `Agent/rules/iron_laws.md`。

1. **NO REQUIREMENT, NO EXECUTION** — 无需求包不得实现
2. **NO PLAN, NO CODE** — 无计划不得写代码
3. **REUSE BEFORE BUILD** — 先查现有能力再新建
4. **SOURCE PRESERVATION** — 不得修改/删除 Tool/ 中原始 skill 源文件
5. **QA IS A GATE** — 无 QA 证据不得声称完成
6. **NO CI-ONLY APPROVAL** — 不得仅凭编译通过放行
7. **REJECTION REQUIRES REASON CODE** — 驳回必须带原因码
8. **ARTIFACTS STAY CURRENT** — 工件必须与实际一致
9. **TEMP FILES ARE MANAGED** — 临时文件纳入 `In-Process/scratch/` 管理
10. **PLAN-DRIVEN MODE FOR LARGE CHANGES** — 大变更必须先有 plan 工件
11. **SKILL FILE GOVERNANCE** — Skill 增删必须同步更新索引、注册、去重审查，详见 `Agent/rules/iron_laws.md` §11

## Workflow Entry Point

- `/pm` — 所有正式开发请求的唯一入口。触发 PM → CTO → Execution → QA → Joint Approval 闭环。

## Layer Details

### PM Layer
- Role: `PM/pm_role.md`
- Workflow: `PM/pm_workflow.md`
- Task Schema: `PM/schemas/task_brief.schema.json`（统一母规范）
- Routing: `PM/index/task_type_routing.json`
- Template: `PM/templates/requirement_package.tmpl.md`

### Agent Layer
- Rules: `Agent/rules/` — constitution, iron_laws, plan_driven_mode, qa_standard, artifact_lifecycle, audit_ledger_mode, project_rules
- Roles: `Agent/roles/` — CTO, QA, Skill Governance
- Workflows: `Agent/workflow/` — cto_planning, execution (v2 支持串行/并发/蜂群), qa_verification, joint_approval, ki_maintenance
- Orchestrator: `Agent/orchestrator/strategy.md` — 串行/并发/蜂群选择指南
- Schemas: `Agent/schemas/` — task_dag, change_manifest, handoff, rework_order
- Templates: `Agent/templates/` — execution_plan, qa_report, delivery_cert, plan, audit_ledger, audit_report, req_impl_matrix
- Index: `Agent/index/` — skill_registry, duplicate_review

### KI Layer
- External_KI: `KI/External_KI/` — 88 skill 主索引 + 12 类别索引 + 质量审计 + 交叉引用
- Internal_KI: `KI/Internal_KI/` — 项目决策、经验教训、方式复用模式
- Error_Book: `KI/Error_Book/` — 错题本（20 个错误码 + 条目）
- Templates: `KI/Templates/` — ki_entry, error_book_entry 模板

### Tool Layer
- 15 个 git clone 仓库（只读）
- 88 个去重 skill，12 个功能类别
- 查询入口: `KI/External_KI/master_index.json`
- Skill Registry: `Agent/index/skill_registry.json`
- Duplicate Review: `Agent/index/duplicate_review.json`

### In-Process Layer
- Active Runs: `In-Process/active/{run_id}/`
- Audit Records: `In-Process/audit/` (永不删除)
- Scratch: `In-Process/scratch/` (session 结束清理)
- Archive: `In-Process/archive/` (90 天保留)
- Archive Index: `In-Process/index/archive_manifest.json`

## Key Governance Docs

- Constitution: `Agent/rules/constitution.md`
- Iron Laws: `Agent/rules/iron_laws.md`
- Plan-Driven Mode: `Agent/rules/plan_driven_mode.md`
- QA Standard: `Agent/rules/qa_standard.md`
- Artifact Lifecycle: `Agent/rules/artifact_lifecycle.md`
- Audit Ledger Mode: `Agent/rules/audit_ledger_mode.md`
- Project Rules: `Agent/rules/project_rules.md`
- Orchestration Strategy: `Agent/orchestrator/strategy.md`

## Execution Modes

CTO 在规划阶段必须选择执行模式（详见 `Agent/orchestrator/strategy.md`）：
- **串行 (Serial)**: 强依赖、高耦合、核心流程改造
- **并发 (Parallel)**: 独立、低重叠、可并行测试
- **蜂群 (Swarm)**: 探索性、多方案对比、大规模知识提炼

## Migration Record

遗留目录 `AI/` 和 `external_KI/` 已于 **2026-03-09** 完成审计、迁移并删除。所有内容已合并至五层架构对应位置，无数据丢失。
