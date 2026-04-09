# toolBox — Enterprise AI Agent Workspace

## Path Variable

> **`{TOOLBOX}`** = 当前文件所在目录的绝对路径(即 toolBox 根目录)。
> 所有 workflow、template、schema 文件中的 `{TOOLBOX}` 占位符,在运行时解析为此路径。
> - macOS 示例: `/Users/<username>/toolBox`
> - Windows 示例: `C:\Users\<username>\toolBox`
> - Linux 示例: `/home/<username>/toolBox`
>
> **解析规则**: Agent 读取 workflow 文件时,将 `{TOOLBOX}` 替换为当前 toolBox 的实际绝对路径。

## Five-Layer Architecture

本系统采用五层架构,每层职责单一、边界清晰。

| 层 | 位置 | 职责 |
|----|------|------|
| **PM** | `PM/` | 唯一入口层:需求接收、标准化、分类、路由 |
| **Agent** | `Agent/` | 治理与编排层:角色、规则、工作流、调度策略 |
| **KI** | `KI/` | 核心知识资产层:External_KI、Internal_KI、Error_Book |
| **Tool** | `Tool/` | 外部原始资源层:git clone 的 skill 仓库(只读) |
| **In-Process** | `In-Process/` | 运行期过程文件层:仅存接口契约(`contract.md`),实际数据在各项目的 `.in-process/` 中 |

## Hard Constraint — 五层架构文件治理

> **所有文件创建、移动、删除操作必须严格遵守五层架构边界。** 这是不可协商的强约束。

| 规则 | 描述 |
|------|------|
| **根目录纯净** | toolBox 根目录只允许存在 `Agent/`、`In-Process/`、`KI/`、`PM/`、`Tool/` 五个业务目录,以及以下配置/文档/基础设施文件: `CLAUDE.md`、`README.md`、`LICENSE`、`package.json`、`.gitignore`、`VERSION`、`CHANGELOG.md`、`bootstrap.sh`。禁止在根目录创建任何其他业务文件夹或散落文件。 |
| **层间不越界** | 每层只存放属于该层职责的文件。PM 层不存代码,Agent 层不存原始 skill,Tool 层不存治理文档,KI 层不存过程文件,In-Process 层不存永久知识。 |
| **写入路径白名单** | Skill 源仓库 → `Tool/`;索引与知识 → `KI/`;治理规则/模板/编排 → `Agent/`;需求入口 → `PM/`;接口契约 → `In-Process/contract.md`;运行期工件 → 各项目的 `.in-process/`。不在白名单内的路径禁止写入。 |
| **无冗余副本** | 同一文件不得在多个层中存在副本。如需引用,使用路径引用而非复制。 |
| **遗留目录禁止创建** | `AI/` 和 `external_KI/` 为已废弃的遗留目录名。禁止创建。 |

## Iron Laws — 总门禁 (Global Gate)

> 以下铁律始终生效,无条件遵守。完整内容见 `Agent/rules/iron_laws.md`。
> 子门禁铁律(IL 01-07, 11)由各工作流的「前置约束」章节按需加载。

8. **ARTIFACTS STAY CURRENT** — 工件必须与实际一致
9. **TEMP FILES ARE MANAGED** — 临时文件纳入项目 `.in-process/scratch/` 管理
10. **PLAN-DRIVEN MODE FOR LARGE CHANGES** — 大变更必须先有 plan 工件

> **子门禁索引** (进入对应 workflow 时自动加载):
> - PM 子门禁 (IL 01): `PM/pm_workflow.md`
> - CTO 子门禁 (IL 02, 03): `Agent/workflow/cto_planning.md`
> - QA 子门禁 (IL 05, 06, 07): `Agent/workflow/qa_verification.md`
> - Skill/KI 子门禁 (IL 04, 11): `Agent/workflow/skill_ingestion.md`

## Workflow Entry Points

- `/pm` — 所有正式开发请求的唯一入口。触发 PM → CTO → Execution → QA → Joint Approval 闭环。
- `/init` — toolBox bootstrap & update 统一入口。新用户全量初始化,老用户增量迁移。终端等价命令: `bash bootstrap.sh`。

## Layer Details

### PM Layer
- Role: `PM/pm_role.md`
- Workflow: `PM/pm_workflow.md`
- Task Schema: `PM/schemas/task_brief.schema.json`(统一母规范)
- Routing: `PM/index/task_type_routing.json`
- Template: `PM/templates/requirement_package.tmpl.md`

### Agent Layer
- Rules: `Agent/rules/` — constitution, iron_laws, plan_driven_mode, qa_standard, artifact_lifecycle, audit_ledger_mode, project_rules
- Roles: `Agent/roles/` — CTO, QA, Skill Governance
- Workflows: `Agent/workflow/` — cto_planning, execution (v2 支持串行/并发/蜂群), qa_verification, joint_approval, ki_maintenance, skill_ingestion
- Orchestrator: `Agent/orchestrator/strategy.md` — 串行/并发/蜂群选择指南
- Schemas: `Agent/schemas/` — task_dag, change_manifest, handoff, rework_order
- Templates: `Agent/templates/` — execution_plan, qa_report, delivery_cert, plan, audit_ledger, audit_report, req_impl_matrix
- Index: `Agent/index/` — skill_registry, duplicate_review

### KI Layer
- External_KI: `KI/External_KI/` — 88 skill 主索引 + 12 类别索引 + 质量审计 + 交叉引用
- Internal_KI: `KI/Internal_KI/` — 项目级知识库接口契约(实际数据在各项目中),含 Pattern Book(`patterns/`)、`decisions/`、`lessons/`
- Error_Book: `KI/Error_Book/` — 全局级错题本(跨项目共享,含 entries/)
- Templates: `KI/Templates/` — ki_entry, error_book_entry 模板
- **知识召回**: KI 层整体作为 Obsidian Vault,通过 Obsidian MCP（Local REST API 插件）进行召回,替代原 index.json 查询机制。index.json 已冻结,仅作历史快照保留。

### Tool Layer
- 15 个 git clone 仓库(只读)
- 88 个去重 skill,12 个功能类别
- 查询入口: `KI/External_KI/master_index.json`
- Skill Registry: `Agent/index/skill_registry.json`
- Duplicate Review: `Agent/index/duplicate_review.json`

### In-Process Layer(项目级)
- **接口契约**: `In-Process/contract.md`(全局定义,不存项目数据)
- **项目实例**: `{project}/.in-process/`(各项目独立管理)
  - Active Runs: `.in-process/active/{run_id}/`
  - Audit Records: `.in-process/audit/` (永不删除)
  - Scratch: `.in-process/scratch/` (session 结束清理)
  - Archive: `.in-process/archive/` (90 天保留)
  - Archive Index: `.in-process/index/archive_manifest.json`

## Key Governance Docs

- Constitution: `Agent/rules/constitution.md`
- Iron Laws: `Agent/rules/iron_laws.md`
- Plan-Driven Mode: `Agent/rules/plan_driven_mode.md`
- QA Standard: `Agent/rules/qa_standard.md`
- Artifact Lifecycle: `Agent/rules/artifact_lifecycle.md`
- Audit Ledger Mode: `Agent/rules/audit_ledger_mode.md`
- Project Rules: `Agent/rules/project_rules.md`
- Orchestration Strategy: `Agent/orchestrator/strategy.md`
- File Governance: `Agent/rules/file_governance.md`
- Internal_KI Contract: `KI/Internal_KI/contract.md`
- In-Process Contract: `In-Process/contract.md`
- Error_Book Contract: `KI/Error_Book/contract.md`
- Project-Level Setup Guide: `Agent/guides/project-level-skills-setup.md`

## Execution Modes

CTO 在规划阶段必须选择执行模式(详见 `Agent/orchestrator/strategy.md`):
- **串行 (Serial)**: 强依赖、高耦合、核心流程改造
- **并发 (Parallel)**: 独立、低重叠、可并行测试
- **蜂群 (Swarm)**: 探索性、多方案对比、大规模知识提炼

**强制规则**: 当 task 数 >= 3 且任务间无数据依赖时,**禁止选择串行模式**,必须使用并发或蜂群。详见 `Agent/workflow/cto_planning.md` Step 3。

