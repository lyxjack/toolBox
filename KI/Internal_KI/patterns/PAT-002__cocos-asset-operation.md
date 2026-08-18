---
id: PAT-002
type: pattern
title: "Cocos 资产文件操作原则"
status: active
created: 2026-04-08
tags:
  - pattern/cocos
  - pattern/asset
  - engine/cocos
  - ki/pattern
complements:
  - "[[ERR-002__python-modify-cocos-prefab|ERR-002]]"
  - "[[ERR-005__python-json-dump-prefab-id-shift|ERR-005]]"
aliases:
  - PAT-002
---

# Cocos 资产文件操作原则

## 适用场景

任何涉及 Cocos Creator 资产文件（`.prefab`、`.scene`、`.anim`、`.mtl` 等）的操作时，必须遵循此原则。此规则区分"可脚本操作"与"禁止脚本操作"的文件类型，防止因直接修改序列化文件导致的 `__id__` 偏移、引用断裂等灾难性问题。

## 核心规则

### 绝对禁止脚本写入的文件类型

| 扩展名 | 说明 |
|--------|------|
| `.prefab` | Prefab 序列化文件 |
| `.scene` | 场景序列化文件 |
| `.anim` | 动画剪辑文件 |
| `.mtl` | 材质文件 |

**禁止使用的工具**：Python `json.dump`、Node.js `fs.writeFile`、`sed`、`awk`、shell 重定向写入。

**原因**：这些文件使用 Cocos 内部序列化格式，包含 `__id__` 索引引用。任何外部工具写入都可能导致：
- `__id__` 索引偏移 → 组件引用断裂
- 序列化格式不兼容 → 编辑器无法打开
- UUID 映射丢失 → 资产关联断开

### 允许的操作方式

| 操作类型 | 允许的工具 |
|----------|-----------|
| 修改 prefab/scene/anim | Cocos Editor GUI 或 MCP API（PAT-001 流程） |
| 只读审计/分析 | Python `json.load`、`grep`、`jq`（只读） |
| 修改 `.ts` / `.js` 代码文件 | 任何文本编辑工具、脚本 |
| 修改 `.json` 配置文件（非序列化） | 任何文本编辑工具、脚本 |
| 修改 `.meta` 文件 | 极度谨慎，优先使用编辑器 |

### 结构性修改的正确方式

当需要对 prefab/scene 进行结构性修改（添加/删除组件、修改节点树）时：

1. 使用 MCP API 实例化目标 prefab
2. 通过 MCP API 进行修改
3. `scene_save_scene` → `prefab_update_prefab` 两步保存
4. 清理临时节点

完整流程参见 [[PAT-001__mcp-prefab-workflow|PAT-001]]。

## 判断决策树

```
需要操作 Cocos 文件？
├─ 文件是 .prefab / .scene / .anim / .mtl？
│  ├─ 需要修改？ → 使用 Cocos Editor 或 MCP API
│  └─ 只需读取/分析？ → 可以用脚本 (json.load, grep)
├─ 文件是 .ts / .js？
│  └─ 可以用任何文本编辑工具
└─ 文件是 .json 配置（非序列化）？
   └─ 可以用任何文本编辑工具
```

## 反模式

| 错误做法 | 后果 | 对应错误 |
|----------|------|---------|
| Python 脚本 json.dump 写入 .prefab | `__id__` 偏移，组件引用全部断裂 | ERR-006 |
| sed/awk 修改 .scene 文件 | 序列化格式损坏 | ERR-002 |
| 复制其他 prefab 的 JSON 片段粘贴 | UUID 冲突，资产映射混乱 | — |

## 关联错误

- [[ERR-002__python-modify-cocos-prefab|ERR-002]] — 禁止用脚本修改 Cocos 资产文件
- [[ERR-005__python-json-dump-prefab-id-shift|ERR-005]] — Python json.dump 导致 prefab __id__ 索引偏移
