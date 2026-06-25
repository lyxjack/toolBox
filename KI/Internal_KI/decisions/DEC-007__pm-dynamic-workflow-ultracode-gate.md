---
id: DEC-007
type: decision
title: "PM 工作流加入 Dynamic Workflow / Ultracode 判定门（咨询性）"
status: active
created: 2026-06-24
tags:
  - ki/decision
  - layer/PM
  - topic/orchestration
  - tool/workflow
related:
  - "Error_Book/entries/ERR-032__bulk-data-through-llm-context-token-bomb.md"
  - "Internal_KI/decisions/DEC-006__codebase-memory-conditional-code-structure-memory.md"
  - "Internal_KI/patterns/PAT-014__external-mcp-server-find-ingestion-as-plugin.md"
mem_ref: "285f6011-72c7-4586-9a61-113e5cec5579"
mem_status: "linked"
---

# PM 工作流加入 Dynamic Workflow / Ultracode 判定门（咨询性）

## Decision
在 `PM/pm_workflow.md` 新增 **Step 4.6 — Dynamic Workflow / Ultracode Gate**：每次需求受理时判定该任务要不要用 Claude 的 dynamic workflows（ultracode）。

- **咨询性、不自动触发**：PM/Claude **不** launch workflow（Workflow 工具按设计必须用户显式 opt-in）；gate 只 surface 一个"建议块"，用户用 `ultracode` 关键词或 `/effort ultracode` 自行开启。
- **两步判定**：先 Qualify（W1 跨库扫荡 / W2 大迁移重构 / W3 多源研究 / W4 大型新项目分析 / W5 多角度难规划），再 Necessity veto（单文件/例行/已被 Serial·Parallel 覆盖/预算紧收益低）。
- **若建议开 → 产出模型分层 + 预算计划**（替用户预规划）。
- 权威定义在 Step 4.6（唯一来源），DEC-007 / cto_planning Step 3 路径引用，不复制。

## Rationale
1. **官方定位**（https://code.claude.com/docs/en/workflows）：workflow 适合"agent 数超出单会话可协调"或要"可复跑脚本"的活（审计/迁移/交叉验证研究/多角度规划）；例行/局部/对话类不该用（更费 token、更慢）。这天然是一道"该不该上重武器"的判定，正好补进 PM 受理环节。
2. **与现有门禁衔接**：Step 4.5 复杂度 tier + 宽度特征直接决定 workflow-worthiness；workflow ≈ 机械化的 **Swarm** 执行模式，故 cto_planning Step 3 加一行交叉引用。
3. **token 纪律**（[[ERR-032__bulk-data-through-llm-context-token-bomb|ERR-032]]）：workflow 一次 run 可能 spawn 几十~几百 agent，必须有 necessity 否决 + "先跑小切片探成本"，否则 token 暴增收益却低。
4. **模型分层省钱**：官方支持 `agent({model, effort})` 逐阶段路由 → 广度用 **haiku**（low effort）铺面、收敛用 **opus 4.8**（high–max）裁决，中段 **sonnet**。

## Calibration（用户档位）
用户 = **Max 5x（中等预算）**：默认中 fan-out **5–10 并发**；重任务**先跑一个目录/窄问题的小切片**探成本；预算指令建议 **`+200k–400k`** + 脚本内 `budget.remaining()` 动态收敛。换档位只需调这几个数值，gate 设计本身 budget-parametric。

## Alternatives Considered
| 方案 | 否决理由 |
|------|---------|
| **让 PM/Claude 自动 launch workflow** | Workflow 必须用户 opt-in；自动 launch 违反设计且 token 风险高 |
| **不加 gate，靠临场判断** | 漏判 + 无 necessity 否决 → 要么错过 workflow 收益，要么乱开烧 token |
| **gate 放 CTO 而非 PM** | 用户明示要在 PM 受理环节 check；且越早判越能在规划前定调（CTO Step 3 仅交叉引用）|
| **常开 `/effort ultracode`** | 每个实质任务都编排，routine 活也烧 token；应按任务 scoped 开（关键词法）|

## Outcome
Active。Step 4.6 gate 已落 `pm_workflow.md`；cto_planning Step 3 交叉引用；Gate① checklist 加 `workflowGate` 必填项。

## 关联
- [[ERR-032__bulk-data-through-llm-context-token-bomb|ERR-032]] — necessity 否决的 token 纪律直接论据
- [[DEC-006__codebase-memory-conditional-code-structure-memory|DEC-006]] — W4"大型新项目分析"与 codebase-memory Step 2.5 协同
- [[PAT-014__external-mcp-server-find-ingestion-as-plugin|PAT-014]] — 同期 toolBox 编排能力扩展（外部工具集成）
