/**
 * Phase 0C — assetAdvanced_batch_configure tool
 *
 * Coverage:
 * - Tool schema registration (name + required fields + enums)
 * - execute() routing
 * - Parameter validation short-circuits (paths that don't touch Editor)
 * - Source structure: uses createErrorResponse + ERROR_CODES
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { AssetAdvancedTools } from '../source/tools/asset-advanced-tools';
import { ERROR_CODES } from '../source/utils/error-response';

const SOURCE_DIR = path.join(__dirname, '..', 'source');
const assetToolsSrc = fs.readFileSync(path.join(SOURCE_DIR, 'tools', 'asset-advanced-tools.ts'), 'utf-8');

describe('Phase 0C: batch_configure tool schema', () => {
    const tools = new AssetAdvancedTools().getTools();
    const batchConfig = tools.find(t => t.name === 'batch_configure');

    it('is registered in getTools()', () => {
        expect(batchConfig).toBeDefined();
    });

    it('has description mentioning meta / ERR-018 / token reduction', () => {
        expect(batchConfig!.description.toLowerCase()).toContain('meta');
    });

    it('requires urls and config', () => {
        expect(batchConfig!.inputSchema.required).toEqual(['urls', 'config']);
    });

    it('urls is an array of strings', () => {
        const s = batchConfig!.inputSchema.properties.urls;
        expect(s.type).toBe('array');
        expect(s.items.type).toBe('string');
    });

    it('config.type enum covers sprite-frame + texture', () => {
        const t = batchConfig!.inputSchema.properties.config.properties.type;
        expect(t.enum).toEqual(['sprite-frame', 'texture']);
    });

    it('config.wrapModeS enum covers the 3 Cocos wrap modes', () => {
        const w = batchConfig!.inputSchema.properties.config.properties.wrapModeS;
        expect(w.enum).toEqual(['repeat', 'clamp-to-edge', 'mirrored-repeat']);
    });

    it('config.wrapModeT has the same enum as wrapModeS', () => {
        const s = batchConfig!.inputSchema.properties.config.properties.wrapModeS;
        const t = batchConfig!.inputSchema.properties.config.properties.wrapModeT;
        expect(t.enum).toEqual(s.enum);
    });
});

describe('Phase 0C: batch_configure parameter validation', () => {
    const tools = new AssetAdvancedTools();

    it('rejects missing urls with INVALID_PARAMS', async () => {
        const r = await tools.execute('batch_configure', { config: { type: 'sprite-frame' } });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });

    it('rejects empty urls array with INVALID_PARAMS', async () => {
        const r = await tools.execute('batch_configure', { urls: [], config: { type: 'sprite-frame' } });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });

    it('rejects non-array urls with INVALID_PARAMS', async () => {
        const r = await tools.execute('batch_configure', { urls: 'not-an-array', config: { type: 'sprite-frame' } });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });

    it('rejects missing config with INVALID_PARAMS', async () => {
        const r = await tools.execute('batch_configure', { urls: ['db://a.png'] });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });

    it('rejects empty config object with INVALID_PARAMS', async () => {
        const r = await tools.execute('batch_configure', { urls: ['db://a.png'], config: {} });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });

    it('validation error preserves backward-compat error field (Phase 0B contract)', async () => {
        const r = await tools.execute('batch_configure', { urls: [], config: {} });
        expect(r.success).toBe(false);
        expect(typeof r.error).toBe('string');
        expect(r.error!.length).toBeGreaterThan(0);
    });

    it('validation error includes a helpful suggestion in details', async () => {
        const r = await tools.execute('batch_configure', { urls: [], config: { type: 'sprite-frame' } });
        expect(r.details).toBeDefined();
        expect(r.details!.suggestion).toBeDefined();
    });
});

describe('Phase 0C: source structure', () => {
    it('asset-advanced-tools.ts imports createErrorResponse and ERROR_CODES', () => {
        expect(assetToolsSrc).toContain("from '../utils/error-response'");
        expect(assetToolsSrc).toMatch(/import\s*{[^}]*createErrorResponse[^}]*ERROR_CODES[^}]*}/);
    });

    it('execute() routes batch_configure to batchConfigureAssets', () => {
        expect(assetToolsSrc).toMatch(/case\s+'batch_configure'\s*:\s*\n?\s+return\s+await\s+this\.batchConfigureAssets/);
    });

    it('batchConfigureAssets uses Editor.Message for query-asset-meta and save-asset-meta', () => {
        const start = assetToolsSrc.indexOf('private async batchConfigureAssets');
        const end = assetToolsSrc.indexOf('\n    private ', start + 30);
        const block = assetToolsSrc.slice(start, end > start ? end : assetToolsSrc.length);
        expect(block).toContain("'query-asset-meta'");
        expect(block).toContain("'save-asset-meta'");
    });

    it('batchConfigureAssets iterates subMetas only for entries with wrapModeS/T', () => {
        const start = assetToolsSrc.indexOf('private async batchConfigureAssets');
        const block = assetToolsSrc.slice(start, start + 3000);
        expect(block).toContain("'wrapModeS' in sub.userData");
        expect(block).toContain("'wrapModeT' in sub.userData");
    });

    it('batchConfigureAssets uses for...of (serial) not Promise.all', () => {
        const start = assetToolsSrc.indexOf('private async batchConfigureAssets');
        const block = assetToolsSrc.slice(start, start + 3000);
        expect(block).toMatch(/for\s*\(\s*const\s+url\s+of\s+urls\s*\)/);
        expect(block).not.toContain('Promise.all');
    });

    it('batchConfigureAssets returns failed[] on per-URL errors (does not abort the batch)', () => {
        const start = assetToolsSrc.indexOf('private async batchConfigureAssets');
        const block = assetToolsSrc.slice(start, start + 3000);
        expect(block).toContain('failed.push');
    });
});
