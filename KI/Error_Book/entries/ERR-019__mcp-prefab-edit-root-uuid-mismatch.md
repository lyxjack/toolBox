---
id: ERR-019
type: error
errorCode: BHV-003
severity: high
status: open
recurrence: 1
firstSeen: 2026-05-14
tags:
  - error/high
  - engine/cocos
  - tool/mcp
  - asset/prefab
  - errorCode/BHV-003
  - ki/error-book
prevention: "MCP prefab_open_edit_mode 返回的 rootNodeUuid 指向 edit-mode scene 的临时容器（cc.Canvas），不是 prefab 真正的根。任何 component_attach_script / component_add_component / set_*_property 之前，必须用 node_find_node_by_name('<prefab 根节点名>') 拿真根 UUID。错 UUID 的 attach 会被 v1.6.2 wrapper 接受为 success 但 close edit mode 时 silently 丢失（不写入 .prefab 文件）。"
aliases:
  - ERR-019
---

# MCP prefab_open_edit_mode 返回的 rootNodeUuid 不是 prefab 真正的根

## 错误现象

调用 `mcp__cocos-creator__prefab_open_edit_mode(prefabPath)` 后返回 `rootNodeUuid` 字段，**字段名误导** —— 实际上这个 UUID 指向 edit-mode 临时 scene 的 canvas-equivalent 容器节点（带 `cc.Canvas`），而不是 prefab 真正的根节点（即用户在编辑器里看到的"prefab 名字"那个节点）。

直接用这个错 UUID 操作：
- `component_attach_script` wrapper 返回 `success: true`，看起来挂上了
- `prefab_save_edit` + `prefab_close_edit_mode` 也都 success
- **但 .prefab 文件 diff 看不到新组件** —— silent save loss
- 重新打开 edit mode 再 attach 同一脚本，v1.6.2 wrapper 报 false-fail `"count did not increase (before=4, after=5)"`（计数实际有增加，wrapper 判定 buggy；同时 UUID 仍错则依旧不持久化）

**实例**：REQ-20260514-123313 创建 `tutorialView.prefab` + `tutorialViewCmpt` 挂载：
- `prefab_open_edit_mode` 返回 `rootNodeUuid: c5vg3fzilGZLpu+cj1kKhK`
- `component_query` 该 UUID 拿到 `[cc.UITransform, cc.Canvas, cc.Widget]` —— 含 `cc.Canvas`，不是 prefab 真正根上的 `cc.BlockInputEvents`
- 真正 prefab 根 UUID：`node_find_node_by_name('tutorialView')` → `f2vj9FKwdDaZGb42ZZ5bP+`
- 用对的 UUID attach + save + close(save:true) 一气呵成，.prefab 文件才正确写入 cid

## 根因分析

Cocos Creator prefab edit mode 把 prefab 实例化为临时 scene 树：

```
edit-mode scene root (cc.Scene)
└── <临时根容器，挂 cc.Canvas + cc.Widget>          ← MCP 返回的"rootNodeUuid"
    └── <prefab 真正的根>                              ← 用户期望的 root
        ├── child1
        └── ...
```

`prefab_open_edit_mode` 的 wrapper 把"edit-scene 容器节点"当 root 返回了 —— 这是字段语义错位。

后果：给容器节点挂的组件属于 **临时 edit-scene**，不属于 prefab 本身的节点树，close edit mode 时**不会被写回 .prefab 文件**，且没有任何报错。

## 解决方案

**正确 SOP**：

```js
// 1. 打开 edit mode
const { data } = await prefab_open_edit_mode({ prefabPath });
// data.rootNodeUuid 不可信，仅记录用

// 2. 拿真正的 prefab 根
const { data: { uuid: realRoot } } = await node_find_node_by_name({
  name: '<prefab 根节点名>'   // 与 prefab 文件名/prefabName 一致
});

// 3. 所有后续 component_* 用 realRoot
await component_attach_script({ nodeUuid: realRoot, scriptPath });
// await component_add_component({ nodeUuid: realRoot, componentType });
// await component_set_component_property({ nodeUuid: realRoot, ... });

// 4. 保存 + 关闭（顺序：save → close(save:true)，双保险）
await prefab_save_edit();
await prefab_close_edit_mode({ save: true });

// 5. 离线 grep 验证 .prefab 实际持久化（必跑）
```

**Bash 校验**（每次改完 prefab 必跑）：

```bash
python3 -c "
import json
with open('assets/resources/prefab/ui/X.prefab') as f: d=json.load(f)
for i,o in enumerate(d):
    if isinstance(o,dict) and o.get('__type__')=='cc.Node' and o.get('_name')=='X':
        print('components:', [(c['__id__'], d[c['__id__']].get('__type__')) for c in o.get('_components',[])])
        break
"
```

如果期望挂的组件不在列表里 → 立刻按 SOP 重做。

## 预防规则

**Agent 在以下场景必须先 audit 真根 UUID**：

1. 任何 `prefab_open_edit_mode → component_*` 操作链
2. MCP `prefab_save_edit` 报 success 但 .prefab 文件 diff 看不到改动
3. attach_script 报 false-fail `"count did not increase"` 但实际数字有增加
4. 用 `prefab_open_edit_mode` 返回的 `rootNodeUuid` 做 `component_query` 时看到 `cc.Canvas` 出现 —— 几乎肯定是 edit-scene 容器，不是 prefab 根

**绝对禁止**：
- 直接信任 `prefab_open_edit_mode.rootNodeUuid` 做 component 操作
- close edit mode 用 `save: false`（即使 save_edit 已成功也建议 save:true 兜底）
- 改完 prefab 不跑离线 grep 验证就报告 "已完成"

> CI: Tier 2 only — 这是 MCP 工具行为，无法用静态规则覆盖。Tier 2 召回 = 用户说"挂脚本"、"加组件到 prefab"、"prefab 改完发现没生效"时优先加载本条。

## 关联

- ERR-002 / ERR-005: 禁止脚本写 .prefab JSON（本错题修复方式仍是 MCP，只是改 UUID 用法）
- ERR-015: prefab 节点改名/重排后 viewList 路径失效（同属"MCP prefab 操作"姊妹系列）
- `.claude/Internal_KI/mcp_editor_flow_sop.md`: MCP 编辑器流 SOP（应加 "rootNodeUuid 不可信" 条款）
- feedback_mcp_prefab_save: MCP 修改 prefab 必须 scene_save → prefab_update 两步才写入磁盘（本错题是该 feedback 的姊妹规则 —— prefab edit mode 流的细化）
- 实例 session：`.in-process/active/20260514-123313_tutorial/verification_log.md` T3 段
