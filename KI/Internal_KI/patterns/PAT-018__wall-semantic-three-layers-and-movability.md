---
id: PAT-018
type: pattern
title: "空间语义三层法 + 障碍物可移动性二分（AI 初稿 × 人工校正契约）"
status: active
created: "2026-07-06"
tags:
  - "pattern/domain-modeling"
  - "topic/llm-vision"
  - "topic/spatial-semantics"
  - ki/pattern
trigger_condition: "user_explicit"
complements:
  - "[[ERR-040__vision-bbox-midframe-small-object-drift|ERR-040]]"
  - "[[ERR-041__idealized-synthetic-test-data-masks-model-blindspot|ERR-041]]"
related:
  - "Error_Book/entries/ERR-040__vision-bbox-midframe-small-object-drift.md"
  - "Error_Book/entries/ERR-041__idealized-synthetic-test-data-masks-model-blindspot.md"
  - "Internal_KI/patterns/PAT-012__mcp-out-of-process-json-pipeline.md"
aliases:
  - "PAT-018"
mem_ref: "93f1823f-1c87-45ad-9d47-a7dcab69da36"
mem_status: "linked"
---

# 空间语义三层法 + 障碍物可移动性二分（AI 初稿 × 人工校正契约）

## 适用场景

真实照片/扫描驱动的空间布局系统（家具规划、装修、货架、AR 摆放）。首例：catIdea 猫家具墙面布局（REQ-20260706-031737，E9 v2 实证）。

## 三层语义

| 层 | 概念 | 处置 |
|---|---|---|
| 表面上 | Opening（窗/门/挂件） | 避让（含派生区如门摆弧） |
| 表面本体 | NoDrillZone（材质/租约限制） | 禁安装 |
| 表面前 | **Obstruction × movability** | 见下二分 |

## 可移动性二分（用户行为维度）

- **hard**（钢琴/电视/大柜）：永久禁区 → error 级进 retry 环（fix_hint 给"绕开或走上方"双区间）；bbox 外扩 margin（5cm）吸收视觉误差
- **easy**（花瓶/椅子/落地灯）：区域**照常设计** → 与布局重叠时产出"安装前请先移开 X"用户行动清单（非阻断）——比一刀切禁区多抢回大片可用面

## AI 初稿 × 人工校正契约

vision 检测（分类可信、小物坐标不可信，见 [[ERR-040__vision-bbox-midframe-small-object-drift|ERR-040]]）输出落**用户可编辑 JSON**；全部派生工件（校验/清单/渲染）可从 JSON 纯代码重算——人工校正零 LLM 成本。（进程外 JSON 契约同族：[[PAT-012__mcp-out-of-process-json-pipeline|PAT-012]]）

## 实证与观察项

- E9 v2：v1 四轮不收敛的同一面墙，披露禁区后 **attempt 1 双零收敛**。观察项（n=1，未验证为普适）：把真实占用提前告知 LLM，可能通过排除"看似空闲实则不可用"的区域反而**帮助**收敛——值得后续实验确认。
