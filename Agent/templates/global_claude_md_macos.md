# Global — toolBox Enterprise AI Agent Workspace

> **toolBox 根目录**: `/Users/jackliu/toolBox/`
> 本文件为全局规则，在任何工作目录下的 Claude Code 会话中均生效。
> 所有路径均为绝对路径。

## Five-Layer Architecture

本系统采用五层架构，每层职责单一、边界清晰。

| 层 | 绝对路径 | 职责 |
|----|----------|------|
| **PM** | `/Users/jackliu/toolBox/PM/` | 唯一入口层：需求接收、标准化、分类、路由 |
| **Agent** | `/Users/jackliu/toolBox/Agent/` | 治理与编排层：角色、规则、工作流、调度策略 |
| **KI** | `/Users/jackliu/toolBox/KI/` | 核心知识资产层：External_KI、Internal_KI、Error_Book |
| **Tool** | `/Users/jackliu/toolBox/Tool/` | 外部原始资源层：git clone 的 skill 仓库（只读） |
| **In-Process** | `/Users/jackliu/toolBox/In-Process/` | 运行期过程文件层：仅存接口契约（`contract.md`），实际数据在各项目的 `.in-process/` 中 |

## Hard Constraint — 五层架构文件治理

> **所有对 `/Users/jackliu/toolBox/` 的文件创建、移动、删除操作必须严格遵守五层架构边界。** 这是不可协商的强约束。

| 规则 | 描述 |
|------|------|
| **根目录纯净** | `/Users/jackliu/toolBox/` 根目录只允许存在 `Agent/`、`In-Process/`、`KI/`、`PM/`、`Tool/` 五个业务目录和 `CLAUDE.md` 配置文件。禁止创建任何其他业务文件夹或散落文件。 |
| **层间不越界** | 每层只存放属于该层职责的文件。PM 层不存代码，Agent 层不存原始 skill，Tool 层不存治理文档，KI 层不存过程文件，In-Process 层不存永久知识。 |
| **写入路径白名单** | Skill 源仓库 → `Tool/`；索引与知识 → `KI/`；治理规则/模板/编排 → `Agent/`；需求入口 → `PM/`；接口契约 → `In-Process/contract.md`；运行期工件 → 各项目的 `.in-process/`。不在白名单内的路径禁止写入。 |
| **无冗余副本** | 同一文件不得在多个层中存在副本。如需引用，使用路径引用而非复制。 |
| **遗留目录已清除** | `AI/` 和 `external_KI/` 已删除。禁止重新创建。 |

## Iron Laws (不可违反)

完整内容见 `/Users/jackliu/toolBox/Agent/rules/iron_laws.md`。

1. **NO REQUIREMENT, NO EXECUTION** — 无需求包不得实现
2. **NO PLAN, NO CODE** — 无计划不得写代码
3. **REUSE BEFORE BUILD** — 先查 `/Users/jackliu/toolBox/KI/External_KI/` 和现有代码再新建
4. **SOURCE PRESERVATION** — 不得修改/删除 `/Users/jackliu/toolBox/Tool/` 中原始 skill 源文件
5. **QA IS A GATE** — 无 QA 证据不得声称完成
6. **NO CI-ONLY APPROVAL** — 不得仅凭编译通过放行
7. **REJECTION REQUIRES REASON CODE** — 驳回必须带原因码
8. **ARTIFACTS STAY CURRENT** — 工件必须与实际一致
9. **TEMP FILES ARE MANAGED** — 临时文件纳入项目 `.in-process/scratch/` 管理
10. **PLAN-DRIVEN MODE FOR LARGE CHANGES** — 大变更必须先有 plan 工件
11. **SKILL FILE GOVERNANCE** — Skill 增删必须同步更新索引、注册、去重审查

## Workflow Entry Point

- `/pm` — 所有正式开发请求的唯一入口。触发 PM → CTO → Execution → QA → Joint Approval 闭环。

## Key Governance Docs

- Constitution: `/Users/jackliu/toolBox/Agent/rules/constitution.md`
- Iron Laws: `/Users/jackliu/toolBox/Agent/rules/iron_laws.md`
- Plan-Driven Mode: `/Users/jackliu/toolBox/Agent/rules/plan_driven_mode.md`
- QA Standard: `/Users/jackliu/toolBox/Agent/rules/qa_standard.md`
- Artifact Lifecycle: `/Users/jackliu/toolBox/Agent/rules/artifact_lifecycle.md`
- Project Rules: `/Users/jackliu/toolBox/Agent/rules/project_rules.md`
- Orchestration Strategy: `/Users/jackliu/toolBox/Agent/orchestrator/strategy.md`
- Skill Registry: `/Users/jackliu/toolBox/Agent/index/skill_registry.json`
- Master Index: `/Users/jackliu/toolBox/KI/External_KI/master_index.json`
- File Governance: `/Users/jackliu/toolBox/Agent/rules/file_governance.md`
- Internal_KI Contract: `/Users/jackliu/toolBox/KI/Internal_KI/contract.md`
- In-Process Contract: `/Users/jackliu/toolBox/In-Process/contract.md`
- Error_Book Contract: `/Users/jackliu/toolBox/KI/Error_Book/contract.md`
- Project-Level Setup Guide: `/Users/jackliu/toolBox/Agent/guides/project-level-skills-setup.md`

## Execution Modes

CTO 在规划阶段必须选择执行模式（详见 `/Users/jackliu/toolBox/Agent/orchestrator/strategy.md`）：
- **串行 (Serial)**: 强依赖、高耦合、核心流程改造
- **并发 (Parallel)**: 独立、低重叠、可并行测试
- **蜂群 (Swarm)**: 探索性、多方案对比、大规模知识提炼
