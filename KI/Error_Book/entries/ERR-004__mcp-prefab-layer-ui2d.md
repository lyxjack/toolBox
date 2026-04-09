---
id: ERR-004
type: error
errorCode: BHV-001
severity: critical
status: recurring
recurrence: 2
firstSeen: 2026-04-07
tags:
  - error/critical
  - engine/cocos
  - asset/prefab
  - tool/MCP
  - errorCode/BHV-001
  - ki/error-book
prevention: "MCP 创建 UI 节点后必须设置 layer=33554432 (UI_2D)"
aliases:
  - ERR-004
---

# MCP 创建的 Cocos 节点 layer 不是 UI_2D，导致运行时不可见

## 错误现象
通过 MCP `node_create_node` 创建的节点，layer 默认不是 `UI_2D`（33554432）。导致节点在编辑器 prefab 视图中显示正常，但运行时 Camera 不渲染这些节点，表现为弹窗完全不可见（只有代码创建的遮罩可见）。

## 根因分析
Cocos Creator 3.x 的 Camera 只渲染匹配其 visibility mask 的 layer。UI Camera 只渲染 `UI_2D` 层（1 << 25 = 33554432）。MCP 的 `node_create_node` 创建节点时可能使用默认 layer（DEFAULT = 1 << 30），不是 UI_2D。

## 解决方案
MCP 创建 UI 节点后，必须设置 layer：
```
node_set_node_property: uuid, property="layer", value=33554432
```
或者在代码中修复：
```typescript
node.layer = Layers.Enum.UI_2D; // 33554432
```

## 预防规则
**任何时候通过 MCP 创建 UI 节点或排查 UI 不可见问题时，第一时间检查 node.layer 是否为 33554432（UI_2D）。这是最常见的"节点存在但不可见"原因。**

## 关联
- [[ERR-003__buyview-mask-debug-failure|ERR-003]]: buyView 排查时也遇到过 UI 显示问题
- [[ERR-002__python-modify-cocos-prefab|ERR-002]]: prefab 文件操作约束
- [[PAT-001__mcp-prefab-workflow|PAT-001]] — MCP Prefab 完整修改流程
