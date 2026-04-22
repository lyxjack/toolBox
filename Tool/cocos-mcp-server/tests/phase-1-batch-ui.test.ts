/**
 * Phase 1 — component_batch_set_properties + ui_set_label/layout/sprite
 *
 * Coverage:
 * - batch_set_properties: schema, validation paths, source structure
 * - UITools: 3 tool schemas, validation short-circuits, propertyType auto-mapping
 * - UITools: delegation to ComponentTools (entries shape verification)
 * - mcp-server.ts: ui category registration
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ComponentTools } from '../source/tools/component-tools';
import { UITools } from '../source/tools/ui-tools';
import { ERROR_CODES } from '../source/utils/error-response';

const SOURCE_DIR = path.join(__dirname, '..', 'source');
const componentToolsSrc = fs.readFileSync(path.join(SOURCE_DIR, 'tools', 'component-tools.ts'), 'utf-8');
const uiToolsSrc = fs.readFileSync(path.join(SOURCE_DIR, 'tools', 'ui-tools.ts'), 'utf-8');
const mcpServerSrc = fs.readFileSync(path.join(SOURCE_DIR, 'mcp-server.ts'), 'utf-8');

describe('Phase 1: component_batch_set_properties schema', () => {
    const tools = new ComponentTools().getTools();
    const batch = tools.find(t => t.name === 'batch_set_properties');

    it('is registered on ComponentTools', () => {
        expect(batch).toBeDefined();
    });

    it('requires nodeUuid, componentType, properties', () => {
        expect(batch!.inputSchema.required).toEqual(['nodeUuid', 'componentType', 'properties']);
    });

    it('properties is an array of {property, propertyType, value} entries', () => {
        const p = batch!.inputSchema.properties.properties;
        expect(p.type).toBe('array');
        expect(p.items.required).toEqual(['property', 'propertyType', 'value']);
    });

    it('propertyType enum includes all Cocos types used by existing set_component_property', () => {
        const pt = batch!.inputSchema.properties.properties.items.properties.propertyType;
        expect(pt.enum).toContain('string');
        expect(pt.enum).toContain('number');
        expect(pt.enum).toContain('color');
        expect(pt.enum).toContain('spriteFrame');
        expect(pt.enum).toContain('vec2');
    });
});

describe('Phase 1: batch_set_properties parameter validation', () => {
    const tools = new ComponentTools();

    it('rejects empty nodeUuid with INVALID_PARAMS', async () => {
        const r = await tools.execute('batch_set_properties', {
            nodeUuid: '',
            componentType: 'cc.Label',
            properties: [{ property: 'string', propertyType: 'string', value: 'x' }]
        });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });

    it('rejects empty componentType with INVALID_PARAMS', async () => {
        const r = await tools.execute('batch_set_properties', {
            nodeUuid: 'fake-uuid',
            componentType: '',
            properties: [{ property: 'string', propertyType: 'string', value: 'x' }]
        });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });

    it('rejects missing properties array with INVALID_PARAMS', async () => {
        const r = await tools.execute('batch_set_properties', {
            nodeUuid: 'fake-uuid',
            componentType: 'cc.Label'
        });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });

    it('rejects empty properties array with INVALID_PARAMS', async () => {
        const r = await tools.execute('batch_set_properties', {
            nodeUuid: 'fake-uuid',
            componentType: 'cc.Label',
            properties: []
        });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });
});

describe('Phase 1: UITools schemas', () => {
    const tools = new UITools().getTools();

    it('has exactly 3 tools (set_label, set_layout, set_sprite)', () => {
        expect(tools.length).toBe(3);
        const names = tools.map(t => t.name).sort();
        expect(names).toEqual(['set_label', 'set_layout', 'set_sprite']);
    });

    it('all three tools require nodeUuid', () => {
        for (const t of tools) {
            expect(t.inputSchema.required).toContain('nodeUuid');
        }
    });

    it('set_label schema covers all canonical Label fields', () => {
        const t = tools.find(x => x.name === 'set_label')!;
        const p = t.inputSchema.properties;
        expect(p).toHaveProperty('string');
        expect(p).toHaveProperty('fontSize');
        expect(p).toHaveProperty('isBold');
        expect(p).toHaveProperty('color');
        expect(p).toHaveProperty('horizontalAlign');
    });

    it('set_layout schema covers all canonical Layout fields', () => {
        const t = tools.find(x => x.name === 'set_layout')!;
        const p = t.inputSchema.properties;
        expect(p).toHaveProperty('type');
        expect(p).toHaveProperty('resizeMode');
        expect(p).toHaveProperty('spacingX');
        expect(p).toHaveProperty('paddingLeft');
        expect(p).toHaveProperty('horizontalDirection');
    });

    it('set_sprite schema covers all canonical Sprite fields', () => {
        const t = tools.find(x => x.name === 'set_sprite')!;
        const p = t.inputSchema.properties;
        expect(p).toHaveProperty('spriteFrame');
        expect(p).toHaveProperty('sizeMode');
        expect(p).toHaveProperty('type');
        expect(p).toHaveProperty('color');
    });
});

describe('Phase 1: UITools validation short-circuits', () => {
    const ui = new UITools();

    it('set_label rejects missing nodeUuid with INVALID_PARAMS', async () => {
        const r = await ui.execute('set_label', { string: 'hi' });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });

    it('set_layout rejects missing nodeUuid with INVALID_PARAMS', async () => {
        const r = await ui.execute('set_layout', { type: 1 });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });

    it('set_sprite rejects missing nodeUuid with INVALID_PARAMS', async () => {
        const r = await ui.execute('set_sprite', { sizeMode: 1 });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });

    it('set_label rejects when nodeUuid present but all other fields undefined', async () => {
        const r = await ui.execute('set_label', { nodeUuid: 'fake' });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
        expect(r.error).toMatch(/Label fields/i);
    });

    it('set_layout rejects when nodeUuid present but all other fields undefined', async () => {
        const r = await ui.execute('set_layout', { nodeUuid: 'fake' });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });

    it('set_sprite rejects when nodeUuid present but all other fields undefined', async () => {
        const r = await ui.execute('set_sprite', { nodeUuid: 'fake' });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });
});

describe('Phase 1: UITools delegation + entry building', () => {
    // Stub ComponentTools.execute to capture the delegated call shape
    function makeStubbedUITools() {
        const ui = new UITools();
        let capturedArgs: any = null;
        let capturedTool: string | null = null;
        (ui as any).componentTools = {
            execute: async (toolName: string, args: any) => {
                capturedTool = toolName;
                capturedArgs = args;
                return { success: true, data: { stub: true } };
            }
        };
        return {
            ui,
            getCapture: () => ({ tool: capturedTool, args: capturedArgs })
        };
    }

    it('set_label delegates to batch_set_properties on cc.Label', async () => {
        const { ui, getCapture } = makeStubbedUITools();
        await ui.execute('set_label', { nodeUuid: 'n1', string: 'hi', fontSize: 20 });
        const { tool, args } = getCapture();
        expect(tool).toBe('batch_set_properties');
        expect(args.nodeUuid).toBe('n1');
        expect(args.componentType).toBe('cc.Label');
    });

    it('set_label builds entries with correct propertyType per field', async () => {
        const { ui, getCapture } = makeStubbedUITools();
        await ui.execute('set_label', {
            nodeUuid: 'n1',
            string: 'hi',
            fontSize: 20,
            isBold: true,
            color: { r: 255, g: 0, b: 0, a: 255 }
        });
        const entries = getCapture().args.properties;
        const byName = Object.fromEntries(entries.map((e: any) => [e.property, e]));
        expect(byName.string.propertyType).toBe('string');
        expect(byName.fontSize.propertyType).toBe('number');
        expect(byName.isBold.propertyType).toBe('boolean');
        expect(byName.color.propertyType).toBe('color');
    });

    it('set_label skips undefined fields (partial update)', async () => {
        const { ui, getCapture } = makeStubbedUITools();
        await ui.execute('set_label', { nodeUuid: 'n1', fontSize: 14 });
        const entries = getCapture().args.properties;
        expect(entries.length).toBe(1);
        expect(entries[0].property).toBe('fontSize');
    });

    it('set_layout delegates on cc.Layout with numeric propertyTypes', async () => {
        const { ui, getCapture } = makeStubbedUITools();
        await ui.execute('set_layout', { nodeUuid: 'n1', type: 1, spacingX: 10, paddingLeft: 4 });
        const { args } = getCapture();
        expect(args.componentType).toBe('cc.Layout');
        const entries = args.properties;
        // All Layout fields should be 'number' type
        for (const e of entries) {
            expect(e.propertyType).toBe('number');
        }
    });

    it('set_sprite delegates on cc.Sprite with spriteFrame propertyType for spriteFrame field', async () => {
        const { ui, getCapture } = makeStubbedUITools();
        await ui.execute('set_sprite', {
            nodeUuid: 'n1',
            spriteFrame: 'db://a.png/a',
            sizeMode: 1,
            color: { r: 255, g: 255, b: 255, a: 255 }
        });
        const { args } = getCapture();
        expect(args.componentType).toBe('cc.Sprite');
        const byName = Object.fromEntries(args.properties.map((e: any) => [e.property, e]));
        expect(byName.spriteFrame.propertyType).toBe('spriteFrame');
        expect(byName.sizeMode.propertyType).toBe('number');
        expect(byName.color.propertyType).toBe('color');
    });

    it('set_sprite forwards spriteFrame value verbatim (UUID or URL string)', async () => {
        const { ui, getCapture } = makeStubbedUITools();
        await ui.execute('set_sprite', { nodeUuid: 'n1', spriteFrame: 'abc-uuid-123' });
        const byName = Object.fromEntries(getCapture().args.properties.map((e: any) => [e.property, e]));
        expect(byName.spriteFrame.value).toBe('abc-uuid-123');
    });
});

describe('Phase 1: source structure', () => {
    it('component-tools.ts imports createErrorResponse + ERROR_CODES', () => {
        expect(componentToolsSrc).toContain("from '../utils/error-response'");
    });

    it('component-tools.ts has batchSetProperties method', () => {
        expect(componentToolsSrc).toContain('private async batchSetProperties');
    });

    it('component-tools.ts execute routes batch_set_properties', () => {
        expect(componentToolsSrc).toMatch(/case\s+'batch_set_properties'/);
    });

    it('ui-tools.ts imports ComponentTools for delegation', () => {
        expect(uiToolsSrc).toContain("from './component-tools'");
    });

    it('ui-tools.ts constructs ComponentTools as instance field', () => {
        expect(uiToolsSrc).toMatch(/componentTools\s*=\s*new ComponentTools\(\)/);
    });

    it('ui-tools.ts defines LABEL_TYPES / LAYOUT_TYPES / SPRITE_TYPES maps', () => {
        expect(uiToolsSrc).toContain('LABEL_TYPES');
        expect(uiToolsSrc).toContain('LAYOUT_TYPES');
        expect(uiToolsSrc).toContain('SPRITE_TYPES');
    });

    it('mcp-server.ts imports UITools', () => {
        expect(mcpServerSrc).toMatch(/import\s*{\s*UITools\s*}\s*from\s*['"]\.\/tools\/ui-tools['"]/);
    });

    it('mcp-server.ts registers ui category in initializeTools', () => {
        expect(mcpServerSrc).toMatch(/this\.tools\.ui\s*=\s*new UITools\(\)/);
    });

    it('mcp-server.ts CATEGORY_SCOPES sets ui to core', () => {
        expect(mcpServerSrc).toMatch(/ui\s*:\s*'core'/);
    });
});
