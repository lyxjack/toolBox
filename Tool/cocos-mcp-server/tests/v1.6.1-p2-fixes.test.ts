/**
 * v1.6.1 P2 polish — unit tests for the 6 ergonomics fixes
 *
 * P2-1 reset_node_property JS 异常未归一 errorCode
 * P2-2 node_lifecycle({duplicate}) 不返新 UUID
 * P2-3 server_get_server_status 端口字段错误
 * P2-4 debug_logs({console}) 初始空数组
 * P2-5 scene_management 错误响应缺 suggestion
 * P2-6 6 个合并工具 description 加并发警示
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SceneAdvancedTools } from '../source/tools/scene-advanced-tools';
import { NodeTools } from '../source/tools/node-tools';
import { DebugTools } from '../source/tools/debug-tools';
import { SceneTools } from '../source/tools/scene-tools';
import { AssetAdvancedTools } from '../source/tools/asset-advanced-tools';
import { ComponentTools } from '../source/tools/component-tools';
import { ServerTools } from '../source/tools/server-tools';
import { ERROR_CODES } from '../source/utils/error-response';

const ROOT = path.join(__dirname, '..');

describe('P2-1 — resetNodeProperty 结构化错误', () => {
    const inst = new SceneAdvancedTools();

    it('空 path 返 INVALID_PARAMS + suggestion', async () => {
        const r = await inst.execute('reset', { action: 'property', uuid: 'mock-uuid-01234567', path: '' });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
        expect(r.details?.suggestion).toBeDefined();
    });

    it('空 uuid 返 INVALID_PARAMS', async () => {
        const r = await inst.execute('reset', { action: 'property', uuid: '', path: 'position' });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });

    it('源码含 EDITOR_API_ERROR 包裹的 catch 路径', () => {
        const src = fs.readFileSync(path.join(ROOT, 'source', 'tools', 'scene-advanced-tools.ts'), 'utf-8');
        const start = src.indexOf('private async resetNodeProperty');
        const block = src.slice(start, start + 2000);
        expect(block).toContain('ERROR_CODES.EDITOR_API_ERROR');
        expect(block).toMatch(/Cocos scene\.reset-property/);
    });
});

describe('P2-2 — node_lifecycle duplicate warning 机制', () => {
    it('源码当 result.uuid falsy 时追加 warning 字段', () => {
        const src = fs.readFileSync(path.join(ROOT, 'source', 'tools', 'node-tools.ts'), 'utf-8');
        const start = src.indexOf('private async duplicateNode');
        const block = src.slice(start, start + 1500);
        expect(block).toContain('Cocos duplicate-node did not return a UUID');
        expect(block).toContain('response.warning');
    });

    it('源码把未知异常包成 EDITOR_API_ERROR', () => {
        const src = fs.readFileSync(path.join(ROOT, 'source', 'tools', 'node-tools.ts'), 'utf-8');
        const start = src.indexOf('private async duplicateNode');
        const block = src.slice(start, start + 1500);
        expect(block).toContain('ERROR_CODES.EDITOR_API_ERROR');
    });
});

describe('P2-3 — ServerTools 正确上报 mcpServerPort', () => {
    it('构造函数接受 mcpPort', () => {
        const srv = new ServerTools(3001);
        expect((srv as any).mcpPort).toBe(3001);
    });

    it('setter 路径可更新 port', () => {
        const srv = new ServerTools(3001);
        (srv as any).setMcpPort(3002);
        expect((srv as any).mcpPort).toBe(3002);
    });

    it('不传端口时 fallback 3000(向后兼容)', () => {
        const srv = new ServerTools();
        expect((srv as any).mcpPort).toBe(3000);
    });

    it('源码 status.mcpServerPort = this.mcpPort,不再硬编码 3000', () => {
        const src = fs.readFileSync(path.join(ROOT, 'source', 'tools', 'server-tools.ts'), 'utf-8');
        expect(src).toMatch(/status\.mcpServerPort\s*=\s*this\.mcpPort/);
        expect(src).not.toMatch(/status\.mcpServerPort\s*=\s*3000;/);
    });

    it('mcp-server.ts 传入 settings.port 给 ServerTools', () => {
        const src = fs.readFileSync(path.join(ROOT, 'source', 'mcp-server.ts'), 'utf-8');
        expect(src).toMatch(/new ServerTools\(this\.settings\.port\)/);
    });
});

describe('P2-4 — debug_logs console empty-buffer warning', () => {
    const inst = new DebugTools();

    it('空 buffer 时 response.warning 指路 project/search', async () => {
        const r = await inst.execute('logs', { action: 'console', limit: 10 });
        expect(r.success).toBe(true);
        expect(r.data.logs).toEqual([]);
        expect(r.warning).toBeDefined();
        expect(r.warning).toMatch(/project|search/);
    });

    it('非空 buffer 时不返 warning', async () => {
        const inst2 = new DebugTools();
        (inst2 as any).consoleMessages.push({ timestamp: new Date().toISOString(), type: 'log', message: 'seed' });
        const r = await inst2.execute('logs', { action: 'console', limit: 5 });
        expect(r.success).toBe(true);
        expect(r.data.returned).toBe(1);
        expect(r.warning).toBeUndefined();
    });
});

describe('P2-5 — scene_management 错误响应 shape 对齐其他 5 组', () => {
    const inst = new SceneTools();

    it('bogus action 返 INVALID_PARAMS + details.suggestion', async () => {
        const r = await inst.execute('management', { action: 'bogus' });
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
        expect(r.details?.suggestion).toBeDefined();
        expect(r.details!.suggestion).toMatch(/open.*save.*close.*create.*save_as/);
    });
});

describe('P2-6 — 6 组合并工具 description 明示并发风险', () => {
    const mutatingTools = [
        { inst: new AssetAdvancedTools(), name: 'batch' },
        { inst: new SceneTools(), name: 'management' },
        { inst: new NodeTools(), name: 'lifecycle' },
        { inst: new SceneAdvancedTools(), name: 'reset' }
    ];
    const readOnlyTools = [
        { inst: new ComponentTools(), name: 'query' },
        { inst: new DebugTools(), name: 'logs' }
    ];

    for (const { inst, name } of mutatingTools) {
        it(`mutating tool \`${name}\` description 含并发警示`, () => {
            const t = inst.getTools().find(x => x.name === name)!;
            expect(t).toBeDefined();
            expect(t.description).toMatch(/parallel|concurrent|serializ|并发/i);
        });
    }

    for (const { inst, name } of readOnlyTools) {
        it(`read-only tool \`${name}\` description 明示安全并发`, () => {
            const t = inst.getTools().find(x => x.name === name)!;
            expect(t).toBeDefined();
            expect(t.description).toMatch(/Safe for parallel|read-only/i);
        });
    }
});

describe('P2 meta — package 版本 bump', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));

    it('package.json version = 1.6.1', () => {
        expect(pkg.version).toBe('1.6.1');
    });
});
