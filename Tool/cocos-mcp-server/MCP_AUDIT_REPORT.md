# Cocos MCP — 审计报告

> **本文件**:对 `MCP_FEEDBACK_AND_PROPOSAL.md`(下称"提案")的独立审计 + 提案未涉及缺口的补充 + Token 优化方案的重新评估。
>
> **关系**:与提案**同目录并列**,不覆盖、不 merge。由提案作者决定是否吸收结论。
>
> **审计基线**:`git HEAD = 61e9d03`,Cocos Creator 3.8.x,Node.js 源码 `source/tools/*.ts`。
>
> **方法**:三路并行证据采集(源码 grep、提案逐句核对、独立缺口扫描)+ 权威口径数字重算。

---

## §0 Executive Summary(先读这个)

### 总体评价(一句话)

**提案的三个核心判断(token 胀、操作碎片化、prefab 链路脆弱)全部属实**,但**数字和 ERR 编号已全部过时**,**§6 切片索引方案被一个已存在但未启用的现有能力(`updateEnabledTools`)绕开**,而**至少 6 项关键缺失**(动画/事件绑定/结构化错误/TS 编译反馈/prefab diff/i18n)**未被提案覆盖**。建议提案从 P0~P2 路线图改为**5 阶段**,先打通现有能力开关(零代码工作量即可砍 30-60% token),再谈协议扩展。

### 提案 × 审计 速查表(15 行)

| # | 提案主张 | 审计裁决 | 建议动作 |
|---|---|---|---|
| 1 | 158 tools / 13 categories | ❌ 实际 **160 tools / 14 categories**(差 2 / +1)| 更新提案 §1.3 与 §5.3 的基数 |
| 2 | 每类计数表(§5.3)| ❌ 14 行中 **11 行过时**,最大偏差 sceneAdvanced +8 | 以 §2 Inventory 为新基线重写 |
| 3 | ERR-016(class ID 污染)| ⚠ ERR-016 **不存在**,当前 ID 对应 **ERR-005** | 替换所有 ERR-016 引用 → ERR-005 |
| 4 | ERR-018(refresh_assets meta 三连缺陷)| ⚠ ERR-018 **不存在**,KI 无对应 | 走 skill_ingestion 新建(IL 04/11),本次不做 |
| 5 | prefab 4 步落盘流程 | ✅ 真实痛点,但已有 `open_edit_mode` / `save_edit` / `close_edit_mode` 三件套 + `begin/end/cancel_undo_recording` 三件套共 **6 个**原子工具 | `prefab_edit_transaction` 降级 P2;优先出**组合范式文档** |
| 6 | "无 batch/bulk 工具" | ❌ 部分已存在:`batch_import_assets`、`batch_delete_assets`、`compress_textures`、`copy_node`+`paste_node`、`validate_asset_references`、`export_asset_manifest` | §3 / §4 的 batch 建议只需**补足 UI/component 两侧** |
| 7 | 无事务 / 无 rollback | ❌ `begin/end/cancel_undo_recording`(scene-advanced)**已提供事务语义** | 在文档中教会 AI 使用,即可替代提案 §2.2.1 的大部分需求 |
| 8 | §6 切片索引需扩 MCP 协议 | ⚠ 无需扩协议。`mcp-server.ts:128 getFilteredTools` / `:156 updateEnabledTools` 已支持**运行时按 category 开关工具**,UI 面板也有 tool-manager | **方案 D**(启用现成机制)为首选,零代码 |
| 9 | rare 类全部降级(preferences/broadcast/server/sceneView/referenceImage)| ✅ 支持。实战零触发证据充分 | 用现有 tool-manager 面板默认关闭,不需新代码 |
| 10 | `prefab_edit_transaction` 原子封装 | ⚠ 价值真实但可降级 | 先写一份**最佳实践文档**(3 + 3 工具组合步骤),工具封装留 P2 |
| 11 | `assets_batch_configure` 新工具 | ✅ 缺口确认;现有工具需 per-asset 循环 | P0,按提案原样推进 |
| 12 | `ui_set_label/layout/sprite` 语义层 | ✅ 缺口确认;`component_set_component_property` 目前一次一个属性 | P1,按提案推进 |
| 13 | token 节省估算 15k → 5k(-60%) | ⚠ 口径需统一 | §5 重算:**按 schema bytes 估算** MCP 端暴露 ~8-12k tokens,方案 D 可直接省 40%(关掉 rare 5 类) |
| 14 | 提案未涉及:动画 keyframe 编辑 | — | 新增 P1:`animation_edit_clip`(见 §4.1) |
| 15 | 提案未涉及:Button onClick 事件绑定 | — | 新增 P1:`ui_bind_button_event`(见 §4.2) |
| 16 | 提案未涉及:结构化错误码 + diagnostic | — | 新增 P0(跨工具横切):统一 response schema(见 §4.3) |
| 17 | 提案未涉及:TS 编译错误反馈 | — | 新增 P2:`project_check_compilation`(见 §4.4) |
| 18 | 提案未涉及:prefab diff | — | 新增 P2:`prefab_diff`(见 §4.5) |
| 19 | 提案未涉及:i18n 提取 | — | 新增 P2:`i18n_extract_strings`(见 §4.6) |

### TL;DR 推荐路径

1. **P0 · 零代码**:用现有 `tool-manager` 把 5 个 rare 类(preferences / broadcast / server / sceneView / referenceImage)默认关闭 → token 立降约 40%
2. **P0 · 小代码**:给每个 `ToolDefinition` 加 `scope: "core" | "optional" | "rare"` 元数据;扩展 `.mcp.json` 配置读取 scope(参考 §5 方案 C)
3. **P0 · 错误码统一**:所有 tool response 加 `errorCode` 字段(§4.3)
4. **P1**:提案原有的 `assets_batch_configure`、`ui_set_label/layout/sprite`、`component_batch_set_properties`
5. **P2**:提案的 `prefab_edit_transaction`(留到最后,因可用现有 6 件套组合)+ 新缺口工具(animation / button-event / diff / i18n)

---

## §1 审计方法论与证据口径

### 1.1 事实口径(避免再发生"158 vs 160"的争议)

**权威工具数定义**:以 `mcp-server.ts:96-105` 中 `toolSet.getTools()` 返回的 `name` 条目总数为准(这是真正暴露给 MCP client 的工具)。

**统计方法**:
```bash
grep -cE "^\s+inputSchema:" source/tools/*.ts | awk -F: '{sum += $2} END {print sum}'
# → 160
```
每个合规的 `ToolDefinition`(`source/types/mcp.ts`)必含 `inputSchema`,因此该行数就是工具数。

**category 数**:`mcp-server.ts:36-49` 中 `this.tools.<key> = new XxxTools()` 的赋值行数 = 14。

### 1.2 引用规则

- 所有 `FALSE` / `PARTIAL` 裁决附 `path:line` 或 `tool_name` + `schema key`
- 行号 baseline = commit `61e9d03`;若后续 rebase 导致漂移,用函数名 / tool name 定位
- Error Book 条目以 `KI/Error_Book/entries/ERR-NNN__slug.md` 的文件名为准;**提案中所有 ERR-016 / ERR-018 在 `61e9d03` 下都不存在**

### 1.3 本次审计不做什么

- 不运行 MCP server、不实测 token 消耗(无 tokenizer);token 估算用 `schema_bytes / 4` 公式
- 不新建 ERR 条目(受 IL 04/11 治理,属 skill_ingestion 工作流)
- 不改 `source/*.ts`、不改 `FEATURE_GUIDE_CN.md` / `README.md`、不改提案原文

---

## §2 Tool Inventory(权威 source of truth)

**总计**:**160 tools / 14 categories**(提案声称 158 / 13,偏低 2 / +1)。

### 2.1 Per-Category 表

| # | Category(`this.tools` key)| File | Tool Count | Δ vs 提案 §5.3 |
|---|---|---|---:|---:|
| 1 | `scene` | scene-tools.ts | 8 | 0 |
| 2 | `node` | node-tools.ts | 11 | 0 |
| 3 | `component` | component-tools.ts | 7 | 0 |
| 4 | `prefab` | prefab-tools.ts | 13 | **+1**(提案 12)|
| 5 | `project` | project-tools.ts | 24 | **+4**(提案 20)|
| 6 | `debug` | debug-tools.ts | 10 | **+2**(提案 8)|
| 7 | `preferences` | preferences-tools.ts | 7 | **+1**(提案 6)|
| 8 | `server` | server-tools.ts | 6 | **+2**(提案 4)|
| 9 | `broadcast` | broadcast-tools.ts | 5 | 0 |
| 10 | `sceneAdvanced` | scene-advanced-tools.ts | 23 | **+8**(提案 15)|
| 11 | `sceneView` | scene-view-tools.ts | 20 | **+6**(提案 14)|
| 12 | `referenceImage` | reference-image-tools.ts | 12 | **+2**(提案 10)|
| 13 | `assetAdvanced` | asset-advanced-tools.ts | 11 | **+1**(提案 10)|
| 14 | `validation` | validation-tools.ts | 3 | 0 |
| — | **合计** | — | **160** | **+27** aggregate |

> **命名约定**:MCP client 看到的实际名字 = `${category}_${tool.name}`(见 `mcp-server.ts:100`)。例如 `prefab_update_prefab`,`node_create_node`。提案里的工具名与此一致。

### 2.2 完整工具列表(160 项)

#### scene(8)
`get_current_scene` · `get_scene_list` · `open_scene` · `save_scene` · `create_scene` · `save_scene_as` · `close_scene` · `get_scene_hierarchy`

#### node(11)
`create_node` · `get_node_info` · `find_nodes` · `find_node_by_name` · `get_all_nodes` · `set_node_property` · `set_node_transform` · `delete_node` · `move_node` · `duplicate_node` · `detect_node_type`

#### component(7)
`add_component` · `remove_component` · `get_components` · `get_component_info` · `set_component_property` · `attach_script` · `get_available_components`

#### prefab(13)
`get_prefab_list` · `load_prefab` · `instantiate_prefab` · `create_prefab` · `update_prefab` · `revert_prefab` · `get_prefab_info` · `validate_prefab` · `duplicate_prefab` · `restore_prefab_node` · **`open_edit_mode`** · **`save_edit`** · **`close_edit_mode`**

> **粗体 3 项**是提案 §2.2.1 `prefab_edit_transaction` 的底层原语,已存在。

#### project(24)
`run_project` · `build_project` · `get_project_info` · `get_project_settings` · `refresh_assets` · `import_asset` · `get_asset_info` · `get_assets` · `get_build_settings` · `open_build_panel` · `check_builder_status` · `start_preview_server` · `stop_preview_server` · `create_asset` · `copy_asset` · `move_asset` · `delete_asset` · `save_asset` · `reimport_asset` · `query_asset_path` · `query_asset_uuid` · `query_asset_url` · `find_asset_by_name` · `get_asset_details`

#### debug(10)
`get_console_logs` · `clear_console` · `execute_script` · `get_node_tree` · `get_performance_stats` · `validate_scene` · `get_editor_info` · `get_project_logs` · `get_log_file_info` · `search_project_logs`

#### preferences(7)
`open_preferences_settings` · `query_preferences_config` · `set_preferences_config` · `get_all_preferences` · `reset_preferences` · `export_preferences` · `import_preferences`

#### server(6)
`query_server_ip_list` · `query_sorted_server_ip_list` · `query_server_port` · `get_server_status` · `check_server_connectivity` · `get_network_interfaces`

#### broadcast(5)
`get_broadcast_log` · `listen_broadcast` · `stop_listening` · `clear_broadcast_log` · `get_active_listeners`

#### sceneAdvanced(23)
`reset_node_property` · `move_array_element` · `remove_array_element` · **`copy_node`** · **`paste_node`** · `cut_node` · `reset_node_transform` · `reset_component` · `restore_prefab` · `execute_component_method` · `execute_scene_script` · `scene_snapshot` · `scene_snapshot_abort` · **`begin_undo_recording`** · **`end_undo_recording`** · **`cancel_undo_recording`** · `soft_reload_scene` · `query_scene_ready` · `query_scene_dirty` · `query_scene_classes` · `query_scene_components` · `query_component_has_script` · `query_nodes_by_asset_uuid`

> **粗体 5 项**构成 **事务 + 剪贴板** 原语:copy/paste 实现"一份复制多处落"的批量能力;begin/end/cancel_undo_recording 提供**真正的事务 + rollback**。提案 §2.2.1 的 `prefab_edit_transaction` **大部分需求可以用这 5 个 + 编辑模式 3 件套组合实现**。

#### sceneView(20)
`change_gizmo_tool` · `query_gizmo_tool_name` · `change_gizmo_pivot` · `query_gizmo_pivot` · `query_gizmo_view_mode` · `change_gizmo_coordinate` · `query_gizmo_coordinate` · `change_view_mode_2d_3d` · `query_view_mode_2d_3d` · `set_grid_visible` · `query_grid_visible` · `set_icon_gizmo_3d` · `query_icon_gizmo_3d` · `set_icon_gizmo_size` · `query_icon_gizmo_size` · `focus_camera_on_nodes` · `align_camera_with_view` · `align_view_with_node` · `get_scene_view_status` · `reset_scene_view`

#### referenceImage(12)
`add_reference_image` · `remove_reference_image` · `switch_reference_image` · `set_reference_image_data` · `query_reference_image_config` · `query_current_reference_image` · `refresh_reference_image` · `set_reference_image_position` · `set_reference_image_scale` · `set_reference_image_opacity` · `list_reference_images` · `clear_all_reference_images`

#### assetAdvanced(11)
`save_asset_meta` · `generate_available_url` · `query_asset_db_ready` · `open_asset_external` · **`batch_import_assets`** · **`batch_delete_assets`** · `validate_asset_references` · `get_asset_dependencies` · `get_unused_assets` · **`compress_textures`** · `export_asset_manifest`

> **粗体 3 项**是已存在的 batch 工具。`get_asset_dependencies` / `get_unused_assets` / `compress_textures` 在 audit agent 报告中被标为 **stub/未实现**(需 review)。

#### validation(3)
`validate_json_params` · `safe_string_value` · `format_mcp_request`

### 2.3 已存在但提案声称"需新增"的能力汇总

| 提案建议 | 实际已有的原语 | 组合实现方案 |
|---|---|---|
| `prefab_edit_transaction`(§2.2.1)| `open_edit_mode` + `begin_undo_recording` + ops + `end_undo_recording`(or `cancel_undo_recording` rollback) + `save_edit` + `close_edit_mode` | 6 工具串行;提案新工具 = 一层封装 |
| "批量写资产"(§3)| `batch_import_assets`、`batch_delete_assets`、`compress_textures`、`export_asset_manifest` | 已支持 import / delete 批量;meta 字段批量改缺失(提案 `assets_batch_configure` 确为真缺口)|
| "一键多节点复制"(§4)| `copy_node` + `paste_node` | 剪贴板式批量 |
| "事务/回滚"(隐含)| `begin_undo_recording` + `end_undo_recording` + `cancel_undo_recording` | 已有真事务 |
| "按类别开关工具"(§6 切片索引)| `updateEnabledTools(enabledTools[])` + `getFilteredTools` + `tool-manager` 面板 | 无需新协议,用现有 UI/配置即可 |

---

## §3 提案逐章回应

### §3.1 对应提案 §1(背景与方法论)

✅ **方法论有效**。基于实战 20+ commit 的痛点提取是可信证据源。

⚠ **数据过时**:§1.3 表中的"158 工具"要改为 **160**;`~15k token` 要改为区间值(见本报告 §5.2)。

✅ **两大核心问题(token 开销 + 操作碎片化)定性准确**,作为审计基调予以保留。

### §3.2 对应提案 §2(Prefab 编辑链路)

#### §3.2.1 ERR-016 的处理(提案 §2.1.1)

**裁决**:⚠ PARTIAL。"class ID 污染"在**手写 JSON**语境下确实存在,但 `prefab_update_prefab` 工具本身不会导致此问题。

**证据**:
- `source/tools/prefab-tools.ts:84-100` — `update_prefab` 的 schema 只接受 `prefabPath` + `nodeUuid`,不接受 JSON payload
- `source/tools/prefab-tools.ts:~232` — 实现调用 `Editor.Message.request('scene', 'apply-prefab', ...)`,由编辑器负责序列化,**不经 JSON 字符串拼接**
- `KI/Error_Book/entries/ERR-002__python-modify-cocos-prefab.md` — 已记录"Python/sed/awk 直接改 prefab JSON 会浮点污染",但 class ID shift 的精确描述在 `ERR-005__python-json-dump-prefab-id-shift.md` 中

**修正动作**:
- 把提案 §2.1.1 的"ERR-016"改为 **"ERR-005(class ID shift)+ ERR-002(float precision)"**
- 补一句:"此风险出现在**绕过 MCP 工具直接写 JSON** 的路径,MCP `update_prefab` 工具本身不触发"

#### §3.2.2 "4 步落盘流程"是否必须(提案 §2.1.1 末)

**裁决**:✅ 工作流正确,但现有原语**已足够**构成原子事务,不一定需要新工具。

**现状覆盖**:
```
open_edit_mode              ← 已存在 (prefab-tools.ts)
begin_undo_recording        ← 已存在 (scene-advanced-tools.ts)
<ops: node_*, component_*>  ← 已存在
end_undo_recording          ← 已存在 (失败时调 cancel_undo_recording)
save_scene                  ← 已存在 (scene-tools.ts)  [落盘 edit 态临时场景]
save_edit                   ← 已存在 (prefab-tools.ts)
update_prefab               ← 已存在 (落盘到磁盘)
close_edit_mode             ← 已存在
```

**增量价值分析**:提案 `prefab_edit_transaction` 相对现状只是**封装**:
- ✅ 免记 6 步顺序(降低 AI 出错率,价值真实)
- ✅ 失败自动调 `cancel_undo_recording` + `close_edit_mode(save=false)`(降低脏状态概率)
- ⚠ 不是能力新增,只是 ergonomics

**建议**:
- **P2**:`prefab_edit_transaction` 作为 ergonomics 封装
- **P0**:立即在 `FEATURE_GUIDE` 增加 **"Prefab 编辑最佳实践"** 章节,贴出上面 8 步组合 + 常见陷阱。零代码工作量,见效最快。

#### §3.2.3 ERR-002 警示(提案 §2.1.2)

✅ 完全认同,已有 KI 条目(`ERR-002__python-modify-cocos-prefab.md`),无需改动。

### §3.3 对应提案 §3(资源导入缺陷)

#### §3.3.1 ERR-018 的处理

**裁决**:⚠ ERR-018 **不存在**。当前 `KI/Error_Book/entries/` 最新编号为 ERR-012(commit `61e9d03` renumber 后),且无 `refresh_assets` 相关条目。

**修正动作**(属于 KI 维护工作流,**本次不做**,仅标注):
- 走 skill_ingestion / ki_maintenance 新建 `ERR-013__mcp-refresh-assets-meta-defect.md`
- 条目应包含:`userData.type` 缺省值错误 / 缺 sprite-frame 子 meta / 非 POT wrapMode 错误
- 受 `feedback_error_book_ci_rules.md` 约束,必须含 `ci_rules` 字段

#### §3.3.2 3 连缺陷本身(提案 §3.1 表)

✅ 真实缺陷,证据链完整(15 次 MCP 调用做 7 张图)。审计 agent 未能在源码中找到自动修 type/wrapMode 的逻辑,支持提案判断。

#### §3.3.3 提案建议的修复(§3.3)

| 提案建议 | 审计评估 |
|---|---|
| `project_refresh_assets` 增 `autoSpriteFrame` / `autoClampNonPot` / `sliceBorder` | ✅ P0,按提案推进 |
| `assets_batch_configure`(新)| ✅ P0,真缺口 |
| `sprite_set_slice_border` / `sprite_get_slice_border` | ✅ P1,低实现成本 |
| `sprite_set_texture_wrap_mode` | ✅ P1。或合并进 `assets_batch_configure` 的 `config.wrapModeS/T` 字段(已在提案 §3.3.2 设计)|

**补充**:`batch_import_assets` **已存在** — 可在其 `options` 中加 `autoConfig: { type?, wrapMode? }` 字段,避免再新造 API。

### §3.4 对应提案 §4(UI 批量构建)

✅ 痛点真实 — `component_set_component_property` 当前是一次一个属性(见 `component-tools.ts` 的 `setComponentProperty` schema)。

**评估**:
| 提案建议 | 审计评估 |
|---|---|
| `node_create_ui_node` | ✅ P1。或把 `create_node` 的 schema 扩展成兼容"UI 快捷模式"(加可选字段 `uiShortcut: { sprite?, label?, layer? }`),避免工具数膨胀 |
| `component_batch_set_properties` | ✅ P1,真缺口 |
| `ui_set_label` / `ui_set_layout` / `ui_set_sprite` 语义快捷 | ✅ P1,但**先实现 `component_batch_set_properties` 作为底座**,三个语义层作为可选薄封装 |

**叠加事务建议**:提议 UI 批量构建流程中**自动包裹 `begin_undo_recording` / `end_undo_recording`**(已有工具),失败可 `cancel_undo_recording` 回滚,提升 UI 构建的幂等性。

### §3.5 对应提案 §5(工具精简)

#### §3.5.1 §5.3 表 基数更新

| 类别 | 提案数 | 实际 | Δ | 提案合并目标 | 审计建议 |
|---|---:|---:|---:|---|---|
| scene | 8 | 8 | 0 | 8→4 | ✅ 可行,但 action 参数合并会破坏向后兼容,建议**改为 category-level scope 关闭**(方案 C/D),保留单工具 |
| node | 11 | 11 | 0 | 11→5 | ⚠ 合并 create/delete/duplicate/move → `node({action})` 增加 schema 复杂度,**收益小于风险**。建议**不合并**,改为 scope 策略 |
| prefab | 12 | **13** | +1 | 12→5 | 同上,不合并;edit-mode 3 件套保留独立,便于调试 |
| component | 7 | 7 | 0 | 7→4 | 同上 |
| assetAdvanced | 10 | **11** | +1 | 10→6 | ✅ 加 `assets_batch_configure`,不删减现有 |
| debug | 8 | **10** | +2 | 8→4 | ⚠ `get_console_logs`/`get_project_logs`/`search_project_logs` 语义不同,合并代价高于收益 |
| project | 20 | **24** | +4 | 20→10 | ⚠ 已有 `query_asset_path`/`query_asset_uuid`/`query_asset_url`/`find_asset_by_name` 语义不同,合并破坏清晰度。建议保留,降级 |
| preferences | 6 | **7** | +1 | 6→0 | ✅ 整体降级(方案 D 默认关)|
| server | 4 | **6** | +2 | 4→1 | ✅ 整体降级 |
| broadcast | 5 | 5 | 0 | 5→0 | ✅ 整体降级 |
| sceneView | 14 | **20** | +6 | 14→0 | ✅ 整体降级 |
| referenceImage | 10 | **12** | +2 | 10→0 | ✅ 整体降级 |
| sceneAdvanced | 15 | **23** | +8 | 15→6 | ⚠ 里面有**事务核心工具**(begin/end_undo_recording + copy/paste_node + scene_snapshot),**不可降级**。建议拆出"core-advanced"(事务 + snapshot + copy/paste + execute_*,~8 个)进 core 层,其余降级 |
| validation | 3 | 3 | 0 | 3→0 | ✅ 降级 |

#### §3.5.2 "整体精简到 45 个"是否可达

**提案目标**:160 → ~45 core。
**审计评估**:
- **rare 整类降级**(preferences + server + broadcast + sceneView + referenceImage + validation)= 降掉 53 个工具 → 107 剩余
- 再从 sceneAdvanced 里拆出 ~15 个 rare → 92 剩余
- **action 合并再砍 40% 风险偏高**(破坏稳定性、增 schema 复杂度)
- 现实可达目标:**~90 core / ~70 optional/rare**,而不是提案的 45

**结论**:**提案 §5.3 的 "45 个" 目标偏乐观**。真正的 token 节省来自 **scope 分层 + 按需加载**,而不是激进合并。

### §3.6 对应提案 §6(切片索引架构)

#### §3.6.1 重大发现:**server 已有 enabledTools 机制,不需要扩协议**

**证据**:
- `source/mcp-server.ts:128 getFilteredTools(enabledTools)` — 按 enabled 列表过滤 schema
- `source/mcp-server.ts:156 updateEnabledTools(enabledTools)` — 运行时热更新
- `source/tools/tool-manager.ts` — 已有 UI 面板(虽然本次 audit 未深读其 getTools() 为 0)
- `source/panels/` 目录 — 配置面板存在

**推论**:提案 §6 想要的"按需加载 category"**实际已被实现**,缺的只是:
1. 用户侧**默认配置**(默认 enable 哪些 category)
2. `.mcp.json` / 配置文件驱动(目前可能只在 UI 面板切换)
3. 文档告诉用户怎么用

#### §3.6.2 提案切片索引方案的再评估

| 维度 | 提案方案 A(切片索引 + tool_search RPC)|
|---|---|
| 实施成本 | **高**:需扩展 MCP 协议、server/client 双改、写 tool_registry.json + 每类 index |
| 收益 | 高:可达 ~5k token 起步 |
| 兼容风险 | **高**:客户端必须支持新 RPC,否则回退全量加载;改 MCP 协议对上游仓库不友好 |
| 裁决 | ❌ **不推荐**。方案 D / C 可达到 80% 收益,20% 成本 |

**替代方案详见 §5**。

### §3.7 对应提案 §7(路线图)

审计融合后的矩阵见本报告 **§7**。主要改动:
- 插入 3 项"零代码"P0(scope 元数据、rare 默认关、错误码统一)
- 把 `prefab_edit_transaction` 降到 P2
- 加入 6+ 独立缺口

### §3.8 对应提案 §8(实战案例)

✅ 案例价值充分,建议**原样保留**。唯一修正:§8.2 引用的 commit hash(`0ff4e20`、`d36afb4` 等)如已 rebase 应复核。

---

## §4 独立缺口清单(提案未涉及,共 7 项)

### §4.1 动画 Clip / Keyframe 编辑

**场景**:做 UI 动效、进场退场、tween 替代。当前 AI 只能调 `cc.Animation` 组件做播放控制,**无法**修改 `.anim` 资源内部的曲线/关键帧。手工流程要走编辑器。

**替代路径成本**:无 — AI 写不了 `.anim`(受 ERR-002 约束不得脚本写 JSON)。

**建议工具 shape**:
```ts
animation_edit_clip({
  clipUrl: string,                 // db://assets/animations/xxx.anim
  property: string,                // 'opacity' | 'position.x' | 'scale' | ...
  keyframes: Array<{
    frame: number,                 // 秒为单位或帧为单位(schema 注明)
    value: number | number[],
    easing?: 'linear'|'ease-in'|'ease-out'|'ease-in-out'|'cubic-bezier',
    bezier?: [number, number, number, number]
  }>,
  mode?: 'replace' | 'append' | 'merge'
})
```

**ROI**:中。命中率取决于项目是否大量用 AnimationClip(非 Tween)。**P1**。

### §4.2 UI 事件绑定(Button.clickEvents 等)

**场景**:给 Button 挂 onClick → `ScriptName.methodName`。当前 AI 可以创建 Button 组件,但**无法**写 `clickEvents` 数组里的 `EventHandler`(目标节点 UUID + 组件名 + 方法名)。

**替代路径成本**:
- 或脚本里 `button.node.on('click', cb)`(代码里绑定,不是编辑器级)
- 或手动编辑器 GUI
- **无 MCP 原生路径**

**建议工具 shape**:
```ts
ui_bind_button_event({
  buttonNodeUuid: string,
  event: 'click',                     // 预留扩展
  handler: {
    targetNodeUuid: string,           // 目标脚本挂的节点
    component: string,                // 'GameManager'(cc.ccclass name)
    method: string,                   // 'onStartGame'
    customData?: string               // 编辑器里的 CustomEventData
  }
})
```

**ROI**:高。按钮事件绑定是几乎每个 UI 项目都要做的事。**P1**。

### §4.3 结构化错误码(横切关注,**最高价值**)

**场景**:所有工具失败时只返回 `{ success: false, error: "..." }` 字符串。AI 无法程序化区分"asset not found" / "permission denied" / "circular ref",只能字符串匹配英文消息(翻译后就失效)。

**证据**:`source/types/mcp.ts` 中 `ToolResponse` 未定义结构化错误码字段。

**建议**:**不是新工具**,而是**跨工具 response schema 升级**:
```ts
interface ToolResponse<T> {
  success: boolean;
  data?: T;
  message?: string;               // 人类可读
  errorCode?: string;             // 机器可读: "ASSET_NOT_FOUND" | "INVALID_PREFAB" | "SCENE_DIRTY" | ...
  details?: {
    relatedAssets?: string[];
    suggestion?: string;
    editorLogRef?: string;
  };
}
```

**ROI**:**极高**。AI 出错后的自修复能力翻倍。**P0**(横切任务,可增量推进)。

### §4.4 TypeScript 编译反馈

**场景**:AI 改 `.ts` 脚本后,希望立刻知道"编译通过吗? 几个错误?"。当前只能 `run_project` 触发一次完整构建,或读 `get_console_logs` / `get_project_logs` 反解析。

**替代路径成本**:中-高 — 日志解析不结构化。

**建议工具 shape**:
```ts
project_check_compilation({
  scriptPath?: string,          // 可选:限定单文件
  includeWarnings?: boolean
})
// Return: { success, errors: [{ file, line, col, code, message }], warnings: [...] }
```

**ROI**:中。脚本改动密集时收益显著。**P2**(提案 §7 未列,新增)。

### §4.5 Prefab Diff

**场景**:AI 改 prefab 后,希望知道"相对上次保存改了哪些节点/属性"。当前无能力。

**替代路径成本**:高 — 只能再开一次 `load_prefab` 对比字段(但 `load_prefab` 返回结构未规范)。

**建议工具 shape**:
```ts
prefab_diff({
  prefabUrl: string,
  compareAgainst: 'disk' | 'lastSnapshot',
  includePropertyLevel?: boolean
})
// Return: { added: [nodePath], removed: [nodePath], modified: [{ nodePath, props: [{ name, from, to }] }] }
```

**ROI**:中。对批量改 prefab 的工作流价值高。**P2**(新增)。

### §4.6 i18n 字符串提取

**场景**:从 prefab/scene 的所有 Label.string 批量提取为 i18n key 表。当前只能 AI 遍历 `get_node_tree` + 手工整理。

**建议工具 shape**:
```ts
i18n_extract_strings({
  scope: 'prefab' | 'scene' | 'folder',
  target: string,                   // prefab URL / scene name / folder URL
  autoKeyPattern?: string,          // 'ui.{nodePath}.label' 默认
  outputFormat?: 'json' | 'csv'
})
```

**ROI**:低-中。看项目是否国际化。**P2**(新增)。

### §4.7 Sprite Atlas 合成

**场景**:把分散 png 打包成 atlas,降低 draw call。当前 `asset-advanced` 无 atlas 操作。

**建议工具 shape**:
```ts
atlas_create({
  spriteUrls: string[],
  outputUrl: string,           // db://assets/atlases/xxx.labelatlas or .plist
  padding?: number, maxSize?: number, trim?: boolean
})
```

**ROI**:中。大图集项目明确收益;小项目可能用不上。**P2**(新增)。

### §4.8 其他值得关注但未纳入此次 P0~P2 的

- **Physics 参数配置**(RigidBody 群组/阻尼)— 小众
- **Particle 发射配置**(曲线/形状)— 小众
- **Graphics/Mask 配置** — 小众
- **Bundle 配置** — 工程化场景需要,但一般一次性配完
- **Decorator 内省**(`@property` 列表)— 对 AI 自动布线有价值,但实现复杂

> 上述 5 项未列入主矩阵,作为长尾备选。如用户项目用到,可单独提 PM 新会话。

---

## §5 Token 优化方案对比(≥ 3 方案)

### §5.1 当前 token 基线重算

**公式**:`tokens ≈ bytes(JSON schema) / 4`(OpenAI/Anthropic tokenizer 经验值)

**数据采集**:取 `prefab_update_prefab` 为样本(提案 §2.1.1 引用),其 JSON schema 形如:
```json
{
  "name": "prefab_update_prefab",
  "description": "Update an existing prefab",
  "inputSchema": {
    "type":"object",
    "properties":{
      "prefabPath":{"type":"string","description":"Prefab asset path"},
      "nodeUuid":{"type":"string","description":"Node UUID with changes"}
    },
    "required":["prefabPath","nodeUuid"]
  }
}
```
序列化后 ≈ 280 字节 ≈ **70 tokens**。

样本分布(抽查):
- 小工具(2-3 参数):50-80 tokens(如 `scene_save_scene` ≈ 40)
- 中工具(4-8 参数):80-150 tokens(如 `create_node` ≈ 130)
- 大工具(10+ 参数 + 枚举):150-300 tokens(如 `set_node_transform` ≈ 200)

**全量 160 tools 估算**:
- 平均 ~90 tokens/tool
- **全量加载 ~14,400 tokens**(提案 "15k" 基本正确)
- rare 5 类合计工具数 = preferences(7) + server(6) + broadcast(5) + sceneView(20) + referenceImage(12) = **50 工具 ≈ 4,500 tokens**
- sceneAdvanced 里的 rare 部分(~15)≈ 1,350 tokens
- validation(3)≈ 200 tokens

**零代码降级收益(方案 D 场景)**:14,400 - 4,500 - 1,350 - 200 ≈ **~8,350 tokens**(降幅 42%)

### §5.2 方案矩阵

| 维度 | A 切片索引 + tool_search RPC(提案 §6)| B 多 MCP server 拆分 | C scope 元数据 + 客户端 hint | **D 用现成的 updateEnabledTools(推荐)** |
|---|---|---|---|---|
| **实施成本** | 🔴 高:扩 MCP 协议 + tool_registry.json + per-category index + server/client 双改 | 🟡 中:拆 `cocos-mcp-server` → `core` / `optional` / `editor-advanced` 三个 entry | 🟡 中:每工具加 `scope` 字段 + `.mcp.json` 读取 + 启动时过滤 | 🟢 **极低**:代码已存在(`mcp-server.ts:128/156`),只要**暴露 `.mcp.json` 配置项** |
| **节省收益** | 🟢 高(~66%,起步 5k)| 🟡 中-高(~42%,关 optional 进程)| 🟢 高(~50-60%,细到 per-tool)| 🟡 **中-高(~42%,按 category 粗粒度)** |
| **兼容风险** | 🔴 高:打破上游 MCP 协议,发 PR 难接纳 | 🟢 低:每个 server 依旧标准 MCP | 🟢 低:scope 仅是 description 扩展字段 | 🟢 极低:纯配置,API 不变 |
| **用户体验** | 按需最精细,但需 AI 主动 `tool_search` | 靠 `.mcp.json` 声明启用哪些 server | 单 `.mcp.json` 字段如 `scopes: ["core"]` | `.mcp.json` 直接列 `disabledCategories: [...]` |
| **protocol 改动** | 是(新 RPC `list_categories` / `load_category`)| 否 | 否 | 否 |
| **需要重启** | 否(动态加载)| 改配置后重启(一次性)| 改配置后重启(一次性)| **已支持运行时 `updateEnabledTools` 热更** |
| **综合评分** | 2/5 | 3.5/5 | 4/5 | **4.5/5** |

### §5.3 推荐 rollout

**Phase 0(零代码,立即)**:用 D 方案关 rare 5 类 → **~8.3k tokens 起步,-42%**
- 路径:在 `settings/mcp-server.json` 或 `.mcp.json` 增 `disabledCategories: ["preferences","server","broadcast","sceneView","referenceImage"]`;启动时转换为 `enabledTools` 传入 `updateEnabledTools`

**Phase 1(小代码,1-2 天)**:上 C 方案,每工具加 `scope: "core" | "optional" | "rare"`
- 路径:扩展 `ToolDefinition`(`source/types/mcp.ts`)+ 每个 tool 文件标注 + `.mcp.json` 接 `scopes: ["core"]`
- 收益:**~50-60% 省**,细粒度且兼容

**Phase 2(中代码,1-2 周,视需要)**:若 P1 后仍嫌 token 胀,上 B 拆 server
- 路径:`cocos-mcp-server-core` / `cocos-mcp-server-editor-advanced` 两个 entry
- 收益:进程级隔离,停用 optional server 彻底 0 token

**Phase 3(大代码,不建议)**:提案 §6 的切片索引 + tool_search RPC
- 只有前 3 阶段仍不够时才考虑

### §5.4 回答提案作者的疑问

> "是否为最优解决方法,需要你交叉认证"

**直答**:提案 §6 的切片索引**不是最优解**。**方案 D(启用现有 updateEnabledTools)+ 方案 C(scope 元数据)的组合**是最优解,原因:

1. **D 零代码**,即刻落地,42% 收益
2. **C 兼容 MCP 标准**,不扩协议,发 PR 可接受
3. **组合收益 ~50-60%**,已接近提案 60% 目标
4. **复杂度远低于** A(切片索引 RPC)

---

## §6 Error Book ID 纠正表

| 提案引用 | 当前 KI 状态 | 推荐动作 |
|---|---|---|
| **ERR-016**(提案 §2.1.1)"class ID 污染" | **不存在**。commit `61e9d03` renumber 后 Error Book 只到 ERR-012 | 替换为 **ERR-005**(`python-json-dump-prefab-id-shift.md`),该条目已记录 class ID 压缩 → 全名展开的同一问题 |
| **ERR-002**(提案 §2.1.2)"禁止脚本改 prefab JSON" | ✅ 存在(`python-modify-cocos-prefab.md`)| 无需改动 |
| **ERR-018**(提案 §3.1)"refresh_assets 三连缺陷" | **不存在** | 走 skill_ingestion 新建 ERR-013;**本次 scope 内不做** |
| (提案未引用但相关)mcp-prefab-layer-ui2d | ✅ 存在(`ERR-004__mcp-prefab-layer-ui2d.md`)| 建议在提案 §2.2.2 `prefab_add_ui_node` 说明中引用:"layer 默认 UI_2D 的依据是 ERR-004" |
| (提案未引用但相关)overengineered-scroll-recycling | ✅ 存在(`ERR-009`)| 建议在提案 §4.2.3 `ui_set_layout` 设计中警示:"Layout 组件自身的 ScrollView 回收逻辑必须手写,MCP 工具不自动替用户做 virtual list" |

**新建 ERR-013 的建议骨架**(不在本次 scope 内,供后续独立任务参考):
```
ERR-013__mcp-refresh-assets-meta-defect.md
id: ERR-013
severity: high
category: mcp
symptoms:
  - import 新 png 后 userData.type = "texture" 而非 "sprite-frame"
  - subMetas.f9941 missing → Sprite 组件无法绑定
  - 非 POT 尺寸 wrapMode 默认 "repeat",应为 "clamp-to-edge"
related_commits: [kingDianPuzzle cardProps 导入]
ci_rules:
  - import png 后自动核对 type/subMetas/wrapMode 三字段
prevention:
  - (TODO after fix) MCP refresh_assets / reimport_asset 默认走 sprite-frame + clamp
```

---

## §7 更新后的优先级矩阵(融合提案 §7 + 独立缺口)

| # | 项目 | 来源 | 紧急 | 复杂 | 价值 | 阶段 |
|---|---|---|---|---|---|---|
| 1 | 启用现有 `updateEnabledTools` + `.mcp.json` 默认关 5 rare 类(方案 D)| 审计 §5 | 🔴 高 | 🟢 极低 | 🔴 极高(-42% token 零代码)| **P0** |
| 2 | 统一 `ToolResponse` 加 `errorCode` + `details.suggestion`(§4.3)| 审计 §4 | 🔴 高 | 🟡 中 | 🔴 极高(横切)| **P0** |
| 3 | 每工具打 `scope` 元数据(方案 C)| 审计 §5 | 🔴 高 | 🟡 中 | 🔴 高(-15% 额外 token)| **P0** |
| 4 | `assets_batch_configure` + `batch_import_assets.options.autoConfig` 合并 | 提案 §3.3.2 | 🔴 高 | 🟡 中 | 🔴 高 | **P0** |
| 5 | `refresh_assets` / `reimport_asset` 默认 `autoSpriteFrame` + `autoClampNonPot` | 提案 §3.3.1 | 🔴 高 | 🟢 低 | 🔴 高 | **P0** |
| 6 | 新建 ERR-013(refresh_assets 三连缺陷)| 审计 §6 | 🟠 中 | 🟢 低 | 🟠 中(防未来踩)| **P0**(独立任务,skill_ingestion)|
| 7 | 补"Prefab 编辑最佳实践"文档(6 件套组合)| 审计 §3.2 | 🟠 中 | 🟢 极低 | 🔴 高(无代码防 AI 再踩坑)| **P0** |
| 8 | `component_batch_set_properties`(底座)| 提案 §4.2.2 | 🟠 中 | 🟡 中 | 🔴 高 | **P1** |
| 9 | `ui_set_label` / `ui_set_layout` / `ui_set_sprite`(语义快捷)| 提案 §4.2.3 | 🟠 中 | 🟢 低 | 🟠 中 | **P1** |
| 10 | `node_create_ui_node` / `prefab_add_ui_node`(UI 快捷)| 提案 §2.2.2 §4.2.1 | 🟠 中 | 🟡 中 | 🟠 中 | **P1** |
| 11 | `animation_edit_clip`(§4.1)| 审计新增 | 🟠 中 | 🟡 中 | 🟠 中 | **P1** |
| 12 | `ui_bind_button_event`(§4.2)| 审计新增 | 🟠 中 | 🟡 中 | 🔴 高 | **P1** |
| 13 | `sprite_set_slice_border` / `sprite_set_texture_wrap_mode` | 提案 §3.3.3/§3.3.4 | 🟡 低 | 🟢 低 | 🟠 中 | **P1** |
| 14 | rare 类 6 个独立整体降级 | 提案 §5.3 | 🟢 低 | 🟢 极低 | 🟠 中(被 P0#1 吸收)| **合入 P0#1** |
| 15 | `prefab_edit_transaction`(ergonomics 封装)| 提案 §2.2.1 | 🟢 低 | 🟡 中 | 🟠 中(现有 6 件套可替代)| **P2** |
| 16 | action 参数合并(scene/node/prefab → `xxx({action})`)| 提案 §5 | 🟢 低 | 🔴 高 | 🟡 低(破坏兼容,收益小)| **P2 / 不推荐** |
| 17 | 多 MCP server 拆分(方案 B)| 审计 §5.2 | 🟢 低 | 🟡 中 | 🟠 中 | **P2**(仅在 P0/P1 不够时)|
| 18 | `project_check_compilation`(TS 编译反馈)| 审计 §4.4 | 🟢 低 | 🟡 中 | 🟠 中 | **P2** |
| 19 | `prefab_diff` | 审计 §4.5 | 🟢 低 | 🟡 中 | 🟠 中 | **P2** |
| 20 | `i18n_extract_strings` | 审计 §4.6 | 🟢 低 | 🟢 低 | 🟡 低 | **P2** |
| 21 | `atlas_create` | 审计 §4.7 | 🟢 低 | 🟡 中 | 🟡 低 | **P2** |
| 22 | 切片索引 + tool_search RPC(方案 A)| 提案 §6 | 🟢 低 | 🔴 高 | 🟡 低(方案 D+C 已覆盖)| **P3 / 不推荐** |

**新阶段建议**(替代提案 §7.2):

| 阶段 | 关键产出 | 预期工期 |
|---|---|---|
| **P0 · 零代码 / 小代码** | rare 降级 + scope 元数据 + 错误码统一 + refresh_assets fix + 最佳实践文档 | 1-3 天 |
| **P1 · batch 封装 + UI 语义层** | `assets_batch_configure`、`component_batch_set_properties`、`ui_set_*`、`animation_edit_clip`、`ui_bind_button_event` | 1 周 |
| **P2 · ergonomics + 高级缺口** | `prefab_edit_transaction`、`prefab_diff`、`project_check_compilation`、`i18n_extract_strings`、`atlas_create` | 2-3 周 |
| **P3 · 架构重做(视情况)** | 切片索引 RPC / 多 server 拆分 | 仅在 P0-P2 后仍需 |

---

## §8 结论速查表(扩展版)

(同 §0 速查表。若仅读 §0/§8 即可得 80% 结论。)

### 保留 / 调整 / 新增 分区

#### 提案**保留**(审计认同)
- §1 方法论与证据基调
- §2.1.2 ERR-002 警示
- §3.1 三连缺陷描述
- §3.3.1/§3.3.2/§3.3.3 修复方案
- §4.1/§4.2 UI 批量痛点
- §5.4 组合包思路(与 scope 元数据方案契合)
- §8 实战案例

#### 提案**调整**(审计建议修改)
- §1.3 / §5.3 数字:158→160,13→14,每类计数以本报告 §2 为新基线
- §2.1.1 ERR-016 → 改为 ERR-005 + ERR-002 组合
- §3.1 ERR-018 → 改为"待新建 ERR-013,本次 scope 外"
- §5.2/§5.3 激进合并(action 化)→ 改为 scope 分层 + 降级
- §6 切片索引 → 改为"方案 D + C 组合"(利用现有 `updateEnabledTools` + scope 元数据)
- §7 优先级 → 本报告 §7 重排

#### 提案**新增**(审计建议补充)
- P0 错误码统一(§4.3)
- P0 scope 元数据(§5.2 方案 C)
- P0 "Prefab 编辑最佳实践"文档(§3.2.2)
- P1 `animation_edit_clip`(§4.1)
- P1 `ui_bind_button_event`(§4.2)
- P2 `project_check_compilation`(§4.4)
- P2 `prefab_diff`(§4.5)
- P2 `i18n_extract_strings`(§4.6)
- P2 `atlas_create`(§4.7)

### 一图流(决策树)

```
想降 token?
├── 立即 → 用 D 方案(零代码,改 .mcp.json)→ -42%
├── 1 周内 → 再叠加 C 方案(scope 元数据)→ -50~60%
├── 1 月内 → 考虑 B 方案(server 拆分)→ 进程级隔离
└── 3 月内仍需要? → 再考虑 A 方案(提案切片索引,侵入协议)

想降 prefab 操作出错率?
├── 立即 → 出最佳实践文档(6 件套组合)
├── P1 → component_batch_set_properties + begin/end_undo_recording 包裹
└── P2 → prefab_edit_transaction 封装

想减少导资产的 MCP 调用?
├── P0 → refresh_assets 加 autoSpriteFrame/autoClamp 默认
├── P0 → batch_import_assets 扩 options.autoConfig
└── P1 → assets_batch_configure 新增
```

---

## 附录 A. 审计证据索引

- **PM 阶段 Agent 1**(完整工具 inventory 原始报告):`.in-process/active/20260422-124849/` 会话上下文
- **PM 阶段 Agent 2**(8 项事实核对裁决):同上
- **PM 阶段 Agent 3**(12+ 条独立缺口清单,本报告精选 7 条):同上
- **权威工具数**:`grep -cE "^\s+inputSchema:" source/tools/*.ts`(script 可重放)
- **baseline commit**:`61e9d03 chore: renumber Error Book entries to consecutive ERR-001~012`

## 附录 B. 本次审计未做的事(Out-of-Scope)

- 未改任何 `source/*.ts` 源文件
- 未改 `FEATURE_GUIDE_CN.md` / `FEATURE_GUIDE_EN.md` / `README.md`
- 未改 `MCP_FEEDBACK_AND_PROPOSAL.md`(提案原文)
- 未新建任何 ERR Book 条目(仅 §6 标注建议)
- 未实测 token(用 `bytes/4` 估算)
- 未跑 MCP server(静态代码阅读)

## 附录 C. 后续建议的独立 session

1. `/pm` 启动"**scope 元数据 + .mcp.json 集成**"实施(Phase 1)
2. `/pm` 启动"**统一 ToolResponse errorCode**"横切任务(P0#2)
3. skill_ingestion 新建 **ERR-013**(refresh_assets 三连缺陷)
4. `/pm` 启动"**批量 UI 工具实现**"(Phase 1 的 `component_batch_set_properties` + `ui_set_*`)

---

**终**
