---
id: ERR-010
type: error
errorCode: BHV-001
severity: high
status: resolved
recurrence: 1
firstSeen: 2026-04-09
tags:
  - error/high
  - process/decision
  - errorCode/BHV-001
  - ki/error-book
prevention: "参照已有代码时必须先比较场景差异（数据量、方向、生命周期），不能不动脑子照搬"
aliases:
  - ERR-010
---

# 被告知"参考 X"时不动脑子照搬，没有比较场景差异

## 错误现象
用户说"参考关卡的滚动逻辑"，Agent 直接照搬 homeView 的 ScrollViewCmpt 回收方案。没有分析两个场景的关键差异，导致方案不适用，反复修补浪费大量时间。

## 根因分析
1. **把"参考"理解为"照搬"**：用户说参考，意思是学习思路，不是 copy-paste
2. **没有独立判断**：Agent 应该在参考后自己分析适用性，而不是盲从
3. **没有比较关键差异**：
   - homeView：数百个地图块，需要回收 → ScrollViewCmpt 合适
   - 星星之路：30 个 item，不需要回收 → 简单 ScrollView 足够
   - homeView：从顶部开始 → ScrollViewCmpt 默认行为
   - 星星之路：从底部开始 → ScrollViewCmpt 不支持

## 解决方案
被要求"参考 X"时，执行三步：
1. **理解 X 的核心思路**（不是具体实现）
2. **列出当前场景与 X 的差异**（数据量、方向、生命周期、依赖等）
3. **基于差异做出独立判断**（可能得出完全不同的方案）

## 预防规则
**"参考"≠"照搬"。用户的建议不一定 100% 适用，Agent 必须独立分析并在必要时提出不同方案。盲从比犯错更糟，因为它浪费双方时间且不产生学习。**

## 关联
- ERR-009: 过度工程化（本条错误的直接后果）
