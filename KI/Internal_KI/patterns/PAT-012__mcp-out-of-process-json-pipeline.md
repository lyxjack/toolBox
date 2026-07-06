---
id: PAT-012
type: pattern
title: "MCP 进程外取数 + JSON 契约注入本地管道"
status: active
created: "2026-06-10"
tags:
  - "pattern/integration"
  - "tool/MCP"
  - "lang/python"
  - "ki/pattern"
complements:
  - "[[ERR-031__cross-system-total-value-scope-mismatch|ERR-031]]"
  - "[[ERR-032__bulk-data-through-llm-context-token-bomb|ERR-032]]"
trigger_condition: "user_explicit"
related:
  - "Error_Book/entries/ERR-031__cross-system-total-value-scope-mismatch.md"
  - "Error_Book/entries/ERR-032__bulk-data-through-llm-context-token-bomb.md"
aliases:
  - "PAT-012"
mem_ref: "eb378c1d-dc4b-49d3-8b17-6a51ebb6f0f4"
mem_status: "linked"
---

# MCP 进程外取数 + JSON 契约注入本地管道

## 适用场景

本地应用（Python CLI / daemon / 任何非 Claude 进程）需要消费 **MCP server 的数据**，但 MCP 认证（OAuth/浏览器登录）只存在于 Claude Code 会话中。典型：券商数据（robinhood-trading）、SaaS API 的 MCP 封装。首例：stockAgent 接入 Robinhood 持仓/行情（REQ-20260610-015327，QA 一次通过，249 tests）。

> ⚠️ **适用边界（ERR-032 教训）**：本模式仅适用于**小 payload**（≲50 条记录，如持仓、watchlist 报价、指数）。取数侧（Claude/MCP）的 token 消耗与数据体积成正比，**subagent 不豁免计费**。批量数据（全期权链、历史 K 线、大列表）必须走代码路径数据源（如 yfinance provider），LLM 只做编排与 ≤5 条的最终复核 — 见 [[ERR-032__bulk-data-through-llm-context-token-bomb|ERR-032]]。

## 步骤

1. **契约先行**：写独立数据契约文档（payload JSON schema + MCP 工具→字段映射表 + Claude 取数 runbook），契约带 `schema_version`，两端共同遵守。多跳取数（如期权持仓需二跳 instruments 查 strike/type）必须在 runbook 中写成显式步骤
2. **Claude 侧**：会话内按 runbook 调 MCP 工具 → 组装 payload JSON → 临时文件落 scratch 目录
3. **Python 侧导入命令**：CLI 接收 JSON（如 `agent import-portfolio <file.json>`）→ 解析 → **必填字段校验 + sanity check + 同口径交叉校验**（见 [[ERR-031__cross-system-total-value-scope-mismatch|ERR-031]]）→ 写入与既有数据源同一存储（同表同 schema，仅 `source` 字段区分）→ audit log
4. **时效性数据走缓存 provider**：行情类 payload 写固定缓存路径，provider 实现现有 protocol 并带 **staleness 检查**（超龄抛异常 → provider manager 自动 fallback 到次级数据源如 yfinance）
5. **字段互补路由**：MCP 缺失的字段（52w 区间、财报日）由 fallback provider 按方法级/字段级 best-effort 补全，不做重型 merge 框架
6. **批量数据分流（ERR-032 修订）**：缓存 payload 中**故意省略**批量字段（如 option_chains）→ provider 对该数据抛异常 → fallback 数据源（yfinance）在 Python 内零 token 抓取——这是设计行为，不是降级

## 反模式

| 错误做法 | 正确做法 | 关联错误 |
|---------|---------|---------|
| Python 内嵌 MCP 客户端直连 server（独立 OAuth） | Claude 会话做 MCP 运行时，JSON 进管道，零额外认证 | — |
| 用 MCP/LLM（含 subagent）批量抓取期权链等大数据 | 批量数据走代码路径（yfinance provider），LLM 只编排 + 少量复核 | [[ERR-032__bulk-data-through-llm-context-token-bomb|ERR-032]] |
| 直接用对方聚合字段（total_value）做交叉校验 | 同口径求和（只取双方共同覆盖的资产类别） | [[ERR-031__cross-system-total-value-scope-mismatch|ERR-031]] |
| 截图 + VLM 提取结构化数据 | MCP 结构化读取（精度从"约对"到 0.0016% 偏差、碎股精确） | — |
| 金额/股数用 float 或 int | 全程 Decimal 字符串（碎股 2.089500 不截断） | — |
| 缓存无保鲜检查，报告用陈旧行情 | as_of + max_age，超龄自动 fallback | — |

## 关联错误

- [[ERR-031__cross-system-total-value-scope-mismatch|ERR-031]] — 契约设计阶段踩中的口径错配，步骤 3 的交叉校验规则由它沉淀而来
- [[ERR-032__bulk-data-through-llm-context-token-bomb|ERR-032]] — 把本模式误用于批量期权链导致 token 爆炸（600k-800k），由此补上「小 payload only」适用边界与步骤 6
