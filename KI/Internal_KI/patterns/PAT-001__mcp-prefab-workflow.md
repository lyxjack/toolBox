---
id: PAT-001
type: pattern
title: "MCP Prefab 完整修改流程"
status: active
created: 2026-04-08
tags:
  - pattern/MCP
  - pattern/prefab
  - engine/cocos
  - ki/pattern
complements:
  - "[[ERR-004__mcp-prefab-layer-ui2d|ERR-004]]"
  - "[[ERR-005__mcp-prefab-save-two-steps|ERR-005]]"
  - "[[ERR-007__mcp-cleanup-scene-nodes|ERR-007]]"
aliases:
  - PAT-001
---

# MCP Prefab 完整修改流程

## 适用场景

通过 Cocos Creator MCP Server 对 `.prefab` 文件进行任何修改时（新增/删除组件、调整属性、修改布局等），必须遵循此流程。此流程确保：
- 节点可见（layer 正确）
- 修改持久化到 prefab 文件（两步保存）
- 场景中不残留临时节点

## 步骤

### 1. 实例化 Prefab 到场景

```
prefab_instantiate_prefab → 记录返回的 UUID
```

此 UUID 是后续所有操作的目标。务必保存。

### 2. 设置节点 Layer 为 UI_2D

```
node_set_node_property uuid property="layer" value=33554432
```

**关键**：Cocos MCP 实例化的节点默认 layer=0（不可见）。必须立即设置为 `33554432`（UI_2D），否则节点在 Canvas 下不可见、不可交互。

### 3. 执行所有修改

在此阶段完成所有需要的修改：
- UITransform 尺寸/锚点
- 位置、旋转、缩放
- 添加/修改脚本组件
- 子节点操作

### 4. 第一次保存：持久化场景

```
scene_save_scene
```

将场景中的修改写入场景文件。这是 prefab_update 的前置条件。

### 5. 回写 Prefab 文件

```
prefab_update_prefab
```

将场景中实例化节点的当前状态推回 `.prefab` 文件。**如果跳过此步，修改只在场景中生效，prefab 文件不变。**

### 6. 清理临时节点

```
node_delete_node uuid
```

删除场景中因实例化产生的临时节点。

### 7. 第二次保存：清理后保存

```
scene_save_scene
```

确保删除操作也被持久化，场景恢复干净状态。

### 8. 验证：无残留节点

```
node_find_nodes
```

检查场景节点树，确认没有因本次操作残留的孤立节点。

### 9. 验证：磁盘文件已更新

```
grep 目标属性 xxx.prefab
```

用 `grep` 或 `json.load`（只读）检查 `.prefab` 文件内容，确认修改已写入磁盘。

## 反模式

| 错误做法 | 后果 | 对应错误 |
|----------|------|---------|
| 跳过 layer 设置 | 节点不可见，误以为操作失败 | ERR-004 |
| 只调用一次 save | 修改未写入 prefab 文件 | ERR-005 |
| 不删除临时节点 | 场景污染，节点累积 | ERR-007 |

## 关联错误

- [[ERR-004__mcp-prefab-layer-ui2d|ERR-004]] — MCP 实例化节点 layer 默认为 0，必须手动设为 UI_2D
- [[ERR-005__mcp-prefab-save-two-steps|ERR-005]] — Prefab 修改需要 scene_save + prefab_update 两步保存
- [[ERR-007__mcp-cleanup-scene-nodes|ERR-007]] — 操作完成后必须清理场景中的临时节点
