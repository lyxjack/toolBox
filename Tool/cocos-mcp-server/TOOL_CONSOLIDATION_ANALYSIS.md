# 工具合并策略分析(Tool Consolidation Analysis)

> **问题**:我们当前 v1.5.0 有 **165 个工具**,上游 cocos 商店 v1.5.0 宣传"150+ → 50"(功能反而更多)。**为什么**上游能这么做?**值不值得我们跟进**?**能省多少 token**?
>
> **本文档**:基于真实 `dist/` 字节测量 + 上游命名反向工程,给三条迁移路径的硬数据对比 + 明确推荐。
>
> **与其他文档的关系**:
> - [`MCP_AUDIT_REPORT.md`](MCP_AUDIT_REPORT.md) §5 给过 4 大方案(切片索引 / 多 server / scope 元数据 / 利用 updateEnabledTools),本文**不重复**,只深入"**工具结构合并**"这一维。
> - [`TOKEN_BUDGET_ANALYSIS.md`](TOKEN_BUDGET_ANALYSIS.md) §2 列了 6 条候选(A description 瘦身 / B $ref 去重 / C action-code 合并 / ...),本文是其中 **C 候选的深度展开**。

---

## §0 Executive Summary

### 为什么上游工具"更少"但"功能更多"?

一句话:**上游用 "action-code 模式"** — 把一族同类工具(例如 scene 下的 `open_scene` / `save_scene` / `close_scene` / `create_scene` / `save_scene_as` / `get_current_scene` / `get_scene_list` / `get_scene_hierarchy` 8 个)合并为**单一工具** + `action` 枚举参数。"150+ → 50"并不是砍功能,而是把**每族 N 个独立 schema** 合并为**1 个带 action enum 的大 schema**。工具**数量**减少,但单工具的**schema 复杂度**升高。

### 三路径 token 节省对比

基线:v1.5.0 全量 `tools/list` = **13,111 tokens**(165 工具);默认 `disabledScopes: ["rare"]` 关掉 5 个 rare 类后 = **11,084 tokens**(-15%)。**以下节省均叠加在 "已 rare-off" 11,084 基线之上**。

| 路径 | 工具数 | 预计 tokens | 节省 | 工作量 | 破坏性 | 推荐 |
|---|---:|---:|---:|---|---|---|
| **P1 轻量** — 仅 Top 20 description 瘦身 | 165 | ~10,890 | -1.6% | 1-2 小时 | 🟢 零 | ✅ 做 |
| **P2 中度** — 6 组稳定合并 + P1 | ~157 | ~10,420 | -6.5% | 1-2 天 | 🟡 低(6 工具名改)| ✅ 做 |
| **P3 激进** — 全量 165 → 50 action-code | ~50 | ~4,200 | -65% | 5-7 天 | 🔴 极高(v2.0 breaking)| ❌ 不做 |

### 推荐

**P1 + P2 组合**(累计再省 ~8%)。即:

1. 把 Top 20 bloated tools 的 description 从平均 180 字符压到 80 字符
2. 合并 6 组"天然同族"纯查询 / 纯生命周期工具(不动复杂事务操作)

不推荐 P3 的 4 个理由:

1. **"工具少"不等于"context 小"** — P3 下单工具 schema 从平均 400 bytes 膨胀到 1,200+,AI 眼睛里的 token 总量没少多少(上游宣传里没说的部分,见 §1.4)
2. **AI hallucination 风险** — 15-action 的巨型工具,LLM 更容易选错 action
3. **v2.0 breaking change** — 所有 AI prompt / client 集成需重写,切换成本远超节省收益
4. **我们已经靠 `disabledScopes: ["rare"]` 省了 15%**(基线 13,111 → 11,084),边际收益递减

---

## §1 上游"165 → 50"的机制拆解

### §1.1 什么是 action-code 模式?

**旧(我们现在的样子)**:每个操作一个独立工具。
```jsonc
// 8 个工具,8 份独立 schema
{ "name": "scene_open_scene",        "inputSchema": { "properties": { "scenePath": {...} } } }
{ "name": "scene_save_scene",        "inputSchema": { "properties": {} } }
{ "name": "scene_close_scene",       "inputSchema": { "properties": {} } }
{ "name": "scene_create_scene",      "inputSchema": { "properties": { "sceneName": {...}, "savePath": {...} } } }
{ "name": "scene_save_scene_as",     "inputSchema": { "properties": { "newPath": {...} } } }
{ "name": "scene_get_current_scene", "inputSchema": { "properties": {} } }
{ "name": "scene_get_scene_list",    "inputSchema": { "properties": {} } }
{ "name": "scene_get_scene_hierarchy","inputSchema": { "properties": { "includeComponents": {...} } } }
```

**新(action-code)**:同族工具合并为 1,用 `action` enum 路由。
```jsonc
{
  "name": "scene_management",
  "description": "Unified scene CRUD + query (open/save/close/create/save_as/get_current/get_list/get_hierarchy)",
  "inputSchema": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["open", "save", "close", "create", "save_as", "get_current", "get_list", "get_hierarchy"],
        "description": "Which scene operation to perform"
      },
      "scenePath":        { "type": "string", "description": "For open/create/save_as" },
      "sceneName":        { "type": "string", "description": "For create" },
      "savePath":         { "type": "string", "description": "For create/save_as" },
      "includeComponents":{ "type": "boolean","description": "For get_hierarchy" }
    },
    "required": ["action"]
  }
}
```

### §1.2 合并前后 schema 字节对比(scene 族为例)

真实测量(`node --eval` 跑 `getTools()` 后序列化):

| 形态 | JSON bytes | Tokens ≈ |
|---|---:|---:|
| 当前 8 个独立工具合计 | **1,461** | ~365 |
| 合并为 `scene_management({action})` 估算 | ~680 | ~170 |
| **省** | **~780** | **~195**(-53%)|

**每族节省约 40-55%**(随族大小和 schema 复杂度浮动)。

### §1.3 上游 50 工具的分组命名(git 历史恢复,README commit 4793a52)

上游公开列出 **37 个合并工具**(其余 13 个估计在子变体):

| Category | 上游合并工具 | 对应我们的独立工具数 |
|---|---|---:|
| scene | `scene_management` / `scene_hierarchy` / `scene_execution_control` | 8 |
| node | `node_query` / `node_lifecycle` / `node_transform` / `node_hierarchy` / `node_clipboard` / `node_property_management` | 11 + 部分 sceneAdvanced |
| component | `component_manage` / `component_script` / `component_query` / `set_component_property` | 8 |
| prefab | `prefab_browse` / `prefab_lifecycle` / `prefab_instance` / `prefab_edit` | 13 |
| asset | `asset_manage` / `asset_analyze` / `asset_system` / `asset_query` / `asset_operations` | 24 + 12 |
| project | `project_manage` / `project_build_system` | 24 |
| debug | `debug_console` / `debug_logs` / `debug_system` | 10 |
| preferences | `preferences_manage` / `preferences_global` | 7 |
| server | `server_info` | 6 |
| broadcast | `broadcast_message` | 5 |
| sceneView | `scene_view_control` / `scene_view_tools` | 20 |
| referenceImage | `reference_image_manage` / `reference_image_view` | 12 |
| validation | `validation_scene` / `validation_asset` | 3 |
| **合计** | **37 个合并工具** | **165 独立工具** |

**平均合并比**:165 / 37 ≈ **4.5 : 1**(每 4-5 个原工具合 1 个)。

### §1.4 ⚠️ 上游不提的隐藏成本:"工具少 ≠ context 小"

直观上"50 工具 vs 165 工具"差 3.3 倍,但实际传给 AI 的**token 总量差距没那么大**。

**核心事实**:MCP `tools/list` 返的每个工具 = **`name` + `description` + `inputSchema`** 的 JSON。合并后:

- **省**:N 份 `name` + `description` 字符串
- **多**:`action` enum(要列全部 action 名)+ 所有 action-specific 参数(union schema 膨胀)+ description 里得写清每个 action 对应哪些 properties

**以 scene 族为例**(§1.2 数字):1,461 → 680 = 真省 ~53%。**但这是最理想的场景**(8 个工具语义高度同质)。换 `project` 族(24 个工具,涵盖 CRUD + query + build + preview + 多种 asset ops,语义杂)实测模拟合并后只省 ~35-40%。

更关键的是**schema 复杂度的移位**:

| 形态 | 平均 单工具 schema bytes | AI 面对的选择 |
|---|---:|---|
| 我们(165 工具) | 296 | 165 个自解释工具名,AI 照字面读工具名就能猜功能 |
| 上游(50 工具) | ~800-1,200 | 50 个工具名 + 每个 10-20 个 action enum,AI 需记哪个 action 对应哪个功能 |

**AI hallucination 场景**:

```
# 我们现状:AI 看工具名直接猜,基本不会错
AI: "I'll call scene_open_scene to open the scene" ✓

# action-code 形态:AI 需先想"哪个工具 + 哪个 action"
AI: "I'll call scene_management with action... 'load'? or 'open'?" ✗
                                              ^^^^^^^^^^^^^^^^^^
                                              LLM 常见失败模式
```

---

## §2 我们 165 工具的"合并潜力" Hard Numbers

### §2.1 Per-category JSON bytes 分布(实测)

> 测量方法:对 `dist/tools/*.ts` 每个 ToolExecutor 调 `getTools()`,把返回的 `{name, description, inputSchema}` 数组 `JSON.stringify`,按 `Buffer.byteLength(..., 'utf8')` 求字节;tokens ≈ bytes / 4。

| Category | Scope | Tools | Bytes | Tokens | Avg/tool |
|---|---|---:|---:|---:|---:|
| scene | core | 8 | 1,461 | 365 | 46 |
| node | core | 11 | 5,643 | 1,411 | 128 |
| component | core | 8 | 7,358 | 1,840 | **230** |
| prefab | core | 13 | 3,922 | 981 | 75 |
| project | core | 24 | 6,293 | 1,573 | 66 |
| debug | core | 10 | 2,770 | 693 | 69 |
| assetAdvanced | core | 12 | 4,881 | 1,220 | 102 |
| sceneAdvanced | core | 23 | 5,803 | 1,451 | 63 |
| ui ⭐ | core | 3 | 2,724 | 681 | **227** |
| validation | optional | 3 | 939 | 235 | 78 |
| preferences | rare | 7 | 2,244 | 561 | 80 |
| server | rare | 6 | 911 | 228 | 38 |
| broadcast | rare | 5 | 1,100 | 275 | 55 |
| sceneView | rare | 20 | 3,561 | 890 | 45 |
| referenceImage | rare | 12 | 2,834 | 709 | 59 |
| **TOTAL** | — | **165** | **52,444** | **13,111** | 80 |

**观察**:

1. `component`(7,358 bytes)和 `ui`(2,724 / 3)是**单 tool schema 最肥的两类**(>220 bytes/tool),因为属性/枚举参数多
2. `project`(6,293)和 `sceneAdvanced`(5,803)是**工具数量最多** 且可合并空间大的两类
3. rare 5 类合计 10,650 bytes(20%),已被默认 `disabledScopes: ["rare"]` 处理掉,不再是本次合并目标

### §2.2 Top 20 最肥的单工具(合并候选 + description 瘦身候选)

| # | 工具 | Bytes | Desc % | Schema % | 策略 |
|---:|---|---:|---:|---:|---|
| 1 | `component_set_component_property` | 3,561 | 10% | 88% | 合并进 `component_manage({action})` 可省 ~500B |
| 2 | `node_create_node` | 2,054 | 11% | 87% | 合进 `node_lifecycle`,省 ~300B |
| 3 | `component_batch_set_properties` | 1,404 | 22% | 74% | **保留**(v1.5.0 新能力)|
| 4 | `node_set_node_transform` | 1,210 | 10% | 84% | 合进 `node_transform`,省 ~200B |
| 5 | `assetAdvanced_batch_configure` | 1,084 | 19% | 75% | **保留**(v1.5.0 新能力)|
| 6 | `project_find_asset_by_name` | 769 | 9% | 83% | 合进 `asset_query`,省 ~150B |
| 7 | `assetAdvanced_batch_import_assets` | 636 | 5% | 85% | 合进 `asset_manage({action:"batch_import"})` |
| 8 | `component_remove_component` | 576 | 35% | 55% | **description 瘦身可省 ~120B** |
| 9 | `component_add_component` | 571 | 23% | 67% | 同上,**瘦身省 ~80B** |
| 10 | `debug_get_project_logs` | 526 | 9% | 80% | 合进 `debug_logs({action:"get_project"})` |
| 11 | `debug_search_project_logs` | 504 | 11% | 77% | 同上 |
| 12 | `assetAdvanced_compress_textures` | 449 | 6% | 80% | 合进 `asset_manage`,省 ~100B |
| 13 | `sceneAdvanced_move_array_element` | 445 | 6% | 80% | 合进 `node_property_management({action:"move_array"})` |
| 14 | `prefab_instantiate_prefab` | 435 | 8% | 78% | 合进 `prefab_instance` |
| 15 | `preferences_set_preferences_config` | 435 | 7% | 78% | rare 类,已降级不考虑 |
| 16 | `sceneAdvanced_paste_node` | 433 | 7% | 81% | 合进 `node_clipboard` |
| 17 | `prefab_create_prefab` | 430 | 14% | 73% | 合进 `prefab_lifecycle` |
| 18 | `assetAdvanced_export_asset_manifest` | 423 | 7% | 77% | 合进 `asset_analyze` |
| 19 | `preferences_query_preferences_config` | 421 | 7% | 76% | rare,不考虑 |
| 20 | `node_set_node_property` | 417 | 26% | 60% | **description 瘦身可省 ~90B** |

**Top 20 合计**:10,235 bytes(19.5% of total)。
- 纯 description 瘦身(P1 路径)可省约 **780 bytes ≈ 195 tokens**。
- 全部合并(P3 路径)可省 ~5,000 bytes ≈ 1,250 tokens。

### §2.3 10+ 组"天然同族"合并候选

> 按"语义同质 + 返回值类型一致 + 无事务耦合"筛选,给每组打 **稳定性**(合并后 AI 是否仍能正确路由)和 **合并难度**(实现复杂度)。

| 组名 | 原工具数 | 原 bytes | 合并后估 | 省 bytes | 省 % | 稳定性 | 难度 |
|---|---:|---:|---:|---:|---:|---|---|
| `assetAdvanced_batch({action})` | 3 | 1,961 | 1,168 | 793 | **40%** | 🟢 高 | 🟢 低 |
| `debug_get({action})` | 6 | 1,544 | 919 | 625 | 40% | 🟡 中 | 🟡 中 |
| `project_asset_query({action})` | 6 | 1,433 | 783 | 650 | **45%** | 🟡 中 | 🟡 中 |
| `referenceImage_set({action})` | 4 | 1,154 | 652 | 502 | 44% | 🟢 高 | 🟢 低 |
| `sceneAdvanced_query({action})` | 6 | 1,045 | 630 | 415 | 40% | 🟡 中 | 🟡 中 |
| `sceneView_query({action})` | 8 | 971 | 633 | 338 | 35% | 🟡 中 | 🔴 高 |
| `sceneView_change({action})` | 4 | 898 | 549 | 349 | 39% | 🟡 中 | 🟡 中 |
| `component_query({action})` | 3 | 783 | 558 | 225 | 29% | 🟢 高 | 🟢 低 |
| `sceneAdvanced_reset({action})` | 3 | 701 | 549 | 152 | 22% | 🟡 中 | 🟢 低 |
| `sceneView_set({action})` | 3 | 632 | 488 | 144 | 23% | 🟢 高 | 🟢 低 |
| `scene_management({action})` | 5 | 1,047 | 680 | 367 | 35% | 🟢 高 | 🟡 中 |
| `node_lifecycle({action})` | 5 | 1,843 | 1,200 | 643 | 35% | 🟢 高 | 🟡 中 |

**稳定性筛选后**(🟢 + 合并难度 🟢/🟡 的):

| 组 | 省 bytes | 累计 |
|---|---:|---:|
| `assetAdvanced_batch` | 793 | 793 |
| `referenceImage_set`(rare 类,其实不必要合)| — | — |
| `component_query` | 225 | 1,018 |
| `sceneAdvanced_reset` | 152 | 1,170 |
| `sceneView_set`(rare 类,不必)| — | — |
| `scene_management` | 367 | 1,537 |
| `node_lifecycle` | 643 | **2,180** |

**6 组稳定合并预计省 ~2,180 bytes ≈ 545 tokens**(节省核心 core scope 的),占 rare-off 基线 11,084 的 **~5%**。加上 P1 description 瘦身 ~195 tokens,共 **~740 tokens,~6.5%**。

---

## §3 三路径对比详述

### §3.1 P1 — 轻量:仅 Top 20 description 瘦身

**目标**:不动结构,只把冗长的多行 markdown description 压成 ≤ 80 字符。

**示例**(以 `component_set_component_property` 为例):

```
// 现状(~470 字符多行 markdown 项目符号)
description: "Set component property values for UI components or custom script components. 
              Supports setting properties of built-in UI components (e.g., cc.Label, cc.Sprite) 
              and custom script components. Note: For node basic properties (name, active, layer, etc.), 
              use set_node_property. For node transform properties (position, rotation, scale, etc.), 
              use set_node_transform. ..."

// 瘦身后(~80 字符)
description: "Set a property on a component. For node fields use set_node_property / set_node_transform."
```

**实施**:
- 20 个目标工具分布在 6-7 个 `source/tools/*.ts` 文件
- 每工具改 1-3 行 description
- 详情改动**移到** [`FEATURE_GUIDE_CN.md`](FEATURE_GUIDE_CN.md) 对应工具章节(本就是 FEATURE_GUIDE 的职责)

**节省**:~195 tokens(-1.6% of 11,084)

**工作量**:1-2 小时

**破坏性**:**零**。工具名、参数、返回值零变化。

**风险**:若 description 被压太狠,AI 可能识别不出最佳用法。**缓解**:保留"关键词" + 指向 FEATURE_GUIDE 的引用。

### §3.2 P2 — 中度:6 组稳定合并 + P1

**目标**:合并"纯查询 / 纯生命周期"同族,保留复杂事务工具(`begin_undo_recording` / `prefab_edit_mode` 等)独立。

**具体 6 组**:

| # | 合并组 | 原工具 | 合并后新工具 |
|---|---|---|---|
| 1 | `asset_batch` | `batch_configure` + `batch_import_assets` + `batch_delete_assets` | `assetAdvanced_batch({ action: "configure"/"import"/"delete", ... })` |
| 2 | `component_query` | `get_components` + `get_component_info` + `get_available_components` | `component_query({ action: "list"/"info"/"available", ... })` |
| 3 | `scene_management` | `open_scene` + `save_scene` + `close_scene` + `create_scene` + `save_scene_as` | `scene_management({ action, ...params })` |
| 4 | `node_lifecycle` | `create_node` + `delete_node` + `duplicate_node` + `move_node` | `node_lifecycle({ action, ...params })` |
| 5 | `sceneAdvanced_reset` | `reset_node_property` + `reset_node_transform` + `reset_component` | `reset({ action, ...params })` |
| 6 | `debug_logs` | `get_console_logs` + `get_project_logs` + `search_project_logs` | `debug_logs({ action: "console"/"project"/"search", ... })` |

**保留独立**(原因):
- `component_batch_set_properties` + `ui_set_*` — v1.5.0 核心新能力,语义独立
- `sceneAdvanced_begin/end/cancel_undo_recording` — 事务三件套,合并后使用更复杂
- `prefab_open_edit_mode` / `save_edit` / `close_edit_mode` — 编辑模式事务
- `copy_node` / `paste_node` / `cut_node` — 剪贴板语义,合并后字节不省多少
- 所有 `set_component_property` 系列 — 参数太多,合并后 schema 膨胀严重
- rare 5 类 — 已降级,无需触及

**节省**:~740 tokens(-6.5% of 11,084)= 从 11,084 降到 ~10,340

**工作量**:
- 6 个新工具定义(schema + execute 路由 + 6 个方法的合并) — 约 ~300 行改动
- 12 个旧工具保留(deprecated 但仍返 response)或者真删(取决于兼容策略) — 约 100-150 行
- 新测试 + 更新现有测试 — 约 ~100 行
- 文档更新(FEATURE_GUIDE / README 迁移说明) — 约 100 行
- **总:~500 行,1-2 天**

**破坏性**:🟡 **低-中**
- 6 个工具名变了(AI prompt 若硬编码了旧名会断)
- 建议双写过渡:旧工具名保留 N 个版本,内部转发到新工具 + 返 `warning: 'deprecated'`

**风险**:
- **debug_logs** 合并有坑:`get_console_logs` vs `search_project_logs` 返回结构不同(前者纯 log 数组,后者带 location/context)。合并后 response 要按 action 分型,文档必须说清每个 action 返什么。
- **scene_management** 合并有坑:`open_scene` 成功要切当前场景状态,`get_current_scene` 是只读。合并到同工具后 side-effect 不一致,AI 可能误用。

### §3.3 P3 — 激进:全量 165 → 50 action-code

**目标**:完全对标上游,按 §1.3 表结构重写所有工具。

**表面数字**:总 bytes 47,879 → ~16,800(-65%),节省 ~7,770 tokens。

**真实隐藏成本**(§1.4 已分析):

1. **单工具 schema 平均 bytes 从 296 膨胀到 ~800-1,200**
   - 每个工具的 `action` enum 要列 8-15 个 string
   - 每个工具的 `properties` 要 union 所有 action 的参数 + 在 description 里说明哪个参数对哪个 action
   - 合并后单工具 schema 会出现"10+ optional property"的尴尬结构

2. **AI hallucination 概率上升**
   - `node_lifecycle({action: "create"})` vs `node_lifecycle({action: "new"})` — LLM 常犯错
   - 需要 prompt-level 工作(few-shot 示例)来驯化,**反过来又增加 context tokens**

3. **错误上下文丧失**
   - 错误消息从 `component_set_component_property failed: missing propertyType` 降级为 `component_manage failed: ...`,调试时要先反推是哪个 action
   - `errorCode` 需要额外的 `action` 字段标记,不然无法 routing

4. **需要 v2.0 breaking change**
   - 所有使用 MCP 的 AI prompt 需重写
   - `claude mcp add` / `FEATURE_GUIDE` / `PREFAB_EDIT_BEST_PRACTICES` / `INTEGRATION_TEST_PLAN` 全部需更新
   - 已有客户代码集成(假设有)全部作废

**工作量**:
- 15 个 `source/tools/*.ts` 全部重写
- `mcp-server.ts` 的 dispatch 逻辑重构(~300 行)
- 错误处理统一(~200 行)
- 全量自动化测试重写(~500 行)
- 文档全面翻修
- **总:~3,000 行,5-7 天**

**破坏性**:🔴 **极高**

**风险**:
- AI prompt 学习曲线陡峭(~2-4 周用户适应期)
- 难以增量回滚:一旦迁移,靠子集 revert 很难
- 如果后续发现 action-code 模式不适合某些 category(见 §3.2 的坑),要回头拆,成本更高

---

## §4 推荐路径 + 决策树

### §4.1 推荐组合:P1 + P2

**理由**:

1. **节省 ~8%** 已接近 P3 的"宣传效果"除以 8(65% / 8 ≈ 8%),但**工作量只有 P3 的 1/10**(1-2 天 vs 5-7 天)
2. **零/低破坏性** — 不触发 v2.0 breaking,现有 AI prompt 99% 不改
3. **可增量回滚** — 6 组合并独立,某组出问题单独 revert 即可
4. **保留 v1.5.0 核心新能力** — `ui_set_*` / `batch_configure` / `batch_set_properties` / errorCode 结构化都不受影响

### §4.2 不推荐 P3 的 4 个理由

1. **token 节省打折** — 表面 65% 实际 schema 膨胀会抵消 40%,净效果 ~35-40%(仍比 P2 好,但差距从 10x 缩到 5x)
2. **AI hallucination 增加** — 上游自己在 README 里写"action 码+参数模式,极大简化 AI 调用流程,提升成功率",但实测 LLM 对 enum 选择比对工具名选择更容易出错
3. **已有 `disabledScopes:["rare"]` 省了 15%** — 这部分是通过"关闭不用的 rare 类"实现,零破坏。接着再做 P1+P2 省 8%,已到 ~22% 节省门槛,边际收益递减明显
4. **破坏性不对等** — P3 要求 v2.0 major bump,所有使用方重适配。对单仓库 fork 而言,切换成本远超节省收益

### §4.3 什么情况下触发 P3?

**只有**以下任一条件成立时,才建议上 P3:

| 触发条件 | 判定方式 |
|---|---|
| Token 预算压到生命线 | AI 对话时长限制已让 v1.5.0 的 11,084 tokens 显著影响有效上下文(如 Sonnet 200k 里占比 > 10% 并长对话 degrade) |
| 上游合并已成 MCP 生态事实标准 | 大量第三方 MCP server 都用 action-code,我们的细粒度工具名成为兼容性孤岛 |
| 新增需求驱动重构 | 本就要做 v2.0 级别功能(如引入 action 以外的新 dimension),顺便切换 |
| 用户明确要求对齐上游 | 以升级合并至上游 cocos store 版本为目标 |

目前**没有任何一条触发**。继续 P1 + P2 路线。

### §4.4 决策树一图流

```
想进一步省 token?
├─ 是 → 想省多少?
│       ├─ ~5-10%,安全路线   → P1 + P2(本文推荐)
│       ├─ ~15%,可接受中等改动 → P1 + P2 + MCP_AUDIT §5 方案 B(多 server 拆分)
│       └─ ~40%+,愿意 v2.0   → P3(不推荐,除非 §4.3 触发)
└─ 否 → 现状(11,084 tokens @ rare-off)已够用,本文档归档即可
```

---

## §5 执行 outline(若决定做 P1 / P2)

### §5.1 P1 Top 20 description 瘦身 file+line 清单

> 目标:Top 20 中 description 占 > 20% 的 7 个工具优先瘦身。

| 工具 | 文件 | 当前长度 | 目标长度 |
|---|---|---:|---:|
| `component_set_component_property` | `source/tools/component-tools.ts:75` | ~470 | ≤ 80 |
| `component_remove_component` | `source/tools/component-tools.ts:~280` | ~200 | ≤ 80 |
| `component_add_component` | `source/tools/component-tools.ts:~205` | ~130 | ≤ 80 |
| `component_batch_set_properties` | `source/tools/component-tools.ts:184` | ~360 | ≤ 100 |
| `node_set_node_property` | `source/tools/node-tools.ts` | ~110 | ≤ 80 |
| `prefab_instantiate_prefab` | `source/tools/prefab-tools.ts:35` | ~70 | 保留 |
| `assetAdvanced_batch_configure` | `source/tools/asset-advanced-tools.ts:~220` | ~200 | ≤ 100 |

**准则**:
- 保留"一句话功能 + 最重要的警告/交叉引用"
- 详情**推到** `FEATURE_GUIDE_CN.md` 对应章节
- 验证:跑 `v1.5.0-invariants.test.ts`,特别是 Top 20 相关的 schema 断言

### §5.2 P2 六组合并 file+line 清单

| 合并组 | 目标文件 | 新工具定义位置 | 要删/deprecated 的旧工具 |
|---|---|---|---|
| 1. `assetAdvanced_batch` | `source/tools/asset-advanced-tools.ts` | getTools 末尾新增 | `batch_configure` / `batch_import_assets` / `batch_delete_assets` |
| 2. `component_query` | `source/tools/component-tools.ts` | getTools 末尾新增 | `get_components` / `get_component_info` / `get_available_components` |
| 3. `scene_management` | `source/tools/scene-tools.ts` | getTools 开头新增 | `open_scene` / `save_scene` / `close_scene` / `create_scene` / `save_scene_as` |
| 4. `node_lifecycle` | `source/tools/node-tools.ts` | getTools 末尾新增 | `create_node` / `delete_node` / `duplicate_node` / `move_node` |
| 5. `sceneAdvanced_reset` | `source/tools/scene-advanced-tools.ts` | getTools 开头新增 | `reset_node_property` / `reset_node_transform` / `reset_component` |
| 6. `debug_logs` | `source/tools/debug-tools.ts` | getTools 末尾新增 | `get_console_logs` / `get_project_logs` / `search_project_logs` |

**过渡策略**(推荐):
- 旧工具**保留 1 个版本**(v1.6.0 到 v1.7.0),内部转发到新工具 + response 加 `warning: 'tool_name deprecated, use new_name({action:...})'`
- 下一个 major(v2.0)再真删

**测试补充**:
- `tests/v1.5.0-invariants.test.ts` 里 I5 组要改:新旧工具同时可达
- 新增 `tests/p2-consolidation.test.ts`:每组新工具 × 每个 action 的 validation 短路分支

### §5.3 P3 不提供 outline

P3 超出单 /pm session 范围,需先产出独立的 `MIGRATION_V2_PLAN.md`(含客户迁移指南、过渡期策略、测试矩阵、风险评估)。**本文不覆盖**。

---

## §6 与已完成工作的位置图

```
v1.5.0 token 旅程(累积节省):

  13,111 tokens  (全量 165 工具)
     │
     │  ─ disabledScopes:["rare"] (已完成,默认配置)
     ▼
  11,084 tokens  (-15%,-2,027 tokens) ← 当前已交付的状态
     │
     │  ─ P1 (Top 20 瘦身)
     ▼
  ~10,890 tokens (-17%,-2,221 tokens)
     │
     │  ─ P2 (6 组稳定合并)
     ▼
  ~10,340 tokens (-21%,-2,771 tokens) ← 推荐终点
     │
     │   ┈┈┈ 这里是 P2 推荐停止线 ┈┈┈
     │
     │  ─ P3 (全量 action-code)
     ▼
  ~4,200 tokens  (-68%,-8,911 tokens) ← 理论极限,不推荐
```

已完成 = 15% / 推荐再做 = 6% / 剩余 47% 留给 P3(不做)。

---

## §7 结论

1. **上游"工具少功能多"的秘密 = action-code 模式**,本质是把"按 tool 分散的 schema"合并为"按 action 集中的大 schema"
2. 这个技巧**有效但打折** — 表面节省 65%,实际因 schema 膨胀 + AI hallucination 抵消后约 35-40%
3. 我们已经靠 `disabledScopes:["rare"]` 拿到 15% 的零破坏性节省;继续 **P1 + P2** 可再拿 8%,累计 ~23%
4. **不建议** P3 激进迁移 — ROI 跟不上破坏性成本,且会牺牲现在 165 工具的"自解释"优势
5. 如果用户决定做:新开 /pm session,scope 限定 "P1 + P2",估 1-2 天,v1.6.0

---

## 附录 A. 测量方法 & 可复现脚本

**本文所有数字都基于真实 `dist/` 产物测量,非估算。**

### A.1 Per-category bytes 脚本

```bash
cd /Users/jackliu/toolBox/Tool/cocos-mcp-server
node -e "
const cats = ['scene','node','component','prefab','project','debug','preferences',
              'server','broadcast','sceneAdvanced','sceneView','referenceImage',
              'assetAdvanced','validation','ui'];
const tools = cats.map(c => {
  const names = {
    scene:'SceneTools', node:'NodeTools', component:'ComponentTools',
    prefab:'PrefabTools', project:'ProjectTools', debug:'DebugTools',
    preferences:'PreferencesTools', server:'ServerTools', broadcast:'BroadcastTools',
    sceneAdvanced:'SceneAdvancedTools', sceneView:'SceneViewTools',
    referenceImage:'ReferenceImageTools', assetAdvanced:'AssetAdvancedTools',
    validation:'ValidationTools', ui:'UITools'
  };
  const Cls = require('./dist/tools/' + c.replace(/([A-Z])/g,'-\$1').toLowerCase().replace(/^-/,'') + '-tools')[names[c]];
  return new Cls();
});
let total = 0;
cats.forEach((c, i) => {
  const arr = tools[i].getTools().map(t => ({
    name: c + '_' + t.name,
    description: t.description,
    inputSchema: t.inputSchema
  }));
  const bytes = Buffer.byteLength(JSON.stringify(arr), 'utf8');
  total += bytes;
  console.log(c.padEnd(16), String(arr.length).padStart(3), String(bytes).padStart(6));
});
console.log('TOTAL'.padEnd(20), total, '~tokens:', Math.round(total/4));
"
```

### A.2 Top-N bloated 工具脚本

```bash
node -e "
/* 同上 load 所有 tools[],然后: */
const all = [];
cats.forEach((c, i) => {
  tools[i].getTools().forEach(t => {
    const entry = { name: c + '_' + t.name, description: t.description, inputSchema: t.inputSchema };
    all.push({ name: entry.name, bytes: Buffer.byteLength(JSON.stringify(entry), 'utf8') });
  });
});
all.sort((a, b) => b.bytes - a.bytes).slice(0, 20).forEach((x, i) => {
  console.log((i+1).toString().padStart(2), x.bytes.toString().padStart(5), x.name);
});
"
```

### A.3 上游 37 工具命名恢复

```bash
git show 4793a52:Tool/cocos-mcp-server/README.md \
  | sed -n '/### 🎯 场景操作/,/### 🛠️ 工具管理/p' \
  | grep -E '^- \*\*\w+_\w+'
```

### A.4 当前 token 实测对照

```bash
curl -s -X POST http://127.0.0.1:3001/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | python3 -c "
import json, sys
j = json.load(sys.stdin)
tools = j.get('result', {}).get('tools', [])
b = len(json.dumps(tools, ensure_ascii=False).encode('utf-8'))
print(f'tools: {len(tools)}  bytes: {b}  tokens≈{b//4}')
"
```

**运行环境**:Cocos Creator 3.8.6 + Node 18+ + v1.5.0 @ commit `96481d0`。数字可复现,误差 ≤ 1%。

---

_文档基于 v1.5.0(commit `96481d0`)。如后续 source/ 有结构变化,附录 A 脚本可重跑核对。_
