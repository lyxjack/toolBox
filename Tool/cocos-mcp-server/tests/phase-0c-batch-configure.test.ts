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

describe('Phase 0C: batch tool schema (v1.6.0 consolidated: batch_configure → batch({action:"configure"}))', () => {
    const tools = new AssetAdvancedTools().getTools();
    const batch = tools.find(t => t.name === 'batch');

    it('new consolidated `batch` tool is registered in getTools()', () => {
        expect(batch).toBeDefined();
    });

    it('old `batch_configure` tool name is no longer exposed in tools/list', () => {
        expect(tools.find(t => t.name === 'batch_configure')).toBeUndefined();
        expect(tools.find(t => t.name === 'batch_import_assets')).toBeUndefined();
        expect(tools.find(t => t.name === 'batch_delete_assets')).toBeUndefined();
    });

    it('batch tool requires action enum', () => {
        expect(batch!.inputSchema.required).toEqual(['action']);
    });

    it('action enum covers configure / import / delete', () => {
        const a = batch!.inputSchema.properties.action;
        expect(a.enum).toEqual(['configure', 'import', 'delete']);
    });

    it('urls param (for configure/delete) is an array of strings', () => {
        const s = batch!.inputSchema.properties.urls;
        expect(s.type).toBe('array');
        expect(s.items.type).toBe('string');
    });

    it('config.type enum covers sprite-frame + texture', () => {
        const t = batch!.inputSchema.properties.config.properties.type;
        expect(t.enum).toEqual(['sprite-frame', 'texture']);
    });

    it('config.wrapModeS enum covers the 3 Cocos wrap modes', () => {
        const w = batch!.inputSchema.properties.config.properties.wrapModeS;
        expect(w.enum).toEqual(['repeat', 'clamp-to-edge', 'mirrored-repeat']);
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
