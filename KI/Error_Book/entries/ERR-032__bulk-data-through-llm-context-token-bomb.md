---
id: ERR-032
type: error
errorCode: "BHV-001"
severity: "high"
status: "resolved"
recurrence: 0
firstSeen: "2026-06-10"
tags:
  - "error/high"
  - "tool/MCP"
  - "domain/token-economy"
  - "errorCode/BHV-001"
  - "ki/error-book"
prevention: "批量数据（期权链/历史行情/大列表，>20 条记录）严禁流经 LLM 上下文（含 subagent）——必须走代码路径（Python provider/脚本）；MCP/LLM 只承载小数据与最终少量复核；任何取数方案设计前必须先估算『单条记录体积 × 记录数 × 经过 LLM 的次数』"
aliases:
  - "ERR-032"
mem_ref: "eb378c1d-dc4b-49d3-8b17-6a51ebb6f0f4"
mem_status: "linked"
---

# 批量数据流经 LLM 上下文造成 token 爆炸

## 错误现象

stockAgent 每日晨报（REQ-20260610-025105）的「扫描级期权链取数」用 MCP 工具批量抓 4 只股票 × 9 个到期日 × 行权价窗口内全部合约（数百张）。每张合约的 MCP 返回约 800 字节 JSON。派了 subagent "吸收"中间数据，但 **subagent 的 token 同样计费**：单个 agent 消耗 180k-207k token；两个 agent 还因超时/502 白烧；数据过期后又重抓一轮。**合计烧掉约 600k-800k token**，且大部分数据最终被规则引擎过滤丢弃。

## 根因分析

1. **架构盲点**：[[PAT-012__mcp-out-of-process-json-pipeline|PAT-012]] 的卖点是「Python 端零 token」，但**取数侧（Claude/MCP）的 token 消耗与数据体积成正比**。该模式只适合小 payload（持仓 22 行、报价 6 条），批量数据会在取数侧爆炸。
2. **工具错配**：Robinhood MCP 为「查几张合约然后下单」设计，响应冗长（20+ 字段/合约），天然不适合批量导出。而项目里 **yfinance provider 在 Python 内抓全量期权链，零 token，且已经实现并可用**——正确路径本来就存在。
3. **放大因素**：subagent 不豁免计费；失败重试与数据过期重抓使消耗翻倍；设计时未做「体积 × 次数」估算。

## 解决方案（混合架构）

| 数据 | 通道 | 每日 token |
|------|------|-----------|
| 期权链批量扫描 | yfinance（Python 内部，provider fallback 自动触发） | 0 |
| 持仓 / watchlist 报价 / VIX | MCP（~6 次小调用） | 极小 |
| 最终 ≤3 个候选的实时 bid/ask 复核 | MCP（≤5 合约） | 极小 |
| 新闻/财报 | WebSearch（单 agent） | 中等且必要 |

## 预防规则

任何「Agent 经 MCP/API 工具取数」的方案设计时：
1. 先算账：单条记录体积 × 记录数 × 经过 LLM 的次数（含 subagent、含重试）
2. **>20 条记录的批量取数一律走代码路径**（Python provider / 脚本直连 API），LLM 只做编排
3. subagent 不是免费缓冲区——它的上下文同样烧 token
4. 数据会过期的场景，重抓成本要乘进预算

## 关联

- [[PAT-012__mcp-out-of-process-json-pipeline|PAT-012]] — 本错题为该模式补上适用边界（小 payload only）
- [[ERR-031__cross-system-total-value-scope-mismatch|ERR-031]] — 同一项目同日的契约设计教训
- [[2026-06-10_REQ-20260610-015327_robinhood-mcp-data-layer|EXEC 2026-06-10]] — 模式来源执行日志
