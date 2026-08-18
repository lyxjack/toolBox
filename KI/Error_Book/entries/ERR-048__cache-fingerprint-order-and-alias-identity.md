---
id: ERR-048
type: error
errorCode: ERR-048
severity: high
status: resolved
recurrence: 0
firstSeen: "2026-07-11"
tags:
  - ki/error-book
  - error
  - severity/high
  - language/python
  - domain/concurrency
  - domain/cache
prevention:
  - "行为等价缓存/去重指纹必须三重守卫：内容 + 顺序 + 对象身份(id)，缺一不可"
  - "列表顺序可能是业务语义（等价候选选择依赖遍历序），指纹/缓存 key 禁止 sorted() 归一化顺序敏感数据"
  - "被缓存方会别名(alias)可变容器时，任何容器对象重绑（即使内容相同）必须视为不同输入，强制重算"
  - "验证'跳过重算'类优化必须用新旧回放逐位对比，且响应一致 ≠ 状态一致，需加内部状态探针"
mem_ref: cbdc9a4e-5ecf-4249-b3c1-4751fd1f432b
mem_status: linked
related:
  - "Error_Book/entries/ERR-026__client-fire-and-forget-checkpoint-loses-level.md"
  - "Internal_KI/patterns/PAT-023__old-new-replay-equivalence-verification.md"
aliases:
  - "ERR-048"
  - "fingerprint-triple-guard"
---

# 缓存指纹缺顺序/对象身份守卫导致行为分叉

## 错误现象

gunzi_pro 性能优化中，为消除 GameEnv 重复全量重建引入"输入指纹相同则跳过重建"。新旧代码回放对比出现同分值等价候选互换（`[17,'H']` vs `[17,'D']`），后又出现不同牌值的真实策略分歧——响应序列 99% 一致，仅个别决策点分叉，且**内部状态探针（位置推进/序列长度）完全一致**，极难肉眼定位。

## 根因（两个独立缺陷叠加）

1. **sorted() 吃掉顺序语义**：指纹对手牌列表做了 `sorted()` 归一化，但规则管线在同分值候选间的选择依赖手牌列表遍历顺序。牌集相同、顺序不同的重建输入被误判"相同"而跳过。
2. **可变别名重绑分叉**：`TableState.get_all_hands()` 返回内部引用（各模块原地改），`update_bottom()` 则**重绑新 list 对象**。旧行为每次重建会重新别名到新对象；跳过重建后存活的 env 继续别名旧对象，后续原地修改只落在一边 → 状态静默分叉。这正是被优化系统自身文档（整理报告 §22 P0"TableState/GameEnv 可变 list 别名"）预警过的风险在缓存层的再现。

## 修复

指纹三重守卫（gunzi_pro `processor.py::_compute_env_build_fingerprint`）：

```python
(内容: tuple((int(r), str(s)) for r, s in cards),   # 不 sorted，顺序敏感
 身份: id(all_hands), tuple((chair, id(cards_list)) ...), id(bottom),
 其余全部构建输入字段...)
# 任何取值异常 → 返回 None → fail-open 照常重建
```

修复后 8 房间 855 条响应新旧回放逐位一致（验证方法见 [[PAT-023__old-new-replay-equivalence-verification|PAT-023]]）。

## 预防规则

见 frontmatter `prevention`。核心一句话：**"输入相同"的判定标准必须覆盖消费方可感知的一切——内容、顺序、对象身份；判不准就 fail-open 重算。**

## 关联

- [[ERR-026__client-fire-and-forget-checkpoint-loses-level|ERR-026]] — 同族教训：并发调用复用旧 revision 盲写；本条是它在"缓存等价判定"侧的镜像
- [[PAT-023__old-new-replay-equivalence-verification|PAT-023]] — 抓出本错误的验证方法论
