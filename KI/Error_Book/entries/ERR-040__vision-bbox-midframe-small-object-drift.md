---
id: ERR-040
type: error
errorCode: "BHV-002"
severity: "medium"
status: "resolved"
recurrence: 0
firstSeen: "2026-07-06"
tags:
  - "error/medium"
  - "topic/llm-vision"
  - "topic/bbox-detection"
  - "errorCode/BHV-002"
  - ki/error-book
prevention: "LLM vision 的 bbox 按物体占幅分级信任：大物体（占画面 >~1/4 边长）可自动采信；中景小物系统性偏移 200-340px，只能当'AI 初稿'，必须留人工校正契约（可编辑 JSON + 重跑派生工件，零 LLM 成本）。核对方法：50px 坐标网格裁图对真值。"
aliases:
  - "ERR-040"
mem_ref: "93f1823f-1c87-45ad-9d47-a7dcab69da36"
mem_status: "linked"
---

# Claude vision 中景小物 bbox 系统性偏移——"边桌"标在椅子上

## 错误现象

catIdea E9 v2（REQ-20260706-031737）：对 1600×1200 真实客厅照片做墙前物体检测，16 物体分类全对，但**中景小物 bbox 系统性左偏 200-340px**——"side table [442-564px]"实际压在一把面对镜头的椅子右半上（真边桌在 745-1005px）；"fabric [680-860px]"是幽灵框。**用户目检发现**，Agent 复核前未察觉。大物体（电视、钢琴，conf 0.95）bbox 准确。

## 根因分析

1. LLM vision 对小目标的像素定位能力弱于分类能力——label/movability 全对，坐标漂移。
2. Agent 交付前只目检了"层是否画出"，没有做"框是否贴住实物"的逐框核对。
3. 偏移呈系统性（同向），提示模型对中景深度/透视的定位偏差，非随机噪声。

## 解决方案

50px 坐标网格裁图逐框对真值 → 人工重标 10 物体写回 obstructions.json（LLM 原始检测存档）→ 只重算派生工件（校验/建议清单/渲染），零 LLM 重跑。建议清单从 2 条噪声变 1 条真建议。

## 预防规则

- 检测输出必须落**用户可编辑的 JSON 契约**，派生工件可从 JSON 纯代码重算——校正成本趋零。
- 影响硬约束（禁区）的物体优先用大物体框（可信）+ margin 外扩兜误差；小物框只做提示性用途。
- 交付含 bbox 的可视化前，抽查至少 2-3 个框贴实物程度（裁图核对法）。
- 承接模式：[[PAT-018__wall-semantic-three-layers-and-movability|PAT-018]]；同链教训 [[ERR-041__idealized-synthetic-test-data-masks-model-blindspot|ERR-041]]。
