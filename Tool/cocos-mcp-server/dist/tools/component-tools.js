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
                description: 'Unified component query (v1.6.0). action=list: all components on a node. action=info: one specific component. action=available: list of available component types by category.',
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
                return await this.getComponents(args.nodeUuid);
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
                        return await this.getComponents(args.nodeUuid);
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
            var _a, _b, _c;
            // 1. 查找节点上的所有组件
            const allComponentsInfo = await this.getComponents(nodeUuid);
            if (!allComponentsInfo.success || !((_a = allComponentsInfo.data) === null || _a === void 0 ? void 0 : _a.components)) {
                resolve({ success: false, error: `Failed to get components for node '${nodeUuid}': ${allComponentsInfo.error}` });
                return;
            }
            // 2. 只查找type字段等于componentType的组件（即cid）
            const exists = allComponentsInfo.data.components.some((comp) => comp.type === componentType);
            if (!exists) {
                resolve({ success: false, error: `Component cid '${componentType}' not found on node '${nodeUuid}'. 请用getComponents获取type字段（cid）作为componentType。` });
                return;
            }
            // 3. 官方API直接移除
            try {
                await Editor.Message.request('scene', 'remove-component', {
                    uuid: nodeUuid,
                    component: componentType
                });
                // 4. 再查一次确认是否移除
                const afterRemoveInfo = await this.getComponents(nodeUuid);
                const stillExists = afterRemoveInfo.success && ((_c = (_b = afterRemoveInfo.data) === null || _b === void 0 ? void 0 : _b.components) === null || _c === void 0 ? void 0 : _c.some((comp) => comp.type === componentType));
                if (stillExists) {
                    resolve({ success: false, error: `Component cid '${componentType}' was not removed from node '${nodeUuid}'.` });
                }
                else {
                    resolve({
                        success: true,
                        message: `Component cid '${componentType}' removed successfully from node '${nodeUuid}'`,
                        data: { nodeUuid, componentType }
                    });
                }
            }
            catch (err) {
                resolve({ success: false, error: `Failed to remove component: ${err.message}` });
            }
        });
    }
    async getComponents(nodeUuid) {
        return new Promise((resolve) => {
            // 优先尝试直接使用 Editor API 查询节点信息
            Editor.Message.request('scene', 'query-node', nodeUuid).then((nodeData) => {
                if (nodeData && nodeData.__comps__) {
                    const components = nodeData.__comps__.map((comp) => {
                        var _a;
                        return ({
                            type: comp.__type__ || comp.cid || comp.type || 'Unknown',
                            uuid: ((_a = comp.uuid) === null || _a === void 0 ? void 0 : _a.value) || comp.uuid || null,
                            enabled: comp.enabled !== undefined ? comp.enabled : true,
                            properties: this.extractComponentProperties(comp)
                        });
                    });
                    resolve({
                        success: true,
                        data: {
                            nodeUuid: nodeUuid,
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
                        processedValue = Boolean(value);
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
                resolve({
                    success: true,
                    message: `Successfully set ${componentType}.${property}`,
                    data: {
                        nodeUuid,
                        componentType,
                        property,
                        actualValue: verification.actualValue,
                        changeVerified: verification.verified
                    }
                });
            }
            catch (error) {
                console.error(`[ComponentTools] Error setting property:`, error);
                resolve({
                    success: false,
                    error: `Failed to set property: ${error.message}`
                });
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
            var _a, _b;
            // 从脚本路径提取组件类名
            const scriptName = (_a = scriptPath.split('/').pop()) === null || _a === void 0 ? void 0 : _a.replace('.ts', '').replace('.js', '');
            if (!scriptName) {
                resolve({ success: false, error: 'Invalid script path' });
                return;
            }
            // 先查找节点上是否已存在该脚本组件
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
                    const addedScript = allComponentsInfo2.data.components.find((comp) => comp.type === scriptName);
                    if (addedScript) {
                        resolve({
                            success: true,
                            message: `Script '${scriptName}' attached successfully`,
                            data: {
                                nodeUuid: nodeUuid,
                                componentName: scriptName,
                                existing: false
                            }
                        });
                    }
                    else {
                        resolve({
                            success: false,
                            error: `Script '${scriptName}' was not found on node after addition. Available components: ${allComponentsInfo2.data.components.map((c) => c.type).join(', ')}`
                        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2NvbXBvbmVudC10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw0REFBMkU7QUFFM0UsTUFBYSxjQUFjO0lBQ3ZCLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLFdBQVcsRUFBRSwrQ0FBK0M7Z0JBQzVELFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxrS0FBa0s7eUJBQ2xMO3dCQUNELGFBQWEsRUFBRTs0QkFDWCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsdURBQXVEO3lCQUN2RTtxQkFDSjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDO2lCQUMxQzthQUNKO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLGtCQUFrQjtnQkFDeEIsV0FBVyxFQUFFLDBGQUEwRjtnQkFDdkcsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixRQUFRLEVBQUU7NEJBQ04sSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLFdBQVc7eUJBQzNCO3dCQUNELGFBQWEsRUFBRTs0QkFDWCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsd0lBQXdJO3lCQUN4SjtxQkFDSjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDO2lCQUMxQzthQUNKO1lBQ0QseUVBQXlFO1lBQ3pFLDREQUE0RDtZQUM1RDtnQkFDSSxJQUFJLEVBQUUsd0JBQXdCO2dCQUM5QixXQUFXLEVBQUUsK0lBQStJO2dCQUM1SixXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2Qs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QUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDYixPQUFPLENBQUMsS0FBSyxDQUFDLDJCQUEyQixFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2xELE9BQU8sSUFBSSxDQUFDO1FBQ2hCLENBQUM7SUFDTCxDQUFDO0NBQ0o7QUEvMkRELHdDQSsyREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IsIENvbXBvbmVudEluZm8gfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBjcmVhdGVFcnJvclJlc3BvbnNlLCBFUlJPUl9DT0RFUyB9IGZyb20gJy4uL3V0aWxzL2Vycm9yLXJlc3BvbnNlJztcblxuZXhwb3J0IGNsYXNzIENvbXBvbmVudFRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnYWRkX2NvbXBvbmVudCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBZGQgYSBjb21wb25lbnQgdG8gYSBub2RlLiBSZXF1aXJlcyBub2RlVXVpZC4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGFyZ2V0IG5vZGUgVVVJRC4gUkVRVUlSRUQ6IFlvdSBtdXN0IHNwZWNpZnkgdGhlIGV4YWN0IG5vZGUgdG8gYWRkIHRoZSBjb21wb25lbnQgdG8uIFVzZSBnZXRfYWxsX25vZGVzIG9yIGZpbmRfbm9kZV9ieV9uYW1lIHRvIGdldCB0aGUgVVVJRCBvZiB0aGUgZGVzaXJlZCBub2RlLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb21wb25lbnQgdHlwZSAoZS5nLiwgY2MuU3ByaXRlLCBjYy5MYWJlbCwgY2MuQnV0dG9uKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbm9kZVV1aWQnLCAnY29tcG9uZW50VHlwZSddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAncmVtb3ZlX2NvbXBvbmVudCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdSZW1vdmUgYSBjb21wb25lbnQuIGNvbXBvbmVudFR5cGUgbXVzdCBiZSBjaWQgZnJvbSBnZXRDb21wb25lbnRzLCBub3Qgc2NyaXB0L2NsYXNzIG5hbWUuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ05vZGUgVVVJRCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb21wb25lbnQgY2lkICh0eXBlIGZpZWxkIGZyb20gZ2V0Q29tcG9uZW50cykuIERvIE5PVCB1c2Ugc2NyaXB0IG5hbWUgb3IgY2xhc3MgbmFtZS4gRXhhbXBsZTogXCJjYy5TcHJpdGVcIiBvciBcIjliNGE3dWVUOXhENmFSRStBbE91c3kxXCInXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJywgJ2NvbXBvbmVudFR5cGUnXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvLyB2MS42LjA6IGdldF9jb21wb25lbnRzICsgZ2V0X2NvbXBvbmVudF9pbmZvICsgZ2V0X2F2YWlsYWJsZV9jb21wb25lbnRzXG4gICAgICAgICAgICAvLyBtZXJnZWQgaW50byBgcXVlcnkoe2FjdGlvbn0pYCDigJQgc2VlIGJvdHRvbSBvZiBnZXRUb29scygpLlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdzZXRfY29tcG9uZW50X3Byb3BlcnR5JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NldCBhIGNvbXBvbmVudCBwcm9wZXJ0eSAoY2MuTGFiZWwgLyBjYy5TcHJpdGUgLyBjdXN0b20pLiBGb3Igbm9kZSBmaWVsZHMgdXNlIHNldF9ub2RlX3Byb3BlcnR5IC8gc2V0X25vZGVfdHJhbnNmb3JtLiBTZWUgRkVBVFVSRV9HVUlERSDCpzMuNS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGFyZ2V0IG5vZGUgVVVJRCAtIE11c3Qgc3BlY2lmeSB0aGUgbm9kZSB0byBvcGVyYXRlIG9uJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NvbXBvbmVudCB0eXBlIC0gQ2FuIGJlIGJ1aWx0LWluIGNvbXBvbmVudHMgKGUuZy4sIGNjLkxhYmVsKSBvciBjdXN0b20gc2NyaXB0IGNvbXBvbmVudHMgKGUuZy4sIE15U2NyaXB0KS4gSWYgdW5zdXJlIGFib3V0IGNvbXBvbmVudCB0eXBlLCB1c2UgZ2V0X2NvbXBvbmVudHMgZmlyc3QgdG8gcmV0cmlldmUgYWxsIGNvbXBvbmVudHMgb24gdGhlIG5vZGUuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDnp7vpmaRlbnVt6ZmQ5Yi277yM5YWB6K645Lu75oSP57uE5Lu257G75Z6L5YyF5ous6Ieq5a6a5LmJ6ISa5pysXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Byb3BlcnR5IG5hbWUgLSBUaGUgcHJvcGVydHkgdG8gc2V0LiBDb21tb24gcHJvcGVydGllcyBpbmNsdWRlOlxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIGNjLkxhYmVsOiBzdHJpbmcgKHRleHQgY29udGVudCksIGZvbnRTaXplIChmb250IHNpemUpLCBjb2xvciAodGV4dCBjb2xvcilcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBjYy5TcHJpdGU6IHNwcml0ZUZyYW1lIChzcHJpdGUgZnJhbWUpLCBjb2xvciAodGludCBjb2xvciksIHNpemVNb2RlIChzaXplIG1vZGUpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgY2MuQnV0dG9uOiBub3JtYWxDb2xvciAobm9ybWFsIGNvbG9yKSwgcHJlc3NlZENvbG9yIChwcmVzc2VkIGNvbG9yKSwgdGFyZ2V0ICh0YXJnZXQgbm9kZSlcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBjYy5VSVRyYW5zZm9ybTogY29udGVudFNpemUgKGNvbnRlbnQgc2l6ZSksIGFuY2hvclBvaW50IChhbmNob3IgcG9pbnQpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgQ3VzdG9tIFNjcmlwdHM6IEJhc2VkIG9uIHByb3BlcnRpZXMgZGVmaW5lZCBpbiB0aGUgc2NyaXB0J1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5VHlwZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUHJvcGVydHkgdHlwZSAtIE11c3QgZXhwbGljaXRseSBzcGVjaWZ5IHRoZSBwcm9wZXJ0eSBkYXRhIHR5cGUgZm9yIGNvcnJlY3QgdmFsdWUgY29udmVyc2lvbiBhbmQgdmFsaWRhdGlvbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnc3RyaW5nJywgJ251bWJlcicsICdib29sZWFuJywgJ2ludGVnZXInLCAnZmxvYXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY29sb3InLCAndmVjMicsICd2ZWMzJywgJ3NpemUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbm9kZScsICdjb21wb25lbnQnLCAnc3ByaXRlRnJhbWUnLCAncHJlZmFiJywgJ2Fzc2V0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ25vZGVBcnJheScsICdjb2xvckFycmF5JywgJ251bWJlckFycmF5JywgJ3N0cmluZ0FycmF5J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcm9wZXJ0eSB2YWx1ZSAtIFVzZSB0aGUgY29ycmVzcG9uZGluZyBkYXRhIGZvcm1hdCBiYXNlZCBvbiBwcm9wZXJ0eVR5cGU6XFxuXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfwn5OdIEJhc2ljIERhdGEgVHlwZXM6XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgc3RyaW5nOiBcIkhlbGxvIFdvcmxkXCIgKHRleHQgc3RyaW5nKVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIG51bWJlci9pbnRlZ2VyL2Zsb2F0OiA0MiBvciAzLjE0IChudW1lcmljIHZhbHVlKVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIGJvb2xlYW46IHRydWUgb3IgZmFsc2UgKGJvb2xlYW4gdmFsdWUpXFxuXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfwn46oIENvbG9yIFR5cGU6XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgY29sb3I6IHtcInJcIjoyNTUsXCJnXCI6MCxcImJcIjowLFwiYVwiOjI1NX0gKFJHQkEgdmFsdWVzLCByYW5nZSAwLTI1NSlcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyAgLSBBbHRlcm5hdGl2ZTogXCIjRkYwMDAwXCIgKGhleGFkZWNpbWFsIGZvcm1hdClcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyAgLSBUcmFuc3BhcmVuY3k6IGEgdmFsdWUgY29udHJvbHMgb3BhY2l0eSwgMjU1ID0gZnVsbHkgb3BhcXVlLCAwID0gZnVsbHkgdHJhbnNwYXJlbnRcXG5cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ/Cfk5AgVmVjdG9yIGFuZCBTaXplIFR5cGVzOlxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIHZlYzI6IHtcInhcIjoxMDAsXCJ5XCI6NTB9ICgyRCB2ZWN0b3IpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgdmVjMzoge1wieFwiOjEsXCJ5XCI6MixcInpcIjozfSAoM0QgdmVjdG9yKVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIHNpemU6IHtcIndpZHRoXCI6MTAwLFwiaGVpZ2h0XCI6NTB9IChzaXplIGRpbWVuc2lvbnMpXFxuXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfwn5SXIFJlZmVyZW5jZSBUeXBlcyAodXNpbmcgVVVJRCBzdHJpbmdzKTpcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBub2RlOiBcInRhcmdldC1ub2RlLXV1aWRcIiAobm9kZSByZWZlcmVuY2UpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgIEhvdyB0byBnZXQ6IFVzZSBnZXRfYWxsX25vZGVzIG9yIGZpbmRfbm9kZV9ieV9uYW1lIHRvIGdldCBub2RlIFVVSURzXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgY29tcG9uZW50OiBcInRhcmdldC1ub2RlLXV1aWRcIiAoY29tcG9uZW50IHJlZmVyZW5jZSlcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyAgSG93IGl0IHdvcmtzOiBcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyAgICAxLiBQcm92aWRlIHRoZSBVVUlEIG9mIHRoZSBOT0RFIHRoYXQgY29udGFpbnMgdGhlIHRhcmdldCBjb21wb25lbnRcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyAgICAyLiBTeXN0ZW0gYXV0by1kZXRlY3RzIHJlcXVpcmVkIGNvbXBvbmVudCB0eXBlIGZyb20gcHJvcGVydHkgbWV0YWRhdGFcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyAgICAzLiBGaW5kcyB0aGUgY29tcG9uZW50IG9uIHRhcmdldCBub2RlIGFuZCBnZXRzIGl0cyBzY2VuZSBfX2lkX19cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyAgICA0LiBTZXRzIHJlZmVyZW5jZSB1c2luZyB0aGUgc2NlbmUgX19pZF9fIChub3Qgbm9kZSBVVUlEKVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnICBFeGFtcGxlOiB2YWx1ZT1cImxhYmVsLW5vZGUtdXVpZFwiIHdpbGwgZmluZCBjYy5MYWJlbCBhbmQgdXNlIGl0cyBzY2VuZSBJRFxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIHNwcml0ZUZyYW1lOiBcInNwcml0ZWZyYW1lLXV1aWRcIiAoc3ByaXRlIGZyYW1lIGFzc2V0KVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnICBIb3cgdG8gZ2V0OiBDaGVjayBhc3NldCBkYXRhYmFzZSBvciB1c2UgYXNzZXQgYnJvd3NlclxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIHByZWZhYjogXCJwcmVmYWItdXVpZFwiIChwcmVmYWIgYXNzZXQpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgIEhvdyB0byBnZXQ6IENoZWNrIGFzc2V0IGRhdGFiYXNlIG9yIHVzZSBhc3NldCBicm93c2VyXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgYXNzZXQ6IFwiYXNzZXQtdXVpZFwiIChnZW5lcmljIGFzc2V0IHJlZmVyZW5jZSlcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyAgSG93IHRvIGdldDogQ2hlY2sgYXNzZXQgZGF0YWJhc2Ugb3IgdXNlIGFzc2V0IGJyb3dzZXJcXG5cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ/Cfk4sgQXJyYXkgVHlwZXM6XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgbm9kZUFycmF5OiBbXCJ1dWlkMVwiLFwidXVpZDJcIl0gKGFycmF5IG9mIG5vZGUgVVVJRHMpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgY29sb3JBcnJheTogW3tcInJcIjoyNTUsXCJnXCI6MCxcImJcIjowLFwiYVwiOjI1NX1dIChhcnJheSBvZiBjb2xvcnMpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgbnVtYmVyQXJyYXk6IFsxLDIsMyw0LDVdIChhcnJheSBvZiBudW1iZXJzKVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIHN0cmluZ0FycmF5OiBbXCJpdGVtMVwiLFwiaXRlbTJcIl0gKGFycmF5IG9mIHN0cmluZ3MpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydub2RlVXVpZCcsICdjb21wb25lbnRUeXBlJywgJ3Byb3BlcnR5JywgJ3Byb3BlcnR5VHlwZScsICd2YWx1ZSddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnYXR0YWNoX3NjcmlwdCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBdHRhY2ggYSBzY3JpcHQgY29tcG9uZW50IHRvIGEgbm9kZScsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOb2RlIFVVSUQnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgc2NyaXB0UGF0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2NyaXB0IGFzc2V0IHBhdGggKGUuZy4sIGRiOi8vYXNzZXRzL3NjcmlwdHMvTXlTY3JpcHQudHMpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydub2RlVXVpZCcsICdzY3JpcHRQYXRoJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdxdWVyeScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdVbmlmaWVkIGNvbXBvbmVudCBxdWVyeSAodjEuNi4wKS4gYWN0aW9uPWxpc3Q6IGFsbCBjb21wb25lbnRzIG9uIGEgbm9kZS4gYWN0aW9uPWluZm86IG9uZSBzcGVjaWZpYyBjb21wb25lbnQuIGFjdGlvbj1hdmFpbGFibGU6IGxpc3Qgb2YgYXZhaWxhYmxlIGNvbXBvbmVudCB0eXBlcyBieSBjYXRlZ29yeS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2xpc3QnLCAnaW5mbycsICdhdmFpbGFibGUnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1doaWNoIHF1ZXJ5IHRvIHBlcmZvcm0nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVGFyZ2V0IG5vZGUgVVVJRCAocmVxdWlyZWQgZm9yIGxpc3QvaW5mbyknIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NvbXBvbmVudCB0eXBlIChyZXF1aXJlZCBmb3IgaW5mbyknIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnYWxsJywgJ3JlbmRlcmVyJywgJ3VpJywgJ3BoeXNpY3MnLCAnYW5pbWF0aW9uJywgJ2F1ZGlvJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdGb3IgYXZhaWxhYmxlOiBmaWx0ZXIgYnkgY2F0ZWdvcnknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICdhbGwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnYmF0Y2hfc2V0X3Byb3BlcnRpZXMnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2V0IE4gcHJvcGVydGllcyBvbiBvbmUgY29tcG9uZW50IGluIGEgc2luZ2xlIGNhbGwuIFBlci1wcm9wZXJ0eSBmYWlsdXJlcyBhcmUgaXNvbGF0ZWQgKHN1Y2NlZWRlZC9mYWlsZWQgbGlzdHMpLiBQcmVmZXJyZWQgb3ZlciBOIHNlcGFyYXRlIHNldF9jb21wb25lbnRfcHJvcGVydHkgY2FsbHMuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBub2RlIFVVSUQnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29tcG9uZW50IHR5cGUgKGUuZy4sIGNjLkxhYmVsLCBjYy5TcHJpdGUsIGNjLkxheW91dCwgY2MuVUlUcmFuc2Zvcm0pLiBJZiB1bnN1cmUsIGNhbGwgZ2V0X2NvbXBvbmVudHMgZmlyc3QuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUHJvcGVydHkgZW50cmllcy4gRWFjaCBtdXN0IGluY2x1ZGUgcHJvcGVydHkgbmFtZSwgcHJvcGVydHlUeXBlIChmb3IgdHlwZSBjb252ZXJzaW9uKSwgYW5kIHZhbHVlLiBTYW1lIHNoYXBlIGFzIHNldF9jb21wb25lbnRfcHJvcGVydHkgaW5kaXZpZHVhbCBjYWxscy4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdQcm9wZXJ0eSBuYW1lIChlLmcuLCBcInN0cmluZ1wiLCBcImZvbnRTaXplXCIsIFwiY29udGVudFNpemVcIiknIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVR5cGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0RhdGEgdHlwZSBmb3IgY29udmVyc2lvbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydzdHJpbmcnLCAnbnVtYmVyJywgJ2Jvb2xlYW4nLCAnaW50ZWdlcicsICdmbG9hdCcsICdjb2xvcicsICd2ZWMyJywgJ3ZlYzMnLCAnc2l6ZScsICdub2RlJywgJ2NvbXBvbmVudCcsICdzcHJpdGVGcmFtZScsICdwcmVmYWInLCAnYXNzZXQnLCAnbm9kZUFycmF5JywgJ2NvbG9yQXJyYXknLCAnbnVtYmVyQXJyYXknLCAnc3RyaW5nQXJyYXknXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IGRlc2NyaXB0aW9uOiAnUHJvcGVydHkgdmFsdWUgKGFueSB0eXBlOyBtYXRjaGVzIHByb3BlcnR5VHlwZSknIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsncHJvcGVydHknLCAncHJvcGVydHlUeXBlJywgJ3ZhbHVlJ11cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJywgJ2NvbXBvbmVudFR5cGUnLCAncHJvcGVydGllcyddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xuICAgICAgICAgICAgY2FzZSAnYWRkX2NvbXBvbmVudCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYWRkQ29tcG9uZW50KGFyZ3Mubm9kZVV1aWQsIGFyZ3MuY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICBjYXNlICdyZW1vdmVfY29tcG9uZW50JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZW1vdmVDb21wb25lbnQoYXJncy5ub2RlVXVpZCwgYXJncy5jb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9jb21wb25lbnRzJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKGFyZ3Mubm9kZVV1aWQpO1xuICAgICAgICAgICAgY2FzZSAnZ2V0X2NvbXBvbmVudF9pbmZvJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRJbmZvKGFyZ3Mubm9kZVV1aWQsIGFyZ3MuY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICBjYXNlICdzZXRfY29tcG9uZW50X3Byb3BlcnR5JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zZXRDb21wb25lbnRQcm9wZXJ0eShhcmdzKTtcbiAgICAgICAgICAgIGNhc2UgJ2F0dGFjaF9zY3JpcHQnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmF0dGFjaFNjcmlwdChhcmdzLm5vZGVVdWlkLCBhcmdzLnNjcmlwdFBhdGgpO1xuICAgICAgICAgICAgY2FzZSAnZ2V0X2F2YWlsYWJsZV9jb21wb25lbnRzJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRBdmFpbGFibGVDb21wb25lbnRzKGFyZ3MuY2F0ZWdvcnkpO1xuICAgICAgICAgICAgY2FzZSAnYmF0Y2hfc2V0X3Byb3BlcnRpZXMnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmJhdGNoU2V0UHJvcGVydGllcyhhcmdzKTtcbiAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5JzpcbiAgICAgICAgICAgICAgICAvLyB2MS42LjAgdW5pZmllZCBhY3Rpb24tY29kZSBkaXNwYXRjaGVyXG4gICAgICAgICAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdsaXN0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldENvbXBvbmVudHMoYXJncy5ub2RlVXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2luZm8nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50SW5mbyhhcmdzLm5vZGVVdWlkLCBhcmdzLmNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdhdmFpbGFibGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0QXZhaWxhYmxlQ29tcG9uZW50cyhhcmdzLmNhdGVnb3J5KTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVSUk9SX0NPREVTLklOVkFMSURfUEFSQU1TLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBVbmtub3duIHF1ZXJ5IGFjdGlvbjogJHthcmdzLmFjdGlvbn1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgc3VnZ2VzdGlvbjogJ1VzZSBhY3Rpb246IFwibGlzdFwiIHwgXCJpbmZvXCIgfCBcImF2YWlsYWJsZVwiJyB9XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGFkZENvbXBvbmVudChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIC8vIOWFiOafpeaJvuiKgueCueS4iuaYr+WQpuW3suWtmOWcqOivpee7hOS7tlxuICAgICAgICAgICAgY29uc3QgYWxsQ29tcG9uZW50c0luZm8gPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudHMobm9kZVV1aWQpO1xuICAgICAgICAgICAgaWYgKGFsbENvbXBvbmVudHNJbmZvLnN1Y2Nlc3MgJiYgYWxsQ29tcG9uZW50c0luZm8uZGF0YT8uY29tcG9uZW50cykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nQ29tcG9uZW50ID0gYWxsQ29tcG9uZW50c0luZm8uZGF0YS5jb21wb25lbnRzLmZpbmQoKGNvbXA6IGFueSkgPT4gY29tcC50eXBlID09PSBjb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgICAgICBpZiAoZXhpc3RpbmdDb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYENvbXBvbmVudCAnJHtjb21wb25lbnRUeXBlfScgYWxyZWFkeSBleGlzdHMgb24gbm9kZWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VmVyaWZpZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhpc3Rpbmc6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyDlsJ3or5Xnm7TmjqXkvb/nlKggRWRpdG9yIEFQSSDmt7vliqDnu4Tku7ZcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2NyZWF0ZS1jb21wb25lbnQnLCB7XG4gICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgY29tcG9uZW50OiBjb21wb25lbnRUeXBlXG4gICAgICAgICAgICB9KS50aGVuKGFzeW5jIChyZXN1bHQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIOetieW+heS4gOauteaXtumXtOiuqUVkaXRvcuWujOaIkOe7hOS7tua3u+WKoFxuICAgICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKTtcbiAgICAgICAgICAgICAgICAvLyDph43mlrDmn6Xor6LoioLngrnkv6Hmga/pqozor4Hnu4Tku7bmmK/lkKbnnJ/nmoTmt7vliqDmiJDlip9cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhbGxDb21wb25lbnRzSW5mbzIgPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudHMobm9kZVV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWxsQ29tcG9uZW50c0luZm8yLnN1Y2Nlc3MgJiYgYWxsQ29tcG9uZW50c0luZm8yLmRhdGE/LmNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFkZGVkQ29tcG9uZW50ID0gYWxsQ29tcG9uZW50c0luZm8yLmRhdGEuY29tcG9uZW50cy5maW5kKChjb21wOiBhbnkpID0+IGNvbXAudHlwZSA9PT0gY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWRkZWRDb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYENvbXBvbmVudCAnJHtjb21wb25lbnRUeXBlfScgYWRkZWQgc3VjY2Vzc2Z1bGx5YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFZlcmlmaWVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhpc3Rpbmc6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYENvbXBvbmVudCAnJHtjb21wb25lbnRUeXBlfScgd2FzIG5vdCBmb3VuZCBvbiBub2RlIGFmdGVyIGFkZGl0aW9uLiBBdmFpbGFibGUgY29tcG9uZW50czogJHthbGxDb21wb25lbnRzSW5mbzIuZGF0YS5jb21wb25lbnRzLm1hcCgoYzogYW55KSA9PiBjLnR5cGUpLmpvaW4oJywgJyl9YFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gdmVyaWZ5IGNvbXBvbmVudCBhZGRpdGlvbjogJHthbGxDb21wb25lbnRzSW5mbzIuZXJyb3IgfHwgJ1VuYWJsZSB0byBnZXQgbm9kZSBjb21wb25lbnRzJ31gXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKHZlcmlmeUVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIHZlcmlmeSBjb21wb25lbnQgYWRkaXRpb246ICR7dmVyaWZ5RXJyb3IubWVzc2FnZX1gXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8g5aSH55So5pa55qGI77ya5L2/55So5Zy65pmv6ISa5pysXG4gICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdhZGRDb21wb25lbnRUb05vZGUnLFxuICAgICAgICAgICAgICAgICAgICBhcmdzOiBbbm9kZVV1aWQsIGNvbXBvbmVudFR5cGVdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIG9wdGlvbnMpLnRoZW4oKHJlc3VsdDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyMjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYERpcmVjdCBBUEkgZmFpbGVkOiAke2Vyci5tZXNzYWdlfSwgU2NlbmUgc2NyaXB0IGZhaWxlZDogJHtlcnIyLm1lc3NhZ2V9YCB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlbW92ZUNvbXBvbmVudChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIC8vIDEuIOafpeaJvuiKgueCueS4iueahOaJgOaciee7hOS7tlxuICAgICAgICAgICAgY29uc3QgYWxsQ29tcG9uZW50c0luZm8gPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudHMobm9kZVV1aWQpO1xuICAgICAgICAgICAgaWYgKCFhbGxDb21wb25lbnRzSW5mby5zdWNjZXNzIHx8ICFhbGxDb21wb25lbnRzSW5mby5kYXRhPy5jb21wb25lbnRzKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZhaWxlZCB0byBnZXQgY29tcG9uZW50cyBmb3Igbm9kZSAnJHtub2RlVXVpZH0nOiAke2FsbENvbXBvbmVudHNJbmZvLmVycm9yfWAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gMi4g5Y+q5p+l5om+dHlwZeWtl+auteetieS6jmNvbXBvbmVudFR5cGXnmoTnu4Tku7bvvIjljbNjaWTvvIlcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0cyA9IGFsbENvbXBvbmVudHNJbmZvLmRhdGEuY29tcG9uZW50cy5zb21lKChjb21wOiBhbnkpID0+IGNvbXAudHlwZSA9PT0gY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICBpZiAoIWV4aXN0cykge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgY2lkICcke2NvbXBvbmVudFR5cGV9JyBub3QgZm91bmQgb24gbm9kZSAnJHtub2RlVXVpZH0nLiDor7fnlKhnZXRDb21wb25lbnRz6I635Y+WdHlwZeWtl+aute+8iGNpZO+8ieS9nOS4umNvbXBvbmVudFR5cGXjgIJgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIDMuIOWumOaWuUFQSeebtOaOpeenu+mZpFxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdyZW1vdmUtY29tcG9uZW50Jywge1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50OiBjb21wb25lbnRUeXBlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8gNC4g5YaN5p+l5LiA5qyh56Gu6K6k5piv5ZCm56e76ZmkXG4gICAgICAgICAgICAgICAgY29uc3QgYWZ0ZXJSZW1vdmVJbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGlsbEV4aXN0cyA9IGFmdGVyUmVtb3ZlSW5mby5zdWNjZXNzICYmIGFmdGVyUmVtb3ZlSW5mby5kYXRhPy5jb21wb25lbnRzPy5zb21lKChjb21wOiBhbnkpID0+IGNvbXAudHlwZSA9PT0gY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICAgICAgaWYgKHN0aWxsRXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgY2lkICcke2NvbXBvbmVudFR5cGV9JyB3YXMgbm90IHJlbW92ZWQgZnJvbSBub2RlICcke25vZGVVdWlkfScuYCB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQ29tcG9uZW50IGNpZCAnJHtjb21wb25lbnRUeXBlfScgcmVtb3ZlZCBzdWNjZXNzZnVsbHkgZnJvbSBub2RlICcke25vZGVVdWlkfSdgLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogeyBub2RlVXVpZCwgY29tcG9uZW50VHlwZSB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZhaWxlZCB0byByZW1vdmUgY29tcG9uZW50OiAke2Vyci5tZXNzYWdlfWAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0Q29tcG9uZW50cyhub2RlVXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAvLyDkvJjlhYjlsJ3or5Xnm7TmjqXkvb/nlKggRWRpdG9yIEFQSSDmn6Xor6LoioLngrnkv6Hmga9cbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCkudGhlbigobm9kZURhdGE6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChub2RlRGF0YSAmJiBub2RlRGF0YS5fX2NvbXBzX18pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcG9uZW50cyA9IG5vZGVEYXRhLl9fY29tcHNfXy5tYXAoKGNvbXA6IGFueSkgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGNvbXAuX190eXBlX18gfHwgY29tcC5jaWQgfHwgY29tcC50eXBlIHx8ICdVbmtub3duJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IGNvbXAudXVpZD8udmFsdWUgfHwgY29tcC51dWlkIHx8IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBjb21wLmVuYWJsZWQgIT09IHVuZGVmaW5lZCA/IGNvbXAuZW5hYmxlZCA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB0aGlzLmV4dHJhY3RDb21wb25lbnRQcm9wZXJ0aWVzKGNvbXApXG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50czogY29tcG9uZW50c1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm9kZSBub3QgZm91bmQgb3Igbm8gY29tcG9uZW50cyBkYXRhJyB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIC8vIOWkh+eUqOaWueahiO+8muS9v+eUqOWcuuaZr+iEmuacrFxuICAgICAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnZ2V0Tm9kZUluZm8nLFxuICAgICAgICAgICAgICAgICAgICBhcmdzOiBbbm9kZVV1aWRdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIG9wdGlvbnMpLnRoZW4oKHJlc3VsdDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiByZXN1bHQuZGF0YS5jb21wb25lbnRzXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRGlyZWN0IEFQSSBmYWlsZWQ6ICR7ZXJyLm1lc3NhZ2V9LCBTY2VuZSBzY3JpcHQgZmFpbGVkOiAke2VycjIubWVzc2FnZX1gIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0Q29tcG9uZW50SW5mbyhub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIC8vIOS8mOWFiOWwneivleebtOaOpeS9v+eUqCBFZGl0b3IgQVBJIOafpeivouiKgueCueS/oeaBr1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVVdWlkKS50aGVuKChub2RlRGF0YTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGVEYXRhICYmIG5vZGVEYXRhLl9fY29tcHNfXykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wb25lbnQgPSBub2RlRGF0YS5fX2NvbXBzX18uZmluZCgoY29tcDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wVHlwZSA9IGNvbXAuX190eXBlX18gfHwgY29tcC5jaWQgfHwgY29tcC50eXBlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbXBUeXBlID09PSBjb21wb25lbnRUeXBlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGNvbXBvbmVudC5lbmFibGVkICE9PSB1bmRlZmluZWQgPyBjb21wb25lbnQuZW5hYmxlZCA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHRoaXMuZXh0cmFjdENvbXBvbmVudFByb3BlcnRpZXMoY29tcG9uZW50KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAnJHtjb21wb25lbnRUeXBlfScgbm90IGZvdW5kIG9uIG5vZGVgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vZGUgbm90IGZvdW5kIG9yIG5vIGNvbXBvbmVudHMgZGF0YScgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAvLyDlpIfnlKjmlrnmoYjvvJrkvb/nlKjlnLrmma/ohJrmnKxcbiAgICAgICAgICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ2dldE5vZGVJbmZvJyxcbiAgICAgICAgICAgICAgICAgICAgYXJnczogW25vZGVVdWlkXVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCBvcHRpb25zKS50aGVuKChyZXN1bHQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0LnN1Y2Nlc3MgJiYgcmVzdWx0LmRhdGEuY29tcG9uZW50cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gcmVzdWx0LmRhdGEuY29tcG9uZW50cy5maW5kKChjb21wOiBhbnkpID0+IGNvbXAudHlwZSA9PT0gY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5jb21wb25lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICcke2NvbXBvbmVudFR5cGV9JyBub3QgZm91bmQgb24gbm9kZWAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiByZXN1bHQuZXJyb3IgfHwgJ0ZhaWxlZCB0byBnZXQgY29tcG9uZW50IGluZm8nIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycjI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBEaXJlY3QgQVBJIGZhaWxlZDogJHtlcnIubWVzc2FnZX0sIFNjZW5lIHNjcmlwdCBmYWlsZWQ6ICR7ZXJyMi5tZXNzYWdlfWAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBleHRyYWN0Q29tcG9uZW50UHJvcGVydGllcyhjb21wb25lbnQ6IGFueSk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhgW2V4dHJhY3RDb21wb25lbnRQcm9wZXJ0aWVzXSBQcm9jZXNzaW5nIGNvbXBvbmVudDpgLCBPYmplY3Qua2V5cyhjb21wb25lbnQpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIOajgOafpee7hOS7tuaYr+WQpuaciSB2YWx1ZSDlsZ7mgKfvvIzov5npgJrluLjljIXlkKvlrp7pmYXnmoTnu4Tku7blsZ7mgKdcbiAgICAgICAgaWYgKGNvbXBvbmVudC52YWx1ZSAmJiB0eXBlb2YgY29tcG9uZW50LnZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFtleHRyYWN0Q29tcG9uZW50UHJvcGVydGllc10gRm91bmQgY29tcG9uZW50LnZhbHVlIHdpdGggcHJvcGVydGllczpgLCBPYmplY3Qua2V5cyhjb21wb25lbnQudmFsdWUpKTtcbiAgICAgICAgICAgIHJldHVybiBjb21wb25lbnQudmFsdWU7IC8vIOebtOaOpei/lOWbniB2YWx1ZSDlr7nosaHvvIzlroPljIXlkKvmiYDmnInnu4Tku7blsZ7mgKdcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8g5aSH55So5pa55qGI77ya5LuO57uE5Lu25a+56LGh5Lit55u05o6l5o+Q5Y+W5bGe5oCnXG4gICAgICAgIGNvbnN0IHByb3BlcnRpZXM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcbiAgICAgICAgY29uc3QgZXhjbHVkZUtleXMgPSBbJ19fdHlwZV9fJywgJ2VuYWJsZWQnLCAnbm9kZScsICdfaWQnLCAnX19zY3JpcHRBc3NldCcsICd1dWlkJywgJ25hbWUnLCAnX25hbWUnLCAnX29iakZsYWdzJywgJ19lbmFibGVkJywgJ3R5cGUnLCAncmVhZG9ubHknLCAndmlzaWJsZScsICdjaWQnLCAnZWRpdG9yJywgJ2V4dGVuZHMnXTtcbiAgICAgICAgXG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIGNvbXBvbmVudCkge1xuICAgICAgICAgICAgaWYgKCFleGNsdWRlS2V5cy5pbmNsdWRlcyhrZXkpICYmICFrZXkuc3RhcnRzV2l0aCgnXycpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtleHRyYWN0Q29tcG9uZW50UHJvcGVydGllc10gRm91bmQgZGlyZWN0IHByb3BlcnR5ICcke2tleX0nOmAsIHR5cGVvZiBjb21wb25lbnRba2V5XSk7XG4gICAgICAgICAgICAgICAgcHJvcGVydGllc1trZXldID0gY29tcG9uZW50W2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnNvbGUubG9nKGBbZXh0cmFjdENvbXBvbmVudFByb3BlcnRpZXNdIEZpbmFsIGV4dHJhY3RlZCBwcm9wZXJ0aWVzOmAsIE9iamVjdC5rZXlzKHByb3BlcnRpZXMpKTtcbiAgICAgICAgcmV0dXJuIHByb3BlcnRpZXM7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBmaW5kQ29tcG9uZW50VHlwZUJ5VXVpZChjb21wb25lbnRVdWlkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICAgICAgY29uc29sZS5sb2coYFtmaW5kQ29tcG9uZW50VHlwZUJ5VXVpZF0gU2VhcmNoaW5nIGZvciBjb21wb25lbnQgdHlwZSB3aXRoIFVVSUQ6ICR7Y29tcG9uZW50VXVpZH1gKTtcbiAgICAgICAgaWYgKCFjb21wb25lbnRVdWlkKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qgbm9kZVRyZWUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlLXRyZWUnKTtcbiAgICAgICAgICAgIGlmICghbm9kZVRyZWUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tmaW5kQ29tcG9uZW50VHlwZUJ5VXVpZF0gRmFpbGVkIHRvIHF1ZXJ5IG5vZGUgdHJlZS4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcXVldWU6IGFueVtdID0gW25vZGVUcmVlXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgd2hpbGUgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50Tm9kZUluZm8gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgIGlmICghY3VycmVudE5vZGVJbmZvIHx8ICFjdXJyZW50Tm9kZUluZm8udXVpZCkge1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmdWxsTm9kZURhdGEgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgY3VycmVudE5vZGVJbmZvLnV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZnVsbE5vZGVEYXRhICYmIGZ1bGxOb2RlRGF0YS5fX2NvbXBzX18pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29tcCBvZiBmdWxsTm9kZURhdGEuX19jb21wc19fKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcEFueSA9IGNvbXAgYXMgYW55OyAvLyBDYXN0IHRvIGFueSB0byBhY2Nlc3MgZHluYW1pYyBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGNvbXBvbmVudCBVVUlEIGlzIG5lc3RlZCBpbiB0aGUgJ3ZhbHVlJyBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wQW55LnV1aWQgJiYgY29tcEFueS51dWlkLnZhbHVlID09PSBjb21wb25lbnRVdWlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudFR5cGUgPSBjb21wQW55Ll9fdHlwZV9fO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW2ZpbmRDb21wb25lbnRUeXBlQnlVdWlkXSBGb3VuZCBjb21wb25lbnQgdHlwZSAnJHtjb21wb25lbnRUeXBlfScgZm9yIFVVSUQgJHtjb21wb25lbnRVdWlkfSBvbiBub2RlICR7ZnVsbE5vZGVEYXRhLm5hbWU/LnZhbHVlfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29tcG9uZW50VHlwZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgW2ZpbmRDb21wb25lbnRUeXBlQnlVdWlkXSBDb3VsZCBub3QgcXVlcnkgbm9kZSAke2N1cnJlbnROb2RlSW5mby51dWlkfTpgLCBlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudE5vZGVJbmZvLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY3VycmVudE5vZGVJbmZvLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBxdWV1ZS5wdXNoKGNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc29sZS53YXJuKGBbZmluZENvbXBvbmVudFR5cGVCeVV1aWRdIENvbXBvbmVudCB3aXRoIFVVSUQgJHtjb21wb25lbnRVdWlkfSBub3QgZm91bmQgaW4gc2NlbmUgdHJlZS5gKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgW2ZpbmRDb21wb25lbnRUeXBlQnlVdWlkXSBFcnJvciB3aGlsZSBzZWFyY2hpbmcgZm9yIGNvbXBvbmVudCB0eXBlOmAsIGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzZXRDb21wb25lbnRQcm9wZXJ0eShhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBub2RlVXVpZCwgY29tcG9uZW50VHlwZSwgcHJvcGVydHksIHByb3BlcnR5VHlwZSwgdmFsdWUgfSA9IGFyZ3M7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gU2V0dGluZyAke2NvbXBvbmVudFR5cGV9LiR7cHJvcGVydHl9ICh0eXBlOiAke3Byb3BlcnR5VHlwZX0pID0gJHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9IG9uIG5vZGUgJHtub2RlVXVpZH1gKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTdGVwIDA6IOajgOa1i+aYr+WQpuS4uuiKgueCueWxnuaAp++8jOWmguaenOaYr+WImemHjeWumuWQkeWIsOWvueW6lOeahOiKgueCueaWueazlVxuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVSZWRpcmVjdFJlc3VsdCA9IGF3YWl0IHRoaXMuY2hlY2tBbmRSZWRpcmVjdE5vZGVQcm9wZXJ0aWVzKGFyZ3MpO1xuICAgICAgICAgICAgICAgIGlmIChub2RlUmVkaXJlY3RSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShub2RlUmVkaXJlY3RSZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFN0ZXAgMTog6I635Y+W57uE5Lu25L+h5oGv77yM5L2/55So5LiOZ2V0Q29tcG9uZW50c+ebuOWQjOeahOaWueazlVxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudHNSZXNwb25zZSA9IGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50cyhub2RlVXVpZCk7XG4gICAgICAgICAgICAgICAgaWYgKCFjb21wb25lbnRzUmVzcG9uc2Uuc3VjY2VzcyB8fCAhY29tcG9uZW50c1Jlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIGdldCBjb21wb25lbnRzIGZvciBub2RlICcke25vZGVVdWlkfSc6ICR7Y29tcG9uZW50c1Jlc3BvbnNlLmVycm9yfWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogYFBsZWFzZSB2ZXJpZnkgdGhhdCBub2RlIFVVSUQgJyR7bm9kZVV1aWR9JyBpcyBjb3JyZWN0LiBVc2UgZ2V0X2FsbF9ub2RlcyBvciBmaW5kX25vZGVfYnlfbmFtZSB0byBnZXQgdGhlIGNvcnJlY3Qgbm9kZSBVVUlELmBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgYWxsQ29tcG9uZW50cyA9IGNvbXBvbmVudHNSZXNwb25zZS5kYXRhLmNvbXBvbmVudHM7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU3RlcCAyOiDmn6Xmib7nm67moIfnu4Tku7ZcbiAgICAgICAgICAgICAgICBsZXQgdGFyZ2V0Q29tcG9uZW50ID0gbnVsbDtcbiAgICAgICAgICAgICAgICBjb25zdCBhdmFpbGFibGVUeXBlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFsbENvbXBvbmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcCA9IGFsbENvbXBvbmVudHNbaV07XG4gICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVR5cGVzLnB1c2goY29tcC50eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21wLnR5cGUgPT09IGNvbXBvbmVudFR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldENvbXBvbmVudCA9IGNvbXA7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIXRhcmdldENvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICAvLyDmj5Dkvpvmm7Tor6bnu4bnmoTplJnor6/kv6Hmga/lkozlu7rorq5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5zdHJ1Y3Rpb24gPSB0aGlzLmdlbmVyYXRlQ29tcG9uZW50U3VnZ2VzdGlvbihjb21wb25lbnRUeXBlLCBhdmFpbGFibGVUeXBlcywgcHJvcGVydHkpO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBDb21wb25lbnQgJyR7Y29tcG9uZW50VHlwZX0nIG5vdCBmb3VuZCBvbiBub2RlLiBBdmFpbGFibGUgY29tcG9uZW50czogJHthdmFpbGFibGVUeXBlcy5qb2luKCcsICcpfWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogaW5zdHJ1Y3Rpb25cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU3RlcCAzOiDoh6rliqjmo4DmtYvlkozovazmjaLlsZ7mgKflgLxcbiAgICAgICAgICAgICAgICBsZXQgcHJvcGVydHlJbmZvO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbQ29tcG9uZW50VG9vbHNdIEFuYWx5emluZyBwcm9wZXJ0eTogJHtwcm9wZXJ0eX1gKTtcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlJbmZvID0gdGhpcy5hbmFseXplUHJvcGVydHkodGFyZ2V0Q29tcG9uZW50LCBwcm9wZXJ0eSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoYW5hbHl6ZUVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgW0NvbXBvbmVudFRvb2xzXSBFcnJvciBpbiBhbmFseXplUHJvcGVydHk6YCwgYW5hbHl6ZUVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIGFuYWx5emUgcHJvcGVydHkgJyR7cHJvcGVydHl9JzogJHthbmFseXplRXJyb3IubWVzc2FnZX1gXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghcHJvcGVydHlJbmZvLmV4aXN0cykge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBQcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIG5vdCBmb3VuZCBvbiBjb21wb25lbnQgJyR7Y29tcG9uZW50VHlwZX0nLiBBdmFpbGFibGUgcHJvcGVydGllczogJHtwcm9wZXJ0eUluZm8uYXZhaWxhYmxlUHJvcGVydGllcy5qb2luKCcsICcpfWBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU3RlcCA0OiDlpITnkIblsZ7mgKflgLzlkozorr7nva5cbiAgICAgICAgICAgICAgICBjb25zdCBvcmlnaW5hbFZhbHVlID0gcHJvcGVydHlJbmZvLm9yaWdpbmFsVmFsdWU7XG4gICAgICAgICAgICAgICAgbGV0IHByb2Nlc3NlZFZhbHVlOiBhbnk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8g5qC55o2u5piO56Gu55qEcHJvcGVydHlUeXBl5aSE55CG5bGe5oCn5YC8XG4gICAgICAgICAgICAgICAgc3dpdGNoIChwcm9wZXJ0eVR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbnRlZ2VyJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZmxvYXQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSBCb29sZWFuKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdjb2xvcic6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWtl+espuS4suagvOW8j++8muaUr+aMgeWNgeWFrei/m+WItuOAgeminOiJsuWQjeensOOAgXJnYigpL3JnYmEoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gdGhpcy5wYXJzZUNvbG9yU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWvueixoeagvOW8j++8mumqjOivgeW5tui9rOaNolJHQkHlgLxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIodmFsdWUucikgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcih2YWx1ZS5nKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGI6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKHZhbHVlLmIpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYTogdmFsdWUuYSAhPT0gdW5kZWZpbmVkID8gTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIodmFsdWUuYSkpKSA6IDI1NVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29sb3IgdmFsdWUgbXVzdCBiZSBhbiBvYmplY3Qgd2l0aCByLCBnLCBiIHByb3BlcnRpZXMgb3IgYSBoZXhhZGVjaW1hbCBzdHJpbmcgKGUuZy4sIFwiI0ZGMDAwMFwiKScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3ZlYzInOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogTnVtYmVyKHZhbHVlLngpIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IE51bWJlcih2YWx1ZS55KSB8fCAwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdWZWMyIHZhbHVlIG11c3QgYmUgYW4gb2JqZWN0IHdpdGggeCwgeSBwcm9wZXJ0aWVzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndmVjMyc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBOdW1iZXIodmFsdWUueCkgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogTnVtYmVyKHZhbHVlLnkpIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHo6IE51bWJlcih2YWx1ZS56KSB8fCAwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdWZWMzIHZhbHVlIG11c3QgYmUgYW4gb2JqZWN0IHdpdGggeCwgeSwgeiBwcm9wZXJ0aWVzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc2l6ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogTnVtYmVyKHZhbHVlLndpZHRoKSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IE51bWJlcih2YWx1ZS5oZWlnaHQpIHx8IDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NpemUgdmFsdWUgbXVzdCBiZSBhbiBvYmplY3Qgd2l0aCB3aWR0aCwgaGVpZ2h0IHByb3BlcnRpZXMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdub2RlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB7IHV1aWQ6IHZhbHVlIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm9kZSByZWZlcmVuY2UgdmFsdWUgbXVzdCBiZSBhIHN0cmluZyBVVUlEJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnY29tcG9uZW50JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g57uE5Lu25byV55So6ZyA6KaB54m55q6K5aSE55CG77ya6YCa6L+H6IqC54K5VVVJROaJvuWIsOe7hOS7tueahF9faWRfX1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gdmFsdWU7IC8vIOWFiOS/neWtmOiKgueCuVVVSUTvvIzlkI7nu63kvJrovazmjaLkuLpfX2lkX19cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb21wb25lbnQgcmVmZXJlbmNlIHZhbHVlIG11c3QgYmUgYSBzdHJpbmcgKG5vZGUgVVVJRCBjb250YWluaW5nIHRoZSB0YXJnZXQgY29tcG9uZW50KScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3Nwcml0ZUZyYW1lJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncHJlZmFiJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYXNzZXQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHsgdXVpZDogdmFsdWUgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3Byb3BlcnR5VHlwZX0gdmFsdWUgbXVzdCBiZSBhIHN0cmluZyBVVUlEYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbm9kZUFycmF5JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gdmFsdWUubWFwKChpdGVtOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdXVpZDogaXRlbSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb2RlQXJyYXkgaXRlbXMgbXVzdCBiZSBzdHJpbmcgVVVJRHMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vZGVBcnJheSB2YWx1ZSBtdXN0IGJlIGFuIGFycmF5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnY29sb3JBcnJheSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHZhbHVlLm1hcCgoaXRlbTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCcgJiYgaXRlbSAhPT0gbnVsbCAmJiAncicgaW4gaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLnIpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLmcpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLmIpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhOiBpdGVtLmEgIT09IHVuZGVmaW5lZCA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGl0ZW0uYSkpKSA6IDI1NVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHI6IDI1NSwgZzogMjU1LCBiOiAyNTUsIGE6IDI1NSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29sb3JBcnJheSB2YWx1ZSBtdXN0IGJlIGFuIGFycmF5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbnVtYmVyQXJyYXknOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB2YWx1ZS5tYXAoKGl0ZW06IGFueSkgPT4gTnVtYmVyKGl0ZW0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOdW1iZXJBcnJheSB2YWx1ZSBtdXN0IGJlIGFuIGFycmF5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nQXJyYXknOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB2YWx1ZS5tYXAoKGl0ZW06IGFueSkgPT4gU3RyaW5nKGl0ZW0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTdHJpbmdBcnJheSB2YWx1ZSBtdXN0IGJlIGFuIGFycmF5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgcHJvcGVydHkgdHlwZTogJHtwcm9wZXJ0eVR5cGV9YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbQ29tcG9uZW50VG9vbHNdIENvbnZlcnRpbmcgdmFsdWU6ICR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfSAtPiAke0pTT04uc3RyaW5naWZ5KHByb2Nlc3NlZFZhbHVlKX0gKHR5cGU6ICR7cHJvcGVydHlUeXBlfSlgKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBQcm9wZXJ0eSBhbmFseXNpcyByZXN1bHQ6IHByb3BlcnR5SW5mby50eXBlPVwiJHtwcm9wZXJ0eUluZm8udHlwZX1cIiwgcHJvcGVydHlUeXBlPVwiJHtwcm9wZXJ0eVR5cGV9XCJgKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBXaWxsIHVzZSBjb2xvciBzcGVjaWFsIGhhbmRsaW5nOiAke3Byb3BlcnR5VHlwZSA9PT0gJ2NvbG9yJyAmJiBwcm9jZXNzZWRWYWx1ZSAmJiB0eXBlb2YgcHJvY2Vzc2VkVmFsdWUgPT09ICdvYmplY3QnfWApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIOeUqOS6jumqjOivgeeahOWunumZheacn+acm+WAvO+8iOWvueS6jue7hOS7tuW8leeUqOmcgOimgeeJueauiuWkhOeQhu+8iVxuICAgICAgICAgICAgICAgIGxldCBhY3R1YWxFeHBlY3RlZFZhbHVlID0gcHJvY2Vzc2VkVmFsdWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU3RlcCA1OiDojrflj5bljp/lp4voioLngrnmlbDmja7mnaXmnoTlu7rmraPnoa7nmoTot6/lvoRcbiAgICAgICAgICAgICAgICBjb25zdCByYXdOb2RlRGF0YSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCk7XG4gICAgICAgICAgICAgICAgaWYgKCFyYXdOb2RlRGF0YSB8fCAhcmF3Tm9kZURhdGEuX19jb21wc19fKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byBnZXQgcmF3IG5vZGUgZGF0YSBmb3IgcHJvcGVydHkgc2V0dGluZ2BcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8g5om+5Yiw5Y6f5aeL57uE5Lu255qE57Si5byVXG4gICAgICAgICAgICAgICAgbGV0IHJhd0NvbXBvbmVudEluZGV4ID0gLTE7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByYXdOb2RlRGF0YS5fX2NvbXBzX18ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcCA9IHJhd05vZGVEYXRhLl9fY29tcHNfX1tpXSBhcyBhbnk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBUeXBlID0gY29tcC5fX3R5cGVfXyB8fCBjb21wLmNpZCB8fCBjb21wLnR5cGUgfHwgJ1Vua25vd24nO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29tcFR5cGUgPT09IGNvbXBvbmVudFR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhd0NvbXBvbmVudEluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChyYXdDb21wb25lbnRJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgQ291bGQgbm90IGZpbmQgY29tcG9uZW50IGluZGV4IGZvciBzZXR0aW5nIHByb3BlcnR5YFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyDmnoTlu7rmraPnoa7nmoTlsZ7mgKfot6/lvoRcbiAgICAgICAgICAgICAgICBsZXQgcHJvcGVydHlQYXRoID0gYF9fY29tcHNfXy4ke3Jhd0NvbXBvbmVudEluZGV4fS4ke3Byb3BlcnR5fWA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8g54m55q6K5aSE55CG6LWE5rqQ57G75bGe5oCnXG4gICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ2Fzc2V0JyB8fCBwcm9wZXJ0eVR5cGUgPT09ICdzcHJpdGVGcmFtZScgfHwgcHJvcGVydHlUeXBlID09PSAncHJlZmFiJyB8fCBcbiAgICAgICAgICAgICAgICAgICAgKHByb3BlcnR5SW5mby50eXBlID09PSAnYXNzZXQnICYmIHByb3BlcnR5VHlwZSA9PT0gJ3N0cmluZycpKSB7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBTZXR0aW5nIGFzc2V0IHJlZmVyZW5jZTpgLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcHJvY2Vzc2VkVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcHJvcGVydHksXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVR5cGU6IHByb3BlcnR5VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5UGF0aFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIERldGVybWluZSBhc3NldCB0eXBlIGJhc2VkIG9uIHByb3BlcnR5IG5hbWVcbiAgICAgICAgICAgICAgICAgICAgbGV0IGFzc2V0VHlwZSA9ICdjYy5TcHJpdGVGcmFtZSc7IC8vIGRlZmF1bHRcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3RleHR1cmUnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRUeXBlID0gJ2NjLlRleHR1cmUyRCc7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHkudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnbWF0ZXJpYWwnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRUeXBlID0gJ2NjLk1hdGVyaWFsJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdmb250JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0VHlwZSA9ICdjYy5Gb250JztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdjbGlwJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0VHlwZSA9ICdjYy5BdWRpb0NsaXAnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ3ByZWZhYicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0VHlwZSA9ICdjYy5QcmVmYWInO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHByb2Nlc3NlZFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGFzc2V0VHlwZVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvbXBvbmVudFR5cGUgPT09ICdjYy5VSVRyYW5zZm9ybScgJiYgKHByb3BlcnR5ID09PSAnX2NvbnRlbnRTaXplJyB8fCBwcm9wZXJ0eSA9PT0gJ2NvbnRlbnRTaXplJykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgVUlUcmFuc2Zvcm0gY29udGVudFNpemUgLSBzZXQgd2lkdGggYW5kIGhlaWdodCBzZXBhcmF0ZWx5XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gTnVtYmVyKHZhbHVlLndpZHRoKSB8fCAxMDA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IE51bWJlcih2YWx1ZS5oZWlnaHQpIHx8IDEwMDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCB3aWR0aCBmaXJzdFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IGBfX2NvbXBzX18uJHtyYXdDb21wb25lbnRJbmRleH0ud2lkdGhgLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZTogd2lkdGggfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRoZW4gc2V0IGhlaWdodFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IGBfX2NvbXBzX18uJHtyYXdDb21wb25lbnRJbmRleH0uaGVpZ2h0YCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgdmFsdWU6IGhlaWdodCB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY29tcG9uZW50VHlwZSA9PT0gJ2NjLlVJVHJhbnNmb3JtJyAmJiAocHJvcGVydHkgPT09ICdfYW5jaG9yUG9pbnQnIHx8IHByb3BlcnR5ID09PSAnYW5jaG9yUG9pbnQnKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBVSVRyYW5zZm9ybSBhbmNob3JQb2ludCAtIHNldCBhbmNob3JYIGFuZCBhbmNob3JZIHNlcGFyYXRlbHlcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYW5jaG9yWCA9IE51bWJlcih2YWx1ZS54KSB8fCAwLjU7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFuY2hvclkgPSBOdW1iZXIodmFsdWUueSkgfHwgMC41O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGFuY2hvclggZmlyc3RcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBgX19jb21wc19fLiR7cmF3Q29tcG9uZW50SW5kZXh9LmFuY2hvclhgLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZTogYW5jaG9yWCB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhlbiBzZXQgYW5jaG9yWSAgXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogYF9fY29tcHNfXy4ke3Jhd0NvbXBvbmVudEluZGV4fS5hbmNob3JZYCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgdmFsdWU6IGFuY2hvclkgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ2NvbG9yJyAmJiBwcm9jZXNzZWRWYWx1ZSAmJiB0eXBlb2YgcHJvY2Vzc2VkVmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOeJueauiuWkhOeQhuminOiJsuWxnuaAp++8jOehruS/nVJHQkHlgLzmraPnoa5cbiAgICAgICAgICAgICAgICAgICAgLy8gQ29jb3MgQ3JlYXRvcuminOiJsuWAvOiMg+WbtOaYrzAtMjU1XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbG9yVmFsdWUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihwcm9jZXNzZWRWYWx1ZS5yKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICBnOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihwcm9jZXNzZWRWYWx1ZS5nKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICBiOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihwcm9jZXNzZWRWYWx1ZS5iKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICBhOiBwcm9jZXNzZWRWYWx1ZS5hICE9PSB1bmRlZmluZWQgPyBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihwcm9jZXNzZWRWYWx1ZS5hKSkpIDogMjU1XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBTZXR0aW5nIGNvbG9yIHZhbHVlOmAsIGNvbG9yVmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcm9wZXJ0eVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBjb2xvclZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYy5Db2xvcidcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICd2ZWMzJyAmJiBwcm9jZXNzZWRWYWx1ZSAmJiB0eXBlb2YgcHJvY2Vzc2VkVmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOeJueauiuWkhOeQhlZlYzPlsZ7mgKdcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmVjM1ZhbHVlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgeDogTnVtYmVyKHByb2Nlc3NlZFZhbHVlLngpIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiBOdW1iZXIocHJvY2Vzc2VkVmFsdWUueSkgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHo6IE51bWJlcihwcm9jZXNzZWRWYWx1ZS56KSB8fCAwXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZlYzNWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2MuVmVjMydcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICd2ZWMyJyAmJiBwcm9jZXNzZWRWYWx1ZSAmJiB0eXBlb2YgcHJvY2Vzc2VkVmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOeJueauiuWkhOeQhlZlYzLlsZ7mgKdcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmVjMlZhbHVlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgeDogTnVtYmVyKHByb2Nlc3NlZFZhbHVlLngpIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiBOdW1iZXIocHJvY2Vzc2VkVmFsdWUueSkgfHwgMFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcm9wZXJ0eVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2ZWMyVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NjLlZlYzInXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlUeXBlID09PSAnc2l6ZScgJiYgcHJvY2Vzc2VkVmFsdWUgJiYgdHlwZW9mIHByb2Nlc3NlZFZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyDnibnmrorlpITnkIZTaXpl5bGe5oCnXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNpemVWYWx1ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBOdW1iZXIocHJvY2Vzc2VkVmFsdWUud2lkdGgpIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IE51bWJlcihwcm9jZXNzZWRWYWx1ZS5oZWlnaHQpIHx8IDBcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJvcGVydHlQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogc2l6ZVZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYy5TaXplJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ25vZGUnICYmIHByb2Nlc3NlZFZhbHVlICYmIHR5cGVvZiBwcm9jZXNzZWRWYWx1ZSA9PT0gJ29iamVjdCcgJiYgJ3V1aWQnIGluIHByb2Nlc3NlZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOeJueauiuWkhOeQhuiKgueCueW8leeUqFxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBTZXR0aW5nIG5vZGUgcmVmZXJlbmNlIHdpdGggVVVJRDogJHtwcm9jZXNzZWRWYWx1ZS51dWlkfWApO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHByb2Nlc3NlZFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYy5Ob2RlJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ2NvbXBvbmVudCcgJiYgdHlwZW9mIHByb2Nlc3NlZFZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAvLyDnibnmrorlpITnkIbnu4Tku7blvJXnlKjvvJrpgJrov4foioLngrlVVUlE5om+5Yiw57uE5Lu255qEX19pZF9fXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldE5vZGVVdWlkID0gcHJvY2Vzc2VkVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbQ29tcG9uZW50VG9vbHNdIFNldHRpbmcgY29tcG9uZW50IHJlZmVyZW5jZSAtIGZpbmRpbmcgY29tcG9uZW50IG9uIG5vZGU6ICR7dGFyZ2V0Tm9kZVV1aWR9YCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyDku47lvZPliY3nu4Tku7bnmoTlsZ7mgKflhYPmlbDmja7kuK3ojrflj5bmnJ/mnJvnmoTnu4Tku7bnsbvlnotcbiAgICAgICAgICAgICAgICAgICAgbGV0IGV4cGVjdGVkQ29tcG9uZW50VHlwZSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8g6I635Y+W5b2T5YmN57uE5Lu255qE6K+m57uG5L+h5oGv77yM5YyF5ous5bGe5oCn5YWD5pWw5o2uXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRDb21wb25lbnRJbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRJbmZvKG5vZGVVdWlkLCBjb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRDb21wb25lbnRJbmZvLnN1Y2Nlc3MgJiYgY3VycmVudENvbXBvbmVudEluZm8uZGF0YT8ucHJvcGVydGllcz8uW3Byb3BlcnR5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcGVydHlNZXRhID0gY3VycmVudENvbXBvbmVudEluZm8uZGF0YS5wcm9wZXJ0aWVzW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5LuO5bGe5oCn5YWD5pWw5o2u5Lit5o+Q5Y+W57uE5Lu257G75Z6L5L+h5oGvXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydHlNZXRhICYmIHR5cGVvZiBwcm9wZXJ0eU1ldGEgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5pyJdHlwZeWtl+auteaMh+ekuue7hOS7tuexu+Wei1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eU1ldGEudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZENvbXBvbmVudFR5cGUgPSBwcm9wZXJ0eU1ldGEudHlwZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5TWV0YS5jdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOacieS6m+WxnuaAp+WPr+iDveS9v+eUqGN0b3LlrZfmrrVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWRDb21wb25lbnRUeXBlID0gcHJvcGVydHlNZXRhLmN0b3I7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eU1ldGEuZXh0ZW5kcyAmJiBBcnJheS5pc0FycmF5KHByb3BlcnR5TWV0YS5leHRlbmRzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6VleHRlbmRz5pWw57uE77yM6YCa5bi456ys5LiA5Liq5piv5pyA5YW35L2T55qE57G75Z6LXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZXh0ZW5kVHlwZSBvZiBwcm9wZXJ0eU1ldGEuZXh0ZW5kcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4dGVuZFR5cGUuc3RhcnRzV2l0aCgnY2MuJykgJiYgZXh0ZW5kVHlwZSAhPT0gJ2NjLkNvbXBvbmVudCcgJiYgZXh0ZW5kVHlwZSAhPT0gJ2NjLk9iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZENvbXBvbmVudFR5cGUgPSBleHRlbmRUeXBlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIWV4cGVjdGVkQ29tcG9uZW50VHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmFibGUgdG8gZGV0ZXJtaW5lIHJlcXVpcmVkIGNvbXBvbmVudCB0eXBlIGZvciBwcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIG9uIGNvbXBvbmVudCAnJHtjb21wb25lbnRUeXBlfScuIFByb3BlcnR5IG1ldGFkYXRhIG1heSBub3QgY29udGFpbiB0eXBlIGluZm9ybWF0aW9uLmApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBEZXRlY3RlZCByZXF1aXJlZCBjb21wb25lbnQgdHlwZTogJHtleHBlY3RlZENvbXBvbmVudFR5cGV9IGZvciBwcm9wZXJ0eTogJHtwcm9wZXJ0eX1gKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDojrflj5bnm67moIfoioLngrnnmoTnu4Tku7bkv6Hmga9cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldE5vZGVEYXRhID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIHRhcmdldE5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0Tm9kZURhdGEgfHwgIXRhcmdldE5vZGVEYXRhLl9fY29tcHNfXykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVGFyZ2V0IG5vZGUgJHt0YXJnZXROb2RlVXVpZH0gbm90IGZvdW5kIG9yIGhhcyBubyBjb21wb25lbnRzYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOaJk+WNsOebruagh+iKgueCueeahOe7hOS7tuamguiniFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gVGFyZ2V0IG5vZGUgJHt0YXJnZXROb2RlVXVpZH0gaGFzICR7dGFyZ2V0Tm9kZURhdGEuX19jb21wc19fLmxlbmd0aH0gY29tcG9uZW50czpgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldE5vZGVEYXRhLl9fY29tcHNfXy5mb3JFYWNoKChjb21wOiBhbnksIGluZGV4OiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzY2VuZUlkID0gY29tcC52YWx1ZSAmJiBjb21wLnZhbHVlLnV1aWQgJiYgY29tcC52YWx1ZS51dWlkLnZhbHVlID8gY29tcC52YWx1ZS51dWlkLnZhbHVlIDogJ3Vua25vd24nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbQ29tcG9uZW50VG9vbHNdIENvbXBvbmVudCAke2luZGV4fTogJHtjb21wLnR5cGV9IChzY2VuZV9pZDogJHtzY2VuZUlkfSlgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDmn6Xmib7lr7nlupTnmoTnu4Tku7ZcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0YXJnZXRDb21wb25lbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvbXBvbmVudElkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5Zyo55uu5qCH6IqC54K555qEX2NvbXBvbmVudHPmlbDnu4TkuK3mn6Xmib7mjIflrprnsbvlnovnmoTnu4Tku7ZcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOazqOaEj++8ml9fY29tcHNfX+WSjF9jb21wb25lbnRz55qE57Si5byV5piv5a+55bqU55qEXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBTZWFyY2hpbmcgZm9yIGNvbXBvbmVudCB0eXBlOiAke2V4cGVjdGVkQ29tcG9uZW50VHlwZX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0YXJnZXROb2RlRGF0YS5fX2NvbXBzX18ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wID0gdGFyZ2V0Tm9kZURhdGEuX19jb21wc19fW2ldIGFzIGFueTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBDaGVja2luZyBjb21wb25lbnQgJHtpfTogdHlwZT0ke2NvbXAudHlwZX0sIHRhcmdldD0ke2V4cGVjdGVkQ29tcG9uZW50VHlwZX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29tcC50eXBlID09PSBleHBlY3RlZENvbXBvbmVudFR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0Q29tcG9uZW50ID0gY29tcDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gRm91bmQgbWF0Y2hpbmcgY29tcG9uZW50IGF0IGluZGV4ICR7aX06ICR7Y29tcC50eXBlfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5LuO57uE5Lu255qEdmFsdWUudXVpZC52YWx1ZeS4reiOt+WPlue7hOS7tuWcqOWcuuaZr+S4reeahElEXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wLnZhbHVlICYmIGNvbXAudmFsdWUudXVpZCAmJiBjb21wLnZhbHVlLnV1aWQudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudElkID0gY29tcC52YWx1ZS51dWlkLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gR290IGNvbXBvbmVudElkIGZyb20gY29tcC52YWx1ZS51dWlkLnZhbHVlOiAke2NvbXBvbmVudElkfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gQ29tcG9uZW50IHN0cnVjdHVyZTpgLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzVmFsdWU6ICEhY29tcC52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNVdWlkOiAhIShjb21wLnZhbHVlICYmIGNvbXAudmFsdWUudXVpZCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzVXVpZFZhbHVlOiAhIShjb21wLnZhbHVlICYmIGNvbXAudmFsdWUudXVpZCAmJiBjb21wLnZhbHVlLnV1aWQudmFsdWUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV1aWRTdHJ1Y3R1cmU6IGNvbXAudmFsdWUgPyBjb21wLnZhbHVlLnV1aWQgOiAnTm8gdmFsdWUnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIGV4dHJhY3QgY29tcG9uZW50IElEIGZyb20gY29tcG9uZW50IHN0cnVjdHVyZWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0Q29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5rKh5om+5Yiw77yM5YiX5Ye65Y+v55So57uE5Lu26K6p55So5oi35LqG6Kej77yM5pi+56S65Zy65pmv5Lit55qE55yf5a6eSURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdmFpbGFibGVDb21wb25lbnRzID0gdGFyZ2V0Tm9kZURhdGEuX19jb21wc19fLm1hcCgoY29tcDogYW55LCBpbmRleDogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzY2VuZUlkID0gJ3Vua25vd24nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDku47nu4Tku7bnmoR2YWx1ZS51dWlkLnZhbHVl6I635Y+W5Zy65pmvSURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXAudmFsdWUgJiYgY29tcC52YWx1ZS51dWlkICYmIGNvbXAudmFsdWUudXVpZC52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmVJZCA9IGNvbXAudmFsdWUudXVpZC52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYCR7Y29tcC50eXBlfShzY2VuZV9pZDoke3NjZW5lSWR9KWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb21wb25lbnQgdHlwZSAnJHtleHBlY3RlZENvbXBvbmVudFR5cGV9JyBub3QgZm91bmQgb24gbm9kZSAke3RhcmdldE5vZGVVdWlkfS4gQXZhaWxhYmxlIGNvbXBvbmVudHM6ICR7YXZhaWxhYmxlQ29tcG9uZW50cy5qb2luKCcsICcpfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBGb3VuZCBjb21wb25lbnQgJHtleHBlY3RlZENvbXBvbmVudFR5cGV9IHdpdGggc2NlbmUgSUQ6ICR7Y29tcG9uZW50SWR9IG9uIG5vZGUgJHt0YXJnZXROb2RlVXVpZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5pu05paw5pyf5pyb5YC85Li65a6e6ZmF55qE57uE5Lu2SUTlr7nosaHmoLzlvI/vvIznlKjkuo7lkI7nu63pqozor4FcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnRJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdHVhbEV4cGVjdGVkVmFsdWUgPSB7IHV1aWQ6IGNvbXBvbmVudElkIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWwneivleS9v+eUqOS4juiKgueCuS/otYTmupDlvJXnlKjnm7jlkIznmoTmoLzlvI/vvJp7dXVpZDogY29tcG9uZW50SWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDmtYvor5XnnIvmmK/lkKbog73mraPnoa7orr7nva7nu4Tku7blvJXnlKhcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcm9wZXJ0eVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHsgdXVpZDogY29tcG9uZW50SWQgfSwgIC8vIOS9v+eUqOWvueixoeagvOW8j++8jOWDj+iKgueCuS/otYTmupDlvJXnlKjkuIDmoLdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogZXhwZWN0ZWRDb21wb25lbnRUeXBlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFtDb21wb25lbnRUb29sc10gRXJyb3Igc2V0dGluZyBjb21wb25lbnQgcmVmZXJlbmNlOmAsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdub2RlQXJyYXknICYmIEFycmF5LmlzQXJyYXkocHJvY2Vzc2VkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOeJueauiuWkhOeQhuiKgueCueaVsOe7hCAtIOS/neaMgemihOWkhOeQhueahOagvOW8j1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBTZXR0aW5nIG5vZGUgYXJyYXk6YCwgcHJvY2Vzc2VkVmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcm9wZXJ0eVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwcm9jZXNzZWRWYWx1ZSAgLy8g5L+d5oyBIFt7dXVpZDogXCIuLi5cIn0sIHt1dWlkOiBcIi4uLlwifV0g5qC85byPXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlUeXBlID09PSAnY29sb3JBcnJheScgJiYgQXJyYXkuaXNBcnJheShwcm9jZXNzZWRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g54m55q6K5aSE55CG6aKc6Imy5pWw57uEXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbG9yQXJyYXlWYWx1ZSA9IHByb2Nlc3NlZFZhbHVlLm1hcCgoaXRlbTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSAmJiB0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCcgJiYgJ3InIGluIGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLnIpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZzogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaXRlbS5nKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGI6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGl0ZW0uYikgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhOiBpdGVtLmEgIT09IHVuZGVmaW5lZCA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGl0ZW0uYSkpKSA6IDI1NVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHI6IDI1NSwgZzogMjU1LCBiOiAyNTUsIGE6IDI1NSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJvcGVydHlQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogY29sb3JBcnJheVZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYy5Db2xvcidcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTm9ybWFsIHByb3BlcnR5IHNldHRpbmcgZm9yIG5vbi1hc3NldCBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJvcGVydHlQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZTogcHJvY2Vzc2VkVmFsdWUgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU3RlcCA1OiDnrYnlvoVFZGl0b3LlrozmiJDmm7TmlrDvvIznhLblkI7pqozor4Horr7nva7nu5PmnpxcbiAgICAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMjAwKSk7IC8vIOetieW+hTIwMG1z6K6pRWRpdG9y5a6M5oiQ5pu05pawXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgdmVyaWZpY2F0aW9uID0gYXdhaXQgdGhpcy52ZXJpZnlQcm9wZXJ0eUNoYW5nZShub2RlVXVpZCwgY29tcG9uZW50VHlwZSwgcHJvcGVydHksIG9yaWdpbmFsVmFsdWUsIGFjdHVhbEV4cGVjdGVkVmFsdWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgU3VjY2Vzc2Z1bGx5IHNldCAke2NvbXBvbmVudFR5cGV9LiR7cHJvcGVydHl9YCxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHksXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3R1YWxWYWx1ZTogdmVyaWZpY2F0aW9uLmFjdHVhbFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlVmVyaWZpZWQ6IHZlcmlmaWNhdGlvbi52ZXJpZmllZFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgW0NvbXBvbmVudFRvb2xzXSBFcnJvciBzZXR0aW5nIHByb3BlcnR5OmAsIGVycm9yKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIHNldCBwcm9wZXJ0eTogJHtlcnJvci5tZXNzYWdlfWBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQmF0Y2gtc2V0IE4gcHJvcGVydGllcyBvbiB0aGUgc2FtZSAobm9kZVV1aWQsIGNvbXBvbmVudFR5cGUpLlxuICAgICAqIEludGVybmFsbHkgY2FsbHMgc2V0Q29tcG9uZW50UHJvcGVydHkgZm9yIGVhY2ggZW50cnkgc2VyaWFsbHkuXG4gICAgICogSW5kaXZpZHVhbCBmYWlsdXJlcyBkbyBOT1QgYWJvcnQgdGhlIGJhdGNoIOKAlCB0aGV5IGFyZSBjb2xsZWN0ZWQgaW50byBgZmFpbGVkW11gLlxuICAgICAqIFJldHVybnMgc3VjY2Vzcz10cnVlIGlmIGF0IGxlYXN0IG9uZSBwcm9wZXJ0eSBhcHBsaWVkOyBzdWNjZXNzPWZhbHNlIGlmIEFMTCBmYWlsZWQuXG4gICAgICovXG4gICAgcHJpdmF0ZSBhc3luYyBiYXRjaFNldFByb3BlcnRpZXMoYXJnczoge1xuICAgICAgICBub2RlVXVpZDogc3RyaW5nO1xuICAgICAgICBjb21wb25lbnRUeXBlOiBzdHJpbmc7XG4gICAgICAgIHByb3BlcnRpZXM6IEFycmF5PHsgcHJvcGVydHk6IHN0cmluZzsgcHJvcGVydHlUeXBlOiBzdHJpbmc7IHZhbHVlOiBhbnkgfT47XG4gICAgfSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHsgbm9kZVV1aWQsIGNvbXBvbmVudFR5cGUsIHByb3BlcnRpZXMgfSA9IGFyZ3M7XG5cbiAgICAgICAgaWYgKCFub2RlVXVpZCB8fCB0eXBlb2Ygbm9kZVV1aWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZShcbiAgICAgICAgICAgICAgICBFUlJPUl9DT0RFUy5JTlZBTElEX1BBUkFNUyxcbiAgICAgICAgICAgICAgICAnbm9kZVV1aWQgbXVzdCBiZSBhIG5vbi1lbXB0eSBzdHJpbmcnLFxuICAgICAgICAgICAgICAgIHsgc3VnZ2VzdGlvbjogJ1VzZSBnZXRfYWxsX25vZGVzIG9yIGZpbmRfbm9kZV9ieV9uYW1lIHRvIG9idGFpbiB0aGUgVVVJRCcgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBTaGFwZSBjaGVjayBmb3Igb2J2aW91cyBnYXJiYWdlIChQMi5DIGZpeCDigJQgY29uc2lzdGVudCB3aXRoIFVJVG9vbHMpLlxuICAgICAgICBpZiAoIS9eW0EtWmEtejAtOSsvPV9cXC1dezgsfSQvLnRlc3Qobm9kZVV1aWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZShcbiAgICAgICAgICAgICAgICBFUlJPUl9DT0RFUy5JTlZBTElEX1BBUkFNUyxcbiAgICAgICAgICAgICAgICBgbm9kZVV1aWQgXCIke25vZGVVdWlkfVwiIGRvZXMgbm90IGxvb2sgbGlrZSBhIHZhbGlkIENvY29zIFVVSURgLFxuICAgICAgICAgICAgICAgIHsgc3VnZ2VzdGlvbjogJ1VVSUQgbXVzdCBiZSBhdCBsZWFzdCA4IGNoYXJzLCBhbHBoYW51bWVyaWMgKyBbKy89Xy1dLicgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWNvbXBvbmVudFR5cGUgfHwgdHlwZW9mIGNvbXBvbmVudFR5cGUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZShcbiAgICAgICAgICAgICAgICBFUlJPUl9DT0RFUy5JTlZBTElEX1BBUkFNUyxcbiAgICAgICAgICAgICAgICAnY29tcG9uZW50VHlwZSBtdXN0IGJlIGEgbm9uLWVtcHR5IHN0cmluZycsXG4gICAgICAgICAgICAgICAgeyBzdWdnZXN0aW9uOiAnRS5nLiBcImNjLkxhYmVsXCIsIFwiY2MuU3ByaXRlXCIsIFwiY2MuTGF5b3V0XCInIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHByb3BlcnRpZXMpIHx8IHByb3BlcnRpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZShcbiAgICAgICAgICAgICAgICBFUlJPUl9DT0RFUy5JTlZBTElEX1BBUkFNUyxcbiAgICAgICAgICAgICAgICAncHJvcGVydGllcyBtdXN0IGJlIGEgbm9uLWVtcHR5IGFycmF5JyxcbiAgICAgICAgICAgICAgICB7IHN1Z2dlc3Rpb246ICdFYWNoIGVudHJ5OiB7IHByb3BlcnR5OiBzdHJpbmcsIHByb3BlcnR5VHlwZTogc3RyaW5nLCB2YWx1ZTogYW55IH0nIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzdWNjZWVkZWQ6IEFycmF5PHsgcHJvcGVydHk6IHN0cmluZyB9PiA9IFtdO1xuICAgICAgICBjb25zdCBmYWlsZWQ6IEFycmF5PHsgcHJvcGVydHk6IHN0cmluZzsgZXJyb3I6IHN0cmluZzsgZXJyb3JDb2RlPzogc3RyaW5nIH0+ID0gW107XG5cbiAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICBpZiAoIWVudHJ5IHx8IHR5cGVvZiBlbnRyeS5wcm9wZXJ0eSAhPT0gJ3N0cmluZycgfHwgdHlwZW9mIGVudHJ5LnByb3BlcnR5VHlwZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICBmYWlsZWQucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBlbnRyeT8ucHJvcGVydHkgPz8gJzxtaXNzaW5nPicsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiAnZW50cnkgbWlzc2luZyBwcm9wZXJ0eS9wcm9wZXJ0eVR5cGUnLFxuICAgICAgICAgICAgICAgICAgICBlcnJvckNvZGU6IEVSUk9SX0NPREVTLklOVkFMSURfUEFSQU1TXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnNldENvbXBvbmVudFByb3BlcnR5KHtcbiAgICAgICAgICAgICAgICBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlLFxuICAgICAgICAgICAgICAgIHByb3BlcnR5OiBlbnRyeS5wcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICBwcm9wZXJ0eVR5cGU6IGVudHJ5LnByb3BlcnR5VHlwZSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogZW50cnkudmFsdWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgc3VjY2VlZGVkLnB1c2goeyBwcm9wZXJ0eTogZW50cnkucHJvcGVydHkgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZhaWxlZC5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IGVudHJ5LnByb3BlcnR5LFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogcmVzdWx0LmVycm9yIHx8ICd1bmtub3duJyxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JDb2RlOiByZXN1bHQuZXJyb3JDb2RlIHx8IEVSUk9SX0NPREVTLlVOS05PV05cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGFsbEZhaWxlZCA9IHN1Y2NlZWRlZC5sZW5ndGggPT09IDAgJiYgZmFpbGVkLmxlbmd0aCA+IDA7XG4gICAgICAgIGlmIChhbGxGYWlsZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKFxuICAgICAgICAgICAgICAgIEVSUk9SX0NPREVTLkVESVRPUl9BUElfRVJST1IsXG4gICAgICAgICAgICAgICAgYEFsbCAke2ZhaWxlZC5sZW5ndGh9IHByb3BlcnR5IHdyaXRlKHMpIGZhaWxlZCBvbiAke2NvbXBvbmVudFR5cGV9YCxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGZhaWxlZCxcbiAgICAgICAgICAgICAgICAgICAgc3VnZ2VzdGlvbjogYFZlcmlmeSBjb21wb25lbnRUeXBlIGV4aXN0cyBvbiB0aGUgbm9kZSAodHJ5IGdldF9jb21wb25lbnRzIGZpcnN0KSBhbmQgcHJvcGVydHkgbmFtZXMgYXJlIGNvcnJlY3QuIElmIHRoZSBjb21wb25lbnQgaXMgbm90IGF0dGFjaGVkLCBydW4gY29tcG9uZW50X2FkZF9jb21wb25lbnQoeyBub2RlVXVpZCwgY29tcG9uZW50VHlwZTogJyR7Y29tcG9uZW50VHlwZX0nIH0pIGJlZm9yZSBiYXRjaF9zZXRfcHJvcGVydGllcy5gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlLFxuICAgICAgICAgICAgICAgIHN1Y2NlZWRlZENvdW50OiBzdWNjZWVkZWQubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGZhaWxlZENvdW50OiBmYWlsZWQubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHN1Y2NlZWRlZCxcbiAgICAgICAgICAgICAgICBmYWlsZWRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAuLi4oZmFpbGVkLmxlbmd0aCA+IDAgPyB7IHdhcm5pbmc6IGAke2ZhaWxlZC5sZW5ndGh9IG9mICR7cHJvcGVydGllcy5sZW5ndGh9IHByb3BlcnRpZXMgZmFpbGVkIOKAlCBzZWUgZGF0YS5mYWlsZWRgIH0gOiB7fSlcbiAgICAgICAgfTtcbiAgICB9XG5cblxuICAgIHByaXZhdGUgYXN5bmMgYXR0YWNoU2NyaXB0KG5vZGVVdWlkOiBzdHJpbmcsIHNjcmlwdFBhdGg6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgLy8g5LuO6ISa5pys6Lev5b6E5o+Q5Y+W57uE5Lu257G75ZCNXG4gICAgICAgICAgICBjb25zdCBzY3JpcHROYW1lID0gc2NyaXB0UGF0aC5zcGxpdCgnLycpLnBvcCgpPy5yZXBsYWNlKCcudHMnLCAnJykucmVwbGFjZSgnLmpzJywgJycpO1xuICAgICAgICAgICAgaWYgKCFzY3JpcHROYW1lKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ludmFsaWQgc2NyaXB0IHBhdGgnIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIOWFiOafpeaJvuiKgueCueS4iuaYr+WQpuW3suWtmOWcqOivpeiEmuacrOe7hOS7tlxuICAgICAgICAgICAgY29uc3QgYWxsQ29tcG9uZW50c0luZm8gPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudHMobm9kZVV1aWQpO1xuICAgICAgICAgICAgaWYgKGFsbENvbXBvbmVudHNJbmZvLnN1Y2Nlc3MgJiYgYWxsQ29tcG9uZW50c0luZm8uZGF0YT8uY29tcG9uZW50cykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nU2NyaXB0ID0gYWxsQ29tcG9uZW50c0luZm8uZGF0YS5jb21wb25lbnRzLmZpbmQoKGNvbXA6IGFueSkgPT4gY29tcC50eXBlID09PSBzY3JpcHROYW1lKTtcbiAgICAgICAgICAgICAgICBpZiAoZXhpc3RpbmdTY3JpcHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFNjcmlwdCAnJHtzY3JpcHROYW1lfScgYWxyZWFkeSBleGlzdHMgb24gbm9kZWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudE5hbWU6IHNjcmlwdE5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhpc3Rpbmc6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyDpppblhYjlsJ3or5Xnm7TmjqXkvb/nlKjohJrmnKzlkI3np7DkvZzkuLrnu4Tku7bnsbvlnotcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2NyZWF0ZS1jb21wb25lbnQnLCB7XG4gICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgY29tcG9uZW50OiBzY3JpcHROYW1lICAvLyDkvb/nlKjohJrmnKzlkI3np7DogIzpnZ5VVUlEXG4gICAgICAgICAgICB9KS50aGVuKGFzeW5jIChyZXN1bHQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIOetieW+heS4gOauteaXtumXtOiuqUVkaXRvcuWujOaIkOe7hOS7tua3u+WKoFxuICAgICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKTtcbiAgICAgICAgICAgICAgICAvLyDph43mlrDmn6Xor6LoioLngrnkv6Hmga/pqozor4HohJrmnKzmmK/lkKbnnJ/nmoTmt7vliqDmiJDlip9cbiAgICAgICAgICAgICAgICBjb25zdCBhbGxDb21wb25lbnRzSW5mbzIgPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudHMobm9kZVV1aWQpO1xuICAgICAgICAgICAgICAgIGlmIChhbGxDb21wb25lbnRzSW5mbzIuc3VjY2VzcyAmJiBhbGxDb21wb25lbnRzSW5mbzIuZGF0YT8uY29tcG9uZW50cykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhZGRlZFNjcmlwdCA9IGFsbENvbXBvbmVudHNJbmZvMi5kYXRhLmNvbXBvbmVudHMuZmluZCgoY29tcDogYW55KSA9PiBjb21wLnR5cGUgPT09IHNjcmlwdE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWRkZWRTY3JpcHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFNjcmlwdCAnJHtzY3JpcHROYW1lfScgYXR0YWNoZWQgc3VjY2Vzc2Z1bGx5YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50TmFtZTogc2NyaXB0TmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhpc3Rpbmc6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYFNjcmlwdCAnJHtzY3JpcHROYW1lfScgd2FzIG5vdCBmb3VuZCBvbiBub2RlIGFmdGVyIGFkZGl0aW9uLiBBdmFpbGFibGUgY29tcG9uZW50czogJHthbGxDb21wb25lbnRzSW5mbzIuZGF0YS5jb21wb25lbnRzLm1hcCgoYzogYW55KSA9PiBjLnR5cGUpLmpvaW4oJywgJyl9YFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gdmVyaWZ5IHNjcmlwdCBhZGRpdGlvbjogJHthbGxDb21wb25lbnRzSW5mbzIuZXJyb3IgfHwgJ1VuYWJsZSB0byBnZXQgbm9kZSBjb21wb25lbnRzJ31gXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8g5aSH55So5pa55qGI77ya5L2/55So5Zy65pmv6ISa5pysXG4gICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdhdHRhY2hTY3JpcHQnLFxuICAgICAgICAgICAgICAgICAgICBhcmdzOiBbbm9kZVV1aWQsIHNjcmlwdFBhdGhdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIG9wdGlvbnMpLnRoZW4oKHJlc3VsdDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIGF0dGFjaCBzY3JpcHQgJyR7c2NyaXB0TmFtZX0nOiAke2Vyci5tZXNzYWdlfWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogJ1BsZWFzZSBlbnN1cmUgdGhlIHNjcmlwdCBpcyBwcm9wZXJseSBjb21waWxlZCBhbmQgZXhwb3J0ZWQgYXMgYSBDb21wb25lbnQgY2xhc3MuIFlvdSBjYW4gYWxzbyBtYW51YWxseSBhdHRhY2ggdGhlIHNjcmlwdCB0aHJvdWdoIHRoZSBQcm9wZXJ0aWVzIHBhbmVsIGluIHRoZSBlZGl0b3IuJ1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldEF2YWlsYWJsZUNvbXBvbmVudHMoY2F0ZWdvcnk6IHN0cmluZyA9ICdhbGwnKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgY29tcG9uZW50Q2F0ZWdvcmllczogUmVjb3JkPHN0cmluZywgc3RyaW5nW10+ID0ge1xuICAgICAgICAgICAgcmVuZGVyZXI6IFsnY2MuU3ByaXRlJywgJ2NjLkxhYmVsJywgJ2NjLlJpY2hUZXh0JywgJ2NjLk1hc2snLCAnY2MuR3JhcGhpY3MnXSxcbiAgICAgICAgICAgIHVpOiBbJ2NjLkJ1dHRvbicsICdjYy5Ub2dnbGUnLCAnY2MuU2xpZGVyJywgJ2NjLlNjcm9sbFZpZXcnLCAnY2MuRWRpdEJveCcsICdjYy5Qcm9ncmVzc0JhciddLFxuICAgICAgICAgICAgcGh5c2ljczogWydjYy5SaWdpZEJvZHkyRCcsICdjYy5Cb3hDb2xsaWRlcjJEJywgJ2NjLkNpcmNsZUNvbGxpZGVyMkQnLCAnY2MuUG9seWdvbkNvbGxpZGVyMkQnXSxcbiAgICAgICAgICAgIGFuaW1hdGlvbjogWydjYy5BbmltYXRpb24nLCAnY2MuQW5pbWF0aW9uQ2xpcCcsICdjYy5Ta2VsZXRhbEFuaW1hdGlvbiddLFxuICAgICAgICAgICAgYXVkaW86IFsnY2MuQXVkaW9Tb3VyY2UnXSxcbiAgICAgICAgICAgIGxheW91dDogWydjYy5MYXlvdXQnLCAnY2MuV2lkZ2V0JywgJ2NjLlBhZ2VWaWV3JywgJ2NjLlBhZ2VWaWV3SW5kaWNhdG9yJ10sXG4gICAgICAgICAgICBlZmZlY3RzOiBbJ2NjLk1vdGlvblN0cmVhaycsICdjYy5QYXJ0aWNsZVN5c3RlbTJEJ10sXG4gICAgICAgICAgICBjYW1lcmE6IFsnY2MuQ2FtZXJhJ10sXG4gICAgICAgICAgICBsaWdodDogWydjYy5MaWdodCcsICdjYy5EaXJlY3Rpb25hbExpZ2h0JywgJ2NjLlBvaW50TGlnaHQnLCAnY2MuU3BvdExpZ2h0J11cbiAgICAgICAgfTtcblxuICAgICAgICBsZXQgY29tcG9uZW50czogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjYXRlZ29yeSA9PT0gJ2FsbCcpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2F0IGluIGNvbXBvbmVudENhdGVnb3JpZXMpIHtcbiAgICAgICAgICAgICAgICBjb21wb25lbnRzID0gY29tcG9uZW50cy5jb25jYXQoY29tcG9uZW50Q2F0ZWdvcmllc1tjYXRdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjb21wb25lbnRDYXRlZ29yaWVzW2NhdGVnb3J5XSkge1xuICAgICAgICAgICAgY29tcG9uZW50cyA9IGNvbXBvbmVudENhdGVnb3JpZXNbY2F0ZWdvcnldO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgICAgICAgIGNvbXBvbmVudHM6IGNvbXBvbmVudHNcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGlzVmFsaWRQcm9wZXJ0eURlc2NyaXB0b3IocHJvcERhdGE6IGFueSk6IGJvb2xlYW4ge1xuICAgICAgICAvLyDmo4Dmn6XmmK/lkKbmmK/mnInmlYjnmoTlsZ7mgKfmj4/ov7Dlr7nosaFcbiAgICAgICAgaWYgKHR5cGVvZiBwcm9wRGF0YSAhPT0gJ29iamVjdCcgfHwgcHJvcERhdGEgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhwcm9wRGF0YSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIOmBv+WFjemBjeWOhueugOWNleeahOaVsOWAvOWvueixoe+8iOWmgiB7d2lkdGg6IDIwMCwgaGVpZ2h0OiAxNTB977yJXG4gICAgICAgICAgICBjb25zdCBpc1NpbXBsZVZhbHVlT2JqZWN0ID0ga2V5cy5ldmVyeShrZXkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gcHJvcERhdGFba2V5XTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChpc1NpbXBsZVZhbHVlT2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyDmo4Dmn6XmmK/lkKbljIXlkKvlsZ7mgKfmj4/ov7DnrKbnmoTnibnlvoHlrZfmrrXvvIzkuI3kvb/nlKgnaW4n5pON5L2c56ymXG4gICAgICAgICAgICBjb25zdCBoYXNOYW1lID0ga2V5cy5pbmNsdWRlcygnbmFtZScpO1xuICAgICAgICAgICAgY29uc3QgaGFzVmFsdWUgPSBrZXlzLmluY2x1ZGVzKCd2YWx1ZScpO1xuICAgICAgICAgICAgY29uc3QgaGFzVHlwZSA9IGtleXMuaW5jbHVkZXMoJ3R5cGUnKTtcbiAgICAgICAgICAgIGNvbnN0IGhhc0Rpc3BsYXlOYW1lID0ga2V5cy5pbmNsdWRlcygnZGlzcGxheU5hbWUnKTtcbiAgICAgICAgICAgIGNvbnN0IGhhc1JlYWRvbmx5ID0ga2V5cy5pbmNsdWRlcygncmVhZG9ubHknKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8g5b+F6aG75YyF5ZCrbmFtZeaIlnZhbHVl5a2X5q6177yM5LiU6YCa5bi46L+Y5pyJdHlwZeWtl+autVxuICAgICAgICAgICAgY29uc3QgaGFzVmFsaWRTdHJ1Y3R1cmUgPSAoaGFzTmFtZSB8fCBoYXNWYWx1ZSkgJiYgKGhhc1R5cGUgfHwgaGFzRGlzcGxheU5hbWUgfHwgaGFzUmVhZG9ubHkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyDpop3lpJbmo4Dmn6XvvJrlpoLmnpzmnIlkZWZhdWx05a2X5q615LiU57uT5p6E5aSN5p2C77yM6YG/5YWN5rex5bqm6YGN5Y6GXG4gICAgICAgICAgICBpZiAoa2V5cy5pbmNsdWRlcygnZGVmYXVsdCcpICYmIHByb3BEYXRhLmRlZmF1bHQgJiYgdHlwZW9mIHByb3BEYXRhLmRlZmF1bHQgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVmYXVsdEtleXMgPSBPYmplY3Qua2V5cyhwcm9wRGF0YS5kZWZhdWx0KTtcbiAgICAgICAgICAgICAgICBpZiAoZGVmYXVsdEtleXMuaW5jbHVkZXMoJ3ZhbHVlJykgJiYgdHlwZW9mIHByb3BEYXRhLmRlZmF1bHQudmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOi/meenjeaDheWGteS4i++8jOaIkeS7rOWPqui/lOWbnumhtuWxguWxnuaAp++8jOS4jea3seWFpemBjeWOhmRlZmF1bHQudmFsdWVcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhc1ZhbGlkU3RydWN0dXJlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIGhhc1ZhbGlkU3RydWN0dXJlO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBbaXNWYWxpZFByb3BlcnR5RGVzY3JpcHRvcl0gRXJyb3IgY2hlY2tpbmcgcHJvcGVydHkgZGVzY3JpcHRvcjpgLCBlcnJvcik7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFuYWx5emVQcm9wZXJ0eShjb21wb25lbnQ6IGFueSwgcHJvcGVydHlOYW1lOiBzdHJpbmcpOiB7IGV4aXN0czogYm9vbGVhbjsgdHlwZTogc3RyaW5nOyBhdmFpbGFibGVQcm9wZXJ0aWVzOiBzdHJpbmdbXTsgb3JpZ2luYWxWYWx1ZTogYW55IH0ge1xuICAgICAgICAvLyDku47lpI3mnYLnmoTnu4Tku7bnu5PmnoTkuK3mj5Dlj5blj6/nlKjlsZ7mgKdcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlUHJvcGVydGllczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgbGV0IHByb3BlcnR5VmFsdWU6IGFueSA9IHVuZGVmaW5lZDtcbiAgICAgICAgbGV0IHByb3BlcnR5RXhpc3RzID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICAvLyDlsJ3or5XlpJrnp43mlrnlvI/mn6Xmib7lsZ7mgKfvvJpcbiAgICAgICAgLy8gMS4g55u05o6l5bGe5oCn6K6/6ZeuXG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY29tcG9uZW50LCBwcm9wZXJ0eU5hbWUpKSB7XG4gICAgICAgICAgICBwcm9wZXJ0eVZhbHVlID0gY29tcG9uZW50W3Byb3BlcnR5TmFtZV07XG4gICAgICAgICAgICBwcm9wZXJ0eUV4aXN0cyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIDIuIOS7juW1jOWll+e7k+aehOS4reafpeaJviAo5aaC5LuO5rWL6K+V5pWw5o2u55yL5Yiw55qE5aSN5p2C57uT5p6EKVxuICAgICAgICBpZiAoIXByb3BlcnR5RXhpc3RzICYmIGNvbXBvbmVudC5wcm9wZXJ0aWVzICYmIHR5cGVvZiBjb21wb25lbnQucHJvcGVydGllcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIC8vIOmmluWFiOajgOafpXByb3BlcnRpZXMudmFsdWXmmK/lkKblrZjlnKjvvIjov5nmmK/miJHku6zlnKhnZXRDb21wb25lbnRz5Lit55yL5Yiw55qE57uT5p6E77yJXG4gICAgICAgICAgICBpZiAoY29tcG9uZW50LnByb3BlcnRpZXMudmFsdWUgJiYgdHlwZW9mIGNvbXBvbmVudC5wcm9wZXJ0aWVzLnZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlT2JqID0gY29tcG9uZW50LnByb3BlcnRpZXMudmFsdWU7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBba2V5LCBwcm9wRGF0YV0gb2YgT2JqZWN0LmVudHJpZXModmFsdWVPYmopKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOajgOafpXByb3BEYXRh5piv5ZCm5piv5LiA5Liq5pyJ5pWI55qE5bGe5oCn5o+P6L+w5a+56LGhXG4gICAgICAgICAgICAgICAgICAgIC8vIOehruS/nXByb3BEYXRh5piv5a+56LGh5LiU5YyF5ZCr6aKE5pyf55qE5bGe5oCn57uT5p6EXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzVmFsaWRQcm9wZXJ0eURlc2NyaXB0b3IocHJvcERhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9wSW5mbyA9IHByb3BEYXRhIGFzIGFueTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVByb3BlcnRpZXMucHVzaChrZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleSA9PT0gcHJvcGVydHlOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5LyY5YWI5L2/55SodmFsdWXlsZ7mgKfvvIzlpoLmnpzmsqHmnInliJnkvb/nlKhwcm9wRGF0YeacrOi6q1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BLZXlzID0gT2JqZWN0LmtleXMocHJvcEluZm8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVZhbHVlID0gcHJvcEtleXMuaW5jbHVkZXMoJ3ZhbHVlJykgPyBwcm9wSW5mby52YWx1ZSA6IHByb3BJbmZvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOajgOafpeWksei0pe+8jOebtOaOpeS9v+eUqHByb3BJbmZvXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5VmFsdWUgPSBwcm9wSW5mbztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlFeGlzdHMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyDlpIfnlKjmlrnmoYjvvJrnm7TmjqXku45wcm9wZXJ0aWVz5p+l5om+XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBba2V5LCBwcm9wRGF0YV0gb2YgT2JqZWN0LmVudHJpZXMoY29tcG9uZW50LnByb3BlcnRpZXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzVmFsaWRQcm9wZXJ0eURlc2NyaXB0b3IocHJvcERhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9wSW5mbyA9IHByb3BEYXRhIGFzIGFueTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVByb3BlcnRpZXMucHVzaChrZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleSA9PT0gcHJvcGVydHlOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5LyY5YWI5L2/55SodmFsdWXlsZ7mgKfvvIzlpoLmnpzmsqHmnInliJnkvb/nlKhwcm9wRGF0YeacrOi6q1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BLZXlzID0gT2JqZWN0LmtleXMocHJvcEluZm8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVZhbHVlID0gcHJvcEtleXMuaW5jbHVkZXMoJ3ZhbHVlJykgPyBwcm9wSW5mby52YWx1ZSA6IHByb3BJbmZvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOajgOafpeWksei0pe+8jOebtOaOpeS9v+eUqHByb3BJbmZvXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5VmFsdWUgPSBwcm9wSW5mbztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlFeGlzdHMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyAzLiDku47nm7TmjqXlsZ7mgKfkuK3mj5Dlj5bnroDljZXlsZ7mgKflkI1cbiAgICAgICAgaWYgKGF2YWlsYWJsZVByb3BlcnRpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhjb21wb25lbnQpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFrZXkuc3RhcnRzV2l0aCgnXycpICYmICFbJ19fdHlwZV9fJywgJ2NpZCcsICdub2RlJywgJ3V1aWQnLCAnbmFtZScsICdlbmFibGVkJywgJ3R5cGUnLCAncmVhZG9ubHknLCAndmlzaWJsZSddLmluY2x1ZGVzKGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlUHJvcGVydGllcy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoIXByb3BlcnR5RXhpc3RzKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGV4aXN0czogZmFsc2UsXG4gICAgICAgICAgICAgICAgdHlwZTogJ3Vua25vd24nLFxuICAgICAgICAgICAgICAgIGF2YWlsYWJsZVByb3BlcnRpZXMsXG4gICAgICAgICAgICAgICAgb3JpZ2luYWxWYWx1ZTogdW5kZWZpbmVkXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBsZXQgdHlwZSA9ICd1bmtub3duJztcbiAgICAgICAgXG4gICAgICAgIC8vIOaZuuiDveexu+Wei+ajgOa1i1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShwcm9wZXJ0eVZhbHVlKSkge1xuICAgICAgICAgICAgLy8g5pWw57uE57G75Z6L5qOA5rWLXG4gICAgICAgICAgICBpZiAocHJvcGVydHlOYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ25vZGUnKSkge1xuICAgICAgICAgICAgICAgIHR5cGUgPSAnbm9kZUFycmF5JztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlOYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ2NvbG9yJykpIHtcbiAgICAgICAgICAgICAgICB0eXBlID0gJ2NvbG9yQXJyYXknO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0eXBlID0gJ2FycmF5JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcHJvcGVydHlWYWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHByb3BlcnR5IG5hbWUgc3VnZ2VzdHMgaXQncyBhbiBhc3NldFxuICAgICAgICAgICAgaWYgKFsnc3ByaXRlRnJhbWUnLCAndGV4dHVyZScsICdtYXRlcmlhbCcsICdmb250JywgJ2NsaXAnLCAncHJlZmFiJ10uaW5jbHVkZXMocHJvcGVydHlOYW1lLnRvTG93ZXJDYXNlKCkpKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdhc3NldCc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHR5cGUgPSAnc3RyaW5nJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcHJvcGVydHlWYWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIHR5cGUgPSAnbnVtYmVyJztcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcHJvcGVydHlWYWx1ZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICB0eXBlID0gJ2Jvb2xlYW4nO1xuICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VmFsdWUgJiYgdHlwZW9mIHByb3BlcnR5VmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhwcm9wZXJ0eVZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAoa2V5cy5pbmNsdWRlcygncicpICYmIGtleXMuaW5jbHVkZXMoJ2cnKSAmJiBrZXlzLmluY2x1ZGVzKCdiJykpIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9ICdjb2xvcic7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXlzLmluY2x1ZGVzKCd4JykgJiYga2V5cy5pbmNsdWRlcygneScpKSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSBwcm9wZXJ0eVZhbHVlLnogIT09IHVuZGVmaW5lZCA/ICd2ZWMzJyA6ICd2ZWMyJztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXMuaW5jbHVkZXMoJ3dpZHRoJykgJiYga2V5cy5pbmNsdWRlcygnaGVpZ2h0JykpIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9ICdzaXplJztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXMuaW5jbHVkZXMoJ3V1aWQnKSB8fCBrZXlzLmluY2x1ZGVzKCdfX3V1aWRfXycpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOajgOafpeaYr+WQpuaYr+iKgueCueW8leeUqO+8iOmAmui/h+WxnuaAp+WQjeaIll9faWRfX+WxnuaAp+WIpOaWre+8iVxuICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydHlOYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ25vZGUnKSB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5TmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCd0YXJnZXQnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAga2V5cy5pbmNsdWRlcygnX19pZF9fJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGUgPSAnbm9kZSc7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlID0gJ2Fzc2V0JztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5cy5pbmNsdWRlcygnX19pZF9fJykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g6IqC54K55byV55So54m55b6BXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSAnbm9kZSc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9ICdvYmplY3QnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBbYW5hbHl6ZVByb3BlcnR5XSBFcnJvciBjaGVja2luZyBwcm9wZXJ0eSB0eXBlIGZvcjogJHtKU09OLnN0cmluZ2lmeShwcm9wZXJ0eVZhbHVlKX1gKTtcbiAgICAgICAgICAgICAgICB0eXBlID0gJ29iamVjdCc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlWYWx1ZSA9PT0gbnVsbCB8fCBwcm9wZXJ0eVZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIEZvciBudWxsL3VuZGVmaW5lZCB2YWx1ZXMsIGNoZWNrIHByb3BlcnR5IG5hbWUgdG8gZGV0ZXJtaW5lIHR5cGVcbiAgICAgICAgICAgIGlmIChbJ3Nwcml0ZUZyYW1lJywgJ3RleHR1cmUnLCAnbWF0ZXJpYWwnLCAnZm9udCcsICdjbGlwJywgJ3ByZWZhYiddLmluY2x1ZGVzKHByb3BlcnR5TmFtZS50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgICAgICAgICAgIHR5cGUgPSAnYXNzZXQnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnbm9kZScpIHx8IFxuICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5TmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCd0YXJnZXQnKSkge1xuICAgICAgICAgICAgICAgIHR5cGUgPSAnbm9kZSc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5TmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdjb21wb25lbnQnKSkge1xuICAgICAgICAgICAgICAgIHR5cGUgPSAnY29tcG9uZW50JztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICd1bmtub3duJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGV4aXN0czogdHJ1ZSxcbiAgICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgICBhdmFpbGFibGVQcm9wZXJ0aWVzLFxuICAgICAgICAgICAgb3JpZ2luYWxWYWx1ZTogcHJvcGVydHlWYWx1ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgc21hcnRDb252ZXJ0VmFsdWUoaW5wdXRWYWx1ZTogYW55LCBwcm9wZXJ0eUluZm86IGFueSk6IGFueSB7XG4gICAgICAgIGNvbnN0IHsgdHlwZSwgb3JpZ2luYWxWYWx1ZSB9ID0gcHJvcGVydHlJbmZvO1xuICAgICAgICBcbiAgICAgICAgY29uc29sZS5sb2coYFtzbWFydENvbnZlcnRWYWx1ZV0gQ29udmVydGluZyAke0pTT04uc3RyaW5naWZ5KGlucHV0VmFsdWUpfSB0byB0eXBlOiAke3R5cGV9YCk7XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFN0cmluZyhpbnB1dFZhbHVlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIE51bWJlcihpbnB1dFZhbHVlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaW5wdXRWYWx1ZSA9PT0gJ2Jvb2xlYW4nKSByZXR1cm4gaW5wdXRWYWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0VmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpbnB1dFZhbHVlLnRvTG93ZXJDYXNlKCkgPT09ICd0cnVlJyB8fCBpbnB1dFZhbHVlID09PSAnMSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBCb29sZWFuKGlucHV0VmFsdWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnY29sb3InOlxuICAgICAgICAgICAgICAgIC8vIOS8mOWMlueahOminOiJsuWkhOeQhu+8jOaUr+aMgeWkmuenjei+k+WFpeagvOW8j1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaW5wdXRWYWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g5a2X56ym5Liy5qC85byP77ya5Y2B5YWt6L+b5Yi244CB6aKc6Imy5ZCN56ew44CBcmdiKCkvcmdiYSgpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcnNlQ29sb3JTdHJpbmcoaW5wdXRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaW5wdXRWYWx1ZSA9PT0gJ29iamVjdCcgJiYgaW5wdXRWYWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5wdXRLZXlzID0gT2JqZWN0LmtleXMoaW5wdXRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzovpPlhaXmmK/popzoibLlr7nosaHvvIzpqozor4HlubbovazmjaJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dEtleXMuaW5jbHVkZXMoJ3InKSB8fCBpbnB1dEtleXMuaW5jbHVkZXMoJ2cnKSB8fCBpbnB1dEtleXMuaW5jbHVkZXMoJ2InKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHI6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGlucHV0VmFsdWUucikgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpbnB1dFZhbHVlLmcpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaW5wdXRWYWx1ZS5iKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGE6IGlucHV0VmFsdWUuYSAhPT0gdW5kZWZpbmVkID8gTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaW5wdXRWYWx1ZS5hKSkpIDogMjU1XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgW3NtYXJ0Q29udmVydFZhbHVlXSBJbnZhbGlkIGNvbG9yIG9iamVjdDogJHtKU09OLnN0cmluZ2lmeShpbnB1dFZhbHVlKX1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyDlpoLmnpzmnInljp/lgLzvvIzkv53mjIHljp/lgLznu5PmnoTlubbmm7TmlrDmj5DkvpvnmoTlgLxcbiAgICAgICAgICAgICAgICBpZiAob3JpZ2luYWxWYWx1ZSAmJiB0eXBlb2Ygb3JpZ2luYWxWYWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlucHV0S2V5cyA9IHR5cGVvZiBpbnB1dFZhbHVlID09PSAnb2JqZWN0JyAmJiBpbnB1dFZhbHVlID8gT2JqZWN0LmtleXMoaW5wdXRWYWx1ZSkgOiBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcjogaW5wdXRLZXlzLmluY2x1ZGVzKCdyJykgPyBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpbnB1dFZhbHVlLnIpKSkgOiAob3JpZ2luYWxWYWx1ZS5yIHx8IDI1NSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZzogaW5wdXRLZXlzLmluY2x1ZGVzKCdnJykgPyBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpbnB1dFZhbHVlLmcpKSkgOiAob3JpZ2luYWxWYWx1ZS5nIHx8IDI1NSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYjogaW5wdXRLZXlzLmluY2x1ZGVzKCdiJykgPyBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpbnB1dFZhbHVlLmIpKSkgOiAob3JpZ2luYWxWYWx1ZS5iIHx8IDI1NSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYTogaW5wdXRLZXlzLmluY2x1ZGVzKCdhJykgPyBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpbnB1dFZhbHVlLmEpKSkgOiAob3JpZ2luYWxWYWx1ZS5hIHx8IDI1NSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYFtzbWFydENvbnZlcnRWYWx1ZV0gRXJyb3IgcHJvY2Vzc2luZyBjb2xvciB3aXRoIG9yaWdpbmFsIHZhbHVlOiAke2Vycm9yfWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIOm7mOiupOi/lOWbnueZveiJslxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgW3NtYXJ0Q29udmVydFZhbHVlXSBVc2luZyBkZWZhdWx0IHdoaXRlIGNvbG9yIGZvciBpbnZhbGlkIGlucHV0OiAke0pTT04uc3RyaW5naWZ5KGlucHV0VmFsdWUpfWApO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHI6IDI1NSwgZzogMjU1LCBiOiAyNTUsIGE6IDI1NSB9O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAndmVjMic6XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSAnb2JqZWN0JyAmJiBpbnB1dFZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB4OiBOdW1iZXIoaW5wdXRWYWx1ZS54KSB8fCBvcmlnaW5hbFZhbHVlLnggfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHk6IE51bWJlcihpbnB1dFZhbHVlLnkpIHx8IG9yaWdpbmFsVmFsdWUueSB8fCAwXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbFZhbHVlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAndmVjMyc6XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSAnb2JqZWN0JyAmJiBpbnB1dFZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB4OiBOdW1iZXIoaW5wdXRWYWx1ZS54KSB8fCBvcmlnaW5hbFZhbHVlLnggfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHk6IE51bWJlcihpbnB1dFZhbHVlLnkpIHx8IG9yaWdpbmFsVmFsdWUueSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgejogTnVtYmVyKGlucHV0VmFsdWUueikgfHwgb3JpZ2luYWxWYWx1ZS56IHx8IDBcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsVmFsdWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzaXplJzpcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0VmFsdWUgPT09ICdvYmplY3QnICYmIGlucHV0VmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBOdW1iZXIoaW5wdXRWYWx1ZS53aWR0aCkgfHwgb3JpZ2luYWxWYWx1ZS53aWR0aCB8fCAxMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IE51bWJlcihpbnB1dFZhbHVlLmhlaWdodCkgfHwgb3JpZ2luYWxWYWx1ZS5oZWlnaHQgfHwgMTAwXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbFZhbHVlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnbm9kZSc6XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAvLyDoioLngrnlvJXnlKjpnIDopoHnibnmrorlpITnkIZcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlucHV0VmFsdWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaW5wdXRWYWx1ZSA9PT0gJ29iamVjdCcgJiYgaW5wdXRWYWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzlt7Lnu4/mmK/lr7nosaHlvaLlvI/vvIzov5Tlm55VVUlE5oiW5a6M5pW05a+56LGhXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpbnB1dFZhbHVlLnV1aWQgfHwgaW5wdXRWYWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsVmFsdWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdhc3NldCc6XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzovpPlhaXmmK/lrZfnrKbkuLLot6/lvoTvvIzovazmjaLkuLphc3NldOWvueixoVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB1dWlkOiBpbnB1dFZhbHVlIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaW5wdXRWYWx1ZSA9PT0gJ29iamVjdCcgJiYgaW5wdXRWYWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaW5wdXRWYWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsVmFsdWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIOWvueS6juacquefpeexu+Wei++8jOWwvemHj+S/neaMgeWOn+aciee7k+aehFxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaW5wdXRWYWx1ZSA9PT0gdHlwZW9mIG9yaWdpbmFsVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlucHV0VmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbFZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgICAgIHByaXZhdGUgcGFyc2VDb2xvclN0cmluZyhjb2xvclN0cjogc3RyaW5nKTogeyByOiBudW1iZXI7IGc6IG51bWJlcjsgYjogbnVtYmVyOyBhOiBudW1iZXIgfSB7XG4gICAgICAgIGNvbnN0IHN0ciA9IGNvbG9yU3RyLnRyaW0oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIOWPquaUr+aMgeWNgeWFrei/m+WItuagvOW8jyAjUlJHR0JCIOaIliAjUlJHR0JCQUFcbiAgICAgICAgaWYgKHN0ci5zdGFydHNXaXRoKCcjJykpIHtcbiAgICAgICAgICAgIGlmIChzdHIubGVuZ3RoID09PSA3KSB7IC8vICNSUkdHQkJcbiAgICAgICAgICAgICAgICBjb25zdCByID0gcGFyc2VJbnQoc3RyLnN1YnN0cmluZygxLCAzKSwgMTYpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGcgPSBwYXJzZUludChzdHIuc3Vic3RyaW5nKDMsIDUpLCAxNik7XG4gICAgICAgICAgICAgICAgY29uc3QgYiA9IHBhcnNlSW50KHN0ci5zdWJzdHJpbmcoNSwgNyksIDE2KTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyByLCBnLCBiLCBhOiAyNTUgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RyLmxlbmd0aCA9PT0gOSkgeyAvLyAjUlJHR0JCQUFcbiAgICAgICAgICAgICAgICBjb25zdCByID0gcGFyc2VJbnQoc3RyLnN1YnN0cmluZygxLCAzKSwgMTYpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGcgPSBwYXJzZUludChzdHIuc3Vic3RyaW5nKDMsIDUpLCAxNik7XG4gICAgICAgICAgICAgICAgY29uc3QgYiA9IHBhcnNlSW50KHN0ci5zdWJzdHJpbmcoNSwgNyksIDE2KTtcbiAgICAgICAgICAgICAgICBjb25zdCBhID0gcGFyc2VJbnQoc3RyLnN1YnN0cmluZyg3LCA5KSwgMTYpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHIsIGcsIGIsIGEgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8g5aaC5p6c5LiN5piv5pyJ5pWI55qE5Y2B5YWt6L+b5Yi25qC85byP77yM6L+U5Zue6ZSZ6K+v5o+Q56S6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjb2xvciBmb3JtYXQ6IFwiJHtjb2xvclN0cn1cIi4gT25seSBoZXhhZGVjaW1hbCBmb3JtYXQgaXMgc3VwcG9ydGVkIChlLmcuLCBcIiNGRjAwMDBcIiBvciBcIiNGRjAwMDBGRlwiKWApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgdmVyaWZ5UHJvcGVydHlDaGFuZ2Uobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nLCBvcmlnaW5hbFZhbHVlOiBhbnksIGV4cGVjdGVkVmFsdWU6IGFueSk6IFByb21pc2U8eyB2ZXJpZmllZDogYm9vbGVhbjsgYWN0dWFsVmFsdWU6IGFueTsgZnVsbERhdGE6IGFueSB9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIFN0YXJ0aW5nIHZlcmlmaWNhdGlvbiBmb3IgJHtjb21wb25lbnRUeXBlfS4ke3Byb3BlcnR5fWApO1xuICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBFeHBlY3RlZCB2YWx1ZTpgLCBKU09OLnN0cmluZ2lmeShleHBlY3RlZFZhbHVlKSk7XG4gICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIE9yaWdpbmFsIHZhbHVlOmAsIEpTT04uc3RyaW5naWZ5KG9yaWdpbmFsVmFsdWUpKTtcbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyDph43mlrDojrflj5bnu4Tku7bkv6Hmga/ov5vooYzpqozor4FcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIENhbGxpbmcgZ2V0Q29tcG9uZW50SW5mby4uLmApO1xuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50SW5mbyA9IGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50SW5mbyhub2RlVXVpZCwgY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBnZXRDb21wb25lbnRJbmZvIHN1Y2Nlc3M6YCwgY29tcG9uZW50SW5mby5zdWNjZXNzKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgYWxsQ29tcG9uZW50cyA9IGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50cyhub2RlVXVpZCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBnZXRDb21wb25lbnRzIHN1Y2Nlc3M6YCwgYWxsQ29tcG9uZW50cy5zdWNjZXNzKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGNvbXBvbmVudEluZm8uc3VjY2VzcyAmJiBjb21wb25lbnRJbmZvLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBDb21wb25lbnQgZGF0YSBhdmFpbGFibGUsIGV4dHJhY3RpbmcgcHJvcGVydHkgJyR7cHJvcGVydHl9J2ApO1xuICAgICAgICAgICAgICAgIGNvbnN0IGFsbFByb3BlcnR5TmFtZXMgPSBPYmplY3Qua2V5cyhjb21wb25lbnRJbmZvLmRhdGEucHJvcGVydGllcyB8fCB7fSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gQXZhaWxhYmxlIHByb3BlcnRpZXM6YCwgYWxsUHJvcGVydHlOYW1lcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvcGVydHlEYXRhID0gY29tcG9uZW50SW5mby5kYXRhLnByb3BlcnRpZXM/Lltwcm9wZXJ0eV07XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gUmF3IHByb3BlcnR5IGRhdGEgZm9yICcke3Byb3BlcnR5fSc6YCwgSlNPTi5zdHJpbmdpZnkocHJvcGVydHlEYXRhKSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8g5LuO5bGe5oCn5pWw5o2u5Lit5o+Q5Y+W5a6e6ZmF5YC8XG4gICAgICAgICAgICAgICAgbGV0IGFjdHVhbFZhbHVlID0gcHJvcGVydHlEYXRhO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIEluaXRpYWwgYWN0dWFsVmFsdWU6YCwgSlNPTi5zdHJpbmdpZnkoYWN0dWFsVmFsdWUpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAocHJvcGVydHlEYXRhICYmIHR5cGVvZiBwcm9wZXJ0eURhdGEgPT09ICdvYmplY3QnICYmICd2YWx1ZScgaW4gcHJvcGVydHlEYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGFjdHVhbFZhbHVlID0gcHJvcGVydHlEYXRhLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBFeHRyYWN0ZWQgYWN0dWFsVmFsdWUgZnJvbSAudmFsdWU6YCwgSlNPTi5zdHJpbmdpZnkoYWN0dWFsVmFsdWUpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBObyAudmFsdWUgcHJvcGVydHkgZm91bmQsIHVzaW5nIHJhdyBkYXRhYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIOS/ruWkjemqjOivgemAu+i+ke+8muajgOafpeWunumZheWAvOaYr+WQpuWMuemFjeacn+acm+WAvFxuICAgICAgICAgICAgICAgIGxldCB2ZXJpZmllZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZXhwZWN0ZWRWYWx1ZSA9PT0gJ29iamVjdCcgJiYgZXhwZWN0ZWRWYWx1ZSAhPT0gbnVsbCAmJiAndXVpZCcgaW4gZXhwZWN0ZWRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyDlr7nkuo7lvJXnlKjnsbvlnovvvIjoioLngrkv57uE5Lu2L+i1hOa6kO+8ie+8jOavlOi+g1VVSURcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYWN0dWFsVXVpZCA9IGFjdHVhbFZhbHVlICYmIHR5cGVvZiBhY3R1YWxWYWx1ZSA9PT0gJ29iamVjdCcgJiYgJ3V1aWQnIGluIGFjdHVhbFZhbHVlID8gYWN0dWFsVmFsdWUudXVpZCA6ICcnO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBleHBlY3RlZFV1aWQgPSBleHBlY3RlZFZhbHVlLnV1aWQgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgIHZlcmlmaWVkID0gYWN0dWFsVXVpZCA9PT0gZXhwZWN0ZWRVdWlkICYmIGV4cGVjdGVkVXVpZCAhPT0gJyc7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBSZWZlcmVuY2UgY29tcGFyaXNvbjpgKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBFeHBlY3RlZCBVVUlEOiBcIiR7ZXhwZWN0ZWRVdWlkfVwiYCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgIC0gQWN0dWFsIFVVSUQ6IFwiJHthY3R1YWxVdWlkfVwiYCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgIC0gVVVJRCBtYXRjaDogJHthY3R1YWxVdWlkID09PSBleHBlY3RlZFV1aWR9YCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgIC0gVVVJRCBub3QgZW1wdHk6ICR7ZXhwZWN0ZWRVdWlkICE9PSAnJ31gKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBGaW5hbCB2ZXJpZmllZDogJHt2ZXJpZmllZH1gKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyDlr7nkuo7lhbbku5bnsbvlnovvvIznm7TmjqXmr5TovoPlgLxcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gVmFsdWUgY29tcGFyaXNvbjpgKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBFeHBlY3RlZCB0eXBlOiAke3R5cGVvZiBleHBlY3RlZFZhbHVlfWApO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAtIEFjdHVhbCB0eXBlOiAke3R5cGVvZiBhY3R1YWxWYWx1ZX1gKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYWN0dWFsVmFsdWUgPT09IHR5cGVvZiBleHBlY3RlZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGFjdHVhbFZhbHVlID09PSAnb2JqZWN0JyAmJiBhY3R1YWxWYWx1ZSAhPT0gbnVsbCAmJiBleHBlY3RlZFZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5a+56LGh57G75Z6L55qE5rex5bqm5q+U6L6DXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyaWZpZWQgPSBKU09OLnN0cmluZ2lmeShhY3R1YWxWYWx1ZSkgPT09IEpTT04uc3RyaW5naWZ5KGV4cGVjdGVkVmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgIC0gT2JqZWN0IGNvbXBhcmlzb24gKEpTT04pOiAke3ZlcmlmaWVkfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDln7rmnKznsbvlnovnmoTnm7TmjqXmr5TovoNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJpZmllZCA9IGFjdHVhbFZhbHVlID09PSBleHBlY3RlZFZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgIC0gRGlyZWN0IGNvbXBhcmlzb246ICR7dmVyaWZpZWR9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDnsbvlnovkuI3ljLnphY3ml7bnmoTnibnmrorlpITnkIbvvIjlpoLmlbDlrZflkozlrZfnrKbkuLLvvIlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0cmluZ01hdGNoID0gU3RyaW5nKGFjdHVhbFZhbHVlKSA9PT0gU3RyaW5nKGV4cGVjdGVkVmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbnVtYmVyTWF0Y2ggPSBOdW1iZXIoYWN0dWFsVmFsdWUpID09PSBOdW1iZXIoZXhwZWN0ZWRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJpZmllZCA9IHN0cmluZ01hdGNoIHx8IG51bWJlck1hdGNoO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBTdHJpbmcgbWF0Y2g6ICR7c3RyaW5nTWF0Y2h9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAtIE51bWJlciBtYXRjaDogJHtudW1iZXJNYXRjaH1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgIC0gVHlwZSBtaXNtYXRjaCB2ZXJpZmllZDogJHt2ZXJpZmllZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBGaW5hbCB2ZXJpZmljYXRpb24gcmVzdWx0OiAke3ZlcmlmaWVkfWApO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIEZpbmFsIGFjdHVhbFZhbHVlOmAsIEpTT04uc3RyaW5naWZ5KGFjdHVhbFZhbHVlKSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0ge1xuICAgICAgICAgICAgICAgICAgICB2ZXJpZmllZCxcbiAgICAgICAgICAgICAgICAgICAgYWN0dWFsVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIGZ1bGxEYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDlj6rov5Tlm57kv67mlLnnmoTlsZ7mgKfkv6Hmga/vvIzkuI3ov5Tlm57lrozmlbTnu4Tku7bmlbDmja5cbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZGlmaWVkUHJvcGVydHk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBwcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZWZvcmU6IG9yaWdpbmFsVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IGV4cGVjdGVkVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0dWFsOiBhY3R1YWxWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJpZmllZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eU1ldGFkYXRhOiBwcm9wZXJ0eURhdGEgLy8g5Y+q5YyF5ZCr6L+Z5Liq5bGe5oCn55qE5YWD5pWw5o2uXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g566A5YyW55qE57uE5Lu25L+h5oGvXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRTdW1tYXJ5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b3RhbFByb3BlcnRpZXM6IE9iamVjdC5rZXlzKGNvbXBvbmVudEluZm8uZGF0YT8ucHJvcGVydGllcyB8fCB7fSkubGVuZ3RoXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIFJldHVybmluZyByZXN1bHQ6YCwgSlNPTi5zdHJpbmdpZnkocmVzdWx0LCBudWxsLCAyKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gQ29tcG9uZW50SW5mbyBmYWlsZWQgb3Igbm8gZGF0YTpgLCBjb21wb25lbnRJbmZvKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1t2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gVmVyaWZpY2F0aW9uIGZhaWxlZCB3aXRoIGVycm9yOicsIGVycm9yKTtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1t2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gRXJyb3Igc3RhY2s6JywgZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLnN0YWNrIDogJ05vIHN0YWNrIHRyYWNlJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIFJldHVybmluZyBmYWxsYmFjayByZXN1bHRgKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHZlcmlmaWVkOiBmYWxzZSxcbiAgICAgICAgICAgIGFjdHVhbFZhbHVlOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBmdWxsRGF0YTogbnVsbFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOajgOa1i+aYr+WQpuS4uuiKgueCueWxnuaAp++8jOWmguaenOaYr+WImemHjeWumuWQkeWIsOWvueW6lOeahOiKgueCueaWueazlVxuICAgICAqL1xuICAgIHByaXZhdGUgYXN5bmMgY2hlY2tBbmRSZWRpcmVjdE5vZGVQcm9wZXJ0aWVzKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlIHwgbnVsbD4ge1xuICAgICAgICBjb25zdCB7IG5vZGVVdWlkLCBjb21wb25lbnRUeXBlLCBwcm9wZXJ0eSwgcHJvcGVydHlUeXBlLCB2YWx1ZSB9ID0gYXJncztcbiAgICAgICAgXG4gICAgICAgIC8vIOajgOa1i+aYr+WQpuS4uuiKgueCueWfuuehgOWxnuaAp++8iOW6lOivpeS9v+eUqCBzZXRfbm9kZV9wcm9wZXJ0ee+8iVxuICAgICAgICBjb25zdCBub2RlQmFzaWNQcm9wZXJ0aWVzID0gW1xuICAgICAgICAgICAgJ25hbWUnLCAnYWN0aXZlJywgJ2xheWVyJywgJ21vYmlsaXR5JywgJ3BhcmVudCcsICdjaGlsZHJlbicsICdoaWRlRmxhZ3MnXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICAvLyDmo4DmtYvmmK/lkKbkuLroioLngrnlj5jmjaLlsZ7mgKfvvIjlupTor6Xkvb/nlKggc2V0X25vZGVfdHJhbnNmb3Jt77yJXG4gICAgICAgIGNvbnN0IG5vZGVUcmFuc2Zvcm1Qcm9wZXJ0aWVzID0gW1xuICAgICAgICAgICAgJ3Bvc2l0aW9uJywgJ3JvdGF0aW9uJywgJ3NjYWxlJywgJ2V1bGVyQW5nbGVzJywgJ2FuZ2xlJ1xuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgLy8gRGV0ZWN0IGF0dGVtcHRzIHRvIHNldCBjYy5Ob2RlIHByb3BlcnRpZXMgKGNvbW1vbiBtaXN0YWtlKVxuICAgICAgICBpZiAoY29tcG9uZW50VHlwZSA9PT0gJ2NjLk5vZGUnIHx8IGNvbXBvbmVudFR5cGUgPT09ICdOb2RlJykge1xuICAgICAgICAgICAgaWYgKG5vZGVCYXNpY1Byb3BlcnRpZXMuaW5jbHVkZXMocHJvcGVydHkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYFByb3BlcnR5ICcke3Byb3BlcnR5fScgaXMgYSBub2RlIGJhc2ljIHByb3BlcnR5LCBub3QgYSBjb21wb25lbnQgcHJvcGVydHlgLFxuICAgICAgICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiBgUGxlYXNlIHVzZSBzZXRfbm9kZV9wcm9wZXJ0eSBtZXRob2QgdG8gc2V0IG5vZGUgcHJvcGVydGllczogc2V0X25vZGVfcHJvcGVydHkodXVpZD1cIiR7bm9kZVV1aWR9XCIsIHByb3BlcnR5PVwiJHtwcm9wZXJ0eX1cIiwgdmFsdWU9JHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9KWBcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAobm9kZVRyYW5zZm9ybVByb3BlcnRpZXMuaW5jbHVkZXMocHJvcGVydHkpKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgUHJvcGVydHkgJyR7cHJvcGVydHl9JyBpcyBhIG5vZGUgdHJhbnNmb3JtIHByb3BlcnR5LCBub3QgYSBjb21wb25lbnQgcHJvcGVydHlgLFxuICAgICAgICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiBgUGxlYXNlIHVzZSBzZXRfbm9kZV90cmFuc2Zvcm0gbWV0aG9kIHRvIHNldCB0cmFuc2Zvcm0gcHJvcGVydGllczogc2V0X25vZGVfdHJhbnNmb3JtKHV1aWQ9XCIke25vZGVVdWlkfVwiLCAke3Byb3BlcnR5fT0ke0pTT04uc3RyaW5naWZ5KHZhbHVlKX0pYFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICAvLyBEZXRlY3QgY29tbW9uIGluY29ycmVjdCB1c2FnZVxuICAgICAgICAgIGlmIChub2RlQmFzaWNQcm9wZXJ0aWVzLmluY2x1ZGVzKHByb3BlcnR5KSB8fCBub2RlVHJhbnNmb3JtUHJvcGVydGllcy5pbmNsdWRlcyhwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgY29uc3QgbWV0aG9kTmFtZSA9IG5vZGVUcmFuc2Zvcm1Qcm9wZXJ0aWVzLmluY2x1ZGVzKHByb3BlcnR5KSA/ICdzZXRfbm9kZV90cmFuc2Zvcm0nIDogJ3NldF9ub2RlX3Byb3BlcnR5JztcbiAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgZXJyb3I6IGBQcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIGlzIGEgbm9kZSBwcm9wZXJ0eSwgbm90IGEgY29tcG9uZW50IHByb3BlcnR5YCxcbiAgICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiBgUHJvcGVydHkgJyR7cHJvcGVydHl9JyBzaG91bGQgYmUgc2V0IHVzaW5nICR7bWV0aG9kTmFtZX0gbWV0aG9kLCBub3Qgc2V0X2NvbXBvbmVudF9wcm9wZXJ0eS4gUGxlYXNlIHVzZTogJHttZXRob2ROYW1lfSh1dWlkPVwiJHtub2RlVXVpZH1cIiwgJHtub2RlVHJhbnNmb3JtUHJvcGVydGllcy5pbmNsdWRlcyhwcm9wZXJ0eSkgPyBwcm9wZXJ0eSA6IGBwcm9wZXJ0eT1cIiR7cHJvcGVydHl9XCJgfT0ke0pTT04uc3RyaW5naWZ5KHZhbHVlKX0pYFxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICByZXR1cm4gbnVsbDsgLy8g5LiN5piv6IqC54K55bGe5oCn77yM57un57ut5q2j5bi45aSE55CGXG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAgICog55Sf5oiQ57uE5Lu25bu66K6u5L+h5oGvXG4gICAgICAgKi9cbiAgICAgIHByaXZhdGUgZ2VuZXJhdGVDb21wb25lbnRTdWdnZXN0aW9uKHJlcXVlc3RlZFR5cGU6IHN0cmluZywgYXZhaWxhYmxlVHlwZXM6IHN0cmluZ1tdLCBwcm9wZXJ0eTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgICAvLyDmo4Dmn6XmmK/lkKblrZjlnKjnm7jkvLznmoTnu4Tku7bnsbvlnotcbiAgICAgICAgICBjb25zdCBzaW1pbGFyVHlwZXMgPSBhdmFpbGFibGVUeXBlcy5maWx0ZXIodHlwZSA9PiBcbiAgICAgICAgICAgICAgdHlwZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHJlcXVlc3RlZFR5cGUudG9Mb3dlckNhc2UoKSkgfHwgXG4gICAgICAgICAgICAgIHJlcXVlc3RlZFR5cGUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyh0eXBlLnRvTG93ZXJDYXNlKCkpXG4gICAgICAgICAgKTtcbiAgICAgICAgICBcbiAgICAgICAgICBsZXQgaW5zdHJ1Y3Rpb24gPSAnJztcbiAgICAgICAgICBcbiAgICAgICAgICBpZiAoc2ltaWxhclR5cGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb24gKz0gYFxcblxcbvCflI0gRm91bmQgc2ltaWxhciBjb21wb25lbnRzOiAke3NpbWlsYXJUeXBlcy5qb2luKCcsICcpfWA7XG4gICAgICAgICAgICAgIGluc3RydWN0aW9uICs9IGBcXG7wn5KhIFN1Z2dlc3Rpb246IFBlcmhhcHMgeW91IG1lYW50IHRvIHNldCB0aGUgJyR7c2ltaWxhclR5cGVzWzBdfScgY29tcG9uZW50P2A7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIFJlY29tbWVuZCBwb3NzaWJsZSBjb21wb25lbnRzIGJhc2VkIG9uIHByb3BlcnR5IG5hbWVcbiAgICAgICAgICBjb25zdCBwcm9wZXJ0eVRvQ29tcG9uZW50TWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT4gPSB7XG4gICAgICAgICAgICAgICdzdHJpbmcnOiBbJ2NjLkxhYmVsJywgJ2NjLlJpY2hUZXh0JywgJ2NjLkVkaXRCb3gnXSxcbiAgICAgICAgICAgICAgJ3RleHQnOiBbJ2NjLkxhYmVsJywgJ2NjLlJpY2hUZXh0J10sXG4gICAgICAgICAgICAgICdmb250U2l6ZSc6IFsnY2MuTGFiZWwnLCAnY2MuUmljaFRleHQnXSxcbiAgICAgICAgICAgICAgJ3Nwcml0ZUZyYW1lJzogWydjYy5TcHJpdGUnXSxcbiAgICAgICAgICAgICAgJ2NvbG9yJzogWydjYy5MYWJlbCcsICdjYy5TcHJpdGUnLCAnY2MuR3JhcGhpY3MnXSxcbiAgICAgICAgICAgICAgJ25vcm1hbENvbG9yJzogWydjYy5CdXR0b24nXSxcbiAgICAgICAgICAgICAgJ3ByZXNzZWRDb2xvcic6IFsnY2MuQnV0dG9uJ10sXG4gICAgICAgICAgICAgICd0YXJnZXQnOiBbJ2NjLkJ1dHRvbiddLFxuICAgICAgICAgICAgICAnY29udGVudFNpemUnOiBbJ2NjLlVJVHJhbnNmb3JtJ10sXG4gICAgICAgICAgICAgICdhbmNob3JQb2ludCc6IFsnY2MuVUlUcmFuc2Zvcm0nXVxuICAgICAgICAgIH07XG4gICAgICAgICAgXG4gICAgICAgICAgY29uc3QgcmVjb21tZW5kZWRDb21wb25lbnRzID0gcHJvcGVydHlUb0NvbXBvbmVudE1hcFtwcm9wZXJ0eV0gfHwgW107XG4gICAgICAgICAgY29uc3QgYXZhaWxhYmxlUmVjb21tZW5kZWQgPSByZWNvbW1lbmRlZENvbXBvbmVudHMuZmlsdGVyKGNvbXAgPT4gYXZhaWxhYmxlVHlwZXMuaW5jbHVkZXMoY29tcCkpO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmIChhdmFpbGFibGVSZWNvbW1lbmRlZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgIGluc3RydWN0aW9uICs9IGBcXG5cXG7wn46vIEJhc2VkIG9uIHByb3BlcnR5ICcke3Byb3BlcnR5fScsIHJlY29tbWVuZGVkIGNvbXBvbmVudHM6ICR7YXZhaWxhYmxlUmVjb21tZW5kZWQuam9pbignLCAnKX1gO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICAvLyBQcm92aWRlIG9wZXJhdGlvbiBzdWdnZXN0aW9uc1xuICAgICAgICAgIGluc3RydWN0aW9uICs9IGBcXG5cXG7wn5OLIFN1Z2dlc3RlZCBBY3Rpb25zOmA7XG4gICAgICAgICAgaW5zdHJ1Y3Rpb24gKz0gYFxcbjEuIFVzZSBnZXRfY29tcG9uZW50cyhub2RlVXVpZD1cIiR7cmVxdWVzdGVkVHlwZS5pbmNsdWRlcygndXVpZCcpID8gJ1lPVVJfTk9ERV9VVUlEJyA6ICdub2RlVXVpZCd9XCIpIHRvIHZpZXcgYWxsIGNvbXBvbmVudHMgb24gdGhlIG5vZGVgO1xuICAgICAgICAgIGluc3RydWN0aW9uICs9IGBcXG4yLiBJZiB5b3UgbmVlZCB0byBhZGQgYSBjb21wb25lbnQsIHVzZSBhZGRfY29tcG9uZW50KG5vZGVVdWlkPVwiLi4uXCIsIGNvbXBvbmVudFR5cGU9XCIke3JlcXVlc3RlZFR5cGV9XCIpYDtcbiAgICAgICAgICBpbnN0cnVjdGlvbiArPSBgXFxuMy4gVmVyaWZ5IHRoYXQgdGhlIGNvbXBvbmVudCB0eXBlIG5hbWUgaXMgY29ycmVjdCAoY2FzZS1zZW5zaXRpdmUpYDtcbiAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgIHJldHVybiBpbnN0cnVjdGlvbjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDlv6vpgJ/pqozor4HotYTmupDorr7nva7nu5PmnpxcbiAgICAgKi9cbiAgICBwcml2YXRlIGFzeW5jIHF1aWNrVmVyaWZ5QXNzZXQobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJhd05vZGVEYXRhID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghcmF3Tm9kZURhdGEgfHwgIXJhd05vZGVEYXRhLl9fY29tcHNfXykge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyDmib7liLDnu4Tku7ZcbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudCA9IHJhd05vZGVEYXRhLl9fY29tcHNfXy5maW5kKChjb21wOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb21wVHlwZSA9IGNvbXAuX190eXBlX18gfHwgY29tcC5jaWQgfHwgY29tcC50eXBlO1xuICAgICAgICAgICAgICAgIHJldHVybiBjb21wVHlwZSA9PT0gY29tcG9uZW50VHlwZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyDmj5Dlj5blsZ7mgKflgLxcbiAgICAgICAgICAgIGNvbnN0IHByb3BlcnRpZXMgPSB0aGlzLmV4dHJhY3RDb21wb25lbnRQcm9wZXJ0aWVzKGNvbXBvbmVudCk7XG4gICAgICAgICAgICBjb25zdCBwcm9wZXJ0eURhdGEgPSBwcm9wZXJ0aWVzW3Byb3BlcnR5XTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHByb3BlcnR5RGF0YSAmJiB0eXBlb2YgcHJvcGVydHlEYXRhID09PSAnb2JqZWN0JyAmJiAndmFsdWUnIGluIHByb3BlcnR5RGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0eURhdGEudmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0eURhdGE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBbcXVpY2tWZXJpZnlBc3NldF0gRXJyb3I6YCwgZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG59Il19