# Cocos Creator MCP — 需求反馈与改进方案

> **本文件**：基于 `kingDianPuzzle` 项目"星星之路"（v2.0 ~ v2.2，约 20+ commit 实战）过程中遇到的所有 Cocos MCP 痛点、缺失能力、以及工具精简建议的综合档案。
>
> **目标读者**：Cocos MCP Server 的维护/开发者，或负责相关改进的 AI / 工程师。
>
> **使用方式**：本档是**单一入口**，所有需求与问题归档于此，另开一个 Claude Code 窗口读这一个 md 即可上下文对齐，无需交叉索引其他文件。

---

## 目录

1. [背景与方法论](#1-背景与方法论)
2. [Prefab 编辑链路痛点 + 新工具建议](#2-prefab-编辑链路痛点--新工具建议)
3. [资源导入缺陷与修复](#3-资源导入缺陷与修复)
4. [UI 批量构建需求](#4-ui-批量构建需求)
5. [工具精简建议](#5-工具精简建议)
6. [切片索引架构设计（核心）](#6-切片索引架构设计核心)
7. [优先级与实施路线图](#7-优先级与实施路线图)
8. [实际案例 — 星星之路完整链路](#8-实际案例--星星之路完整链路)

---

## 1. 背景与方法论

### 1.1 项目背景

`kingDianPuzzle` 是一个嵌入在滚子（骰子）平台里的三消子游戏（Cocos Creator 3.8.3 + TypeScript）。"星星之路"是一个多里程碑奖励系统（33 固定里程碑 + 无限循环期），UI 里包含：滚动列表 / 纵向进度条 / 多图标奖励网格 / 小恐龙装饰 / 多层级状态切换。

2026-04 全程由 Claude Code 通过 Cocos MCP 协助实现。完成了 20+ commit（v2.0 整行点击 → v2.1 UI 多图标 → v2.2 桥接与 CI 测试），期间高频使用以下 MCP 类别：
- `prefab_*`（开/关编辑模式、instantiate、update）
- `node_*`（create / set_property / set_transform）
- `component_*`（add / set_property）
- `project_*`（refresh_assets / reimport_asset）
- `assetAdvanced_*`（save_asset_meta）
- `debug_*`（console logs、get_node_tree）

低频或零触发（整个项目周期内基本没用）：`sceneView_*` / `referenceImage_*` / `preferences_*` / `broadcast_*` / `server_*`。

### 1.2 方法论

本档结论基于：
- **错题本**：`/Users/jackliu/toolBox/KI/Error_Book/entries/` 下与 MCP 相关的 ERR-002 / ERR-016 / ERR-018 等条目
- **会话记忆**：`.claude/projects/.../memory/feedback_mcp_*.md` 若干条
- **实战 commit 历史**：星星之路从零到完工的提交记录
- **工具调用统计**：粗略回看每类工具的调用频次

### 1.3 贯穿全篇的两大核心问题

| 问题 | 表现 | 影响范围 |
|------|------|---------|
| **Token 开销** | 158 工具的 schema 全量进会话，首载 ~15k token | 每次对话的固定税，影响长会话的有效上下文 |
| **操作碎片化** | 做 1 个 UI 节点需要 5-6 次 MCP 调用 | 高频任务的 round-trip 延迟 + 出错点增多 |

**本档提出的解法**：
1. **工具合并**（按 action 参数合并同族，降低数量）
2. **批量工具**（新增 batch / transaction 类工具，单次调用完成复杂操作）
3. **切片索引加载**（参考 toolBox Agent 的 anchor-based 架构，会话启动只载核心，按需拉取其余）

---

## 2. Prefab 编辑链路痛点 + 新工具建议

### 2.1 痛点

#### 2.1.1 ERR-016 — class ID 污染

**症状**：调 `prefab_update_prefab` 直接写 prefab 的 JSON 结构时，压缩 class ID（如 `f5a2e`）会被替换为字符串全名（如 `cc.Sprite`），导致场景加载时报 **MissingScript** 错误。

**修复路径**（我们摸索出来的）：
1. 先用 `prefab_open_edit_mode` 打开 prefab 编辑模式
2. 用 `node_*` / `component_*` 修改
3. **必须先 `scene_save_scene`**（保存的是 edit 态的临时场景）
4. **再 `prefab_update_prefab`** 才能把变更写回磁盘
5. 最后 `prefab_close_edit_mode`

**问题**：
- 四步落盘，任何一步漏/错都会静默失败或数据损坏
- `prefab_update_prefab` 文档没说必须先 `scene_save`
- instantiate 模式（在当前场景实例化一个 prefab 节点修改）和 edit 模式互斥，没写清何时用哪个

#### 2.1.2 ERR-002 — 禁止脚本改 prefab/.scene JSON

不相关于 MCP 工具本身，但值得在 MCP 文档里警示：用 Python / sed / awk 直接改 prefab / scene 的 JSON 会引入浮点精度污染（`54.4` → `54.400000000000006`），导致级联编辑失败。**所有修改必须走 MCP 或编辑器 GUI**。

### 2.2 提议新工具

#### 2.2.1 `prefab_edit_transaction`（原子事务）

```typescript
{
    prefabUrl: string,
    operations: Array<{
        type: 'create_node' | 'set_property' | 'add_component' | 'set_component_property' | 'delete_node',
        // ... 对应 type 的参数
    }>,
    autoSave?: boolean  // 默认 true：自动 scene_save → prefab_update → close
}
```

**效果**：
- 内部自动完成 open_edit → apply ops → scene_save → prefab_update → close 全链路
- 任何一步失败自动 rollback（close 时不 save）
- 文档明确说明它等价于"4 步手工流程 + 原子性保证"

**示例**：
```json
{
  "prefabUrl": "db://assets/resources/prefab/ui/starRoadView.prefab",
  "operations": [
    { "type": "create_node", "parent": "itemTemplate", "name": "newSlot", "layer": "UI_2D" },
    { "type": "add_component", "node": "itemTemplate/newSlot", "componentType": "cc.Sprite" },
    { "type": "set_component_property", "node": "itemTemplate/newSlot", "componentType": "cc.UITransform",
      "property": "contentSize", "value": { "x": 60, "y": 60 } }
  ]
}
```

#### 2.2.2 `prefab_add_ui_node`（UI 快捷）

```typescript
{
    parentPath: string,
    name: string,
    size?: { width: number, height: number },
    pos?: { x: number, y: number, z?: number },
    sprite?: {
        spriteFrameUrl?: string,
        sizeMode?: 'TRIMMED' | 'RAW' | 'CUSTOM',
        type?: 'SIMPLE' | 'SLICED' | 'TILED' | 'FILLED'
    },
    label?: {
        string: string,
        fontSize?: number,
        isBold?: boolean,
        color?: { r: number, g: number, b: number, a?: number },
        fontUrl?: string
    },
    layer?: 'UI_2D' | 'UI_3D' | 'Default'  // 默认 UI_2D
}
```

**效果**：一次调用完成 "新节点 + UITransform + Sprite/Label + position/size + UI_2D layer"。替代 5-6 个零散调用。

---

## 3. 资源导入缺陷与修复

### 3.1 ERR-018 — `project_refresh_assets` 生成的 meta 三连缺陷

导入新 png 时（`project_refresh_assets` → auto-generate meta）：

| 缺陷 | 错误值 | 正确值 |
|------|--------|--------|
| `userData.type` | `"texture"` | `"sprite-frame"` |
| `subMetas.f9941`（sprite-frame 子 meta）| 缺失 | 必须存在（含 UV / border / vertices）|
| `subMetas.6c48a.userData.wrapModeS/T`（非 POT）| `"repeat"` | `"clamp-to-edge"` |

### 3.2 临时修复链路（实战验证）

本次 `cardProps/` 导入 7 张 png，跑了以下调用：

```
1× project_refresh_assets      (触发 meta 生成，但 type 错、缺 f9941、wrap 错)
7× project_reimport_asset      (每个文件单独 reimport，修 type 和 f9941)
7× assetAdvanced_save_asset_meta  (每个文件单独改 wrap 从 repeat → clamp-to-edge)
= 15 次 MCP 调用（7 张图）
```

理想情况应该 **1 次**调用搞定。

### 3.3 提议修复

#### 3.3.1 `project_refresh_assets` / `project_reimport_asset` 增强默认

```typescript
{
    url?: string,  // 单个或目录
    folder?: string,
    // 新增：
    autoSpriteFrame?: boolean,   // 默认 true — png 自动作为 sprite-frame 处理
    autoClampNonPot?: boolean,   // 默认 true — 非 POT 自动 clamp-to-edge
    sliceBorder?: { top: number, bottom: number, left: number, right: number }  // 可选九宫格
}
```

#### 3.3.2 `assets_batch_configure`（新）

针对已经导入但 meta 错的资源批量修：

```typescript
{
    urls: string[],
    config: {
        type?: "sprite-frame" | "texture",
        wrapModeS?: "repeat" | "clamp-to-edge" | "mirrored-repeat",
        wrapModeT?: "repeat" | "clamp-to-edge" | "mirrored-repeat",
        border?: { top: number, bottom: number, left: number, right: number }
    }
}
```

一次调用配完 N 个资源。

#### 3.3.3 `sprite_set_slice_border` / `sprite_get_slice_border`

九宫格 border 专用，参考场景：进度条 / 按钮底板 / 面板背景。实现：修改 `.png.meta` 的 `subMetas.f9941.userData` 里的 `borderTop/Bottom/Left/Right`。

```typescript
{
    assetUrl: string,
    borderTop: number,
    borderBottom: number,
    borderLeft: number,
    borderRight: number
}
```

实际用到九宫格 border 的资源（本次项目实例）：

| 资源 | 尺寸 | 需要的 border |
|------|------|--------------|
| reward_bar_bg.png | 110×95 | ~25 all |
| reward_progress_bg.png | 94×35 | L15 R15 T8 B8 |
| reward_progress_fill.png | 84×28 | L12 R12 T6 B6 |
| item_normal.png | 486×143 | ~20 all |
| item_claimable.png | 486×143 | ~20 all |
| item_locked.png | 486×143 | ~20 all |

#### 3.3.4 `sprite_set_texture_wrap_mode`

如果 `project_refresh_assets` 不做 autoClamp 默认，至少补一个单独的 wrap mode 设置工具：

```typescript
{
    assetUrl: string,
    wrapModeS: "repeat" | "clamp-to-edge" | "mirrored-repeat",
    wrapModeT: "repeat" | "clamp-to-edge" | "mirrored-repeat"
}
```

### 3.4 本次项目受影响资源（全非 POT，共 24 个）

starRoad 17 个 + cardProps 7 个，全部需要手动 clamp：

```
starRoad/: bg 666×1200, item_normal/claimable/locked 486×143, big_star 123×79,
           check_done 87×82, dragon 91×89, gift_box 87×94,
           progress_bar_bg 43×112, progress_bar_fill 35×108,
           reward_bar_bg 110×95, reward_progress_bg 94×35, reward_progress_fill 84×28,
           reward_text 100×29, reward_title 161×42, star_node 93×93, star_road_icon 110×109

cardProps/: rose, duck, firecracker, card_counter, brick, egg, good（7 个 170×170）
```

---

## 4. UI 批量构建需求

### 4.1 痛点

构建 reward 奖励网格的一个 slot（Sprite + Label + 定位），典型序列：

```
node_create_node           (parent=rewardBox, name=slot_gold)
component_add_component    (node=slot_gold, comp=cc.UITransform)
component_set_component_property  (node=slot_gold, comp=cc.UITransform, prop=contentSize, value={x:60,y:78})
component_add_component    (node=slot_gold, comp=cc.Sprite)
component_set_component_property  (node=slot_gold, comp=cc.Sprite, prop=spriteFrame, value=<uuid>)
node_set_node_transform    (node=slot_gold, pos={x:0,y:14})
... (再做 label 子节点)
```

同类 Label 的属性（fontSize / isBold / color / font / alignment）每个一次 `component_set_component_property`。Layout 的 type / resizeMode / spacingX / paddingL/R/T/B / direction 同理。

### 4.2 提议新工具

#### 4.2.1 `node_create_ui_node`（本档 §2.2.2 已定义 `prefab_add_ui_node`，本条用于非 prefab 场景）

场景模式下直接用，参数同 §2.2.2。

#### 4.2.2 `component_batch_set_properties`

```typescript
{
    nodePath: string,
    componentType: string,
    properties: Record<string, any>
}
```

例：
```json
{
  "nodePath": "Canvas/itemTemplate/slot_gold/lbCount",
  "componentType": "cc.Label",
  "properties": {
    "string": "×5000",
    "fontSize": 22,
    "isBold": true,
    "color": { "r": 80, "g": 50, "b": 20, "a": 255 }
  }
}
```

#### 4.2.3 `ui_set_label` / `ui_set_layout` / `ui_set_sprite`（语义快捷）

封装 `component_batch_set_properties` 的 UI 语义层：

```typescript
ui_set_label(nodePath, {
    string?, fontSize?, isBold?, isItalic?, isUnderline?,
    color?, fontUuid?, lineHeight?,
    horizontalAlignment?: 'LEFT' | 'CENTER' | 'RIGHT',
    verticalAlignment?: 'TOP' | 'CENTER' | 'BOTTOM',
    overflow?: 'NONE' | 'CLAMP' | 'SHRINK' | 'RESIZE_HEIGHT'
})

ui_set_layout(nodePath, {
    type?: 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID',
    resizeMode?: 'NONE' | 'CHILDREN' | 'CONTAINER',
    spacingX?, spacingY?,
    paddingLeft?, paddingRight?, paddingTop?, paddingBottom?,
    horizontalDirection?: 'LEFT_TO_RIGHT' | 'RIGHT_TO_LEFT',
    verticalDirection?: 'TOP_TO_BOTTOM' | 'BOTTOM_TO_TOP'
})

ui_set_sprite(nodePath, {
    spriteFrameUuid?, spriteFrameUrl?,
    sizeMode?: 'TRIMMED' | 'RAW' | 'CUSTOM',
    type?: 'SIMPLE' | 'SLICED' | 'TILED' | 'FILLED',
    color?, fillType?, fillStart?, fillRange?
})
```

---

## 5. 工具精简建议

### 5.1 现状

FEATURE_GUIDE_CN.md 记录 **158 工具 / 13 类别**。每个 schema 估算 50-150 token，全量加载 ~15k token。

### 5.2 精简原则

1. **按触发频率分层**：core（每次必用）/ common（周级）/ rare（月级）/ 按需
2. **同族 action 合并**：`xxx_start / xxx_stop / xxx_query` → `xxx({ action })`
3. **罕用类整体降级**：不进默认会话，通过 `tool_search` 按需加载

### 5.3 按类别精简表

| 类别 | 现状 | 建议动作 | 目标 | 频率分级 |
|------|------|---------|------|---------|
| **scene** | 8 | 合并 open/create/save/save_as/close → `scene({action})`；保留 get_current / get_list / get_hierarchy | 8 → 4 | core |
| **node** | 11 | create/delete/duplicate/move 合并 `node({action})`；set_node_property / set_node_transform 合并 | 11 → 5 | core |
| **prefab** | 12 | open/close/save/update 打包 `prefab_edit_transaction`；validate/restore/revert 合为 `prefab_repair({action})` | 12 → 5 | core |
| **component** | 7 | set/get/add/remove 保留；get_info/get_available 合为 `component_query({action})` | 7 → 4 | core |
| **assetAdvanced** | 10 | batch_import/batch_delete/validate_refs/export_manifest 保留；compress_textures 合入；新增 `assets_batch_configure` | 10 → 6 | core |
| **debug** | 8 | console_logs/clear/search/project_logs 合并 `debug_logs({action, query})`；execute_script 独立；node_tree 独立 | 8 → 4 | core |
| **project** | 20 | refresh + reimport 合并；build/preview 族保留；get_assets / query_asset_* 合并为 `asset_query({action})` | 20 → 10 | core |
| **preferences** | 6 | 整体降级 | 6 → 0 | rare |
| **server** | 4 | 精简为 `server_status` 一个 | 4 → 1 | rare |
| **broadcast** | 5 | 整体降级 | 5 → 0 | rare |
| **sceneView** | 14 | 全部降级（gizmo / 2D-3D / focus / align camera — AI 几乎不用）| 14 → 0 | rare |
| **referenceImage** | 10 | 整体降级 | 10 → 0 | rare |
| **sceneAdvanced** | 15 | snapshot / undo / paste / execute_scene_script / execute_component_method 保留；其余降级 | 15 → 6 | common |
| **validation** | 3 | 并入 preferences | 3 → 0 | rare |

**精简后估算**：158 → **约 45 个核心 tool** 默认加载（core 层），其余按需。Token 开销 ~15k → ~5k（节省 ~60%）。

### 5.4 额外的"组合包"思路

`settings/mcp-server.json` 加 `enabledPacks: string[]`：

- `core`（默认开）：scene + node + prefab + component + assetAdvanced + project + debug 核心
- `ui-batch`：新增的 ui_set_* / component_batch_set_properties / node_create_ui_node
- `preview-and-build`：build_project / start_preview_server / stop_preview_server
- `editor-advanced`：sceneView + referenceImage + preferences（给编辑器操控类场景）
- `broadcast-and-validation`：broadcast + validation
- `server-introspection`：server 类

---

## 6. 切片索引架构设计（核心）

### 6.1 参考模型：toolBox/Agent 的 anchor-based

toolBox 的做法值得借鉴：
- `Agent/index/skill_registry.json` — 13 anchors，每个 ~50 字简介，**总 ~1500 token**
- `KI/External_KI/master_index.json` — 分类索引
- 每个 category 有 ONE anchor md file
- **加载策略**：会话只先读 master（~1500 token），AI 决定需要哪个类再加载 anchor（~500-2000 token）

### 6.2 MCP 对应架构

```
cocos-mcp-server/
├── tool_registry.json              ← 根索引（~1500 token）
├── tool_index/
│   ├── scene.json                  ← 单类完整 schemas（~800 token）
│   ├── node.json
│   ├── prefab.json
│   ├── component.json
│   ├── debug.json
│   ├── project.json
│   ├── assetAdvanced.json
│   ├── sceneAdvanced.json
│   ├── preferences.json            ← rare — 不进默认
│   ├── broadcast.json              ← rare
│   ├── server.json                 ← rare
│   ├── sceneView.json              ← rare
│   └── referenceImage.json         ← rare
```

### 6.3 `tool_registry.json` 样板

```json
{
  "_meta": {
    "version": "2.0",
    "totalTools": 158,
    "categories": 13,
    "loadStrategy": "Load tool_registry first, then category indices on demand",
    "maxSingleLoadTokens": 2500
  },
  "categories": [
    {
      "id": "prefab",
      "label": "预制体操作",
      "toolCount": 12,
      "indexFile": "tool_index/prefab.json",
      "frequency": "core",
      "usageNotes": "最高频类别。prefab_update 有 ERR-016 坑：必须先 scene_save"
    },
    {
      "id": "node",
      "label": "节点操作",
      "toolCount": 11,
      "indexFile": "tool_index/node.json",
      "frequency": "core"
    },
    {
      "id": "sceneView",
      "label": "场景视图（相机/gizmo）",
      "toolCount": 14,
      "indexFile": "tool_index/sceneView.json",
      "frequency": "rare",
      "usageNotes": "编辑器相机 / gizmo 操作，AI 几乎不用"
    }
  ]
}
```

### 6.4 单个 tool 的索引条目格式

每个 tool 在 `tool_index/<category>.json` 里的条目建议字段：

```json
{
  "name": "prefab_update_prefab",
  "category": "prefab",
  "frequency": "core",
  "oneLineDesc": "更新 prefab 资源，必须先 scene_save（ERR-016 警告）",
  "params": [
    { "name": "prefabPath", "type": "string", "required": true, "desc": "db:// 格式的 prefab URL" },
    { "name": "nodeId", "type": "string", "required": true, "desc": "编辑模式下的根节点 UUID" }
  ],
  "knownGotchas": [
    "必须先调 scene_save_scene，否则只保存到内存不落盘",
    "直接写 prefab 的 JSON 会破坏压缩 class ID → MissingScript（ERR-016）",
    "和 prefab_instantiate_prefab 互斥：一个用于编辑模式，另一个用于场景实例化"
  ],
  "schemaRef": "tool_index/prefab.json#/prefab_update_prefab",
  "fullSchema": { "...": "..." }
}
```

关键字段：
- **frequency**：决定是否进默认加载
- **usageNotes** / **knownGotchas**：让 AI 第一次看到工具就知道坑（替代事后翻错题本）
- **schemaRef**：支持按 tool 粒度延迟加载 schema

### 6.5 与现有 client-side ToolSearch 的差别

| 方面 | 现有 ToolSearch（client 端 deferred）| 建议的 tool_registry（server 端）|
|------|-----------------------------|--------------------------------|
| 索引来源 | 隐式内置 Claude Code | 显式 JSON 文件，可版本化，随 mcp-server 一起分发 |
| 粒度 | tool 级 | category 级 + tool 级 |
| 首载 token | 0（全量 schemas 已在 prompt 里作为 deferred）| ~5500 token（registry + core category）|
| 按需 token | 单 tool 加载 | category 批量加载（也可 tool 粒度）|
| 自描述 | 需猜 / 调 `ToolSearch` 关键词 | `frequency` / `usageNotes` / `knownGotchas` 字段直接可读 |
| 版本化 | 跟随 Claude Code 版本 | 跟随 mcp-server 版本，独立演进 |

### 6.6 加载流程（建议）

1. **会话启动**：MCP client 从 server 拉 `tool_registry.json`（~1500 token）+ 所有 `frequency="core"` category（约 5 个 × 800 = 4000 token）。**起步 ~5500 token**
2. **AI 按需拉**：
   - 想查"哪个工具能做 XYZ" → 调 `tool_search({ query: "wrap mode" })`，返回候选名单（~200 token）
   - 想"加载 preferences 分类的所有工具" → 调 `tool_search({ loadCategory: "preferences" })`，category schemas 注入会话
3. **mcp-server 支持**：
   - 扩展 server 端协议，增加 `list_categories` / `load_category` 两个 RPC
   - client 侧缓存已加载 category，避免重复拉取

---

## 7. 优先级与实施路线图

### 7.1 紧急度矩阵

| 需求 | 紧急度 | 实现复杂度 | 价值 | 建议阶段 |
|------|-------|-----------|------|--------|
| ERR-018 修复（auto sprite-frame + auto clamp）| 🔴 高 | 低 | 高 — 每次导入都踩 | P0 — 立即修 |
| `assets_batch_configure` | 🔴 高 | 中 | 高 — 批量导入场景 | P0 |
| `prefab_edit_transaction` | 🟠 中 | 高 | 高 — 降低 prefab 出错率 | P1 |
| `node_create_ui_node` / `ui_set_label` 等批量 UI | 🟠 中 | 中 | 中 — 常见 UI 构建加速 | P1 |
| `sprite_set_slice_border` | 🟡 低 | 低 | 中 — 个别九宫格资源用 | P2 |
| 工具合并（scene/node/prefab action 化）| 🟠 中 | 高 | 中 — 降 schema 数量 | P1 |
| 切片索引架构（tool_registry + tool_index/）| 🔴 高 | 高 | 非常高 — 影响所有未来会话 token 成本 | P0 — 架构先行 |
| 整体 rare 类降级 | 🟢 低 | 低 | 中 — 立即减负 | P0（可和切片索引一起做）|

### 7.2 建议实施顺序

**Phase 0（紧急修复 + 架构）**：
1. 修 ERR-018（refresh_assets 默认走 sprite-frame + autoClamp）
2. 新增 `assets_batch_configure`
3. **设计并实现 tool_registry.json + tool_index/ 切片索引架构**
4. 把 rare 类（preferences / broadcast / server / sceneView / referenceImage）标记 rare，不进默认加载

**Phase 1（批量工具 + 链路优化）**：
5. `prefab_edit_transaction`
6. `node_create_ui_node` / `component_batch_set_properties`
7. `ui_set_label` / `ui_set_layout` / `ui_set_sprite`
8. scene / node / prefab 同族合并（通过 action 参数）

**Phase 2（语义层完善）**：
9. `sprite_set_slice_border`
10. 其他次要合并
11. 文档：每个 tool 填 `knownGotchas` 字段

### 7.3 Breaking Change 风险

- 工具合并会改变现有调用签名，需要保留过渡期双写（旧工具 deprecate 标记，新工具上线）
- 切片索引加载属于新增能力，不破坏现有会话（不启用 registry 的 client 依然全量加载）
- rare 类降级会让现有依赖它们的用户需要手动调 `tool_search` 重新加载 — 发 CHANGELOG 通知

---

## 8. 实际案例 — 星星之路完整链路

### 8.1 整个项目的 MCP 调用流水（粗略）

整个 v2.0-v2.2 期间的 MCP 调用分布（估算）：

| 类别 | 调用次数（估算）| 占比 | 代表性场景 |
|------|---------------|------|-----------|
| prefab_* | ~40 | 30% | 开/关编辑模式、update、instantiate、create、validate |
| node_* | ~50 | 37% | 创建 rewardBox/slot/lockedOverlay、set position、get tree |
| component_* | ~25 | 19% | 加 UITransform/Sprite/Label、set contentSize/spriteFrame |
| project_* | ~15 | 11% | refresh_assets、reimport_asset |
| assetAdvanced_* | ~10 | 7% | save_asset_meta（修 wrap） |
| debug_* | ~5 | 4% | get_console_logs、execute_script |
| 其他 | 0 | 0% | sceneView / referenceImage / preferences / broadcast / server 均零调用 |

**结论**：13 类工具里只有 6 类实际产生调用，占总调用量的 **100%**。剩余 7 类整个项目零触发 — 这些类应该全部从默认加载中移除。

### 8.2 具体踩坑 commit 清单（可供后续回溯）

- `0ff4e20` v1.9.9：bgItem 三态重构 — 第一次完整 prefab edit 模式流程（4 步落盘）
- `d36afb4` v2.1.0：33 里程碑数据重写 — 纯代码，无 MCP
- `4dd1288` v2.1.1：UI 多图标 — 大量 node/component 创建，体现碎片化痛点
- `01368d8` cardProps 导入 — ERR-018 最痛的一次，15 次 MCP 调用做 7 张图
- `82de779` v2.1.3 AguBlack 字体 — 发现 MCP 无法直接挂载 TTFFont，只能走 bundle.load
- `2a6ff64` v2.1.5 missile 合并 — 纯代码层
- `771c72d` v2.2.0 桥接 + CI — 纯代码层

---

## 附录 A. 相关错题本条目

- **ERR-002**：严禁脚本写 prefab/.scene JSON（浮点污染）— 本档 §2.1.2
- **ERR-016**：prefab_update_prefab 的 class ID 污染 — 本档 §2.1.1
- **ERR-018**：refresh_assets 生成的 meta 三连缺陷 — 本档 §3.1

## 附录 B. 关联 memory 条目

- `feedback_mcp_prefab_save.md` — MCP 修改 prefab 必须 scene_save → prefab_update 两步才写入磁盘
- `feedback_mcp_import_workflow.md` — MCP 导 png 必走 refresh→reimport→save_asset_meta 三步修 type/f9941/wrap
- `feedback_never_script_modify_prefab.md` — 绝对禁止用脚本写入 .prefab/.scene 文件

---

**终**
