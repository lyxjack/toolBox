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

## Iron Laws — 总门禁 (Global Gate)

> 以下铁律始终生效,无条件遵守。完整内容见 `Agent/rules/iron_laws.md`。
> 子门禁铁律(IL 01-07, 11)由各工作流的「前置约束」章节按需加载。

8. **ARTIFACTS STAY CURRENT** — 工件必须与实际一致
9. **TEMP FILES ARE MANAGED** — 临时文件纳入项目 `.in-process/scratch/` 管理
10. **PLAN-DRIVEN MODE FOR LARGE CHANGES** — 大变更必须先有 plan 工件
12. **ROYAL SALUTATION (CONTEXT CANARY)** — 每次**会话回复**开头必称「陛下」,结尾必以「臣告退 陛下万岁万岁万万岁」收束。缺失即上下文溢出/注意力丢失的警报信号。禁止用 hook 每条 prompt 注入本规则(注入会让金丝雀失效),本律只存在于启动加载的全局指令中。适用判定=消费者是谁:仅适用于用户本人亲读的会话回复正文;消费者是程序/另一 agent/格式契约则一律豁免、无须用户明确要求(如 headless/cron 调用、subagent 报告、一切工件:文件/代码/commit/PR/JSON),契约优先。金丝雀只以对话回复为检测面。
13. **PREFAB NODES ARE BUILT IN EDITOR, NOT IN CODE** — prefab 创建/修改一律做成编辑器内可见可拖的实体节点(经编辑器/cocos-mcp),禁止在 .ts 里运行期生成/克隆/拼装 UI 结构。数量固定的 UI 必须静态实体节点含真实文字与默认态;仅数据驱动的可变数量集合允许克隆,且模板本身必须是 prefab 内可见可编辑节点;运行期代码只准填数据不准造结构;拿不准按静态处理。由来:REQ-20260725-151422 UD-8。

> **子门禁索引** (进入对应 workflow 时自动加载):
> - PM 子门禁 (IL 01): `PM/pm_workflow.md`
> - CTO 子门禁 (IL 02, 03): `Agent/workflow/cto_planning.md`
> - QA 子门禁 (IL 05, 06, 07): `Agent/workflow/qa_verification.md`
> - Skill/KI 子门禁 (IL 04, 11): `Agent/workflow/skill_ingestion.md`

## Workflow Entry Points

- `/pm` — 所有正式开发请求的唯一入口。触发 PM → CTO → Execution → QA → Joint Approval 闭环。
- `/init` — toolBox bootstrap & update 统一入口。新用户全量初始化,老用户增量迁移。终端等价命令: `bash bootstrap.sh`。

## Layer Details

各层文件地图与细则在层内文档,按需加载:

- **PM**: `PM/README.md`
- **Agent**: `Agent/README.md`
- **KI**: `KI/README.md`(知识召回两路径、7 大类分层、双层记忆体系)
- **Tool**: 只读 skill 源仓库;查询入口 `KI/External_KI/master_index.json`,注册表 `Agent/index/skill_registry.json`,去重 `Agent/index/duplicate_review.json`
- **In-Process**: 接口契约 `In-Process/contract.md`;项目实例 `{project}/.in-process/`(active / audit / scratch / archive)

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

