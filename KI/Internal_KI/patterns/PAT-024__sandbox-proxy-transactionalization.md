---
id: PAT-024
type: pattern
title: "沙箱代理事务化：对遗留副作用策略零改动实现 proposal/commit（副本+记录代理+确认后重放）"
status: active
created: "2026-07-12"
trigger_condition: user_explicit
tags:
  - ki/internal
  - pattern
  - trigger/user_explicit
  - pattern/backend
  - language/python
related:
  - "Error_Book/entries/ERR-048__cache-fingerprint-order-and-alias-identity.md"
  - "Internal_KI/patterns/PAT-023__old-new-replay-equivalence-verification.md"
mem_ref: cbdc9a4e-5ecf-4249-b3c1-4751fd1f432b
mem_status: linked
aliases:
  - "PAT-024"
  - "sandbox-proxy-txn"
---

# 沙箱代理事务化

## 适用场景

遗留策略函数在计算过程中**直接修改共享状态**（"proposal 即提交"），需要改造为"权威确认后才提交"的事务语义，但策略代码庞大复杂不可重写（gunzi_pro 案例：900 行扣底策略、566 行扣王策略，副作用分散在几十个分支）。

## 步骤

1. **数据副本**：调用前把策略会 in-place 修改的可变数据换成浅拷贝（`req.all_hands = {k: list(v)}`、`req.dipai = list(...)`），finally 中还原引用；
2. **记录代理**：白名单业务写方法（set_xxx/update_xxx）用 `__getattr__` 代理拦截为 `calls.append((name, args, kwargs))`，读方法透传真实对象（策略里的 `hasattr(table, "set_...")` 探测自然通过）；
3. **diff 捕获**：策略跑完后，比较沙箱前后状态（Counter diff）得到牌面变化；`calls` 即业务状态变化——两者构成 proposal 的完整 delta；
4. **确认后 commit**：权威确认消息到达时，校验（epoch/守恒/包含性）→ 一次性执行删牌/换牌 + `for name,args,kw in calls: getattr(real, name)(*args, **kw)` 重放业务写；
5. **删除操作用计数匹配**不用 `list.remove(元素)`（形态/大小写差异会炸），参照 `_remove_cards_by_counter`。

## 收益

- **策略代码一行不改** = 策略回归风险为零；
- 重复确认广播天然零二次副作用（commit 后 proposal 离开 live 集合）；
- 确认永不到达 → 超时作废，真实状态从未被碰过。

## 反模式

- 深拷贝整个引擎对象来做沙箱（热路径成本爆炸）——只拷贝策略实际触碰的数据；
- 在代理里"顺手"放行某些写操作（半事务比无事务更难排查）；
- commit 时直接把沙箱结果整体赋值回去（覆盖确认窗口期间其他合法变化）——按 delta 重放，不按快照覆盖。

## 关联

- [[ERR-048__cache-fingerprint-order-and-alias-identity|ERR-048]] — 共享可变别名正是需要沙箱隔离的原因
- [[PAT-023__old-new-replay-equivalence-verification|PAT-023]] — 验证事务化前后行为等价的方法论
- 实现参考：gunzi_pro `processor.py::_RecordingTable / _run_strategy_sandboxed`（commit 0e8bc07）
