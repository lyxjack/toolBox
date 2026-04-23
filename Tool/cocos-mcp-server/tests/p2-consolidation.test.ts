/**
 * P2 (v1.6.0) — action-code consolidation unit tests
 *
 * 6 new consolidated tools:
 *   - assetAdvanced_batch({action: configure/import/delete})
 *   - component_query({action: list/info/available})
 *   - scene_management({action: open/save/close/create/save_as})
 *   - node_lifecycle({action: delete/move/duplicate})
 *   - sceneAdvanced_reset({action: property/transform/component})
 *   - debug_logs({action: console/project/search})
 *
 * Coverage:
 *   - New tool present in getTools() + old tool names absent
 *   - Action enum shape
 *   - Dispatcher validation short-circuit (invalid action → INVALID_PARAMS)
 *   - Internal-compat: old toolName still reaches the same handler via execute()
 */
import { describe, it, expect } from 'vitest';
import { AssetAdvancedTools } from '../source/tools/asset-advanced-tools';
import { ComponentTools } from '../source/tools/component-tools';
import { SceneTools } from '../source/tools/scene-tools';
import { NodeTools } from '../source/tools/node-tools';
import { SceneAdvancedTools } from '../source/tools/scene-advanced-tools';
import { DebugTools } from '../source/tools/debug-tools';
import { ERROR_CODES } from '../source/utils/error-response';

function names(tools: any) { return tools.getTools().map((t: any) => t.name); }

describe('P2 — assetAdvanced_batch({action})', () => {
    const inst = new AssetAdvancedTools();

    it('new `batch` tool present; old 3 gone from tools/list', () => {
        const n = names(inst);
        expect(n).toContain('batch');
        expect(n).not.toContain('batch_configure');
        expect(n).not.toContain('batch_import_assets');
        expect(n).not.toContain('batch_delete_assets');
    });

    it('action enum is [configure, import, delete]', () => {
        const t = inst.getTools().find(t => t.name === 'batch')!;
        expect(t.inputSchema.properties.action.enum).toEqual(['configure', 'import', 'delete']);
    });

    it('invalid action → INVALID_PARAMS', async () => {
        const r = await inst.execute('batch', { action: 'bogus', urls: [], config: {} });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });

    it('action=configure with empty urls still returns INVALID_PARAMS (validation path)', async () => {
        const r = await inst.execute('batch', { action: 'configure', urls: [], config: { type: 'sprite-frame' } });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });

    it('internal-compat: old toolName batch_configure still routes', async () => {
        const r = await inst.execute('batch_configure', { urls: [], config: { type: 'sprite-frame' } });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });
});

describe('P2 — component_query({action})', () => {
    const inst = new ComponentTools();

    it('new `query` tool present; old 3 gone', () => {
        const n = names(inst);
        expect(n).toContain('query');
        expect(n).not.toContain('get_components');
        expect(n).not.toContain('get_component_info');
        expect(n).not.toContain('get_available_components');
    });

    it('action enum is [list, info, available]', () => {
        const t = inst.getTools().find(t => t.name === 'query')!;
        expect(t.inputSchema.properties.action.enum).toEqual(['list', 'info', 'available']);
    });

    it('invalid action → INVALID_PARAMS', async () => {
        const r = await inst.execute('query', { action: 'bogus' });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });
});

describe('P2 — scene_management({action})', () => {
    const inst = new SceneTools();

    it('new `management` tool present; old 5 gone', () => {
        const n = names(inst);
        expect(n).toContain('management');
        for (const old of ['open_scene', 'save_scene', 'close_scene', 'create_scene', 'save_scene_as']) {
            expect(n).not.toContain(old);
        }
    });

    it('action enum is [open, save, close, create, save_as]', () => {
        const t = inst.getTools().find(t => t.name === 'management')!;
        expect(t.inputSchema.properties.action.enum).toEqual(['open', 'save', 'close', 'create', 'save_as']);
    });

    it('invalid action → INVALID_PARAMS', async () => {
        const r = await inst.execute('management', { action: 'bogus' });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe('INVALID_PARAMS');
    });
});

describe('P2 — node_lifecycle({action})', () => {
    const inst = new NodeTools();

    it('new `lifecycle` tool present; old 3 gone; create_node kept', () => {
        const n = names(inst);
        expect(n).toContain('lifecycle');
        expect(n).not.toContain('delete_node');
        expect(n).not.toContain('move_node');
        expect(n).not.toContain('duplicate_node');
        // create_node intentionally kept (rich schema, not mergeable)
        expect(n).toContain('create_node');
    });

    it('action enum is [delete, move, duplicate] (create excluded)', () => {
        const t = inst.getTools().find(t => t.name === 'lifecycle')!;
        expect(t.inputSchema.properties.action.enum).toEqual(['delete', 'move', 'duplicate']);
    });

    it('invalid action → INVALID_PARAMS', async () => {
        const r = await inst.execute('lifecycle', { action: 'create' }); // "create" intentionally not supported
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe('INVALID_PARAMS');
    });
});

describe('P2 — sceneAdvanced_reset({action})', () => {
    const inst = new SceneAdvancedTools();

    it('new `reset` tool present; old 3 gone', () => {
        const n = names(inst);
        expect(n).toContain('reset');
        expect(n).not.toContain('reset_node_property');
        expect(n).not.toContain('reset_node_transform');
        expect(n).not.toContain('reset_component');
    });

    it('action enum is [property, transform, component]', () => {
        const t = inst.getTools().find(t => t.name === 'reset')!;
        expect(t.inputSchema.properties.action.enum).toEqual(['property', 'transform', 'component']);
    });

    it('invalid action → INVALID_PARAMS', async () => {
        const r = await inst.execute('reset', { action: 'bogus', uuid: 'mock-uuid-12345' });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe('INVALID_PARAMS');
    });
});

describe('P2 — debug_logs({action})', () => {
    const inst = new DebugTools();

    it('new `logs` tool present; old 3 gone', () => {
        const n = names(inst);
        expect(n).toContain('logs');
        expect(n).not.toContain('get_console_logs');
        expect(n).not.toContain('get_project_logs');
        expect(n).not.toContain('search_project_logs');
    });

    it('action enum is [console, project, search]', () => {
        const t = inst.getTools().find(t => t.name === 'logs')!;
        expect(t.inputSchema.properties.action.enum).toEqual(['console', 'project', 'search']);
    });

    it('invalid action → INVALID_PARAMS', async () => {
        const r = await inst.execute('logs', { action: 'bogus' });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe('INVALID_PARAMS');
    });

    it('internal-compat: old toolName get_console_logs still routes', async () => {
        const r = await inst.execute('get_console_logs', { limit: 5, filter: 'all' });
        expect(r.success).toBe(true); // Empty console returns { total: 0, returned: 0, logs: [] }
    });
});

describe('P2 — overall tool count', () => {
    // Sanity that we hit our -14 target
    it('tools exposed across all categories = 151 (was 165, -14)', () => {
        const allInsts = [
            new AssetAdvancedTools(),
            new ComponentTools(),
            new SceneTools(),
            new NodeTools(),
            new SceneAdvancedTools(),
            new DebugTools()
        ];
        // Not full 15 categories, but these 6 are the ones touched by P2.
        // Precise 151 asserted by v1.5.0-invariants I1.
        const touched = allInsts.reduce((n, i) => n + i.getTools().length, 0);
        // Post-P2: asset=10, comp=6, scene=4, node=9, sceneAdv=21, debug=8 = 58
        // (sceneAdv reduced from 23 to 21: -3 old reset tools +1 new reset tool = -2 net,
        //  plus file also previously had the move_array_element which stays)
        expect(touched).toBe(58);
    });
});
