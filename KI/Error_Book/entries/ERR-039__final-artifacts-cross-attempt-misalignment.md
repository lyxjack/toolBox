---
id: ERR-039
type: error
errorCode: BHV-002
severity: medium
status: resolved
recurrence: 1
firstSeen: 2026-07-05
tags:
  - error/medium
  - topic/pipeline-artifacts
  - topic/llm-retry-loop
  - errorCode/BHV-002
  - ki/error-book
prevention: 多 attempt 生成管线的最终落盘工件（layout / validation / 渲染产物）必须锚定同一个
  attempt。任何'最后一轮失败'分支都不得让后写的工件覆盖前一轮的可用版本——保留'最后可解析/可校验'快照作为 final。
aliases:
  - ERR-039
mem_ref: 93f1823f-1c87-45ad-9d47-a7dcab69da36
mem_status: linked
---

# LLM retry 管线最终工件跨 attempt 错位

## 错误现象

catIdea E9 首验（REQ-20260705-150305）：`plan_async` 最后一轮 attempt 走 `schema_parse_failed` 分支时，`final_layout.json` 落的是 **attempt-3 的无效布局**（幻觉变体，schema 拒绝），而 `validation.json` 是 **attempt-2** 的判定——两工件不同源。下游 composite 渲染了无效布局，症状为 9 模块只画出 8 个（无效 placement 被静默跳过）。

## 根因分析

循环变量 `layout_dict`（原始 JSON）在每轮开头被覆盖，而 `layout`（通过 schema 的对象）与 `val/combined`（校验结果）只在解析/校验成功时更新——失败分支 break 后，三者分属不同 attempt，落盘时未做同源检查。

## 解决方案

已修复（REQ-20260706-132251，catIdea commit 000d94a）：schema 失败分支不覆盖"最后可解析布局"；final 三件套（layout/validation/composite）统一从同一 attempt 快照产出。

## 预防规则

- 循环生成管线中，"最终工件"的语义必须显式定义为"最后**成功**状态的快照"，不是"循环退出时各变量的残值"。
- 落盘前做同源断言（layout 与 validation 引用同一 attempt 编号）。
- 同族教训：[[ERR-038__delivery-claim-not-verified-against-git-diff|ERR-038]]（工件与现实脱节的另一种形态）。
