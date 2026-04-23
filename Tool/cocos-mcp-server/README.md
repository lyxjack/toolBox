# Cocos Creator MCP 服务器插件

一个适用于 Cocos Creator 3.8+ 的 MCP(模型上下文协议)服务器插件,让 AI 助手通过标准化协议与 Cocos Creator 编辑器交互。

**本仓库是独立维护分支**,聚焦在:
- **规模**: **165 个工具** 覆盖 **15 个 category**(详见 [`MCP_AUDIT_REPORT.md`](MCP_AUDIT_REPORT.md) §2 完整清单)
- **Token 预算可控**: 通过 `disabledScopes` 配置关闭低频 rare 类,token 消耗 **13,111 → 11,084(-15%)**,启动即省
- **结构化错误**: `ToolResponse.errorCode` + `details.suggestion` 让 AI 程序化区分错误类型(NOT_FOUND / INVALID_PARAMS / IO_ERROR / ...),替代字符串匹配
- **批量优化**: `assetAdvanced_batch_configure` / `component_batch_set_properties` / `ui_set_*` 把"N 次 MCP 调用"压缩到 1 次
- **测试覆盖**: `npm run test` 下 **288 个单元测试**,类型系统 + 参数验证 + 委托契约 + 源码结构断言
- **集成测试**: 真实 Cocos 编辑器跑分 **4.88/5**(见 [`INTEGRATION_TEST_PLAN.md`](INTEGRATION_TEST_PLAN.md))

## 快速链接

- [**🔍 MCP 审计报告**](MCP_AUDIT_REPORT.md) — 工具清单、Token 优化方案矩阵、独立缺口与 P0-P3 路线图
- [**🧰 Prefab 编辑最佳实践**](PREFAB_EDIT_BEST_PRACTICES.md) — 正确的 6+N 件套 sequence / 回滚路径 / 常见踩坑
- [**💰 Token 预算分析**](TOKEN_BUDGET_ANALYSIS.md) — 真实 schema bytes 实测 + 5 条进一步优化候选
- [**🧪 集成测试计划**](INTEGRATION_TEST_PLAN.md) — 28 个 Editor-dependent 测试点 + 评分模板
- [**📖 完整功能指南**](FEATURE_GUIDE_CN.md) — 每个工具的参数、返回、示例(附录 A-D 含 Token/errorCode/batch/UI 专题)

---

## 更新日志

### v1.5.0 (2026-04-22) — Phase 0 + Phase 1 集成

> 集成测试综合分 **4.88/5**(0 P0 / 0 P1 / 5 P2)。工具 160 → **165** / category 14 → **15**(新增 `ui`)。

#### 🆕 新能力

- **`disabledScopes` 配置项** — `settings/mcp-server.json` 加 `"disabledScopes": ["rare"]` 默认关 5 个低频 category(preferences / server / broadcast / sceneView / referenceImage);tools/list 从 165 降到 115,实测 token 从 13,111 降到 **11,084(-15%)**。每个工具也可用 `scope` 字段做 per-tool 覆盖。
- **结构化 `ToolResponse.errorCode`** — 新增 `errorCode: string`(UPPER_SNAKE_CASE,非枚举)+ `details: ErrorDetails`(含 `suggestion` / `relatedAssets` / `editorLogRef`)。prefab-tools.ts 下 **12 个高频错误点**已 retrofit。AI 可 `switch(resp.errorCode)` 做精确自修复,不再字符串匹配 `error` 文案。保留旧 `error: string` 字段不变,向后兼容。
- **`assetAdvanced_batch_configure`** — 一次调用批量改 N 张资产的 `type` / `wrapModeS` / `wrapModeT`,把"导 7 张 png 的 15 次 MCP 调用"压到 **2 次**;per-URL 失败隔离,返回 `succeeded/failed` + 每项 `applied` 命中标志。
- **新 `ui` category** — `component_batch_set_properties` 底座 + 3 个语义快捷 `ui_set_label` / `ui_set_layout` / `ui_set_sprite`;reward slot 构建从 10-12 次调用降到 **4-5 次**。propertyType 由 UITools 内部硬编码,用户只填字段值。

#### 🐛 修复

- settings 保存时合并未知字段,不再吞掉 panel 不可见字段(`disabledScopes` 等)
- UI 保存后 `MCPServer` 用 merged settings 重建,scope 过滤不再被 panel toggle 擦掉
- `tool-manager` 注册 `UITools`,`syncNewToolsToConfigurations` 自动把 ui 工具追加到既有配置
- `prefab_get_prefab_info` / `prefab_validate_prefab` / `prefab_duplicate_prefab` 补结构化 errorCode

#### 🧪 测试 / 文档

- 4 个 phase-scoped 测试文件共 **94 个 test case**,总数 194 → **288**
- 新增 `MCP_AUDIT_REPORT.md` / `PREFAB_EDIT_BEST_PRACTICES.md` / `INTEGRATION_TEST_PLAN.md` / `TOKEN_BUDGET_ANALYSIS.md`
- `FEATURE_GUIDE_CN.md` 新增附录 A-D

#### ⚠️ 已知限制(5 个 P2,不影响功能)

1. `server_get_server_status` 工具未暴露在默认 scope
2. `debug_get_editor_info` 在某些 Cocos 版本返 `version: "Unknown"`
3. README 部分位置写 port `3000`,若被占用会自动回退 3001
4. `ui_set_label({nodeUuid: "fake"})` 对不合法 UUID 返 `EDITOR_API_ERROR`(期望 `INVALID_PARAMS`)— ergonomics 瑕疵
5. `ui_set_label` 对未挂 cc.Label 的节点,suggestion 未显式引导 `component_add_component`

---

## 安装说明

### 1. 复制插件到项目

```
你的Cocos项目/
├── assets/
├── extensions/
│   └── cocos-mcp-server/          ← 插件放这里
│       ├── source/
│       ├── dist/
│       ├── package.json
│       └── ...
├── settings/
└── ...
```

### 2. 安装运行时依赖

```bash
cd extensions/cocos-mcp-server
npm install --omit=dev --legacy-peer-deps
```

> `--omit=dev` 跳过 vitest 等仅在源码 repo 需要的 devDependencies;`--legacy-peer-deps` 绕过上游 peer-dep 冲突。

### 3. 构建(若 dist/ 未同步)

```bash
npm run build
```

> 本仓库已预编译 dist/,通常可跳过。若改了 source/ 下代码需重新 build。

### 4. 在 Cocos Creator 启用

1. 打开项目 → 顶部菜单 → **扩展 → 扩展管理器**
2. 找到 `cocos-mcp-server` → **启用**
3. 控制台出现:
   ```
   [MCPServer] ✅ HTTP server started successfully on http://127.0.0.1:3000
   [MCPServer] Setup tools: 116 tools available (disabled scopes: [rare])
   ```

### 5. 链接 AI 客户端

**Claude Code CLI**:
```bash
claude mcp add --transport http cocos-creator http://127.0.0.1:3000/mcp
```

**Claude Desktop / Cursor / 任意 MCP client**:
```jsonc
{
  "mcpServers": {
    "cocos-creator": {
      "type": "http",
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

---

## 配置:`settings/mcp-server.json`

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `port` | number | 3000 | HTTP 端口。被占用时需手动改 |
| `autoStart` | boolean | false | 编辑器启动时自动拉起 MCP server |
| `enableDebugLog` | boolean | false | 详细 log |
| `maxConnections` | number | 10 | 最大并发连接数 |
| **`disabledScopes`** | `string[]` | `[]` | 关闭指定 scope 的工具。推荐 `["rare"]` 省 ~15% token |

### scope 分层(v1.5+)

| Scope | 默认 category | 工具数 | 用途 |
|---|---|---:|---|
| `core` | scene / node / component / prefab / project / debug / assetAdvanced / sceneAdvanced / ui | 112 (+1 per-tool: `server_get_server_status`) | 高频核心 |
| `optional` | validation | 3 | 偶尔使用 |
| `rare` | preferences / server / broadcast / sceneView / referenceImage | 50 | 实战几乎不触 |

**推荐组合**:
- `"disabledScopes": []` → 165 tools(全量,~13,111 token)
- `"disabledScopes": ["rare"]` → 116 tools(~11,100 token,-15%)**← 本仓库默认推荐**(含 P2.E 提升到 core 的 `server_get_server_status`)
- `"disabledScopes": ["rare", "optional"]` → 113 tools(~10,870 token)

详见 [`TOKEN_BUDGET_ANALYSIS.md`](TOKEN_BUDGET_ANALYSIS.md)。

---

## 能力概览(165 工具 / 15 category)

| Category | Scope | # | 代表工具 |
|---|---|---:|---|
| `scene` | core | 8 | `open_scene` / `save_scene` / `get_scene_hierarchy` |
| `node` | core | 11 | `create_node` / `find_nodes` / `set_node_transform` |
| `component` | core | 8 | `add_component` / `set_component_property` / `batch_set_properties` ⭐ |
| `prefab` | core | 13 | `open_edit_mode` / `save_edit` / `update_prefab` |
| `project` | core | 24 | `refresh_assets` / `build_project` / `create_asset` |
| `debug` | core | 10 | `get_console_logs` / `execute_script` / `validate_scene` |
| `assetAdvanced` | core | 12 | `batch_configure` ⭐ / `save_asset_meta` / `batch_import_assets` |
| `sceneAdvanced` | core | 23 | `begin_undo_recording` / `copy_node` / `paste_node` / `execute_scene_script` |
| `ui` ⭐ | core | 3 | `set_label` / `set_layout` / `set_sprite`(Phase 1 新)|
| `validation` | optional | 3 | `validate_json_params` / `safe_string_value` |
| `preferences` | rare | 7 | `query_preferences_config` |
| `server` | rare | 6 | `get_server_status` / `query_server_port` |
| `broadcast` | rare | 5 | `listen_broadcast` |
| `sceneView` | rare | 20 | `change_gizmo_tool` / `focus_camera_on_nodes` |
| `referenceImage` | rare | 12 | `add_reference_image` |

**⭐ = v1.5.0 新增或底座升级**。完整清单见 [`MCP_AUDIT_REPORT.md`](MCP_AUDIT_REPORT.md) §2.2。

---

## 开发

### 项目结构

```
cocos-mcp-server/
├── source/                         # TypeScript 源码
│   ├── main.ts                    # 插件入口(load/unload/panel 注册)
│   ├── mcp-server.ts              # MCP HTTP server + scope 过滤
│   ├── settings.ts                # 设置 IO(带 merge)
│   ├── types/index.ts             # 公共接口(ToolDefinition/ToolResponse/ErrorDetails/...)
│   ├── utils/
│   │   └── error-response.ts      # createErrorResponse + ERROR_CODES
│   ├── tools/                     # 15 个 category 实现
│   │   ├── scene-tools.ts
│   │   ├── node-tools.ts
│   │   ├── component-tools.ts
│   │   ├── prefab-tools.ts
│   │   ├── project-tools.ts
│   │   ├── debug-tools.ts
│   │   ├── asset-advanced-tools.ts
│   │   ├── scene-advanced-tools.ts
│   │   ├── ui-tools.ts            ⭐ Phase 1
│   │   ├── validation-tools.ts
│   │   ├── preferences-tools.ts
│   │   ├── server-tools.ts
│   │   ├── broadcast-tools.ts
│   │   ├── scene-view-tools.ts
│   │   ├── reference-image-tools.ts
│   │   └── tool-manager.ts        # 工具启用白名单管理
│   └── panels/                    # Vue 3 UI 面板
├── dist/                          # tsc 产物(tracked)
├── tests/                         # vitest 单元测试
│   ├── bug-fixes.test.ts
│   ├── reimport-and-prefab-edit.test.ts
│   ├── error-book-renumber.test.ts
│   ├── phase-0a-scope-filter.test.ts          ⭐
│   ├── phase-0b-error-response.test.ts        ⭐
│   ├── phase-0c-batch-configure.test.ts       ⭐
│   └── phase-1-batch-ui.test.ts               ⭐
├── scripts/preinstall.js
└── package.json
```

### 构建 / 测试

```bash
npm run build         # tsc → dist/
npm run watch         # tsc --watch
npm run test          # vitest run (288 tests)
npm run test:watch    # vitest
```

### 新增工具

1. 在 `source/tools/` 下新建或扩展 tool class
2. 实现 `ToolExecutor` 接口(`getTools()` + `execute(name, args)`)
3. 在 `source/mcp-server.ts` `initializeTools()` 里注册新 category
4. 在 `source/tools/tool-manager.ts` `initializeAvailableTools()` 里同步注册(否则 UI 白名单会遗漏)
5. 更新 `mcp-server.ts` 的 `CATEGORY_SCOPES` 映射
6. 新错误路径应走 `createErrorResponse(ERROR_CODES.XXX, msg, details)`(见 `source/utils/error-response.ts`)

---

## 故障排除

| 现象 | 排查 |
|---|---|
| 启动后 `Setup tools: 165`(无 `disabled scopes` 后缀)| 确认 `settings/mcp-server.json` 含 `"disabledScopes": ["rare"]`;扩展做过 **禁用 → 再启用** |
| 启动日志正常但 Claude Code `/mcp list` 显示 `✗ Connection refused` | 端口不一致;MCP server 日志第一行就能看到实际监听端口 |
| 工具能调到但返回很多 `EDITOR_API_ERROR` | 场景未加载 / 节点 UUID 过期 / 编辑模式未打开。调前先 `scene_get_current_scene` + `node_get_all_nodes` |
| 改了 `source/*.ts` 后不生效 | 需重 build(`npm run build`)并 **完全退出 Cocos Creator**(`Cmd+Q`)再开 — 扩展的 require cache 不会随"禁用/启用"清除 |

详细错误处理约定见 [`FEATURE_GUIDE_CN.md`](FEATURE_GUIDE_CN.md) 附录 B。

---

## 系统要求

- Cocos Creator 3.8.6+
- Node.js(Cocos Creator 自带)
- TypeScript(仅开发需要)

## 许可

源码随插件一起打包,供学习、交流、二次开发。
