---
id: PAT-015
type: pattern
title: "Dynamic workflow：何时用 + 模型分层路由（haiku 广度 / opus 收敛）"
status: active
created: "2026-06-24"
tags:
  - "pattern/orchestration"
  - "tool/workflow"
  - ki/pattern
complements:
  - "[[DEC-007__pm-dynamic-workflow-ultracode-gate|DEC-007]]"
trigger_condition: "user_explicit"
related:
  - "Internal_KI/decisions/DEC-007__pm-dynamic-workflow-ultracode-gate.md"
  - "Error_Book/entries/ERR-032__bulk-data-through-llm-context-token-bomb.md"
  - "Internal_KI/patterns/PAT-014__external-mcp-server-find-ingestion-as-plugin.md"
aliases:
  - "PAT-015"
mem_ref: "285f6011-72c7-4586-9a61-113e5cec5579"
mem_status: "linked"
---

# Dynamic workflow：何时用 + 模型分层路由（haiku 广度 / opus 收敛）

## 适用场景
要决定一个任务该不该上 Claude **dynamic workflow**（ultracode 编排几十~几百 subagent），以及开了之后如何分层路由模型省成本。适用于任何 Workflow 工具用法（不限 PM gate）；PM 受理侧的具体落点见 `PM/pm_workflow.md` Step 4.6（权威定义）。

## 步骤

### 1. 先判该不该用（官方 when-to-use）
- Qualify 场景枚举（W1–W5）与 Necessity 否决清单见 `PM/pm_workflow.md` Step 4.6（唯一权威）。
- 判定本质：**该用** = "agent 数超出单会话可协调"或要"可复跑脚本 + 对抗式互检"；**不该用** = 例行/局部/对话类、已被 Serial·Parallel 低成本覆盖 → 先 conversation 或先跑小切片。workflow ≈ 机械化 Swarm，不是所有 Swarm 都值得上。

### 2. 开启方式（按场景三选一）
- 单个合格任务一次性 → prompt 写 `ultracode` 关键词（不改 session effort，最省）
- 一连串重活整段 session → `/effort ultracode`（xhigh + 自动编排；完事 `/effort high` 退回）
- 现成 → bundled `/deep-research` 或已 save 的 `/workflow-name`

### 3. 模型分层路由（`agent({model, effort})` 逐阶段）
| 阶段性质 | 模型 | effort | 工作 |
|---------|------|--------|------|
| 广度/扫描/机械提取 | **haiku** | low | 扫 N 文件找模式、每维度首遍 finding、批量转换 |
| 中段分析 | **sonnet** | medium | 单模块理解、归类、结构化抽取 |
| 收敛/裁决/对抗验证/终稿 | **opus 4.8** | high–max | 综合各路 finding、逐条 verify、择优、终稿 |

> 关键：脚本默认每个 agent 继承 session 模型；**只在确有把握时**用 `model`/`effort` 覆盖。广度铺面的 finder 用 haiku 省钱，收敛/verify 的 judge 用 opus 保质。

### 4. 预算缩放（budget-parametric）
- `+Nk` 预算指令 + 脚本内 `budget.total`/`budget.remaining()` 动态收敛（`while (budget.remaining() > 50_000)`）
- 重任务**先跑一个目录/窄问题的小切片**探成本再全量
- 并发上限 16 / 单 run 上限 1000 agent（成本天花板）
- 档位校准数字（fan-out / 预算指令建议值）见 `PM/pm_workflow.md` Step 4.6（唯一权威）

## 反模式
| 错误做法 | 正确做法 | 关联 |
|---------|---------|------|
| 例行/单文件活也上 workflow | necessity 否决，走 conversation/Serial | [[ERR-032__bulk-data-through-llm-context-token-bomb\|ERR-032]] |
| 全程 opus（贵）或全程 haiku（收敛差） | 广度 haiku / 收敛 opus 分层 | 本模式步骤 3 |
| 不探成本直接全仓 run | 先跑小切片 gauge，再决定全量 | 官方 cost 段 |
| 让 Agent 自动 launch workflow | 必须用户 opt-in（关键词 / `/effort ultracode`） | [[DEC-007__pm-dynamic-workflow-ultracode-gate\|DEC-007]] |

## 关联
- [[DEC-007__pm-dynamic-workflow-ultracode-gate|DEC-007]] — PM Step 4.6 gate 的决策（本模式的 PM 侧落点）
- [[ERR-032__bulk-data-through-llm-context-token-bomb|ERR-032]] — token 暴增教训，necessity 否决的论据
- [[PAT-014__external-mcp-server-find-ingestion-as-plugin|PAT-014]] — "trigger 源于官方文档 + 交叉验证"的同源方法
