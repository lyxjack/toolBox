---
id: PAT-027
type: pattern
title: "延迟确认式序号缺口检测：挂账-回填-到期告警"
status: active
created: "2026-07-14"
trigger_condition: user_explicit
tags:
  - ki/internal
  - pattern
  - trigger/user_explicit
  - domain/observability
  - language/python
mem_ref: cbdc9a4e-5ecf-4249-b3c1-4751fd1f432b
mem_status: linked
related:
  - "Error_Book/entries/ERR-055__arrival-order-alarm-and-last-rewind-paired-false-gaps.md"
  - "Internal_KI/patterns/PAT-023__old-new-replay-equivalence-verification.md"
aliases:
  - "PAT-027"
  - "deferred-gap-confirm"
---

# 延迟确认式序号缺口检测

## 适用场景

对带序号的消息/事件流做丢失检测，且传输层乱序是常态（相邻换位高频、丢失低频）。目标：告警只报真丢包，乱序零误报。

## 算法（gunzi_pro `EventGapDetector` 定稿）

每流维护 `last`（只取 max，晚到号**永不回退**）与挂账组列表：

1. **跳号** `eid > last+1` → 缺号区间挂账（`{ids, ttl=CONFIRM_TTL}`），**不立即告警**；新组从下一次观测起计时（防差一）。
2. **晚到/重复号** `eid ≤ last` → 从挂账组销账（乱序被回填的证据），last 不动。
3. **每次观测**扣减各组 ttl：组内 ids 清空 → 静默销号；ttl 到期仍有余 → 告警确认丢失区间。
4. 跨代（局号变化）清空挂账。TTL 取"实测最大换位深度 × 安全系数"（实测深度 1，连环换位可到 6，取 8）。

## 验证方法论（可复用）

双重验证缺一不可：**合成模糊**——3000 序号 × 500 次相邻换位 × 多 seed + 挖 3 个真丢号，断言输出恰为 3 条（零误报全命中）；**真实流回放**——从生产日志提取 (流键, 序号) 到达序列灌入新旧实现对比（63.9 万条：12988 告警 → 318，-97.6%）。降噪后的残余告警才有资格当真信号（本例挖出局初 2-3 号系统性缺失=服务端占位推送，直接转化为对服务器组的精确质询）。对比验证思想同 [[PAT-023__old-new-replay-equivalence-verification|PAT-023]]；反面教材 [[ERR-055__arrival-order-alarm-and-last-rewind-paired-false-gaps|ERR-055]]。
