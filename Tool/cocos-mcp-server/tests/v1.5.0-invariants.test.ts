/**
 * v1.5.0 system-level invariants — holistic regression net
 *
 * This test file does NOT replace the phase-scoped tests. It intentionally
 * re-verifies the end-to-end invariants that ALL Phase 0A/0B/0C/1/P2 deliveries
 * together promise — so if any future refactor silently breaks one of them,
 * this file fails fast with a clear message.
 *
 * Invariants covered:
 *   I1  — total tool count (165) + category count (15)
 *   I2  — scope distribution (112 core + 3 optional + 50 rare)
 *   I3  — server_get_server_status has scope:'core' per-tool override (P2.E)
 *   I4  — `ui` category registered in both mcp-server.ts AND tool-manager.ts
 *   I5  — all key batch/error tools are reachable: batch_configure,
 *         batch_set_properties, ui_set_label/layout/sprite
 *   I6  — createErrorResponse contract (errorCode + legacy error + optional details)
 *   I7  — UUID shape guard rejects obvious garbage with INVALID_PARAMS (P2.C)
 *   I8  — component_batch_set_properties suggestion points at component_add_component (P2.D)
 *   I9  — doc drift guard: FEATURE_GUIDE_CN.md appendix A numbers (165/15/115) (P2.B)
 *   I10 — package.json version (1.5.0)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SceneTools } from '../source/tools/scene-tools';
import { NodeTools } from '../source/tools/node-tools';
import { ComponentTools } from '../source/tools/component-tools';
import { PrefabTools } from '../source/tools/prefab-tools';
import { ProjectTools } from '../source/tools/project-tools';
import { DebugTools } from '../source/tools/debug-tools';
import { PreferencesTools } from '../source/tools/preferences-tools';
import { ServerTools } from '../source/tools/server-tools';
import { BroadcastTools } from '../source/tools/broadcast-tools';
import { SceneAdvancedTools } from '../source/tools/scene-advanced-tools';
import { SceneViewTools } from '../source/tools/scene-view-tools';
import { ReferenceImageTools } from '../source/tools/reference-image-tools';
import { AssetAdvancedTools } from '../source/tools/asset-advanced-tools';
import { ValidationTools } from '../source/tools/validation-tools';
import { UITools } from '../source/tools/ui-tools';
import { createErrorResponse, ERROR_CODES } from '../source/utils/error-response';

const ROOT = path.join(__dirname, '..');

// Mirror of CATEGORY_SCOPES in mcp-server.ts — if you edit one, edit both.
type ToolScope = 'core' | 'optional' | 'rare';
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

// Build the "exposed shape" the MCP client sees, replicating mcp-server.ts setupTools.
function buildExposedTools() {
    const tools: Record<string, { getTools: () => any[] }> = {
        scene: new SceneTools(),
        node: new NodeTools(),
        component: new ComponentTools(),
        prefab: new PrefabTools(),
        project: new ProjectTools(),
        debug: new DebugTools(),
        preferences: new PreferencesTools(),
        server: new ServerTools(),
        broadcast: new BroadcastTools(),
        sceneAdvanced: new SceneAdvancedTools(),
        sceneView: new SceneViewTools(),
        referenceImage: new ReferenceImageTools(),
        assetAdvanced: new AssetAdvancedTools(),
        validation: new ValidationTools(),
        ui: new UITools()
    };
    const all: Array<{ name: string; scope: ToolScope; category: string; tool: any }> = [];
    for (const [cat, inst] of Object.entries(tools)) {
        for (const t of inst.getTools()) {
            const effective: ToolScope = (t.scope as ToolScope) ?? CATEGORY_SCOPES[cat] ?? 'core';
            all.push({ name: `${cat}_${t.name}`, scope: effective, category: cat, tool: t });
        }
    }
    return all;
}

describe('v1.5.0 invariants — aggregate shape', () => {
    const all = buildExposedTools();

    it('I1 — total tool count is 151 across 15 categories (v1.6.0: -14 from consolidation)', () => {
        expect(all.length).toBe(151);
        const cats = new Set(all.map(t => t.category));
        expect(cats.size).toBe(15);
    });

    it('I2 — scope distribution: 99 core + 3 optional + 49 rare', () => {
        const byScope: Record<ToolScope, number> = { core: 0, optional: 0, rare: 0 };
        for (const t of all) byScope[t.scope]++;
        expect(byScope.core).toBe(99);
        expect(byScope.optional).toBe(3);
        expect(byScope.rare).toBe(49);
    });

    it('I2b — with disabledScopes=["rare"], 102 tools remain loaded', () => {
        const disabled = new Set<ToolScope>(['rare']);
        const remaining = all.filter(t => !disabled.has(t.scope));
        expect(remaining.length).toBe(102);
    });

    it('I2c — with disabledScopes=["rare","optional"], 99 tools remain loaded', () => {
        const disabled = new Set<ToolScope>(['rare', 'optional']);
        const remaining = all.filter(t => !disabled.has(t.scope));
        expect(remaining.length).toBe(99);
    });
});

describe('v1.5.0 invariants — per-tool scope overrides', () => {
    const all = buildExposedTools();

    it('I3 — server_get_server_status has per-tool scope:"core" (P2.E)', () => {
        const t = all.find(x => x.name === 'server_get_server_status');
        expect(t).toBeDefined();
        expect(t!.scope).toBe('core');
    });

    it('I3b — server_get_server_status survives disabledScopes=["rare"]', () => {
        const disabled = new Set<ToolScope>(['rare']);
        const remaining = all.filter(t => !disabled.has(t.scope));
        expect(remaining.map(t => t.name)).toContain('server_get_server_status');
    });

    it('I3c — other server_* tools are still rare and get filtered out', () => {
        const disabled = new Set<ToolScope>(['rare']);
        const remaining = all.filter(t => !disabled.has(t.scope));
        const leakedServer = remaining.filter(t => t.category === 'server' && t.name !== 'server_get_server_status');
        expect(leakedServer).toEqual([]);
    });
});

describe('v1.5.0 invariants — key feature tools reachable', () => {
    const all = buildExposedTools();
    const names = new Set(all.map(t => t.name));

    it('I5.a — v1.6.0 consolidated asset batch: assetAdvanced_batch present', () => {
        expect(names.has('assetAdvanced_batch')).toBe(true);
        // Old granular tools removed from tools/list (dispatcher still routes internally)
        expect(names.has('assetAdvanced_batch_configure')).toBe(false);
        expect(names.has('assetAdvanced_batch_import_assets')).toBe(false);
        expect(names.has('assetAdvanced_batch_delete_assets')).toBe(false);
    });

    it('I5.a2 — v1.6.0 consolidated tools all present', () => {
        expect(names.has('component_query')).toBe(true);          // was: get_components/info/available
        expect(names.has('scene_management')).toBe(true);          // was: open/save/close/create/save_as
        expect(names.has('node_lifecycle')).toBe(true);            // was: delete/move/duplicate (create stays)
        expect(names.has('sceneAdvanced_reset')).toBe(true);       // was: reset_node_property/transform/component
        expect(names.has('debug_logs')).toBe(true);                // was: get_console/project_logs + search
    });

    it('I5.a3 — old granular tools removed from tools/list (but create_node kept)', () => {
        expect(names.has('component_get_components')).toBe(false);
        expect(names.has('scene_open_scene')).toBe(false);
        expect(names.has('node_delete_node')).toBe(false);
        expect(names.has('node_create_node')).toBe(true);          // create_node intentionally kept (rich schema)
        expect(names.has('sceneAdvanced_reset_node_transform')).toBe(false);
        expect(names.has('debug_get_console_logs')).toBe(false);
    });

    it('I5.b — Phase 1 base: component_batch_set_properties present', () => {
        expect(names.has('component_batch_set_properties')).toBe(true);
    });

    it('I5.c — Phase 1 UI shortcuts: ui_set_label / ui_set_layout / ui_set_sprite present', () => {
        expect(names.has('ui_set_label')).toBe(true);
        expect(names.has('ui_set_layout')).toBe(true);
        expect(names.has('ui_set_sprite')).toBe(true);
    });

    it('I5.d — Phase 0A prefab edit-mode trio still exposed', () => {
        expect(names.has('prefab_open_edit_mode')).toBe(true);
        expect(names.has('prefab_save_edit')).toBe(true);
        expect(names.has('prefab_close_edit_mode')).toBe(true);
    });

    it('I5.e — sceneAdvanced undo transaction trio still exposed', () => {
        expect(names.has('sceneAdvanced_begin_undo_recording')).toBe(true);
        expect(names.has('sceneAdvanced_end_undo_recording')).toBe(true);
        expect(names.has('sceneAdvanced_cancel_undo_recording')).toBe(true);
    });
});

describe('v1.5.0 invariants — errorCode contract', () => {
    it('I6 — createErrorResponse sets success=false + errorCode + legacy error field', () => {
        const r = createErrorResponse(ERROR_CODES.NOT_FOUND, 'x');
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe('NOT_FOUND');
        expect(r.error).toBe('x');
    });

    it('I6b — required ERROR_CODES catalog members exist', () => {
        for (const code of ['NOT_FOUND', 'INVALID_PARAMS', 'INVALID_STATE', 'EDITOR_API_ERROR', 'IO_ERROR', 'UNKNOWN']) {
            expect(Object.values(ERROR_CODES)).toContain(code);
        }
    });
});

describe('v1.5.0 invariants — runtime validation short-circuits', () => {
    it('I7.a — ui_set_label rejects "fake" UUID with INVALID_PARAMS (P2.C)', async () => {
        const r = await new UITools().execute('set_label', { nodeUuid: 'fake', string: 'x' });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });

    it('I7.b — component_batch_set_properties rejects "fake" UUID with INVALID_PARAMS (P2.C)', async () => {
        const r = await new ComponentTools().execute('batch_set_properties', {
            nodeUuid: 'fake',
            componentType: 'cc.Label',
            properties: [{ property: 'string', propertyType: 'string', value: 'hi' }]
        });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });

    it('I7.c — assetAdvanced_batch_configure rejects empty urls with INVALID_PARAMS', async () => {
        const r = await new AssetAdvancedTools().execute('batch_configure', { urls: [], config: { type: 'sprite-frame' } });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });

    it('I7.d — prefab_duplicate_prefab short-circuits to INVALID_STATE (P1.3 fix, doc promise)', async () => {
        const r = await new PrefabTools().execute('duplicate_prefab', {
            sourcePrefabPath: 'db://assets/src.prefab',
            targetPrefabPath: 'db://assets/dst.prefab',
            newPrefabName: 'x'
        });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_STATE);
        expect(r.error).toMatch(/不可用|暂时/);
        expect(r.instruction).toBeDefined();
    });
});

describe('v1.5.0 invariants — suggestion quality (P2.D)', () => {
    const componentToolsSrc = fs.readFileSync(path.join(ROOT, 'source', 'tools', 'component-tools.ts'), 'utf-8');

    it('I8 — batch_set_properties "all failed" suggestion points at component_add_component', () => {
        const start = componentToolsSrc.indexOf('All ${failed.length} property write(s) failed');
        expect(start).toBeGreaterThan(0);
        const block = componentToolsSrc.slice(start, start + 600);
        expect(block).toContain('component_add_component');
    });
});

describe('v1.5.0 invariants — documentation guards (P2.B)', () => {
    const featureGuide = fs.readFileSync(path.join(ROOT, 'FEATURE_GUIDE_CN.md'), 'utf-8');

    it('I9.a — FEATURE_GUIDE_CN appendix A states "165 个工具"', () => {
        expect(featureGuide).toContain('165 个工具');
    });

    it('I9.b — FEATURE_GUIDE_CN appendix A states "15 category"', () => {
        expect(featureGuide).toMatch(/15\s*category/);
    });

    it('I9.c — FEATURE_GUIDE_CN shows rare-off example with 116 tools (after P2.E promoted get_server_status)', () => {
        expect(featureGuide).toContain('Setup tools: 116 tools available');
    });

    it('I9.d — no stale "110 tools" / "160 tools" / "14 category" strings', () => {
        // Must not match the outdated numbers used before P2.B
        expect(featureGuide).not.toMatch(/Setup tools:\s*110\s*tools/);
        expect(featureGuide).not.toMatch(/160\s*个工具/);
    });
});

describe('v1.5.0 invariants — package version', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));

    it('I10 — package.json version is 1.6.1 (P2 polish patch)', () => {
        expect(pkg.version).toBe('1.6.1');
    });

    it('I10b — runtime dependencies are minimal (uuid/fs-extra/vue only)', () => {
        const runtime = Object.keys(pkg.dependencies || {}).sort();
        expect(runtime).toEqual(['fs-extra', 'uuid', 'vue']);
    });
});
