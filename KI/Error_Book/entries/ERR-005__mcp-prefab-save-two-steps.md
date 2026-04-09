---
id: ERR-005
type: error
errorCode: BHV-001
severity: high
status: resolved
recurrence: 5
firstSeen: 2026-04-07
tags:
  - error/high
  - engine/cocos
  - tool/MCP
  - asset/prefab
  - errorCode/BHV-001
  - ki/error-book
prevention: "MCP 修改 prefab 必须先 scene_save_scene 再 prefab_update_prefab，保存后 grep 验证"
aliases:
  - ERR-005
---

# MCP 修改 prefab 必须 scene_save → prefab_update 两步才写入磁盘

## 错误现象
通过 MCP 修改 prefab 实例节点属性后（UITransform contentSize、position、script component 等），调用 `prefab_update_prefab` 返回 success，但文件实际未写入磁盘。导致：
- contentSize 全部是默认 100×100
- 脚本组件属性丢失
- 多次"成功但无效"的保存

## 根因分析
MCP 的 `prefab_update_prefab` 只将场景中的**已持久化变更**推回 prefab 文件。如果场景变更未先通过 `scene_save_scene` 持久化，`prefab_update_prefab` 读取的仍是旧数据。

## 解决方案
严格按以下顺序保存：
1. `scene_save_scene` — 先持久化场景变更
2. `prefab_update_prefab` — 再推回 prefab 文件
3. `grep` 验证文件内容确实更新

## 预防规则
**MCP 修改 prefab 节点后，永远执行两步保存。保存后用 grep 验证。缺任一步都会导致静默失败。**

## 关联
- [[ERR-002__python-modify-cocos-prefab|ERR-002]]: prefab 文件操作约束
- [[ERR-004__mcp-prefab-layer-ui2d|ERR-004]]: MCP 创建节点的 layer 问题
- [[PAT-001__mcp-prefab-workflow|PAT-001]] — MCP Prefab 完整修改流程
