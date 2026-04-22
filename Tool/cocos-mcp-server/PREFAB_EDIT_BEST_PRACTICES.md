# Prefab 编辑最佳实践

> **受众**:使用 Cocos MCP Server 修改 `.prefab` 资源的 AI agent / 工程师
>
> **背景**:Prefab 编辑是 MCP 链路**最易出错**的场景之一(见 `MCP_AUDIT_REPORT.md` §3.2)。本文档给出已经过实战验证的 "6 + N 件套" 标准 sequence,以及失败时的回滚路径。
>
> **同类型错误条目**:`KI/Error_Book/entries/ERR-002` / `ERR-004` / `ERR-005`(全局 Error Book)

---

## TL;DR

修改 prefab 必须走 **MCP 工具**,**绝对禁止脚本 / sed / awk / Python 直接改 `.prefab` JSON**(见 ERR-002 / ERR-005)。正确 sequence 如下:

```
1. prefab_open_edit_mode
2. sceneAdvanced_begin_undo_recording   ← 事务开始
3. node_*  /  component_*                ← 任意多次修改操作
4. sceneAdvanced_end_undo_recording     ← 事务提交(失败走 cancel_undo_recording)
5. scene_save_scene                      ← 把编辑态临时场景写回内存
6. prefab_save_edit                      ← 从编辑态落盘 prefab
7. prefab_update_prefab(可选)            ← 如需同步到 prefab 实例
8. prefab_close_edit_mode                ← 退出编辑模式
```

---

## 为什么要这样做

| 步骤 | 为什么不能跳过 |
|---|---|
| `prefab_open_edit_mode` | 不进编辑模式 `node_*` / `component_*` 写不到 prefab 本体,只会加在当前场景实例上 |
| `begin/end_undo_recording` | Cocos 编辑器内部的事务单元;不包事务,Undo/Redo 无法还原到批量操作的起始点 |
| `scene_save_scene` | 编辑态其实是"打开了一个临时场景",内存中的变更必须先入场景快照 |
| `prefab_save_edit` | **从临时场景回写 prefab 文件的唯一落盘路径**。遗漏这一步 = 修改丢失 |
| `prefab_close_edit_mode` | 不关闭编辑模式,后续的场景操作会写到错误的上下文 |

---

## 禁止事项

### ❌ 禁止:脚本直接写 `.prefab` JSON

```python
# 这样做会爆炸(ERR-002 + ERR-005)
with open('assets/prefabs/xxx.prefab', 'w') as f:
    json.dump(modified_data, f)
```

**原因**:
- **浮点精度污染**(ERR-002):`54.4` → `54.400000000000006`,级联编辑全部损坏
- **class ID 展开**(ERR-005):压缩的 `f5a2e` 被 JSON dump 为全名 `cc.Sprite`,加载时 MissingScript 报错

### ❌ 禁止:漏了 `scene_save_scene` 直接 `prefab_save_edit`

在某些 Cocos 版本下,`prefab_save_edit` 依赖场景先 save。**遗漏会导致修改静默丢失,且日志无警告**。

### ❌ 禁止:忘记 `prefab_close_edit_mode`

不关闭编辑模式会污染后续场景工具的调用上下文。表现:之后调 `node_create_node` 节点被加到了 prefab 而不是场景;调 `scene_save_scene` 保存了编辑态临时场景而非主场景。

---

## 回滚路径(事务失败时)

如果 step 3 的修改中途出错,必须 rollback:

```
1. sceneAdvanced_cancel_undo_recording   ← 撤销事务,不写入 undo stack
2. prefab_close_edit_mode(save=false)    ← 退出编辑模式,丢弃临时场景变更
```

**不要**在异常路径上调 `prefab_save_edit` 或 `prefab_update_prefab` — 那会把中途的脏状态落盘。

---

## 示例:给 prefab 加一个 Button

```json
[
  { "tool": "prefab_open_edit_mode",
    "args": { "prefabPath": "db://assets/prefabs/MainUI.prefab" } },

  { "tool": "sceneAdvanced_begin_undo_recording", "args": {} },

  { "tool": "node_create_node",
    "args": { "name": "btnStart", "parentUuid": "<rootUuid>" } },
  { "tool": "component_add_component",
    "args": { "nodeUuid": "<btnUuid>", "componentType": "cc.Button" } },
  { "tool": "component_set_component_property",
    "args": { "nodeUuid": "<btnUuid>",
              "componentType": "cc.UITransform",
              "property": "contentSize",
              "value": { "x": 160, "y": 60 } } },

  { "tool": "sceneAdvanced_end_undo_recording", "args": {} },
  { "tool": "scene_save_scene", "args": {} },
  { "tool": "prefab_save_edit", "args": {} },
  { "tool": "prefab_close_edit_mode", "args": {} }
]
```

**9 次 MCP 调用**(不含查询)。如果用未来的 `prefab_edit_transaction` 封装(P2 规划),可降到 1 次。

---

## 常见踩坑速查

### ERR-004:UI 节点 layer 默认错误

在 prefab 里 `node_create_node` 创建 UI 节点时,**必须显式传 `layer` 参数 = `UI_2D`**(32),否则用 `Default` layer 导致渲染不出来。

```json
{ "tool": "node_create_node",
  "args": { "name": "Icon",
            "parentUuid": "<uiRootUuid>",
            "layer": 33554432 } }
```

### ERR-005:prefab JSON class ID shift

**不要**读 `.prefab` 文件内容再写回。压缩 class ID 会被展开,加载时 MissingScript。必须走 MCP 工具。

### 字体(TTFFont)挂载限制

MCP 目前**无法**直接在 `cc.Label.font` 上挂 TTFFont 资源(见审计 §8.2)。workaround:脚本里 `bundle.load` 运行时动态加载,或走编辑器 GUI。

---

## 相关工具一览

| 工具 | 位置 | 作用 |
|---|---|---|
| `prefab_open_edit_mode` | prefab-tools | 进入编辑模式 |
| `prefab_save_edit` | prefab-tools | 把编辑态写回 prefab 文件 |
| `prefab_close_edit_mode` | prefab-tools | 退出编辑模式(可选 save)|
| `prefab_update_prefab` | prefab-tools | 把 prefab 变更同步到已实例化的节点 |
| `sceneAdvanced_begin_undo_recording` | scene-advanced-tools | 事务起点 |
| `sceneAdvanced_end_undo_recording` | scene-advanced-tools | 事务提交 |
| `sceneAdvanced_cancel_undo_recording` | scene-advanced-tools | 事务撤销(rollback)|
| `scene_save_scene` | scene-tools | 场景落盘(编辑态也是一个临时场景)|

---

## 延伸阅读
- `MCP_AUDIT_REPORT.md` §3.2 — Prefab 编辑链路深度分析
- `MCP_FEEDBACK_AND_PROPOSAL.md` §2 — 实战痛点(kingDianPuzzle 20+ commit 证据)
- `KI/Error_Book/entries/ERR-002__python-modify-cocos-prefab.md`
- `KI/Error_Book/entries/ERR-004__mcp-prefab-layer-ui2d.md`
- `KI/Error_Book/entries/ERR-005__python-json-dump-prefab-id-shift.md`
