---
id: PAT-017
type: pattern
title: "验证器必须进反馈环：目标在 prompt、数字在 fix_hint、结构化喂回"
status: active
created: "2026-07-06"
tags:
  - "pattern/llm-pipeline"
  - "topic/validator"
  - "topic/retry-loop"
  - ki/pattern
trigger_condition: "user_explicit"
complements:
  - "[[PAT-016__prompt-constraint-dichotomy-fix-vs-first-attempt|PAT-016]]"
related:
  - "Internal_KI/patterns/PAT-016__prompt-constraint-dichotomy-fix-vs-first-attempt.md"
  - "Error_Book/entries/ERR-039__final-artifacts-cross-attempt-misalignment.md"
aliases:
  - "PAT-017"
mem_ref: "93f1823f-1c87-45ad-9d47-a7dcab69da36"
mem_status: "linked"
---

# 验证器必须进反馈环：目标在 prompt、数字在 fix_hint、结构化喂回

## 适用场景

任何"LLM 生成 → 规则校验 → retry"管线。首例：catIdea H1-H10 + V1-V5（REQ-20260705-002830 并环实证；REQ-20260706-031737 H10 沿用）。

## 核心分工（P1 原则）

- **prompt**：只列目标性约束（"避让禁区""路径要能回来"），不写精确数字
- **validator**：产出结构化 error——`actual`（实测值）+ `expected`（合法区间）+ `fix_hint`（可执行修复选项，含精确数字，最好给 2 个逃逸方向如 "x 移出 [145,255] 或 z ≥ 208"）
- **retry prompt**：把 errors 渲染成 "### Violation N" 结构化块喂回，要求只修违规处

## 三条实证规则

1. **新验证维度必须并入环**。环外验证 = 漏网：V1-V4 曾只做事后报告，case_c 出现"H 环修好 A 却引入 V 缺陷 B"——并环后同 case 环内捕获修复。
2. **fix_hint 数字必须可一步执行**。"改小一点"无效，"set local_z ≥ 208" 有效。
3. **枚举一致性用测试锁定**。文档宣称 N 类/代码实际 M 类的漂移（catIdea 类目色板 7 vs 8）用"枚举覆盖测试"永久锁死，防再漂。

## 环的边界

- 指标口径与环解耦：加环不得改动既有实验指标的统计口径（M1-M5 保持 H-only，跨期可比）
- 最终工件同 attempt 锚定，防错位（见 [[ERR-039__final-artifacts-cross-attempt-misalignment|ERR-039]]）
- 环治不了的"首攻策略"走 prompt（见 [[PAT-016__prompt-constraint-dichotomy-fix-vs-first-attempt|PAT-016]]）；反复不收敛的钉子户用 best-of-n 兜底（见 [[PAT-019__soft-scoring-select-only-with-intuition-calibration|PAT-019]]）
