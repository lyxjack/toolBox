"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneTools = void 0;
const error_response_1 = require("../utils/error-response");
class SceneTools {
    getTools() {
        return [
            {
                name: 'get_current_scene',
                description: 'Get current scene information',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'get_scene_list',
                description: 'Get all scenes in the project',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'management',
                description: 'Unified scene CRUD (v1.6.0). action=open/save/close/create/save_as. Each has distinct side-effects — open/close switch current state; create/save_as write new file; save writes current. ⚠ Do not invoke in parallel with other mutating tools — Cocos IPC serializes and concurrent calls time out.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['open', 'save', 'close', 'create', 'save_as'],
                            description: 'Which scene operation to perform'
                        },
                        scenePath: { type: 'string', description: 'For open: the scene db:// path' },
                        sceneName: { type: 'string', description: 'For create: name of the new scene' },
                        savePath: { type: 'string', description: 'For create: path to save (db://assets/scenes/X.scene)' },
                        path: { type: 'string', description: 'For save_as: destination path' }
                    },
                    required: ['action']
                }
            },
            {
                name: 'get_scene_hierarchy',
                description: 'Get the complete hierarchy of current scene',
                inputSchema: {
                    type: 'object',
                    properties: {
                        includeComponents: {
                            type: 'boolean',
                            description: 'Include component information',
                            default: false
                        }
                    }
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'get_current_scene':
                return await this.getCurrentScene();
            case 'get_scene_list':
                return await this.getSceneList();
            case 'open_scene':
                return await this.openScene(args.scenePath);
            case 'save_scene':
                return await this.saveScene();
            case 'create_scene':
                return await this.createScene(args.sceneName, args.savePath);
            case 'save_scene_as':
                return await this.saveSceneAs(args.path);
            case 'close_scene':
                return await this.closeScene();
            case 'get_scene_hierarchy':
                return await this.getSceneHierarchy(args.includeComponents);
            case 'management':
                // v1.6.0 unified action-code dispatcher
                switch (args.action) {
                    case 'open':
                        return await this.openScene(args.scenePath);
                    case 'save':
                        return await this.saveScene();
                    case 'close':
                        return await this.closeScene();
                    case 'create':
                        return await this.createScene(args.sceneName, args.savePath);
                    case 'save_as':
                        return await this.saveSceneAs(args.path);
                    default:
                        return (0, error_response_1.createErrorResponse)(error_response_1.ERROR_CODES.INVALID_PARAMS, `Unknown scene.management action: ${args.action}`, { suggestion: 'Use action: "open" | "save" | "close" | "create" | "save_as"' });
                }
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    async getCurrentScene() {
        return new Promise((resolve) => {
            // 直接使用 query-node-tree 来获取场景信息（这个方法已经验证可用）
            Editor.Message.request('scene', 'query-node-tree').then((tree) => {
                if (tree && tree.uuid) {
                    resolve({
                        success: true,
                        data: {
                            name: tree.name || 'Current Scene',
                            uuid: tree.uuid,
                            type: tree.type || 'cc.Scene',
                            active: tree.active !== undefined ? tree.active : true,
                            nodeCount: tree.children ? tree.children.length : 0
                        }
                    });
                }
                else {
                    resolve({ success: false, error: 'No scene data available' });
                }
            }).catch((err) => {
                // 备用方案：使用场景脚本
                const options = {
                    name: 'cocos-mcp-server',
                    method: 'getCurrentSceneInfo',
                    args: []
                };
                Editor.Message.request('scene', 'execute-scene-script', options).then((result) => {
                    resolve(result);
                }).catch((err2) => {
                    resolve({ success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` });
                });
            });
        });
    }
    async getSceneList() {
        return new Promise((resolve) => {
            // Note: query-assets API corrected with proper parameters
            Editor.Message.request('asset-db', 'query-assets', {
                pattern: 'db://assets/**/*.scene'
            }).then((results) => {
                const scenes = results.map(asset => ({
                    name: asset.name,
                    path: asset.url,
                    uuid: asset.uuid
                }));
                resolve({ success: true, data: scenes });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async openScene(scenePath) {
        return new Promise((resolve) => {
            // 首先获取场景的UUID
            Editor.Message.request('asset-db', 'query-uuid', scenePath).then((uuid) => {
                if (!uuid) {
                    throw new Error('Scene not found');
                }
                // 使用正确的 scene API 打开场景 (需要UUID)
                return Editor.Message.request('scene', 'open-scene', uuid);
            }).then(() => {
                resolve({ success: true, message: `Scene opened: ${scenePath}` });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async saveScene() {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'save-scene').then(() => {
                resolve({ success: true, message: 'Scene saved successfully' });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async createScene(sceneName, savePath) {
        return new Promise((resolve) => {
            // 确保路径以.scene结尾
            const fullPath = savePath.endsWith('.scene') ? savePath : `${savePath}/${sceneName}.scene`;
            // 使用正确的Cocos Creator 3.8场景格式
            const sceneContent = JSON.stringify([
                {
                    "__type__": "cc.SceneAsset",
                    "_name": sceneName,
                    "_objFlags": 0,
                    "__editorExtras__": {},
                    "_native": "",
                    "scene": {
                        "__id__": 1
                    }
                },
                {
                    "__type__": "cc.Scene",
                    "_name": sceneName,
                    "_objFlags": 0,
                    "__editorExtras__": {},
                    "_parent": null,
                    "_children": [],
                    "_active": true,
                    "_components": [],
                    "_prefab": null,
                    "_lpos": {
                        "__type__": "cc.Vec3",
                        "x": 0,
                        "y": 0,
                        "z": 0
                    },
                    "_lrot": {
                        "__type__": "cc.Quat",
                        "x": 0,
                        "y": 0,
                        "z": 0,
                        "w": 1
                    },
                    "_lscale": {
                        "__type__": "cc.Vec3",
                        "x": 1,
                        "y": 1,
                        "z": 1
                    },
                    "_mobility": 0,
                    "_layer": 1073741824,
                    "_euler": {
                        "__type__": "cc.Vec3",
                        "x": 0,
                        "y": 0,
                        "z": 0
                    },
                    "autoReleaseAssets": false,
                    "_globals": {
                        "__id__": 2
                    },
                    "_id": "scene"
                },
                {
                    "__type__": "cc.SceneGlobals",
                    "ambient": {
                        "__id__": 3
                    },
                    "skybox": {
                        "__id__": 4
                    },
                    "fog": {
                        "__id__": 5
                    },
                    "octree": {
                        "__id__": 6
                    }
                },
                {
                    "__type__": "cc.AmbientInfo",
                    "_skyColorHDR": {
                        "__type__": "cc.Vec4",
                        "x": 0.2,
                        "y": 0.5,
                        "z": 0.8,
                        "w": 0.520833
                    },
                    "_skyColor": {
                        "__type__": "cc.Vec4",
                        "x": 0.2,
                        "y": 0.5,
                        "z": 0.8,
                        "w": 0.520833
                    },
                    "_skyIllumHDR": 20000,
                    "_skyIllum": 20000,
                    "_groundAlbedoHDR": {
                        "__type__": "cc.Vec4",
                        "x": 0.2,
                        "y": 0.2,
                        "z": 0.2,
                        "w": 1
                    },
                    "_groundAlbedo": {
                        "__type__": "cc.Vec4",
                        "x": 0.2,
                        "y": 0.2,
                        "z": 0.2,
                        "w": 1
                    }
                },
                {
                    "__type__": "cc.SkyboxInfo",
                    "_envLightingType": 0,
                    "_envmapHDR": null,
                    "_envmap": null,
                    "_envmapLodCount": 0,
                    "_diffuseMapHDR": null,
                    "_diffuseMap": null,
                    "_enabled": false,
                    "_useHDR": true,
                    "_editableMaterial": null,
                    "_reflectionHDR": null,
                    "_reflectionMap": null,
                    "_rotationAngle": 0
                },
                {
                    "__type__": "cc.FogInfo",
                    "_type": 0,
                    "_fogColor": {
                        "__type__": "cc.Color",
                        "r": 200,
                        "g": 200,
                        "b": 200,
                        "a": 255
                    },
                    "_enabled": false,
                    "_fogDensity": 0.3,
                    "_fogStart": 0.5,
                    "_fogEnd": 300,
                    "_fogAtten": 5,
                    "_fogTop": 1.5,
                    "_fogRange": 1.2,
                    "_accurate": false
                },
                {
                    "__type__": "cc.OctreeInfo",
                    "_enabled": false,
                    "_minPos": {
                        "__type__": "cc.Vec3",
                        "x": -1024,
                        "y": -1024,
                        "z": -1024
                    },
                    "_maxPos": {
                        "__type__": "cc.Vec3",
                        "x": 1024,
                        "y": 1024,
                        "z": 1024
                    },
                    "_depth": 8
                }
            ], null, 2);
            Editor.Message.request('asset-db', 'create-asset', fullPath, sceneContent).then((result) => {
                // Verify scene creation by checking if it exists
                this.getSceneList().then((sceneList) => {
                    var _a;
                    const createdScene = (_a = sceneList.data) === null || _a === void 0 ? void 0 : _a.find((scene) => scene.uuid === result.uuid);
                    resolve({
                        success: true,
                        data: {
                            uuid: result.uuid,
                            url: result.url,
                            name: sceneName,
                            message: `Scene '${sceneName}' created successfully`,
                            sceneVerified: !!createdScene
                        },
                        verificationData: createdScene
                    });
                }).catch(() => {
                    resolve({
                        success: true,
                        data: {
                            uuid: result.uuid,
                            url: result.url,
                            name: sceneName,
                            message: `Scene '${sceneName}' created successfully (verification failed)`
                        }
                    });
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async getSceneHierarchy(includeComponents = false) {
        return new Promise((resolve) => {
            // 优先尝试使用 Editor API 查询场景节点树
            Editor.Message.request('scene', 'query-node-tree').then((tree) => {
                if (tree) {
                    const hierarchy = this.buildHierarchy(tree, includeComponents);
                    resolve({
                        success: true,
                        data: hierarchy
                    });
                }
                else {
                    resolve({ success: false, error: 'No scene hierarchy available' });
                }
            }).catch((err) => {
                // 备用方案：使用场景脚本
                const options = {
                    name: 'cocos-mcp-server',
                    method: 'getSceneHierarchy',
                    args: [includeComponents]
                };
                Editor.Message.request('scene', 'execute-scene-script', options).then((result) => {
                    resolve(result);
                }).catch((err2) => {
                    resolve({ success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` });
                });
            });
        });
    }
    buildHierarchy(node, includeComponents) {
        const nodeInfo = {
            uuid: node.uuid,
            name: node.name,
            type: node.type,
            active: node.active,
            children: []
        };
        if (includeComponents && node.__comps__) {
            nodeInfo.components = node.__comps__.map((comp) => ({
                type: comp.__type__ || 'Unknown',
                enabled: comp.enabled !== undefined ? comp.enabled : true
            }));
        }
        if (node.children) {
            nodeInfo.children = node.children.map((child) => this.buildHierarchy(child, includeComponents));
        }
        return nodeInfo;
    }
    async saveSceneAs(path) {
        return new Promise((resolve) => {
            // save-as-scene API 不接受路径参数，会弹出对话框让用户选择
            Editor.Message.request('scene', 'save-as-scene').then(() => {
                resolve({
                    success: true,
                    data: {
                        path: path,
                        message: `Scene save-as dialog opened`
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async closeScene() {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'close-scene').then(() => {
                resolve({
                    success: true,
                    message: 'Scene closed successfully'
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
}
exports.SceneTools = SceneTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvc2NlbmUtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsNERBQTJFO0FBRTNFLE1BQWEsVUFBVTtJQUNuQixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxtQkFBbUI7Z0JBQ3pCLFdBQVcsRUFBRSwrQkFBK0I7Z0JBQzVDLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUUsRUFBRTtpQkFDakI7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxnQkFBZ0I7Z0JBQ3RCLFdBQVcsRUFBRSwrQkFBK0I7Z0JBQzVDLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUUsRUFBRTtpQkFDakI7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxZQUFZO2dCQUNsQixXQUFXLEVBQUUsdVNBQXVTO2dCQUNwVCxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDOzRCQUNwRCxXQUFXLEVBQUUsa0NBQWtDO3lCQUNsRDt3QkFDRCxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxnQ0FBZ0MsRUFBRTt3QkFDNUUsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsbUNBQW1DLEVBQUU7d0JBQy9FLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHVEQUF1RCxFQUFFO3dCQUNsRyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSwrQkFBK0IsRUFBRTtxQkFDekU7b0JBQ0QsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDO2lCQUN2QjthQUNKO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLHFCQUFxQjtnQkFDM0IsV0FBVyxFQUFFLDZDQUE2QztnQkFDMUQsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixpQkFBaUIsRUFBRTs0QkFDZixJQUFJLEVBQUUsU0FBUzs0QkFDZixXQUFXLEVBQUUsK0JBQStCOzRCQUM1QyxPQUFPLEVBQUUsS0FBSzt5QkFDakI7cUJBQ0o7aUJBQ0o7YUFDSjtTQUNKLENBQUM7SUFDTixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFnQixFQUFFLElBQVM7UUFDckMsUUFBUSxRQUFRLEVBQUUsQ0FBQztZQUNmLEtBQUssbUJBQW1CO2dCQUNwQixPQUFPLE1BQU0sSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3hDLEtBQUssZ0JBQWdCO2dCQUNqQixPQUFPLE1BQU0sSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3JDLEtBQUssWUFBWTtnQkFDYixPQUFPLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDaEQsS0FBSyxZQUFZO2dCQUNiLE9BQU8sTUFBTSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDbEMsS0FBSyxjQUFjO2dCQUNmLE9BQU8sTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2pFLEtBQUssZUFBZTtnQkFDaEIsT0FBTyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdDLEtBQUssYUFBYTtnQkFDZCxPQUFPLE1BQU0sSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ25DLEtBQUsscUJBQXFCO2dCQUN0QixPQUFPLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ2hFLEtBQUssWUFBWTtnQkFDYix3Q0FBd0M7Z0JBQ3hDLFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNsQixLQUFLLE1BQU07d0JBQ1AsT0FBTyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO29CQUNoRCxLQUFLLE1BQU07d0JBQ1AsT0FBTyxNQUFNLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDbEMsS0FBSyxPQUFPO3dCQUNSLE9BQU8sTUFBTSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQ25DLEtBQUssUUFBUTt3QkFDVCxPQUFPLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDakUsS0FBSyxTQUFTO3dCQUNWLE9BQU8sTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDN0M7d0JBQ0ksT0FBTyxJQUFBLG9DQUFtQixFQUN0Qiw0QkFBVyxDQUFDLGNBQWMsRUFDMUIsb0NBQW9DLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFDakQsRUFBRSxVQUFVLEVBQUUsOERBQThELEVBQUUsQ0FDakYsQ0FBQztnQkFDVixDQUFDO1lBQ0w7Z0JBQ0ksTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNyRCxDQUFDO0lBQ0wsQ0FBQztJQUVPLEtBQUssQ0FBQyxlQUFlO1FBQ3pCLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUMzQiwyQ0FBMkM7WUFDM0MsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBUyxFQUFFLEVBQUU7Z0JBQ2xFLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDcEIsT0FBTyxDQUFDO3dCQUNKLE9BQU8sRUFBRSxJQUFJO3dCQUNiLElBQUksRUFBRTs0QkFDRixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxlQUFlOzRCQUNsQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7NEJBQ2YsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLElBQUksVUFBVTs0QkFDN0IsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJOzRCQUN0RCxTQUFTLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7eUJBQ3REO3FCQUNKLENBQUMsQ0FBQztnQkFDUCxDQUFDO3FCQUFNLENBQUM7b0JBQ0osT0FBTyxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUseUJBQXlCLEVBQUUsQ0FBQyxDQUFDO2dCQUNsRSxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBVSxFQUFFLEVBQUU7Z0JBQ3BCLGNBQWM7Z0JBQ2QsTUFBTSxPQUFPLEdBQUc7b0JBQ1osSUFBSSxFQUFFLGtCQUFrQjtvQkFDeEIsTUFBTSxFQUFFLHFCQUFxQjtvQkFDN0IsSUFBSSxFQUFFLEVBQUU7aUJBQ1gsQ0FBQztnQkFFRixNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBVyxFQUFFLEVBQUU7b0JBQ2xGLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDcEIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBVyxFQUFFLEVBQUU7b0JBQ3JCLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLHNCQUFzQixHQUFHLENBQUMsT0FBTywwQkFBMEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDbEgsQ0FBQyxDQUFDLENBQUM7WUFDUCxDQUFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVPLEtBQUssQ0FBQyxZQUFZO1FBQ3RCLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUMzQiwwREFBMEQ7WUFDMUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLGNBQWMsRUFBRTtnQkFDL0MsT0FBTyxFQUFFLHdCQUF3QjthQUNwQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBYyxFQUFFLEVBQUU7Z0JBQ3ZCLE1BQU0sTUFBTSxHQUFnQixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDOUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO29CQUNoQixJQUFJLEVBQUUsS0FBSyxDQUFDLEdBQUc7b0JBQ2YsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO2lCQUNuQixDQUFDLENBQUMsQ0FBQztnQkFDSixPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQzdDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQVUsRUFBRSxFQUFFO2dCQUNwQixPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUNwRCxDQUFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVPLEtBQUssQ0FBQyxTQUFTLENBQUMsU0FBaUI7UUFDckMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQzNCLGNBQWM7WUFDZCxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQW1CLEVBQUUsRUFBRTtnQkFDckYsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNSLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQkFDdkMsQ0FBQztnQkFFRCxnQ0FBZ0M7Z0JBQ2hDLE9BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMvRCxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUNULE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDdEUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBVSxFQUFFLEVBQUU7Z0JBQ3BCLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ3BELENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRU8sS0FBSyxDQUFDLFNBQVM7UUFDbkIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQzNCLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUNwRCxPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxDQUFDLENBQUM7WUFDcEUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBVSxFQUFFLEVBQUU7Z0JBQ3BCLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ3BELENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRU8sS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFpQixFQUFFLFFBQWdCO1FBQ3pELE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUMzQixnQkFBZ0I7WUFDaEIsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsSUFBSSxTQUFTLFFBQVEsQ0FBQztZQUUzRiw2QkFBNkI7WUFDN0IsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDaEM7b0JBQ0ksVUFBVSxFQUFFLGVBQWU7b0JBQzNCLE9BQU8sRUFBRSxTQUFTO29CQUNsQixXQUFXLEVBQUUsQ0FBQztvQkFDZCxrQkFBa0IsRUFBRSxFQUFFO29CQUN0QixTQUFTLEVBQUUsRUFBRTtvQkFDYixPQUFPLEVBQUU7d0JBQ0wsUUFBUSxFQUFFLENBQUM7cUJBQ2Q7aUJBQ0o7Z0JBQ0Q7b0JBQ0ksVUFBVSxFQUFFLFVBQVU7b0JBQ3RCLE9BQU8sRUFBRSxTQUFTO29CQUNsQixXQUFXLEVBQUUsQ0FBQztvQkFDZCxrQkFBa0IsRUFBRSxFQUFFO29CQUN0QixTQUFTLEVBQUUsSUFBSTtvQkFDZixXQUFXLEVBQUUsRUFBRTtvQkFDZixTQUFTLEVBQUUsSUFBSTtvQkFDZixhQUFhLEVBQUUsRUFBRTtvQkFDakIsU0FBUyxFQUFFLElBQUk7b0JBQ2YsT0FBTyxFQUFFO3dCQUNMLFVBQVUsRUFBRSxTQUFTO3dCQUNyQixHQUFHLEVBQUUsQ0FBQzt3QkFDTixHQUFHLEVBQUUsQ0FBQzt3QkFDTixHQUFHLEVBQUUsQ0FBQztxQkFDVDtvQkFDRCxPQUFPLEVBQUU7d0JBQ0wsVUFBVSxFQUFFLFNBQVM7d0JBQ3JCLEdBQUcsRUFBRSxDQUFDO3dCQUNOLEdBQUcsRUFBRSxDQUFDO3dCQUNOLEdBQUcsRUFBRSxDQUFDO3dCQUNOLEdBQUcsRUFBRSxDQUFDO3FCQUNUO29CQUNELFNBQVMsRUFBRTt3QkFDUCxVQUFVLEVBQUUsU0FBUzt3QkFDckIsR0FBRyxFQUFFLENBQUM7d0JBQ04sR0FBRyxFQUFFLENBQUM7d0JBQ04sR0FBRyxFQUFFLENBQUM7cUJBQ1Q7b0JBQ0QsV0FBVyxFQUFFLENBQUM7b0JBQ2QsUUFBUSxFQUFFLFVBQVU7b0JBQ3BCLFFBQVEsRUFBRTt3QkFDTixVQUFVLEVBQUUsU0FBUzt3QkFDckIsR0FBRyxFQUFFLENBQUM7d0JBQ04sR0FBRyxFQUFFLENBQUM7d0JBQ04sR0FBRyxFQUFFLENBQUM7cUJBQ1Q7b0JBQ0QsbUJBQW1CLEVBQUUsS0FBSztvQkFDMUIsVUFBVSxFQUFFO3dCQUNSLFFBQVEsRUFBRSxDQUFDO3FCQUNkO29CQUNELEtBQUssRUFBRSxPQUFPO2lCQUNqQjtnQkFDRDtvQkFDSSxVQUFVLEVBQUUsaUJBQWlCO29CQUM3QixTQUFTLEVBQUU7d0JBQ1AsUUFBUSxFQUFFLENBQUM7cUJBQ2Q7b0JBQ0QsUUFBUSxFQUFFO3dCQUNOLFFBQVEsRUFBRSxDQUFDO3FCQUNkO29CQUNELEtBQUssRUFBRTt3QkFDSCxRQUFRLEVBQUUsQ0FBQztxQkFDZDtvQkFDRCxRQUFRLEVBQUU7d0JBQ04sUUFBUSxFQUFFLENBQUM7cUJBQ2Q7aUJBQ0o7Z0JBQ0Q7b0JBQ0ksVUFBVSxFQUFFLGdCQUFnQjtvQkFDNUIsY0FBYyxFQUFFO3dCQUNaLFVBQVUsRUFBRSxTQUFTO3dCQUNyQixHQUFHLEVBQUUsR0FBRzt3QkFDUixHQUFHLEVBQUUsR0FBRzt3QkFDUixHQUFHLEVBQUUsR0FBRzt3QkFDUixHQUFHLEVBQUUsUUFBUTtxQkFDaEI7b0JBQ0QsV0FBVyxFQUFFO3dCQUNULFVBQVUsRUFBRSxTQUFTO3dCQUNyQixHQUFHLEVBQUUsR0FBRzt3QkFDUixHQUFHLEVBQUUsR0FBRzt3QkFDUixHQUFHLEVBQUUsR0FBRzt3QkFDUixHQUFHLEVBQUUsUUFBUTtxQkFDaEI7b0JBQ0QsY0FBYyxFQUFFLEtBQUs7b0JBQ3JCLFdBQVcsRUFBRSxLQUFLO29CQUNsQixrQkFBa0IsRUFBRTt3QkFDaEIsVUFBVSxFQUFFLFNBQVM7d0JBQ3JCLEdBQUcsRUFBRSxHQUFHO3dCQUNSLEdBQUcsRUFBRSxHQUFHO3dCQUNSLEdBQUcsRUFBRSxHQUFHO3dCQUNSLEdBQUcsRUFBRSxDQUFDO3FCQUNUO29CQUNELGVBQWUsRUFBRTt3QkFDYixVQUFVLEVBQUUsU0FBUzt3QkFDckIsR0FBRyxFQUFFLEdBQUc7d0JBQ1IsR0FBRyxFQUFFLEdBQUc7d0JBQ1IsR0FBRyxFQUFFLEdBQUc7d0JBQ1IsR0FBRyxFQUFFLENBQUM7cUJBQ1Q7aUJBQ0o7Z0JBQ0Q7b0JBQ0ksVUFBVSxFQUFFLGVBQWU7b0JBQzNCLGtCQUFrQixFQUFFLENBQUM7b0JBQ3JCLFlBQVksRUFBRSxJQUFJO29CQUNsQixTQUFTLEVBQUUsSUFBSTtvQkFDZixpQkFBaUIsRUFBRSxDQUFDO29CQUNwQixnQkFBZ0IsRUFBRSxJQUFJO29CQUN0QixhQUFhLEVBQUUsSUFBSTtvQkFDbkIsVUFBVSxFQUFFLEtBQUs7b0JBQ2pCLFNBQVMsRUFBRSxJQUFJO29CQUNmLG1CQUFtQixFQUFFLElBQUk7b0JBQ3pCLGdCQUFnQixFQUFFLElBQUk7b0JBQ3RCLGdCQUFnQixFQUFFLElBQUk7b0JBQ3RCLGdCQUFnQixFQUFFLENBQUM7aUJBQ3RCO2dCQUNEO29CQUNJLFVBQVUsRUFBRSxZQUFZO29CQUN4QixPQUFPLEVBQUUsQ0FBQztvQkFDVixXQUFXLEVBQUU7d0JBQ1QsVUFBVSxFQUFFLFVBQVU7d0JBQ3RCLEdBQUcsRUFBRSxHQUFHO3dCQUNSLEdBQUcsRUFBRSxHQUFHO3dCQUNSLEdBQUcsRUFBRSxHQUFHO3dCQUNSLEdBQUcsRUFBRSxHQUFHO3FCQUNYO29CQUNELFVBQVUsRUFBRSxLQUFLO29CQUNqQixhQUFhLEVBQUUsR0FBRztvQkFDbEIsV0FBVyxFQUFFLEdBQUc7b0JBQ2hCLFNBQVMsRUFBRSxHQUFHO29CQUNkLFdBQVcsRUFBRSxDQUFDO29CQUNkLFNBQVMsRUFBRSxHQUFHO29CQUNkLFdBQVcsRUFBRSxHQUFHO29CQUNoQixXQUFXLEVBQUUsS0FBSztpQkFDckI7Z0JBQ0Q7b0JBQ0ksVUFBVSxFQUFFLGVBQWU7b0JBQzNCLFVBQVUsRUFBRSxLQUFLO29CQUNqQixTQUFTLEVBQUU7d0JBQ1AsVUFBVSxFQUFFLFNBQVM7d0JBQ3JCLEdBQUcsRUFBRSxDQUFDLElBQUk7d0JBQ1YsR0FBRyxFQUFFLENBQUMsSUFBSTt3QkFDVixHQUFHLEVBQUUsQ0FBQyxJQUFJO3FCQUNiO29CQUNELFNBQVMsRUFBRTt3QkFDUCxVQUFVLEVBQUUsU0FBUzt3QkFDckIsR0FBRyxFQUFFLElBQUk7d0JBQ1QsR0FBRyxFQUFFLElBQUk7d0JBQ1QsR0FBRyxFQUFFLElBQUk7cUJBQ1o7b0JBQ0QsUUFBUSxFQUFFLENBQUM7aUJBQ2Q7YUFDSixFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUVaLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQVcsRUFBRSxFQUFFO2dCQUM1RixpREFBaUQ7Z0JBQ2pELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTs7b0JBQ25DLE1BQU0sWUFBWSxHQUFHLE1BQUEsU0FBUyxDQUFDLElBQUksMENBQUUsSUFBSSxDQUFDLENBQUMsS0FBVSxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDdEYsT0FBTyxDQUFDO3dCQUNKLE9BQU8sRUFBRSxJQUFJO3dCQUNiLElBQUksRUFBRTs0QkFDRixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUk7NEJBQ2pCLEdBQUcsRUFBRSxNQUFNLENBQUMsR0FBRzs0QkFDZixJQUFJLEVBQUUsU0FBUzs0QkFDZixPQUFPLEVBQUUsVUFBVSxTQUFTLHdCQUF3Qjs0QkFDcEQsYUFBYSxFQUFFLENBQUMsQ0FBQyxZQUFZO3lCQUNoQzt3QkFDRCxnQkFBZ0IsRUFBRSxZQUFZO3FCQUNqQyxDQUFDLENBQUM7Z0JBQ1AsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRTtvQkFDVixPQUFPLENBQUM7d0JBQ0osT0FBTyxFQUFFLElBQUk7d0JBQ2IsSUFBSSxFQUFFOzRCQUNGLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSTs0QkFDakIsR0FBRyxFQUFFLE1BQU0sQ0FBQyxHQUFHOzRCQUNmLElBQUksRUFBRSxTQUFTOzRCQUNmLE9BQU8sRUFBRSxVQUFVLFNBQVMsOENBQThDO3lCQUM3RTtxQkFDSixDQUFDLENBQUM7Z0JBQ1AsQ0FBQyxDQUFDLENBQUM7WUFDUCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFVLEVBQUUsRUFBRTtnQkFDcEIsT0FBTyxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDcEQsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFTyxLQUFLLENBQUMsaUJBQWlCLENBQUMsb0JBQTZCLEtBQUs7UUFDOUQsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQzNCLDRCQUE0QjtZQUM1QixNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFTLEVBQUUsRUFBRTtnQkFDbEUsSUFBSSxJQUFJLEVBQUUsQ0FBQztvQkFDUCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO29CQUMvRCxPQUFPLENBQUM7d0JBQ0osT0FBTyxFQUFFLElBQUk7d0JBQ2IsSUFBSSxFQUFFLFNBQVM7cUJBQ2xCLENBQUMsQ0FBQztnQkFDUCxDQUFDO3FCQUFNLENBQUM7b0JBQ0osT0FBTyxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsOEJBQThCLEVBQUUsQ0FBQyxDQUFDO2dCQUN2RSxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBVSxFQUFFLEVBQUU7Z0JBQ3BCLGNBQWM7Z0JBQ2QsTUFBTSxPQUFPLEdBQUc7b0JBQ1osSUFBSSxFQUFFLGtCQUFrQjtvQkFDeEIsTUFBTSxFQUFFLG1CQUFtQjtvQkFDM0IsSUFBSSxFQUFFLENBQUMsaUJBQWlCLENBQUM7aUJBQzVCLENBQUM7Z0JBRUYsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQVcsRUFBRSxFQUFFO29CQUNsRixPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3BCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQVcsRUFBRSxFQUFFO29CQUNyQixPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxzQkFBc0IsR0FBRyxDQUFDLE9BQU8sMEJBQTBCLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2xILENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFTyxjQUFjLENBQUMsSUFBUyxFQUFFLGlCQUEwQjtRQUN4RCxNQUFNLFFBQVEsR0FBUTtZQUNsQixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07WUFDbkIsUUFBUSxFQUFFLEVBQUU7U0FDZixDQUFDO1FBRUYsSUFBSSxpQkFBaUIsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDdEMsUUFBUSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDckQsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLElBQUksU0FBUztnQkFDaEMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJO2FBQzVELENBQUMsQ0FBQyxDQUFDO1FBQ1IsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2hCLFFBQVEsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFVLEVBQUUsRUFBRSxDQUNqRCxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxDQUNoRCxDQUFDO1FBQ04sQ0FBQztRQUVELE9BQU8sUUFBUSxDQUFDO0lBQ3BCLENBQUM7SUFFTyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQVk7UUFDbEMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQzNCLHdDQUF3QztZQUN2QyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQWUsQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDaEUsT0FBTyxDQUFDO29CQUNKLE9BQU8sRUFBRSxJQUFJO29CQUNiLElBQUksRUFBRTt3QkFDRixJQUFJLEVBQUUsSUFBSTt3QkFDVixPQUFPLEVBQUUsNkJBQTZCO3FCQUN6QztpQkFDSixDQUFDLENBQUM7WUFDUCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFVLEVBQUUsRUFBRTtnQkFDcEIsT0FBTyxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDcEQsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFTyxLQUFLLENBQUMsVUFBVTtRQUNwQixPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDM0IsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQ3JELE9BQU8sQ0FBQztvQkFDSixPQUFPLEVBQUUsSUFBSTtvQkFDYixPQUFPLEVBQUUsMkJBQTJCO2lCQUN2QyxDQUFDLENBQUM7WUFDUCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFVLEVBQUUsRUFBRTtnQkFDcEIsT0FBTyxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDcEQsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7Q0FDSjtBQXhjRCxnQ0F3Y0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IsIFNjZW5lSW5mbyB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IGNyZWF0ZUVycm9yUmVzcG9uc2UsIEVSUk9SX0NPREVTIH0gZnJvbSAnLi4vdXRpbHMvZXJyb3ItcmVzcG9uc2UnO1xuXG5leHBvcnQgY2xhc3MgU2NlbmVUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2dldF9jdXJyZW50X3NjZW5lJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dldCBjdXJyZW50IHNjZW5lIGluZm9ybWF0aW9uJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge31cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdnZXRfc2NlbmVfbGlzdCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdHZXQgYWxsIHNjZW5lcyBpbiB0aGUgcHJvamVjdCcsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHt9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnbWFuYWdlbWVudCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdVbmlmaWVkIHNjZW5lIENSVUQgKHYxLjYuMCkuIGFjdGlvbj1vcGVuL3NhdmUvY2xvc2UvY3JlYXRlL3NhdmVfYXMuIEVhY2ggaGFzIGRpc3RpbmN0IHNpZGUtZWZmZWN0cyDigJQgb3Blbi9jbG9zZSBzd2l0Y2ggY3VycmVudCBzdGF0ZTsgY3JlYXRlL3NhdmVfYXMgd3JpdGUgbmV3IGZpbGU7IHNhdmUgd3JpdGVzIGN1cnJlbnQuIOKaoCBEbyBub3QgaW52b2tlIGluIHBhcmFsbGVsIHdpdGggb3RoZXIgbXV0YXRpbmcgdG9vbHMg4oCUIENvY29zIElQQyBzZXJpYWxpemVzIGFuZCBjb25jdXJyZW50IGNhbGxzIHRpbWUgb3V0LicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnb3BlbicsICdzYXZlJywgJ2Nsb3NlJywgJ2NyZWF0ZScsICdzYXZlX2FzJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdXaGljaCBzY2VuZSBvcGVyYXRpb24gdG8gcGVyZm9ybSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZVBhdGg6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnRm9yIG9wZW46IHRoZSBzY2VuZSBkYjovLyBwYXRoJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmVOYW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0ZvciBjcmVhdGU6IG5hbWUgb2YgdGhlIG5ldyBzY2VuZScgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVQYXRoOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0ZvciBjcmVhdGU6IHBhdGggdG8gc2F2ZSAoZGI6Ly9hc3NldHMvc2NlbmVzL1guc2NlbmUpJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdGb3Igc2F2ZV9hczogZGVzdGluYXRpb24gcGF0aCcgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2dldF9zY2VuZV9oaWVyYXJjaHknLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnR2V0IHRoZSBjb21wbGV0ZSBoaWVyYXJjaHkgb2YgY3VycmVudCBzY2VuZScsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGVDb21wb25lbnRzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSW5jbHVkZSBjb21wb25lbnQgaW5mb3JtYXRpb24nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XG4gICAgICAgICAgICBjYXNlICdnZXRfY3VycmVudF9zY2VuZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0Q3VycmVudFNjZW5lKCk7XG4gICAgICAgICAgICBjYXNlICdnZXRfc2NlbmVfbGlzdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0U2NlbmVMaXN0KCk7XG4gICAgICAgICAgICBjYXNlICdvcGVuX3NjZW5lJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5vcGVuU2NlbmUoYXJncy5zY2VuZVBhdGgpO1xuICAgICAgICAgICAgY2FzZSAnc2F2ZV9zY2VuZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc2F2ZVNjZW5lKCk7XG4gICAgICAgICAgICBjYXNlICdjcmVhdGVfc2NlbmUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNyZWF0ZVNjZW5lKGFyZ3Muc2NlbmVOYW1lLCBhcmdzLnNhdmVQYXRoKTtcbiAgICAgICAgICAgIGNhc2UgJ3NhdmVfc2NlbmVfYXMnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNhdmVTY2VuZUFzKGFyZ3MucGF0aCk7XG4gICAgICAgICAgICBjYXNlICdjbG9zZV9zY2VuZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY2xvc2VTY2VuZSgpO1xuICAgICAgICAgICAgY2FzZSAnZ2V0X3NjZW5lX2hpZXJhcmNoeSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0U2NlbmVIaWVyYXJjaHkoYXJncy5pbmNsdWRlQ29tcG9uZW50cyk7XG4gICAgICAgICAgICBjYXNlICdtYW5hZ2VtZW50JzpcbiAgICAgICAgICAgICAgICAvLyB2MS42LjAgdW5pZmllZCBhY3Rpb24tY29kZSBkaXNwYXRjaGVyXG4gICAgICAgICAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdvcGVuJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLm9wZW5TY2VuZShhcmdzLnNjZW5lUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NhdmUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc2F2ZVNjZW5lKCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2Nsb3NlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNsb3NlU2NlbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnY3JlYXRlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNyZWF0ZVNjZW5lKGFyZ3Muc2NlbmVOYW1lLCBhcmdzLnNhdmVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc2F2ZV9hcyc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zYXZlU2NlbmVBcyhhcmdzLnBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRVJST1JfQ09ERVMuSU5WQUxJRF9QQVJBTVMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYFVua25vd24gc2NlbmUubWFuYWdlbWVudCBhY3Rpb246ICR7YXJncy5hY3Rpb259YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHN1Z2dlc3Rpb246ICdVc2UgYWN0aW9uOiBcIm9wZW5cIiB8IFwic2F2ZVwiIHwgXCJjbG9zZVwiIHwgXCJjcmVhdGVcIiB8IFwic2F2ZV9hc1wiJyB9XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldEN1cnJlbnRTY2VuZSgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIC8vIOebtOaOpeS9v+eUqCBxdWVyeS1ub2RlLXRyZWUg5p2l6I635Y+W5Zy65pmv5L+h5oGv77yI6L+Z5Liq5pa55rOV5bey57uP6aqM6K+B5Y+v55So77yJXG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlLXRyZWUnKS50aGVuKCh0cmVlOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodHJlZSAmJiB0cmVlLnV1aWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHRyZWUubmFtZSB8fCAnQ3VycmVudCBTY2VuZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogdHJlZS51dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHRyZWUudHlwZSB8fCAnY2MuU2NlbmUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogdHJlZS5hY3RpdmUgIT09IHVuZGVmaW5lZCA/IHRyZWUuYWN0aXZlIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlQ291bnQ6IHRyZWUuY2hpbGRyZW4gPyB0cmVlLmNoaWxkcmVuLmxlbmd0aCA6IDBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIHNjZW5lIGRhdGEgYXZhaWxhYmxlJyB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIC8vIOWkh+eUqOaWueahiO+8muS9v+eUqOWcuuaZr+iEmuacrFxuICAgICAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnZ2V0Q3VycmVudFNjZW5lSW5mbycsXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIG9wdGlvbnMpLnRoZW4oKHJlc3VsdDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyMjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYERpcmVjdCBBUEkgZmFpbGVkOiAke2Vyci5tZXNzYWdlfSwgU2NlbmUgc2NyaXB0IGZhaWxlZDogJHtlcnIyLm1lc3NhZ2V9YCB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldFNjZW5lTGlzdCgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIC8vIE5vdGU6IHF1ZXJ5LWFzc2V0cyBBUEkgY29ycmVjdGVkIHdpdGggcHJvcGVyIHBhcmFtZXRlcnNcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0cycsIHtcbiAgICAgICAgICAgICAgICBwYXR0ZXJuOiAnZGI6Ly9hc3NldHMvKiovKi5zY2VuZSdcbiAgICAgICAgICAgIH0pLnRoZW4oKHJlc3VsdHM6IGFueVtdKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2NlbmVzOiBTY2VuZUluZm9bXSA9IHJlc3VsdHMubWFwKGFzc2V0ID0+ICh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGFzc2V0Lm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGFzc2V0LnVybCxcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogYXNzZXQudXVpZFxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogc2NlbmVzIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIG9wZW5TY2VuZShzY2VuZVBhdGg6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgLy8g6aaW5YWI6I635Y+W5Zy65pmv55qEVVVJRFxuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktdXVpZCcsIHNjZW5lUGF0aCkudGhlbigodXVpZDogc3RyaW5nIHwgbnVsbCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghdXVpZCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NjZW5lIG5vdCBmb3VuZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyDkvb/nlKjmraPnoa7nmoQgc2NlbmUgQVBJIOaJk+W8gOWcuuaZryAo6ZyA6KaBVVVJRClcbiAgICAgICAgICAgICAgICByZXR1cm4gRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnb3Blbi1zY2VuZScsIHV1aWQpO1xuICAgICAgICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBTY2VuZSBvcGVuZWQ6ICR7c2NlbmVQYXRofWAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2F2ZVNjZW5lKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2F2ZS1zY2VuZScpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiAnU2NlbmUgc2F2ZWQgc3VjY2Vzc2Z1bGx5JyB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBjcmVhdGVTY2VuZShzY2VuZU5hbWU6IHN0cmluZywgc2F2ZVBhdGg6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgLy8g56Gu5L+d6Lev5b6E5LulLnNjZW5l57uT5bC+XG4gICAgICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHNhdmVQYXRoLmVuZHNXaXRoKCcuc2NlbmUnKSA/IHNhdmVQYXRoIDogYCR7c2F2ZVBhdGh9LyR7c2NlbmVOYW1lfS5zY2VuZWA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIOS9v+eUqOato+ehrueahENvY29zIENyZWF0b3IgMy445Zy65pmv5qC85byPXG4gICAgICAgICAgICBjb25zdCBzY2VuZUNvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuU2NlbmVBc3NldFwiLFxuICAgICAgICAgICAgICAgICAgICBcIl9uYW1lXCI6IHNjZW5lTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgXCJfb2JqRmxhZ3NcIjogMCxcbiAgICAgICAgICAgICAgICAgICAgXCJfX2VkaXRvckV4dHJhc19fXCI6IHt9LFxuICAgICAgICAgICAgICAgICAgICBcIl9uYXRpdmVcIjogXCJcIixcbiAgICAgICAgICAgICAgICAgICAgXCJzY2VuZVwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcIl9faWRfX1wiOiAxXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlNjZW5lXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiX25hbWVcIjogc2NlbmVOYW1lLFxuICAgICAgICAgICAgICAgICAgICBcIl9vYmpGbGFnc1wiOiAwLFxuICAgICAgICAgICAgICAgICAgICBcIl9fZWRpdG9yRXh0cmFzX19cIjoge30sXG4gICAgICAgICAgICAgICAgICAgIFwiX3BhcmVudFwiOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBcIl9jaGlsZHJlblwiOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgXCJfYWN0aXZlXCI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIFwiX2NvbXBvbmVudHNcIjogW10sXG4gICAgICAgICAgICAgICAgICAgIFwiX3ByZWZhYlwiOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBcIl9scG9zXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5WZWMzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ6XCI6IDBcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgXCJfbHJvdFwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuUXVhdFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwielwiOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ3XCI6IDFcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgXCJfbHNjYWxlXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5WZWMzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ6XCI6IDFcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgXCJfbW9iaWxpdHlcIjogMCxcbiAgICAgICAgICAgICAgICAgICAgXCJfbGF5ZXJcIjogMTA3Mzc0MTgyNCxcbiAgICAgICAgICAgICAgICAgICAgXCJfZXVsZXJcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlZlYzNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInpcIjogMFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBcImF1dG9SZWxlYXNlQXNzZXRzXCI6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBcIl9nbG9iYWxzXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiX19pZF9fXCI6IDJcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgXCJfaWRcIjogXCJzY2VuZVwiXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5TY2VuZUdsb2JhbHNcIixcbiAgICAgICAgICAgICAgICAgICAgXCJhbWJpZW50XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiX19pZF9fXCI6IDNcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgXCJza3lib3hcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJfX2lkX19cIjogNFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBcImZvZ1wiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcIl9faWRfX1wiOiA1XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIFwib2N0cmVlXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiX19pZF9fXCI6IDZcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuQW1iaWVudEluZm9cIixcbiAgICAgICAgICAgICAgICAgICAgXCJfc2t5Q29sb3JIRFJcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlZlYzRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOiAwLjIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjogMC41LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ6XCI6IDAuOCxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwid1wiOiAwLjUyMDgzM1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBcIl9za3lDb2xvclwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuVmVjNFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6IDAuMixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOiAwLjUsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInpcIjogMC44LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ3XCI6IDAuNTIwODMzXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIFwiX3NreUlsbHVtSERSXCI6IDIwMDAwLFxuICAgICAgICAgICAgICAgICAgICBcIl9za3lJbGx1bVwiOiAyMDAwMCxcbiAgICAgICAgICAgICAgICAgICAgXCJfZ3JvdW5kQWxiZWRvSERSXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5WZWM0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjogMC4yLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6IDAuMixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwielwiOiAwLjIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcIndcIjogMVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBcIl9ncm91bmRBbGJlZG9cIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlZlYzRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOiAwLjIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjogMC4yLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ6XCI6IDAuMixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwid1wiOiAxXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlNreWJveEluZm9cIixcbiAgICAgICAgICAgICAgICAgICAgXCJfZW52TGlnaHRpbmdUeXBlXCI6IDAsXG4gICAgICAgICAgICAgICAgICAgIFwiX2Vudm1hcEhEUlwiOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBcIl9lbnZtYXBcIjogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgXCJfZW52bWFwTG9kQ291bnRcIjogMCxcbiAgICAgICAgICAgICAgICAgICAgXCJfZGlmZnVzZU1hcEhEUlwiOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBcIl9kaWZmdXNlTWFwXCI6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIFwiX2VuYWJsZWRcIjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIFwiX3VzZUhEUlwiOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBcIl9lZGl0YWJsZU1hdGVyaWFsXCI6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIFwiX3JlZmxlY3Rpb25IRFJcIjogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgXCJfcmVmbGVjdGlvbk1hcFwiOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBcIl9yb3RhdGlvbkFuZ2xlXCI6IDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLkZvZ0luZm9cIixcbiAgICAgICAgICAgICAgICAgICAgXCJfdHlwZVwiOiAwLFxuICAgICAgICAgICAgICAgICAgICBcIl9mb2dDb2xvclwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuQ29sb3JcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiclwiOiAyMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImdcIjogMjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJiXCI6IDIwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiYVwiOiAyNTVcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgXCJfZW5hYmxlZFwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgXCJfZm9nRGVuc2l0eVwiOiAwLjMsXG4gICAgICAgICAgICAgICAgICAgIFwiX2ZvZ1N0YXJ0XCI6IDAuNSxcbiAgICAgICAgICAgICAgICAgICAgXCJfZm9nRW5kXCI6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgXCJfZm9nQXR0ZW5cIjogNSxcbiAgICAgICAgICAgICAgICAgICAgXCJfZm9nVG9wXCI6IDEuNSxcbiAgICAgICAgICAgICAgICAgICAgXCJfZm9nUmFuZ2VcIjogMS4yLFxuICAgICAgICAgICAgICAgICAgICBcIl9hY2N1cmF0ZVwiOiBmYWxzZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuT2N0cmVlSW5mb1wiLFxuICAgICAgICAgICAgICAgICAgICBcIl9lbmFibGVkXCI6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBcIl9taW5Qb3NcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlZlYzNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOiAtMTAyNCxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOiAtMTAyNCxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwielwiOiAtMTAyNFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBcIl9tYXhQb3NcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlZlYzNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOiAxMDI0LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6IDEwMjQsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInpcIjogMTAyNFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBcIl9kZXB0aFwiOiA4XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSwgbnVsbCwgMik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ2NyZWF0ZS1hc3NldCcsIGZ1bGxQYXRoLCBzY2VuZUNvbnRlbnQpLnRoZW4oKHJlc3VsdDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVmVyaWZ5IHNjZW5lIGNyZWF0aW9uIGJ5IGNoZWNraW5nIGlmIGl0IGV4aXN0c1xuICAgICAgICAgICAgICAgIHRoaXMuZ2V0U2NlbmVMaXN0KCkudGhlbigoc2NlbmVMaXN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNyZWF0ZWRTY2VuZSA9IHNjZW5lTGlzdC5kYXRhPy5maW5kKChzY2VuZTogYW55KSA9PiBzY2VuZS51dWlkID09PSByZXN1bHQudXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiByZXN1bHQudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHJlc3VsdC51cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogc2NlbmVOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBTY2VuZSAnJHtzY2VuZU5hbWV9JyBjcmVhdGVkIHN1Y2Nlc3NmdWxseWAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmVWZXJpZmllZDogISFjcmVhdGVkU2NlbmVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25EYXRhOiBjcmVhdGVkU2NlbmVcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogcmVzdWx0LnV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiByZXN1bHQudXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHNjZW5lTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgU2NlbmUgJyR7c2NlbmVOYW1lfScgY3JlYXRlZCBzdWNjZXNzZnVsbHkgKHZlcmlmaWNhdGlvbiBmYWlsZWQpYFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRTY2VuZUhpZXJhcmNoeShpbmNsdWRlQ29tcG9uZW50czogYm9vbGVhbiA9IGZhbHNlKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAvLyDkvJjlhYjlsJ3or5Xkvb/nlKggRWRpdG9yIEFQSSDmn6Xor6LlnLrmma/oioLngrnmoJFcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpLnRoZW4oKHRyZWU6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0cmVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGhpZXJhcmNoeSA9IHRoaXMuYnVpbGRIaWVyYXJjaHkodHJlZSwgaW5jbHVkZUNvbXBvbmVudHMpO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBoaWVyYXJjaHlcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIHNjZW5lIGhpZXJhcmNoeSBhdmFpbGFibGUnIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8g5aSH55So5pa55qGI77ya5L2/55So5Zy65pmv6ISa5pysXG4gICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdnZXRTY2VuZUhpZXJhcmNoeScsXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtpbmNsdWRlQ29tcG9uZW50c11cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywgb3B0aW9ucykudGhlbigocmVzdWx0OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKChlcnIyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRGlyZWN0IEFQSSBmYWlsZWQ6ICR7ZXJyLm1lc3NhZ2V9LCBTY2VuZSBzY3JpcHQgZmFpbGVkOiAke2VycjIubWVzc2FnZX1gIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYnVpbGRIaWVyYXJjaHkobm9kZTogYW55LCBpbmNsdWRlQ29tcG9uZW50czogYm9vbGVhbik6IGFueSB7XG4gICAgICAgIGNvbnN0IG5vZGVJbmZvOiBhbnkgPSB7XG4gICAgICAgICAgICB1dWlkOiBub2RlLnV1aWQsXG4gICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXG4gICAgICAgICAgICB0eXBlOiBub2RlLnR5cGUsXG4gICAgICAgICAgICBhY3RpdmU6IG5vZGUuYWN0aXZlLFxuICAgICAgICAgICAgY2hpbGRyZW46IFtdXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGluY2x1ZGVDb21wb25lbnRzICYmIG5vZGUuX19jb21wc19fKSB7XG4gICAgICAgICAgICBub2RlSW5mby5jb21wb25lbnRzID0gbm9kZS5fX2NvbXBzX18ubWFwKChjb21wOiBhbnkpID0+ICh7XG4gICAgICAgICAgICAgICAgdHlwZTogY29tcC5fX3R5cGVfXyB8fCAnVW5rbm93bicsXG4gICAgICAgICAgICAgICAgZW5hYmxlZDogY29tcC5lbmFibGVkICE9PSB1bmRlZmluZWQgPyBjb21wLmVuYWJsZWQgOiB0cnVlXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgbm9kZUluZm8uY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuLm1hcCgoY2hpbGQ6IGFueSkgPT4gXG4gICAgICAgICAgICAgICAgdGhpcy5idWlsZEhpZXJhcmNoeShjaGlsZCwgaW5jbHVkZUNvbXBvbmVudHMpXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5vZGVJbmZvO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2F2ZVNjZW5lQXMocGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAvLyBzYXZlLWFzLXNjZW5lIEFQSSDkuI3mjqXlj5fot6/lvoTlj4LmlbDvvIzkvJrlvLnlh7rlr7nor53moYborqnnlKjmiLfpgInmi6lcbiAgICAgICAgICAgIChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ3NjZW5lJywgJ3NhdmUtYXMtc2NlbmUnKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBTY2VuZSBzYXZlLWFzIGRpYWxvZyBvcGVuZWRgXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBjbG9zZVNjZW5lKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnY2xvc2Utc2NlbmUnKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1NjZW5lIGNsb3NlZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn0iXX0=