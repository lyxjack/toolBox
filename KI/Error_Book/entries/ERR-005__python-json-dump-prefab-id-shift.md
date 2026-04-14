---
id: ERR-005
type: error
errorCode: ISO-003
severity: critical
status: resolved
recurrence: 1
firstSeen: 2026-04-07
tags:
  - error/critical
  - engine/cocos
  - tool/python
  - asset/prefab
  - errorCode/ISO-003
  - ki/error-book
prevention: ".prefab 文件的结构性修改只能通过 Cocos 编辑器或 MCP API，禁止 python/脚本增删数组元素"
aliases:
  - ERR-005
ci_rules: []
---

# python json.dump 重写 prefab 导致 __id__ 引用错位

## 错误现象
用 python `json.dump` 修改 prefab 文件后，整个弹窗完全不可见（连遮罩都没有）。原因是 python 在文件中插入了新的 JSON 对象（脚本组件），导致后续所有 `__id__` 索引引用错位，引擎无法正确解析节点树。

## 根因分析
Cocos prefab 文件是一个 JSON 数组，节点间通过 `__id__` 引用数组索引。当 python 在数组中间插入新条目时，后续所有 `__id__` 值都应该 +N 偏移，但脚本没有处理这个偏移，导致所有引用指向错误的对象。

这是 ERR-002（禁止脚本修改 .prefab）的变体和复犯。

## 解决方案
1. **绝对不用 python/脚本直接修改 .prefab 文件的结构**（增删条目）
2. 如果必须修改已有条目的字段值（不增删条目），可以用 python，但必须验证条目总数不变
3. 结构性修改（添加组件等）必须通过 MCP + scene_save + prefab_update

## 预防规则
**ERR-002 的铁律再次强调：.prefab 文件的结构性修改只能通过 Cocos 编辑器或 MCP API，不能用脚本。即使"只改一个字段"，如果涉及增删数组元素，就会破坏 __id__ 引用。**

## 关联
- [[ERR-002__python-modify-cocos-prefab|ERR-002]]: 禁止脚本写入 .prefab（本条是其复犯）
- [[ERR-005__mcp-prefab-save-two-steps|ERR-005]]: MCP 保存两步规则
- [[PAT-002__cocos-asset-operation|PAT-002]] — Cocos 资产文件操作原则
