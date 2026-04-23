"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneAdvancedTools = void 0;
const error_response_1 = require("../utils/error-response");
class SceneAdvancedTools {
    getTools() {
        return [
            {
                name: 'reset',
                description: 'Unified reset (v1.6.0). action=property: reset node property by path. action=transform: reset position/rotation/scale. action=component: reset component to defaults. ⚠ Do not invoke in parallel with other mutating tools — Cocos IPC serializes and concurrent calls time out.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['property', 'transform', 'component'],
                            description: 'What to reset'
                        },
                        uuid: { type: 'string', description: 'Node UUID (property/transform) or Component UUID (component)' },
                        path: { type: 'string', description: 'For property: path to reset (e.g., "position")' }
                    },
                    required: ['action', 'uuid']
                }
            },
            {
                name: 'move_array_element',
                description: 'Move array element position',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: {
                            type: 'string',
                            description: 'Node UUID'
                        },
                        path: {
                            type: 'string',
                            description: 'Array property path (e.g., __comps__)'
                        },
                        target: {
                            type: 'number',
                            description: 'Target item original index'
                        },
                        offset: {
                            type: 'number',
                            description: 'Offset amount (positive or negative)'
                        }
                    },
                    required: ['uuid', 'path', 'target', 'offset']
                }
            },
            {
                name: 'remove_array_element',
                description: 'Remove array element at specific index',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: {
                            type: 'string',
                            description: 'Node UUID'
                        },
                        path: {
                            type: 'string',
                            description: 'Array property path'
                        },
                        index: {
                            type: 'number',
                            description: 'Target item index to remove'
                        }
                    },
                    required: ['uuid', 'path', 'index']
                }
            },
            {
                name: 'copy_node',
                description: 'Copy node for later paste operation',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuids: {
                            oneOf: [
                                { type: 'string' },
                                { type: 'array', items: { type: 'string' } }
                            ],
                            description: 'Node UUID or array of UUIDs to copy'
                        }
                    },
                    required: ['uuids']
                }
            },
            {
                name: 'paste_node',
                description: 'Paste previously copied nodes',
                inputSchema: {
                    type: 'object',
                    properties: {
                        target: {
                            type: 'string',
                            description: 'Target parent node UUID'
                        },
                        uuids: {
                            oneOf: [
                                { type: 'string' },
                                { type: 'array', items: { type: 'string' } }
                            ],
                            description: 'Node UUIDs to paste'
                        },
                        keepWorldTransform: {
                            type: 'boolean',
                            description: 'Keep world transform coordinates',
                            default: false
                        }
                    },
                    required: ['target', 'uuids']
                }
            },
            {
                name: 'cut_node',
                description: 'Cut node (copy + mark for move)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuids: {
                            oneOf: [
                                { type: 'string' },
                                { type: 'array', items: { type: 'string' } }
                            ],
                            description: 'Node UUID or array of UUIDs to cut'
                        }
                    },
                    required: ['uuids']
                }
            },
            // v1.6.0: reset_node_transform + reset_component merged into `reset({action})` above.
            {
                name: 'restore_prefab',
                description: 'Restore prefab instance from asset',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID'
                        },
                        assetUuid: {
                            type: 'string',
                            description: 'Prefab asset UUID'
                        }
                    },
                    required: ['nodeUuid', 'assetUuid']
                }
            },
            {
                name: 'execute_component_method',
                description: 'Execute method on component',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: {
                            type: 'string',
                            description: 'Component UUID'
                        },
                        name: {
                            type: 'string',
                            description: 'Method name'
                        },
                        args: {
                            type: 'array',
                            description: 'Method arguments',
                            default: []
                        }
                    },
                    required: ['uuid', 'name']
                }
            },
            {
                name: 'execute_scene_script',
                description: 'Execute scene script method',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Plugin name'
                        },
                        method: {
                            type: 'string',
                            description: 'Method name'
                        },
                        args: {
                            type: 'array',
                            description: 'Method arguments',
                            default: []
                        }
                    },
                    required: ['name', 'method']
                }
            },
            {
                name: 'scene_snapshot',
                description: 'Create scene state snapshot',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'scene_snapshot_abort',
                description: 'Abort scene snapshot creation',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'begin_undo_recording',
                description: 'Begin recording undo data',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID to record'
                        }
                    },
                    required: ['nodeUuid']
                }
            },
            {
                name: 'end_undo_recording',
                description: 'End recording undo data',
                inputSchema: {
                    type: 'object',
                    properties: {
                        undoId: {
                            type: 'string',
                            description: 'Undo recording ID from begin_undo_recording'
                        }
                    },
                    required: ['undoId']
                }
            },
            {
                name: 'cancel_undo_recording',
                description: 'Cancel undo recording',
                inputSchema: {
                    type: 'object',
                    properties: {
                        undoId: {
                            type: 'string',
                            description: 'Undo recording ID to cancel'
                        }
                    },
                    required: ['undoId']
                }
            },
            {
                name: 'soft_reload_scene',
                description: 'Soft reload current scene',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'query_scene_ready',
                description: 'Check if scene is ready',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'query_scene_dirty',
                description: 'Check if scene has unsaved changes',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'query_scene_classes',
                description: 'Query all registered classes',
                inputSchema: {
                    type: 'object',
                    properties: {
                        extends: {
                            type: 'string',
                            description: 'Filter classes that extend this base class'
                        }
                    }
                }
            },
            {
                name: 'query_scene_components',
                description: 'Query available scene components',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'query_component_has_script',
                description: 'Check if component has script',
                inputSchema: {
                    type: 'object',
                    properties: {
                        className: {
                            type: 'string',
                            description: 'Script class name to check'
                        }
                    },
                    required: ['className']
                }
            },
            {
                name: 'query_nodes_by_asset_uuid',
                description: 'Find nodes that use specific asset UUID',
                inputSchema: {
                    type: 'object',
                    properties: {
                        assetUuid: {
                            type: 'string',
                            description: 'Asset UUID to search for'
                        }
                    },
                    required: ['assetUuid']
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'reset_node_property':
                return await this.resetNodeProperty(args.uuid, args.path);
            case 'move_array_element':
                return await this.moveArrayElement(args.uuid, args.path, args.target, args.offset);
            case 'remove_array_element':
                return await this.removeArrayElement(args.uuid, args.path, args.index);
            case 'copy_node':
                return await this.copyNode(args.uuids);
            case 'paste_node':
                return await this.pasteNode(args.target, args.uuids, args.keepWorldTransform);
            case 'cut_node':
                return await this.cutNode(args.uuids);
            case 'reset_node_transform':
                return await this.resetNodeTransform(args.uuid);
            case 'reset_component':
                return await this.resetComponent(args.uuid);
            case 'reset':
                // v1.6.0 unified action-code dispatcher
                switch (args.action) {
                    case 'property':
                        return await this.resetNodeProperty(args.uuid, args.path);
                    case 'transform':
                        return await this.resetNodeTransform(args.uuid);
                    case 'component':
                        return await this.resetComponent(args.uuid);
                    default:
                        return {
                            success: false,
                            error: `Unknown reset action: ${args.action}`,
                            errorCode: 'INVALID_PARAMS'
                        };
                }
            case 'restore_prefab':
                return await this.restorePrefab(args.nodeUuid, args.assetUuid);
            case 'execute_component_method':
                return await this.executeComponentMethod(args.uuid, args.name, args.args);
            case 'execute_scene_script':
                return await this.executeSceneScript(args.name, args.method, args.args);
            case 'scene_snapshot':
                return await this.sceneSnapshot();
            case 'scene_snapshot_abort':
                return await this.sceneSnapshotAbort();
            case 'begin_undo_recording':
                return await this.beginUndoRecording(args.nodeUuid);
            case 'end_undo_recording':
                return await this.endUndoRecording(args.undoId);
            case 'cancel_undo_recording':
                return await this.cancelUndoRecording(args.undoId);
            case 'soft_reload_scene':
                return await this.softReloadScene();
            case 'query_scene_ready':
                return await this.querySceneReady();
            case 'query_scene_dirty':
                return await this.querySceneDirty();
            case 'query_scene_classes':
                return await this.querySceneClasses(args.extends);
            case 'query_scene_components':
                return await this.querySceneComponents();
            case 'query_component_has_script':
                return await this.queryComponentHasScript(args.className);
            case 'query_nodes_by_asset_uuid':
                return await this.queryNodesByAssetUuid(args.assetUuid);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    async resetNodeProperty(uuid, path) {
        // P2-1 fix (v1.6.1): Cocos's reset-property can throw raw JS errors
        // (e.g. "Cannot read properties of undefined (reading 'indexOf')") when
        // path is unknown or malformed. Pre-validate + wrap the .catch in
        // createErrorResponse so callers see a structured errorCode + suggestion
        // instead of an untagged string.
        if (!uuid || typeof uuid !== 'string') {
            return (0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.INVALID_PARAMS, 'uuid must be a non-empty string', { suggestion: 'Use get_all_nodes or find_node_by_name to obtain a valid node UUID' });
        }
        if (!path || typeof path !== 'string') {
            return (0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.INVALID_PARAMS, 'path must be a non-empty property path', { suggestion: 'Valid paths look like "position" / "rotation" / "scale" / a component property name' });
        }
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'reset-property', {
                uuid,
                path,
                dump: { value: null }
            }).then(() => {
                resolve({
                    success: true,
                    message: `Property '${path}' reset to default value`
                });
            }).catch((err) => {
                var _a;
                resolve((0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.EDITOR_API_ERROR, (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err), {
                    relatedAssets: [uuid],
                    suggestion: `Cocos scene.reset-property rejected path "${path}". Verify the path exists on the node (try get_node_info first) and uses the exact case Cocos expects.`
                }));
            });
        });
    }
    async moveArrayElement(uuid, path, target, offset) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'move-array-element', {
                uuid,
                path,
                target,
                offset
            }).then(() => {
                resolve({
                    success: true,
                    message: `Array element at index ${target} moved by ${offset}`
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async removeArrayElement(uuid, path, index) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'remove-array-element', {
                uuid,
                path,
                index
            }).then(() => {
                resolve({
                    success: true,
                    message: `Array element at index ${index} removed`
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async copyNode(uuids) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'copy-node', uuids).then((result) => {
                resolve({
                    success: true,
                    data: {
                        copiedUuids: result,
                        message: 'Node(s) copied successfully'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async pasteNode(target, uuids, keepWorldTransform = false) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'paste-node', {
                target,
                uuids,
                keepWorldTransform
            }).then((result) => {
                resolve({
                    success: true,
                    data: {
                        newUuids: result,
                        message: 'Node(s) pasted successfully'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async cutNode(uuids) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'cut-node', uuids).then((result) => {
                resolve({
                    success: true,
                    data: {
                        cutUuids: result,
                        message: 'Node(s) cut successfully'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async resetNodeTransform(uuid) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'reset-node', { uuid }).then(() => {
                resolve({
                    success: true,
                    message: 'Node transform reset to default'
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async resetComponent(uuid) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'reset-component', { uuid }).then(() => {
                resolve({
                    success: true,
                    message: 'Component reset to default values'
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async restorePrefab(nodeUuid, assetUuid) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'restore-prefab', nodeUuid, assetUuid).then(() => {
                resolve({
                    success: true,
                    message: 'Prefab restored successfully'
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async executeComponentMethod(uuid, name, args = []) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'execute-component-method', {
                uuid,
                name,
                args
            }).then((result) => {
                resolve({
                    success: true,
                    data: {
                        result: result,
                        message: `Method '${name}' executed successfully`
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async executeSceneScript(name, method, args = []) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'execute-scene-script', {
                name,
                method,
                args
            }).then((result) => {
                resolve({
                    success: true,
                    data: result
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async sceneSnapshot() {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'snapshot').then(() => {
                resolve({
                    success: true,
                    message: 'Scene snapshot created'
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async sceneSnapshotAbort() {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'snapshot-abort').then(() => {
                resolve({
                    success: true,
                    message: 'Scene snapshot aborted'
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async beginUndoRecording(nodeUuid) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'begin-recording', nodeUuid).then((undoId) => {
                resolve({
                    success: true,
                    data: {
                        undoId: undoId,
                        message: 'Undo recording started'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async endUndoRecording(undoId) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'end-recording', undoId).then(() => {
                resolve({
                    success: true,
                    message: 'Undo recording ended'
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async cancelUndoRecording(undoId) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'cancel-recording', undoId).then(() => {
                resolve({
                    success: true,
                    message: 'Undo recording cancelled'
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async softReloadScene() {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'soft-reload').then(() => {
                resolve({
                    success: true,
                    message: 'Scene soft reloaded successfully'
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async querySceneReady() {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-is-ready').then((ready) => {
                resolve({
                    success: true,
                    data: {
                        ready: ready,
                        message: ready ? 'Scene is ready' : 'Scene is not ready'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async querySceneDirty() {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-dirty').then((dirty) => {
                resolve({
                    success: true,
                    data: {
                        dirty: dirty,
                        message: dirty ? 'Scene has unsaved changes' : 'Scene is clean'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async querySceneClasses(extendsClass) {
        return new Promise((resolve) => {
            const options = {};
            if (extendsClass) {
                options.extends = extendsClass;
            }
            Editor.Message.request('scene', 'query-classes', options).then((classes) => {
                resolve({
                    success: true,
                    data: {
                        classes: classes,
                        count: classes.length,
                        extendsFilter: extendsClass
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async querySceneComponents() {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-components').then((components) => {
                resolve({
                    success: true,
                    data: {
                        components: components,
                        count: components.length
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async queryComponentHasScript(className) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-component-has-script', className).then((hasScript) => {
                resolve({
                    success: true,
                    data: {
                        className: className,
                        hasScript: hasScript,
                        message: hasScript ? `Component '${className}' has script` : `Component '${className}' does not have script`
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async queryNodesByAssetUuid(assetUuid) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-nodes-by-asset-uuid', assetUuid).then((nodeUuids) => {
                resolve({
                    success: true,
                    data: {
                        assetUuid: assetUuid,
                        nodeUuids: nodeUuids,
                        count: nodeUuids.length,
                        message: `Found ${nodeUuids.length} nodes using asset`
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
}
exports.SceneAdvancedTools = SceneAdvancedTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtYWR2YW5jZWQtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvc2NlbmUtYWR2YW5jZWQtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsNERBQTJFO0FBRTNFLE1BQWEsa0JBQWtCO0lBQzNCLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLE9BQU87Z0JBQ2IsV0FBVyxFQUFFLG1SQUFtUjtnQkFDaFMsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsSUFBSSxFQUFFLENBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxXQUFXLENBQUM7NEJBQzVDLFdBQVcsRUFBRSxlQUFlO3lCQUMvQjt3QkFDRCxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSw4REFBOEQsRUFBRTt3QkFDckcsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsZ0RBQWdELEVBQUU7cUJBQzFGO29CQUNELFFBQVEsRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUM7aUJBQy9CO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsb0JBQW9CO2dCQUMxQixXQUFXLEVBQUUsNkJBQTZCO2dCQUMxQyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLElBQUksRUFBRTs0QkFDRixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsV0FBVzt5QkFDM0I7d0JBQ0QsSUFBSSxFQUFFOzRCQUNGLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx1Q0FBdUM7eUJBQ3ZEO3dCQUNELE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsNEJBQTRC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QUFFLFNBQVM7d0JBQ3BCLEtBQUssRUFBRSxTQUFTLENBQUMsTUFBTTt3QkFDdkIsT0FBTyxFQUFFLFNBQVMsU0FBUyxDQUFDLE1BQU0sb0JBQW9CO3FCQUN6RDtpQkFDSixDQUFDLENBQUM7WUFDUCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFVLEVBQUUsRUFBRTtnQkFDcEIsT0FBTyxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDcEQsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7Q0FDSjtBQW54QkQsZ0RBbXhCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IGNyZWF0ZUVycm9yUmVzcG9uc2UsIEVSUk9SX0NPREVTIH0gZnJvbSAnLi4vdXRpbHMvZXJyb3ItcmVzcG9uc2UnO1xuXG5leHBvcnQgY2xhc3MgU2NlbmVBZHZhbmNlZFRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAncmVzZXQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVW5pZmllZCByZXNldCAodjEuNi4wKS4gYWN0aW9uPXByb3BlcnR5OiByZXNldCBub2RlIHByb3BlcnR5IGJ5IHBhdGguIGFjdGlvbj10cmFuc2Zvcm06IHJlc2V0IHBvc2l0aW9uL3JvdGF0aW9uL3NjYWxlLiBhY3Rpb249Y29tcG9uZW50OiByZXNldCBjb21wb25lbnQgdG8gZGVmYXVsdHMuIOKaoCBEbyBub3QgaW52b2tlIGluIHBhcmFsbGVsIHdpdGggb3RoZXIgbXV0YXRpbmcgdG9vbHMg4oCUIENvY29zIElQQyBzZXJpYWxpemVzIGFuZCBjb25jdXJyZW50IGNhbGxzIHRpbWUgb3V0LicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsncHJvcGVydHknLCAndHJhbnNmb3JtJywgJ2NvbXBvbmVudCddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnV2hhdCB0byByZXNldCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ05vZGUgVVVJRCAocHJvcGVydHkvdHJhbnNmb3JtKSBvciBDb21wb25lbnQgVVVJRCAoY29tcG9uZW50KScgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnRm9yIHByb3BlcnR5OiBwYXRoIHRvIHJlc2V0IChlLmcuLCBcInBvc2l0aW9uXCIpJyB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbicsICd1dWlkJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdtb3ZlX2FycmF5X2VsZW1lbnQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTW92ZSBhcnJheSBlbGVtZW50IHBvc2l0aW9uJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FycmF5IHByb3BlcnR5IHBhdGggKGUuZy4sIF9fY29tcHNfXyknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUYXJnZXQgaXRlbSBvcmlnaW5hbCBpbmRleCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ09mZnNldCBhbW91bnQgKHBvc2l0aXZlIG9yIG5lZ2F0aXZlKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCcsICdwYXRoJywgJ3RhcmdldCcsICdvZmZzZXQnXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3JlbW92ZV9hcnJheV9lbGVtZW50JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1JlbW92ZSBhcnJheSBlbGVtZW50IGF0IHNwZWNpZmljIGluZGV4JyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FycmF5IHByb3BlcnR5IHBhdGgnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBpdGVtIGluZGV4IHRvIHJlbW92ZSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCcsICdwYXRoJywgJ2luZGV4J11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdjb3B5X25vZGUnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29weSBub2RlIGZvciBsYXRlciBwYXN0ZSBvcGVyYXRpb24nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uZU9mOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyB0eXBlOiAnYXJyYXknLCBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9IH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEIG9yIGFycmF5IG9mIFVVSURzIHRvIGNvcHknXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWRzJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdwYXN0ZV9ub2RlJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Bhc3RlIHByZXZpb3VzbHkgY29waWVkIG5vZGVzJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUYXJnZXQgcGFyZW50IG5vZGUgVVVJRCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uZU9mOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyB0eXBlOiAnYXJyYXknLCBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9IH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEcyB0byBwYXN0ZSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBrZWVwV29ybGRUcmFuc2Zvcm06IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdLZWVwIHdvcmxkIHRyYW5zZm9ybSBjb29yZGluYXRlcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndGFyZ2V0JywgJ3V1aWRzJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdjdXRfbm9kZScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDdXQgbm9kZSAoY29weSArIG1hcmsgZm9yIG1vdmUpJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbmVPZjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdHlwZTogJ2FycmF5JywgaXRlbXM6IHsgdHlwZTogJ3N0cmluZycgfSB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ05vZGUgVVVJRCBvciBhcnJheSBvZiBVVUlEcyB0byBjdXQnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWRzJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLy8gdjEuNi4wOiByZXNldF9ub2RlX3RyYW5zZm9ybSArIHJlc2V0X2NvbXBvbmVudCBtZXJnZWQgaW50byBgcmVzZXQoe2FjdGlvbn0pYCBhYm92ZS5cbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAncmVzdG9yZV9wcmVmYWInLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUmVzdG9yZSBwcmVmYWIgaW5zdGFuY2UgZnJvbSBhc3NldCcsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOb2RlIFVVSUQnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcmVmYWIgYXNzZXQgVVVJRCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbm9kZVV1aWQnLCAnYXNzZXRVdWlkJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdleGVjdXRlX2NvbXBvbmVudF9tZXRob2QnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRXhlY3V0ZSBtZXRob2Qgb24gY29tcG9uZW50JyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29tcG9uZW50IFVVSUQnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWV0aG9kIG5hbWUnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgYXJnczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNZXRob2QgYXJndW1lbnRzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBbXVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1dWlkJywgJ25hbWUnXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2V4ZWN1dGVfc2NlbmVfc2NyaXB0JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0V4ZWN1dGUgc2NlbmUgc2NyaXB0IG1ldGhvZCcsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1BsdWdpbiBuYW1lJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWV0aG9kIG5hbWUnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgYXJnczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNZXRob2QgYXJndW1lbnRzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBbXVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyduYW1lJywgJ21ldGhvZCddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnc2NlbmVfc25hcHNob3QnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ3JlYXRlIHNjZW5lIHN0YXRlIHNuYXBzaG90JyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge31cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdzY2VuZV9zbmFwc2hvdF9hYm9ydCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBYm9ydCBzY2VuZSBzbmFwc2hvdCBjcmVhdGlvbicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHt9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnYmVnaW5fdW5kb19yZWNvcmRpbmcnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQmVnaW4gcmVjb3JkaW5nIHVuZG8gZGF0YScsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOb2RlIFVVSUQgdG8gcmVjb3JkJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydub2RlVXVpZCddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnZW5kX3VuZG9fcmVjb3JkaW5nJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0VuZCByZWNvcmRpbmcgdW5kbyBkYXRhJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdW5kb0lkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdVbmRvIHJlY29yZGluZyBJRCBmcm9tIGJlZ2luX3VuZG9fcmVjb3JkaW5nJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1bmRvSWQnXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2NhbmNlbF91bmRvX3JlY29yZGluZycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDYW5jZWwgdW5kbyByZWNvcmRpbmcnLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1bmRvSWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1VuZG8gcmVjb3JkaW5nIElEIHRvIGNhbmNlbCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndW5kb0lkJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdzb2Z0X3JlbG9hZF9zY2VuZScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTb2Z0IHJlbG9hZCBjdXJyZW50IHNjZW5lJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge31cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdxdWVyeV9zY2VuZV9yZWFkeScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDaGVjayBpZiBzY2VuZSBpcyByZWFkeScsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHt9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAncXVlcnlfc2NlbmVfZGlydHknLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ2hlY2sgaWYgc2NlbmUgaGFzIHVuc2F2ZWQgY2hhbmdlcycsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHt9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAncXVlcnlfc2NlbmVfY2xhc3NlcycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdRdWVyeSBhbGwgcmVnaXN0ZXJlZCBjbGFzc2VzJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5kczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRmlsdGVyIGNsYXNzZXMgdGhhdCBleHRlbmQgdGhpcyBiYXNlIGNsYXNzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAncXVlcnlfc2NlbmVfY29tcG9uZW50cycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdRdWVyeSBhdmFpbGFibGUgc2NlbmUgY29tcG9uZW50cycsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHt9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAncXVlcnlfY29tcG9uZW50X2hhc19zY3JpcHQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ2hlY2sgaWYgY29tcG9uZW50IGhhcyBzY3JpcHQnLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NjcmlwdCBjbGFzcyBuYW1lIHRvIGNoZWNrJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydjbGFzc05hbWUnXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3F1ZXJ5X25vZGVzX2J5X2Fzc2V0X3V1aWQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRmluZCBub2RlcyB0aGF0IHVzZSBzcGVjaWZpYyBhc3NldCBVVUlEJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBc3NldCBVVUlEIHRvIHNlYXJjaCBmb3InXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2Fzc2V0VXVpZCddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xuICAgICAgICAgICAgY2FzZSAncmVzZXRfbm9kZV9wcm9wZXJ0eSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVzZXROb2RlUHJvcGVydHkoYXJncy51dWlkLCBhcmdzLnBhdGgpO1xuICAgICAgICAgICAgY2FzZSAnbW92ZV9hcnJheV9lbGVtZW50JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5tb3ZlQXJyYXlFbGVtZW50KGFyZ3MudXVpZCwgYXJncy5wYXRoLCBhcmdzLnRhcmdldCwgYXJncy5vZmZzZXQpO1xuICAgICAgICAgICAgY2FzZSAncmVtb3ZlX2FycmF5X2VsZW1lbnQnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlbW92ZUFycmF5RWxlbWVudChhcmdzLnV1aWQsIGFyZ3MucGF0aCwgYXJncy5pbmRleCk7XG4gICAgICAgICAgICBjYXNlICdjb3B5X25vZGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNvcHlOb2RlKGFyZ3MudXVpZHMpO1xuICAgICAgICAgICAgY2FzZSAncGFzdGVfbm9kZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucGFzdGVOb2RlKGFyZ3MudGFyZ2V0LCBhcmdzLnV1aWRzLCBhcmdzLmtlZXBXb3JsZFRyYW5zZm9ybSk7XG4gICAgICAgICAgICBjYXNlICdjdXRfbm9kZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY3V0Tm9kZShhcmdzLnV1aWRzKTtcbiAgICAgICAgICAgIGNhc2UgJ3Jlc2V0X25vZGVfdHJhbnNmb3JtJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXNldE5vZGVUcmFuc2Zvcm0oYXJncy51dWlkKTtcbiAgICAgICAgICAgIGNhc2UgJ3Jlc2V0X2NvbXBvbmVudCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVzZXRDb21wb25lbnQoYXJncy51dWlkKTtcbiAgICAgICAgICAgIGNhc2UgJ3Jlc2V0JzpcbiAgICAgICAgICAgICAgICAvLyB2MS42LjAgdW5pZmllZCBhY3Rpb24tY29kZSBkaXNwYXRjaGVyXG4gICAgICAgICAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdwcm9wZXJ0eSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXNldE5vZGVQcm9wZXJ0eShhcmdzLnV1aWQsIGFyZ3MucGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3RyYW5zZm9ybSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXNldE5vZGVUcmFuc2Zvcm0oYXJncy51dWlkKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnY29tcG9uZW50JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlc2V0Q29tcG9uZW50KGFyZ3MudXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgVW5rbm93biByZXNldCBhY3Rpb246ICR7YXJncy5hY3Rpb259YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvckNvZGU6ICdJTlZBTElEX1BBUkFNUydcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gYXMgYW55O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ3Jlc3RvcmVfcHJlZmFiJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXN0b3JlUHJlZmFiKGFyZ3Mubm9kZVV1aWQsIGFyZ3MuYXNzZXRVdWlkKTtcbiAgICAgICAgICAgIGNhc2UgJ2V4ZWN1dGVfY29tcG9uZW50X21ldGhvZCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZXhlY3V0ZUNvbXBvbmVudE1ldGhvZChhcmdzLnV1aWQsIGFyZ3MubmFtZSwgYXJncy5hcmdzKTtcbiAgICAgICAgICAgIGNhc2UgJ2V4ZWN1dGVfc2NlbmVfc2NyaXB0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5leGVjdXRlU2NlbmVTY3JpcHQoYXJncy5uYW1lLCBhcmdzLm1ldGhvZCwgYXJncy5hcmdzKTtcbiAgICAgICAgICAgIGNhc2UgJ3NjZW5lX3NuYXBzaG90JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zY2VuZVNuYXBzaG90KCk7XG4gICAgICAgICAgICBjYXNlICdzY2VuZV9zbmFwc2hvdF9hYm9ydCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc2NlbmVTbmFwc2hvdEFib3J0KCk7XG4gICAgICAgICAgICBjYXNlICdiZWdpbl91bmRvX3JlY29yZGluZyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYmVnaW5VbmRvUmVjb3JkaW5nKGFyZ3Mubm9kZVV1aWQpO1xuICAgICAgICAgICAgY2FzZSAnZW5kX3VuZG9fcmVjb3JkaW5nJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5lbmRVbmRvUmVjb3JkaW5nKGFyZ3MudW5kb0lkKTtcbiAgICAgICAgICAgIGNhc2UgJ2NhbmNlbF91bmRvX3JlY29yZGluZyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY2FuY2VsVW5kb1JlY29yZGluZyhhcmdzLnVuZG9JZCk7XG4gICAgICAgICAgICBjYXNlICdzb2Z0X3JlbG9hZF9zY2VuZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc29mdFJlbG9hZFNjZW5lKCk7XG4gICAgICAgICAgICBjYXNlICdxdWVyeV9zY2VuZV9yZWFkeSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlTY2VuZVJlYWR5KCk7XG4gICAgICAgICAgICBjYXNlICdxdWVyeV9zY2VuZV9kaXJ0eSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlTY2VuZURpcnR5KCk7XG4gICAgICAgICAgICBjYXNlICdxdWVyeV9zY2VuZV9jbGFzc2VzJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeVNjZW5lQ2xhc3NlcyhhcmdzLmV4dGVuZHMpO1xuICAgICAgICAgICAgY2FzZSAncXVlcnlfc2NlbmVfY29tcG9uZW50cyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlTY2VuZUNvbXBvbmVudHMoKTtcbiAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X2NvbXBvbmVudF9oYXNfc2NyaXB0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeUNvbXBvbmVudEhhc1NjcmlwdChhcmdzLmNsYXNzTmFtZSk7XG4gICAgICAgICAgICBjYXNlICdxdWVyeV9ub2Rlc19ieV9hc3NldF91dWlkJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeU5vZGVzQnlBc3NldFV1aWQoYXJncy5hc3NldFV1aWQpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmVzZXROb2RlUHJvcGVydHkodXVpZDogc3RyaW5nLCBwYXRoOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICAvLyBQMi0xIGZpeCAodjEuNi4xKTogQ29jb3MncyByZXNldC1wcm9wZXJ0eSBjYW4gdGhyb3cgcmF3IEpTIGVycm9yc1xuICAgICAgICAvLyAoZS5nLiBcIkNhbm5vdCByZWFkIHByb3BlcnRpZXMgb2YgdW5kZWZpbmVkIChyZWFkaW5nICdpbmRleE9mJylcIikgd2hlblxuICAgICAgICAvLyBwYXRoIGlzIHVua25vd24gb3IgbWFsZm9ybWVkLiBQcmUtdmFsaWRhdGUgKyB3cmFwIHRoZSAuY2F0Y2ggaW5cbiAgICAgICAgLy8gY3JlYXRlRXJyb3JSZXNwb25zZSBzbyBjYWxsZXJzIHNlZSBhIHN0cnVjdHVyZWQgZXJyb3JDb2RlICsgc3VnZ2VzdGlvblxuICAgICAgICAvLyBpbnN0ZWFkIG9mIGFuIHVudGFnZ2VkIHN0cmluZy5cbiAgICAgICAgaWYgKCF1dWlkIHx8IHR5cGVvZiB1dWlkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoXG4gICAgICAgICAgICAgICAgRVJST1JfQ09ERVMuSU5WQUxJRF9QQVJBTVMsXG4gICAgICAgICAgICAgICAgJ3V1aWQgbXVzdCBiZSBhIG5vbi1lbXB0eSBzdHJpbmcnLFxuICAgICAgICAgICAgICAgIHsgc3VnZ2VzdGlvbjogJ1VzZSBnZXRfYWxsX25vZGVzIG9yIGZpbmRfbm9kZV9ieV9uYW1lIHRvIG9idGFpbiBhIHZhbGlkIG5vZGUgVVVJRCcgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXBhdGggfHwgdHlwZW9mIHBhdGggIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZShcbiAgICAgICAgICAgICAgICBFUlJPUl9DT0RFUy5JTlZBTElEX1BBUkFNUyxcbiAgICAgICAgICAgICAgICAncGF0aCBtdXN0IGJlIGEgbm9uLWVtcHR5IHByb3BlcnR5IHBhdGgnLFxuICAgICAgICAgICAgICAgIHsgc3VnZ2VzdGlvbjogJ1ZhbGlkIHBhdGhzIGxvb2sgbGlrZSBcInBvc2l0aW9uXCIgLyBcInJvdGF0aW9uXCIgLyBcInNjYWxlXCIgLyBhIGNvbXBvbmVudCBwcm9wZXJ0eSBuYW1lJyB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncmVzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgdXVpZCxcbiAgICAgICAgICAgICAgICBwYXRoLFxuICAgICAgICAgICAgICAgIGR1bXA6IHsgdmFsdWU6IG51bGwgfVxuICAgICAgICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBQcm9wZXJ0eSAnJHtwYXRofScgcmVzZXQgdG8gZGVmYXVsdCB2YWx1ZWBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoY3JlYXRlRXJyb3JSZXNwb25zZShcbiAgICAgICAgICAgICAgICAgICAgRVJST1JfQ09ERVMuRURJVE9SX0FQSV9FUlJPUixcbiAgICAgICAgICAgICAgICAgICAgZXJyPy5tZXNzYWdlID8/IFN0cmluZyhlcnIpLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWxhdGVkQXNzZXRzOiBbdXVpZF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWdnZXN0aW9uOiBgQ29jb3Mgc2NlbmUucmVzZXQtcHJvcGVydHkgcmVqZWN0ZWQgcGF0aCBcIiR7cGF0aH1cIi4gVmVyaWZ5IHRoZSBwYXRoIGV4aXN0cyBvbiB0aGUgbm9kZSAodHJ5IGdldF9ub2RlX2luZm8gZmlyc3QpIGFuZCB1c2VzIHRoZSBleGFjdCBjYXNlIENvY29zIGV4cGVjdHMuYFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBtb3ZlQXJyYXlFbGVtZW50KHV1aWQ6IHN0cmluZywgcGF0aDogc3RyaW5nLCB0YXJnZXQ6IG51bWJlciwgb2Zmc2V0OiBudW1iZXIpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ21vdmUtYXJyYXktZWxlbWVudCcsIHtcbiAgICAgICAgICAgICAgICB1dWlkLFxuICAgICAgICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgICAgICAgdGFyZ2V0LFxuICAgICAgICAgICAgICAgIG9mZnNldFxuICAgICAgICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBBcnJheSBlbGVtZW50IGF0IGluZGV4ICR7dGFyZ2V0fSBtb3ZlZCBieSAke29mZnNldH1gXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmVtb3ZlQXJyYXlFbGVtZW50KHV1aWQ6IHN0cmluZywgcGF0aDogc3RyaW5nLCBpbmRleDogbnVtYmVyKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdyZW1vdmUtYXJyYXktZWxlbWVudCcsIHtcbiAgICAgICAgICAgICAgICB1dWlkLFxuICAgICAgICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgICAgICAgaW5kZXhcbiAgICAgICAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQXJyYXkgZWxlbWVudCBhdCBpbmRleCAke2luZGV4fSByZW1vdmVkYFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNvcHlOb2RlKHV1aWRzOiBzdHJpbmcgfCBzdHJpbmdbXSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnY29weS1ub2RlJywgdXVpZHMpLnRoZW4oKHJlc3VsdDogc3RyaW5nIHwgc3RyaW5nW10pID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29waWVkVXVpZHM6IHJlc3VsdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdOb2RlKHMpIGNvcGllZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBwYXN0ZU5vZGUodGFyZ2V0OiBzdHJpbmcsIHV1aWRzOiBzdHJpbmcgfCBzdHJpbmdbXSwga2VlcFdvcmxkVHJhbnNmb3JtOiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3Bhc3RlLW5vZGUnLCB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0LFxuICAgICAgICAgICAgICAgIHV1aWRzLFxuICAgICAgICAgICAgICAgIGtlZXBXb3JsZFRyYW5zZm9ybVxuICAgICAgICAgICAgfSkudGhlbigocmVzdWx0OiBzdHJpbmcgfCBzdHJpbmdbXSkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdVdWlkczogcmVzdWx0LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ05vZGUocykgcGFzdGVkIHN1Y2Nlc3NmdWxseSdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGN1dE5vZGUodXVpZHM6IHN0cmluZyB8IHN0cmluZ1tdKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdjdXQtbm9kZScsIHV1aWRzKS50aGVuKChyZXN1bHQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXRVdWlkczogcmVzdWx0LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ05vZGUocykgY3V0IHN1Y2Nlc3NmdWxseSdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlc2V0Tm9kZVRyYW5zZm9ybSh1dWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3Jlc2V0LW5vZGUnLCB7IHV1aWQgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdOb2RlIHRyYW5zZm9ybSByZXNldCB0byBkZWZhdWx0J1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlc2V0Q29tcG9uZW50KHV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncmVzZXQtY29tcG9uZW50JywgeyB1dWlkIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnQ29tcG9uZW50IHJlc2V0IHRvIGRlZmF1bHQgdmFsdWVzJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlc3RvcmVQcmVmYWIobm9kZVV1aWQ6IHN0cmluZywgYXNzZXRVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ3NjZW5lJywgJ3Jlc3RvcmUtcHJlZmFiJywgbm9kZVV1aWQsIGFzc2V0VXVpZCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdQcmVmYWIgcmVzdG9yZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVDb21wb25lbnRNZXRob2QodXVpZDogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIGFyZ3M6IGFueVtdID0gW10pOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtY29tcG9uZW50LW1ldGhvZCcsIHtcbiAgICAgICAgICAgICAgICB1dWlkLFxuICAgICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgICAgYXJnc1xuICAgICAgICAgICAgfSkudGhlbigocmVzdWx0OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiByZXN1bHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgTWV0aG9kICcke25hbWV9JyBleGVjdXRlZCBzdWNjZXNzZnVsbHlgXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBleGVjdXRlU2NlbmVTY3JpcHQobmFtZTogc3RyaW5nLCBtZXRob2Q6IHN0cmluZywgYXJnczogYW55W10gPSBbXSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XG4gICAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgICBtZXRob2QsXG4gICAgICAgICAgICAgICAgYXJnc1xuICAgICAgICAgICAgfSkudGhlbigocmVzdWx0OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogcmVzdWx0XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2NlbmVTbmFwc2hvdCgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NuYXBzaG90JykudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdTY2VuZSBzbmFwc2hvdCBjcmVhdGVkJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHNjZW5lU25hcHNob3RBYm9ydCgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NuYXBzaG90LWFib3J0JykudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdTY2VuZSBzbmFwc2hvdCBhYm9ydGVkJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGJlZ2luVW5kb1JlY29yZGluZyhub2RlVXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdiZWdpbi1yZWNvcmRpbmcnLCBub2RlVXVpZCkudGhlbigodW5kb0lkOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgdW5kb0lkOiB1bmRvSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnVW5kbyByZWNvcmRpbmcgc3RhcnRlZCdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGVuZFVuZG9SZWNvcmRpbmcodW5kb0lkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2VuZC1yZWNvcmRpbmcnLCB1bmRvSWQpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnVW5kbyByZWNvcmRpbmcgZW5kZWQnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgY2FuY2VsVW5kb1JlY29yZGluZyh1bmRvSWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnY2FuY2VsLXJlY29yZGluZycsIHVuZG9JZCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdVbmRvIHJlY29yZGluZyBjYW5jZWxsZWQnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc29mdFJlbG9hZFNjZW5lKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc29mdC1yZWxvYWQnKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1NjZW5lIHNvZnQgcmVsb2FkZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5U2NlbmVSZWFkeSgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWlzLXJlYWR5JykudGhlbigocmVhZHk6IGJvb2xlYW4pID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZHk6IHJlYWR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogcmVhZHkgPyAnU2NlbmUgaXMgcmVhZHknIDogJ1NjZW5lIGlzIG5vdCByZWFkeSdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5U2NlbmVEaXJ0eSgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWRpcnR5JykudGhlbigoZGlydHk6IGJvb2xlYW4pID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlydHk6IGRpcnR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZGlydHkgPyAnU2NlbmUgaGFzIHVuc2F2ZWQgY2hhbmdlcycgOiAnU2NlbmUgaXMgY2xlYW4nXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeVNjZW5lQ2xhc3NlcyhleHRlbmRzQ2xhc3M/OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG9wdGlvbnM6IGFueSA9IHt9O1xuICAgICAgICAgICAgaWYgKGV4dGVuZHNDbGFzcykge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuZXh0ZW5kcyA9IGV4dGVuZHNDbGFzcztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktY2xhc3NlcycsIG9wdGlvbnMpLnRoZW4oKGNsYXNzZXM6IGFueVtdKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzZXM6IGNsYXNzZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogY2xhc3Nlcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBleHRlbmRzRmlsdGVyOiBleHRlbmRzQ2xhc3NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5U2NlbmVDb21wb25lbnRzKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktY29tcG9uZW50cycpLnRoZW4oKGNvbXBvbmVudHM6IGFueVtdKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudHM6IGNvbXBvbmVudHMsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogY29tcG9uZW50cy5sZW5ndGhcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5Q29tcG9uZW50SGFzU2NyaXB0KGNsYXNzTmFtZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1jb21wb25lbnQtaGFzLXNjcmlwdCcsIGNsYXNzTmFtZSkudGhlbigoaGFzU2NyaXB0OiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogY2xhc3NOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGFzU2NyaXB0OiBoYXNTY3JpcHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBoYXNTY3JpcHQgPyBgQ29tcG9uZW50ICcke2NsYXNzTmFtZX0nIGhhcyBzY3JpcHRgIDogYENvbXBvbmVudCAnJHtjbGFzc05hbWV9JyBkb2VzIG5vdCBoYXZlIHNjcmlwdGBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5Tm9kZXNCeUFzc2V0VXVpZChhc3NldFV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZXMtYnktYXNzZXQtdXVpZCcsIGFzc2V0VXVpZCkudGhlbigobm9kZVV1aWRzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFV1aWQ6IGFzc2V0VXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkczogbm9kZVV1aWRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IG5vZGVVdWlkcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgRm91bmQgJHtub2RlVXVpZHMubGVuZ3RofSBub2RlcyB1c2luZyBhc3NldGBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG59Il19