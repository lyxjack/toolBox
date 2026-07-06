---
id: ERR-041
type: error
errorCode: "REQ-003"
severity: "high"
status: "resolved"
recurrence: 0
firstSeen: "2026-07-06"
tags:
  - "error/high"
  - "topic/test-data"
  - "topic/domain-modeling"
  - "errorCode/REQ-003"
  - ki/error-book
prevention: "几何/感知管线的测试数据必须包含真实世界的脏因素（家具、遮挡、非理想面）。每个建模维度问一句：'真实场景里还有什么会占据这个空间/通道，而我们的 schema 没词表达？'合成数据全绿 ≠ 模型完备。"
aliases:
  - "ERR-041"
mem_ref: "93f1823f-1c87-45ad-9d47-a7dcab69da36"
mem_status: "linked"
---

# 理想化合成测试数据掩盖建模盲区——"看不见 ≠ 不存在"

## 错误现象

catIdea Phase 3 标定→布局链路在合成照片（程序生成的干净墙面）上全绿通过全部实验；真实照片首验（E9）后才暴露：房间模型只有"墙上开口"（Opening）与"墙体禁钻"（NoDrillZone）两类语义，**"墙前空间被实物占据"完全没有对应概念**——照片里一台真实钢琴占着设计墙右半区，管线把它当空墙规划。首验"能看"纯属侥幸（布局恰好没大面积压到钢琴）。

## 根因分析

1. 测试数据由自己的 schema 生成 → 数据天然只包含 schema 已有的概念，**测不出 schema 缺什么**（自证循环）。
2. 单应性投影把三维实物"压扁"进墙面，几何上无痕，语义上丢失。
3. 缺的不只是"障碍物"一个词，还有用户行为维度（可移动性）——一刀切禁区会过度收缩可用墙面。

## 解决方案

REQ-20260706-031737 补齐墙前语义层：Obstruction × movability（hard=禁区/easy=建议移走），vision 检测自动产出（见 [[PAT-018__wall-semantic-three-layers-and-movability|PAT-018]]）。

## 预防规则

- 合成测试集必须掺入真实样本或"脏化"因素，且越早越好（本例晚到 Phase 3 收尾才暴露）。
- Schema 评审时做"真实场景走查"：拿 3 张真实照片逐物体问"模型有词吗"。
- 同链条目：[[ERR-040__vision-bbox-midframe-small-object-drift|ERR-040]]（补齐语义后的精度边界）。
