---
id: PAT-016
type: pattern
title: "Prompt 约束二分法：修复类迁 validator，首攻策略类留 prompt"
status: active
created: "2026-07-06"
tags:
  - "pattern/llm-pipeline"
  - "topic/prompt-engineering"
  - "topic/validator"
  - ki/pattern
trigger_condition: "user_explicit"
complements:
  - "[[PAT-017__validator-into-retry-loop-with-numeric-fixhints|PAT-017]]"
related:
  - "Internal_KI/patterns/PAT-017__validator-into-retry-loop-with-numeric-fixhints.md"
  - "Error_Book/entries/ERR-038__delivery-claim-not-verified-against-git-diff.md"
aliases:
  - "PAT-016"
mem_ref: "93f1823f-1c87-45ad-9d47-a7dcab69da36"
mem_status: "linked"
---

# Prompt 约束二分法：修复类迁 validator，首攻策略类留 prompt

## 适用场景

LLM 生成 + 校验 retry 环的管线要给 prompt 减重时，判断哪些约束能从 prompt 移除。首例：catIdea planner（REQ-20260705-132515，双向实验实证）。

## 二分判据

| 约束类型 | 定义 | 处置 | 依据 |
|---|---|---|---|
| **修复类** | 违反后 validator 能给出**精确数字修复反馈**（越界坐标、重叠区间、缺返回边） | 从 prompt 删除，靠 validator+retry 兜住 | L2/L5/L6 迁移后 case 全部照常收敛，prompt -459B |
| **首攻策略类** | 影响**第一次生成的方向选择**，validator 只能事后打回、无法告诉它"当初该怎么选"（如窄墙优先选 S 变体） | 保留在 prompt | L1 压缩 → case_b 4 轮不收敛（attempt 0 即 2×H1）；恢复 → 2 轮双零（历史最佳） |

## 步骤

1. 逐条约束问："违反它时，validator 的 fix_hint 能不能给出让 LLM 一步修对的数字？"能 → 修复类；不能（要重选方案）→ 首攻策略类
2. 迁移做成**可回滚实验**：预设回滚判据（如"任一 case 收敛轮数劣化即回滚"），压缩与恢复各跑一轮取证
3. 负结果照样沉淀——"哪些不能迁"与"哪些能迁"同等值钱

## 反例警示

不做二分、一律"prompt 越短越好"会把首攻策略也删掉，收敛直接崩（case_b 实证）。
