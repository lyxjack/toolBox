---
id: ERR-017
type: error
errorCode: BHV-001
severity: critical
status: recurring
recurrence: 3
firstSeen: 2026-04-07
tags:
  - error/critical
  - engine/cocos
  - tool/MCP
  - asset/prefab
  - errorCode/BHV-001
  - ki/error-book
prevention: "MCP prefab_update 后必须在编辑器中检查所有节点的 layer 是否为 UI_2D（33554432），特别是新创建的节点"
aliases:
  - ERR-017
---

# MCP prefab_update 后节点 layer 被重置为非 UI_2D

## 错误现象
通过 MCP 创建新节点时设置了 layer=33554432（UI_2D），但 prefab_update 保存后，部分或全部节点的 layer 被重置为默认值（1073741824 = DEFAULT），导致运行时不可见。这是 ERR-004 的反复发生。

## 根因分析
MCP prefab_update 在序列化 prefab 时可能不保留新节点的 layer 设置。或者 prefab_update 从编辑器内部状态读取时 layer 已经被重置。

## 解决方案
MCP 操作 prefab 后，必须在编辑器中：
1. 打开 prefab
2. 逐个检查所有节点的 Layer 属性
3. 不是 UI_2D 的改为 UI_2D
4. 保存

## 预防规则
**MCP prefab_update 后不能信任 layer 值。必须在编辑器中手动验证并修正所有节点的 layer 为 UI_2D。**

## 关联
- [[ERR-004__mcp-prefab-layer-ui2d|ERR-004]]: 原始 layer 问题
- [[ERR-016__mcp-prefab-update-corrupts-class-id|ERR-016]]: MCP 破坏脚本引用
