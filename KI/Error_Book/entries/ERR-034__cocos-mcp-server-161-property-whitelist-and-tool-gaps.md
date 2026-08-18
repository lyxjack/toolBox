---
id: ERR-034
type: error
errorCode: "BHV-009"
severity: "medium"
status: "resolved"
recurrence: 0
firstSeen: "2026-06-12"
tags:
  - "error/medium"
  - "engine/cocos"
  - "tool/MCP"
  - "asset/prefab"
  - "errorCode/BHV-009"
  - ki/error-book
prevention: "用 cocos-mcp-server 1.6.1 自动化 prefab 前,先知道一批属性走 component_set_component_property 会被白名单拒(WebView.url/Widget.top/Label.string·fontSize/Button.transition/UIOpacity.opacity/Sprite.sizeMode),预留运行期脚本兜底;别假设 siblingIndex/prefab_validate/debug_execute_script 可用。"
aliases:
  - "ERR-034"
mem_ref: "705b1054-82b9-409a-bce1-6cb8fcfde2f1"
mem_status: "linked"
---

# cocos-mcp-server 1.6.1 实测:component 属性白名单拒设 + 多个工具失效

> **版本封存(2026-08-03)**: 本条全部工具名属 cocos-mcp-server **1.6.1** 命名空间(`component_set_component_property` / `node_create_node` 等),现行工具面已整套改名(`cocos_component` / `cocos_node` / `cocos_asset`),旧名在库内已无对应物。现行怪癖活台账见 [[ERR-069__cocos-mcp-tool-quirks-collection|ERR-069]]。

## 错误现象

`cocos-mcp-server` v1.6.1(编辑器内进程,HTTP `127.0.0.1:3000/mcp`,端口配于 `settings/mcp-server.json`)实测出一批"调用 success 但拿不到/设不上"的坑:

1. **属性白名单拒设** — `component_set_component_property` 对部分属性报 `Property 'X' not found on component 'Y'. Available properties: __scriptAsset, node, __prefab, …`(白名单极小)。已确认被拒:`cc.WebView.url`、`cc.Widget.top`、`cc.Label.string` / `fontSize`、`cc.Button.transition` / `zoomScale`、`cc.UIOpacity.opacity`、`cc.Sprite.sizeMode`。**连便利工具 `ui_set_label` 的 `string` 字段也走同一白名单被拒**(只有 color/对齐能设)。
2. **siblingIndex 静默不生效** — `node_create_node` 的 `siblingIndex` 与 `node_lifecycle(move)` 的 `siblingIndex` 设了无效果。
3. **prefab_validate_prefab 自身坏** — 调用即报 `读取预制体文件失败: Message does not exist: asset-db - read-asset`(IO_ERROR),且错误提示反诬"文件被外部脚本污染(ERR-002/005)"(误导)。
4. **debug_execute_script 失效** — 报 `Scenario scripts do not exist: console`,无法注入场景脚本。
5. **project_import_asset 导入 png 默认 `texture` 类型** — userData.type=texture,不能直接当 UI Sprite 用。(此坑后续复犯并推翻本条旧解法,现行结论见 [[ERR-079__png-import-texture-type-spriteframe-missing|ERR-079]]。)

## 根因分析

MCP wrapper 只暴露序列化属性的**子集**(多为运行期可写/事件类字段),与 prefab JSON 里的完整序列化字段不匹配;部分编辑器消息(asset-db read-asset / 场景脚本注入)在 1.6.1 wrapper 下已失效。属于工具实现边界,非资产损坏(`prefab_validate` 的"污染"提示是误报)。

## 解决方案

| 坑 | 兜底 |
|----|------|
| 属性白名单拒设 | **受限属性运行期脚本接管**:`Label.string/fontSize`、`Button.transition/zoomScale` 在 `onPush/onLoad` 里设;`UIOpacity.opacity` 改用 `Sprite.color` 的 alpha 等价;`Sprite.sizeMode`/`Widget.top` 同理代码设。对齐 [[ERR-022__cocos-sprite-fullscreen-mask-three-piece\|ERR-022]] 的"代码兜底"思路 |
| siblingIndex 失效 | 用 `sceneAdvanced_move_array_element(path="children", target, offset)` 重排 |
| prefab_validate 坏 | 用磁盘 JSON **只读审计**(python 解析 `__id__` 自洽 + spriteFrame uuid 比对)+ `prefab_open_edit_mode`/`save_edit` 往返代替校验 |
| debug_execute_script 坏 | 放弃场景脚本注入路径,改 MCP 原子工具组合 |
| png 默认 texture | ~~导入后 `assetAdvanced_save_asset_meta` 改 `userData.type`~~ **此解法已被 [[ERR-079__png-import-texture-type-spriteframe-missing\|ERR-079]] 推翻**:现行工具面无改导入类型能力,必须编辑器手工步(铁律禁手写 .meta),详见彼条 |

> 另注:本工程(2.x 迁移)所有 lobby UI 节点 `layer=1`(非 3.x 原生 UI_2D=33554432),MCP 新建节点跟随同级即可——与 [[ERR-004__mcp-prefab-layer-ui2d\|ERR-004]] 的"默认 layer=0 不可见"在本工程不冲突(工程惯例覆盖)。

## 预防规则

- 进入 cocos-mcp 驱动的 prefab 构建任务前,先回忆本条的白名单清单,把受限属性的"运行期脚本兜底"写进脚本设计,而非到 MCP 报错才补。
- `prefab_create_prefab` 之后必走 edit-mode 往返复核(见 [[ERR-021__cocos-prefab-create-loses-subchildren-properties\|ERR-021]]),因为白名单 + create 丢属性叠加,序列化产物常缺字段。
- 别用 `prefab_validate_prefab` 当校验门(它坏);用磁盘只读 diff。

## 关联
- [[PAT-001__mcp-prefab-workflow|PAT-001]] — MCP Prefab 完整修改流程,本条是 1.6.1 版本的工具边界补充
- [[ERR-021__cocos-prefab-create-loses-subchildren-properties|ERR-021]] — create_prefab 丢子节点属性,与白名单叠加放大缺字段
- [[ERR-004__mcp-prefab-layer-ui2d|ERR-004]] — MCP 节点 layer 默认值坑(本工程 layer=1 惯例)
- [[PAT-012__mcp-out-of-process-json-pipeline|PAT-012]] — MCP 进程外取数管道,同属"MCP 工具边界与兜底"主题
