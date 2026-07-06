---
id: PAT-019
type: pattern
title: "软评分只择优不阻断 + 上线前直觉校准渲染"
status: active
created: "2026-07-06"
tags:
  - "pattern/llm-pipeline"
  - "topic/scoring"
  - "topic/best-of-n"
  - ki/pattern
trigger_condition: "user_explicit"
complements:
  - "[[PAT-017__validator-into-retry-loop-with-numeric-fixhints|PAT-017]]"
related:
  - "Internal_KI/patterns/PAT-017__validator-into-retry-loop-with-numeric-fixhints.md"
aliases:
  - "PAT-019"
mem_ref: "93f1823f-1c87-45ad-9d47-a7dcab69da36"
mem_status: "linked"
---

# 软评分只择优不阻断 + 上线前直觉校准渲染

## 适用场景

硬校验（过/不过）之上想引入质量分层（多候选择优）。首例：catIdea v0.5（REQ-20260705-143459）。

## 核心规则

1. **软评分只参与选择，不参与阻断**——pass/fail 语义完全归硬校验；评分为 0 的布局若硬校验通过依然合法。这样评分器的任何缺陷都不会拒掉合法产出，也不污染既有指标口径。
2. **评分必须是确定性纯函数**（可复算、可回放、零 LLM 成本），维度带显式权重（catIdea 五维 .25/.25/.20/.15/.15），权重可按用户口味调而不动管线。
3. **上线前做直觉校准**：把 N 个候选按分数排名渲染成对比条图，与人的目视排序对拍——排名一致才可信。v0.5 实测 3 候选 67.5/61.7/49.8，排名与目视一致。
4. **best-of-n 是收敛钉子户的兜底**：单次 retry 环修不动的 case（如 catIdea ramp 类），换 n 个候选择优通常比死磕同一候选便宜且有效。

## 反模式

- 让软评分挡产出（软硬混口径，回放不可比）
- 用 LLM 当评分器起步（不可复算、有成本、难校准）——先确定性函数，不够再升级
