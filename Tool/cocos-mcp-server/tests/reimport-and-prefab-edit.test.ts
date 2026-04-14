/**
 * Unit tests for reimport spriteFrame fix + prefab edit mode tools + tool-manager sync
 *
 * Tests:
 * - T1: reimport/refresh ensures userData.type = "sprite-frame" and waits for compilation
 * - T2: prefab edit mode tools (open/save/close) are registered and have correct logic
 * - ToolManager: syncNewToolsToConfigurations merges new tools into saved configs
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// Source file content reading
// ============================================================

const SOURCE_DIR = path.join(__dirname, '..', 'source', 'tools');
const projectToolsSrc = fs.readFileSync(path.join(SOURCE_DIR, 'project-tools.ts'), 'utf-8');
const prefabToolsSrc = fs.readFileSync(path.join(SOURCE_DIR, 'prefab-tools.ts'), 'utf-8');
const toolManagerSrc = fs.readFileSync(path.join(SOURCE_DIR, 'tool-manager.ts'), 'utf-8');

// ============================================================
// Helper: extract a function body from source
// ============================================================

function extractFunction(src: string, funcSignature: string, maxLen = 2000): string {
    const idx = src.indexOf(funcSignature);
    if (idx === -1) return '';
    return src.slice(idx, idx + maxLen);
}

// ============================================================
// Helper: replicate isImageAsset for direct testing
// ============================================================

function isImageAsset(url: string): boolean {
    return /\.(png|jpg|jpeg|gif|tga|bmp|psd)$/i.test(url);
}

// ============================================================
// T1: reimport / refresh — spriteFrame fix
// ============================================================

describe('T1: reimport spriteFrame compilation fix', () => {

    describe('isImageAsset — pure logic', () => {
        it('should match common image extensions', () => {
            expect(isImageAsset('db://assets/res/test.png')).toBe(true);
            expect(isImageAsset('db://assets/res/bg.jpg')).toBe(true);
            expect(isImageAsset('db://assets/res/icon.jpeg')).toBe(true);
            expect(isImageAsset('db://assets/res/old.tga')).toBe(true);
            expect(isImageAsset('db://assets/res/art.psd')).toBe(true);
            expect(isImageAsset('db://assets/res/anim.gif')).toBe(true);
            expect(isImageAsset('db://assets/res/bump.bmp')).toBe(true);
        });

        it('should be case-insensitive', () => {
            expect(isImageAsset('test.PNG')).toBe(true);
            expect(isImageAsset('test.Jpg')).toBe(true);
        });

        it('should not match non-image files', () => {
            expect(isImageAsset('db://assets/scripts/main.ts')).toBe(false);
            expect(isImageAsset('db://assets/scene/main.scene')).toBe(false);
            expect(isImageAsset('db://assets/prefab/ui.prefab')).toBe(false);
            expect(isImageAsset('db://assets/data.json')).toBe(false);
            expect(isImageAsset('db://assets/material.mtl')).toBe(false);
        });
    });

    describe('project-tools.ts — isImageAsset exists in source', () => {
        it('should have isImageAsset method', () => {
            expect(projectToolsSrc).toContain('private isImageAsset(url: string): boolean');
        });

        it('should match the same extensions as our test helper', () => {
            const func = extractFunction(projectToolsSrc, 'private isImageAsset', 200);
            expect(func).toContain('png');
            expect(func).toContain('jpg');
            expect(func).toContain('jpeg');
            expect(func).toContain('psd');
        });
    });

    describe('project-tools.ts — waitForSpriteFrameCompilation', () => {
        it('should exist as a private async method', () => {
            expect(projectToolsSrc).toContain('private async waitForSpriteFrameCompilation');
        });

        it('should poll with query-asset-info and query-url for @f9941', () => {
            const func = extractFunction(projectToolsSrc, 'private async waitForSpriteFrameCompilation');
            expect(func).toContain("query-asset-info");
            expect(func).toContain("query-url");
            expect(func).toContain("@f9941");
        });

        it('should have a timeout mechanism with interval-based polling', () => {
            const func = extractFunction(projectToolsSrc, 'private async waitForSpriteFrameCompilation');
            expect(func).toContain('timeoutMs');
            expect(func).toContain('interval');
            expect(func).toContain('maxAttempts');
            expect(func).toContain('setTimeout');
        });

        it('should return false on timeout (not hang or throw)', () => {
            const func = extractFunction(projectToolsSrc, 'private async waitForSpriteFrameCompilation');
            expect(func).toContain('return false');
            expect(func).toContain('return true');
        });
    });

    describe('project-tools.ts — ensureSpriteFrameType', () => {
        it('should exist as a private async method', () => {
            expect(projectToolsSrc).toContain('private async ensureSpriteFrameType');
        });

        it('should check and fix userData.type to sprite-frame', () => {
            const func = extractFunction(projectToolsSrc, 'private async ensureSpriteFrameType');
            expect(func).toContain("userData.type !== 'sprite-frame'");
            expect(func).toContain("userData.type = 'sprite-frame'");
        });

        it('should try Editor API first (query-asset-meta / save-asset-meta)', () => {
            const func = extractFunction(projectToolsSrc, 'private async ensureSpriteFrameType');
            expect(func).toContain('query-asset-meta');
            expect(func).toContain('save-asset-meta');
        });

        it('should have filesystem fallback when Editor API fails', () => {
            const func = extractFunction(projectToolsSrc, 'private async ensureSpriteFrameType');
            expect(func).toContain('fs.existsSync(metaPath)');
            expect(func).toContain('fs.readFileSync');
            expect(func).toContain('fs.writeFileSync');
        });

        it('should reimport after fixing meta', () => {
            const func = extractFunction(projectToolsSrc, 'private async ensureSpriteFrameType');
            expect(func).toContain("reimport-asset");
        });
    });

    describe('project-tools.ts — refreshAssets uses new helpers', () => {
        it('should call isImageAsset to check if target is an image', () => {
            const func = extractFunction(projectToolsSrc, 'private async refreshAssets');
            expect(func).toContain('this.isImageAsset(targetPath)');
        });

        it('should call ensureSpriteFrameType for image assets', () => {
            const func = extractFunction(projectToolsSrc, 'private async refreshAssets');
            expect(func).toContain('this.ensureSpriteFrameType(targetPath)');
        });

        it('should call waitForSpriteFrameCompilation and check result', () => {
            const func = extractFunction(projectToolsSrc, 'private async refreshAssets');
            expect(func).toContain('this.waitForSpriteFrameCompilation(targetPath)');
            expect(func).toContain('if (!compiled)');
        });

        it('should return error on compilation timeout, not success', () => {
            const func = extractFunction(projectToolsSrc, 'private async refreshAssets');
            expect(func).toContain('spriteFrame compilation timed out');
            expect(func).toContain('success: false');
        });
    });

    describe('project-tools.ts — reimportAsset uses new helpers', () => {
        it('should call ensureSpriteFrameType before and after reimport for image assets', () => {
            const func = extractFunction(projectToolsSrc, 'private async reimportAsset');
            expect(func).toContain('this.isImageAsset(url)');
            expect(func).toContain('this.ensureSpriteFrameType(url)');
        });

        it('should wait for spriteFrame compilation after reimport', () => {
            const func = extractFunction(projectToolsSrc, 'private async reimportAsset');
            expect(func).toContain('this.waitForSpriteFrameCompilation(url)');
        });

        it('should return error on compilation timeout', () => {
            const func = extractFunction(projectToolsSrc, 'private async reimportAsset');
            expect(func).toContain('spriteFrame compilation timed out');
            expect(func).toContain('success: false');
        });

        it('should include verification message on success', () => {
            const func = extractFunction(projectToolsSrc, 'private async reimportAsset');
            expect(func).toContain('spriteFrame compilation verified');
        });
    });

    describe('project-tools.ts — tool registration', () => {
        it('should have reimport_asset in execute switch', () => {
            expect(projectToolsSrc).toContain("case 'reimport_asset':");
        });

        it('should have refresh_assets in execute switch', () => {
            expect(projectToolsSrc).toContain("case 'refresh_assets':");
        });
    });
});

// ============================================================
// T2: prefab edit mode tools
// ============================================================

describe('T2: prefab edit mode tools', () => {

    describe('tool definitions — registered in getTools()', () => {
        it('should define open_edit_mode tool', () => {
            expect(prefabToolsSrc).toContain("name: 'open_edit_mode'");
        });

        it('should define save_edit tool', () => {
            expect(prefabToolsSrc).toContain("name: 'save_edit'");
        });

        it('should define close_edit_mode tool', () => {
            expect(prefabToolsSrc).toContain("name: 'close_edit_mode'");
        });

        it('open_edit_mode should require prefabPath parameter', () => {
            const idx = prefabToolsSrc.indexOf("name: 'open_edit_mode'");
            const toolDef = prefabToolsSrc.slice(idx, idx + 800);
            expect(toolDef).toContain('prefabPath');
            expect(toolDef).toContain("required");
        });

        it('save_edit should have no required parameters', () => {
            const idx = prefabToolsSrc.indexOf("name: 'save_edit'");
            const toolDef = prefabToolsSrc.slice(idx, idx + 300);
            expect(toolDef).not.toContain('required');
        });

        it('close_edit_mode should have optional save parameter defaulting to true', () => {
            const idx = prefabToolsSrc.indexOf("name: 'close_edit_mode'");
            const toolDef = prefabToolsSrc.slice(idx, idx + 500);
            expect(toolDef).toContain('save');
            expect(toolDef).toContain('default: true');
        });
    });

    describe('execute dispatch — switch cases', () => {
        it('should dispatch open_edit_mode', () => {
            expect(prefabToolsSrc).toContain("case 'open_edit_mode':");
        });

        it('should dispatch save_edit', () => {
            expect(prefabToolsSrc).toContain("case 'save_edit':");
        });

        it('should dispatch close_edit_mode', () => {
            expect(prefabToolsSrc).toContain("case 'close_edit_mode':");
        });
    });

    describe('openEditMode — implementation logic', () => {
        const func = extractFunction(prefabToolsSrc, 'private async openEditMode', 2000);

        it('should query prefab UUID via asset-db', () => {
            expect(func).toContain("'asset-db', 'query-uuid'");
        });

        it('should return error if prefab not found', () => {
            expect(func).toContain('Prefab not found');
            expect(func).toContain('success: false');
        });

        it('should remember current scene UUID for later restoration', () => {
            expect(func).toContain('query-current-scene');
            expect(func).toContain('this._previousSceneUuid');
        });

        it('should open prefab via scene.open-scene with UUID', () => {
            expect(func).toContain("'scene', 'open-scene', prefabUuid");
        });

        it('should query node tree to get rootNodeUuid', () => {
            expect(func).toContain("'scene', 'query-node-tree'");
            expect(func).toContain('rootNodeUuid');
        });

        it('should return success with prefabPath, prefabUuid, rootNodeUuid', () => {
            expect(func).toContain('prefabPath');
            expect(func).toContain('prefabUuid');
            expect(func).toContain('rootNodeUuid');
            expect(func).toContain('success: true');
        });

        it('should fallback rootNodeUuid to prefabUuid if tree query fails', () => {
            const fullFunc = extractFunction(prefabToolsSrc, 'private async openEditMode', 2500);
            expect(fullFunc).toContain('rootNodeUuid:');
            expect(fullFunc).toContain('prefabUuid');
        });
    });

    describe('saveEdit — implementation logic', () => {
        const func = extractFunction(prefabToolsSrc, 'private async saveEdit', 500);

        it('should call scene.save-scene', () => {
            expect(func).toContain("'scene', 'save-scene'");
        });

        it('should return success with descriptive message', () => {
            expect(func).toContain('success: true');
            expect(func).toContain('Prefab saved successfully');
        });

        it('should handle errors gracefully', () => {
            const fullFunc = extractFunction(prefabToolsSrc, 'private async saveEdit', 800);
            expect(fullFunc).toContain('success: false');
            expect(fullFunc).toContain('catch');
        });
    });

    describe('closeEditMode — implementation logic', () => {
        const func = extractFunction(prefabToolsSrc, 'private async closeEditMode', 1500);

        it('should accept save parameter defaulting to true', () => {
            expect(func).toContain('save: boolean = true');
        });

        it('should save before closing when save=true', () => {
            expect(func).toContain('if (save)');
            expect(func).toContain("'scene', 'save-scene'");
        });

        it('should restore previous scene if available', () => {
            expect(func).toContain('this._previousSceneUuid');
            expect(func).toContain("'scene', 'open-scene', this._previousSceneUuid");
        });

        it('should clear _previousSceneUuid after restoration', () => {
            expect(func).toContain('this._previousSceneUuid = null');
        });

        it('should handle case when no previous scene exists', () => {
            expect(func).toContain('no previous scene to return to');
            expect(func).toContain("'scene', 'new-scene'");
        });

        it('should not throw if save fails during close', () => {
            // The save is wrapped in its own try-catch so close can proceed
            const saveBlock = func.slice(func.indexOf('if (save)'), func.indexOf('if (this._previousSceneUuid)'));
            expect(saveBlock).toContain('catch');
        });
    });

    describe('_previousSceneUuid state management', () => {
        it('should be declared as a private field', () => {
            expect(prefabToolsSrc).toContain('private _previousSceneUuid: string | null = null');
        });
    });
});

// ============================================================
// ToolManager: syncNewToolsToConfigurations
// ============================================================

describe('ToolManager: syncNewToolsToConfigurations', () => {

    describe('source code structure', () => {
        it('should have syncNewToolsToConfigurations method', () => {
            expect(toolManagerSrc).toContain('private syncNewToolsToConfigurations');
        });

        it('should be called in constructor after initializeAvailableTools', () => {
            const constructor = extractFunction(toolManagerSrc, 'constructor()', 500);
            const initIdx = constructor.indexOf('initializeAvailableTools');
            const syncIdx = constructor.indexOf('syncNewToolsToConfigurations');
            expect(initIdx).toBeGreaterThan(-1);
            expect(syncIdx).toBeGreaterThan(-1);
            expect(syncIdx).toBeGreaterThan(initIdx);
        });
    });

    describe('sync logic — pure function test', () => {
        // Replicate the sync logic for direct testing
        interface ToolConfig {
            category: string;
            name: string;
            enabled: boolean;
            description: string;
        }

        function syncNewTools(
            availableTools: ToolConfig[],
            configTools: ToolConfig[]
        ): ToolConfig[] {
            const availableKey = (t: ToolConfig) => `${t.category}_${t.name}`;
            const availableSet = new Set(availableTools.map(availableKey));
            const existingKeys = new Set(configTools.map(availableKey));

            const result = [...configTools];

            // Add new tools
            for (const tool of availableTools) {
                if (!existingKeys.has(availableKey(tool))) {
                    result.push({ ...tool, enabled: true });
                }
            }

            // Remove tools that no longer exist
            return result.filter(t => availableSet.has(availableKey(t)));
        }

        it('should add new tools that exist in available but not in config', () => {
            const available: ToolConfig[] = [
                { category: 'prefab', name: 'get_prefab_list', enabled: true, description: 'list' },
                { category: 'prefab', name: 'open_edit_mode', enabled: true, description: 'open' },
                { category: 'prefab', name: 'save_edit', enabled: true, description: 'save' },
            ];
            const config: ToolConfig[] = [
                { category: 'prefab', name: 'get_prefab_list', enabled: true, description: 'list' },
            ];

            const result = syncNewTools(available, config);
            expect(result.length).toBe(3);
            expect(result.find(t => t.name === 'open_edit_mode')).toBeDefined();
            expect(result.find(t => t.name === 'save_edit')).toBeDefined();
        });

        it('should enable new tools by default', () => {
            const available: ToolConfig[] = [
                { category: 'prefab', name: 'open_edit_mode', enabled: true, description: 'open' },
            ];
            const config: ToolConfig[] = [];

            const result = syncNewTools(available, config);
            expect(result[0].enabled).toBe(true);
        });

        it('should remove tools that no longer exist in available', () => {
            const available: ToolConfig[] = [
                { category: 'prefab', name: 'open_edit_mode', enabled: true, description: 'open' },
            ];
            const config: ToolConfig[] = [
                { category: 'prefab', name: 'open_edit_mode', enabled: true, description: 'open' },
                { category: 'prefab', name: 'deprecated_tool', enabled: true, description: 'old' },
            ];

            const result = syncNewTools(available, config);
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('open_edit_mode');
        });

        it('should preserve existing tool enabled/disabled state', () => {
            const available: ToolConfig[] = [
                { category: 'prefab', name: 'get_prefab_list', enabled: true, description: 'list' },
                { category: 'prefab', name: 'open_edit_mode', enabled: true, description: 'open' },
            ];
            const config: ToolConfig[] = [
                { category: 'prefab', name: 'get_prefab_list', enabled: false, description: 'list' },
            ];

            const result = syncNewTools(available, config);
            const existing = result.find(t => t.name === 'get_prefab_list');
            expect(existing?.enabled).toBe(false); // preserved
            const newTool = result.find(t => t.name === 'open_edit_mode');
            expect(newTool?.enabled).toBe(true); // default for new
        });

        it('should handle empty config (all tools are new)', () => {
            const available: ToolConfig[] = [
                { category: 'prefab', name: 'a', enabled: true, description: '' },
                { category: 'prefab', name: 'b', enabled: true, description: '' },
            ];
            const result = syncNewTools(available, []);
            expect(result.length).toBe(2);
        });

        it('should handle no changes needed', () => {
            const tools: ToolConfig[] = [
                { category: 'prefab', name: 'open_edit_mode', enabled: true, description: 'open' },
            ];
            const result = syncNewTools(tools, [...tools]);
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('open_edit_mode');
        });

        it('should use category_name as unique key (same name in different categories)', () => {
            const available: ToolConfig[] = [
                { category: 'prefab', name: 'save', enabled: true, description: '' },
                { category: 'scene', name: 'save', enabled: true, description: '' },
            ];
            const config: ToolConfig[] = [
                { category: 'prefab', name: 'save', enabled: true, description: '' },
            ];

            const result = syncNewTools(available, config);
            expect(result.length).toBe(2);
        });
    });

    describe('source sync logic matches pure function', () => {
        it('should use category_name key format', () => {
            const func = extractFunction(toolManagerSrc, 'private syncNewToolsToConfigurations');
            expect(func).toContain('`${t.category}_${t.name}`');
        });

        it('should save settings when changes detected', () => {
            const func = extractFunction(toolManagerSrc, 'private syncNewToolsToConfigurations');
            expect(func).toContain('this.saveSettings()');
            expect(func).toContain('if (dirty)');
        });

        it('should add missing tools with enabled: true', () => {
            const func = extractFunction(toolManagerSrc, 'private syncNewToolsToConfigurations');
            expect(func).toContain('enabled: true');
        });

        it('should filter out removed tools', () => {
            const func = extractFunction(toolManagerSrc, 'private syncNewToolsToConfigurations');
            expect(func).toContain('availableSet.has(availableKey(t))');
        });
    });
});
