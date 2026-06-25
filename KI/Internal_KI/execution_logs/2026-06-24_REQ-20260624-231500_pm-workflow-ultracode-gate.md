---
id: "EXEC-2026-06-24-pm-workflow-ultracode-gate"
type: execution_log
req_ref: "REQ-20260624-231500"
status: "pass"
created: "2026-06-24"
tags:
  - execution_log
  - req-tracking
  - ki/internal
  - tool/workflow
  - topic/orchestration
related:
  - "Internal_KI/decisions/DEC-007__pm-dynamic-workflow-ultracode-gate.md"
  - "Internal_KI/patterns/PAT-015__dynamic-workflow-model-tiering-and-when-to-use.md"
  - "Error_Book/entries/ERR-036__state-json-duplicate-currentstate-key-on-transition.md"
aliases:
  - "EXEC-2026-06-24-pm-workflow-ultracode-gate"
mem_ref: "285f6011-72c7-4586-9a61-113e5cec5579"
mem_status: "linked"
---

# PM 工作流加入 Dynamic Workflow / Ultracode 判定门（Step 4.6）

## User Intent (Original)
"把 dynamic workflow 的 check 加入 pm 工作流；走 pm 流程时 check 要不要调用 ultracode；读官方文档总结何时用/不用；加进 pm 工作流。注：加一个 check/gate，符合就开 ultracode，但要权衡必要性；开 workflow 时权衡哪些活用便宜模型（haiku 铺广度）、哪些用最强（opus 4.8 收敛）；按我的 token limit 给建议。"

## PM Clarified Intent
在 PM 受理环节加一道**咨询性、不自动触发**的 gate：① Qualify（够不够格用 workflow）② Necessity（值不值得，挡 token 浪费）③ 若值得则产出模型分层 + 预算计划。PM 只推荐，用户自行 opt-in（`ultracode` 关键词或 `/effort ultracode`）。

## Hidden Assumptions Surfaced
- A1: gate 咨询性，不能自动 launch（Workflow 必须用户 opt-in）— 文档推断
- A3: 用户 token tier 未知 → 经 AskUserQuestion 确认 **Max 5x（中等）**，gate 设计 budget-parametric
- A5: W4"大型新项目分析"与 codebase-memory Step 2.5 协同 — 本 session 上下文

## CTO Plan Summary
- 任务数：3（pm_workflow Step 4.6 + cto_planning 交叉引用 + DEC-007）
- 执行模式：Serial（文档强一致 + 单一权威源）
- 关键依赖：Step 4.6 = workflow 判定唯一权威定义；cto/DEC 路径引用不复制

## Execution Outcome
- 结果：PASS
- AC 命中率：7/7
- 交付：pm_workflow Step 4.6（W1-W5 qualify + N1-N4 veto + 模型分层 playbook + Max5x 预算）；Gate① checklist 项；cto_planning Step3 交叉引用；DEC-007
- 本任务自评 `workflowGate.recommended=false`（治理文档编辑无宽度）— gate 自身走通一遍

## Lessons Extracted
1. **集成外部能力先读官方文档定 trigger**：dynamic workflow 何时用/不用全部落到 https://code.claude.com/docs/en/workflows 的"when to use"+ cost 段，不自行推断 — 与 [[PAT-014__external-mcp-server-find-ingestion-as-plugin|PAT-014]]"trigger 源于文档"一致
2. **workflow 模型分层省钱**：haiku 铺广度 / sonnet 中段 / opus 4.8 收敛，用 `agent({model,effort})` 路由 — 见 [[PAT-015__dynamic-workflow-model-tiering-and-when-to-use|PAT-015]]
3. **necessity 否决防 token 暴增**：workflow 可 spawn 几十~几百 agent，必须有否决项 + 小切片探成本 — 挂 [[ERR-032__bulk-data-through-llm-context-token-bomb|ERR-032]]
4. **state.json 状态转移别追加重复键**（本 session 犯两次）— 见 [[ERR-036__state-json-duplicate-currentstate-key-on-transition|ERR-036]]

## Cross-References
- [[DEC-007__pm-dynamic-workflow-ultracode-gate|DEC-007]] — 决策记录（含 Max5x 校准）
- [[PAT-015__dynamic-workflow-model-tiering-and-when-to-use|PAT-015]] — 沉淀的模型分层方法论
- [[ERR-036__state-json-duplicate-currentstate-key-on-transition|ERR-036]] — 本 session 触发的预防规则
- [[DEC-006__codebase-memory-conditional-code-structure-memory|DEC-006]] — W4 与 codebase-memory Step 2.5 协同
