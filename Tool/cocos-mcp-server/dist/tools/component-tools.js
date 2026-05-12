"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentTools = void 0;
const error_response_1 = require("../utils/error-response");
class ComponentTools {
    getTools() {
        return [
            {
                name: 'add_component',
                description: 'Add a component to a node. Requires nodeUuid.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Target node UUID. REQUIRED: You must specify the exact node to add the component to. Use get_all_nodes or find_node_by_name to get the UUID of the desired node.'
                        },
                        componentType: {
                            type: 'string',
                            description: 'Component type (e.g., cc.Sprite, cc.Label, cc.Button)'
                        }
                    },
                    required: ['nodeUuid', 'componentType']
                }
            },
            {
                name: 'remove_component',
                description: 'Remove a component. componentType must be cid from getComponents, not script/class name.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID'
                        },
                        componentType: {
                            type: 'string',
                            description: 'Component cid (type field from getComponents). Do NOT use script name or class name. Example: "cc.Sprite" or "9b4a7ueT9xD6aRE+AlOusy1"'
                        }
                    },
                    required: ['nodeUuid', 'componentType']
                }
            },
            // v1.6.0: get_components + get_component_info + get_available_components
            // merged into `query({action})` — see bottom of getTools().
            {
                name: 'set_component_property',
                description: 'Set a component property (cc.Label / cc.Sprite / custom). For node fields use set_node_property / set_node_transform. See FEATURE_GUIDE §3.5.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Target node UUID - Must specify the node to operate on'
                        },
                        componentType: {
                            type: 'string',
                            description: 'Component type - Can be built-in components (e.g., cc.Label) or custom script components (e.g., MyScript). If unsure about component type, use get_components first to retrieve all components on the node.',
                            // 移除enum限制，允许任意组件类型包括自定义脚本
                        },
                        property: {
                            type: 'string',
                            description: 'Property name - The property to set. Common properties include:\n' +
                                '• cc.Label: string (text content), fontSize (font size), color (text color)\n' +
                                '• cc.Sprite: spriteFrame (sprite frame), color (tint color), sizeMode (size mode)\n' +
                                '• cc.Button: normalColor (normal color), pressedColor (pressed color), target (target node)\n' +
                                '• cc.UITransform: contentSize (content size), anchorPoint (anchor point)\n' +
                                '• Custom Scripts: Based on properties defined in the script'
                        },
                        propertyType: {
                            type: 'string',
                            description: 'Property type - Must explicitly specify the property data type for correct value conversion and validation',
                            enum: [
                                'string', 'number', 'boolean', 'integer', 'float',
                                'color', 'vec2', 'vec3', 'size',
                                'node', 'component', 'spriteFrame', 'prefab', 'asset',
                                'nodeArray', 'colorArray', 'numberArray', 'stringArray'
                            ]
                        },
                        value: {
                            description: 'Property value - Use the corresponding data format based on propertyType:\n\n' +
                                '📝 Basic Data Types:\n' +
                                '• string: "Hello World" (text string)\n' +
                                '• number/integer/float: 42 or 3.14 (numeric value)\n' +
                                '• boolean: true or false (boolean value)\n\n' +
                                '🎨 Color Type:\n' +
                                '• color: {"r":255,"g":0,"b":0,"a":255} (RGBA values, range 0-255)\n' +
                                '  - Alternative: "#FF0000" (hexadecimal format)\n' +
                                '  - Transparency: a value controls opacity, 255 = fully opaque, 0 = fully transparent\n\n' +
                                '📐 Vector and Size Types:\n' +
                                '• vec2: {"x":100,"y":50} (2D vector)\n' +
                                '• vec3: {"x":1,"y":2,"z":3} (3D vector)\n' +
                                '• size: {"width":100,"height":50} (size dimensions)\n\n' +
                                '🔗 Reference Types (using UUID strings):\n' +
                                '• node: "target-node-uuid" (node reference)\n' +
                                '  How to get: Use get_all_nodes or find_node_by_name to get node UUIDs\n' +
                                '• component: "target-node-uuid" (component reference)\n' +
                                '  How it works: \n' +
                                '    1. Provide the UUID of the NODE that contains the target component\n' +
                                '    2. System auto-detects required component type from property metadata\n' +
                                '    3. Finds the component on target node and gets its scene __id__\n' +
                                '    4. Sets reference using the scene __id__ (not node UUID)\n' +
                                '  Example: value="label-node-uuid" will find cc.Label and use its scene ID\n' +
                                '• spriteFrame: "spriteframe-uuid" (sprite frame asset)\n' +
                                '  How to get: Check asset database or use asset browser\n' +
                                '• prefab: "prefab-uuid" (prefab asset)\n' +
                                '  How to get: Check asset database or use asset browser\n' +
                                '• asset: "asset-uuid" (generic asset reference)\n' +
                                '  How to get: Check asset database or use asset browser\n\n' +
                                '📋 Array Types:\n' +
                                '• nodeArray: ["uuid1","uuid2"] (array of node UUIDs)\n' +
                                '• colorArray: [{"r":255,"g":0,"b":0,"a":255}] (array of colors)\n' +
                                '• numberArray: [1,2,3,4,5] (array of numbers)\n' +
                                '• stringArray: ["item1","item2"] (array of strings)'
                        }
                    },
                    required: ['nodeUuid', 'componentType', 'property', 'propertyType', 'value']
                }
            },
            {
                name: 'attach_script',
                description: 'Attach a script component to a node',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID'
                        },
                        scriptPath: {
                            type: 'string',
                            description: 'Script asset path (e.g., db://assets/scripts/MyScript.ts)'
                        }
                    },
                    required: ['nodeUuid', 'scriptPath']
                }
            },
            {
                name: 'query',
                description: 'Unified component query (v1.6.0, read-only). action=list: all components on a node. action=info: one specific component. action=available: component types by category. Safe for parallel calls (no mutation). v1.6.2: action=list 默认 mode="minimal"（80-95% token 节省），需要完整字段元数据时传 mode="full"。',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['list', 'info', 'available'],
                            description: 'Which query to perform'
                        },
                        nodeUuid: { type: 'string', description: 'Target node UUID (required for list/info)' },
                        componentType: { type: 'string', description: 'Component type (required for info)' },
                        category: {
                            type: 'string',
                            enum: ['all', 'renderer', 'ui', 'physics', 'animation', 'audio'],
                            description: 'For available: filter by category',
                            default: 'all'
                        },
                        mode: {
                            type: 'string',
                            enum: ['full', 'minimal', 'values_only'],
                            description: 'For action=list: response detail level. minimal (default) strips i18n keys / defaults / enumList / _prefix duplicates / extends / 9-field sub-meta wrappers — keeps only `value` (+ `type` on cc.* references). full returns the raw Cocos dump (~10K tokens/component). values_only flattens to pure key-value pairs.',
                            default: 'minimal'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'batch_set_properties',
                description: 'Set N properties on one component in a single call. Per-property failures are isolated (succeeded/failed lists). Preferred over N separate set_component_property calls.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Target node UUID'
                        },
                        componentType: {
                            type: 'string',
                            description: 'Component type (e.g., cc.Label, cc.Sprite, cc.Layout, cc.UITransform). If unsure, call get_components first.'
                        },
                        properties: {
                            type: 'array',
                            description: 'Property entries. Each must include property name, propertyType (for type conversion), and value. Same shape as set_component_property individual calls.',
                            items: {
                                type: 'object',
                                properties: {
                                    property: { type: 'string', description: 'Property name (e.g., "string", "fontSize", "contentSize")' },
                                    propertyType: {
                                        type: 'string',
                                        description: 'Data type for conversion',
                                        enum: ['string', 'number', 'boolean', 'integer', 'float', 'color', 'vec2', 'vec3', 'size', 'node', 'component', 'spriteFrame', 'prefab', 'asset', 'nodeArray', 'colorArray', 'numberArray', 'stringArray']
                                    },
                                    value: { description: 'Property value (any type; matches propertyType)' }
                                },
                                required: ['property', 'propertyType', 'value']
                            }
                        }
                    },
                    required: ['nodeUuid', 'componentType', 'properties']
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'add_component':
                return await this.addComponent(args.nodeUuid, args.componentType);
            case 'remove_component':
                return await this.removeComponent(args.nodeUuid, args.componentType);
            case 'get_components':
                return await this.getComponents(args.nodeUuid, args.mode);
            case 'get_component_info':
                return await this.getComponentInfo(args.nodeUuid, args.componentType);
            case 'set_component_property':
                return await this.setComponentProperty(args);
            case 'attach_script':
                return await this.attachScript(args.nodeUuid, args.scriptPath);
            case 'get_available_components':
                return await this.getAvailableComponents(args.category);
            case 'batch_set_properties':
                return await this.batchSetProperties(args);
            case 'query':
                // v1.6.0 unified action-code dispatcher
                switch (args.action) {
                    case 'list':
                        return await this.getComponents(args.nodeUuid, args.mode);
                    case 'info':
                        return await this.getComponentInfo(args.nodeUuid, args.componentType);
                    case 'available':
                        return await this.getAvailableComponents(args.category);
                    default:
                        return (0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.INVALID_PARAMS, `Unknown query action: ${args.action}`, { suggestion: 'Use action: "list" | "info" | "available"' });
                }
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    async addComponent(nodeUuid, componentType) {
        return new Promise(async (resolve) => {
            var _a;
            // 先查找节点上是否已存在该组件
            const allComponentsInfo = await this.getComponents(nodeUuid);
            if (allComponentsInfo.success && ((_a = allComponentsInfo.data) === null || _a === void 0 ? void 0 : _a.components)) {
                const existingComponent = allComponentsInfo.data.components.find((comp) => comp.type === componentType);
                if (existingComponent) {
                    resolve({
                        success: true,
                        message: `Component '${componentType}' already exists on node`,
                        data: {
                            nodeUuid: nodeUuid,
                            componentType: componentType,
                            componentVerified: true,
                            existing: true
                        }
                    });
                    return;
                }
            }
            // 尝试直接使用 Editor API 添加组件
            Editor.Message.request('scene', 'create-component', {
                uuid: nodeUuid,
                component: componentType
            }).then(async (result) => {
                var _a;
                // 等待一段时间让Editor完成组件添加
                await new Promise(resolve => setTimeout(resolve, 100));
                // 重新查询节点信息验证组件是否真的添加成功
                try {
                    const allComponentsInfo2 = await this.getComponents(nodeUuid);
                    if (allComponentsInfo2.success && ((_a = allComponentsInfo2.data) === null || _a === void 0 ? void 0 : _a.components)) {
                        const addedComponent = allComponentsInfo2.data.components.find((comp) => comp.type === componentType);
                        if (addedComponent) {
                            resolve({
                                success: true,
                                message: `Component '${componentType}' added successfully`,
                                data: {
                                    nodeUuid: nodeUuid,
                                    componentType: componentType,
                                    componentVerified: true,
                                    existing: false
                                }
                            });
                        }
                        else {
                            resolve({
                                success: false,
                                error: `Component '${componentType}' was not found on node after addition. Available components: ${allComponentsInfo2.data.components.map((c) => c.type).join(', ')}`
                            });
                        }
                    }
                    else {
                        resolve({
                            success: false,
                            error: `Failed to verify component addition: ${allComponentsInfo2.error || 'Unable to get node components'}`
                        });
                    }
                }
                catch (verifyError) {
                    resolve({
                        success: false,
                        error: `Failed to verify component addition: ${verifyError.message}`
                    });
                }
            }).catch((err) => {
                // 备用方案：使用场景脚本
                const options = {
                    name: 'cocos-mcp-server',
                    method: 'addComponentToNode',
                    args: [nodeUuid, componentType]
                };
                Editor.Message.request('scene', 'execute-scene-script', options).then((result) => {
                    resolve(result);
                }).catch((err2) => {
                    resolve({ success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` });
                });
            });
        });
    }
    async removeComponent(nodeUuid, componentType) {
        return new Promise(async (resolve) => {
            var _a, _b, _c, _d, _e, _f;
            // 1. 查找节点上的所有组件
            const allComponentsInfo = await this.getComponents(nodeUuid);
            if (!allComponentsInfo.success || !((_a = allComponentsInfo.data) === null || _a === void 0 ? void 0 : _a.components)) {
                resolve((0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.EDITOR_API_ERROR, `Failed to get components for node '${nodeUuid}': ${allComponentsInfo.error}`));
                return;
            }
            // 2. 找到匹配 cid 的组件 + 其数组 index（getComponents 保持 __comps__ 原顺序）
            const components = allComponentsInfo.data.components;
            const matchedIndex = components.findIndex((comp) => comp.type === componentType);
            if (matchedIndex < 0) {
                resolve((0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.NOT_FOUND, `Component cid '${componentType}' not found on node '${nodeUuid}'. 请用 getComponents 取 type 字段（cid）作为 componentType。`, { nodeUuid, componentType, availableCids: components.map((c) => c.type) }));
                return;
            }
            const matched = components[matchedIndex];
            // 3. 构造候选 identifier 列表 — 自定义脚本的 cid 通常被 Cocos 拒绝，需 fallback
            //    顺序经验依据：组件实例 uuid → properties.uuid（备用提取路径）→ __comps__.N path → 数字 index → 老 cid（回退保底）
            const candidates = [];
            const seenPayloads = new Set();
            const tryPush = (label, payload) => {
                const key = `${typeof payload}:${String(payload)}`;
                if (seenPayloads.has(key))
                    return;
                seenPayloads.add(key);
                candidates.push({ label, payload });
            };
            if (matched.uuid)
                tryPush(`component uuid (${matched.uuid})`, matched.uuid);
            // properties.uuid 是 Cocos value 嵌套里的另一个 uuid 字段，部分自定义脚本只在这里有
            const innerUuid = (_b = matched.properties) === null || _b === void 0 ? void 0 : _b.uuid;
            if (innerUuid && typeof innerUuid === 'string')
                tryPush(`properties.uuid (${innerUuid})`, innerUuid);
            tryPush(`__comps__.${matchedIndex} path`, `__comps__.${matchedIndex}`);
            tryPush(`array index ${matchedIndex}`, matchedIndex);
            tryPush(`cid (${componentType})`, componentType);
            // 4. 依次尝试 remove-component，任一成功即返
            const triedIdentifiers = [];
            for (const candidate of candidates) {
                try {
                    await Editor.Message.request('scene', 'remove-component', {
                        uuid: nodeUuid,
                        component: candidate.payload
                    });
                    // verify by re-querying
                    const afterRemoveInfo = await this.getComponents(nodeUuid);
                    const stillExists = afterRemoveInfo.success
                        && ((_d = (_c = afterRemoveInfo.data) === null || _c === void 0 ? void 0 : _c.components) === null || _d === void 0 ? void 0 : _d.some((comp) => comp.type === componentType));
                    if (!stillExists) {
                        resolve({
                            success: true,
                            message: `Component cid '${componentType}' removed via remove-component(${candidate.label})`,
                            data: { nodeUuid, componentType, identifierUsed: candidate.label, strategy: 'remove-component' }
                        });
                        return;
                    }
                    triedIdentifiers.push({ identifier: candidate.label, outcome: 'cocos accepted call but component still present after re-query' });
                }
                catch (err) {
                    triedIdentifiers.push({ identifier: candidate.label, outcome: `threw: ${(err === null || err === void 0 ? void 0 : err.message) || String(err)}` });
                }
            }
            // 5. 最后 fallback: 用 scene > remove-array-element 直接从 __comps__ 数组剥掉。
            //    Cocos 自定义脚本对 remove-component 不响应（接受调用但不删），
            //    array-element 是绕过这个限制的可靠路径（已在 REQ-20260511-234213 实测）。
            try {
                await Editor.Message.request('scene', 'remove-array-element', {
                    uuid: nodeUuid,
                    path: '__comps__',
                    index: matchedIndex
                });
                const afterRemoveInfo = await this.getComponents(nodeUuid);
                const stillExists = afterRemoveInfo.success
                    && ((_f = (_e = afterRemoveInfo.data) === null || _e === void 0 ? void 0 : _e.components) === null || _f === void 0 ? void 0 : _f.some((comp) => comp.type === componentType));
                if (!stillExists) {
                    resolve({
                        success: true,
                        message: `Component cid '${componentType}' removed via remove-array-element(__comps__[${matchedIndex}])`,
                        data: { nodeUuid, componentType, identifierUsed: `__comps__[${matchedIndex}]`, strategy: 'remove-array-element' }
                    });
                    return;
                }
                triedIdentifiers.push({ identifier: `__comps__[${matchedIndex}] via remove-array-element`, outcome: 'cocos accepted call but component still present' });
            }
            catch (err) {
                triedIdentifiers.push({ identifier: `__comps__[${matchedIndex}] via remove-array-element`, outcome: `threw: ${(err === null || err === void 0 ? void 0 : err.message) || String(err)}` });
            }
            // 6. 全部失败 — 返结构化错误，让 caller 知道每个 identifier 是怎么挂的
            resolve((0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.EDITOR_API_ERROR, `Component cid '${componentType}' could not be removed from node '${nodeUuid}' after trying ${triedIdentifiers.length} identifier strategies (incl. remove-array-element).`, { nodeUuid, componentType, triedIdentifiers }));
        });
    }
    async getComponents(nodeUuid, mode = 'minimal') {
        return new Promise((resolve) => {
            // 优先尝试直接使用 Editor API 查询节点信息
            Editor.Message.request('scene', 'query-node', nodeUuid).then((nodeData) => {
                if (nodeData && nodeData.__comps__) {
                    const components = nodeData.__comps__.map((comp) => {
                        var _a, _b, _c, _d;
                        const rawProperties = this.extractComponentProperties(comp);
                        const properties = mode === 'full' ? rawProperties : this.compactProperties(rawProperties, mode);
                        // REQ-20260511-234213 修复: 组件实例 uuid 实际在 comp.value.uuid（Cocos 嵌套结构）
                        // 顶层 comp.uuid 通常未定义 — 之前 fallback chain 一直 null
                        const instanceUuid = ((_b = (_a = comp.value) === null || _a === void 0 ? void 0 : _a.uuid) === null || _b === void 0 ? void 0 : _b.value) ||
                            ((_c = comp.value) === null || _c === void 0 ? void 0 : _c.uuid) ||
                            ((_d = comp.uuid) === null || _d === void 0 ? void 0 : _d.value) ||
                            comp.uuid ||
                            null;
                        return {
                            type: comp.__type__ || comp.cid || comp.type || 'Unknown',
                            uuid: typeof instanceUuid === 'string' ? instanceUuid : null,
                            enabled: comp.enabled !== undefined ? comp.enabled : true,
                            properties
                        };
                    });
                    resolve({
                        success: true,
                        data: {
                            nodeUuid: nodeUuid,
                            mode,
                            components: components
                        }
                    });
                }
                else {
                    resolve({ success: false, error: 'Node not found or no components data' });
                }
            }).catch((err) => {
                // 备用方案：使用场景脚本
                const options = {
                    name: 'cocos-mcp-server',
                    method: 'getNodeInfo',
                    args: [nodeUuid]
                };
                Editor.Message.request('scene', 'execute-scene-script', options).then((result) => {
                    if (result.success) {
                        resolve({
                            success: true,
                            data: result.data.components
                        });
                    }
                    else {
                        resolve(result);
                    }
                }).catch((err2) => {
                    resolve({ success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` });
                });
            });
        });
    }
    async getComponentInfo(nodeUuid, componentType) {
        return new Promise((resolve) => {
            // 优先尝试直接使用 Editor API 查询节点信息
            Editor.Message.request('scene', 'query-node', nodeUuid).then((nodeData) => {
                if (nodeData && nodeData.__comps__) {
                    const component = nodeData.__comps__.find((comp) => {
                        const compType = comp.__type__ || comp.cid || comp.type;
                        return compType === componentType;
                    });
                    if (component) {
                        resolve({
                            success: true,
                            data: {
                                nodeUuid: nodeUuid,
                                componentType: componentType,
                                enabled: component.enabled !== undefined ? component.enabled : true,
                                properties: this.extractComponentProperties(component)
                            }
                        });
                    }
                    else {
                        resolve({ success: false, error: `Component '${componentType}' not found on node` });
                    }
                }
                else {
                    resolve({ success: false, error: 'Node not found or no components data' });
                }
            }).catch((err) => {
                // 备用方案：使用场景脚本
                const options = {
                    name: 'cocos-mcp-server',
                    method: 'getNodeInfo',
                    args: [nodeUuid]
                };
                Editor.Message.request('scene', 'execute-scene-script', options).then((result) => {
                    if (result.success && result.data.components) {
                        const component = result.data.components.find((comp) => comp.type === componentType);
                        if (component) {
                            resolve({
                                success: true,
                                data: Object.assign({ nodeUuid: nodeUuid, componentType: componentType }, component)
                            });
                        }
                        else {
                            resolve({ success: false, error: `Component '${componentType}' not found on node` });
                        }
                    }
                    else {
                        resolve({ success: false, error: result.error || 'Failed to get component info' });
                    }
                }).catch((err2) => {
                    resolve({ success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` });
                });
            });
        });
    }
    /**
     * OPT-1 (REQ-20260511-234213) — minimal/values_only 模式下压缩 properties。
     * Cocos 编辑器返回的每个 property 是 `{value, type, readonly, visible, animatable, displayName, tooltip, default, extends, enumList, ...}` 9-字段包装；
     * Agent 99% 只需要 `value`（和 `type` 在复杂引用上）。本方法剥离 i18n key、default、enumList、_前缀重复字段、extends 等。
     * 单点压缩比通常 80-95%（实测：3-组件节点从 ~30K tokens → ~3K tokens）。
     */
    compactProperties(rawProperties, mode) {
        if (!rawProperties || typeof rawProperties !== 'object')
            return rawProperties;
        const compact = {};
        for (const [key, propMeta] of Object.entries(rawProperties)) {
            // 跳过 _ 前缀重复字段（如 _color / _enabled，与无前缀版本同信息）
            if (key.startsWith('_') && key !== '__scriptAsset' && key !== '__prefab')
                continue;
            // sub-meta 9-字段包装：取 value，丢弃 displayName/tooltip/default/extends/readonly/visible/animatable/enumList
            if (propMeta && typeof propMeta === 'object' && 'value' in propMeta) {
                const innerValue = propMeta.value;
                if (mode === 'values_only') {
                    compact[key] = innerValue;
                }
                else {
                    // minimal: 保留 value + 在引用类型上保留 type
                    const propType = propMeta.type;
                    if (propType && typeof propType === 'string' && propType.startsWith('cc.')) {
                        compact[key] = { value: innerValue, type: propType };
                    }
                    else {
                        compact[key] = innerValue;
                    }
                }
            }
            else {
                // 非 sub-meta 包装（直接值），原样保留
                compact[key] = propMeta;
            }
        }
        return compact;
    }
    extractComponentProperties(component) {
        console.log(`[extractComponentProperties] Processing component:`, Object.keys(component));
        // 检查组件是否有 value 属性，这通常包含实际的组件属性
        if (component.value && typeof component.value === 'object') {
            console.log(`[extractComponentProperties] Found component.value with properties:`, Object.keys(component.value));
            return component.value; // 直接返回 value 对象，它包含所有组件属性
        }
        // 备用方案：从组件对象中直接提取属性
        const properties = {};
        const excludeKeys = ['__type__', 'enabled', 'node', '_id', '__scriptAsset', 'uuid', 'name', '_name', '_objFlags', '_enabled', 'type', 'readonly', 'visible', 'cid', 'editor', 'extends'];
        for (const key in component) {
            if (!excludeKeys.includes(key) && !key.startsWith('_')) {
                console.log(`[extractComponentProperties] Found direct property '${key}':`, typeof component[key]);
                properties[key] = component[key];
            }
        }
        console.log(`[extractComponentProperties] Final extracted properties:`, Object.keys(properties));
        return properties;
    }
    async findComponentTypeByUuid(componentUuid) {
        var _a;
        console.log(`[findComponentTypeByUuid] Searching for component type with UUID: ${componentUuid}`);
        if (!componentUuid) {
            return null;
        }
        try {
            const nodeTree = await Editor.Message.request('scene', 'query-node-tree');
            if (!nodeTree) {
                console.warn('[findComponentTypeByUuid] Failed to query node tree.');
                return null;
            }
            const queue = [nodeTree];
            while (queue.length > 0) {
                const currentNodeInfo = queue.shift();
                if (!currentNodeInfo || !currentNodeInfo.uuid) {
                    continue;
                }
                try {
                    const fullNodeData = await Editor.Message.request('scene', 'query-node', currentNodeInfo.uuid);
                    if (fullNodeData && fullNodeData.__comps__) {
                        for (const comp of fullNodeData.__comps__) {
                            const compAny = comp; // Cast to any to access dynamic properties
                            // The component UUID is nested in the 'value' property
                            if (compAny.uuid && compAny.uuid.value === componentUuid) {
                                const componentType = compAny.__type__;
                                console.log(`[findComponentTypeByUuid] Found component type '${componentType}' for UUID ${componentUuid} on node ${(_a = fullNodeData.name) === null || _a === void 0 ? void 0 : _a.value}`);
                                return componentType;
                            }
                        }
                    }
                }
                catch (e) {
                    console.warn(`[findComponentTypeByUuid] Could not query node ${currentNodeInfo.uuid}:`, e);
                }
                if (currentNodeInfo.children) {
                    for (const child of currentNodeInfo.children) {
                        queue.push(child);
                    }
                }
            }
            console.warn(`[findComponentTypeByUuid] Component with UUID ${componentUuid} not found in scene tree.`);
            return null;
        }
        catch (error) {
            console.error(`[findComponentTypeByUuid] Error while searching for component type:`, error);
            return null;
        }
    }
    async setComponentProperty(args) {
        const { nodeUuid, componentType, property, propertyType, value } = args;
        return new Promise(async (resolve) => {
            var _a, _b;
            try {
                console.log(`[ComponentTools] Setting ${componentType}.${property} (type: ${propertyType}) = ${JSON.stringify(value)} on node ${nodeUuid}`);
                // Step 0: 检测是否为节点属性，如果是则重定向到对应的节点方法
                const nodeRedirectResult = await this.checkAndRedirectNodeProperties(args);
                if (nodeRedirectResult) {
                    resolve(nodeRedirectResult);
                    return;
                }
                // Step 1: 获取组件信息，使用与getComponents相同的方法
                const componentsResponse = await this.getComponents(nodeUuid);
                if (!componentsResponse.success || !componentsResponse.data) {
                    resolve({
                        success: false,
                        error: `Failed to get components for node '${nodeUuid}': ${componentsResponse.error}`,
                        instruction: `Please verify that node UUID '${nodeUuid}' is correct. Use get_all_nodes or find_node_by_name to get the correct node UUID.`
                    });
                    return;
                }
                const allComponents = componentsResponse.data.components;
                // Step 2: 查找目标组件
                let targetComponent = null;
                const availableTypes = [];
                for (let i = 0; i < allComponents.length; i++) {
                    const comp = allComponents[i];
                    availableTypes.push(comp.type);
                    if (comp.type === componentType) {
                        targetComponent = comp;
                        break;
                    }
                }
                if (!targetComponent) {
                    // 提供更详细的错误信息和建议
                    const instruction = this.generateComponentSuggestion(componentType, availableTypes, property);
                    resolve({
                        success: false,
                        error: `Component '${componentType}' not found on node. Available components: ${availableTypes.join(', ')}`,
                        instruction: instruction
                    });
                    return;
                }
                // Step 3: 自动检测和转换属性值
                let propertyInfo;
                try {
                    console.log(`[ComponentTools] Analyzing property: ${property}`);
                    propertyInfo = this.analyzeProperty(targetComponent, property);
                }
                catch (analyzeError) {
                    console.error(`[ComponentTools] Error in analyzeProperty:`, analyzeError);
                    resolve({
                        success: false,
                        error: `Failed to analyze property '${property}': ${analyzeError.message}`
                    });
                    return;
                }
                if (!propertyInfo.exists) {
                    resolve({
                        success: false,
                        error: `Property '${property}' not found on component '${componentType}'. Available properties: ${propertyInfo.availableProperties.join(', ')}`
                    });
                    return;
                }
                // Step 4: 处理属性值和设置
                const originalValue = propertyInfo.originalValue;
                let processedValue;
                // 根据明确的propertyType处理属性值
                switch (propertyType) {
                    case 'string':
                        processedValue = String(value);
                        break;
                    case 'number':
                    case 'integer':
                    case 'float':
                        processedValue = Number(value);
                        break;
                    case 'boolean':
                        // REQ-20260511-234213 修复: JS Boolean("false") === true（非空字符串 truthy 坑），
                        // 所以 MCP wire 把 false 字符串化后这里会反 flip。显式 string parse 规避。
                        if (typeof value === 'boolean') {
                            processedValue = value;
                        }
                        else if (typeof value === 'string') {
                            processedValue = value.toLowerCase() === 'true' || value === '1';
                        }
                        else {
                            processedValue = Boolean(value);
                        }
                        break;
                    case 'color':
                        if (typeof value === 'string') {
                            // 字符串格式：支持十六进制、颜色名称、rgb()/rgba()
                            processedValue = this.parseColorString(value);
                        }
                        else if (typeof value === 'object' && value !== null) {
                            // 对象格式：验证并转换RGBA值
                            processedValue = {
                                r: Math.min(255, Math.max(0, Number(value.r) || 0)),
                                g: Math.min(255, Math.max(0, Number(value.g) || 0)),
                                b: Math.min(255, Math.max(0, Number(value.b) || 0)),
                                a: value.a !== undefined ? Math.min(255, Math.max(0, Number(value.a))) : 255
                            };
                        }
                        else {
                            throw new Error('Color value must be an object with r, g, b properties or a hexadecimal string (e.g., "#FF0000")');
                        }
                        break;
                    case 'vec2':
                        if (typeof value === 'object' && value !== null) {
                            processedValue = {
                                x: Number(value.x) || 0,
                                y: Number(value.y) || 0
                            };
                        }
                        else {
                            throw new Error('Vec2 value must be an object with x, y properties');
                        }
                        break;
                    case 'vec3':
                        if (typeof value === 'object' && value !== null) {
                            processedValue = {
                                x: Number(value.x) || 0,
                                y: Number(value.y) || 0,
                                z: Number(value.z) || 0
                            };
                        }
                        else {
                            throw new Error('Vec3 value must be an object with x, y, z properties');
                        }
                        break;
                    case 'size':
                        if (typeof value === 'object' && value !== null) {
                            processedValue = {
                                width: Number(value.width) || 0,
                                height: Number(value.height) || 0
                            };
                        }
                        else {
                            throw new Error('Size value must be an object with width, height properties');
                        }
                        break;
                    case 'node':
                        if (typeof value === 'string') {
                            processedValue = { uuid: value };
                        }
                        else {
                            throw new Error('Node reference value must be a string UUID');
                        }
                        break;
                    case 'component':
                        if (typeof value === 'string') {
                            // 组件引用需要特殊处理：通过节点UUID找到组件的__id__
                            processedValue = value; // 先保存节点UUID，后续会转换为__id__
                        }
                        else {
                            throw new Error('Component reference value must be a string (node UUID containing the target component)');
                        }
                        break;
                    case 'spriteFrame':
                    case 'prefab':
                    case 'asset':
                        if (typeof value === 'string') {
                            processedValue = { uuid: value };
                        }
                        else {
                            throw new Error(`${propertyType} value must be a string UUID`);
                        }
                        break;
                    case 'nodeArray':
                        if (Array.isArray(value)) {
                            processedValue = value.map((item) => {
                                if (typeof item === 'string') {
                                    return { uuid: item };
                                }
                                else {
                                    throw new Error('NodeArray items must be string UUIDs');
                                }
                            });
                        }
                        else {
                            throw new Error('NodeArray value must be an array');
                        }
                        break;
                    case 'colorArray':
                        if (Array.isArray(value)) {
                            processedValue = value.map((item) => {
                                if (typeof item === 'object' && item !== null && 'r' in item) {
                                    return {
                                        r: Math.min(255, Math.max(0, Number(item.r) || 0)),
                                        g: Math.min(255, Math.max(0, Number(item.g) || 0)),
                                        b: Math.min(255, Math.max(0, Number(item.b) || 0)),
                                        a: item.a !== undefined ? Math.min(255, Math.max(0, Number(item.a))) : 255
                                    };
                                }
                                else {
                                    return { r: 255, g: 255, b: 255, a: 255 };
                                }
                            });
                        }
                        else {
                            throw new Error('ColorArray value must be an array');
                        }
                        break;
                    case 'numberArray':
                        if (Array.isArray(value)) {
                            processedValue = value.map((item) => Number(item));
                        }
                        else {
                            throw new Error('NumberArray value must be an array');
                        }
                        break;
                    case 'stringArray':
                        if (Array.isArray(value)) {
                            processedValue = value.map((item) => String(item));
                        }
                        else {
                            throw new Error('StringArray value must be an array');
                        }
                        break;
                    default:
                        throw new Error(`Unsupported property type: ${propertyType}`);
                }
                console.log(`[ComponentTools] Converting value: ${JSON.stringify(value)} -> ${JSON.stringify(processedValue)} (type: ${propertyType})`);
                console.log(`[ComponentTools] Property analysis result: propertyInfo.type="${propertyInfo.type}", propertyType="${propertyType}"`);
                console.log(`[ComponentTools] Will use color special handling: ${propertyType === 'color' && processedValue && typeof processedValue === 'object'}`);
                // 用于验证的实际期望值（对于组件引用需要特殊处理）
                let actualExpectedValue = processedValue;
                // Step 5: 获取原始节点数据来构建正确的路径
                const rawNodeData = await Editor.Message.request('scene', 'query-node', nodeUuid);
                if (!rawNodeData || !rawNodeData.__comps__) {
                    resolve({
                        success: false,
                        error: `Failed to get raw node data for property setting`
                    });
                    return;
                }
                // 找到原始组件的索引
                let rawComponentIndex = -1;
                for (let i = 0; i < rawNodeData.__comps__.length; i++) {
                    const comp = rawNodeData.__comps__[i];
                    const compType = comp.__type__ || comp.cid || comp.type || 'Unknown';
                    if (compType === componentType) {
                        rawComponentIndex = i;
                        break;
                    }
                }
                if (rawComponentIndex === -1) {
                    resolve({
                        success: false,
                        error: `Could not find component index for setting property`
                    });
                    return;
                }
                // 构建正确的属性路径
                let propertyPath = `__comps__.${rawComponentIndex}.${property}`;
                // 特殊处理资源类属性
                if (propertyType === 'asset' || propertyType === 'spriteFrame' || propertyType === 'prefab' ||
                    (propertyInfo.type === 'asset' && propertyType === 'string')) {
                    console.log(`[ComponentTools] Setting asset reference:`, {
                        value: processedValue,
                        property: property,
                        propertyType: propertyType,
                        path: propertyPath
                    });
                    // Determine asset type based on property name
                    let assetType = 'cc.SpriteFrame'; // default
                    if (property.toLowerCase().includes('texture')) {
                        assetType = 'cc.Texture2D';
                    }
                    else if (property.toLowerCase().includes('material')) {
                        assetType = 'cc.Material';
                    }
                    else if (property.toLowerCase().includes('font')) {
                        assetType = 'cc.Font';
                    }
                    else if (property.toLowerCase().includes('clip')) {
                        assetType = 'cc.AudioClip';
                    }
                    else if (propertyType === 'prefab') {
                        assetType = 'cc.Prefab';
                    }
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: {
                            value: processedValue,
                            type: assetType
                        }
                    });
                }
                else if (componentType === 'cc.UITransform' && (property === '_contentSize' || property === 'contentSize')) {
                    // Special handling for UITransform contentSize - set width and height separately
                    const width = Number(value.width) || 100;
                    const height = Number(value.height) || 100;
                    // Set width first
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: `__comps__.${rawComponentIndex}.width`,
                        dump: { value: width }
                    });
                    // Then set height
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: `__comps__.${rawComponentIndex}.height`,
                        dump: { value: height }
                    });
                }
                else if (componentType === 'cc.UITransform' && (property === '_anchorPoint' || property === 'anchorPoint')) {
                    // Special handling for UITransform anchorPoint - set anchorX and anchorY separately
                    const anchorX = Number(value.x) || 0.5;
                    const anchorY = Number(value.y) || 0.5;
                    // Set anchorX first
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: `__comps__.${rawComponentIndex}.anchorX`,
                        dump: { value: anchorX }
                    });
                    // Then set anchorY  
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: `__comps__.${rawComponentIndex}.anchorY`,
                        dump: { value: anchorY }
                    });
                }
                else if (propertyType === 'color' && processedValue && typeof processedValue === 'object') {
                    // 特殊处理颜色属性，确保RGBA值正确
                    // Cocos Creator颜色值范围是0-255
                    const colorValue = {
                        r: Math.min(255, Math.max(0, Number(processedValue.r) || 0)),
                        g: Math.min(255, Math.max(0, Number(processedValue.g) || 0)),
                        b: Math.min(255, Math.max(0, Number(processedValue.b) || 0)),
                        a: processedValue.a !== undefined ? Math.min(255, Math.max(0, Number(processedValue.a))) : 255
                    };
                    console.log(`[ComponentTools] Setting color value:`, colorValue);
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: {
                            value: colorValue,
                            type: 'cc.Color'
                        }
                    });
                }
                else if (propertyType === 'boolean') {
                    // 修复 Bug #2 (REQ-20260511-234213): boolean 字段必须显式带 type: 'Boolean'，
                    // 否则 Cocos set-property dump 反序列化把它当 truthy/falsy 任意值，导致静默 no-op。
                    // 之前因为这里没有 boolean 分支，落到末尾 catch-all (没有 type)，所以 active/enabled 等切换全部失败。
                    if (typeof processedValue !== 'boolean') {
                        return resolve((0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.INVALID_PARAMS, `Property '${property}' on '${componentType}' expects a boolean value, got ${typeof processedValue}: ${JSON.stringify(processedValue)}`, { componentType, property, intendedType: 'boolean', actualType: typeof processedValue }));
                    }
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: {
                            value: processedValue,
                            type: 'Boolean'
                        }
                    });
                }
                else if (propertyType === 'vec3' && processedValue && typeof processedValue === 'object') {
                    // 特殊处理Vec3属性
                    const vec3Value = {
                        x: Number(processedValue.x) || 0,
                        y: Number(processedValue.y) || 0,
                        z: Number(processedValue.z) || 0
                    };
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: {
                            value: vec3Value,
                            type: 'cc.Vec3'
                        }
                    });
                }
                else if (propertyType === 'vec2' && processedValue && typeof processedValue === 'object') {
                    // 特殊处理Vec2属性
                    const vec2Value = {
                        x: Number(processedValue.x) || 0,
                        y: Number(processedValue.y) || 0
                    };
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: {
                            value: vec2Value,
                            type: 'cc.Vec2'
                        }
                    });
                }
                else if (propertyType === 'size' && processedValue && typeof processedValue === 'object') {
                    // 特殊处理Size属性
                    const sizeValue = {
                        width: Number(processedValue.width) || 0,
                        height: Number(processedValue.height) || 0
                    };
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: {
                            value: sizeValue,
                            type: 'cc.Size'
                        }
                    });
                }
                else if (propertyType === 'node' && processedValue && typeof processedValue === 'object' && 'uuid' in processedValue) {
                    // 特殊处理节点引用
                    console.log(`[ComponentTools] Setting node reference with UUID: ${processedValue.uuid}`);
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: {
                            value: processedValue,
                            type: 'cc.Node'
                        }
                    });
                }
                else if (propertyType === 'component' && typeof processedValue === 'string') {
                    // 特殊处理组件引用：通过节点UUID找到组件的__id__
                    const targetNodeUuid = processedValue;
                    console.log(`[ComponentTools] Setting component reference - finding component on node: ${targetNodeUuid}`);
                    // 从当前组件的属性元数据中获取期望的组件类型
                    let expectedComponentType = '';
                    // 获取当前组件的详细信息，包括属性元数据
                    const currentComponentInfo = await this.getComponentInfo(nodeUuid, componentType);
                    if (currentComponentInfo.success && ((_b = (_a = currentComponentInfo.data) === null || _a === void 0 ? void 0 : _a.properties) === null || _b === void 0 ? void 0 : _b[property])) {
                        const propertyMeta = currentComponentInfo.data.properties[property];
                        // 从属性元数据中提取组件类型信息
                        if (propertyMeta && typeof propertyMeta === 'object') {
                            // 检查是否有type字段指示组件类型
                            if (propertyMeta.type) {
                                expectedComponentType = propertyMeta.type;
                            }
                            else if (propertyMeta.ctor) {
                                // 有些属性可能使用ctor字段
                                expectedComponentType = propertyMeta.ctor;
                            }
                            else if (propertyMeta.extends && Array.isArray(propertyMeta.extends)) {
                                // 检查extends数组，通常第一个是最具体的类型
                                for (const extendType of propertyMeta.extends) {
                                    if (extendType.startsWith('cc.') && extendType !== 'cc.Component' && extendType !== 'cc.Object') {
                                        expectedComponentType = extendType;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    if (!expectedComponentType) {
                        throw new Error(`Unable to determine required component type for property '${property}' on component '${componentType}'. Property metadata may not contain type information.`);
                    }
                    console.log(`[ComponentTools] Detected required component type: ${expectedComponentType} for property: ${property}`);
                    try {
                        // 获取目标节点的组件信息
                        const targetNodeData = await Editor.Message.request('scene', 'query-node', targetNodeUuid);
                        if (!targetNodeData || !targetNodeData.__comps__) {
                            throw new Error(`Target node ${targetNodeUuid} not found or has no components`);
                        }
                        // 打印目标节点的组件概览
                        console.log(`[ComponentTools] Target node ${targetNodeUuid} has ${targetNodeData.__comps__.length} components:`);
                        targetNodeData.__comps__.forEach((comp, index) => {
                            const sceneId = comp.value && comp.value.uuid && comp.value.uuid.value ? comp.value.uuid.value : 'unknown';
                            console.log(`[ComponentTools] Component ${index}: ${comp.type} (scene_id: ${sceneId})`);
                        });
                        // 查找对应的组件
                        let targetComponent = null;
                        let componentId = null;
                        // 在目标节点的_components数组中查找指定类型的组件
                        // 注意：__comps__和_components的索引是对应的
                        console.log(`[ComponentTools] Searching for component type: ${expectedComponentType}`);
                        for (let i = 0; i < targetNodeData.__comps__.length; i++) {
                            const comp = targetNodeData.__comps__[i];
                            console.log(`[ComponentTools] Checking component ${i}: type=${comp.type}, target=${expectedComponentType}`);
                            if (comp.type === expectedComponentType) {
                                targetComponent = comp;
                                console.log(`[ComponentTools] Found matching component at index ${i}: ${comp.type}`);
                                // 从组件的value.uuid.value中获取组件在场景中的ID
                                if (comp.value && comp.value.uuid && comp.value.uuid.value) {
                                    componentId = comp.value.uuid.value;
                                    console.log(`[ComponentTools] Got componentId from comp.value.uuid.value: ${componentId}`);
                                }
                                else {
                                    console.log(`[ComponentTools] Component structure:`, {
                                        hasValue: !!comp.value,
                                        hasUuid: !!(comp.value && comp.value.uuid),
                                        hasUuidValue: !!(comp.value && comp.value.uuid && comp.value.uuid.value),
                                        uuidStructure: comp.value ? comp.value.uuid : 'No value'
                                    });
                                    throw new Error(`Unable to extract component ID from component structure`);
                                }
                                break;
                            }
                        }
                        if (!targetComponent) {
                            // 如果没找到，列出可用组件让用户了解，显示场景中的真实ID
                            const availableComponents = targetNodeData.__comps__.map((comp, index) => {
                                let sceneId = 'unknown';
                                // 从组件的value.uuid.value获取场景ID
                                if (comp.value && comp.value.uuid && comp.value.uuid.value) {
                                    sceneId = comp.value.uuid.value;
                                }
                                return `${comp.type}(scene_id:${sceneId})`;
                            });
                            throw new Error(`Component type '${expectedComponentType}' not found on node ${targetNodeUuid}. Available components: ${availableComponents.join(', ')}`);
                        }
                        console.log(`[ComponentTools] Found component ${expectedComponentType} with scene ID: ${componentId} on node ${targetNodeUuid}`);
                        // 更新期望值为实际的组件ID对象格式，用于后续验证
                        if (componentId) {
                            actualExpectedValue = { uuid: componentId };
                        }
                        // 尝试使用与节点/资源引用相同的格式：{uuid: componentId}
                        // 测试看是否能正确设置组件引用
                        await Editor.Message.request('scene', 'set-property', {
                            uuid: nodeUuid,
                            path: propertyPath,
                            dump: {
                                value: { uuid: componentId }, // 使用对象格式，像节点/资源引用一样
                                type: expectedComponentType
                            }
                        });
                    }
                    catch (error) {
                        console.error(`[ComponentTools] Error setting component reference:`, error);
                        throw error;
                    }
                }
                else if (propertyType === 'nodeArray' && Array.isArray(processedValue)) {
                    // 特殊处理节点数组 - 保持预处理的格式
                    console.log(`[ComponentTools] Setting node array:`, processedValue);
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: {
                            value: processedValue // 保持 [{uuid: "..."}, {uuid: "..."}] 格式
                        }
                    });
                }
                else if (propertyType === 'colorArray' && Array.isArray(processedValue)) {
                    // 特殊处理颜色数组
                    const colorArrayValue = processedValue.map((item) => {
                        if (item && typeof item === 'object' && 'r' in item) {
                            return {
                                r: Math.min(255, Math.max(0, Number(item.r) || 0)),
                                g: Math.min(255, Math.max(0, Number(item.g) || 0)),
                                b: Math.min(255, Math.max(0, Number(item.b) || 0)),
                                a: item.a !== undefined ? Math.min(255, Math.max(0, Number(item.a))) : 255
                            };
                        }
                        else {
                            return { r: 255, g: 255, b: 255, a: 255 };
                        }
                    });
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: {
                            value: colorArrayValue,
                            type: 'cc.Color'
                        }
                    });
                }
                else {
                    // Normal property setting for non-asset properties
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: { value: processedValue }
                    });
                }
                // Step 5: 等待Editor完成更新，然后验证设置结果
                await new Promise(resolve => setTimeout(resolve, 200)); // 等待200ms让Editor完成更新
                const verification = await this.verifyPropertyChange(nodeUuid, componentType, property, originalValue, actualExpectedValue);
                // UX-1 修复 (REQ-20260511-234213): 静默成功根因 — 如果 cocos 接受了 set-property 调用但实际值没变（典型如 Bug #2 的 boolean），
                // 必须返 success: false 而非旧的"无论 verified 真假都返 true"。caller 凭此才能知道 silent no-op。
                if (!verification.verified) {
                    resolve((0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.EDITOR_API_ERROR, `set ${componentType}.${property} appears to have silently no-op'd — cocos accepted the call but post-set value did not match intended.`, {
                        nodeUuid,
                        componentType,
                        property,
                        propertyType,
                        intended: actualExpectedValue,
                        before: originalValue,
                        actual: verification.actualValue,
                        suggestion: propertyType === 'boolean'
                            ? 'Verify the property is actually boolean on this component; cocos may need a different propertyType.'
                            : 'Check that propertyType matches the actual field type, and that the value shape is correct.'
                    }));
                    return;
                }
                resolve({
                    success: true,
                    message: `Successfully set ${componentType}.${property}`,
                    data: {
                        nodeUuid,
                        componentType,
                        property,
                        actualValue: verification.actualValue,
                        changed: JSON.stringify(originalValue) !== JSON.stringify(verification.actualValue)
                    }
                });
            }
            catch (error) {
                console.error(`[ComponentTools] Error setting property:`, error);
                resolve((0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.EDITOR_API_ERROR, `Failed to set property ${componentType}.${property}: ${error.message}`, { nodeUuid, componentType, property, propertyType }));
            }
        });
    }
    /**
     * Batch-set N properties on the same (nodeUuid, componentType).
     * Internally calls setComponentProperty for each entry serially.
     * Individual failures do NOT abort the batch — they are collected into `failed[]`.
     * Returns success=true if at least one property applied; success=false if ALL failed.
     */
    async batchSetProperties(args) {
        var _a;
        const { nodeUuid, componentType, properties } = args;
        if (!nodeUuid || typeof nodeUuid !== 'string') {
            return (0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.INVALID_PARAMS, 'nodeUuid must be a non-empty string', { suggestion: 'Use get_all_nodes or find_node_by_name to obtain the UUID' });
        }
        // Shape check for obvious garbage (P2.C fix — consistent with UITools).
        if (!/^[A-Za-z0-9+/=_\-]{8,}$/.test(nodeUuid)) {
            return (0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.INVALID_PARAMS, `nodeUuid "${nodeUuid}" does not look like a valid Cocos UUID`, { suggestion: 'UUID must be at least 8 chars, alphanumeric + [+/=_-].' });
        }
        if (!componentType || typeof componentType !== 'string') {
            return (0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.INVALID_PARAMS, 'componentType must be a non-empty string', { suggestion: 'E.g. "cc.Label", "cc.Sprite", "cc.Layout"' });
        }
        if (!Array.isArray(properties) || properties.length === 0) {
            return (0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.INVALID_PARAMS, 'properties must be a non-empty array', { suggestion: 'Each entry: { property: string, propertyType: string, value: any }' });
        }
        const succeeded = [];
        const failed = [];
        for (const entry of properties) {
            if (!entry || typeof entry.property !== 'string' || typeof entry.propertyType !== 'string') {
                failed.push({
                    property: (_a = entry === null || entry === void 0 ? void 0 : entry.property) !== null && _a !== void 0 ? _a : '<missing>',
                    error: 'entry missing property/propertyType',
                    errorCode: error_response_1.ERROR_CODES.INVALID_PARAMS
                });
                continue;
            }
            const result = await this.setComponentProperty({
                nodeUuid,
                componentType,
                property: entry.property,
                propertyType: entry.propertyType,
                value: entry.value
            });
            if (result.success) {
                succeeded.push({ property: entry.property });
            }
            else {
                failed.push({
                    property: entry.property,
                    error: result.error || 'unknown',
                    errorCode: result.errorCode || error_response_1.ERROR_CODES.UNKNOWN
                });
            }
        }
        const allFailed = succeeded.length === 0 && failed.length > 0;
        if (allFailed) {
            return (0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.EDITOR_API_ERROR, `All ${failed.length} property write(s) failed on ${componentType}`, {
                failed,
                suggestion: `Verify componentType exists on the node (try get_components first) and property names are correct. If the component is not attached, run component_add_component({ nodeUuid, componentType: '${componentType}' }) before batch_set_properties.`
            });
        }
        return Object.assign({ success: true, data: {
                nodeUuid,
                componentType,
                succeededCount: succeeded.length,
                failedCount: failed.length,
                succeeded,
                failed
            } }, (failed.length > 0 ? { warning: `${failed.length} of ${properties.length} properties failed — see data.failed` } : {}));
    }
    async attachScript(nodeUuid, scriptPath) {
        return new Promise(async (resolve) => {
            var _a, _b, _c;
            // 从脚本路径提取组件类名
            const scriptName = (_a = scriptPath.split('/').pop()) === null || _a === void 0 ? void 0 : _a.replace('.ts', '').replace('.js', '');
            if (!scriptName) {
                resolve((0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.INVALID_PARAMS, 'Invalid script path', { scriptPath }));
                return;
            }
            // 先查找节点上是否已存在该脚本组件（按 scriptName 匹配；自定义脚本 type 是 cid，所以这里其实只能命中"已知 cid → scriptName"特殊情况）
            const allComponentsInfo = await this.getComponents(nodeUuid);
            if (allComponentsInfo.success && ((_b = allComponentsInfo.data) === null || _b === void 0 ? void 0 : _b.components)) {
                const existingScript = allComponentsInfo.data.components.find((comp) => comp.type === scriptName);
                if (existingScript) {
                    resolve({
                        success: true,
                        message: `Script '${scriptName}' already exists on node`,
                        data: {
                            nodeUuid: nodeUuid,
                            componentName: scriptName,
                            existing: true
                        }
                    });
                    return;
                }
            }
            // Bug #3 修复 (REQ-20260511-234213): 记录 attach 前组件数量，作为 verify 基线
            const componentsBefore = allComponentsInfo.success ? ((_c = allComponentsInfo.data) === null || _c === void 0 ? void 0 : _c.components) || [] : [];
            const countBefore = componentsBefore.length;
            const cidsBefore = new Set(componentsBefore.map((c) => c.type));
            // 首先尝试直接使用脚本名称作为组件类型
            Editor.Message.request('scene', 'create-component', {
                uuid: nodeUuid,
                component: scriptName // 使用脚本名称而非UUID
            }).then(async (result) => {
                var _a;
                // 等待一段时间让Editor完成组件添加
                await new Promise(resolve => setTimeout(resolve, 100));
                // 重新查询节点信息验证脚本是否真的添加成功
                const allComponentsInfo2 = await this.getComponents(nodeUuid);
                if (allComponentsInfo2.success && ((_a = allComponentsInfo2.data) === null || _a === void 0 ? void 0 : _a.components)) {
                    const componentsAfter = allComponentsInfo2.data.components;
                    // Bug #3 修复: 改用组件数量增量判断 — 自定义脚本的 comp.type 是 cid hash，
                    // 不可能等于 scriptName，所以原来的 find(c => c.type === scriptName) 永远 false。
                    // 改为查"新增了哪些 cid"，第一个非旧 cid 的就是新加的脚本。
                    const newCids = componentsAfter.filter((c) => !cidsBefore.has(c.type));
                    if (componentsAfter.length >= countBefore + 1 && newCids.length > 0) {
                        resolve({
                            success: true,
                            message: `Script '${scriptName}' attached successfully (new cid: ${newCids[0].type})`,
                            data: {
                                nodeUuid: nodeUuid,
                                componentName: scriptName,
                                newComponentCid: newCids[0].type,
                                newComponentUuid: newCids[0].uuid,
                                existing: false
                            }
                        });
                    }
                    else {
                        resolve((0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.EDITOR_API_ERROR, `Script '${scriptName}' attach was accepted by Cocos but component count did not increase (before=${countBefore}, after=${componentsAfter.length}). The script may have failed silently — check that the script class extends cc.Component and exported correctly.`, { scriptName, scriptPath, countBefore, countAfter: componentsAfter.length, availableCids: componentsAfter.map((c) => c.type) }));
                    }
                }
                else {
                    resolve({
                        success: false,
                        error: `Failed to verify script addition: ${allComponentsInfo2.error || 'Unable to get node components'}`
                    });
                }
            }).catch((err) => {
                // 备用方案：使用场景脚本
                const options = {
                    name: 'cocos-mcp-server',
                    method: 'attachScript',
                    args: [nodeUuid, scriptPath]
                };
                Editor.Message.request('scene', 'execute-scene-script', options).then((result) => {
                    resolve(result);
                }).catch(() => {
                    resolve({
                        success: false,
                        error: `Failed to attach script '${scriptName}': ${err.message}`,
                        instruction: 'Please ensure the script is properly compiled and exported as a Component class. You can also manually attach the script through the Properties panel in the editor.'
                    });
                });
            });
        });
    }
    async getAvailableComponents(category = 'all') {
        const componentCategories = {
            renderer: ['cc.Sprite', 'cc.Label', 'cc.RichText', 'cc.Mask', 'cc.Graphics'],
            ui: ['cc.Button', 'cc.Toggle', 'cc.Slider', 'cc.ScrollView', 'cc.EditBox', 'cc.ProgressBar'],
            physics: ['cc.RigidBody2D', 'cc.BoxCollider2D', 'cc.CircleCollider2D', 'cc.PolygonCollider2D'],
            animation: ['cc.Animation', 'cc.AnimationClip', 'cc.SkeletalAnimation'],
            audio: ['cc.AudioSource'],
            layout: ['cc.Layout', 'cc.Widget', 'cc.PageView', 'cc.PageViewIndicator'],
            effects: ['cc.MotionStreak', 'cc.ParticleSystem2D'],
            camera: ['cc.Camera'],
            light: ['cc.Light', 'cc.DirectionalLight', 'cc.PointLight', 'cc.SpotLight']
        };
        let components = [];
        if (category === 'all') {
            for (const cat in componentCategories) {
                components = components.concat(componentCategories[cat]);
            }
        }
        else if (componentCategories[category]) {
            components = componentCategories[category];
        }
        return {
            success: true,
            data: {
                category: category,
                components: components
            }
        };
    }
    isValidPropertyDescriptor(propData) {
        // 检查是否是有效的属性描述对象
        if (typeof propData !== 'object' || propData === null) {
            return false;
        }
        try {
            const keys = Object.keys(propData);
            // 避免遍历简单的数值对象（如 {width: 200, height: 150}）
            const isSimpleValueObject = keys.every(key => {
                const value = propData[key];
                return typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean';
            });
            if (isSimpleValueObject) {
                return false;
            }
            // 检查是否包含属性描述符的特征字段，不使用'in'操作符
            const hasName = keys.includes('name');
            const hasValue = keys.includes('value');
            const hasType = keys.includes('type');
            const hasDisplayName = keys.includes('displayName');
            const hasReadonly = keys.includes('readonly');
            // 必须包含name或value字段，且通常还有type字段
            const hasValidStructure = (hasName || hasValue) && (hasType || hasDisplayName || hasReadonly);
            // 额外检查：如果有default字段且结构复杂，避免深度遍历
            if (keys.includes('default') && propData.default && typeof propData.default === 'object') {
                const defaultKeys = Object.keys(propData.default);
                if (defaultKeys.includes('value') && typeof propData.default.value === 'object') {
                    // 这种情况下，我们只返回顶层属性，不深入遍历default.value
                    return hasValidStructure;
                }
            }
            return hasValidStructure;
        }
        catch (error) {
            console.warn(`[isValidPropertyDescriptor] Error checking property descriptor:`, error);
            return false;
        }
    }
    analyzeProperty(component, propertyName) {
        // 从复杂的组件结构中提取可用属性
        const availableProperties = [];
        let propertyValue = undefined;
        let propertyExists = false;
        // 尝试多种方式查找属性：
        // 1. 直接属性访问
        if (Object.prototype.hasOwnProperty.call(component, propertyName)) {
            propertyValue = component[propertyName];
            propertyExists = true;
        }
        // 2. 从嵌套结构中查找 (如从测试数据看到的复杂结构)
        if (!propertyExists && component.properties && typeof component.properties === 'object') {
            // 首先检查properties.value是否存在（这是我们在getComponents中看到的结构）
            if (component.properties.value && typeof component.properties.value === 'object') {
                const valueObj = component.properties.value;
                for (const [key, propData] of Object.entries(valueObj)) {
                    // 检查propData是否是一个有效的属性描述对象
                    // 确保propData是对象且包含预期的属性结构
                    if (this.isValidPropertyDescriptor(propData)) {
                        const propInfo = propData;
                        availableProperties.push(key);
                        if (key === propertyName) {
                            // 优先使用value属性，如果没有则使用propData本身
                            try {
                                const propKeys = Object.keys(propInfo);
                                propertyValue = propKeys.includes('value') ? propInfo.value : propInfo;
                            }
                            catch (error) {
                                // 如果检查失败，直接使用propInfo
                                propertyValue = propInfo;
                            }
                            propertyExists = true;
                        }
                    }
                }
            }
            else {
                // 备用方案：直接从properties查找
                for (const [key, propData] of Object.entries(component.properties)) {
                    if (this.isValidPropertyDescriptor(propData)) {
                        const propInfo = propData;
                        availableProperties.push(key);
                        if (key === propertyName) {
                            // 优先使用value属性，如果没有则使用propData本身
                            try {
                                const propKeys = Object.keys(propInfo);
                                propertyValue = propKeys.includes('value') ? propInfo.value : propInfo;
                            }
                            catch (error) {
                                // 如果检查失败，直接使用propInfo
                                propertyValue = propInfo;
                            }
                            propertyExists = true;
                        }
                    }
                }
            }
        }
        // 3. 从直接属性中提取简单属性名
        if (availableProperties.length === 0) {
            for (const key of Object.keys(component)) {
                if (!key.startsWith('_') && !['__type__', 'cid', 'node', 'uuid', 'name', 'enabled', 'type', 'readonly', 'visible'].includes(key)) {
                    availableProperties.push(key);
                }
            }
        }
        if (!propertyExists) {
            return {
                exists: false,
                type: 'unknown',
                availableProperties,
                originalValue: undefined
            };
        }
        let type = 'unknown';
        // 智能类型检测
        if (Array.isArray(propertyValue)) {
            // 数组类型检测
            if (propertyName.toLowerCase().includes('node')) {
                type = 'nodeArray';
            }
            else if (propertyName.toLowerCase().includes('color')) {
                type = 'colorArray';
            }
            else {
                type = 'array';
            }
        }
        else if (typeof propertyValue === 'string') {
            // Check if property name suggests it's an asset
            if (['spriteFrame', 'texture', 'material', 'font', 'clip', 'prefab'].includes(propertyName.toLowerCase())) {
                type = 'asset';
            }
            else {
                type = 'string';
            }
        }
        else if (typeof propertyValue === 'number') {
            type = 'number';
        }
        else if (typeof propertyValue === 'boolean') {
            type = 'boolean';
        }
        else if (propertyValue && typeof propertyValue === 'object') {
            try {
                const keys = Object.keys(propertyValue);
                if (keys.includes('r') && keys.includes('g') && keys.includes('b')) {
                    type = 'color';
                }
                else if (keys.includes('x') && keys.includes('y')) {
                    type = propertyValue.z !== undefined ? 'vec3' : 'vec2';
                }
                else if (keys.includes('width') && keys.includes('height')) {
                    type = 'size';
                }
                else if (keys.includes('uuid') || keys.includes('__uuid__')) {
                    // 检查是否是节点引用（通过属性名或__id__属性判断）
                    if (propertyName.toLowerCase().includes('node') ||
                        propertyName.toLowerCase().includes('target') ||
                        keys.includes('__id__')) {
                        type = 'node';
                    }
                    else {
                        type = 'asset';
                    }
                }
                else if (keys.includes('__id__')) {
                    // 节点引用特征
                    type = 'node';
                }
                else {
                    type = 'object';
                }
            }
            catch (error) {
                console.warn(`[analyzeProperty] Error checking property type for: ${JSON.stringify(propertyValue)}`);
                type = 'object';
            }
        }
        else if (propertyValue === null || propertyValue === undefined) {
            // For null/undefined values, check property name to determine type
            if (['spriteFrame', 'texture', 'material', 'font', 'clip', 'prefab'].includes(propertyName.toLowerCase())) {
                type = 'asset';
            }
            else if (propertyName.toLowerCase().includes('node') ||
                propertyName.toLowerCase().includes('target')) {
                type = 'node';
            }
            else if (propertyName.toLowerCase().includes('component')) {
                type = 'component';
            }
            else {
                type = 'unknown';
            }
        }
        return {
            exists: true,
            type,
            availableProperties,
            originalValue: propertyValue
        };
    }
    smartConvertValue(inputValue, propertyInfo) {
        const { type, originalValue } = propertyInfo;
        console.log(`[smartConvertValue] Converting ${JSON.stringify(inputValue)} to type: ${type}`);
        switch (type) {
            case 'string':
                return String(inputValue);
            case 'number':
                return Number(inputValue);
            case 'boolean':
                if (typeof inputValue === 'boolean')
                    return inputValue;
                if (typeof inputValue === 'string') {
                    return inputValue.toLowerCase() === 'true' || inputValue === '1';
                }
                return Boolean(inputValue);
            case 'color':
                // 优化的颜色处理，支持多种输入格式
                if (typeof inputValue === 'string') {
                    // 字符串格式：十六进制、颜色名称、rgb()/rgba()
                    return this.parseColorString(inputValue);
                }
                else if (typeof inputValue === 'object' && inputValue !== null) {
                    try {
                        const inputKeys = Object.keys(inputValue);
                        // 如果输入是颜色对象，验证并转换
                        if (inputKeys.includes('r') || inputKeys.includes('g') || inputKeys.includes('b')) {
                            return {
                                r: Math.min(255, Math.max(0, Number(inputValue.r) || 0)),
                                g: Math.min(255, Math.max(0, Number(inputValue.g) || 0)),
                                b: Math.min(255, Math.max(0, Number(inputValue.b) || 0)),
                                a: inputValue.a !== undefined ? Math.min(255, Math.max(0, Number(inputValue.a))) : 255
                            };
                        }
                    }
                    catch (error) {
                        console.warn(`[smartConvertValue] Invalid color object: ${JSON.stringify(inputValue)}`);
                    }
                }
                // 如果有原值，保持原值结构并更新提供的值
                if (originalValue && typeof originalValue === 'object') {
                    try {
                        const inputKeys = typeof inputValue === 'object' && inputValue ? Object.keys(inputValue) : [];
                        return {
                            r: inputKeys.includes('r') ? Math.min(255, Math.max(0, Number(inputValue.r))) : (originalValue.r || 255),
                            g: inputKeys.includes('g') ? Math.min(255, Math.max(0, Number(inputValue.g))) : (originalValue.g || 255),
                            b: inputKeys.includes('b') ? Math.min(255, Math.max(0, Number(inputValue.b))) : (originalValue.b || 255),
                            a: inputKeys.includes('a') ? Math.min(255, Math.max(0, Number(inputValue.a))) : (originalValue.a || 255)
                        };
                    }
                    catch (error) {
                        console.warn(`[smartConvertValue] Error processing color with original value: ${error}`);
                    }
                }
                // 默认返回白色
                console.warn(`[smartConvertValue] Using default white color for invalid input: ${JSON.stringify(inputValue)}`);
                return { r: 255, g: 255, b: 255, a: 255 };
            case 'vec2':
                if (typeof inputValue === 'object' && inputValue !== null) {
                    return {
                        x: Number(inputValue.x) || originalValue.x || 0,
                        y: Number(inputValue.y) || originalValue.y || 0
                    };
                }
                return originalValue;
            case 'vec3':
                if (typeof inputValue === 'object' && inputValue !== null) {
                    return {
                        x: Number(inputValue.x) || originalValue.x || 0,
                        y: Number(inputValue.y) || originalValue.y || 0,
                        z: Number(inputValue.z) || originalValue.z || 0
                    };
                }
                return originalValue;
            case 'size':
                if (typeof inputValue === 'object' && inputValue !== null) {
                    return {
                        width: Number(inputValue.width) || originalValue.width || 100,
                        height: Number(inputValue.height) || originalValue.height || 100
                    };
                }
                return originalValue;
            case 'node':
                if (typeof inputValue === 'string') {
                    // 节点引用需要特殊处理
                    return inputValue;
                }
                else if (typeof inputValue === 'object' && inputValue !== null) {
                    // 如果已经是对象形式，返回UUID或完整对象
                    return inputValue.uuid || inputValue;
                }
                return originalValue;
            case 'asset':
                if (typeof inputValue === 'string') {
                    // 如果输入是字符串路径，转换为asset对象
                    return { uuid: inputValue };
                }
                else if (typeof inputValue === 'object' && inputValue !== null) {
                    return inputValue;
                }
                return originalValue;
            default:
                // 对于未知类型，尽量保持原有结构
                if (typeof inputValue === typeof originalValue) {
                    return inputValue;
                }
                return originalValue;
        }
    }
    parseColorString(colorStr) {
        const str = colorStr.trim();
        // 只支持十六进制格式 #RRGGBB 或 #RRGGBBAA
        if (str.startsWith('#')) {
            if (str.length === 7) { // #RRGGBB
                const r = parseInt(str.substring(1, 3), 16);
                const g = parseInt(str.substring(3, 5), 16);
                const b = parseInt(str.substring(5, 7), 16);
                return { r, g, b, a: 255 };
            }
            else if (str.length === 9) { // #RRGGBBAA
                const r = parseInt(str.substring(1, 3), 16);
                const g = parseInt(str.substring(3, 5), 16);
                const b = parseInt(str.substring(5, 7), 16);
                const a = parseInt(str.substring(7, 9), 16);
                return { r, g, b, a };
            }
        }
        // 如果不是有效的十六进制格式，返回错误提示
        throw new Error(`Invalid color format: "${colorStr}". Only hexadecimal format is supported (e.g., "#FF0000" or "#FF0000FF")`);
    }
    async verifyPropertyChange(nodeUuid, componentType, property, originalValue, expectedValue) {
        var _a, _b;
        console.log(`[verifyPropertyChange] Starting verification for ${componentType}.${property}`);
        console.log(`[verifyPropertyChange] Expected value:`, JSON.stringify(expectedValue));
        console.log(`[verifyPropertyChange] Original value:`, JSON.stringify(originalValue));
        try {
            // 重新获取组件信息进行验证
            console.log(`[verifyPropertyChange] Calling getComponentInfo...`);
            const componentInfo = await this.getComponentInfo(nodeUuid, componentType);
            console.log(`[verifyPropertyChange] getComponentInfo success:`, componentInfo.success);
            const allComponents = await this.getComponents(nodeUuid);
            console.log(`[verifyPropertyChange] getComponents success:`, allComponents.success);
            if (componentInfo.success && componentInfo.data) {
                console.log(`[verifyPropertyChange] Component data available, extracting property '${property}'`);
                const allPropertyNames = Object.keys(componentInfo.data.properties || {});
                console.log(`[verifyPropertyChange] Available properties:`, allPropertyNames);
                const propertyData = (_a = componentInfo.data.properties) === null || _a === void 0 ? void 0 : _a[property];
                console.log(`[verifyPropertyChange] Raw property data for '${property}':`, JSON.stringify(propertyData));
                // 从属性数据中提取实际值
                let actualValue = propertyData;
                console.log(`[verifyPropertyChange] Initial actualValue:`, JSON.stringify(actualValue));
                if (propertyData && typeof propertyData === 'object' && 'value' in propertyData) {
                    actualValue = propertyData.value;
                    console.log(`[verifyPropertyChange] Extracted actualValue from .value:`, JSON.stringify(actualValue));
                }
                else {
                    console.log(`[verifyPropertyChange] No .value property found, using raw data`);
                }
                // 修复验证逻辑：检查实际值是否匹配期望值
                let verified = false;
                if (typeof expectedValue === 'object' && expectedValue !== null && 'uuid' in expectedValue) {
                    // 对于引用类型（节点/组件/资源），比较UUID
                    const actualUuid = actualValue && typeof actualValue === 'object' && 'uuid' in actualValue ? actualValue.uuid : '';
                    const expectedUuid = expectedValue.uuid || '';
                    verified = actualUuid === expectedUuid && expectedUuid !== '';
                    console.log(`[verifyPropertyChange] Reference comparison:`);
                    console.log(`  - Expected UUID: "${expectedUuid}"`);
                    console.log(`  - Actual UUID: "${actualUuid}"`);
                    console.log(`  - UUID match: ${actualUuid === expectedUuid}`);
                    console.log(`  - UUID not empty: ${expectedUuid !== ''}`);
                    console.log(`  - Final verified: ${verified}`);
                }
                else {
                    // 对于其他类型，直接比较值
                    console.log(`[verifyPropertyChange] Value comparison:`);
                    console.log(`  - Expected type: ${typeof expectedValue}`);
                    console.log(`  - Actual type: ${typeof actualValue}`);
                    if (typeof actualValue === typeof expectedValue) {
                        if (typeof actualValue === 'object' && actualValue !== null && expectedValue !== null) {
                            // 对象类型的深度比较
                            verified = JSON.stringify(actualValue) === JSON.stringify(expectedValue);
                            console.log(`  - Object comparison (JSON): ${verified}`);
                        }
                        else {
                            // 基本类型的直接比较
                            verified = actualValue === expectedValue;
                            console.log(`  - Direct comparison: ${verified}`);
                        }
                    }
                    else {
                        // 类型不匹配时的特殊处理（如数字和字符串）
                        const stringMatch = String(actualValue) === String(expectedValue);
                        const numberMatch = Number(actualValue) === Number(expectedValue);
                        verified = stringMatch || numberMatch;
                        console.log(`  - String match: ${stringMatch}`);
                        console.log(`  - Number match: ${numberMatch}`);
                        console.log(`  - Type mismatch verified: ${verified}`);
                    }
                }
                console.log(`[verifyPropertyChange] Final verification result: ${verified}`);
                console.log(`[verifyPropertyChange] Final actualValue:`, JSON.stringify(actualValue));
                const result = {
                    verified,
                    actualValue,
                    fullData: {
                        // 只返回修改的属性信息，不返回完整组件数据
                        modifiedProperty: {
                            name: property,
                            before: originalValue,
                            expected: expectedValue,
                            actual: actualValue,
                            verified,
                            propertyMetadata: propertyData // 只包含这个属性的元数据
                        },
                        // 简化的组件信息
                        componentSummary: {
                            nodeUuid,
                            componentType,
                            totalProperties: Object.keys(((_b = componentInfo.data) === null || _b === void 0 ? void 0 : _b.properties) || {}).length
                        }
                    }
                };
                console.log(`[verifyPropertyChange] Returning result:`, JSON.stringify(result, null, 2));
                return result;
            }
            else {
                console.log(`[verifyPropertyChange] ComponentInfo failed or no data:`, componentInfo);
            }
        }
        catch (error) {
            console.error('[verifyPropertyChange] Verification failed with error:', error);
            console.error('[verifyPropertyChange] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        }
        console.log(`[verifyPropertyChange] Returning fallback result`);
        return {
            verified: false,
            actualValue: undefined,
            fullData: null
        };
    }
    /**
     * 检测是否为节点属性，如果是则重定向到对应的节点方法
     */
    async checkAndRedirectNodeProperties(args) {
        const { nodeUuid, componentType, property, propertyType, value } = args;
        // 检测是否为节点基础属性（应该使用 set_node_property）
        const nodeBasicProperties = [
            'name', 'active', 'layer', 'mobility', 'parent', 'children', 'hideFlags'
        ];
        // 检测是否为节点变换属性（应该使用 set_node_transform）
        const nodeTransformProperties = [
            'position', 'rotation', 'scale', 'eulerAngles', 'angle'
        ];
        // Detect attempts to set cc.Node properties (common mistake)
        if (componentType === 'cc.Node' || componentType === 'Node') {
            if (nodeBasicProperties.includes(property)) {
                return {
                    success: false,
                    error: `Property '${property}' is a node basic property, not a component property`,
                    instruction: `Please use set_node_property method to set node properties: set_node_property(uuid="${nodeUuid}", property="${property}", value=${JSON.stringify(value)})`
                };
            }
            else if (nodeTransformProperties.includes(property)) {
                return {
                    success: false,
                    error: `Property '${property}' is a node transform property, not a component property`,
                    instruction: `Please use set_node_transform method to set transform properties: set_node_transform(uuid="${nodeUuid}", ${property}=${JSON.stringify(value)})`
                };
            }
        }
        // Detect common incorrect usage
        if (nodeBasicProperties.includes(property) || nodeTransformProperties.includes(property)) {
            const methodName = nodeTransformProperties.includes(property) ? 'set_node_transform' : 'set_node_property';
            return {
                success: false,
                error: `Property '${property}' is a node property, not a component property`,
                instruction: `Property '${property}' should be set using ${methodName} method, not set_component_property. Please use: ${methodName}(uuid="${nodeUuid}", ${nodeTransformProperties.includes(property) ? property : `property="${property}"`}=${JSON.stringify(value)})`
            };
        }
        return null; // 不是节点属性，继续正常处理
    }
    /**
     * 生成组件建议信息
     */
    generateComponentSuggestion(requestedType, availableTypes, property) {
        // 检查是否存在相似的组件类型
        const similarTypes = availableTypes.filter(type => type.toLowerCase().includes(requestedType.toLowerCase()) ||
            requestedType.toLowerCase().includes(type.toLowerCase()));
        let instruction = '';
        if (similarTypes.length > 0) {
            instruction += `\n\n🔍 Found similar components: ${similarTypes.join(', ')}`;
            instruction += `\n💡 Suggestion: Perhaps you meant to set the '${similarTypes[0]}' component?`;
        }
        // Recommend possible components based on property name
        const propertyToComponentMap = {
            'string': ['cc.Label', 'cc.RichText', 'cc.EditBox'],
            'text': ['cc.Label', 'cc.RichText'],
            'fontSize': ['cc.Label', 'cc.RichText'],
            'spriteFrame': ['cc.Sprite'],
            'color': ['cc.Label', 'cc.Sprite', 'cc.Graphics'],
            'normalColor': ['cc.Button'],
            'pressedColor': ['cc.Button'],
            'target': ['cc.Button'],
            'contentSize': ['cc.UITransform'],
            'anchorPoint': ['cc.UITransform']
        };
        const recommendedComponents = propertyToComponentMap[property] || [];
        const availableRecommended = recommendedComponents.filter(comp => availableTypes.includes(comp));
        if (availableRecommended.length > 0) {
            instruction += `\n\n🎯 Based on property '${property}', recommended components: ${availableRecommended.join(', ')}`;
        }
        // Provide operation suggestions
        instruction += `\n\n📋 Suggested Actions:`;
        instruction += `\n1. Use get_components(nodeUuid="${requestedType.includes('uuid') ? 'YOUR_NODE_UUID' : 'nodeUuid'}") to view all components on the node`;
        instruction += `\n2. If you need to add a component, use add_component(nodeUuid="...", componentType="${requestedType}")`;
        instruction += `\n3. Verify that the component type name is correct (case-sensitive)`;
        return instruction;
    }
    /**
     * 快速验证资源设置结果
     */
    async quickVerifyAsset(nodeUuid, componentType, property) {
        try {
            const rawNodeData = await Editor.Message.request('scene', 'query-node', nodeUuid);
            if (!rawNodeData || !rawNodeData.__comps__) {
                return null;
            }
            // 找到组件
            const component = rawNodeData.__comps__.find((comp) => {
                const compType = comp.__type__ || comp.cid || comp.type;
                return compType === componentType;
            });
            if (!component) {
                return null;
            }
            // 提取属性值
            const properties = this.extractComponentProperties(component);
            const propertyData = properties[property];
            if (propertyData && typeof propertyData === 'object' && 'value' in propertyData) {
                return propertyData.value;
            }
            else {
                return propertyData;
            }
        }
        catch (error) {
            console.error(`[quickVerifyAsset] Error:`, error);
            return null;
        }
    }
}
exports.ComponentTools = ComponentTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2NvbXBvbmVudC10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw0REFBMkU7QUFFM0UsTUFBYSxjQUFjO0lBQ3ZCLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLFdBQVcsRUFBRSwrQ0FBK0M7Z0JBQzVELFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxrS0FBa0s7eUJBQ2xMO3dCQUNELGFBQWEsRUFBRTs0QkFDWCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsdURBQXVEO3lCQUN2RTtxQkFDSjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDO2lCQUMxQzthQUNKO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLGtCQUFrQjtnQkFDeEIsV0FBVyxFQUFFLDBGQUEwRjtnQkFDdkcsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixRQUFRLEVBQUU7NEJBQ04sSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLFdBQVc7eUJBQzNCO3dCQUNELGFBQWEsRUFBRTs0QkFDWCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsd0lBQXdJO3lCQUN4SjtxQkFDSjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDO2lCQUMxQzthQUNKO1lBQ0QseUVBQXlFO1lBQ3pFLDREQUE0RDtZQUM1RDtnQkFDSSxJQUFJLEVBQUUsd0JBQXdCO2dCQUM5QixXQUFXLEVBQUUsK0lBQStJO2dCQUM1SixXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2Qs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QUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUN6QyxPQUFPLElBQUksQ0FBQztZQUNoQixDQUFDO1lBRUQsT0FBTztZQUNQLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBUyxFQUFFLEVBQUU7Z0JBQ3ZELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUN4RCxPQUFPLFFBQVEsS0FBSyxhQUFhLENBQUM7WUFDdEMsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ2IsT0FBTyxJQUFJLENBQUM7WUFDaEIsQ0FBQztZQUVELFFBQVE7WUFDUixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDOUQsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRTFDLElBQUksWUFBWSxJQUFJLE9BQU8sWUFBWSxLQUFLLFFBQVEsSUFBSSxPQUFPLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQzlFLE9BQU8sWUFBWSxDQUFDLEtBQUssQ0FBQztZQUM5QixDQUFDO2lCQUFNLENBQUM7Z0JBQ0osT0FBTyxZQUFZLENBQUM7WUFDeEIsQ0FBQztRQUNMLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQywyQkFBMkIsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNsRCxPQUFPLElBQUksQ0FBQztRQUNoQixDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBbGlFRCx3Q0FraUVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yLCBDb21wb25lbnRJbmZvIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgY3JlYXRlRXJyb3JSZXNwb25zZSwgRVJST1JfQ09ERVMgfSBmcm9tICcuLi91dGlscy9lcnJvci1yZXNwb25zZSc7XG5cbmV4cG9ydCBjbGFzcyBDb21wb25lbnRUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2FkZF9jb21wb25lbnQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQWRkIGEgY29tcG9uZW50IHRvIGEgbm9kZS4gUmVxdWlyZXMgbm9kZVV1aWQuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBub2RlIFVVSUQuIFJFUVVJUkVEOiBZb3UgbXVzdCBzcGVjaWZ5IHRoZSBleGFjdCBub2RlIHRvIGFkZCB0aGUgY29tcG9uZW50IHRvLiBVc2UgZ2V0X2FsbF9ub2RlcyBvciBmaW5kX25vZGVfYnlfbmFtZSB0byBnZXQgdGhlIFVVSUQgb2YgdGhlIGRlc2lyZWQgbm9kZS4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29tcG9uZW50IHR5cGUgKGUuZy4sIGNjLlNwcml0ZSwgY2MuTGFiZWwsIGNjLkJ1dHRvbiknXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJywgJ2NvbXBvbmVudFR5cGUnXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3JlbW92ZV9jb21wb25lbnQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUmVtb3ZlIGEgY29tcG9uZW50LiBjb21wb25lbnRUeXBlIG11c3QgYmUgY2lkIGZyb20gZ2V0Q29tcG9uZW50cywgbm90IHNjcmlwdC9jbGFzcyBuYW1lLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOb2RlIFVVSUQnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29tcG9uZW50IGNpZCAodHlwZSBmaWVsZCBmcm9tIGdldENvbXBvbmVudHMpLiBEbyBOT1QgdXNlIHNjcmlwdCBuYW1lIG9yIGNsYXNzIG5hbWUuIEV4YW1wbGU6IFwiY2MuU3ByaXRlXCIgb3IgXCI5YjRhN3VlVDl4RDZhUkUrQWxPdXN5MVwiJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydub2RlVXVpZCcsICdjb21wb25lbnRUeXBlJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLy8gdjEuNi4wOiBnZXRfY29tcG9uZW50cyArIGdldF9jb21wb25lbnRfaW5mbyArIGdldF9hdmFpbGFibGVfY29tcG9uZW50c1xuICAgICAgICAgICAgLy8gbWVyZ2VkIGludG8gYHF1ZXJ5KHthY3Rpb259KWAg4oCUIHNlZSBib3R0b20gb2YgZ2V0VG9vbHMoKS5cbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnc2V0X2NvbXBvbmVudF9wcm9wZXJ0eScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTZXQgYSBjb21wb25lbnQgcHJvcGVydHkgKGNjLkxhYmVsIC8gY2MuU3ByaXRlIC8gY3VzdG9tKS4gRm9yIG5vZGUgZmllbGRzIHVzZSBzZXRfbm9kZV9wcm9wZXJ0eSAvIHNldF9ub2RlX3RyYW5zZm9ybS4gU2VlIEZFQVRVUkVfR1VJREUgwqczLjUuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBub2RlIFVVSUQgLSBNdXN0IHNwZWNpZnkgdGhlIG5vZGUgdG8gb3BlcmF0ZSBvbidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb21wb25lbnQgdHlwZSAtIENhbiBiZSBidWlsdC1pbiBjb21wb25lbnRzIChlLmcuLCBjYy5MYWJlbCkgb3IgY3VzdG9tIHNjcmlwdCBjb21wb25lbnRzIChlLmcuLCBNeVNjcmlwdCkuIElmIHVuc3VyZSBhYm91dCBjb21wb25lbnQgdHlwZSwgdXNlIGdldF9jb21wb25lbnRzIGZpcnN0IHRvIHJldHJpZXZlIGFsbCBjb21wb25lbnRzIG9uIHRoZSBub2RlLicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g56e76ZmkZW51bemZkOWItu+8jOWFgeiuuOS7u+aEj+e7hOS7tuexu+Wei+WMheaLrOiHquWumuS5ieiEmuacrFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcm9wZXJ0eSBuYW1lIC0gVGhlIHByb3BlcnR5IHRvIHNldC4gQ29tbW9uIHByb3BlcnRpZXMgaW5jbHVkZTpcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBjYy5MYWJlbDogc3RyaW5nICh0ZXh0IGNvbnRlbnQpLCBmb250U2l6ZSAoZm9udCBzaXplKSwgY29sb3IgKHRleHQgY29sb3IpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgY2MuU3ByaXRlOiBzcHJpdGVGcmFtZSAoc3ByaXRlIGZyYW1lKSwgY29sb3IgKHRpbnQgY29sb3IpLCBzaXplTW9kZSAoc2l6ZSBtb2RlKVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIGNjLkJ1dHRvbjogbm9ybWFsQ29sb3IgKG5vcm1hbCBjb2xvciksIHByZXNzZWRDb2xvciAocHJlc3NlZCBjb2xvciksIHRhcmdldCAodGFyZ2V0IG5vZGUpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgY2MuVUlUcmFuc2Zvcm06IGNvbnRlbnRTaXplIChjb250ZW50IHNpemUpLCBhbmNob3JQb2ludCAoYW5jaG9yIHBvaW50KVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIEN1c3RvbSBTY3JpcHRzOiBCYXNlZCBvbiBwcm9wZXJ0aWVzIGRlZmluZWQgaW4gdGhlIHNjcmlwdCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVR5cGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Byb3BlcnR5IHR5cGUgLSBNdXN0IGV4cGxpY2l0bHkgc3BlY2lmeSB0aGUgcHJvcGVydHkgZGF0YSB0eXBlIGZvciBjb3JyZWN0IHZhbHVlIGNvbnZlcnNpb24gYW5kIHZhbGlkYXRpb24nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3N0cmluZycsICdudW1iZXInLCAnYm9vbGVhbicsICdpbnRlZ2VyJywgJ2Zsb2F0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbG9yJywgJ3ZlYzInLCAndmVjMycsICdzaXplJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ25vZGUnLCAnY29tcG9uZW50JywgJ3Nwcml0ZUZyYW1lJywgJ3ByZWZhYicsICdhc3NldCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdub2RlQXJyYXknLCAnY29sb3JBcnJheScsICdudW1iZXJBcnJheScsICdzdHJpbmdBcnJheSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUHJvcGVydHkgdmFsdWUgLSBVc2UgdGhlIGNvcnJlc3BvbmRpbmcgZGF0YSBmb3JtYXQgYmFzZWQgb24gcHJvcGVydHlUeXBlOlxcblxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn8J+TnSBCYXNpYyBEYXRhIFR5cGVzOlxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIHN0cmluZzogXCJIZWxsbyBXb3JsZFwiICh0ZXh0IHN0cmluZylcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBudW1iZXIvaW50ZWdlci9mbG9hdDogNDIgb3IgMy4xNCAobnVtZXJpYyB2YWx1ZSlcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBib29sZWFuOiB0cnVlIG9yIGZhbHNlIChib29sZWFuIHZhbHVlKVxcblxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn8J+OqCBDb2xvciBUeXBlOlxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIGNvbG9yOiB7XCJyXCI6MjU1LFwiZ1wiOjAsXCJiXCI6MCxcImFcIjoyNTV9IChSR0JBIHZhbHVlcywgcmFuZ2UgMC0yNTUpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgIC0gQWx0ZXJuYXRpdmU6IFwiI0ZGMDAwMFwiIChoZXhhZGVjaW1hbCBmb3JtYXQpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgIC0gVHJhbnNwYXJlbmN5OiBhIHZhbHVlIGNvbnRyb2xzIG9wYWNpdHksIDI1NSA9IGZ1bGx5IG9wYXF1ZSwgMCA9IGZ1bGx5IHRyYW5zcGFyZW50XFxuXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfwn5OQIFZlY3RvciBhbmQgU2l6ZSBUeXBlczpcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiB2ZWMyOiB7XCJ4XCI6MTAwLFwieVwiOjUwfSAoMkQgdmVjdG9yKVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIHZlYzM6IHtcInhcIjoxLFwieVwiOjIsXCJ6XCI6M30gKDNEIHZlY3RvcilcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBzaXplOiB7XCJ3aWR0aFwiOjEwMCxcImhlaWdodFwiOjUwfSAoc2l6ZSBkaW1lbnNpb25zKVxcblxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn8J+UlyBSZWZlcmVuY2UgVHlwZXMgKHVzaW5nIFVVSUQgc3RyaW5ncyk6XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgbm9kZTogXCJ0YXJnZXQtbm9kZS11dWlkXCIgKG5vZGUgcmVmZXJlbmNlKVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnICBIb3cgdG8gZ2V0OiBVc2UgZ2V0X2FsbF9ub2RlcyBvciBmaW5kX25vZGVfYnlfbmFtZSB0byBnZXQgbm9kZSBVVUlEc1xcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIGNvbXBvbmVudDogXCJ0YXJnZXQtbm9kZS11dWlkXCIgKGNvbXBvbmVudCByZWZlcmVuY2UpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgIEhvdyBpdCB3b3JrczogXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgICAgMS4gUHJvdmlkZSB0aGUgVVVJRCBvZiB0aGUgTk9ERSB0aGF0IGNvbnRhaW5zIHRoZSB0YXJnZXQgY29tcG9uZW50XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgICAgMi4gU3lzdGVtIGF1dG8tZGV0ZWN0cyByZXF1aXJlZCBjb21wb25lbnQgdHlwZSBmcm9tIHByb3BlcnR5IG1ldGFkYXRhXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgICAgMy4gRmluZHMgdGhlIGNvbXBvbmVudCBvbiB0YXJnZXQgbm9kZSBhbmQgZ2V0cyBpdHMgc2NlbmUgX19pZF9fXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgICAgNC4gU2V0cyByZWZlcmVuY2UgdXNpbmcgdGhlIHNjZW5lIF9faWRfXyAobm90IG5vZGUgVVVJRClcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyAgRXhhbXBsZTogdmFsdWU9XCJsYWJlbC1ub2RlLXV1aWRcIiB3aWxsIGZpbmQgY2MuTGFiZWwgYW5kIHVzZSBpdHMgc2NlbmUgSURcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBzcHJpdGVGcmFtZTogXCJzcHJpdGVmcmFtZS11dWlkXCIgKHNwcml0ZSBmcmFtZSBhc3NldClcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyAgSG93IHRvIGdldDogQ2hlY2sgYXNzZXQgZGF0YWJhc2Ugb3IgdXNlIGFzc2V0IGJyb3dzZXJcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBwcmVmYWI6IFwicHJlZmFiLXV1aWRcIiAocHJlZmFiIGFzc2V0KVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnICBIb3cgdG8gZ2V0OiBDaGVjayBhc3NldCBkYXRhYmFzZSBvciB1c2UgYXNzZXQgYnJvd3NlclxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIGFzc2V0OiBcImFzc2V0LXV1aWRcIiAoZ2VuZXJpYyBhc3NldCByZWZlcmVuY2UpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgIEhvdyB0byBnZXQ6IENoZWNrIGFzc2V0IGRhdGFiYXNlIG9yIHVzZSBhc3NldCBicm93c2VyXFxuXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfwn5OLIEFycmF5IFR5cGVzOlxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIG5vZGVBcnJheTogW1widXVpZDFcIixcInV1aWQyXCJdIChhcnJheSBvZiBub2RlIFVVSURzKVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIGNvbG9yQXJyYXk6IFt7XCJyXCI6MjU1LFwiZ1wiOjAsXCJiXCI6MCxcImFcIjoyNTV9XSAoYXJyYXkgb2YgY29sb3JzKVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIG51bWJlckFycmF5OiBbMSwyLDMsNCw1XSAoYXJyYXkgb2YgbnVtYmVycylcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBzdHJpbmdBcnJheTogW1wiaXRlbTFcIixcIml0ZW0yXCJdIChhcnJheSBvZiBzdHJpbmdzKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbm9kZVV1aWQnLCAnY29tcG9uZW50VHlwZScsICdwcm9wZXJ0eScsICdwcm9wZXJ0eVR5cGUnLCAndmFsdWUnXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2F0dGFjaF9zY3JpcHQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXR0YWNoIGEgc2NyaXB0IGNvbXBvbmVudCB0byBhIG5vZGUnLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmlwdFBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NjcmlwdCBhc3NldCBwYXRoIChlLmcuLCBkYjovL2Fzc2V0cy9zY3JpcHRzL015U2NyaXB0LnRzKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbm9kZVV1aWQnLCAnc2NyaXB0UGF0aCddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAncXVlcnknLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVW5pZmllZCBjb21wb25lbnQgcXVlcnkgKHYxLjYuMCwgcmVhZC1vbmx5KS4gYWN0aW9uPWxpc3Q6IGFsbCBjb21wb25lbnRzIG9uIGEgbm9kZS4gYWN0aW9uPWluZm86IG9uZSBzcGVjaWZpYyBjb21wb25lbnQuIGFjdGlvbj1hdmFpbGFibGU6IGNvbXBvbmVudCB0eXBlcyBieSBjYXRlZ29yeS4gU2FmZSBmb3IgcGFyYWxsZWwgY2FsbHMgKG5vIG11dGF0aW9uKS4gdjEuNi4yOiBhY3Rpb249bGlzdCDpu5jorqQgbW9kZT1cIm1pbmltYWxcIu+8iDgwLTk1JSB0b2tlbiDoioLnnIHvvInvvIzpnIDopoHlrozmlbTlrZfmrrXlhYPmlbDmja7ml7bkvKAgbW9kZT1cImZ1bGxcIuOAgicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnbGlzdCcsICdpbmZvJywgJ2F2YWlsYWJsZSddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnV2hpY2ggcXVlcnkgdG8gcGVyZm9ybSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdUYXJnZXQgbm9kZSBVVUlEIChyZXF1aXJlZCBmb3IgbGlzdC9pbmZvKScgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ29tcG9uZW50IHR5cGUgKHJlcXVpcmVkIGZvciBpbmZvKScgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydhbGwnLCAncmVuZGVyZXInLCAndWknLCAncGh5c2ljcycsICdhbmltYXRpb24nLCAnYXVkaW8nXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZvciBhdmFpbGFibGU6IGZpbHRlciBieSBjYXRlZ29yeScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2FsbCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydmdWxsJywgJ21pbmltYWwnLCAndmFsdWVzX29ubHknXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZvciBhY3Rpb249bGlzdDogcmVzcG9uc2UgZGV0YWlsIGxldmVsLiBtaW5pbWFsIChkZWZhdWx0KSBzdHJpcHMgaTE4biBrZXlzIC8gZGVmYXVsdHMgLyBlbnVtTGlzdCAvIF9wcmVmaXggZHVwbGljYXRlcyAvIGV4dGVuZHMgLyA5LWZpZWxkIHN1Yi1tZXRhIHdyYXBwZXJzIOKAlCBrZWVwcyBvbmx5IGB2YWx1ZWAgKCsgYHR5cGVgIG9uIGNjLiogcmVmZXJlbmNlcykuIGZ1bGwgcmV0dXJucyB0aGUgcmF3IENvY29zIGR1bXAgKH4xMEsgdG9rZW5zL2NvbXBvbmVudCkuIHZhbHVlc19vbmx5IGZsYXR0ZW5zIHRvIHB1cmUga2V5LXZhbHVlIHBhaXJzLicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ21pbmltYWwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnYmF0Y2hfc2V0X3Byb3BlcnRpZXMnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2V0IE4gcHJvcGVydGllcyBvbiBvbmUgY29tcG9uZW50IGluIGEgc2luZ2xlIGNhbGwuIFBlci1wcm9wZXJ0eSBmYWlsdXJlcyBhcmUgaXNvbGF0ZWQgKHN1Y2NlZWRlZC9mYWlsZWQgbGlzdHMpLiBQcmVmZXJyZWQgb3ZlciBOIHNlcGFyYXRlIHNldF9jb21wb25lbnRfcHJvcGVydHkgY2FsbHMuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBub2RlIFVVSUQnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29tcG9uZW50IHR5cGUgKGUuZy4sIGNjLkxhYmVsLCBjYy5TcHJpdGUsIGNjLkxheW91dCwgY2MuVUlUcmFuc2Zvcm0pLiBJZiB1bnN1cmUsIGNhbGwgZ2V0X2NvbXBvbmVudHMgZmlyc3QuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUHJvcGVydHkgZW50cmllcy4gRWFjaCBtdXN0IGluY2x1ZGUgcHJvcGVydHkgbmFtZSwgcHJvcGVydHlUeXBlIChmb3IgdHlwZSBjb252ZXJzaW9uKSwgYW5kIHZhbHVlLiBTYW1lIHNoYXBlIGFzIHNldF9jb21wb25lbnRfcHJvcGVydHkgaW5kaXZpZHVhbCBjYWxscy4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdQcm9wZXJ0eSBuYW1lIChlLmcuLCBcInN0cmluZ1wiLCBcImZvbnRTaXplXCIsIFwiY29udGVudFNpemVcIiknIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVR5cGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0RhdGEgdHlwZSBmb3IgY29udmVyc2lvbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydzdHJpbmcnLCAnbnVtYmVyJywgJ2Jvb2xlYW4nLCAnaW50ZWdlcicsICdmbG9hdCcsICdjb2xvcicsICd2ZWMyJywgJ3ZlYzMnLCAnc2l6ZScsICdub2RlJywgJ2NvbXBvbmVudCcsICdzcHJpdGVGcmFtZScsICdwcmVmYWInLCAnYXNzZXQnLCAnbm9kZUFycmF5JywgJ2NvbG9yQXJyYXknLCAnbnVtYmVyQXJyYXknLCAnc3RyaW5nQXJyYXknXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IGRlc2NyaXB0aW9uOiAnUHJvcGVydHkgdmFsdWUgKGFueSB0eXBlOyBtYXRjaGVzIHByb3BlcnR5VHlwZSknIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsncHJvcGVydHknLCAncHJvcGVydHlUeXBlJywgJ3ZhbHVlJ11cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJywgJ2NvbXBvbmVudFR5cGUnLCAncHJvcGVydGllcyddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xuICAgICAgICAgICAgY2FzZSAnYWRkX2NvbXBvbmVudCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYWRkQ29tcG9uZW50KGFyZ3Mubm9kZVV1aWQsIGFyZ3MuY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICBjYXNlICdyZW1vdmVfY29tcG9uZW50JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZW1vdmVDb21wb25lbnQoYXJncy5ub2RlVXVpZCwgYXJncy5jb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9jb21wb25lbnRzJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKGFyZ3Mubm9kZVV1aWQsIGFyZ3MubW9kZSk7XG4gICAgICAgICAgICBjYXNlICdnZXRfY29tcG9uZW50X2luZm8nOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldENvbXBvbmVudEluZm8oYXJncy5ub2RlVXVpZCwgYXJncy5jb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgIGNhc2UgJ3NldF9jb21wb25lbnRfcHJvcGVydHknOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNldENvbXBvbmVudFByb3BlcnR5KGFyZ3MpO1xuICAgICAgICAgICAgY2FzZSAnYXR0YWNoX3NjcmlwdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYXR0YWNoU2NyaXB0KGFyZ3Mubm9kZVV1aWQsIGFyZ3Muc2NyaXB0UGF0aCk7XG4gICAgICAgICAgICBjYXNlICdnZXRfYXZhaWxhYmxlX2NvbXBvbmVudHMnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldEF2YWlsYWJsZUNvbXBvbmVudHMoYXJncy5jYXRlZ29yeSk7XG4gICAgICAgICAgICBjYXNlICdiYXRjaF9zZXRfcHJvcGVydGllcyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYmF0Y2hTZXRQcm9wZXJ0aWVzKGFyZ3MpO1xuICAgICAgICAgICAgY2FzZSAncXVlcnknOlxuICAgICAgICAgICAgICAgIC8vIHYxLjYuMCB1bmlmaWVkIGFjdGlvbi1jb2RlIGRpc3BhdGNoZXJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2xpc3QnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50cyhhcmdzLm5vZGVVdWlkLCBhcmdzLm1vZGUpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbmZvJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldENvbXBvbmVudEluZm8oYXJncy5ub2RlVXVpZCwgYXJncy5jb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYXZhaWxhYmxlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldEF2YWlsYWJsZUNvbXBvbmVudHMoYXJncy5jYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBFUlJPUl9DT0RFUy5JTlZBTElEX1BBUkFNUyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBgVW5rbm93biBxdWVyeSBhY3Rpb246ICR7YXJncy5hY3Rpb259YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHN1Z2dlc3Rpb246ICdVc2UgYWN0aW9uOiBcImxpc3RcIiB8IFwiaW5mb1wiIHwgXCJhdmFpbGFibGVcIicgfVxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBhZGRDb21wb25lbnQobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAvLyDlhYjmn6Xmib7oioLngrnkuIrmmK/lkKblt7LlrZjlnKjor6Xnu4Tku7ZcbiAgICAgICAgICAgIGNvbnN0IGFsbENvbXBvbmVudHNJbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmIChhbGxDb21wb25lbnRzSW5mby5zdWNjZXNzICYmIGFsbENvbXBvbmVudHNJbmZvLmRhdGE/LmNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBleGlzdGluZ0NvbXBvbmVudCA9IGFsbENvbXBvbmVudHNJbmZvLmRhdGEuY29tcG9uZW50cy5maW5kKChjb21wOiBhbnkpID0+IGNvbXAudHlwZSA9PT0gY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICAgICAgaWYgKGV4aXN0aW5nQ29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBDb21wb25lbnQgJyR7Y29tcG9uZW50VHlwZX0nIGFscmVhZHkgZXhpc3RzIG9uIG5vZGVgLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiBjb21wb25lbnRUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFZlcmlmaWVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4aXN0aW5nOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8g5bCd6K+V55u05o6l5L2/55SoIEVkaXRvciBBUEkg5re75Yqg57uE5Lu2XG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdjcmVhdGUtY29tcG9uZW50Jywge1xuICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgIGNvbXBvbmVudDogY29tcG9uZW50VHlwZVxuICAgICAgICAgICAgfSkudGhlbihhc3luYyAocmVzdWx0OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAvLyDnrYnlvoXkuIDmrrXml7bpl7TorqlFZGl0b3LlrozmiJDnu4Tku7bmt7vliqBcbiAgICAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwKSk7XG4gICAgICAgICAgICAgICAgLy8g6YeN5paw5p+l6K+i6IqC54K55L+h5oGv6aqM6K+B57uE5Lu25piv5ZCm55yf55qE5re75Yqg5oiQ5YqfXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYWxsQ29tcG9uZW50c0luZm8yID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFsbENvbXBvbmVudHNJbmZvMi5zdWNjZXNzICYmIGFsbENvbXBvbmVudHNJbmZvMi5kYXRhPy5jb21wb25lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhZGRlZENvbXBvbmVudCA9IGFsbENvbXBvbmVudHNJbmZvMi5kYXRhLmNvbXBvbmVudHMuZmluZCgoY29tcDogYW55KSA9PiBjb21wLnR5cGUgPT09IGNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFkZGVkQ29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBDb21wb25lbnQgJyR7Y29tcG9uZW50VHlwZX0nIGFkZGVkIHN1Y2Nlc3NmdWxseWAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRWZXJpZmllZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4aXN0aW5nOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBDb21wb25lbnQgJyR7Y29tcG9uZW50VHlwZX0nIHdhcyBub3QgZm91bmQgb24gbm9kZSBhZnRlciBhZGRpdGlvbi4gQXZhaWxhYmxlIGNvbXBvbmVudHM6ICR7YWxsQ29tcG9uZW50c0luZm8yLmRhdGEuY29tcG9uZW50cy5tYXAoKGM6IGFueSkgPT4gYy50eXBlKS5qb2luKCcsICcpfWBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIHZlcmlmeSBjb21wb25lbnQgYWRkaXRpb246ICR7YWxsQ29tcG9uZW50c0luZm8yLmVycm9yIHx8ICdVbmFibGUgdG8gZ2V0IG5vZGUgY29tcG9uZW50cyd9YFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoICh2ZXJpZnlFcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byB2ZXJpZnkgY29tcG9uZW50IGFkZGl0aW9uOiAke3ZlcmlmeUVycm9yLm1lc3NhZ2V9YFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIC8vIOWkh+eUqOaWueahiO+8muS9v+eUqOWcuuaZr+iEmuacrFxuICAgICAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnYWRkQ29tcG9uZW50VG9Ob2RlJyxcbiAgICAgICAgICAgICAgICAgICAgYXJnczogW25vZGVVdWlkLCBjb21wb25lbnRUeXBlXVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCBvcHRpb25zKS50aGVuKChyZXN1bHQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycjI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBEaXJlY3QgQVBJIGZhaWxlZDogJHtlcnIubWVzc2FnZX0sIFNjZW5lIHNjcmlwdCBmYWlsZWQ6ICR7ZXJyMi5tZXNzYWdlfWAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyByZW1vdmVDb21wb25lbnQobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAvLyAxLiDmn6Xmib7oioLngrnkuIrnmoTmiYDmnInnu4Tku7ZcbiAgICAgICAgICAgIGNvbnN0IGFsbENvbXBvbmVudHNJbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghYWxsQ29tcG9uZW50c0luZm8uc3VjY2VzcyB8fCAhYWxsQ29tcG9uZW50c0luZm8uZGF0YT8uY29tcG9uZW50cykge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoY3JlYXRlRXJyb3JSZXNwb25zZShcbiAgICAgICAgICAgICAgICAgICAgRVJST1JfQ09ERVMuRURJVE9SX0FQSV9FUlJPUixcbiAgICAgICAgICAgICAgICAgICAgYEZhaWxlZCB0byBnZXQgY29tcG9uZW50cyBmb3Igbm9kZSAnJHtub2RlVXVpZH0nOiAke2FsbENvbXBvbmVudHNJbmZvLmVycm9yfWBcbiAgICAgICAgICAgICAgICApKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyAyLiDmib7liLDljLnphY0gY2lkIOeahOe7hOS7tiArIOWFtuaVsOe7hCBpbmRleO+8iGdldENvbXBvbmVudHMg5L+d5oyBIF9fY29tcHNfXyDljp/pobrluo/vvIlcbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudHMgPSBhbGxDb21wb25lbnRzSW5mby5kYXRhLmNvbXBvbmVudHM7XG4gICAgICAgICAgICBjb25zdCBtYXRjaGVkSW5kZXggPSBjb21wb25lbnRzLmZpbmRJbmRleCgoY29tcDogYW55KSA9PiBjb21wLnR5cGUgPT09IGNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgaWYgKG1hdGNoZWRJbmRleCA8IDApIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGNyZWF0ZUVycm9yUmVzcG9uc2UoXG4gICAgICAgICAgICAgICAgICAgIEVSUk9SX0NPREVTLk5PVF9GT1VORCxcbiAgICAgICAgICAgICAgICAgICAgYENvbXBvbmVudCBjaWQgJyR7Y29tcG9uZW50VHlwZX0nIG5vdCBmb3VuZCBvbiBub2RlICcke25vZGVVdWlkfScuIOivt+eUqCBnZXRDb21wb25lbnRzIOWPliB0eXBlIOWtl+aute+8iGNpZO+8ieS9nOS4uiBjb21wb25lbnRUeXBl44CCYCxcbiAgICAgICAgICAgICAgICAgICAgeyBub2RlVXVpZCwgY29tcG9uZW50VHlwZSwgYXZhaWxhYmxlQ2lkczogY29tcG9uZW50cy5tYXAoKGM6IGFueSkgPT4gYy50eXBlKSB9XG4gICAgICAgICAgICAgICAgKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbWF0Y2hlZCA9IGNvbXBvbmVudHNbbWF0Y2hlZEluZGV4XTtcblxuICAgICAgICAgICAgLy8gMy4g5p6E6YCg5YCZ6YCJIGlkZW50aWZpZXIg5YiX6KGoIOKAlCDoh6rlrprkuYnohJrmnKznmoQgY2lkIOmAmuW4uOiiqyBDb2NvcyDmi5Lnu53vvIzpnIAgZmFsbGJhY2tcbiAgICAgICAgICAgIC8vICAgIOmhuuW6j+e7j+mqjOS+neaNru+8mue7hOS7tuWunuS+iyB1dWlkIOKGkiBwcm9wZXJ0aWVzLnV1aWTvvIjlpIfnlKjmj5Dlj5bot6/lvoTvvInihpIgX19jb21wc19fLk4gcGF0aCDihpIg5pWw5a2XIGluZGV4IOKGkiDogIEgY2lk77yI5Zue6YCA5L+d5bqV77yJXG4gICAgICAgICAgICBjb25zdCBjYW5kaWRhdGVzOiBBcnJheTx7IGxhYmVsOiBzdHJpbmc7IHBheWxvYWQ6IGFueSB9PiA9IFtdO1xuICAgICAgICAgICAgY29uc3Qgc2VlblBheWxvYWRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICAgICAgICBjb25zdCB0cnlQdXNoID0gKGxhYmVsOiBzdHJpbmcsIHBheWxvYWQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGAke3R5cGVvZiBwYXlsb2FkfToke1N0cmluZyhwYXlsb2FkKX1gO1xuICAgICAgICAgICAgICAgIGlmIChzZWVuUGF5bG9hZHMuaGFzKGtleSkpIHJldHVybjtcbiAgICAgICAgICAgICAgICBzZWVuUGF5bG9hZHMuYWRkKGtleSk7XG4gICAgICAgICAgICAgICAgY2FuZGlkYXRlcy5wdXNoKHsgbGFiZWwsIHBheWxvYWQgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKG1hdGNoZWQudXVpZCkgdHJ5UHVzaChgY29tcG9uZW50IHV1aWQgKCR7bWF0Y2hlZC51dWlkfSlgLCBtYXRjaGVkLnV1aWQpO1xuICAgICAgICAgICAgLy8gcHJvcGVydGllcy51dWlkIOaYryBDb2NvcyB2YWx1ZSDltYzlpZfph4znmoTlj6bkuIDkuKogdXVpZCDlrZfmrrXvvIzpg6jliIboh6rlrprkuYnohJrmnKzlj6rlnKjov5nph4zmnIlcbiAgICAgICAgICAgIGNvbnN0IGlubmVyVXVpZCA9IChtYXRjaGVkIGFzIGFueSkucHJvcGVydGllcz8udXVpZDtcbiAgICAgICAgICAgIGlmIChpbm5lclV1aWQgJiYgdHlwZW9mIGlubmVyVXVpZCA9PT0gJ3N0cmluZycpIHRyeVB1c2goYHByb3BlcnRpZXMudXVpZCAoJHtpbm5lclV1aWR9KWAsIGlubmVyVXVpZCk7XG4gICAgICAgICAgICB0cnlQdXNoKGBfX2NvbXBzX18uJHttYXRjaGVkSW5kZXh9IHBhdGhgLCBgX19jb21wc19fLiR7bWF0Y2hlZEluZGV4fWApO1xuICAgICAgICAgICAgdHJ5UHVzaChgYXJyYXkgaW5kZXggJHttYXRjaGVkSW5kZXh9YCwgbWF0Y2hlZEluZGV4KTtcbiAgICAgICAgICAgIHRyeVB1c2goYGNpZCAoJHtjb21wb25lbnRUeXBlfSlgLCBjb21wb25lbnRUeXBlKTtcblxuICAgICAgICAgICAgLy8gNC4g5L6d5qyh5bCd6K+VIHJlbW92ZS1jb21wb25lbnTvvIzku7vkuIDmiJDlip/ljbPov5RcbiAgICAgICAgICAgIGNvbnN0IHRyaWVkSWRlbnRpZmllcnM6IEFycmF5PHsgaWRlbnRpZmllcjogc3RyaW5nOyBvdXRjb21lOiBzdHJpbmcgfT4gPSBbXTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2FuZGlkYXRlIG9mIGNhbmRpZGF0ZXMpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdyZW1vdmUtY29tcG9uZW50Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQ6IGNhbmRpZGF0ZS5wYXlsb2FkXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAvLyB2ZXJpZnkgYnkgcmUtcXVlcnlpbmdcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYWZ0ZXJSZW1vdmVJbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RpbGxFeGlzdHMgPSBhZnRlclJlbW92ZUluZm8uc3VjY2Vzc1xuICAgICAgICAgICAgICAgICAgICAgICAgJiYgYWZ0ZXJSZW1vdmVJbmZvLmRhdGE/LmNvbXBvbmVudHM/LnNvbWUoKGNvbXA6IGFueSkgPT4gY29tcC50eXBlID09PSBjb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzdGlsbEV4aXN0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQ29tcG9uZW50IGNpZCAnJHtjb21wb25lbnRUeXBlfScgcmVtb3ZlZCB2aWEgcmVtb3ZlLWNvbXBvbmVudCgke2NhbmRpZGF0ZS5sYWJlbH0pYCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7IG5vZGVVdWlkLCBjb21wb25lbnRUeXBlLCBpZGVudGlmaWVyVXNlZDogY2FuZGlkYXRlLmxhYmVsLCBzdHJhdGVneTogJ3JlbW92ZS1jb21wb25lbnQnIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRyaWVkSWRlbnRpZmllcnMucHVzaCh7IGlkZW50aWZpZXI6IGNhbmRpZGF0ZS5sYWJlbCwgb3V0Y29tZTogJ2NvY29zIGFjY2VwdGVkIGNhbGwgYnV0IGNvbXBvbmVudCBzdGlsbCBwcmVzZW50IGFmdGVyIHJlLXF1ZXJ5JyB9KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgICAgICAgICB0cmllZElkZW50aWZpZXJzLnB1c2goeyBpZGVudGlmaWVyOiBjYW5kaWRhdGUubGFiZWwsIG91dGNvbWU6IGB0aHJldzogJHtlcnI/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycil9YCB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIDUuIOacgOWQjiBmYWxsYmFjazog55SoIHNjZW5lID4gcmVtb3ZlLWFycmF5LWVsZW1lbnQg55u05o6l5LuOIF9fY29tcHNfXyDmlbDnu4TliaXmjonjgIJcbiAgICAgICAgICAgIC8vICAgIENvY29zIOiHquWumuS5ieiEmuacrOWvuSByZW1vdmUtY29tcG9uZW50IOS4jeWTjeW6lO+8iOaOpeWPl+iwg+eUqOS9huS4jeWIoO+8ie+8jFxuICAgICAgICAgICAgLy8gICAgYXJyYXktZWxlbWVudCDmmK/nu5Xov4fov5nkuKrpmZDliLbnmoTlj6/pnaDot6/lvoTvvIjlt7LlnKggUkVRLTIwMjYwNTExLTIzNDIxMyDlrp7mtYvvvInjgIJcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncmVtb3ZlLWFycmF5LWVsZW1lbnQnLCB7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiAnX19jb21wc19fJyxcbiAgICAgICAgICAgICAgICAgICAgaW5kZXg6IG1hdGNoZWRJbmRleFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IGFmdGVyUmVtb3ZlSW5mbyA9IGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50cyhub2RlVXVpZCk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RpbGxFeGlzdHMgPSBhZnRlclJlbW92ZUluZm8uc3VjY2Vzc1xuICAgICAgICAgICAgICAgICAgICAmJiBhZnRlclJlbW92ZUluZm8uZGF0YT8uY29tcG9uZW50cz8uc29tZSgoY29tcDogYW55KSA9PiBjb21wLnR5cGUgPT09IGNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgICAgIGlmICghc3RpbGxFeGlzdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYENvbXBvbmVudCBjaWQgJyR7Y29tcG9uZW50VHlwZX0nIHJlbW92ZWQgdmlhIHJlbW92ZS1hcnJheS1lbGVtZW50KF9fY29tcHNfX1ske21hdGNoZWRJbmRleH1dKWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7IG5vZGVVdWlkLCBjb21wb25lbnRUeXBlLCBpZGVudGlmaWVyVXNlZDogYF9fY29tcHNfX1ske21hdGNoZWRJbmRleH1dYCwgc3RyYXRlZ3k6ICdyZW1vdmUtYXJyYXktZWxlbWVudCcgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0cmllZElkZW50aWZpZXJzLnB1c2goeyBpZGVudGlmaWVyOiBgX19jb21wc19fWyR7bWF0Y2hlZEluZGV4fV0gdmlhIHJlbW92ZS1hcnJheS1lbGVtZW50YCwgb3V0Y29tZTogJ2NvY29zIGFjY2VwdGVkIGNhbGwgYnV0IGNvbXBvbmVudCBzdGlsbCBwcmVzZW50JyB9KTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgdHJpZWRJZGVudGlmaWVycy5wdXNoKHsgaWRlbnRpZmllcjogYF9fY29tcHNfX1ske21hdGNoZWRJbmRleH1dIHZpYSByZW1vdmUtYXJyYXktZWxlbWVudGAsIG91dGNvbWU6IGB0aHJldzogJHtlcnI/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycil9YCB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gNi4g5YWo6YOo5aSx6LSlIOKAlCDov5Tnu5PmnoTljJbplJnor6/vvIzorqkgY2FsbGVyIOefpemBk+avj+S4qiBpZGVudGlmaWVyIOaYr+aAjuS5iOaMgueahFxuICAgICAgICAgICAgcmVzb2x2ZShjcmVhdGVFcnJvclJlc3BvbnNlKFxuICAgICAgICAgICAgICAgIEVSUk9SX0NPREVTLkVESVRPUl9BUElfRVJST1IsXG4gICAgICAgICAgICAgICAgYENvbXBvbmVudCBjaWQgJyR7Y29tcG9uZW50VHlwZX0nIGNvdWxkIG5vdCBiZSByZW1vdmVkIGZyb20gbm9kZSAnJHtub2RlVXVpZH0nIGFmdGVyIHRyeWluZyAke3RyaWVkSWRlbnRpZmllcnMubGVuZ3RofSBpZGVudGlmaWVyIHN0cmF0ZWdpZXMgKGluY2wuIHJlbW92ZS1hcnJheS1lbGVtZW50KS5gLFxuICAgICAgICAgICAgICAgIHsgbm9kZVV1aWQsIGNvbXBvbmVudFR5cGUsIHRyaWVkSWRlbnRpZmllcnMgfVxuICAgICAgICAgICAgKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0Q29tcG9uZW50cyhub2RlVXVpZDogc3RyaW5nLCBtb2RlOiAnZnVsbCcgfCAnbWluaW1hbCcgfCAndmFsdWVzX29ubHknID0gJ21pbmltYWwnKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAvLyDkvJjlhYjlsJ3or5Xnm7TmjqXkvb/nlKggRWRpdG9yIEFQSSDmn6Xor6LoioLngrnkv6Hmga9cbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCkudGhlbigobm9kZURhdGE6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChub2RlRGF0YSAmJiBub2RlRGF0YS5fX2NvbXBzX18pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcG9uZW50cyA9IG5vZGVEYXRhLl9fY29tcHNfXy5tYXAoKGNvbXA6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmF3UHJvcGVydGllcyA9IHRoaXMuZXh0cmFjdENvbXBvbmVudFByb3BlcnRpZXMoY29tcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9wZXJ0aWVzID0gbW9kZSA9PT0gJ2Z1bGwnID8gcmF3UHJvcGVydGllcyA6IHRoaXMuY29tcGFjdFByb3BlcnRpZXMocmF3UHJvcGVydGllcywgbW9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSRVEtMjAyNjA1MTEtMjM0MjEzIOS/ruWkjTog57uE5Lu25a6e5L6LIHV1aWQg5a6e6ZmF5ZyoIGNvbXAudmFsdWUudXVpZO+8iENvY29zIOW1jOWll+e7k+aehO+8iVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g6aG25bGCIGNvbXAudXVpZCDpgJrluLjmnKrlrprkuYkg4oCUIOS5i+WJjSBmYWxsYmFjayBjaGFpbiDkuIDnm7QgbnVsbFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5zdGFuY2VVdWlkID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wLnZhbHVlPy51dWlkPy52YWx1ZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXAudmFsdWU/LnV1aWQgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wLnV1aWQ/LnZhbHVlIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcC51dWlkIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogY29tcC5fX3R5cGVfXyB8fCBjb21wLmNpZCB8fCBjb21wLnR5cGUgfHwgJ1Vua25vd24nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHR5cGVvZiBpbnN0YW5jZVV1aWQgPT09ICdzdHJpbmcnID8gaW5zdGFuY2VVdWlkIDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBjb21wLmVuYWJsZWQgIT09IHVuZGVmaW5lZCA/IGNvbXAuZW5hYmxlZCA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllc1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2RlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudHM6IGNvbXBvbmVudHNcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vZGUgbm90IGZvdW5kIG9yIG5vIGNvbXBvbmVudHMgZGF0YScgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAvLyDlpIfnlKjmlrnmoYjvvJrkvb/nlKjlnLrmma/ohJrmnKxcbiAgICAgICAgICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ2dldE5vZGVJbmZvJyxcbiAgICAgICAgICAgICAgICAgICAgYXJnczogW25vZGVVdWlkXVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCBvcHRpb25zKS50aGVuKChyZXN1bHQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogcmVzdWx0LmRhdGEuY29tcG9uZW50c1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyMjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYERpcmVjdCBBUEkgZmFpbGVkOiAke2Vyci5tZXNzYWdlfSwgU2NlbmUgc2NyaXB0IGZhaWxlZDogJHtlcnIyLm1lc3NhZ2V9YCB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldENvbXBvbmVudEluZm8obm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAvLyDkvJjlhYjlsJ3or5Xnm7TmjqXkvb/nlKggRWRpdG9yIEFQSSDmn6Xor6LoioLngrnkv6Hmga9cbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCkudGhlbigobm9kZURhdGE6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChub2RlRGF0YSAmJiBub2RlRGF0YS5fX2NvbXBzX18pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gbm9kZURhdGEuX19jb21wc19fLmZpbmQoKGNvbXA6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcFR5cGUgPSBjb21wLl9fdHlwZV9fIHx8IGNvbXAuY2lkIHx8IGNvbXAudHlwZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb21wVHlwZSA9PT0gY29tcG9uZW50VHlwZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiBjb21wb25lbnRUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBjb21wb25lbnQuZW5hYmxlZCAhPT0gdW5kZWZpbmVkID8gY29tcG9uZW50LmVuYWJsZWQgOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB0aGlzLmV4dHJhY3RDb21wb25lbnRQcm9wZXJ0aWVzKGNvbXBvbmVudClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgJyR7Y29tcG9uZW50VHlwZX0nIG5vdCBmb3VuZCBvbiBub2RlYCB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdOb2RlIG5vdCBmb3VuZCBvciBubyBjb21wb25lbnRzIGRhdGEnIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8g5aSH55So5pa55qGI77ya5L2/55So5Zy65pmv6ISa5pysXG4gICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdnZXROb2RlSW5mbycsXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtub2RlVXVpZF1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywgb3B0aW9ucykudGhlbigocmVzdWx0OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5zdWNjZXNzICYmIHJlc3VsdC5kYXRhLmNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudCA9IHJlc3VsdC5kYXRhLmNvbXBvbmVudHMuZmluZCgoY29tcDogYW55KSA9PiBjb21wLnR5cGUgPT09IGNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiBjb21wb25lbnRUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uY29tcG9uZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAnJHtjb21wb25lbnRUeXBlfScgbm90IGZvdW5kIG9uIG5vZGVgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogcmVzdWx0LmVycm9yIHx8ICdGYWlsZWQgdG8gZ2V0IGNvbXBvbmVudCBpbmZvJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRGlyZWN0IEFQSSBmYWlsZWQ6ICR7ZXJyLm1lc3NhZ2V9LCBTY2VuZSBzY3JpcHQgZmFpbGVkOiAke2VycjIubWVzc2FnZX1gIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE9QVC0xIChSRVEtMjAyNjA1MTEtMjM0MjEzKSDigJQgbWluaW1hbC92YWx1ZXNfb25seSDmqKHlvI/kuIvljovnvKkgcHJvcGVydGllc+OAglxuICAgICAqIENvY29zIOe8lui+keWZqOi/lOWbnueahOavj+S4qiBwcm9wZXJ0eSDmmK8gYHt2YWx1ZSwgdHlwZSwgcmVhZG9ubHksIHZpc2libGUsIGFuaW1hdGFibGUsIGRpc3BsYXlOYW1lLCB0b29sdGlwLCBkZWZhdWx0LCBleHRlbmRzLCBlbnVtTGlzdCwgLi4ufWAgOS3lrZfmrrXljIXoo4XvvJtcbiAgICAgKiBBZ2VudCA5OSUg5Y+q6ZyA6KaBIGB2YWx1ZWDvvIjlkowgYHR5cGVgIOWcqOWkjeadguW8leeUqOS4iu+8ieOAguacrOaWueazleWJpeemuyBpMThuIGtleeOAgWRlZmF1bHTjgIFlbnVtTGlzdOOAgV/liY3nvIDph43lpI3lrZfmrrXjgIFleHRlbmRzIOetieOAglxuICAgICAqIOWNleeCueWOi+e8qeavlOmAmuW4uCA4MC05NSXvvIjlrp7mtYvvvJozLee7hOS7tuiKgueCueS7jiB+MzBLIHRva2VucyDihpIgfjNLIHRva2Vuc++8ieOAglxuICAgICAqL1xuICAgIHByaXZhdGUgY29tcGFjdFByb3BlcnRpZXMocmF3UHJvcGVydGllczogUmVjb3JkPHN0cmluZywgYW55PiwgbW9kZTogJ21pbmltYWwnIHwgJ3ZhbHVlc19vbmx5Jyk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xuICAgICAgICBpZiAoIXJhd1Byb3BlcnRpZXMgfHwgdHlwZW9mIHJhd1Byb3BlcnRpZXMgIT09ICdvYmplY3QnKSByZXR1cm4gcmF3UHJvcGVydGllcztcbiAgICAgICAgY29uc3QgY29tcGFjdDogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHByb3BNZXRhXSBvZiBPYmplY3QuZW50cmllcyhyYXdQcm9wZXJ0aWVzKSkge1xuICAgICAgICAgICAgLy8g6Lez6L+HIF8g5YmN57yA6YeN5aSN5a2X5q6177yI5aaCIF9jb2xvciAvIF9lbmFibGVk77yM5LiO5peg5YmN57yA54mI5pys5ZCM5L+h5oGv77yJXG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ18nKSAmJiBrZXkgIT09ICdfX3NjcmlwdEFzc2V0JyAmJiBrZXkgIT09ICdfX3ByZWZhYicpIGNvbnRpbnVlO1xuICAgICAgICAgICAgLy8gc3ViLW1ldGEgOS3lrZfmrrXljIXoo4XvvJrlj5YgdmFsdWXvvIzkuKLlvIMgZGlzcGxheU5hbWUvdG9vbHRpcC9kZWZhdWx0L2V4dGVuZHMvcmVhZG9ubHkvdmlzaWJsZS9hbmltYXRhYmxlL2VudW1MaXN0XG4gICAgICAgICAgICBpZiAocHJvcE1ldGEgJiYgdHlwZW9mIHByb3BNZXRhID09PSAnb2JqZWN0JyAmJiAndmFsdWUnIGluIHByb3BNZXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaW5uZXJWYWx1ZSA9IHByb3BNZXRhLnZhbHVlO1xuICAgICAgICAgICAgICAgIGlmIChtb2RlID09PSAndmFsdWVzX29ubHknKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBhY3Rba2V5XSA9IGlubmVyVmFsdWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbWluaW1hbDog5L+d55WZIHZhbHVlICsg5Zyo5byV55So57G75Z6L5LiK5L+d55WZIHR5cGVcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcFR5cGUgPSAocHJvcE1ldGEgYXMgYW55KS50eXBlO1xuICAgICAgICAgICAgICAgICAgICBpZiAocHJvcFR5cGUgJiYgdHlwZW9mIHByb3BUeXBlID09PSAnc3RyaW5nJyAmJiBwcm9wVHlwZS5zdGFydHNXaXRoKCdjYy4nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tcGFjdFtrZXldID0geyB2YWx1ZTogaW5uZXJWYWx1ZSwgdHlwZTogcHJvcFR5cGUgfTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBhY3Rba2V5XSA9IGlubmVyVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIOmdniBzdWItbWV0YSDljIXoo4XvvIjnm7TmjqXlgLzvvInvvIzljp/moLfkv53nlZlcbiAgICAgICAgICAgICAgICBjb21wYWN0W2tleV0gPSBwcm9wTWV0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29tcGFjdDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGV4dHJhY3RDb21wb25lbnRQcm9wZXJ0aWVzKGNvbXBvbmVudDogYW55KTogUmVjb3JkPHN0cmluZywgYW55PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBbZXh0cmFjdENvbXBvbmVudFByb3BlcnRpZXNdIFByb2Nlc3NpbmcgY29tcG9uZW50OmAsIE9iamVjdC5rZXlzKGNvbXBvbmVudCkpO1xuXG4gICAgICAgIC8vIOajgOafpee7hOS7tuaYr+WQpuaciSB2YWx1ZSDlsZ7mgKfvvIzov5npgJrluLjljIXlkKvlrp7pmYXnmoTnu4Tku7blsZ7mgKdcbiAgICAgICAgaWYgKGNvbXBvbmVudC52YWx1ZSAmJiB0eXBlb2YgY29tcG9uZW50LnZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFtleHRyYWN0Q29tcG9uZW50UHJvcGVydGllc10gRm91bmQgY29tcG9uZW50LnZhbHVlIHdpdGggcHJvcGVydGllczpgLCBPYmplY3Qua2V5cyhjb21wb25lbnQudmFsdWUpKTtcbiAgICAgICAgICAgIHJldHVybiBjb21wb25lbnQudmFsdWU7IC8vIOebtOaOpei/lOWbniB2YWx1ZSDlr7nosaHvvIzlroPljIXlkKvmiYDmnInnu4Tku7blsZ7mgKdcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8g5aSH55So5pa55qGI77ya5LuO57uE5Lu25a+56LGh5Lit55u05o6l5o+Q5Y+W5bGe5oCnXG4gICAgICAgIGNvbnN0IHByb3BlcnRpZXM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcbiAgICAgICAgY29uc3QgZXhjbHVkZUtleXMgPSBbJ19fdHlwZV9fJywgJ2VuYWJsZWQnLCAnbm9kZScsICdfaWQnLCAnX19zY3JpcHRBc3NldCcsICd1dWlkJywgJ25hbWUnLCAnX25hbWUnLCAnX29iakZsYWdzJywgJ19lbmFibGVkJywgJ3R5cGUnLCAncmVhZG9ubHknLCAndmlzaWJsZScsICdjaWQnLCAnZWRpdG9yJywgJ2V4dGVuZHMnXTtcbiAgICAgICAgXG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIGNvbXBvbmVudCkge1xuICAgICAgICAgICAgaWYgKCFleGNsdWRlS2V5cy5pbmNsdWRlcyhrZXkpICYmICFrZXkuc3RhcnRzV2l0aCgnXycpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtleHRyYWN0Q29tcG9uZW50UHJvcGVydGllc10gRm91bmQgZGlyZWN0IHByb3BlcnR5ICcke2tleX0nOmAsIHR5cGVvZiBjb21wb25lbnRba2V5XSk7XG4gICAgICAgICAgICAgICAgcHJvcGVydGllc1trZXldID0gY29tcG9uZW50W2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnNvbGUubG9nKGBbZXh0cmFjdENvbXBvbmVudFByb3BlcnRpZXNdIEZpbmFsIGV4dHJhY3RlZCBwcm9wZXJ0aWVzOmAsIE9iamVjdC5rZXlzKHByb3BlcnRpZXMpKTtcbiAgICAgICAgcmV0dXJuIHByb3BlcnRpZXM7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBmaW5kQ29tcG9uZW50VHlwZUJ5VXVpZChjb21wb25lbnRVdWlkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICAgICAgY29uc29sZS5sb2coYFtmaW5kQ29tcG9uZW50VHlwZUJ5VXVpZF0gU2VhcmNoaW5nIGZvciBjb21wb25lbnQgdHlwZSB3aXRoIFVVSUQ6ICR7Y29tcG9uZW50VXVpZH1gKTtcbiAgICAgICAgaWYgKCFjb21wb25lbnRVdWlkKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qgbm9kZVRyZWUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlLXRyZWUnKTtcbiAgICAgICAgICAgIGlmICghbm9kZVRyZWUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tmaW5kQ29tcG9uZW50VHlwZUJ5VXVpZF0gRmFpbGVkIHRvIHF1ZXJ5IG5vZGUgdHJlZS4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcXVldWU6IGFueVtdID0gW25vZGVUcmVlXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgd2hpbGUgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50Tm9kZUluZm8gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgIGlmICghY3VycmVudE5vZGVJbmZvIHx8ICFjdXJyZW50Tm9kZUluZm8udXVpZCkge1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmdWxsTm9kZURhdGEgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgY3VycmVudE5vZGVJbmZvLnV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZnVsbE5vZGVEYXRhICYmIGZ1bGxOb2RlRGF0YS5fX2NvbXBzX18pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29tcCBvZiBmdWxsTm9kZURhdGEuX19jb21wc19fKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcEFueSA9IGNvbXAgYXMgYW55OyAvLyBDYXN0IHRvIGFueSB0byBhY2Nlc3MgZHluYW1pYyBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGNvbXBvbmVudCBVVUlEIGlzIG5lc3RlZCBpbiB0aGUgJ3ZhbHVlJyBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wQW55LnV1aWQgJiYgY29tcEFueS51dWlkLnZhbHVlID09PSBjb21wb25lbnRVdWlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudFR5cGUgPSBjb21wQW55Ll9fdHlwZV9fO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW2ZpbmRDb21wb25lbnRUeXBlQnlVdWlkXSBGb3VuZCBjb21wb25lbnQgdHlwZSAnJHtjb21wb25lbnRUeXBlfScgZm9yIFVVSUQgJHtjb21wb25lbnRVdWlkfSBvbiBub2RlICR7ZnVsbE5vZGVEYXRhLm5hbWU/LnZhbHVlfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29tcG9uZW50VHlwZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgW2ZpbmRDb21wb25lbnRUeXBlQnlVdWlkXSBDb3VsZCBub3QgcXVlcnkgbm9kZSAke2N1cnJlbnROb2RlSW5mby51dWlkfTpgLCBlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudE5vZGVJbmZvLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY3VycmVudE5vZGVJbmZvLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBxdWV1ZS5wdXNoKGNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc29sZS53YXJuKGBbZmluZENvbXBvbmVudFR5cGVCeVV1aWRdIENvbXBvbmVudCB3aXRoIFVVSUQgJHtjb21wb25lbnRVdWlkfSBub3QgZm91bmQgaW4gc2NlbmUgdHJlZS5gKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgW2ZpbmRDb21wb25lbnRUeXBlQnlVdWlkXSBFcnJvciB3aGlsZSBzZWFyY2hpbmcgZm9yIGNvbXBvbmVudCB0eXBlOmAsIGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzZXRDb21wb25lbnRQcm9wZXJ0eShhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBub2RlVXVpZCwgY29tcG9uZW50VHlwZSwgcHJvcGVydHksIHByb3BlcnR5VHlwZSwgdmFsdWUgfSA9IGFyZ3M7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gU2V0dGluZyAke2NvbXBvbmVudFR5cGV9LiR7cHJvcGVydHl9ICh0eXBlOiAke3Byb3BlcnR5VHlwZX0pID0gJHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9IG9uIG5vZGUgJHtub2RlVXVpZH1gKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTdGVwIDA6IOajgOa1i+aYr+WQpuS4uuiKgueCueWxnuaAp++8jOWmguaenOaYr+WImemHjeWumuWQkeWIsOWvueW6lOeahOiKgueCueaWueazlVxuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVSZWRpcmVjdFJlc3VsdCA9IGF3YWl0IHRoaXMuY2hlY2tBbmRSZWRpcmVjdE5vZGVQcm9wZXJ0aWVzKGFyZ3MpO1xuICAgICAgICAgICAgICAgIGlmIChub2RlUmVkaXJlY3RSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShub2RlUmVkaXJlY3RSZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFN0ZXAgMTog6I635Y+W57uE5Lu25L+h5oGv77yM5L2/55So5LiOZ2V0Q29tcG9uZW50c+ebuOWQjOeahOaWueazlVxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudHNSZXNwb25zZSA9IGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50cyhub2RlVXVpZCk7XG4gICAgICAgICAgICAgICAgaWYgKCFjb21wb25lbnRzUmVzcG9uc2Uuc3VjY2VzcyB8fCAhY29tcG9uZW50c1Jlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIGdldCBjb21wb25lbnRzIGZvciBub2RlICcke25vZGVVdWlkfSc6ICR7Y29tcG9uZW50c1Jlc3BvbnNlLmVycm9yfWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogYFBsZWFzZSB2ZXJpZnkgdGhhdCBub2RlIFVVSUQgJyR7bm9kZVV1aWR9JyBpcyBjb3JyZWN0LiBVc2UgZ2V0X2FsbF9ub2RlcyBvciBmaW5kX25vZGVfYnlfbmFtZSB0byBnZXQgdGhlIGNvcnJlY3Qgbm9kZSBVVUlELmBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgYWxsQ29tcG9uZW50cyA9IGNvbXBvbmVudHNSZXNwb25zZS5kYXRhLmNvbXBvbmVudHM7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU3RlcCAyOiDmn6Xmib7nm67moIfnu4Tku7ZcbiAgICAgICAgICAgICAgICBsZXQgdGFyZ2V0Q29tcG9uZW50ID0gbnVsbDtcbiAgICAgICAgICAgICAgICBjb25zdCBhdmFpbGFibGVUeXBlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFsbENvbXBvbmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcCA9IGFsbENvbXBvbmVudHNbaV07XG4gICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVR5cGVzLnB1c2goY29tcC50eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21wLnR5cGUgPT09IGNvbXBvbmVudFR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldENvbXBvbmVudCA9IGNvbXA7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIXRhcmdldENvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICAvLyDmj5Dkvpvmm7Tor6bnu4bnmoTplJnor6/kv6Hmga/lkozlu7rorq5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5zdHJ1Y3Rpb24gPSB0aGlzLmdlbmVyYXRlQ29tcG9uZW50U3VnZ2VzdGlvbihjb21wb25lbnRUeXBlLCBhdmFpbGFibGVUeXBlcywgcHJvcGVydHkpO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBDb21wb25lbnQgJyR7Y29tcG9uZW50VHlwZX0nIG5vdCBmb3VuZCBvbiBub2RlLiBBdmFpbGFibGUgY29tcG9uZW50czogJHthdmFpbGFibGVUeXBlcy5qb2luKCcsICcpfWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogaW5zdHJ1Y3Rpb25cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU3RlcCAzOiDoh6rliqjmo4DmtYvlkozovazmjaLlsZ7mgKflgLxcbiAgICAgICAgICAgICAgICBsZXQgcHJvcGVydHlJbmZvO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbQ29tcG9uZW50VG9vbHNdIEFuYWx5emluZyBwcm9wZXJ0eTogJHtwcm9wZXJ0eX1gKTtcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlJbmZvID0gdGhpcy5hbmFseXplUHJvcGVydHkodGFyZ2V0Q29tcG9uZW50LCBwcm9wZXJ0eSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoYW5hbHl6ZUVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgW0NvbXBvbmVudFRvb2xzXSBFcnJvciBpbiBhbmFseXplUHJvcGVydHk6YCwgYW5hbHl6ZUVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIGFuYWx5emUgcHJvcGVydHkgJyR7cHJvcGVydHl9JzogJHthbmFseXplRXJyb3IubWVzc2FnZX1gXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghcHJvcGVydHlJbmZvLmV4aXN0cykge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBQcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIG5vdCBmb3VuZCBvbiBjb21wb25lbnQgJyR7Y29tcG9uZW50VHlwZX0nLiBBdmFpbGFibGUgcHJvcGVydGllczogJHtwcm9wZXJ0eUluZm8uYXZhaWxhYmxlUHJvcGVydGllcy5qb2luKCcsICcpfWBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU3RlcCA0OiDlpITnkIblsZ7mgKflgLzlkozorr7nva5cbiAgICAgICAgICAgICAgICBjb25zdCBvcmlnaW5hbFZhbHVlID0gcHJvcGVydHlJbmZvLm9yaWdpbmFsVmFsdWU7XG4gICAgICAgICAgICAgICAgbGV0IHByb2Nlc3NlZFZhbHVlOiBhbnk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8g5qC55o2u5piO56Gu55qEcHJvcGVydHlUeXBl5aSE55CG5bGe5oCn5YC8XG4gICAgICAgICAgICAgICAgc3dpdGNoIChwcm9wZXJ0eVR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbnRlZ2VyJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZmxvYXQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUkVRLTIwMjYwNTExLTIzNDIxMyDkv67lpI06IEpTIEJvb2xlYW4oXCJmYWxzZVwiKSA9PT0gdHJ1Ze+8iOmdnuepuuWtl+espuS4siB0cnV0aHkg5Z2R77yJ77yMXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDmiYDku6UgTUNQIHdpcmUg5oqKIGZhbHNlIOWtl+espuS4suWMluWQjui/memHjOS8muWPjSBmbGlw44CC5pi+5byPIHN0cmluZyBwYXJzZSDop4Tpgb/jgIJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHZhbHVlLnRvTG93ZXJDYXNlKCkgPT09ICd0cnVlJyB8fCB2YWx1ZSA9PT0gJzEnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IEJvb2xlYW4odmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2NvbG9yJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5a2X56ym5Liy5qC85byP77ya5pSv5oyB5Y2B5YWt6L+b5Yi244CB6aKc6Imy5ZCN56ew44CBcmdiKCkvcmdiYSgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB0aGlzLnBhcnNlQ29sb3JTdHJpbmcodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5a+56LGh5qC85byP77ya6aqM6K+B5bm26L2s5o2iUkdCQeWAvFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcih2YWx1ZS5yKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGc6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKHZhbHVlLmcpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIodmFsdWUuYikgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhOiB2YWx1ZS5hICE9PSB1bmRlZmluZWQgPyBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcih2YWx1ZS5hKSkpIDogMjU1XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb2xvciB2YWx1ZSBtdXN0IGJlIGFuIG9iamVjdCB3aXRoIHIsIGcsIGIgcHJvcGVydGllcyBvciBhIGhleGFkZWNpbWFsIHN0cmluZyAoZS5nLiwgXCIjRkYwMDAwXCIpJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndmVjMic6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBOdW1iZXIodmFsdWUueCkgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogTnVtYmVyKHZhbHVlLnkpIHx8IDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZlYzIgdmFsdWUgbXVzdCBiZSBhbiBvYmplY3Qgd2l0aCB4LCB5IHByb3BlcnRpZXMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd2ZWMzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IE51bWJlcih2YWx1ZS54KSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiBOdW1iZXIodmFsdWUueSkgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgejogTnVtYmVyKHZhbHVlLnopIHx8IDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZlYzMgdmFsdWUgbXVzdCBiZSBhbiBvYmplY3Qgd2l0aCB4LCB5LCB6IHByb3BlcnRpZXMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzaXplJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBOdW1iZXIodmFsdWUud2lkdGgpIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogTnVtYmVyKHZhbHVlLmhlaWdodCkgfHwgMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignU2l6ZSB2YWx1ZSBtdXN0IGJlIGFuIG9iamVjdCB3aXRoIHdpZHRoLCBoZWlnaHQgcHJvcGVydGllcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ25vZGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHsgdXVpZDogdmFsdWUgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb2RlIHJlZmVyZW5jZSB2YWx1ZSBtdXN0IGJlIGEgc3RyaW5nIFVVSUQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdjb21wb25lbnQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDnu4Tku7blvJXnlKjpnIDopoHnibnmrorlpITnkIbvvJrpgJrov4foioLngrlVVUlE5om+5Yiw57uE5Lu255qEX19pZF9fXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB2YWx1ZTsgLy8g5YWI5L+d5a2Y6IqC54K5VVVJRO+8jOWQjue7reS8mui9rOaNouS4ul9faWRfX1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbXBvbmVudCByZWZlcmVuY2UgdmFsdWUgbXVzdCBiZSBhIHN0cmluZyAobm9kZSBVVUlEIGNvbnRhaW5pbmcgdGhlIHRhcmdldCBjb21wb25lbnQpJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc3ByaXRlRnJhbWUnOlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdwcmVmYWInOlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdhc3NldCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0geyB1dWlkOiB2YWx1ZSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7cHJvcGVydHlUeXBlfSB2YWx1ZSBtdXN0IGJlIGEgc3RyaW5nIFVVSURgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdub2RlQXJyYXknOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB2YWx1ZS5tYXAoKGl0ZW06IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB1dWlkOiBpdGVtIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vZGVBcnJheSBpdGVtcyBtdXN0IGJlIHN0cmluZyBVVUlEcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm9kZUFycmF5IHZhbHVlIG11c3QgYmUgYW4gYXJyYXknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdjb2xvckFycmF5JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gdmFsdWUubWFwKChpdGVtOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnb2JqZWN0JyAmJiBpdGVtICE9PSBudWxsICYmICdyJyBpbiBpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHI6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGl0ZW0ucikgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGc6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGl0ZW0uZykgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGI6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGl0ZW0uYikgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGE6IGl0ZW0uYSAhPT0gdW5kZWZpbmVkID8gTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaXRlbS5hKSkpIDogMjU1XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgcjogMjU1LCBnOiAyNTUsIGI6IDI1NSwgYTogMjU1IH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb2xvckFycmF5IHZhbHVlIG11c3QgYmUgYW4gYXJyYXknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdudW1iZXJBcnJheSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHZhbHVlLm1hcCgoaXRlbTogYW55KSA9PiBOdW1iZXIoaXRlbSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ051bWJlckFycmF5IHZhbHVlIG11c3QgYmUgYW4gYXJyYXknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzdHJpbmdBcnJheSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHZhbHVlLm1hcCgoaXRlbTogYW55KSA9PiBTdHJpbmcoaXRlbSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1N0cmluZ0FycmF5IHZhbHVlIG11c3QgYmUgYW4gYXJyYXknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBwcm9wZXJ0eSB0eXBlOiAke3Byb3BlcnR5VHlwZX1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gQ29udmVydGluZyB2YWx1ZTogJHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9IC0+ICR7SlNPTi5zdHJpbmdpZnkocHJvY2Vzc2VkVmFsdWUpfSAodHlwZTogJHtwcm9wZXJ0eVR5cGV9KWApO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbQ29tcG9uZW50VG9vbHNdIFByb3BlcnR5IGFuYWx5c2lzIHJlc3VsdDogcHJvcGVydHlJbmZvLnR5cGU9XCIke3Byb3BlcnR5SW5mby50eXBlfVwiLCBwcm9wZXJ0eVR5cGU9XCIke3Byb3BlcnR5VHlwZX1cImApO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbQ29tcG9uZW50VG9vbHNdIFdpbGwgdXNlIGNvbG9yIHNwZWNpYWwgaGFuZGxpbmc6ICR7cHJvcGVydHlUeXBlID09PSAnY29sb3InICYmIHByb2Nlc3NlZFZhbHVlICYmIHR5cGVvZiBwcm9jZXNzZWRWYWx1ZSA9PT0gJ29iamVjdCd9YCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8g55So5LqO6aqM6K+B55qE5a6e6ZmF5pyf5pyb5YC877yI5a+55LqO57uE5Lu25byV55So6ZyA6KaB54m55q6K5aSE55CG77yJXG4gICAgICAgICAgICAgICAgbGV0IGFjdHVhbEV4cGVjdGVkVmFsdWUgPSBwcm9jZXNzZWRWYWx1ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTdGVwIDU6IOiOt+WPluWOn+Wni+iKgueCueaVsOaNruadpeaehOW7uuato+ehrueahOi3r+W+hFxuICAgICAgICAgICAgICAgIGNvbnN0IHJhd05vZGVEYXRhID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICBpZiAoIXJhd05vZGVEYXRhIHx8ICFyYXdOb2RlRGF0YS5fX2NvbXBzX18pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIGdldCByYXcgbm9kZSBkYXRhIGZvciBwcm9wZXJ0eSBzZXR0aW5nYFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyDmib7liLDljp/lp4vnu4Tku7bnmoTntKLlvJVcbiAgICAgICAgICAgICAgICBsZXQgcmF3Q29tcG9uZW50SW5kZXggPSAtMTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJhd05vZGVEYXRhLl9fY29tcHNfXy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wID0gcmF3Tm9kZURhdGEuX19jb21wc19fW2ldIGFzIGFueTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcFR5cGUgPSBjb21wLl9fdHlwZV9fIHx8IGNvbXAuY2lkIHx8IGNvbXAudHlwZSB8fCAnVW5rbm93bic7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21wVHlwZSA9PT0gY29tcG9uZW50VHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmF3Q29tcG9uZW50SW5kZXggPSBpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHJhd0NvbXBvbmVudEluZGV4ID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBDb3VsZCBub3QgZmluZCBjb21wb25lbnQgaW5kZXggZm9yIHNldHRpbmcgcHJvcGVydHlgXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIOaehOW7uuato+ehrueahOWxnuaAp+i3r+W+hFxuICAgICAgICAgICAgICAgIGxldCBwcm9wZXJ0eVBhdGggPSBgX19jb21wc19fLiR7cmF3Q29tcG9uZW50SW5kZXh9LiR7cHJvcGVydHl9YDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyDnibnmrorlpITnkIbotYTmupDnsbvlsZ7mgKdcbiAgICAgICAgICAgICAgICBpZiAocHJvcGVydHlUeXBlID09PSAnYXNzZXQnIHx8IHByb3BlcnR5VHlwZSA9PT0gJ3Nwcml0ZUZyYW1lJyB8fCBwcm9wZXJ0eVR5cGUgPT09ICdwcmVmYWInIHx8IFxuICAgICAgICAgICAgICAgICAgICAocHJvcGVydHlJbmZvLnR5cGUgPT09ICdhc3NldCcgJiYgcHJvcGVydHlUeXBlID09PSAnc3RyaW5nJykpIHtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbQ29tcG9uZW50VG9vbHNdIFNldHRpbmcgYXNzZXQgcmVmZXJlbmNlOmAsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwcm9jZXNzZWRWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5VHlwZTogcHJvcGVydHlUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJvcGVydHlQYXRoXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIGFzc2V0IHR5cGUgYmFzZWQgb24gcHJvcGVydHkgbmFtZVxuICAgICAgICAgICAgICAgICAgICBsZXQgYXNzZXRUeXBlID0gJ2NjLlNwcml0ZUZyYW1lJzsgLy8gZGVmYXVsdFxuICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydHkudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygndGV4dHVyZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFR5cGUgPSAnY2MuVGV4dHVyZTJEJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdtYXRlcmlhbCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFR5cGUgPSAnY2MuTWF0ZXJpYWwnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ2ZvbnQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRUeXBlID0gJ2NjLkZvbnQnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ2NsaXAnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRUeXBlID0gJ2NjLkF1ZGlvQ2xpcCc7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlUeXBlID09PSAncHJlZmFiJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRUeXBlID0gJ2NjLlByZWZhYic7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJvcGVydHlQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcHJvY2Vzc2VkVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogYXNzZXRUeXBlXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY29tcG9uZW50VHlwZSA9PT0gJ2NjLlVJVHJhbnNmb3JtJyAmJiAocHJvcGVydHkgPT09ICdfY29udGVudFNpemUnIHx8IHByb3BlcnR5ID09PSAnY29udGVudFNpemUnKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBVSVRyYW5zZm9ybSBjb250ZW50U2l6ZSAtIHNldCB3aWR0aCBhbmQgaGVpZ2h0IHNlcGFyYXRlbHlcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSBOdW1iZXIodmFsdWUud2lkdGgpIHx8IDEwMDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gTnVtYmVyKHZhbHVlLmhlaWdodCkgfHwgMTAwO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IHdpZHRoIGZpcnN0XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogYF9fY29tcHNfXy4ke3Jhd0NvbXBvbmVudEluZGV4fS53aWR0aGAsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IHZhbHVlOiB3aWR0aCB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhlbiBzZXQgaGVpZ2h0XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogYF9fY29tcHNfXy4ke3Jhd0NvbXBvbmVudEluZGV4fS5oZWlnaHRgLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZTogaGVpZ2h0IH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjb21wb25lbnRUeXBlID09PSAnY2MuVUlUcmFuc2Zvcm0nICYmIChwcm9wZXJ0eSA9PT0gJ19hbmNob3JQb2ludCcgfHwgcHJvcGVydHkgPT09ICdhbmNob3JQb2ludCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIFVJVHJhbnNmb3JtIGFuY2hvclBvaW50IC0gc2V0IGFuY2hvclggYW5kIGFuY2hvclkgc2VwYXJhdGVseVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhbmNob3JYID0gTnVtYmVyKHZhbHVlLngpIHx8IDAuNTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYW5jaG9yWSA9IE51bWJlcih2YWx1ZS55KSB8fCAwLjU7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgYW5jaG9yWCBmaXJzdFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IGBfX2NvbXBzX18uJHtyYXdDb21wb25lbnRJbmRleH0uYW5jaG9yWGAsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IHZhbHVlOiBhbmNob3JYIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBUaGVuIHNldCBhbmNob3JZICBcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBgX19jb21wc19fLiR7cmF3Q29tcG9uZW50SW5kZXh9LmFuY2hvcllgLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZTogYW5jaG9yWSB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlUeXBlID09PSAnY29sb3InICYmIHByb2Nlc3NlZFZhbHVlICYmIHR5cGVvZiBwcm9jZXNzZWRWYWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g54m55q6K5aSE55CG6aKc6Imy5bGe5oCn77yM56Gu5L+dUkdCQeWAvOato+ehrlxuICAgICAgICAgICAgICAgICAgICAvLyBDb2NvcyBDcmVhdG9y6aKc6Imy5YC86IyD5Zu05pivMC0yNTVcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29sb3JWYWx1ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHI6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKHByb2Nlc3NlZFZhbHVlLnIpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGc6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKHByb2Nlc3NlZFZhbHVlLmcpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGI6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKHByb2Nlc3NlZFZhbHVlLmIpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGE6IHByb2Nlc3NlZFZhbHVlLmEgIT09IHVuZGVmaW5lZCA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKHByb2Nlc3NlZFZhbHVlLmEpKSkgOiAyNTVcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbQ29tcG9uZW50VG9vbHNdIFNldHRpbmcgY29sb3IgdmFsdWU6YCwgY29sb3JWYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGNvbG9yVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NjLkNvbG9yJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOS/ruWkjSBCdWcgIzIgKFJFUS0yMDI2MDUxMS0yMzQyMTMpOiBib29sZWFuIOWtl+auteW/hemhu+aYvuW8j+W4piB0eXBlOiAnQm9vbGVhbifvvIxcbiAgICAgICAgICAgICAgICAgICAgLy8g5ZCm5YiZIENvY29zIHNldC1wcm9wZXJ0eSBkdW1wIOWPjeW6j+WIl+WMluaKiuWug+W9kyB0cnV0aHkvZmFsc3kg5Lu75oSP5YC877yM5a+86Ie06Z2Z6buYIG5vLW9w44CCXG4gICAgICAgICAgICAgICAgICAgIC8vIOS5i+WJjeWboOS4uui/memHjOayoeaciSBib29sZWFuIOWIhuaUr++8jOiQveWIsOacq+WwviBjYXRjaC1hbGwgKOayoeaciSB0eXBlKe+8jOaJgOS7pSBhY3RpdmUvZW5hYmxlZCDnrYnliIfmjaLlhajpg6jlpLHotKXjgIJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBwcm9jZXNzZWRWYWx1ZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzb2x2ZShjcmVhdGVFcnJvclJlc3BvbnNlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVSUk9SX0NPREVTLklOVkFMSURfUEFSQU1TLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBQcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIG9uICcke2NvbXBvbmVudFR5cGV9JyBleHBlY3RzIGEgYm9vbGVhbiB2YWx1ZSwgZ290ICR7dHlwZW9mIHByb2Nlc3NlZFZhbHVlfTogJHtKU09OLnN0cmluZ2lmeShwcm9jZXNzZWRWYWx1ZSl9YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGNvbXBvbmVudFR5cGUsIHByb3BlcnR5LCBpbnRlbmRlZFR5cGU6ICdib29sZWFuJywgYWN0dWFsVHlwZTogdHlwZW9mIHByb2Nlc3NlZFZhbHVlIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJvcGVydHlQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwcm9jZXNzZWRWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnQm9vbGVhbidcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICd2ZWMzJyAmJiBwcm9jZXNzZWRWYWx1ZSAmJiB0eXBlb2YgcHJvY2Vzc2VkVmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOeJueauiuWkhOeQhlZlYzPlsZ7mgKdcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmVjM1ZhbHVlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgeDogTnVtYmVyKHByb2Nlc3NlZFZhbHVlLngpIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiBOdW1iZXIocHJvY2Vzc2VkVmFsdWUueSkgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHo6IE51bWJlcihwcm9jZXNzZWRWYWx1ZS56KSB8fCAwXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZlYzNWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2MuVmVjMydcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICd2ZWMyJyAmJiBwcm9jZXNzZWRWYWx1ZSAmJiB0eXBlb2YgcHJvY2Vzc2VkVmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOeJueauiuWkhOeQhlZlYzLlsZ7mgKdcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmVjMlZhbHVlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgeDogTnVtYmVyKHByb2Nlc3NlZFZhbHVlLngpIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiBOdW1iZXIocHJvY2Vzc2VkVmFsdWUueSkgfHwgMFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcm9wZXJ0eVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2ZWMyVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NjLlZlYzInXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlUeXBlID09PSAnc2l6ZScgJiYgcHJvY2Vzc2VkVmFsdWUgJiYgdHlwZW9mIHByb2Nlc3NlZFZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyDnibnmrorlpITnkIZTaXpl5bGe5oCnXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNpemVWYWx1ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBOdW1iZXIocHJvY2Vzc2VkVmFsdWUud2lkdGgpIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IE51bWJlcihwcm9jZXNzZWRWYWx1ZS5oZWlnaHQpIHx8IDBcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJvcGVydHlQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogc2l6ZVZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYy5TaXplJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ25vZGUnICYmIHByb2Nlc3NlZFZhbHVlICYmIHR5cGVvZiBwcm9jZXNzZWRWYWx1ZSA9PT0gJ29iamVjdCcgJiYgJ3V1aWQnIGluIHByb2Nlc3NlZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOeJueauiuWkhOeQhuiKgueCueW8leeUqFxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBTZXR0aW5nIG5vZGUgcmVmZXJlbmNlIHdpdGggVVVJRDogJHtwcm9jZXNzZWRWYWx1ZS51dWlkfWApO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHByb2Nlc3NlZFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYy5Ob2RlJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ2NvbXBvbmVudCcgJiYgdHlwZW9mIHByb2Nlc3NlZFZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAvLyDnibnmrorlpITnkIbnu4Tku7blvJXnlKjvvJrpgJrov4foioLngrlVVUlE5om+5Yiw57uE5Lu255qEX19pZF9fXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldE5vZGVVdWlkID0gcHJvY2Vzc2VkVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbQ29tcG9uZW50VG9vbHNdIFNldHRpbmcgY29tcG9uZW50IHJlZmVyZW5jZSAtIGZpbmRpbmcgY29tcG9uZW50IG9uIG5vZGU6ICR7dGFyZ2V0Tm9kZVV1aWR9YCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyDku47lvZPliY3nu4Tku7bnmoTlsZ7mgKflhYPmlbDmja7kuK3ojrflj5bmnJ/mnJvnmoTnu4Tku7bnsbvlnotcbiAgICAgICAgICAgICAgICAgICAgbGV0IGV4cGVjdGVkQ29tcG9uZW50VHlwZSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8g6I635Y+W5b2T5YmN57uE5Lu255qE6K+m57uG5L+h5oGv77yM5YyF5ous5bGe5oCn5YWD5pWw5o2uXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRDb21wb25lbnRJbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRJbmZvKG5vZGVVdWlkLCBjb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRDb21wb25lbnRJbmZvLnN1Y2Nlc3MgJiYgY3VycmVudENvbXBvbmVudEluZm8uZGF0YT8ucHJvcGVydGllcz8uW3Byb3BlcnR5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcGVydHlNZXRhID0gY3VycmVudENvbXBvbmVudEluZm8uZGF0YS5wcm9wZXJ0aWVzW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5LuO5bGe5oCn5YWD5pWw5o2u5Lit5o+Q5Y+W57uE5Lu257G75Z6L5L+h5oGvXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydHlNZXRhICYmIHR5cGVvZiBwcm9wZXJ0eU1ldGEgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5pyJdHlwZeWtl+auteaMh+ekuue7hOS7tuexu+Wei1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eU1ldGEudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZENvbXBvbmVudFR5cGUgPSBwcm9wZXJ0eU1ldGEudHlwZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5TWV0YS5jdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOacieS6m+WxnuaAp+WPr+iDveS9v+eUqGN0b3LlrZfmrrVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWRDb21wb25lbnRUeXBlID0gcHJvcGVydHlNZXRhLmN0b3I7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eU1ldGEuZXh0ZW5kcyAmJiBBcnJheS5pc0FycmF5KHByb3BlcnR5TWV0YS5leHRlbmRzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6VleHRlbmRz5pWw57uE77yM6YCa5bi456ys5LiA5Liq5piv5pyA5YW35L2T55qE57G75Z6LXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZXh0ZW5kVHlwZSBvZiBwcm9wZXJ0eU1ldGEuZXh0ZW5kcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4dGVuZFR5cGUuc3RhcnRzV2l0aCgnY2MuJykgJiYgZXh0ZW5kVHlwZSAhPT0gJ2NjLkNvbXBvbmVudCcgJiYgZXh0ZW5kVHlwZSAhPT0gJ2NjLk9iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZENvbXBvbmVudFR5cGUgPSBleHRlbmRUeXBlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIWV4cGVjdGVkQ29tcG9uZW50VHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmFibGUgdG8gZGV0ZXJtaW5lIHJlcXVpcmVkIGNvbXBvbmVudCB0eXBlIGZvciBwcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIG9uIGNvbXBvbmVudCAnJHtjb21wb25lbnRUeXBlfScuIFByb3BlcnR5IG1ldGFkYXRhIG1heSBub3QgY29udGFpbiB0eXBlIGluZm9ybWF0aW9uLmApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBEZXRlY3RlZCByZXF1aXJlZCBjb21wb25lbnQgdHlwZTogJHtleHBlY3RlZENvbXBvbmVudFR5cGV9IGZvciBwcm9wZXJ0eTogJHtwcm9wZXJ0eX1gKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDojrflj5bnm67moIfoioLngrnnmoTnu4Tku7bkv6Hmga9cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldE5vZGVEYXRhID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIHRhcmdldE5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0Tm9kZURhdGEgfHwgIXRhcmdldE5vZGVEYXRhLl9fY29tcHNfXykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVGFyZ2V0IG5vZGUgJHt0YXJnZXROb2RlVXVpZH0gbm90IGZvdW5kIG9yIGhhcyBubyBjb21wb25lbnRzYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOaJk+WNsOebruagh+iKgueCueeahOe7hOS7tuamguiniFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gVGFyZ2V0IG5vZGUgJHt0YXJnZXROb2RlVXVpZH0gaGFzICR7dGFyZ2V0Tm9kZURhdGEuX19jb21wc19fLmxlbmd0aH0gY29tcG9uZW50czpgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldE5vZGVEYXRhLl9fY29tcHNfXy5mb3JFYWNoKChjb21wOiBhbnksIGluZGV4OiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzY2VuZUlkID0gY29tcC52YWx1ZSAmJiBjb21wLnZhbHVlLnV1aWQgJiYgY29tcC52YWx1ZS51dWlkLnZhbHVlID8gY29tcC52YWx1ZS51dWlkLnZhbHVlIDogJ3Vua25vd24nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbQ29tcG9uZW50VG9vbHNdIENvbXBvbmVudCAke2luZGV4fTogJHtjb21wLnR5cGV9IChzY2VuZV9pZDogJHtzY2VuZUlkfSlgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDmn6Xmib7lr7nlupTnmoTnu4Tku7ZcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0YXJnZXRDb21wb25lbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvbXBvbmVudElkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5Zyo55uu5qCH6IqC54K555qEX2NvbXBvbmVudHPmlbDnu4TkuK3mn6Xmib7mjIflrprnsbvlnovnmoTnu4Tku7ZcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOazqOaEj++8ml9fY29tcHNfX+WSjF9jb21wb25lbnRz55qE57Si5byV5piv5a+55bqU55qEXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBTZWFyY2hpbmcgZm9yIGNvbXBvbmVudCB0eXBlOiAke2V4cGVjdGVkQ29tcG9uZW50VHlwZX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0YXJnZXROb2RlRGF0YS5fX2NvbXBzX18ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wID0gdGFyZ2V0Tm9kZURhdGEuX19jb21wc19fW2ldIGFzIGFueTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBDaGVja2luZyBjb21wb25lbnQgJHtpfTogdHlwZT0ke2NvbXAudHlwZX0sIHRhcmdldD0ke2V4cGVjdGVkQ29tcG9uZW50VHlwZX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29tcC50eXBlID09PSBleHBlY3RlZENvbXBvbmVudFR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0Q29tcG9uZW50ID0gY29tcDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gRm91bmQgbWF0Y2hpbmcgY29tcG9uZW50IGF0IGluZGV4ICR7aX06ICR7Y29tcC50eXBlfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5LuO57uE5Lu255qEdmFsdWUudXVpZC52YWx1ZeS4reiOt+WPlue7hOS7tuWcqOWcuuaZr+S4reeahElEXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wLnZhbHVlICYmIGNvbXAudmFsdWUudXVpZCAmJiBjb21wLnZhbHVlLnV1aWQudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudElkID0gY29tcC52YWx1ZS51dWlkLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gR290IGNvbXBvbmVudElkIGZyb20gY29tcC52YWx1ZS51dWlkLnZhbHVlOiAke2NvbXBvbmVudElkfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gQ29tcG9uZW50IHN0cnVjdHVyZTpgLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzVmFsdWU6ICEhY29tcC52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNVdWlkOiAhIShjb21wLnZhbHVlICYmIGNvbXAudmFsdWUudXVpZCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzVXVpZFZhbHVlOiAhIShjb21wLnZhbHVlICYmIGNvbXAudmFsdWUudXVpZCAmJiBjb21wLnZhbHVlLnV1aWQudmFsdWUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV1aWRTdHJ1Y3R1cmU6IGNvbXAudmFsdWUgPyBjb21wLnZhbHVlLnV1aWQgOiAnTm8gdmFsdWUnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIGV4dHJhY3QgY29tcG9uZW50IElEIGZyb20gY29tcG9uZW50IHN0cnVjdHVyZWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0Q29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5rKh5om+5Yiw77yM5YiX5Ye65Y+v55So57uE5Lu26K6p55So5oi35LqG6Kej77yM5pi+56S65Zy65pmv5Lit55qE55yf5a6eSURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdmFpbGFibGVDb21wb25lbnRzID0gdGFyZ2V0Tm9kZURhdGEuX19jb21wc19fLm1hcCgoY29tcDogYW55LCBpbmRleDogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzY2VuZUlkID0gJ3Vua25vd24nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDku47nu4Tku7bnmoR2YWx1ZS51dWlkLnZhbHVl6I635Y+W5Zy65pmvSURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXAudmFsdWUgJiYgY29tcC52YWx1ZS51dWlkICYmIGNvbXAudmFsdWUudXVpZC52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmVJZCA9IGNvbXAudmFsdWUudXVpZC52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYCR7Y29tcC50eXBlfShzY2VuZV9pZDoke3NjZW5lSWR9KWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb21wb25lbnQgdHlwZSAnJHtleHBlY3RlZENvbXBvbmVudFR5cGV9JyBub3QgZm91bmQgb24gbm9kZSAke3RhcmdldE5vZGVVdWlkfS4gQXZhaWxhYmxlIGNvbXBvbmVudHM6ICR7YXZhaWxhYmxlQ29tcG9uZW50cy5qb2luKCcsICcpfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBGb3VuZCBjb21wb25lbnQgJHtleHBlY3RlZENvbXBvbmVudFR5cGV9IHdpdGggc2NlbmUgSUQ6ICR7Y29tcG9uZW50SWR9IG9uIG5vZGUgJHt0YXJnZXROb2RlVXVpZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5pu05paw5pyf5pyb5YC85Li65a6e6ZmF55qE57uE5Lu2SUTlr7nosaHmoLzlvI/vvIznlKjkuo7lkI7nu63pqozor4FcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnRJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdHVhbEV4cGVjdGVkVmFsdWUgPSB7IHV1aWQ6IGNvbXBvbmVudElkIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWwneivleS9v+eUqOS4juiKgueCuS/otYTmupDlvJXnlKjnm7jlkIznmoTmoLzlvI/vvJp7dXVpZDogY29tcG9uZW50SWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDmtYvor5XnnIvmmK/lkKbog73mraPnoa7orr7nva7nu4Tku7blvJXnlKhcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcm9wZXJ0eVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHsgdXVpZDogY29tcG9uZW50SWQgfSwgIC8vIOS9v+eUqOWvueixoeagvOW8j++8jOWDj+iKgueCuS/otYTmupDlvJXnlKjkuIDmoLdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogZXhwZWN0ZWRDb21wb25lbnRUeXBlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFtDb21wb25lbnRUb29sc10gRXJyb3Igc2V0dGluZyBjb21wb25lbnQgcmVmZXJlbmNlOmAsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdub2RlQXJyYXknICYmIEFycmF5LmlzQXJyYXkocHJvY2Vzc2VkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOeJueauiuWkhOeQhuiKgueCueaVsOe7hCAtIOS/neaMgemihOWkhOeQhueahOagvOW8j1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBTZXR0aW5nIG5vZGUgYXJyYXk6YCwgcHJvY2Vzc2VkVmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcm9wZXJ0eVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwcm9jZXNzZWRWYWx1ZSAgLy8g5L+d5oyBIFt7dXVpZDogXCIuLi5cIn0sIHt1dWlkOiBcIi4uLlwifV0g5qC85byPXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlUeXBlID09PSAnY29sb3JBcnJheScgJiYgQXJyYXkuaXNBcnJheShwcm9jZXNzZWRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g54m55q6K5aSE55CG6aKc6Imy5pWw57uEXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbG9yQXJyYXlWYWx1ZSA9IHByb2Nlc3NlZFZhbHVlLm1hcCgoaXRlbTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSAmJiB0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCcgJiYgJ3InIGluIGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLnIpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZzogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaXRlbS5nKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGI6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGl0ZW0uYikgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhOiBpdGVtLmEgIT09IHVuZGVmaW5lZCA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGl0ZW0uYSkpKSA6IDI1NVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHI6IDI1NSwgZzogMjU1LCBiOiAyNTUsIGE6IDI1NSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJvcGVydHlQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogY29sb3JBcnJheVZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYy5Db2xvcidcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTm9ybWFsIHByb3BlcnR5IHNldHRpbmcgZm9yIG5vbi1hc3NldCBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJvcGVydHlQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZTogcHJvY2Vzc2VkVmFsdWUgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU3RlcCA1OiDnrYnlvoVFZGl0b3LlrozmiJDmm7TmlrDvvIznhLblkI7pqozor4Horr7nva7nu5PmnpxcbiAgICAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMjAwKSk7IC8vIOetieW+hTIwMG1z6K6pRWRpdG9y5a6M5oiQ5pu05pawXG5cbiAgICAgICAgICAgICAgICBjb25zdCB2ZXJpZmljYXRpb24gPSBhd2FpdCB0aGlzLnZlcmlmeVByb3BlcnR5Q2hhbmdlKG5vZGVVdWlkLCBjb21wb25lbnRUeXBlLCBwcm9wZXJ0eSwgb3JpZ2luYWxWYWx1ZSwgYWN0dWFsRXhwZWN0ZWRWYWx1ZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBVWC0xIOS/ruWkjSAoUkVRLTIwMjYwNTExLTIzNDIxMyk6IOmdmem7mOaIkOWKn+agueWboCDigJQg5aaC5p6cIGNvY29zIOaOpeWPl+S6hiBzZXQtcHJvcGVydHkg6LCD55So5L2G5a6e6ZmF5YC85rKh5Y+Y77yI5YW45Z6L5aaCIEJ1ZyAjMiDnmoQgYm9vbGVhbu+8ie+8jFxuICAgICAgICAgICAgICAgIC8vIOW/hemhu+i/lCBzdWNjZXNzOiBmYWxzZSDogIzpnZ7ml6fnmoRcIuaXoOiuuiB2ZXJpZmllZCDnnJ/lgYfpg73ov5QgdHJ1ZVwi44CCY2FsbGVyIOWHreatpOaJjeiDveefpemBkyBzaWxlbnQgbm8tb3DjgIJcbiAgICAgICAgICAgICAgICBpZiAoIXZlcmlmaWNhdGlvbi52ZXJpZmllZCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGNyZWF0ZUVycm9yUmVzcG9uc2UoXG4gICAgICAgICAgICAgICAgICAgICAgICBFUlJPUl9DT0RFUy5FRElUT1JfQVBJX0VSUk9SLFxuICAgICAgICAgICAgICAgICAgICAgICAgYHNldCAke2NvbXBvbmVudFR5cGV9LiR7cHJvcGVydHl9IGFwcGVhcnMgdG8gaGF2ZSBzaWxlbnRseSBuby1vcCdkIOKAlCBjb2NvcyBhY2NlcHRlZCB0aGUgY2FsbCBidXQgcG9zdC1zZXQgdmFsdWUgZGlkIG5vdCBtYXRjaCBpbnRlbmRlZC5gLFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludGVuZGVkOiBhY3R1YWxFeHBlY3RlZFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlZm9yZTogb3JpZ2luYWxWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3R1YWw6IHZlcmlmaWNhdGlvbi5hY3R1YWxWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWdnZXN0aW9uOiBwcm9wZXJ0eVR5cGUgPT09ICdib29sZWFuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/ICdWZXJpZnkgdGhlIHByb3BlcnR5IGlzIGFjdHVhbGx5IGJvb2xlYW4gb24gdGhpcyBjb21wb25lbnQ7IGNvY29zIG1heSBuZWVkIGEgZGlmZmVyZW50IHByb3BlcnR5VHlwZS4nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogJ0NoZWNrIHRoYXQgcHJvcGVydHlUeXBlIG1hdGNoZXMgdGhlIGFjdHVhbCBmaWVsZCB0eXBlLCBhbmQgdGhhdCB0aGUgdmFsdWUgc2hhcGUgaXMgY29ycmVjdC4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBTdWNjZXNzZnVsbHkgc2V0ICR7Y29tcG9uZW50VHlwZX0uJHtwcm9wZXJ0eX1gLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdHVhbFZhbHVlOiB2ZXJpZmljYXRpb24uYWN0dWFsVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VkOiBKU09OLnN0cmluZ2lmeShvcmlnaW5hbFZhbHVlKSAhPT0gSlNPTi5zdHJpbmdpZnkodmVyaWZpY2F0aW9uLmFjdHVhbFZhbHVlKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBbQ29tcG9uZW50VG9vbHNdIEVycm9yIHNldHRpbmcgcHJvcGVydHk6YCwgZXJyb3IpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoY3JlYXRlRXJyb3JSZXNwb25zZShcbiAgICAgICAgICAgICAgICAgICAgRVJST1JfQ09ERVMuRURJVE9SX0FQSV9FUlJPUixcbiAgICAgICAgICAgICAgICAgICAgYEZhaWxlZCB0byBzZXQgcHJvcGVydHkgJHtjb21wb25lbnRUeXBlfS4ke3Byb3BlcnR5fTogJHtlcnJvci5tZXNzYWdlfWAsXG4gICAgICAgICAgICAgICAgICAgIHsgbm9kZVV1aWQsIGNvbXBvbmVudFR5cGUsIHByb3BlcnR5LCBwcm9wZXJ0eVR5cGUgfVxuICAgICAgICAgICAgICAgICkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCYXRjaC1zZXQgTiBwcm9wZXJ0aWVzIG9uIHRoZSBzYW1lIChub2RlVXVpZCwgY29tcG9uZW50VHlwZSkuXG4gICAgICogSW50ZXJuYWxseSBjYWxscyBzZXRDb21wb25lbnRQcm9wZXJ0eSBmb3IgZWFjaCBlbnRyeSBzZXJpYWxseS5cbiAgICAgKiBJbmRpdmlkdWFsIGZhaWx1cmVzIGRvIE5PVCBhYm9ydCB0aGUgYmF0Y2gg4oCUIHRoZXkgYXJlIGNvbGxlY3RlZCBpbnRvIGBmYWlsZWRbXWAuXG4gICAgICogUmV0dXJucyBzdWNjZXNzPXRydWUgaWYgYXQgbGVhc3Qgb25lIHByb3BlcnR5IGFwcGxpZWQ7IHN1Y2Nlc3M9ZmFsc2UgaWYgQUxMIGZhaWxlZC5cbiAgICAgKi9cbiAgICBwcml2YXRlIGFzeW5jIGJhdGNoU2V0UHJvcGVydGllcyhhcmdzOiB7XG4gICAgICAgIG5vZGVVdWlkOiBzdHJpbmc7XG4gICAgICAgIGNvbXBvbmVudFR5cGU6IHN0cmluZztcbiAgICAgICAgcHJvcGVydGllczogQXJyYXk8eyBwcm9wZXJ0eTogc3RyaW5nOyBwcm9wZXJ0eVR5cGU6IHN0cmluZzsgdmFsdWU6IGFueSB9PjtcbiAgICB9KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgeyBub2RlVXVpZCwgY29tcG9uZW50VHlwZSwgcHJvcGVydGllcyB9ID0gYXJncztcblxuICAgICAgICBpZiAoIW5vZGVVdWlkIHx8IHR5cGVvZiBub2RlVXVpZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKFxuICAgICAgICAgICAgICAgIEVSUk9SX0NPREVTLklOVkFMSURfUEFSQU1TLFxuICAgICAgICAgICAgICAgICdub2RlVXVpZCBtdXN0IGJlIGEgbm9uLWVtcHR5IHN0cmluZycsXG4gICAgICAgICAgICAgICAgeyBzdWdnZXN0aW9uOiAnVXNlIGdldF9hbGxfbm9kZXMgb3IgZmluZF9ub2RlX2J5X25hbWUgdG8gb2J0YWluIHRoZSBVVUlEJyB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIC8vIFNoYXBlIGNoZWNrIGZvciBvYnZpb3VzIGdhcmJhZ2UgKFAyLkMgZml4IOKAlCBjb25zaXN0ZW50IHdpdGggVUlUb29scykuXG4gICAgICAgIGlmICghL15bQS1aYS16MC05Ky89X1xcLV17OCx9JC8udGVzdChub2RlVXVpZCkpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKFxuICAgICAgICAgICAgICAgIEVSUk9SX0NPREVTLklOVkFMSURfUEFSQU1TLFxuICAgICAgICAgICAgICAgIGBub2RlVXVpZCBcIiR7bm9kZVV1aWR9XCIgZG9lcyBub3QgbG9vayBsaWtlIGEgdmFsaWQgQ29jb3MgVVVJRGAsXG4gICAgICAgICAgICAgICAgeyBzdWdnZXN0aW9uOiAnVVVJRCBtdXN0IGJlIGF0IGxlYXN0IDggY2hhcnMsIGFscGhhbnVtZXJpYyArIFsrLz1fLV0uJyB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY29tcG9uZW50VHlwZSB8fCB0eXBlb2YgY29tcG9uZW50VHlwZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKFxuICAgICAgICAgICAgICAgIEVSUk9SX0NPREVTLklOVkFMSURfUEFSQU1TLFxuICAgICAgICAgICAgICAgICdjb21wb25lbnRUeXBlIG11c3QgYmUgYSBub24tZW1wdHkgc3RyaW5nJyxcbiAgICAgICAgICAgICAgICB7IHN1Z2dlc3Rpb246ICdFLmcuIFwiY2MuTGFiZWxcIiwgXCJjYy5TcHJpdGVcIiwgXCJjYy5MYXlvdXRcIicgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkocHJvcGVydGllcykgfHwgcHJvcGVydGllcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKFxuICAgICAgICAgICAgICAgIEVSUk9SX0NPREVTLklOVkFMSURfUEFSQU1TLFxuICAgICAgICAgICAgICAgICdwcm9wZXJ0aWVzIG11c3QgYmUgYSBub24tZW1wdHkgYXJyYXknLFxuICAgICAgICAgICAgICAgIHsgc3VnZ2VzdGlvbjogJ0VhY2ggZW50cnk6IHsgcHJvcGVydHk6IHN0cmluZywgcHJvcGVydHlUeXBlOiBzdHJpbmcsIHZhbHVlOiBhbnkgfScgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN1Y2NlZWRlZDogQXJyYXk8eyBwcm9wZXJ0eTogc3RyaW5nIH0+ID0gW107XG4gICAgICAgIGNvbnN0IGZhaWxlZDogQXJyYXk8eyBwcm9wZXJ0eTogc3RyaW5nOyBlcnJvcjogc3RyaW5nOyBlcnJvckNvZGU/OiBzdHJpbmcgfT4gPSBbXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIGlmICghZW50cnkgfHwgdHlwZW9mIGVudHJ5LnByb3BlcnR5ICE9PSAnc3RyaW5nJyB8fCB0eXBlb2YgZW50cnkucHJvcGVydHlUeXBlICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGZhaWxlZC5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IGVudHJ5Py5wcm9wZXJ0eSA/PyAnPG1pc3Npbmc+JyxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6ICdlbnRyeSBtaXNzaW5nIHByb3BlcnR5L3Byb3BlcnR5VHlwZScsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yQ29kZTogRVJST1JfQ09ERVMuSU5WQUxJRF9QQVJBTVNcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuc2V0Q29tcG9uZW50UHJvcGVydHkoe1xuICAgICAgICAgICAgICAgIG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICAgICAgcHJvcGVydHk6IGVudHJ5LnByb3BlcnR5LFxuICAgICAgICAgICAgICAgIHByb3BlcnR5VHlwZTogZW50cnkucHJvcGVydHlUeXBlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBlbnRyeS52YWx1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBzdWNjZWVkZWQucHVzaCh7IHByb3BlcnR5OiBlbnRyeS5wcm9wZXJ0eSB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZmFpbGVkLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogZW50cnkucHJvcGVydHksXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiByZXN1bHQuZXJyb3IgfHwgJ3Vua25vd24nLFxuICAgICAgICAgICAgICAgICAgICBlcnJvckNvZGU6IHJlc3VsdC5lcnJvckNvZGUgfHwgRVJST1JfQ09ERVMuVU5LTk9XTlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYWxsRmFpbGVkID0gc3VjY2VlZGVkLmxlbmd0aCA9PT0gMCAmJiBmYWlsZWQubGVuZ3RoID4gMDtcbiAgICAgICAgaWYgKGFsbEZhaWxlZCkge1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoXG4gICAgICAgICAgICAgICAgRVJST1JfQ09ERVMuRURJVE9SX0FQSV9FUlJPUixcbiAgICAgICAgICAgICAgICBgQWxsICR7ZmFpbGVkLmxlbmd0aH0gcHJvcGVydHkgd3JpdGUocykgZmFpbGVkIG9uICR7Y29tcG9uZW50VHlwZX1gLFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZmFpbGVkLFxuICAgICAgICAgICAgICAgICAgICBzdWdnZXN0aW9uOiBgVmVyaWZ5IGNvbXBvbmVudFR5cGUgZXhpc3RzIG9uIHRoZSBub2RlICh0cnkgZ2V0X2NvbXBvbmVudHMgZmlyc3QpIGFuZCBwcm9wZXJ0eSBuYW1lcyBhcmUgY29ycmVjdC4gSWYgdGhlIGNvbXBvbmVudCBpcyBub3QgYXR0YWNoZWQsIHJ1biBjb21wb25lbnRfYWRkX2NvbXBvbmVudCh7IG5vZGVVdWlkLCBjb21wb25lbnRUeXBlOiAnJHtjb21wb25lbnRUeXBlfScgfSkgYmVmb3JlIGJhdGNoX3NldF9wcm9wZXJ0aWVzLmBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICAgICAgc3VjY2VlZGVkQ291bnQ6IHN1Y2NlZWRlZC5sZW5ndGgsXG4gICAgICAgICAgICAgICAgZmFpbGVkQ291bnQ6IGZhaWxlZC5sZW5ndGgsXG4gICAgICAgICAgICAgICAgc3VjY2VlZGVkLFxuICAgICAgICAgICAgICAgIGZhaWxlZFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC4uLihmYWlsZWQubGVuZ3RoID4gMCA/IHsgd2FybmluZzogYCR7ZmFpbGVkLmxlbmd0aH0gb2YgJHtwcm9wZXJ0aWVzLmxlbmd0aH0gcHJvcGVydGllcyBmYWlsZWQg4oCUIHNlZSBkYXRhLmZhaWxlZGAgfSA6IHt9KVxuICAgICAgICB9O1xuICAgIH1cblxuXG4gICAgcHJpdmF0ZSBhc3luYyBhdHRhY2hTY3JpcHQobm9kZVV1aWQ6IHN0cmluZywgc2NyaXB0UGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAvLyDku47ohJrmnKzot6/lvoTmj5Dlj5bnu4Tku7bnsbvlkI1cbiAgICAgICAgICAgIGNvbnN0IHNjcmlwdE5hbWUgPSBzY3JpcHRQYXRoLnNwbGl0KCcvJykucG9wKCk/LnJlcGxhY2UoJy50cycsICcnKS5yZXBsYWNlKCcuanMnLCAnJyk7XG4gICAgICAgICAgICBpZiAoIXNjcmlwdE5hbWUpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGNyZWF0ZUVycm9yUmVzcG9uc2UoRVJST1JfQ09ERVMuSU5WQUxJRF9QQVJBTVMsICdJbnZhbGlkIHNjcmlwdCBwYXRoJywgeyBzY3JpcHRQYXRoIH0pKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyDlhYjmn6Xmib7oioLngrnkuIrmmK/lkKblt7LlrZjlnKjor6XohJrmnKznu4Tku7bvvIjmjIkgc2NyaXB0TmFtZSDljLnphY3vvJvoh6rlrprkuYnohJrmnKwgdHlwZSDmmK8gY2lk77yM5omA5Lul6L+Z6YeM5YW25a6e5Y+q6IO95ZG95LitXCLlt7Lnn6UgY2lkIOKGkiBzY3JpcHROYW1lXCLnibnmrormg4XlhrXvvIlcbiAgICAgICAgICAgIGNvbnN0IGFsbENvbXBvbmVudHNJbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmIChhbGxDb21wb25lbnRzSW5mby5zdWNjZXNzICYmIGFsbENvbXBvbmVudHNJbmZvLmRhdGE/LmNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBleGlzdGluZ1NjcmlwdCA9IGFsbENvbXBvbmVudHNJbmZvLmRhdGEuY29tcG9uZW50cy5maW5kKChjb21wOiBhbnkpID0+IGNvbXAudHlwZSA9PT0gc2NyaXB0TmFtZSk7XG4gICAgICAgICAgICAgICAgaWYgKGV4aXN0aW5nU2NyaXB0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBTY3JpcHQgJyR7c2NyaXB0TmFtZX0nIGFscmVhZHkgZXhpc3RzIG9uIG5vZGVgLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnROYW1lOiBzY3JpcHROYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4aXN0aW5nOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQnVnICMzIOS/ruWkjSAoUkVRLTIwMjYwNTExLTIzNDIxMyk6IOiusOW9lSBhdHRhY2gg5YmN57uE5Lu25pWw6YeP77yM5L2c5Li6IHZlcmlmeSDln7rnur9cbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudHNCZWZvcmU6IGFueVtdID0gYWxsQ29tcG9uZW50c0luZm8uc3VjY2VzcyA/IGFsbENvbXBvbmVudHNJbmZvLmRhdGE/LmNvbXBvbmVudHMgfHwgW10gOiBbXTtcbiAgICAgICAgICAgIGNvbnN0IGNvdW50QmVmb3JlID0gY29tcG9uZW50c0JlZm9yZS5sZW5ndGg7XG4gICAgICAgICAgICBjb25zdCBjaWRzQmVmb3JlID0gbmV3IFNldChjb21wb25lbnRzQmVmb3JlLm1hcCgoYzogYW55KSA9PiBjLnR5cGUpKTtcblxuICAgICAgICAgICAgLy8g6aaW5YWI5bCd6K+V55u05o6l5L2/55So6ISa5pys5ZCN56ew5L2c5Li657uE5Lu257G75Z6LXG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdjcmVhdGUtY29tcG9uZW50Jywge1xuICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgIGNvbXBvbmVudDogc2NyaXB0TmFtZSAgLy8g5L2/55So6ISa5pys5ZCN56ew6ICM6Z2eVVVJRFxuICAgICAgICAgICAgfSkudGhlbihhc3luYyAocmVzdWx0OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAvLyDnrYnlvoXkuIDmrrXml7bpl7TorqlFZGl0b3LlrozmiJDnu4Tku7bmt7vliqBcbiAgICAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwKSk7XG4gICAgICAgICAgICAgICAgLy8g6YeN5paw5p+l6K+i6IqC54K55L+h5oGv6aqM6K+B6ISa5pys5piv5ZCm55yf55qE5re75Yqg5oiQ5YqfXG4gICAgICAgICAgICAgICAgY29uc3QgYWxsQ29tcG9uZW50c0luZm8yID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICBpZiAoYWxsQ29tcG9uZW50c0luZm8yLnN1Y2Nlc3MgJiYgYWxsQ29tcG9uZW50c0luZm8yLmRhdGE/LmNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcG9uZW50c0FmdGVyID0gYWxsQ29tcG9uZW50c0luZm8yLmRhdGEuY29tcG9uZW50cztcbiAgICAgICAgICAgICAgICAgICAgLy8gQnVnICMzIOS/ruWkjTog5pS555So57uE5Lu25pWw6YeP5aKe6YeP5Yik5patIOKAlCDoh6rlrprkuYnohJrmnKznmoQgY29tcC50eXBlIOaYryBjaWQgaGFzaO+8jFxuICAgICAgICAgICAgICAgICAgICAvLyDkuI3lj6/og73nrYnkuo4gc2NyaXB0TmFtZe+8jOaJgOS7peWOn+adpeeahCBmaW5kKGMgPT4gYy50eXBlID09PSBzY3JpcHROYW1lKSDmsLjov5wgZmFsc2XjgIJcbiAgICAgICAgICAgICAgICAgICAgLy8g5pS55Li65p+lXCLmlrDlop7kuoblk6rkupsgY2lkXCLvvIznrKzkuIDkuKrpnZ7ml6cgY2lkIOeahOWwseaYr+aWsOWKoOeahOiEmuacrOOAglxuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdDaWRzID0gY29tcG9uZW50c0FmdGVyLmZpbHRlcigoYzogYW55KSA9PiAhY2lkc0JlZm9yZS5oYXMoYy50eXBlKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnRzQWZ0ZXIubGVuZ3RoID49IGNvdW50QmVmb3JlICsgMSAmJiBuZXdDaWRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFNjcmlwdCAnJHtzY3JpcHROYW1lfScgYXR0YWNoZWQgc3VjY2Vzc2Z1bGx5IChuZXcgY2lkOiAke25ld0NpZHNbMF0udHlwZX0pYCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50TmFtZTogc2NyaXB0TmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Q29tcG9uZW50Q2lkOiBuZXdDaWRzWzBdLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0NvbXBvbmVudFV1aWQ6IG5ld0NpZHNbMF0udXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhpc3Rpbmc6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGNyZWF0ZUVycm9yUmVzcG9uc2UoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRVJST1JfQ09ERVMuRURJVE9SX0FQSV9FUlJPUixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBgU2NyaXB0ICcke3NjcmlwdE5hbWV9JyBhdHRhY2ggd2FzIGFjY2VwdGVkIGJ5IENvY29zIGJ1dCBjb21wb25lbnQgY291bnQgZGlkIG5vdCBpbmNyZWFzZSAoYmVmb3JlPSR7Y291bnRCZWZvcmV9LCBhZnRlcj0ke2NvbXBvbmVudHNBZnRlci5sZW5ndGh9KS4gVGhlIHNjcmlwdCBtYXkgaGF2ZSBmYWlsZWQgc2lsZW50bHkg4oCUIGNoZWNrIHRoYXQgdGhlIHNjcmlwdCBjbGFzcyBleHRlbmRzIGNjLkNvbXBvbmVudCBhbmQgZXhwb3J0ZWQgY29ycmVjdGx5LmAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBzY3JpcHROYW1lLCBzY3JpcHRQYXRoLCBjb3VudEJlZm9yZSwgY291bnRBZnRlcjogY29tcG9uZW50c0FmdGVyLmxlbmd0aCwgYXZhaWxhYmxlQ2lkczogY29tcG9uZW50c0FmdGVyLm1hcCgoYzogYW55KSA9PiBjLnR5cGUpIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIHZlcmlmeSBzY3JpcHQgYWRkaXRpb246ICR7YWxsQ29tcG9uZW50c0luZm8yLmVycm9yIHx8ICdVbmFibGUgdG8gZ2V0IG5vZGUgY29tcG9uZW50cyd9YFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIC8vIOWkh+eUqOaWueahiO+8muS9v+eUqOWcuuaZr+iEmuacrFxuICAgICAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnYXR0YWNoU2NyaXB0JyxcbiAgICAgICAgICAgICAgICAgICAgYXJnczogW25vZGVVdWlkLCBzY3JpcHRQYXRoXVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCBvcHRpb25zKS50aGVuKChyZXN1bHQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byBhdHRhY2ggc2NyaXB0ICcke3NjcmlwdE5hbWV9JzogJHtlcnIubWVzc2FnZX1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246ICdQbGVhc2UgZW5zdXJlIHRoZSBzY3JpcHQgaXMgcHJvcGVybHkgY29tcGlsZWQgYW5kIGV4cG9ydGVkIGFzIGEgQ29tcG9uZW50IGNsYXNzLiBZb3UgY2FuIGFsc28gbWFudWFsbHkgYXR0YWNoIHRoZSBzY3JpcHQgdGhyb3VnaCB0aGUgUHJvcGVydGllcyBwYW5lbCBpbiB0aGUgZWRpdG9yLidcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRBdmFpbGFibGVDb21wb25lbnRzKGNhdGVnb3J5OiBzdHJpbmcgPSAnYWxsJyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IGNvbXBvbmVudENhdGVnb3JpZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZ1tdPiA9IHtcbiAgICAgICAgICAgIHJlbmRlcmVyOiBbJ2NjLlNwcml0ZScsICdjYy5MYWJlbCcsICdjYy5SaWNoVGV4dCcsICdjYy5NYXNrJywgJ2NjLkdyYXBoaWNzJ10sXG4gICAgICAgICAgICB1aTogWydjYy5CdXR0b24nLCAnY2MuVG9nZ2xlJywgJ2NjLlNsaWRlcicsICdjYy5TY3JvbGxWaWV3JywgJ2NjLkVkaXRCb3gnLCAnY2MuUHJvZ3Jlc3NCYXInXSxcbiAgICAgICAgICAgIHBoeXNpY3M6IFsnY2MuUmlnaWRCb2R5MkQnLCAnY2MuQm94Q29sbGlkZXIyRCcsICdjYy5DaXJjbGVDb2xsaWRlcjJEJywgJ2NjLlBvbHlnb25Db2xsaWRlcjJEJ10sXG4gICAgICAgICAgICBhbmltYXRpb246IFsnY2MuQW5pbWF0aW9uJywgJ2NjLkFuaW1hdGlvbkNsaXAnLCAnY2MuU2tlbGV0YWxBbmltYXRpb24nXSxcbiAgICAgICAgICAgIGF1ZGlvOiBbJ2NjLkF1ZGlvU291cmNlJ10sXG4gICAgICAgICAgICBsYXlvdXQ6IFsnY2MuTGF5b3V0JywgJ2NjLldpZGdldCcsICdjYy5QYWdlVmlldycsICdjYy5QYWdlVmlld0luZGljYXRvciddLFxuICAgICAgICAgICAgZWZmZWN0czogWydjYy5Nb3Rpb25TdHJlYWsnLCAnY2MuUGFydGljbGVTeXN0ZW0yRCddLFxuICAgICAgICAgICAgY2FtZXJhOiBbJ2NjLkNhbWVyYSddLFxuICAgICAgICAgICAgbGlnaHQ6IFsnY2MuTGlnaHQnLCAnY2MuRGlyZWN0aW9uYWxMaWdodCcsICdjYy5Qb2ludExpZ2h0JywgJ2NjLlNwb3RMaWdodCddXG4gICAgICAgIH07XG5cbiAgICAgICAgbGV0IGNvbXBvbmVudHM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIFxuICAgICAgICBpZiAoY2F0ZWdvcnkgPT09ICdhbGwnKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNhdCBpbiBjb21wb25lbnRDYXRlZ29yaWVzKSB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50cyA9IGNvbXBvbmVudHMuY29uY2F0KGNvbXBvbmVudENhdGVnb3JpZXNbY2F0XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY29tcG9uZW50Q2F0ZWdvcmllc1tjYXRlZ29yeV0pIHtcbiAgICAgICAgICAgIGNvbXBvbmVudHMgPSBjb21wb25lbnRDYXRlZ29yaWVzW2NhdGVnb3J5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgICAgICBjb21wb25lbnRzOiBjb21wb25lbnRzXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpc1ZhbGlkUHJvcGVydHlEZXNjcmlwdG9yKHByb3BEYXRhOiBhbnkpOiBib29sZWFuIHtcbiAgICAgICAgLy8g5qOA5p+l5piv5ZCm5piv5pyJ5pWI55qE5bGe5oCn5o+P6L+w5a+56LGhXG4gICAgICAgIGlmICh0eXBlb2YgcHJvcERhdGEgIT09ICdvYmplY3QnIHx8IHByb3BEYXRhID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMocHJvcERhdGEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyDpgb/lhY3pgY3ljobnroDljZXnmoTmlbDlgLzlr7nosaHvvIjlpoIge3dpZHRoOiAyMDAsIGhlaWdodDogMTUwfe+8iVxuICAgICAgICAgICAgY29uc3QgaXNTaW1wbGVWYWx1ZU9iamVjdCA9IGtleXMuZXZlcnkoa2V5ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IHByb3BEYXRhW2tleV07XG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgfHwgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaXNTaW1wbGVWYWx1ZU9iamVjdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5YyF5ZCr5bGe5oCn5o+P6L+w56ym55qE54m55b6B5a2X5q6177yM5LiN5L2/55SoJ2luJ+aTjeS9nOesplxuICAgICAgICAgICAgY29uc3QgaGFzTmFtZSA9IGtleXMuaW5jbHVkZXMoJ25hbWUnKTtcbiAgICAgICAgICAgIGNvbnN0IGhhc1ZhbHVlID0ga2V5cy5pbmNsdWRlcygndmFsdWUnKTtcbiAgICAgICAgICAgIGNvbnN0IGhhc1R5cGUgPSBrZXlzLmluY2x1ZGVzKCd0eXBlJyk7XG4gICAgICAgICAgICBjb25zdCBoYXNEaXNwbGF5TmFtZSA9IGtleXMuaW5jbHVkZXMoJ2Rpc3BsYXlOYW1lJyk7XG4gICAgICAgICAgICBjb25zdCBoYXNSZWFkb25seSA9IGtleXMuaW5jbHVkZXMoJ3JlYWRvbmx5Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIOW/hemhu+WMheWQq25hbWXmiJZ2YWx1ZeWtl+aute+8jOS4lOmAmuW4uOi/mOaciXR5cGXlrZfmrrVcbiAgICAgICAgICAgIGNvbnN0IGhhc1ZhbGlkU3RydWN0dXJlID0gKGhhc05hbWUgfHwgaGFzVmFsdWUpICYmIChoYXNUeXBlIHx8IGhhc0Rpc3BsYXlOYW1lIHx8IGhhc1JlYWRvbmx5KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8g6aKd5aSW5qOA5p+l77ya5aaC5p6c5pyJZGVmYXVsdOWtl+auteS4lOe7k+aehOWkjeadgu+8jOmBv+WFjea3seW6pumBjeWOhlxuICAgICAgICAgICAgaWYgKGtleXMuaW5jbHVkZXMoJ2RlZmF1bHQnKSAmJiBwcm9wRGF0YS5kZWZhdWx0ICYmIHR5cGVvZiBwcm9wRGF0YS5kZWZhdWx0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlZmF1bHRLZXlzID0gT2JqZWN0LmtleXMocHJvcERhdGEuZGVmYXVsdCk7XG4gICAgICAgICAgICAgICAgaWYgKGRlZmF1bHRLZXlzLmluY2x1ZGVzKCd2YWx1ZScpICYmIHR5cGVvZiBwcm9wRGF0YS5kZWZhdWx0LnZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyDov5nnp43mg4XlhrXkuIvvvIzmiJHku6zlj6rov5Tlm57pobblsYLlsZ7mgKfvvIzkuI3mt7HlhaXpgY3ljoZkZWZhdWx0LnZhbHVlXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBoYXNWYWxpZFN0cnVjdHVyZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBoYXNWYWxpZFN0cnVjdHVyZTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgW2lzVmFsaWRQcm9wZXJ0eURlc2NyaXB0b3JdIEVycm9yIGNoZWNraW5nIHByb3BlcnR5IGRlc2NyaXB0b3I6YCwgZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhbmFseXplUHJvcGVydHkoY29tcG9uZW50OiBhbnksIHByb3BlcnR5TmFtZTogc3RyaW5nKTogeyBleGlzdHM6IGJvb2xlYW47IHR5cGU6IHN0cmluZzsgYXZhaWxhYmxlUHJvcGVydGllczogc3RyaW5nW107IG9yaWdpbmFsVmFsdWU6IGFueSB9IHtcbiAgICAgICAgLy8g5LuO5aSN5p2C55qE57uE5Lu257uT5p6E5Lit5o+Q5Y+W5Y+v55So5bGe5oCnXG4gICAgICAgIGNvbnN0IGF2YWlsYWJsZVByb3BlcnRpZXM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGxldCBwcm9wZXJ0eVZhbHVlOiBhbnkgPSB1bmRlZmluZWQ7XG4gICAgICAgIGxldCBwcm9wZXJ0eUV4aXN0cyA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8g5bCd6K+V5aSa56eN5pa55byP5p+l5om+5bGe5oCn77yaXG4gICAgICAgIC8vIDEuIOebtOaOpeWxnuaAp+iuv+mXrlxuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNvbXBvbmVudCwgcHJvcGVydHlOYW1lKSkge1xuICAgICAgICAgICAgcHJvcGVydHlWYWx1ZSA9IGNvbXBvbmVudFtwcm9wZXJ0eU5hbWVdO1xuICAgICAgICAgICAgcHJvcGVydHlFeGlzdHMgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyAyLiDku47ltYzlpZfnu5PmnoTkuK3mn6Xmib4gKOWmguS7jua1i+ivleaVsOaNrueci+WIsOeahOWkjeadgue7k+aehClcbiAgICAgICAgaWYgKCFwcm9wZXJ0eUV4aXN0cyAmJiBjb21wb25lbnQucHJvcGVydGllcyAmJiB0eXBlb2YgY29tcG9uZW50LnByb3BlcnRpZXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAvLyDpppblhYjmo4Dmn6Vwcm9wZXJ0aWVzLnZhbHVl5piv5ZCm5a2Y5Zyo77yI6L+Z5piv5oiR5Lus5ZyoZ2V0Q29tcG9uZW50c+S4reeci+WIsOeahOe7k+aehO+8iVxuICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5wcm9wZXJ0aWVzLnZhbHVlICYmIHR5cGVvZiBjb21wb25lbnQucHJvcGVydGllcy52YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZU9iaiA9IGNvbXBvbmVudC5wcm9wZXJ0aWVzLnZhbHVlO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgW2tleSwgcHJvcERhdGFdIG9mIE9iamVjdC5lbnRyaWVzKHZhbHVlT2JqKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6Vwcm9wRGF0YeaYr+WQpuaYr+S4gOS4quacieaViOeahOWxnuaAp+aPj+i/sOWvueixoVxuICAgICAgICAgICAgICAgICAgICAvLyDnoa7kv51wcm9wRGF0YeaYr+WvueixoeS4lOWMheWQq+mihOacn+eahOWxnuaAp+e7k+aehFxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pc1ZhbGlkUHJvcGVydHlEZXNjcmlwdG9yKHByb3BEYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcEluZm8gPSBwcm9wRGF0YSBhcyBhbnk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVQcm9wZXJ0aWVzLnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXkgPT09IHByb3BlcnR5TmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOS8mOWFiOS9v+eUqHZhbHVl5bGe5oCn77yM5aaC5p6c5rKh5pyJ5YiZ5L2/55SocHJvcERhdGHmnKzouqtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9wS2V5cyA9IE9iamVjdC5rZXlzKHByb3BJbmZvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlWYWx1ZSA9IHByb3BLZXlzLmluY2x1ZGVzKCd2YWx1ZScpID8gcHJvcEluZm8udmFsdWUgOiBwcm9wSW5mbztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzmo4Dmn6XlpLHotKXvvIznm7TmjqXkvb/nlKhwcm9wSW5mb1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVZhbHVlID0gcHJvcEluZm87XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5RXhpc3RzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8g5aSH55So5pa55qGI77ya55u05o6l5LuOcHJvcGVydGllc+afpeaJvlxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgW2tleSwgcHJvcERhdGFdIG9mIE9iamVjdC5lbnRyaWVzKGNvbXBvbmVudC5wcm9wZXJ0aWVzKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pc1ZhbGlkUHJvcGVydHlEZXNjcmlwdG9yKHByb3BEYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcEluZm8gPSBwcm9wRGF0YSBhcyBhbnk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVQcm9wZXJ0aWVzLnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXkgPT09IHByb3BlcnR5TmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOS8mOWFiOS9v+eUqHZhbHVl5bGe5oCn77yM5aaC5p6c5rKh5pyJ5YiZ5L2/55SocHJvcERhdGHmnKzouqtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9wS2V5cyA9IE9iamVjdC5rZXlzKHByb3BJbmZvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlWYWx1ZSA9IHByb3BLZXlzLmluY2x1ZGVzKCd2YWx1ZScpID8gcHJvcEluZm8udmFsdWUgOiBwcm9wSW5mbztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzmo4Dmn6XlpLHotKXvvIznm7TmjqXkvb/nlKhwcm9wSW5mb1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVZhbHVlID0gcHJvcEluZm87XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5RXhpc3RzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gMy4g5LuO55u05o6l5bGe5oCn5Lit5o+Q5Y+W566A5Y2V5bGe5oCn5ZCNXG4gICAgICAgIGlmIChhdmFpbGFibGVQcm9wZXJ0aWVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoY29tcG9uZW50KSkge1xuICAgICAgICAgICAgICAgIGlmICgha2V5LnN0YXJ0c1dpdGgoJ18nKSAmJiAhWydfX3R5cGVfXycsICdjaWQnLCAnbm9kZScsICd1dWlkJywgJ25hbWUnLCAnZW5hYmxlZCcsICd0eXBlJywgJ3JlYWRvbmx5JywgJ3Zpc2libGUnXS5pbmNsdWRlcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVByb3BlcnRpZXMucHVzaChrZXkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKCFwcm9wZXJ0eUV4aXN0cykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBleGlzdHM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHR5cGU6ICd1bmtub3duJyxcbiAgICAgICAgICAgICAgICBhdmFpbGFibGVQcm9wZXJ0aWVzLFxuICAgICAgICAgICAgICAgIG9yaWdpbmFsVmFsdWU6IHVuZGVmaW5lZFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgbGV0IHR5cGUgPSAndW5rbm93bic7XG4gICAgICAgIFxuICAgICAgICAvLyDmmbrog73nsbvlnovmo4DmtYtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocHJvcGVydHlWYWx1ZSkpIHtcbiAgICAgICAgICAgIC8vIOaVsOe7hOexu+Wei+ajgOa1i1xuICAgICAgICAgICAgaWYgKHByb3BlcnR5TmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdub2RlJykpIHtcbiAgICAgICAgICAgICAgICB0eXBlID0gJ25vZGVBcnJheSc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5TmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdjb2xvcicpKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdjb2xvckFycmF5JztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdhcnJheSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHByb3BlcnR5VmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiBwcm9wZXJ0eSBuYW1lIHN1Z2dlc3RzIGl0J3MgYW4gYXNzZXRcbiAgICAgICAgICAgIGlmIChbJ3Nwcml0ZUZyYW1lJywgJ3RleHR1cmUnLCAnbWF0ZXJpYWwnLCAnZm9udCcsICdjbGlwJywgJ3ByZWZhYiddLmluY2x1ZGVzKHByb3BlcnR5TmFtZS50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgICAgICAgICAgIHR5cGUgPSAnYXNzZXQnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0eXBlID0gJ3N0cmluZyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHByb3BlcnR5VmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICB0eXBlID0gJ251bWJlcic7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHByb3BlcnR5VmFsdWUgPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgdHlwZSA9ICdib29sZWFuJztcbiAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVZhbHVlICYmIHR5cGVvZiBwcm9wZXJ0eVZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMocHJvcGVydHlWYWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKGtleXMuaW5jbHVkZXMoJ3InKSAmJiBrZXlzLmluY2x1ZGVzKCdnJykgJiYga2V5cy5pbmNsdWRlcygnYicpKSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSAnY29sb3InO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5cy5pbmNsdWRlcygneCcpICYmIGtleXMuaW5jbHVkZXMoJ3knKSkge1xuICAgICAgICAgICAgICAgICAgICB0eXBlID0gcHJvcGVydHlWYWx1ZS56ICE9PSB1bmRlZmluZWQgPyAndmVjMycgOiAndmVjMic7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXlzLmluY2x1ZGVzKCd3aWR0aCcpICYmIGtleXMuaW5jbHVkZXMoJ2hlaWdodCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSAnc2l6ZSc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXlzLmluY2x1ZGVzKCd1dWlkJykgfHwga2V5cy5pbmNsdWRlcygnX191dWlkX18nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6XmmK/lkKbmmK/oioLngrnlvJXnlKjvvIjpgJrov4flsZ7mgKflkI3miJZfX2lkX1/lsZ7mgKfliKTmlq3vvIlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5TmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdub2RlJykgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygndGFyZ2V0JykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleXMuaW5jbHVkZXMoJ19faWRfXycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlID0gJ25vZGUnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSA9ICdhc3NldCc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXMuaW5jbHVkZXMoJ19faWRfXycpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOiKgueCueW8leeUqOeJueW+gVxuICAgICAgICAgICAgICAgICAgICB0eXBlID0gJ25vZGUnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSAnb2JqZWN0JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgW2FuYWx5emVQcm9wZXJ0eV0gRXJyb3IgY2hlY2tpbmcgcHJvcGVydHkgdHlwZSBmb3I6ICR7SlNPTi5zdHJpbmdpZnkocHJvcGVydHlWYWx1ZSl9YCk7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdvYmplY3QnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VmFsdWUgPT09IG51bGwgfHwgcHJvcGVydHlWYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBGb3IgbnVsbC91bmRlZmluZWQgdmFsdWVzLCBjaGVjayBwcm9wZXJ0eSBuYW1lIHRvIGRldGVybWluZSB0eXBlXG4gICAgICAgICAgICBpZiAoWydzcHJpdGVGcmFtZScsICd0ZXh0dXJlJywgJ21hdGVyaWFsJywgJ2ZvbnQnLCAnY2xpcCcsICdwcmVmYWInXS5pbmNsdWRlcyhwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKSkpIHtcbiAgICAgICAgICAgICAgICB0eXBlID0gJ2Fzc2V0JztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlOYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ25vZGUnKSB8fCBcbiAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygndGFyZ2V0JykpIHtcbiAgICAgICAgICAgICAgICB0eXBlID0gJ25vZGUnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnY29tcG9uZW50JykpIHtcbiAgICAgICAgICAgICAgICB0eXBlID0gJ2NvbXBvbmVudCc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHR5cGUgPSAndW5rbm93bic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBleGlzdHM6IHRydWUsXG4gICAgICAgICAgICB0eXBlLFxuICAgICAgICAgICAgYXZhaWxhYmxlUHJvcGVydGllcyxcbiAgICAgICAgICAgIG9yaWdpbmFsVmFsdWU6IHByb3BlcnR5VmFsdWVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHNtYXJ0Q29udmVydFZhbHVlKGlucHV0VmFsdWU6IGFueSwgcHJvcGVydHlJbmZvOiBhbnkpOiBhbnkge1xuICAgICAgICBjb25zdCB7IHR5cGUsIG9yaWdpbmFsVmFsdWUgfSA9IHByb3BlcnR5SW5mbztcbiAgICAgICAgXG4gICAgICAgIGNvbnNvbGUubG9nKGBbc21hcnRDb252ZXJ0VmFsdWVdIENvbnZlcnRpbmcgJHtKU09OLnN0cmluZ2lmeShpbnB1dFZhbHVlKX0gdG8gdHlwZTogJHt0eXBlfWApO1xuICAgICAgICBcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgIHJldHVybiBTdHJpbmcoaW5wdXRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgICAgIHJldHVybiBOdW1iZXIoaW5wdXRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0VmFsdWUgPT09ICdib29sZWFuJykgcmV0dXJuIGlucHV0VmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaW5wdXRWYWx1ZS50b0xvd2VyQ2FzZSgpID09PSAndHJ1ZScgfHwgaW5wdXRWYWx1ZSA9PT0gJzEnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gQm9vbGVhbihpbnB1dFZhbHVlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ2NvbG9yJzpcbiAgICAgICAgICAgICAgICAvLyDkvJjljJbnmoTpopzoibLlpITnkIbvvIzmlK/mjIHlpJrnp43ovpPlhaXmoLzlvI9cbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0VmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOWtl+espuS4suagvOW8j++8muWNgeWFrei/m+WItuOAgeminOiJsuWQjeensOOAgXJnYigpL3JnYmEoKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJzZUNvbG9yU3RyaW5nKGlucHV0VmFsdWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGlucHV0VmFsdWUgPT09ICdvYmplY3QnICYmIGlucHV0VmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlucHV0S2V5cyA9IE9iamVjdC5rZXlzKGlucHV0VmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c6L6T5YWl5piv6aKc6Imy5a+56LGh77yM6aqM6K+B5bm26L2s5o2iXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXRLZXlzLmluY2x1ZGVzKCdyJykgfHwgaW5wdXRLZXlzLmluY2x1ZGVzKCdnJykgfHwgaW5wdXRLZXlzLmluY2x1ZGVzKCdiJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpbnB1dFZhbHVlLnIpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZzogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaW5wdXRWYWx1ZS5nKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGI6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGlucHV0VmFsdWUuYikgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhOiBpbnB1dFZhbHVlLmEgIT09IHVuZGVmaW5lZCA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGlucHV0VmFsdWUuYSkpKSA6IDI1NVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYFtzbWFydENvbnZlcnRWYWx1ZV0gSW52YWxpZCBjb2xvciBvYmplY3Q6ICR7SlNPTi5zdHJpbmdpZnkoaW5wdXRWYWx1ZSl9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8g5aaC5p6c5pyJ5Y6f5YC877yM5L+d5oyB5Y6f5YC857uT5p6E5bm25pu05paw5o+Q5L6b55qE5YC8XG4gICAgICAgICAgICAgICAgaWYgKG9yaWdpbmFsVmFsdWUgJiYgdHlwZW9mIG9yaWdpbmFsVmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnB1dEtleXMgPSB0eXBlb2YgaW5wdXRWYWx1ZSA9PT0gJ29iamVjdCcgJiYgaW5wdXRWYWx1ZSA/IE9iamVjdC5rZXlzKGlucHV0VmFsdWUpIDogW107XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHI6IGlucHV0S2V5cy5pbmNsdWRlcygncicpID8gTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaW5wdXRWYWx1ZS5yKSkpIDogKG9yaWdpbmFsVmFsdWUuciB8fCAyNTUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGc6IGlucHV0S2V5cy5pbmNsdWRlcygnZycpID8gTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaW5wdXRWYWx1ZS5nKSkpIDogKG9yaWdpbmFsVmFsdWUuZyB8fCAyNTUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGI6IGlucHV0S2V5cy5pbmNsdWRlcygnYicpID8gTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaW5wdXRWYWx1ZS5iKSkpIDogKG9yaWdpbmFsVmFsdWUuYiB8fCAyNTUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGE6IGlucHV0S2V5cy5pbmNsdWRlcygnYScpID8gTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaW5wdXRWYWx1ZS5hKSkpIDogKG9yaWdpbmFsVmFsdWUuYSB8fCAyNTUpXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBbc21hcnRDb252ZXJ0VmFsdWVdIEVycm9yIHByb2Nlc3NpbmcgY29sb3Igd2l0aCBvcmlnaW5hbCB2YWx1ZTogJHtlcnJvcn1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyDpu5jorqTov5Tlm57nmb3oibJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYFtzbWFydENvbnZlcnRWYWx1ZV0gVXNpbmcgZGVmYXVsdCB3aGl0ZSBjb2xvciBmb3IgaW52YWxpZCBpbnB1dDogJHtKU09OLnN0cmluZ2lmeShpbnB1dFZhbHVlKX1gKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyByOiAyNTUsIGc6IDI1NSwgYjogMjU1LCBhOiAyNTUgfTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ3ZlYzInOlxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaW5wdXRWYWx1ZSA9PT0gJ29iamVjdCcgJiYgaW5wdXRWYWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgeDogTnVtYmVyKGlucHV0VmFsdWUueCkgfHwgb3JpZ2luYWxWYWx1ZS54IHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiBOdW1iZXIoaW5wdXRWYWx1ZS55KSB8fCBvcmlnaW5hbFZhbHVlLnkgfHwgMFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ3ZlYzMnOlxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaW5wdXRWYWx1ZSA9PT0gJ29iamVjdCcgJiYgaW5wdXRWYWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgeDogTnVtYmVyKGlucHV0VmFsdWUueCkgfHwgb3JpZ2luYWxWYWx1ZS54IHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiBOdW1iZXIoaW5wdXRWYWx1ZS55KSB8fCBvcmlnaW5hbFZhbHVlLnkgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHo6IE51bWJlcihpbnB1dFZhbHVlLnopIHx8IG9yaWdpbmFsVmFsdWUueiB8fCAwXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbFZhbHVlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnc2l6ZSc6XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSAnb2JqZWN0JyAmJiBpbnB1dFZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogTnVtYmVyKGlucHV0VmFsdWUud2lkdGgpIHx8IG9yaWdpbmFsVmFsdWUud2lkdGggfHwgMTAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBOdW1iZXIoaW5wdXRWYWx1ZS5oZWlnaHQpIHx8IG9yaWdpbmFsVmFsdWUuaGVpZ2h0IHx8IDEwMFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ25vZGUnOlxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaW5wdXRWYWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g6IqC54K55byV55So6ZyA6KaB54m55q6K5aSE55CGXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpbnB1dFZhbHVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGlucHV0VmFsdWUgPT09ICdvYmplY3QnICYmIGlucHV0VmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5bey57uP5piv5a+56LGh5b2i5byP77yM6L+U5ZueVVVJROaIluWujOaVtOWvueixoVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaW5wdXRWYWx1ZS51dWlkIHx8IGlucHV0VmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbFZhbHVlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnYXNzZXQnOlxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaW5wdXRWYWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c6L6T5YWl5piv5a2X56ym5Liy6Lev5b6E77yM6L2s5o2i5Li6YXNzZXTlr7nosaFcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdXVpZDogaW5wdXRWYWx1ZSB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGlucHV0VmFsdWUgPT09ICdvYmplY3QnICYmIGlucHV0VmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlucHV0VmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbFZhbHVlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyDlr7nkuo7mnKrnn6XnsbvlnovvvIzlsL3ph4/kv53mjIHljp/mnInnu5PmnoRcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0VmFsdWUgPT09IHR5cGVvZiBvcmlnaW5hbFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpbnB1dFZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgICAgICBwcml2YXRlIHBhcnNlQ29sb3JTdHJpbmcoY29sb3JTdHI6IHN0cmluZyk6IHsgcjogbnVtYmVyOyBnOiBudW1iZXI7IGI6IG51bWJlcjsgYTogbnVtYmVyIH0ge1xuICAgICAgICBjb25zdCBzdHIgPSBjb2xvclN0ci50cmltKCk7XG4gICAgICAgIFxuICAgICAgICAvLyDlj6rmlK/mjIHljYHlha3ov5vliLbmoLzlvI8gI1JSR0dCQiDmiJYgI1JSR0dCQkFBXG4gICAgICAgIGlmIChzdHIuc3RhcnRzV2l0aCgnIycpKSB7XG4gICAgICAgICAgICBpZiAoc3RyLmxlbmd0aCA9PT0gNykgeyAvLyAjUlJHR0JCXG4gICAgICAgICAgICAgICAgY29uc3QgciA9IHBhcnNlSW50KHN0ci5zdWJzdHJpbmcoMSwgMyksIDE2KTtcbiAgICAgICAgICAgICAgICBjb25zdCBnID0gcGFyc2VJbnQoc3RyLnN1YnN0cmluZygzLCA1KSwgMTYpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGIgPSBwYXJzZUludChzdHIuc3Vic3RyaW5nKDUsIDcpLCAxNik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgciwgZywgYiwgYTogMjU1IH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHN0ci5sZW5ndGggPT09IDkpIHsgLy8gI1JSR0dCQkFBXG4gICAgICAgICAgICAgICAgY29uc3QgciA9IHBhcnNlSW50KHN0ci5zdWJzdHJpbmcoMSwgMyksIDE2KTtcbiAgICAgICAgICAgICAgICBjb25zdCBnID0gcGFyc2VJbnQoc3RyLnN1YnN0cmluZygzLCA1KSwgMTYpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGIgPSBwYXJzZUludChzdHIuc3Vic3RyaW5nKDUsIDcpLCAxNik7XG4gICAgICAgICAgICAgICAgY29uc3QgYSA9IHBhcnNlSW50KHN0ci5zdWJzdHJpbmcoNywgOSksIDE2KTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyByLCBnLCBiLCBhIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIOWmguaenOS4jeaYr+acieaViOeahOWNgeWFrei/m+WItuagvOW8j++8jOi/lOWbnumUmeivr+aPkOekulxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29sb3IgZm9ybWF0OiBcIiR7Y29sb3JTdHJ9XCIuIE9ubHkgaGV4YWRlY2ltYWwgZm9ybWF0IGlzIHN1cHBvcnRlZCAoZS5nLiwgXCIjRkYwMDAwXCIgb3IgXCIjRkYwMDAwRkZcIilgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHZlcmlmeVByb3BlcnR5Q2hhbmdlKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZywgb3JpZ2luYWxWYWx1ZTogYW55LCBleHBlY3RlZFZhbHVlOiBhbnkpOiBQcm9taXNlPHsgdmVyaWZpZWQ6IGJvb2xlYW47IGFjdHVhbFZhbHVlOiBhbnk7IGZ1bGxEYXRhOiBhbnkgfT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBTdGFydGluZyB2ZXJpZmljYXRpb24gZm9yICR7Y29tcG9uZW50VHlwZX0uJHtwcm9wZXJ0eX1gKTtcbiAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gRXhwZWN0ZWQgdmFsdWU6YCwgSlNPTi5zdHJpbmdpZnkoZXhwZWN0ZWRWYWx1ZSkpO1xuICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBPcmlnaW5hbCB2YWx1ZTpgLCBKU09OLnN0cmluZ2lmeShvcmlnaW5hbFZhbHVlKSk7XG4gICAgICAgIFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8g6YeN5paw6I635Y+W57uE5Lu25L+h5oGv6L+b6KGM6aqM6K+BXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBDYWxsaW5nIGdldENvbXBvbmVudEluZm8uLi5gKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudEluZm8gPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudEluZm8obm9kZVV1aWQsIGNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gZ2V0Q29tcG9uZW50SW5mbyBzdWNjZXNzOmAsIGNvbXBvbmVudEluZm8uc3VjY2Vzcyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGFsbENvbXBvbmVudHMgPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudHMobm9kZVV1aWQpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gZ2V0Q29tcG9uZW50cyBzdWNjZXNzOmAsIGFsbENvbXBvbmVudHMuc3VjY2Vzcyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChjb21wb25lbnRJbmZvLnN1Y2Nlc3MgJiYgY29tcG9uZW50SW5mby5kYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gQ29tcG9uZW50IGRhdGEgYXZhaWxhYmxlLCBleHRyYWN0aW5nIHByb3BlcnR5ICcke3Byb3BlcnR5fSdgKTtcbiAgICAgICAgICAgICAgICBjb25zdCBhbGxQcm9wZXJ0eU5hbWVzID0gT2JqZWN0LmtleXMoY29tcG9uZW50SW5mby5kYXRhLnByb3BlcnRpZXMgfHwge30pO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIEF2YWlsYWJsZSBwcm9wZXJ0aWVzOmAsIGFsbFByb3BlcnR5TmFtZXMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb3BlcnR5RGF0YSA9IGNvbXBvbmVudEluZm8uZGF0YS5wcm9wZXJ0aWVzPy5bcHJvcGVydHldO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIFJhdyBwcm9wZXJ0eSBkYXRhIGZvciAnJHtwcm9wZXJ0eX0nOmAsIEpTT04uc3RyaW5naWZ5KHByb3BlcnR5RGF0YSkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIOS7juWxnuaAp+aVsOaNruS4reaPkOWPluWunumZheWAvFxuICAgICAgICAgICAgICAgIGxldCBhY3R1YWxWYWx1ZSA9IHByb3BlcnR5RGF0YTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBJbml0aWFsIGFjdHVhbFZhbHVlOmAsIEpTT04uc3RyaW5naWZ5KGFjdHVhbFZhbHVlKSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5RGF0YSAmJiB0eXBlb2YgcHJvcGVydHlEYXRhID09PSAnb2JqZWN0JyAmJiAndmFsdWUnIGluIHByb3BlcnR5RGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBhY3R1YWxWYWx1ZSA9IHByb3BlcnR5RGF0YS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gRXh0cmFjdGVkIGFjdHVhbFZhbHVlIGZyb20gLnZhbHVlOmAsIEpTT04uc3RyaW5naWZ5KGFjdHVhbFZhbHVlKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gTm8gLnZhbHVlIHByb3BlcnR5IGZvdW5kLCB1c2luZyByYXcgZGF0YWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyDkv67lpI3pqozor4HpgLvovpHvvJrmo4Dmn6Xlrp7pmYXlgLzmmK/lkKbljLnphY3mnJ/mnJvlgLxcbiAgICAgICAgICAgICAgICBsZXQgdmVyaWZpZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGV4cGVjdGVkVmFsdWUgPT09ICdvYmplY3QnICYmIGV4cGVjdGVkVmFsdWUgIT09IG51bGwgJiYgJ3V1aWQnIGluIGV4cGVjdGVkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g5a+55LqO5byV55So57G75Z6L77yI6IqC54K5L+e7hOS7ti/otYTmupDvvInvvIzmr5TovoNVVUlEXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFjdHVhbFV1aWQgPSBhY3R1YWxWYWx1ZSAmJiB0eXBlb2YgYWN0dWFsVmFsdWUgPT09ICdvYmplY3QnICYmICd1dWlkJyBpbiBhY3R1YWxWYWx1ZSA/IGFjdHVhbFZhbHVlLnV1aWQgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXhwZWN0ZWRVdWlkID0gZXhwZWN0ZWRWYWx1ZS51dWlkIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICB2ZXJpZmllZCA9IGFjdHVhbFV1aWQgPT09IGV4cGVjdGVkVXVpZCAmJiBleHBlY3RlZFV1aWQgIT09ICcnO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gUmVmZXJlbmNlIGNvbXBhcmlzb246YCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgIC0gRXhwZWN0ZWQgVVVJRDogXCIke2V4cGVjdGVkVXVpZH1cImApO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAtIEFjdHVhbCBVVUlEOiBcIiR7YWN0dWFsVXVpZH1cImApO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAtIFVVSUQgbWF0Y2g6ICR7YWN0dWFsVXVpZCA9PT0gZXhwZWN0ZWRVdWlkfWApO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAtIFVVSUQgbm90IGVtcHR5OiAke2V4cGVjdGVkVXVpZCAhPT0gJyd9YCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgIC0gRmluYWwgdmVyaWZpZWQ6ICR7dmVyaWZpZWR9YCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g5a+55LqO5YW25LuW57G75Z6L77yM55u05o6l5q+U6L6D5YC8XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIFZhbHVlIGNvbXBhcmlzb246YCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgIC0gRXhwZWN0ZWQgdHlwZTogJHt0eXBlb2YgZXhwZWN0ZWRWYWx1ZX1gKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBBY3R1YWwgdHlwZTogJHt0eXBlb2YgYWN0dWFsVmFsdWV9YCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGFjdHVhbFZhbHVlID09PSB0eXBlb2YgZXhwZWN0ZWRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBhY3R1YWxWYWx1ZSA9PT0gJ29iamVjdCcgJiYgYWN0dWFsVmFsdWUgIT09IG51bGwgJiYgZXhwZWN0ZWRWYWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWvueixoeexu+Wei+eahOa3seW6puavlOi+g1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmlmaWVkID0gSlNPTi5zdHJpbmdpZnkoYWN0dWFsVmFsdWUpID09PSBKU09OLnN0cmluZ2lmeShleHBlY3RlZFZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAtIE9iamVjdCBjb21wYXJpc29uIChKU09OKTogJHt2ZXJpZmllZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5Z+65pys57G75Z6L55qE55u05o6l5q+U6L6DXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyaWZpZWQgPSBhY3R1YWxWYWx1ZSA9PT0gZXhwZWN0ZWRWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAtIERpcmVjdCBjb21wYXJpc29uOiAke3ZlcmlmaWVkfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8g57G75Z6L5LiN5Yy56YWN5pe255qE54m55q6K5aSE55CG77yI5aaC5pWw5a2X5ZKM5a2X56ym5Liy77yJXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdHJpbmdNYXRjaCA9IFN0cmluZyhhY3R1YWxWYWx1ZSkgPT09IFN0cmluZyhleHBlY3RlZFZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG51bWJlck1hdGNoID0gTnVtYmVyKGFjdHVhbFZhbHVlKSA9PT0gTnVtYmVyKGV4cGVjdGVkVmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmVyaWZpZWQgPSBzdHJpbmdNYXRjaCB8fCBudW1iZXJNYXRjaDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgIC0gU3RyaW5nIG1hdGNoOiAke3N0cmluZ01hdGNofWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBOdW1iZXIgbWF0Y2g6ICR7bnVtYmVyTWF0Y2h9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAtIFR5cGUgbWlzbWF0Y2ggdmVyaWZpZWQ6ICR7dmVyaWZpZWR9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gRmluYWwgdmVyaWZpY2F0aW9uIHJlc3VsdDogJHt2ZXJpZmllZH1gKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBGaW5hbCBhY3R1YWxWYWx1ZTpgLCBKU09OLnN0cmluZ2lmeShhY3R1YWxWYWx1ZSkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgICAgICAgICAgICAgICAgdmVyaWZpZWQsXG4gICAgICAgICAgICAgICAgICAgIGFjdHVhbFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICBmdWxsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5Y+q6L+U5Zue5L+u5pS555qE5bGe5oCn5L+h5oGv77yM5LiN6L+U5Zue5a6M5pW057uE5Lu25pWw5o2uXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RpZmllZFByb3BlcnR5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogcHJvcGVydHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmVmb3JlOiBvcmlnaW5hbFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBleHBlY3RlZFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdHVhbDogYWN0dWFsVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyaWZpZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlNZXRhZGF0YTogcHJvcGVydHlEYXRhIC8vIOWPquWMheWQq+i/meS4quWxnuaAp+eahOWFg+aVsOaNrlxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOeugOWMlueahOe7hOS7tuS/oeaBr1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50U3VtbWFyeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxQcm9wZXJ0aWVzOiBPYmplY3Qua2V5cyhjb21wb25lbnRJbmZvLmRhdGE/LnByb3BlcnRpZXMgfHwge30pLmxlbmd0aFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBSZXR1cm5pbmcgcmVzdWx0OmAsIEpTT04uc3RyaW5naWZ5KHJlc3VsdCwgbnVsbCwgMikpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIENvbXBvbmVudEluZm8gZmFpbGVkIG9yIG5vIGRhdGE6YCwgY29tcG9uZW50SW5mbyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIFZlcmlmaWNhdGlvbiBmYWlsZWQgd2l0aCBlcnJvcjonLCBlcnJvcik7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIEVycm9yIHN0YWNrOicsIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5zdGFjayA6ICdObyBzdGFjayB0cmFjZScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBSZXR1cm5pbmcgZmFsbGJhY2sgcmVzdWx0YCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB2ZXJpZmllZDogZmFsc2UsXG4gICAgICAgICAgICBhY3R1YWxWYWx1ZTogdW5kZWZpbmVkLFxuICAgICAgICAgICAgZnVsbERhdGE6IG51bGxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmo4DmtYvmmK/lkKbkuLroioLngrnlsZ7mgKfvvIzlpoLmnpzmmK/liJnph43lrprlkJHliLDlr7nlupTnmoToioLngrnmlrnms5VcbiAgICAgKi9cbiAgICBwcml2YXRlIGFzeW5jIGNoZWNrQW5kUmVkaXJlY3ROb2RlUHJvcGVydGllcyhhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZSB8IG51bGw+IHtcbiAgICAgICAgY29uc3QgeyBub2RlVXVpZCwgY29tcG9uZW50VHlwZSwgcHJvcGVydHksIHByb3BlcnR5VHlwZSwgdmFsdWUgfSA9IGFyZ3M7XG4gICAgICAgIFxuICAgICAgICAvLyDmo4DmtYvmmK/lkKbkuLroioLngrnln7rnoYDlsZ7mgKfvvIjlupTor6Xkvb/nlKggc2V0X25vZGVfcHJvcGVydHnvvIlcbiAgICAgICAgY29uc3Qgbm9kZUJhc2ljUHJvcGVydGllcyA9IFtcbiAgICAgICAgICAgICduYW1lJywgJ2FjdGl2ZScsICdsYXllcicsICdtb2JpbGl0eScsICdwYXJlbnQnLCAnY2hpbGRyZW4nLCAnaGlkZUZsYWdzJ1xuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgLy8g5qOA5rWL5piv5ZCm5Li66IqC54K55Y+Y5o2i5bGe5oCn77yI5bqU6K+l5L2/55SoIHNldF9ub2RlX3RyYW5zZm9ybe+8iVxuICAgICAgICBjb25zdCBub2RlVHJhbnNmb3JtUHJvcGVydGllcyA9IFtcbiAgICAgICAgICAgICdwb3NpdGlvbicsICdyb3RhdGlvbicsICdzY2FsZScsICdldWxlckFuZ2xlcycsICdhbmdsZSdcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIC8vIERldGVjdCBhdHRlbXB0cyB0byBzZXQgY2MuTm9kZSBwcm9wZXJ0aWVzIChjb21tb24gbWlzdGFrZSlcbiAgICAgICAgaWYgKGNvbXBvbmVudFR5cGUgPT09ICdjYy5Ob2RlJyB8fCBjb21wb25lbnRUeXBlID09PSAnTm9kZScpIHtcbiAgICAgICAgICAgIGlmIChub2RlQmFzaWNQcm9wZXJ0aWVzLmluY2x1ZGVzKHByb3BlcnR5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBQcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIGlzIGEgbm9kZSBiYXNpYyBwcm9wZXJ0eSwgbm90IGEgY29tcG9uZW50IHByb3BlcnR5YCxcbiAgICAgICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogYFBsZWFzZSB1c2Ugc2V0X25vZGVfcHJvcGVydHkgbWV0aG9kIHRvIHNldCBub2RlIHByb3BlcnRpZXM6IHNldF9ub2RlX3Byb3BlcnR5KHV1aWQ9XCIke25vZGVVdWlkfVwiLCBwcm9wZXJ0eT1cIiR7cHJvcGVydHl9XCIsIHZhbHVlPSR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfSlgXG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5vZGVUcmFuc2Zvcm1Qcm9wZXJ0aWVzLmluY2x1ZGVzKHByb3BlcnR5KSkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYFByb3BlcnR5ICcke3Byb3BlcnR5fScgaXMgYSBub2RlIHRyYW5zZm9ybSBwcm9wZXJ0eSwgbm90IGEgY29tcG9uZW50IHByb3BlcnR5YCxcbiAgICAgICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogYFBsZWFzZSB1c2Ugc2V0X25vZGVfdHJhbnNmb3JtIG1ldGhvZCB0byBzZXQgdHJhbnNmb3JtIHByb3BlcnRpZXM6IHNldF9ub2RlX3RyYW5zZm9ybSh1dWlkPVwiJHtub2RlVXVpZH1cIiwgJHtwcm9wZXJ0eX09JHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9KWBcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gRGV0ZWN0IGNvbW1vbiBpbmNvcnJlY3QgdXNhZ2VcbiAgICAgICAgICBpZiAobm9kZUJhc2ljUHJvcGVydGllcy5pbmNsdWRlcyhwcm9wZXJ0eSkgfHwgbm9kZVRyYW5zZm9ybVByb3BlcnRpZXMuaW5jbHVkZXMocHJvcGVydHkpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IG1ldGhvZE5hbWUgPSBub2RlVHJhbnNmb3JtUHJvcGVydGllcy5pbmNsdWRlcyhwcm9wZXJ0eSkgPyAnc2V0X25vZGVfdHJhbnNmb3JtJyA6ICdzZXRfbm9kZV9wcm9wZXJ0eSc7XG4gICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgIGVycm9yOiBgUHJvcGVydHkgJyR7cHJvcGVydHl9JyBpcyBhIG5vZGUgcHJvcGVydHksIG5vdCBhIGNvbXBvbmVudCBwcm9wZXJ0eWAsXG4gICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogYFByb3BlcnR5ICcke3Byb3BlcnR5fScgc2hvdWxkIGJlIHNldCB1c2luZyAke21ldGhvZE5hbWV9IG1ldGhvZCwgbm90IHNldF9jb21wb25lbnRfcHJvcGVydHkuIFBsZWFzZSB1c2U6ICR7bWV0aG9kTmFtZX0odXVpZD1cIiR7bm9kZVV1aWR9XCIsICR7bm9kZVRyYW5zZm9ybVByb3BlcnRpZXMuaW5jbHVkZXMocHJvcGVydHkpID8gcHJvcGVydHkgOiBgcHJvcGVydHk9XCIke3Byb3BlcnR5fVwiYH09JHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9KWBcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgcmV0dXJuIG51bGw7IC8vIOS4jeaYr+iKgueCueWxnuaAp++8jOe7p+e7reato+W4uOWkhOeQhlxuICAgICAgfVxuXG4gICAgICAvKipcbiAgICAgICAqIOeUn+aIkOe7hOS7tuW7uuiuruS/oeaBr1xuICAgICAgICovXG4gICAgICBwcml2YXRlIGdlbmVyYXRlQ29tcG9uZW50U3VnZ2VzdGlvbihyZXF1ZXN0ZWRUeXBlOiBzdHJpbmcsIGF2YWlsYWJsZVR5cGVzOiBzdHJpbmdbXSwgcHJvcGVydHk6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5a2Y5Zyo55u45Ly855qE57uE5Lu257G75Z6LXG4gICAgICAgICAgY29uc3Qgc2ltaWxhclR5cGVzID0gYXZhaWxhYmxlVHlwZXMuZmlsdGVyKHR5cGUgPT4gXG4gICAgICAgICAgICAgIHR5cGUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhyZXF1ZXN0ZWRUeXBlLnRvTG93ZXJDYXNlKCkpIHx8IFxuICAgICAgICAgICAgICByZXF1ZXN0ZWRUeXBlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXModHlwZS50b0xvd2VyQ2FzZSgpKVxuICAgICAgICAgICk7XG4gICAgICAgICAgXG4gICAgICAgICAgbGV0IGluc3RydWN0aW9uID0gJyc7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKHNpbWlsYXJUeXBlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgIGluc3RydWN0aW9uICs9IGBcXG5cXG7wn5SNIEZvdW5kIHNpbWlsYXIgY29tcG9uZW50czogJHtzaW1pbGFyVHlwZXMuam9pbignLCAnKX1gO1xuICAgICAgICAgICAgICBpbnN0cnVjdGlvbiArPSBgXFxu8J+SoSBTdWdnZXN0aW9uOiBQZXJoYXBzIHlvdSBtZWFudCB0byBzZXQgdGhlICcke3NpbWlsYXJUeXBlc1swXX0nIGNvbXBvbmVudD9gO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICAvLyBSZWNvbW1lbmQgcG9zc2libGUgY29tcG9uZW50cyBiYXNlZCBvbiBwcm9wZXJ0eSBuYW1lXG4gICAgICAgICAgY29uc3QgcHJvcGVydHlUb0NvbXBvbmVudE1hcDogUmVjb3JkPHN0cmluZywgc3RyaW5nW10+ID0ge1xuICAgICAgICAgICAgICAnc3RyaW5nJzogWydjYy5MYWJlbCcsICdjYy5SaWNoVGV4dCcsICdjYy5FZGl0Qm94J10sXG4gICAgICAgICAgICAgICd0ZXh0JzogWydjYy5MYWJlbCcsICdjYy5SaWNoVGV4dCddLFxuICAgICAgICAgICAgICAnZm9udFNpemUnOiBbJ2NjLkxhYmVsJywgJ2NjLlJpY2hUZXh0J10sXG4gICAgICAgICAgICAgICdzcHJpdGVGcmFtZSc6IFsnY2MuU3ByaXRlJ10sXG4gICAgICAgICAgICAgICdjb2xvcic6IFsnY2MuTGFiZWwnLCAnY2MuU3ByaXRlJywgJ2NjLkdyYXBoaWNzJ10sXG4gICAgICAgICAgICAgICdub3JtYWxDb2xvcic6IFsnY2MuQnV0dG9uJ10sXG4gICAgICAgICAgICAgICdwcmVzc2VkQ29sb3InOiBbJ2NjLkJ1dHRvbiddLFxuICAgICAgICAgICAgICAndGFyZ2V0JzogWydjYy5CdXR0b24nXSxcbiAgICAgICAgICAgICAgJ2NvbnRlbnRTaXplJzogWydjYy5VSVRyYW5zZm9ybSddLFxuICAgICAgICAgICAgICAnYW5jaG9yUG9pbnQnOiBbJ2NjLlVJVHJhbnNmb3JtJ11cbiAgICAgICAgICB9O1xuICAgICAgICAgIFxuICAgICAgICAgIGNvbnN0IHJlY29tbWVuZGVkQ29tcG9uZW50cyA9IHByb3BlcnR5VG9Db21wb25lbnRNYXBbcHJvcGVydHldIHx8IFtdO1xuICAgICAgICAgIGNvbnN0IGF2YWlsYWJsZVJlY29tbWVuZGVkID0gcmVjb21tZW5kZWRDb21wb25lbnRzLmZpbHRlcihjb21wID0+IGF2YWlsYWJsZVR5cGVzLmluY2x1ZGVzKGNvbXApKTtcbiAgICAgICAgICBcbiAgICAgICAgICBpZiAoYXZhaWxhYmxlUmVjb21tZW5kZWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICBpbnN0cnVjdGlvbiArPSBgXFxuXFxu8J+OryBCYXNlZCBvbiBwcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nLCByZWNvbW1lbmRlZCBjb21wb25lbnRzOiAke2F2YWlsYWJsZVJlY29tbWVuZGVkLmpvaW4oJywgJyl9YDtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gUHJvdmlkZSBvcGVyYXRpb24gc3VnZ2VzdGlvbnNcbiAgICAgICAgICBpbnN0cnVjdGlvbiArPSBgXFxuXFxu8J+TiyBTdWdnZXN0ZWQgQWN0aW9uczpgO1xuICAgICAgICAgIGluc3RydWN0aW9uICs9IGBcXG4xLiBVc2UgZ2V0X2NvbXBvbmVudHMobm9kZVV1aWQ9XCIke3JlcXVlc3RlZFR5cGUuaW5jbHVkZXMoJ3V1aWQnKSA/ICdZT1VSX05PREVfVVVJRCcgOiAnbm9kZVV1aWQnfVwiKSB0byB2aWV3IGFsbCBjb21wb25lbnRzIG9uIHRoZSBub2RlYDtcbiAgICAgICAgICBpbnN0cnVjdGlvbiArPSBgXFxuMi4gSWYgeW91IG5lZWQgdG8gYWRkIGEgY29tcG9uZW50LCB1c2UgYWRkX2NvbXBvbmVudChub2RlVXVpZD1cIi4uLlwiLCBjb21wb25lbnRUeXBlPVwiJHtyZXF1ZXN0ZWRUeXBlfVwiKWA7XG4gICAgICAgICAgaW5zdHJ1Y3Rpb24gKz0gYFxcbjMuIFZlcmlmeSB0aGF0IHRoZSBjb21wb25lbnQgdHlwZSBuYW1lIGlzIGNvcnJlY3QgKGNhc2Utc2Vuc2l0aXZlKWA7XG4gICAgICAgICAgXG4gICAgICAgICAgICAgICAgICByZXR1cm4gaW5zdHJ1Y3Rpb247XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5b+r6YCf6aqM6K+B6LWE5rqQ6K6+572u57uT5p6cXG4gICAgICovXG4gICAgcHJpdmF0ZSBhc3luYyBxdWlja1ZlcmlmeUFzc2V0KG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByYXdOb2RlRGF0YSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIXJhd05vZGVEYXRhIHx8ICFyYXdOb2RlRGF0YS5fX2NvbXBzX18pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8g5om+5Yiw57uE5Lu2XG4gICAgICAgICAgICBjb25zdCBjb21wb25lbnQgPSByYXdOb2RlRGF0YS5fX2NvbXBzX18uZmluZCgoY29tcDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29tcFR5cGUgPSBjb21wLl9fdHlwZV9fIHx8IGNvbXAuY2lkIHx8IGNvbXAudHlwZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29tcFR5cGUgPT09IGNvbXBvbmVudFR5cGU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFjb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8g5o+Q5Y+W5bGe5oCn5YC8XG4gICAgICAgICAgICBjb25zdCBwcm9wZXJ0aWVzID0gdGhpcy5leHRyYWN0Q29tcG9uZW50UHJvcGVydGllcyhjb21wb25lbnQpO1xuICAgICAgICAgICAgY29uc3QgcHJvcGVydHlEYXRhID0gcHJvcGVydGllc1twcm9wZXJ0eV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eURhdGEgJiYgdHlwZW9mIHByb3BlcnR5RGF0YSA9PT0gJ29iamVjdCcgJiYgJ3ZhbHVlJyBpbiBwcm9wZXJ0eURhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvcGVydHlEYXRhLnZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvcGVydHlEYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgW3F1aWNrVmVyaWZ5QXNzZXRdIEVycm9yOmAsIGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxufSJdfQ==