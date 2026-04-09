---
id: ERR-007
type: error
errorCode: ISO-003
severity: high
status: resolved
recurrence: 1
firstSeen: 2026-04-07
tags:
  - error/high
  - tool/MCP
  - errorCode/ISO-003
  - ki/error-book
prevention: "每次 MCP prefab 操作结束后，必须 node_delete_node 清理实例并 node_find_nodes 验证无残留"
aliases:
  - ERR-007
---

# MCP 操作后未清理场景残留节点

## 错误现象
多次通过 MCP `prefab_instantiate_prefab` 调试 prefab 后，场景中残留了 4+ 个 starRoadView 实例未清理。这些残留节点在编辑器中可见，导致用户困惑，并可能在运行时造成冲突。

## 根因分析
每次 MCP 操作（检查组件、设置属性等）都需要先实例化 prefab 到场景，操作完后应立即删除。但多次操作中，部分实例因错误中断或遗忘而未被清理。

## 解决方案
MCP prefab 操作必须遵循严格的生命周期：
1. `prefab_instantiate_prefab` → 记录 UUID
2. 执行所有修改
3. `scene_save_scene` + `prefab_update_prefab`
4. **`node_delete_node`** 删除实例（必做）
5. **`scene_save_scene`** 最终保存（必做）
6. **`node_find_nodes`** 验证场景无残留

## 预防规则
**每次 MCP prefab 操作结束后，必须查找并删除所有残留实例。用 `node_find_nodes` 确认场景干净。**

## 关联
- [[ERR-005__mcp-prefab-save-two-steps|ERR-005]]: MCP 保存两步规则
- [[PAT-001__mcp-prefab-workflow|PAT-001]] — MCP Prefab 完整修改流程
