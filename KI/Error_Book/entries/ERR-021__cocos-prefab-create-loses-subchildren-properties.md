---
id: ERR-021
type: error
errorCode: BHV-005
severity: high
status: open
recurrence: 2
firstSeen: 2026-05-15
tags:
  - error/high
  - engine/cocos
  - tool/mcp
  - asset/prefab
  - errorCode/BHV-005
  - ki/error-book
prevention: "用 prefab_create_prefab 把场景临时节点 serialize 成 prefab 时，sub-children 的 component property（如 cc.Sprite.color、cc.Sprite.spriteFrame、cc.UITransform.contentSize 在节点构造期间通过 MCP 设的值）会被部分丢失 — 只保留 prefab_create_prefab 调用瞬间引擎认为"持久化" 的字段。建议：prefab 创建完后**立即重新 prefab_open_edit_mode**，所有 sub-children 的 sprite/color/size 重新设一遍并 save_edit。不要假设场景里设过的值会被 create_prefab 完整继承。"
aliases:
  - ERR-021
---

# Cocos prefab_create_prefab 序列化时丢失 sub-children 的 component property

## 错误现象

工作流：
1. 在场景临时父节点下用 `node_create_node` + `component_add_component` 创建一棵节点树（root + 多个子节点）
2. 对子节点们用 `component_set_component_property` / `component_batch_set_properties` 设 sprite-frame / color / contentSize / type 等
3. `prefab_create_prefab(nodeUuid: root, savePath, prefabName)` 落盘
4. 删临时根节点，验证 .prefab 文件

期望：.prefab 完整保留所有 sub-children 的属性。
实际：**部分 sub-children 的 cc.Sprite.color 丢回默认白色，spriteFrame 丢回 None**。

实例 REQ-20260514-123313 创建 `tutorialView.prefab`:
- 临时场景里给 maskPanel 设过 `Sprite.color = (0,0,0,180)` —— `set_component_property` 返回 success + changed:true
- `prefab_create_prefab` 后看 .prefab，maskPanel.Sprite.color = (255,255,255,255)（白色默认）
- 同样 maskPanel.Sprite.spriteFrame 也丢了

副作用：依赖 sub-children 属性的功能 silent 失效（如 dim mask 没颜色 = 不渲染 = popup 没暗背景）。

**复发实例 REQ-20260611-211308**（cocos-mcp-server 1.6.1，创建 `XXLEntryLayer_p.prefab`）：
- mask 节点 `cc.Sprite.color` 在场景设 (0,0,0,140) → `prefab_create_prefab` 后磁盘 `_color = null`（丢失）
- 本实例 **spriteFrame / contentSize / 脚本组件全部完好，仅丢 color** —— 说明丢失是字段级、不固定，必须逐字段审计
- 按 SOP 重 `prefab_open_edit_mode` → `node_find_node_by_name('mask')` 取真根 → 重设 color (0,0,0,140) → save_edit → 磁盘只读复检通过
- 印证：1.6.1 下 create_prefab 仍丢 `cc.Sprite.color`；叠加 [[ERR-034__cocos-mcp-server-161-property-whitelist-and-tool-gaps|ERR-034]] 的属性白名单，复杂弹窗须全程磁盘只读审计兜底

## 根因分析

`prefab_create_prefab` 内部走的路径：
1. Cocos 引擎读源节点 + 所有子孙的 serialized state（节点树）
2. 写入 .prefab 文件

但是！通过 MCP `set_component_property` 在场景里运行时设的属性值，可能：
- 仅在 component 实例的 runtime state 里，**没回写到 prefab info 系统**
- 或者写到了 `__editorExtras__` 但 prefab 文件序列化时只读官方字段

`prefab_create_prefab` 的引擎 API 走的是 "asset 资源序列化"路径，不是 "scene 节点克隆" 路径，所以丢部分属性。

观察：
- UITransform 的 contentSize 通常**保留**（顶层组件属性，引擎直接读）
- cc.Sprite 的 spriteFrame **可能丢**（spriteFrame 是 asset reference，prefab serialize 时如果 source 节点的 spriteFrame 未持久化就回 None）
- cc.Sprite 的 color **可能丢回默认**

跟 ERR-005 类似（Python json.dump 让 id 错位），ERR-021 是 MCP create_prefab 让 property 错位。

## 解决方案

### 主流程：create_prefab 后立即重 open_edit_mode 补属性

```ts
// 1. 创建 prefab（接受部分属性可能丢失）
await prefab_create_prefab({ nodeUuid: tempRoot, savePath: 'db://.../X.prefab', prefabName: 'X' });

// 2. 立即打开 prefab edit mode，重设所有 sub-children 属性
await prefab_open_edit_mode({ prefabPath: 'db://.../X.prefab' });
const realRoot = (await node_find_node_by_name({ name: 'X' })).data.uuid;
// 遍历每个 sub-child，重新 set color / spriteFrame / 其他
for (const child of subChildren) {
    const childUuid = (await node_find_node_by_name({ name: child.name })).data.uuid;
    await component_set_component_property({
        nodeUuid: childUuid, componentType: 'cc.Sprite',
        property: 'spriteFrame', propertyType: 'spriteFrame', value: child.spriteFrameUuid,
    });
    await component_set_component_property({
        nodeUuid: childUuid, componentType: 'cc.Sprite',
        property: 'color', propertyType: 'color', value: child.colorHex,
    });
    // ...
}
await prefab_save_edit();
await prefab_close_edit_mode({ save: true });

// 3. python 验证 .prefab 真的写入了
```

### 验证脚本

每次 create_prefab 完成后必跑：

```bash
python3 -c "
import json
d=json.load(open('assets/resources/prefab/ui/X.prefab'))
for o in d:
    if isinstance(o,dict) and o.get('__type__')=='cc.Sprite':
        print('Sprite color:', o.get('_color'))
        print('Sprite spriteFrame:', o.get('_spriteFrame'))
"
```

把每个 sub-child 的关键属性 dump 出来，对照期望值。

## 预防规则

**任何时候创建复杂 prefab（多个 sub-children 各自有视觉属性）**：

1. 不要在临时场景节点上设完属性就直接 `prefab_create_prefab` 完事 — 把它当做"勾画结构"
2. create_prefab 完之后必须 `prefab_open_edit_mode` 重设属性补救
3. 改完 save → close → python 验证 sub-children 的 `_color` / `_spriteFrame` / 其他视觉字段都在
4. **特别盯 cc.Sprite.color / spriteFrame** — 这俩最容易掉。其他 propertyType=asset/spriteFrame/color 都要警惕
5. 顶层 cc.UITransform / cc.Widget / 组件类型本身一般不丢，但 sub-Sprite 的 color/frame 必查

> CI: Tier 2 only — 这是 MCP/Cocos 引擎运行时序列化行为，损失在 prefab_create_prefab 调用过程中发生，源码层面无法用静态 regex 检测。Tier 2 召回 = 用户/Agent 走 "node_create_node + set property + prefab_create_prefab" 工作流时优先加载本条。

## 关联

- [[ERR-043__mcp-prefab-edit-root-uuid-mismatch|ERR-043]]: MCP prefab_open_edit_mode rootNodeUuid 不可信（重 open 补属性时要走 node_find_node_by_name）
- ERR-005: Python json.dump prefab id 错位（不同坑，但同属 "prefab 序列化失真" 家族）
- ERR-013: partial-prefab-copy 断 layout（同属 prefab 改造的踩坑序列）
- 实例 session: `.in-process/active/20260514-123313_tutorial/` 创建 tutorialView.prefab 期间踩到
