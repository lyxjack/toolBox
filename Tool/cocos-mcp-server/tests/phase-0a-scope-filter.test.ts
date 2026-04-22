/**
 * Phase 0A — scope metadata + disabledScopes filter
 *
 * Coverage:
 * - ToolScope type definition
 * - CATEGORY_SCOPES map completeness (15 categories after Phase 1 added 'ui')
 * - scope filter algorithm (logic replicated from mcp-server.ts setupTools)
 * - Per-tool scope override priority
 * - Source structure (CATEGORY_SCOPES / setupTools / DEFAULT_SETTINGS.disabledScopes)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SOURCE_DIR = path.join(__dirname, '..', 'source');
const mcpServerSrc = fs.readFileSync(path.join(SOURCE_DIR, 'mcp-server.ts'), 'utf-8');
const settingsSrc = fs.readFileSync(path.join(SOURCE_DIR, 'settings.ts'), 'utf-8');
const typesSrc = fs.readFileSync(path.join(SOURCE_DIR, 'types', 'index.ts'), 'utf-8');

type ToolScope = 'core' | 'optional' | 'rare';

// Replicated from mcp-server.ts for isolated testing (must mirror the real map)
const CATEGORY_SCOPES: Record<string, ToolScope> = {
    scene: 'core',
    node: 'core',
    component: 'core',
    prefab: 'core',
    project: 'core',
    debug: 'core',
    assetAdvanced: 'core',
    sceneAdvanced: 'core',
    validation: 'optional',
    preferences: 'rare',
    server: 'rare',
    broadcast: 'rare',
    sceneView: 'rare',
    referenceImage: 'rare',
    ui: 'core'
};

// Replicated from mcp-server.ts setupTools() — the filter predicate
function isScopeDisabled(
    category: string,
    tool: { scope?: ToolScope },
    disabledScopes: Set<ToolScope>
): boolean {
    const effective: ToolScope = tool.scope ?? CATEGORY_SCOPES[category] ?? 'core';
    return disabledScopes.has(effective);
}

describe('Phase 0A: ToolScope type', () => {
    it('types/index.ts defines ToolScope union', () => {
        expect(typesSrc).toMatch(/export type ToolScope\s*=\s*'core'\s*\|\s*'optional'\s*\|\s*'rare'/);
    });

    it('ToolDefinition has optional scope field', () => {
        expect(typesSrc).toMatch(/scope\?:\s*ToolScope/);
    });

    it('MCPServerSettings has optional disabledScopes field', () => {
        expect(typesSrc).toMatch(/disabledScopes\?:\s*ToolScope\[\]/);
    });
});

describe('Phase 0A: CATEGORY_SCOPES map', () => {
    it('contains exactly 15 categories (14 original + ui added in Phase 1)', () => {
        expect(Object.keys(CATEGORY_SCOPES).length).toBe(15);
    });

    it('has 9 core categories (scene/node/component/prefab/project/debug/assetAdvanced/sceneAdvanced/ui)', () => {
        const coreCount = Object.values(CATEGORY_SCOPES).filter(s => s === 'core').length;
        expect(coreCount).toBe(9);
    });

    it('has 1 optional category (validation)', () => {
        expect(CATEGORY_SCOPES.validation).toBe('optional');
        const optCount = Object.values(CATEGORY_SCOPES).filter(s => s === 'optional').length;
        expect(optCount).toBe(1);
    });

    it('has 5 rare categories (preferences/server/broadcast/sceneView/referenceImage)', () => {
        const rareCount = Object.values(CATEGORY_SCOPES).filter(s => s === 'rare').length;
        expect(rareCount).toBe(5);
        expect(CATEGORY_SCOPES.preferences).toBe('rare');
        expect(CATEGORY_SCOPES.server).toBe('rare');
        expect(CATEGORY_SCOPES.broadcast).toBe('rare');
        expect(CATEGORY_SCOPES.sceneView).toBe('rare');
        expect(CATEGORY_SCOPES.referenceImage).toBe('rare');
    });

    it('ui category is core (added in Phase 1)', () => {
        expect(CATEGORY_SCOPES.ui).toBe('core');
    });
});

describe('Phase 0A: scope filter algorithm', () => {
    it('with empty disabledScopes, nothing is filtered', () => {
        const disabled = new Set<ToolScope>();
        expect(isScopeDisabled('preferences', {}, disabled)).toBe(false);
        expect(isScopeDisabled('prefab', {}, disabled)).toBe(false);
    });

    it('with [rare], all rare categories are skipped', () => {
        const disabled = new Set<ToolScope>(['rare']);
        expect(isScopeDisabled('preferences', {}, disabled)).toBe(true);
        expect(isScopeDisabled('server', {}, disabled)).toBe(true);
        expect(isScopeDisabled('broadcast', {}, disabled)).toBe(true);
        expect(isScopeDisabled('sceneView', {}, disabled)).toBe(true);
        expect(isScopeDisabled('referenceImage', {}, disabled)).toBe(true);
    });

    it('with [rare], core categories still load', () => {
        const disabled = new Set<ToolScope>(['rare']);
        expect(isScopeDisabled('scene', {}, disabled)).toBe(false);
        expect(isScopeDisabled('prefab', {}, disabled)).toBe(false);
        expect(isScopeDisabled('ui', {}, disabled)).toBe(false);
    });

    it('with [rare, optional], validation is also filtered', () => {
        const disabled = new Set<ToolScope>(['rare', 'optional']);
        expect(isScopeDisabled('validation', {}, disabled)).toBe(true);
        expect(isScopeDisabled('scene', {}, disabled)).toBe(false);
    });

    it('per-tool scope overrides category default (tool.scope: rare on core category)', () => {
        const disabled = new Set<ToolScope>(['rare']);
        // scene is core, but this tool declares rare → effective = rare → filtered
        expect(isScopeDisabled('scene', { scope: 'rare' }, disabled)).toBe(true);
    });

    it('per-tool scope override keeps tool loaded if its scope not disabled', () => {
        const disabled = new Set<ToolScope>(['rare']);
        // preferences is rare, but this tool declares core → effective = core → not filtered
        expect(isScopeDisabled('preferences', { scope: 'core' }, disabled)).toBe(false);
    });

    it('unknown category defaults to core (safe fallback)', () => {
        const disabled = new Set<ToolScope>(['rare']);
        expect(isScopeDisabled('unknownCat', {}, disabled)).toBe(false);
    });
});

describe('Phase 0A: source file structure', () => {
    it('mcp-server.ts declares CATEGORY_SCOPES constant', () => {
        expect(mcpServerSrc).toMatch(/const CATEGORY_SCOPES\s*:\s*Record<string,\s*ToolScope>/);
    });

    it('mcp-server.ts imports ToolScope from types', () => {
        expect(mcpServerSrc).toMatch(/import\s*{[^}]*ToolScope[^}]*}\s*from\s*['"]\.\/types['"]/);
    });

    it('mcp-server.ts setupTools has scope filter gate', () => {
        expect(mcpServerSrc).toContain('isScopeDisabled');
        expect(mcpServerSrc).toContain('disabledScopes');
    });

    it('mcp-server.ts log line reflects active disabledScopes', () => {
        expect(mcpServerSrc).toContain('disabled scopes:');
    });

    it('settings.ts DEFAULT_SETTINGS.disabledScopes defaults to empty array (backward compat)', () => {
        expect(settingsSrc).toMatch(/disabledScopes\s*:\s*\[\s*\]/);
    });

    it('mcp-server.ts CATEGORY_SCOPES has exactly 15 category keys (by line count inside the block)', () => {
        const blockStart = mcpServerSrc.indexOf('const CATEGORY_SCOPES');
        const blockEnd = mcpServerSrc.indexOf('};', blockStart);
        const block = mcpServerSrc.slice(blockStart, blockEnd);
        // Each entry: `key: 'scope'`
        const entries = block.match(/^\s+\w+\s*:\s*'(core|optional|rare)'/gm);
        expect(entries).not.toBeNull();
        expect(entries!.length).toBe(15);
    });
});
