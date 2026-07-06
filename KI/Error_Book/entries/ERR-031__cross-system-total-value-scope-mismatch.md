---
id: ERR-031
type: error
errorCode: "BHV-001"
severity: "medium"
status: "resolved"
recurrence: 0
firstSeen: "2026-06-10"
tags:
  - "error/medium"
  - "tool/MCP"
  - "domain/finance"
  - "errorCode/BHV-001"
  - "ki/error-book"
prevention: "跨系统总值/NLV 交叉校验必须先做资产类别口径对齐：逐类别映射、只求和双方共同覆盖的类别；契约中的校验字段必须写明构成公式，禁止直接引用对方单一『总值』字段"
aliases:
  - "ERR-031"
mem_ref: "eb378c1d-dc4b-49d3-8b17-6a51ebb6f0f4"
mem_status: "linked"
---

# 跨系统总值交叉校验未对齐资产类别口径

## 错误现象

stockAgent 接入 Robinhood MCP（REQ-20260610-015327）时，数据契约最初规定 NLV 交叉校验直接对比 `get_portfolio.total_value`。真实数据 E2E 时发现：本地模型计算 NLV ≈ $311,060，而 total_value = $314,517，偏差 1.13% —— 恰好假性击穿 1% 容差阈值，会导致**正确的导入被 sanity check 拒绝**。

## 根因分析

`total_value` 是 Robinhood 视角的全账户总值，包含 **crypto（$3,452）、futures、event contracts、mutual funds** 等资产类别；而 stockAgent 的 NLV 模型只覆盖 cash + 股票市值 + 期权市值 − margin debt。两边求和的资产类别集合不同，直接对比是口径错配，不是数据错误。

## 解决方案

契约修正：`reported_total_value` 改为**同口径求和** —— `get_portfolio` 的 `cash + equity_value + options_value`（只取双方共同覆盖的类别）。修正后实测偏差 0.0016%，22/22 持仓精确一致。

## 预防规则

任何场景下做**跨系统金额/总值/余额对账**（券商 API vs 本地模型、支付平台 vs 自有账本、多数据源 NLV 核对）时：
1. 先列双方的资产/科目类别清单，做映射表
2. 校验公式只求和**交集类别**，并在契约/文档中写明构成公式
3. 禁止直接引用对方的单一聚合字段（"total"、"balance"、"net value"）做阈值校验
4. 容差阈值告警信息必须同时打印双方数值与构成，便于一眼识别口径问题

## 关联

- [[PAT-012__mcp-out-of-process-json-pipeline|PAT-012]] — 本错误发生于该模式的契约设计阶段，模式的反模式表收录了本条
- [[2026-06-10_REQ-20260610-015327_robinhood-mcp-data-layer|EXEC 2026-06-10]] — 产出本条的执行日志
