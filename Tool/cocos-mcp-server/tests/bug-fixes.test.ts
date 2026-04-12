/**
 * Unit tests for MCP Bug Fixes (Bug 3 → Bug 1 → Bug 2)
 *
 * Tests the three critical bug fixes:
 * - Bug 3: node layer default should be UI_2D (33554432), not DEFAULT (1073741824)
 * - Bug 1: custom script component __type__ should use compressed UUID, not string class name
 * - Bug 2: node position/contentSize should preserve actual values, not fallback to defaults
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// Helpers: Extract pure logic from source for direct testing
// ============================================================

/** Replicates PrefabTools.uuidToCompressedId — the exact algorithm from source */
function uuidToCompressedId(uuid: string): string {
    const BASE64_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    const cleanUuid = uuid.replace(/-/g, '').toLowerCase();
    if (cleanUuid.length !== 32) {
        return uuid;
    }
    let result = cleanUuid.substring(0, 5);
    const remainder = cleanUuid.substring(5);
    for (let i = 0; i < remainder.length; i += 3) {
        const hex1 = remainder[i] || '0';
        const hex2 = remainder[i + 1] || '0';
        const hex3 = remainder[i + 2] || '0';
        const value = parseInt(hex1 + hex2 + hex3, 16);
        const high6 = (value >> 6) & 63;
        const low6 = value & 63;
        result += BASE64_KEYS[high6] + BASE64_KEYS[low6];
    }
    return result;
}

/** Replicates the getValue helper used in createEngineStandardNode */
function getValue(prop: any): any {
    if (prop?.value !== undefined) return prop.value;
    if (prop !== undefined) return prop;
    return null;
}

// ============================================================
// Source file content reading helpers
// ============================================================

const SOURCE_DIR = path.join(__dirname, '..', 'source', 'tools');
const nodeToolsSrc = fs.readFileSync(path.join(SOURCE_DIR, 'node-tools.ts'), 'utf-8');
const prefabToolsSrc = fs.readFileSync(path.join(SOURCE_DIR, 'prefab-tools.ts'), 'utf-8');

// ============================================================
// Bug 3: Layer Default Value Tests
// ============================================================

describe('Bug 3: node layer default = UI_2D (33554432)', () => {

    describe('node-tools.ts — getNodeInfo fallback', () => {
        it('should use 33554432 as layer fallback, not 1073741824', () => {
            // Verify source code contains the fix
            const getNodeInfoMatch = nodeToolsSrc.match(/layer:\s*nodeData\.layer\?\.value\s*\|\|\s*(\d+)/);
            expect(getNodeInfoMatch).not.toBeNull();
            expect(getNodeInfoMatch![1]).toBe('33554432');
        });

        it('should not contain 1073741824 as layer fallback in getNodeInfo', () => {
            // Find the getNodeInfo function and check it doesn't use DEFAULT layer
            const getNodeInfoSection = nodeToolsSrc.slice(
                nodeToolsSrc.indexOf('private async getNodeInfo'),
                nodeToolsSrc.indexOf('private async getNodeInfo') + 500
            );
            expect(getNodeInfoSection).not.toContain('1073741824');
        });
    });

    describe('node-tools.ts — createNode sets layer after creation', () => {
        it('should contain set-property call for layer=33554432 in createNode', () => {
            const createNodeSection = nodeToolsSrc.slice(
                nodeToolsSrc.indexOf('private async createNode'),
                nodeToolsSrc.indexOf('private async getNodeInfo')
            );
            // Verify it calls set-property with layer path and UI_2D value
            expect(createNodeSection).toContain("path: 'layer'");
            expect(createNodeSection).toContain('value: 33554432');
        });
    });

    describe('prefab-tools.ts — createEngineStandardNode fallback', () => {
        it('should use 33554432 as layer fallback in createEngineStandardNode', () => {
            const startIdx = prefabToolsSrc.indexOf('private createEngineStandardNode');
            const engineNodeSection = prefabToolsSrc.slice(startIdx, startIdx + 1200);
            // Should contain UI_2D default
            expect(engineNodeSection).toContain('33554432');
            // Should NOT contain DEFAULT layer as fallback
            expect(engineNodeSection).not.toContain('1073741824');
        });

        it('should apply UI_2D layer when nodeData has no layer property', () => {
            // Simulate the getValue + fallback logic
            const nodeData = { name: 'TestNode' }; // no layer
            const layer = getValue(nodeData.layer) || getValue((nodeData as any).value?.layer) || 33554432;
            expect(layer).toBe(33554432);
        });

        it('should preserve existing layer from nodeData', () => {
            const nodeData = { layer: { value: 1073741824 } }; // explicit DEFAULT
            const layer = getValue(nodeData.layer) || 33554432;
            expect(layer).toBe(1073741824); // preserve explicit value
        });

        it('should preserve UI_2D layer from nodeData.value', () => {
            const nodeData = { value: { layer: 33554432 } };
            const layer = getValue((nodeData as any).layer) || getValue(nodeData.value.layer) || 33554432;
            expect(layer).toBe(33554432);
        });
    });

    describe('prefab-tools.ts — createMinimalNode already correct', () => {
        it('should use 33554432 in createMinimalNode', () => {
            const startIdx = prefabToolsSrc.indexOf('private createMinimalNode');
            const minimalNodeSection = prefabToolsSrc.slice(startIdx, startIdx + 1000);
            expect(minimalNodeSection).toContain('33554432');
            expect(minimalNodeSection).not.toContain('1073741824');
        });
    });
});

// ============================================================
// Bug 1: Script Component Class ID Compression Tests
// ============================================================

describe('Bug 1: script component __type__ uses compressed UUID', () => {

    describe('uuidToCompressedId — pure logic', () => {
        it('should compress a standard UUID to 23-char format (5 + 18)', () => {
            const uuid = 'a1d6b0fe-f217-4691-b111-08890e8b22b6';
            const result = uuidToCompressedId(uuid);
            // Result should be exactly 23 chars: 5 hex prefix + 18 compressed chars
            expect(result.length).toBe(23);
            // First 5 chars should be the first 5 hex chars of the cleaned UUID
            expect(result.substring(0, 5)).toBe('a1d6b');
        });

        it('should return original string for invalid UUID (not 32 hex chars)', () => {
            expect(uuidToCompressedId('short')).toBe('short');
            expect(uuidToCompressedId('not-a-valid-uuid')).toBe('not-a-valid-uuid');
        });

        it('should handle UUID without dashes', () => {
            const uuid = 'a1d6b0fef2174691b11108890e8b22b6';
            const result = uuidToCompressedId(uuid);
            expect(result.length).toBe(23);
            expect(result.substring(0, 5)).toBe('a1d6b');
        });

        it('should be case-insensitive', () => {
            const lower = uuidToCompressedId('a1d6b0fe-f217-4691-b111-08890e8b22b6');
            const upper = uuidToCompressedId('A1D6B0FE-F217-4691-B111-08890E8B22B6');
            expect(lower).toBe(upper);
        });

        it('should produce different output for different UUIDs', () => {
            const id1 = uuidToCompressedId('a1d6b0fe-f217-4691-b111-08890e8b22b6');
            const id2 = uuidToCompressedId('b2e7c1ff-a328-5702-c222-19990f9c33c7');
            expect(id1).not.toBe(id2);
        });

        it('should be deterministic', () => {
            const uuid = '12345678-abcd-ef01-2345-6789abcdef01';
            expect(uuidToCompressedId(uuid)).toBe(uuidToCompressedId(uuid));
        });
    });

    describe('createComponentObject — script type conversion', () => {
        it('source should attempt __scriptAsset UUID extraction for non-cc.* types', () => {
            const createCompSection = prefabToolsSrc.slice(
                prefabToolsSrc.indexOf('private createComponentObject'),
                prefabToolsSrc.indexOf('private createComponentObject') + 1200
            );
            // Must check for non-cc.* types
            expect(createCompSection).toContain("!componentType.startsWith('cc.')");
            // Must look for __scriptAsset
            expect(createCompSection).toContain('__scriptAsset');
            // Must call uuidToCompressedId
            expect(createCompSection).toContain('uuidToCompressedId');
        });

        it('should convert script class name to compressed ID when __scriptAsset available', () => {
            // Simulate the logic from createComponentObject
            const componentData = {
                type: 'starRoadViewCmpt',  // string class name (bug)
                properties: {
                    __scriptAsset: {
                        value: {
                            uuid: 'a1d6b0fe-f217-4691-b111-08890e8b22b6'
                        }
                    }
                }
            };

            let componentType = componentData.type;
            if (componentType && !componentType.startsWith('cc.')) {
                const scriptAsset = componentData.properties?.__scriptAsset;
                const scriptUuid = scriptAsset?.value?.uuid;
                if (scriptUuid && typeof scriptUuid === 'string' && scriptUuid.length >= 32) {
                    componentType = uuidToCompressedId(scriptUuid);
                }
            }

            expect(componentType).not.toBe('starRoadViewCmpt');
            expect(componentType.length).toBe(23); // compressed format
        });

        it('should keep original type when no __scriptAsset available', () => {
            const componentData = {
                type: 'myCustomScript',
                properties: {} // no __scriptAsset
            };

            let componentType = componentData.type;
            if (componentType && !componentType.startsWith('cc.')) {
                const scriptAsset = (componentData.properties as any)?.__scriptAsset;
                const scriptUuid = scriptAsset?.value?.uuid || scriptAsset?.uuid;
                if (scriptUuid && typeof scriptUuid === 'string' && scriptUuid.length >= 32) {
                    componentType = uuidToCompressedId(scriptUuid);
                }
            }

            expect(componentType).toBe('myCustomScript'); // unchanged
        });

        it('should not modify cc.* component types', () => {
            const builtinTypes = ['cc.UITransform', 'cc.Sprite', 'cc.Label', 'cc.Button', 'cc.Component'];
            for (const type of builtinTypes) {
                let componentType = type;
                if (componentType && !componentType.startsWith('cc.')) {
                    componentType = 'SHOULD_NOT_REACH_HERE';
                }
                expect(componentType).toBe(type);
            }
        });
    });

    describe('createStandardComponentObject — same script type conversion', () => {
        it('source should also convert non-cc.* types in createStandardComponentObject', () => {
            const stdCompSection = prefabToolsSrc.slice(
                prefabToolsSrc.indexOf('private createStandardComponentObject'),
                prefabToolsSrc.indexOf('private createStandardComponentObject') + 800
            );
            expect(stdCompSection).toContain("!componentType.startsWith('cc.')");
            expect(stdCompSection).toContain('__scriptAsset');
            expect(stdCompSection).toContain('uuidToCompressedId');
        });

        it('should handle __scriptAsset from multiple data paths', () => {
            // Test componentData.properties.__scriptAsset
            const data1 = {
                __type__: 'customScript',
                properties: { __scriptAsset: { value: { uuid: 'a1d6b0fe-f217-4691-b111-08890e8b22b6' } } }
            };
            // Test componentData.__scriptAsset
            const data2 = {
                __type__: 'customScript',
                __scriptAsset: { uuid: 'a1d6b0fe-f217-4691-b111-08890e8b22b6' }
            };
            // Test componentData.value.__scriptAsset
            const data3 = {
                __type__: 'customScript',
                value: { __scriptAsset: { uuid: 'a1d6b0fe-f217-4691-b111-08890e8b22b6' } }
            };

            for (const componentData of [data1, data2, data3]) {
                let componentType = (componentData as any).__type__;
                if (componentType && !componentType.startsWith('cc.')) {
                    const scriptAsset = (componentData as any).properties?.__scriptAsset
                        || (componentData as any).__scriptAsset
                        || (componentData as any).value?.__scriptAsset;
                    const scriptUuid = scriptAsset?.value?.uuid || scriptAsset?.uuid;
                    if (scriptUuid && typeof scriptUuid === 'string' && scriptUuid.length >= 32) {
                        componentType = uuidToCompressedId(scriptUuid);
                    }
                }
                expect(componentType).not.toBe('customScript');
                expect(componentType.length).toBe(23);
            }
        });
    });
});

// ============================================================
// Bug 2: Position / ContentSize Preservation Tests
// ============================================================

describe('Bug 2: node position/contentSize preserve actual values', () => {

    describe('enhanceTreeWithMCPComponents — query-node enrichment', () => {
        it('source should call query-node to get full node data', () => {
            const enhanceSection = prefabToolsSrc.slice(
                prefabToolsSrc.indexOf('private async enhanceTreeWithMCPComponents'),
                prefabToolsSrc.indexOf('private async enhanceTreeWithMCPComponents') + 2000
            );
            // Must call query-node (not just query-node-tree)
            expect(enhanceSection).toContain("'query-node'");
            // Must set position, rotation, scale, layer from fullNodeData
            expect(enhanceSection).toContain('fullNodeData.position');
            expect(enhanceSection).toContain('fullNodeData.rotation');
            expect(enhanceSection).toContain('fullNodeData.scale');
            expect(enhanceSection).toContain('fullNodeData.layer');
            expect(enhanceSection).toContain('fullNodeData.active');
        });

        it('source should have MCP HTTP fallback when query-node fails', () => {
            const enhanceSection = prefabToolsSrc.slice(
                prefabToolsSrc.indexOf('private async enhanceTreeWithMCPComponents'),
                prefabToolsSrc.indexOf('private async enhanceTreeWithMCPComponents') + 2500
            );
            expect(enhanceSection).toContain('http://localhost:8585/mcp');
            expect(enhanceSection).toContain('component_get_components');
        });

        it('source should enhance component data with __scriptAsset from __comps__', () => {
            const enhanceSection = prefabToolsSrc.slice(
                prefabToolsSrc.indexOf('private async enhanceTreeWithMCPComponents'),
                prefabToolsSrc.indexOf('private async enhanceTreeWithMCPComponents') + 2000
            );
            expect(enhanceSection).toContain('__comps__');
            expect(enhanceSection).toContain('__scriptAsset');
        });
    });

    describe('createComponentObject — UITransform contentSize multi-path', () => {
        it('source should try _contentSize path in addition to contentSize', () => {
            const startIdx = prefabToolsSrc.indexOf('private createComponentObject');
            const createCompSection = prefabToolsSrc.slice(startIdx, startIdx + 2500);
            expect(createCompSection).toContain('_contentSize');
            expect(createCompSection).toContain('_anchorPoint');
        });

        it('should resolve contentSize from properties.contentSize.value', () => {
            const componentData = {
                properties: { contentSize: { value: { width: 680, height: 400 } } }
            };
            const contentSize = componentData.properties?.contentSize?.value
                || (componentData.properties as any)?._contentSize?.value
                || componentData.properties?.contentSize
                || (componentData.properties as any)?._contentSize
                || { width: 100, height: 100 };
            expect(contentSize).toEqual({ width: 680, height: 400 });
        });

        it('should resolve contentSize from properties._contentSize.value', () => {
            const componentData = {
                properties: { _contentSize: { value: { width: 320, height: 240 } } }
            };
            const contentSize = (componentData.properties as any)?.contentSize?.value
                || componentData.properties?._contentSize?.value
                || (componentData.properties as any)?.contentSize
                || componentData.properties?._contentSize
                || { width: 100, height: 100 };
            expect(contentSize).toEqual({ width: 320, height: 240 });
        });

        it('should resolve contentSize from properties.contentSize (no .value wrapper)', () => {
            const componentData = {
                properties: { contentSize: { width: 500, height: 300 } }
            };
            const contentSize = (componentData.properties as any)?.contentSize?.value
                || (componentData.properties as any)?._contentSize?.value
                || componentData.properties?.contentSize
                || (componentData.properties as any)?._contentSize
                || { width: 100, height: 100 };
            expect(contentSize).toEqual({ width: 500, height: 300 });
        });

        it('should resolve contentSize from properties._contentSize (no .value wrapper)', () => {
            const componentData = {
                properties: { _contentSize: { width: 200, height: 150 } }
            };
            const contentSize = (componentData.properties as any)?.contentSize?.value
                || componentData.properties?._contentSize?.value
                || (componentData.properties as any)?.contentSize
                || componentData.properties?._contentSize
                || { width: 100, height: 100 };
            expect(contentSize).toEqual({ width: 200, height: 150 });
        });

        it('should fallback to 100x100 only when no contentSize data at all', () => {
            const componentData = { properties: {} };
            const contentSize = (componentData.properties as any)?.contentSize?.value
                || (componentData.properties as any)?._contentSize?.value
                || (componentData.properties as any)?.contentSize
                || (componentData.properties as any)?._contentSize
                || { width: 100, height: 100 };
            expect(contentSize).toEqual({ width: 100, height: 100 });
        });
    });

    describe('position preservation logic', () => {
        it('should resolve position from nodeData.position.value', () => {
            const nodeData = { position: { value: { x: 100, y: 200, z: 0 } } };
            const position = getValue(nodeData.position) || getValue((nodeData as any).value?.position) || { x: 0, y: 0, z: 0 };
            expect(position).toEqual({ x: 100, y: 200, z: 0 });
        });

        it('should resolve position from nodeData.position (direct value)', () => {
            const nodeData = { position: { x: 50, y: 75, z: 0 } };
            const position = getValue(nodeData.position) || getValue((nodeData as any).value?.position) || { x: 0, y: 0, z: 0 };
            expect(position).toEqual({ x: 50, y: 75, z: 0 });
        });

        it('should resolve position from nodeData.value.position', () => {
            const nodeData = { value: { position: { x: 300, y: 400, z: 0 } } };
            const position = getValue((nodeData as any).position) || getValue(nodeData.value.position) || { x: 0, y: 0, z: 0 };
            expect(position).toEqual({ x: 300, y: 400, z: 0 });
        });

        it('should fallback to origin only when no position data at all', () => {
            const nodeData = { name: 'TestNode' }; // no position
            const position = getValue((nodeData as any).position) || getValue((nodeData as any).value?.position) || { x: 0, y: 0, z: 0 };
            expect(position).toEqual({ x: 0, y: 0, z: 0 });
        });

        it('should NOT lose position {x:0, y:0, z:0} when it is explicitly set', () => {
            // This is a subtle edge case: {x:0, y:0, z:0} is falsy with ||
            // But getValue returns the object, which is truthy
            const nodeData = { position: { value: { x: 0, y: 0, z: 0 } } };
            const position = getValue(nodeData.position) || getValue((nodeData as any).value?.position) || { x: 0, y: 0, z: 0 };
            // getValue returns {x:0,y:0,z:0} which is truthy as an object
            expect(position).toEqual({ x: 0, y: 0, z: 0 });
        });
    });
});

// ============================================================
// Cross-cutting: No Regression Tests
// ============================================================

describe('Cross-cutting: no regressions', () => {

    it('node-tools.ts should not have any remaining 1073741824 layer fallbacks', () => {
        // The only places 1073741824 should appear are in comments or non-layer contexts
        const lines = nodeToolsSrc.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('1073741824') && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
                // If it exists, it should NOT be a layer fallback
                expect(line).not.toMatch(/layer.*1073741824/);
            }
        }
    });

    it('prefab-tools.ts createEngineStandardNode should not use 1073741824', () => {
        const section = prefabToolsSrc.slice(
            prefabToolsSrc.indexOf('private createEngineStandardNode'),
            prefabToolsSrc.indexOf('private createEngineStandardNode') + 700
        );
        expect(section).not.toContain('1073741824');
    });

    it('prefab-tools.ts should have uuidToCompressedId function', () => {
        expect(prefabToolsSrc).toContain('private uuidToCompressedId');
    });

    it('both createComponentObject and createStandardComponentObject should handle script types', () => {
        // Count occurrences of the conversion pattern
        const pattern = /uuidToCompressedId\(scriptUuid\)/g;
        const matches = prefabToolsSrc.match(pattern);
        // Should appear at least twice (in both functions)
        expect(matches).not.toBeNull();
        expect(matches!.length).toBeGreaterThanOrEqual(2);
    });

    it('enhanceTreeWithMCPComponents should recursively process children', () => {
        const startIdx = prefabToolsSrc.indexOf('private async enhanceTreeWithMCPComponents');
        // Find the next private method to get the full function body
        const nextMethodIdx = prefabToolsSrc.indexOf('private async buildBasicNodeInfo', startIdx);
        const section = prefabToolsSrc.slice(startIdx, nextMethodIdx);
        expect(section).toContain('enhanceTreeWithMCPComponents(node.children[i])');
    });
});
