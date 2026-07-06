---
id: "EXEC-2026-07-06-catidea-scene-semantics"
type: execution_log
req_ref: "REQ-20260706-031737"
status: "pass"
created: "2026-07-06"
tags:
  - execution_log
  - req-tracking
  - ki/internal
  - topic/llm-vision
  - topic/spatial-semantics
related:
  - "Internal_KI/patterns/PAT-016__prompt-constraint-dichotomy-fix-vs-first-attempt.md"
  - "Internal_KI/patterns/PAT-017__validator-into-retry-loop-with-numeric-fixhints.md"
  - "Internal_KI/patterns/PAT-018__wall-semantic-three-layers-and-movability.md"
  - "Internal_KI/patterns/PAT-019__soft-scoring-select-only-with-intuition-calibration.md"
  - "Error_Book/entries/ERR-038__delivery-claim-not-verified-against-git-diff.md"
  - "Error_Book/entries/ERR-039__final-artifacts-cross-attempt-misalignment.md"
  - "Error_Book/entries/ERR-040__vision-bbox-midframe-small-object-drift.md"
  - "Error_Book/entries/ERR-041__idealized-synthetic-test-data-masks-model-blindspot.md"
aliases:
  - "EXEC-2026-07-06-catidea-scene-semantics"
mem_ref: "93f1823f-1c87-45ad-9d47-a7dcab69da36"
mem_status: "linked"
---

# catIdea 2026-07-04~06 弧线收官：审计 → 模块逻辑升级 → 真实照片 → 场景语义（Step 5 沉淀锚点）

## User Intent (Original)

用户对"生成效果图"与"模块逻辑"不满 → 记忆驱动全项目审计（REQ-20260704-223429）→ 逐步批准执行 Step 1-4 与 E9 → 提出"模型要分辨可移动 vs 不可移动物体"（REQ-20260706-031737）→ 批准全部 + Step 5 沉淀。

## REQ 弧线（7 个 session 全 APPROVED）

| REQ | 交付 | commit |
|-----|------|--------|
| 20260704-223429 | 审计 + 诚实性修复（P1.2 补落地） | — |
| 20260705-002830 | H9.1 无向语义 + V1-V4 并环 | 31cbc80 前序 |
| 20260705-030420/130304 | 效果图信息层 + 18 模块 CC 材质产品化 | — |
| 20260705-132515 | prompt 二分法实验 + L4 幻觉 schema 根除 | ae2af05 |
| 20260705-143459 | v0.5 软评分 + best-of-n | 31cbc80 |
| 20260705-150305 | E9 真实照片首验（视觉链路 🟢/收敛 🟡） | b2d727e |
| 20260706-031737 | 障碍物 movability 语义（H10 + 建议移走 + E9 v2 attempt1 双零） | 6fcd86d / ff21bd2 |

## 主沉淀（独立条目）

模式：[[PAT-016__prompt-constraint-dichotomy-fix-vs-first-attempt|PAT-016]] / [[PAT-017__validator-into-retry-loop-with-numeric-fixhints|PAT-017]] / [[PAT-018__wall-semantic-three-layers-and-movability|PAT-018]] / [[PAT-019__soft-scoring-select-only-with-intuition-calibration|PAT-019]]
错题：[[ERR-038__delivery-claim-not-verified-against-git-diff|ERR-038]] / [[ERR-039__final-artifacts-cross-attempt-misalignment|ERR-039]] / [[ERR-040__vision-bbox-midframe-small-object-drift|ERR-040]] / [[ERR-041__idealized-synthetic-test-data-masks-model-blindspot|ERR-041]]

## 次级教训（不单立条目，记录在此）

1. **依据分级声明**：外部数据引用按"实证抓取（CC WebFetch 逐页）/ 推断 / 不可达如实声明（Vetreska）"分级标注，QA 层核对分级而非笼统"有依据"。
2. **规格偏离要有据**：H9.1 对规格伪代码做无向语义偏离，依据（LLM 双向输出 × 单向检查 2-5 误报/布局，无向 0 误报）+ 偏离声明写进规格文档落地注记——"有据偏离"优于"沉默遵守错误规格"。
3. **ramp 类是收敛钉子户**（贴地模块与低位模块天然挤占）：E9 v1 三轮肇事者均为 incline_scratch_ramp；处置顺序 = 禁区语义披露（v2 实证有效）> best-of-n 换候选 > few-shot 补正例。
4. **实验产物命名带版本弧线**（composite / composite_v2、obstructions_v2_llm_raw 存档原始检测）：校正/重跑不覆盖首验证据，审计可回放。

## 度量快照（弧线末）

pytest 65→83 全绿；E7 case_b 8 存档回放等价；E9 v2 检测 $0.14 + replan $0.35；规则 10H+5V。
