/**
 * REQ-20260511-234213 — Sprint 1 (v1.6.2) CI 链路集成测试
 *
 * 与 *-sprint1.test.ts 互补：那个文件做源码静态 introspection；
 * 本文件 **mock Editor.Message.request** 后跑真实代码路径，验证：
 *   1. setNodeProperty / setComponentProperty 的 wire-stringified boolean 能被 coerce 后 set
 *   2. UX-1 before/after diff 在 mock 让 cocos "no-op" 时返结构化错误
 *   3. removeComponent fallback chain 在前 N 个 identifier 都 fail 后能用 remove-array-element 兜底
 *   4. attachScript 用 component-count delta 判断成功
 *   5. INVALID_PARAMS 类型校验在边界值上正确触发
 *
 * 跑通这条链等于 CI 可保护 6 个 AC 的核心行为不退化。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentTools } from '../source/tools/component-tools';
import { NodeTools } from '../source/tools/node-tools';
import { ERROR_CODES } from '../source/utils/error-response';

// ============================================================================
// Editor mock — 模拟 Cocos editor 的 scene scenario message bus
// ============================================================================
interface MockNode {
    uuid: string;
    name: { value: string };
    active: { value: boolean };
    layer?: { value: number };
    mobility?: { value: number };
    __comps__: MockComp[];
}

interface MockComp {
    __type__: string;          // cid (or 'cc.Sprite' for built-in)
    value: {
        uuid: string;          // component instance scene uuid
        enabled?: boolean;
        [k: string]: any;
    };
}

interface MockState {
    nodes: Map<string, MockNode>;
    sentMessages: Array<{ method: string; args: any }>;
    // 控制 mock 行为：让某些 set-property / remove-component 调用 silently fail
    silentNoOpProps: Set<string>;       // "uuid:path" → silent (cocos 接受但不改)
    rejectRemoveStrategies: Set<string>; // "uuid:cid:strategy" → reject 该策略（让 fallback 链推进）
}

const state: MockState = {
    nodes: new Map(),
    sentMessages: [],
    silentNoOpProps: new Set(),
    rejectRemoveStrategies: new Set()
};

function resetState() {
    state.nodes.clear();
    state.sentMessages.length = 0;
    state.silentNoOpProps.clear();
    state.rejectRemoveStrategies.clear();
}

function makeNode(uuid: string, init: Partial<{ active: boolean; name: string; layer: number; mobility: number; comps: MockComp[] }> = {}): MockNode {
    const n: MockNode = {
        uuid,
        name: { value: init.name ?? 'TestNode' },
        active: { value: init.active ?? true },
        layer: { value: init.layer ?? 33554432 },
        mobility: { value: init.mobility ?? 0 },
        __comps__: init.comps ?? []
    };
    state.nodes.set(uuid, n);
    return n;
}

function makeComp(type: string, instanceUuid: string, extra: Record<string, any> = {}): MockComp {
    return {
        __type__: type,
        value: {
            uuid: instanceUuid,
            enabled: extra.enabled ?? true,
            ...extra
        }
    };
}

beforeEach(() => {
    resetState();
    (globalThis as any).Editor = {
        Message: {
            request: vi.fn(async (scenario: string, method: string, args: any) => {
                state.sentMessages.push({ method, args });
                if (scenario !== 'scene') {
                    throw new Error(`mock: unsupported scenario '${scenario}'`);
                }
                switch (method) {
                    case 'query-node': {
                        const uuid = typeof args === 'string' ? args : args?.uuid;
                        const n = state.nodes.get(uuid);
                        if (!n) throw new Error('Node not found');
                        return n;
                    }
                    case 'set-property': {
                        const { uuid, path, dump } = args;
                        const n = state.nodes.get(uuid);
                        if (!n) throw new Error('Node not found');
                        const silentKey = `${uuid}:${path}`;
                        if (state.silentNoOpProps.has(silentKey)) {
                            // 模拟 Cocos 接受调用但不实际改值（silent no-op bug 场景）
                            return;
                        }
                        // path 可能是 'active' / 'name' / `__comps__.N.enabled` 等
                        if (path === 'active') n.active = { value: dump.value };
                        else if (path === 'name') n.name = { value: dump.value };
                        else if (path === 'layer') n.layer = { value: dump.value };
                        else if (path === 'mobility') n.mobility = { value: dump.value };
                        else if (path.startsWith('__comps__.')) {
                            const parts = path.split('.');
                            const idx = Number(parts[1]);
                            const field = parts.slice(2).join('.');
                            const comp = n.__comps__[idx];
                            if (comp) {
                                if (field === 'enabled') comp.value.enabled = dump.value;
                                else (comp.value as any)[field] = dump.value;
                            }
                        }
                        return;
                    }
                    case 'remove-component': {
                        const { uuid, component } = args;
                        const n = state.nodes.get(uuid);
                        if (!n) throw new Error('Node not found');
                        // 判断该策略是否被 reject（让 fallback 链能演进）
                        const strategyKey = `${uuid}:${component}`;
                        if (state.rejectRemoveStrategies.has(strategyKey)) {
                            return; // 接受调用但不删（典型自定义脚本场景）
                        }
                        // 默认行为：按 cid / uuid / index / path 匹配并删除
                        let removed = false;
                        if (typeof component === 'number') {
                            if (component >= 0 && component < n.__comps__.length) {
                                n.__comps__.splice(component, 1);
                                removed = true;
                            }
                        } else if (typeof component === 'string') {
                            if (component.startsWith('__comps__.')) {
                                const idx = Number(component.split('.')[1]);
                                if (idx >= 0 && idx < n.__comps__.length) {
                                    n.__comps__.splice(idx, 1);
                                    removed = true;
                                }
                            } else {
                                // cid 或 instance uuid 匹配
                                const idx = n.__comps__.findIndex(c => c.__type__ === component || c.value.uuid === component);
                                if (idx >= 0) {
                                    n.__comps__.splice(idx, 1);
                                    removed = true;
                                }
                            }
                        }
                        if (!removed) {
                            // 不 throw —— Cocos 即使 fail 也常常 silently 接受
                            return;
                        }
                        return;
                    }
                    case 'remove-array-element': {
                        const { uuid, path, index } = args;
                        const n = state.nodes.get(uuid);
                        if (!n) throw new Error('Node not found');
                        if (path === '__comps__' && index >= 0 && index < n.__comps__.length) {
                            n.__comps__.splice(index, 1);
                        }
                        return;
                    }
                    case 'create-component': {
                        const { uuid, component } = args;
                        const n = state.nodes.get(uuid);
                        if (!n) throw new Error('Node not found');
                        // 模拟：给定 scriptName 创建一个 cid hash 不同的 comp
                        const newCid = `cid-${component}-${Math.random().toString(36).slice(2, 10)}`;
                        const newInstance = `inst-${Math.random().toString(36).slice(2, 10)}`;
                        n.__comps__.push(makeComp(newCid, newInstance, { _scriptName: component }));
                        return;
                    }
                    case 'execute-scene-script': {
                        // setNodeProperty 在 set-property catch 路径会 fallback 到这；
                        // mock 直接返失败让上层走 EDITOR_API_ERROR 包裹
                        throw new Error('mock: scene-script not implemented');
                    }
                    default:
                        throw new Error(`mock: unsupported method '${method}'`);
                }
            })
        }
    };
});

afterEach(() => {
    delete (globalThis as any).Editor;
});

// ============================================================================
// Integration: setNodeProperty —— Bug #2 (cc.Node) + 补丁 #11 全链路
// ============================================================================
describe('Integration · setNodeProperty / cc.Node boolean 全链路', () => {
    it('true boolean 直接传入 → set 成功 + changed=true', async () => {
        const node = makeNode('node-1', { active: true });
        const tools = new NodeTools();
        const r = await (tools as any).setNodeProperty('node-1', 'active', false);
        expect(r.success).toBe(true);
        expect(r.data?.actualValue).toBe(false);
        expect(r.data?.changed).toBe(true);
        expect(node.active.value).toBe(false);
        // 验证发出的 set-property 带 type: 'Boolean'
        const setMsg = state.sentMessages.find(m => m.method === 'set-property');
        expect(setMsg?.args.dump).toEqual({ value: false, type: 'Boolean' });
    });

    it('字符串 "false" → coerce 为 boolean false → 真正 set 到 false（补丁 #11）', async () => {
        const node = makeNode('node-2', { active: true });
        const tools = new NodeTools();
        const r = await (tools as any).setNodeProperty('node-2', 'active', 'false');
        expect(r.success).toBe(true);
        expect(node.active.value).toBe(false);
        const setMsg = state.sentMessages.find(m => m.method === 'set-property');
        expect(setMsg?.args.dump.value).toBe(false);  // 已 coerce
    });

    it('字符串 "true" → coerce 为 boolean true', async () => {
        makeNode('node-3', { active: false });
        const tools = new NodeTools();
        const r = await (tools as any).setNodeProperty('node-3', 'active', 'true');
        expect(r.success).toBe(true);
        expect(state.nodes.get('node-3')?.active.value).toBe(true);
    });

    it('非法字符串 "notabool" → INVALID_PARAMS，不发 set-property', async () => {
        makeNode('node-4', { active: true });
        const tools = new NodeTools();
        const r = await (tools as any).setNodeProperty('node-4', 'active', 'notabool');
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
        expect(r.details?.value).toBe('notabool');
        // 重要：错误应该在发 set-property 之前拦截
        expect(state.sentMessages.find(m => m.method === 'set-property')).toBeUndefined();
    });

    it('非 boolean / 非 string 给 Boolean 字段 → INVALID_PARAMS', async () => {
        makeNode('node-5', { active: true });
        const tools = new NodeTools();
        const r = await (tools as any).setNodeProperty('node-5', 'active', 42);
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });

    it('name 字段（String 类型）走 String type wrap', async () => {
        makeNode('node-6', { name: 'Old' });
        const tools = new NodeTools();
        const r = await (tools as any).setNodeProperty('node-6', 'name', 'New');
        expect(r.success).toBe(true);
        const setMsg = state.sentMessages.find(m => m.method === 'set-property');
        expect(setMsg?.args.dump).toEqual({ value: 'New', type: 'String' });
    });

    it('UX-1: silent no-op 触发 EDITOR_API_ERROR + intended/before/actual 三元组', async () => {
        makeNode('node-7', { active: true });
        state.silentNoOpProps.add('node-7:active'); // 让 mock 假装 cocos 接受但不改
        const tools = new NodeTools();
        const r = await (tools as any).setNodeProperty('node-7', 'active', false);
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.EDITOR_API_ERROR);
        expect(r.details?.intended).toBe(false);
        expect(r.details?.before).toBe(true);
        expect(r.details?.actual).toBe(true);
        expect(r.error).toMatch(/silently no-op/);
    });

    it('未注册字段（如 customField）走原始 dump 不带 type，旧行为兼容', async () => {
        const n = makeNode('node-8', {});
        (n as any).customField = { value: 'foo' };
        const tools = new NodeTools();
        const r = await (tools as any).setNodeProperty('node-8', 'customField' as any, 'bar');
        // dump 不带 type
        const setMsg = state.sentMessages.find(m => m.method === 'set-property');
        expect(setMsg?.args.dump).toEqual({ value: 'bar' });
    });
});

// ============================================================================
// Integration: removeComponent —— Bug #1 fallback chain
// ============================================================================
describe('Integration · removeComponent fallback chain', () => {
    it('内置组件 cc.Sprite → 第 1 个 strategy (component uuid) 即成功', async () => {
        const node = makeNode('node-r1', {
            comps: [
                makeComp('cc.UITransform', 'ut-1'),
                makeComp('cc.Sprite', 'sp-1')
            ]
        });
        const tools = new ComponentTools();
        const r = await (tools as any).removeComponent('node-r1', 'cc.Sprite');
        expect(r.success).toBe(true);
        expect(r.data?.strategy).toBe('remove-component');
        expect(node.__comps__.length).toBe(1);
        expect(node.__comps__[0].__type__).toBe('cc.UITransform');
    });

    it('自定义脚本 cid → remove-component 所有 5 个 identifier 全失败 → remove-array-element 兜底成功', async () => {
        const customCid = 'cid-myTestCmpt';
        const customInst = 'inst-myTest-1';
        const node = makeNode('node-r2', {
            comps: [
                makeComp('cc.UITransform', 'ut-2'),
                makeComp('cc.Sprite', 'sp-2'),
                makeComp(customCid, customInst)
            ]
        });
        // 让所有 remove-component 调用 reject（mock 假装 cocos 收到但不删）
        state.rejectRemoveStrategies.add(`node-r2:${customInst}`);          // uuid
        state.rejectRemoveStrategies.add(`node-r2:__comps__.2`);             // path
        state.rejectRemoveStrategies.add(`node-r2:2`);                       // index（string match）
        state.rejectRemoveStrategies.add(`node-r2:${customCid}`);            // cid
        // properties.uuid 同 instance uuid 所以也已 reject

        const tools = new ComponentTools();
        const r = await (tools as any).removeComponent('node-r2', customCid);
        expect(r.success).toBe(true);
        expect(r.data?.strategy).toBe('remove-array-element');
        expect(node.__comps__.length).toBe(2);
        expect(node.__comps__.find(c => c.__type__ === customCid)).toBeUndefined();
    });

    it('未匹配 cid → NOT_FOUND，含 availableCids', async () => {
        makeNode('node-r3', { comps: [makeComp('cc.UITransform', 'ut-3')] });
        const tools = new ComponentTools();
        const r = await (tools as any).removeComponent('node-r3', 'no-such-cid');
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.NOT_FOUND);
        expect(r.details?.availableCids).toContain('cc.UITransform');
    });

    it('返回 identifierUsed + strategy 字段供 caller 调试', async () => {
        makeNode('node-r4', { comps: [makeComp('cc.UITransform', 'ut-4'), makeComp('cc.Sprite', 'sp-4')] });
        const tools = new ComponentTools();
        const r = await (tools as any).removeComponent('node-r4', 'cc.Sprite');
        expect(r.data?.identifierUsed).toBeDefined();
        expect(r.data?.strategy).toBeDefined();
    });
});

// ============================================================================
// Integration: getComponents minimal mode —— OPT-1 全链路
// ============================================================================
describe('Integration · getComponents minimal mode + token saving', () => {
    it('默认 mode=minimal: 顶层 uuid 提取成功 + properties 已 compact', async () => {
        // 构造一个 comp.value.uuid 在内层的形态（模拟 Cocos 真实结构）
        const compInner = {
            __type__: 'cc.Sprite',
            value: {
                uuid: 'instance-uuid-abc',
                fontSize: { value: 28, type: 'number', displayName: 'i18n:font', tooltip: 'i18n:t', default: 24, readonly: false },
                _color: { value: { r: 255 }, type: 'cc.Color' },  // 应被剥
                color: { value: { r: 255, g: 0, b: 0, a: 255 }, type: 'cc.Color' }
            }
        };
        makeNode('node-g1', { comps: [compInner as MockComp] });
        const tools = new ComponentTools();
        const r = await (tools as any).getComponents('node-g1');
        expect(r.success).toBe(true);
        expect(r.data?.mode).toBe('minimal');
        const c = r.data?.components[0];
        // 顶层 uuid 提取成功
        expect(c.uuid).toBe('instance-uuid-abc');
        // _color 被剥
        expect(c.properties).not.toHaveProperty('_color');
        // fontSize 包装被剥成纯值
        expect(c.properties.fontSize).toBe(28);
        // color 是 cc.* 类型保留 {value, type}
        expect(c.properties.color).toEqual({ value: { r: 255, g: 0, b: 0, a: 255 }, type: 'cc.Color' });
    });

    it('mode=full: 保留原 dump 结构，i18n / default / 等 9 字段都在', async () => {
        const compInner = {
            __type__: 'cc.Label',
            value: {
                uuid: 'inst-l1',
                fontSize: { value: 28, type: 'number', displayName: 'i18n:fs', tooltip: 'i18n:tt', default: 24, readonly: false }
            }
        };
        makeNode('node-g2', { comps: [compInner as MockComp] });
        const tools = new ComponentTools();
        const r = await (tools as any).getComponents('node-g2', 'full');
        expect(r.data?.mode).toBe('full');
        const fontSize = r.data?.components[0].properties.fontSize;
        expect(fontSize).toHaveProperty('value', 28);
        expect(fontSize).toHaveProperty('displayName');
        expect(fontSize).toHaveProperty('default');
    });

    it('Response 体积 minimal ≪ full (token 节省 ≥ 50% in synthetic case)', async () => {
        // 构造一个组件有 10 个属性，每个都有 9 字段元数据包装
        const props: any = { uuid: 'inst-bigprop' };
        for (let i = 0; i < 10; i++) {
            props[`prop${i}`] = {
                value: i,
                type: 'number',
                displayName: 'i18n:abcdefg.h.i.j.k.l',
                tooltip: 'i18n:abcdefg.h.i.j.k.l.tooltip',
                default: 0,
                readonly: false,
                visible: true,
                animatable: true,
                extends: ['cc.Number']
            };
        }
        makeNode('node-g3', { comps: [{ __type__: 'cc.Test', value: props }] });
        const tools = new ComponentTools();
        const rMin = await (tools as any).getComponents('node-g3', 'minimal');
        const rFull = await (tools as any).getComponents('node-g3', 'full');
        const minSize = JSON.stringify(rMin).length;
        const fullSize = JSON.stringify(rFull).length;
        expect(minSize).toBeLessThan(fullSize / 2);
    });
});

// ============================================================================
// Integration: attachScript —— Bug #3 全链路
// ============================================================================
describe('Integration · attachScript verify by count delta', () => {
    it('首次 attach: count 增加 1, newCid 唯一 → success', async () => {
        makeNode('node-a1', { comps: [makeComp('cc.UITransform', 'ut-a1')] });
        const tools = new ComponentTools();
        const r = await (tools as any).attachScript('node-a1', 'db://assets/myTest.ts');
        expect(r.success).toBe(true);
        expect(r.data?.existing).toBe(false);
        expect(r.data?.newComponentCid).toBeDefined();
        expect(state.nodes.get('node-a1')?.__comps__.length).toBe(2);
    });

    it('attach 后查 getComponents 验证脚本组件已存在（minimal mode 剥 _ 前缀，故查 type）', async () => {
        makeNode('node-a2', {});
        const tools = new ComponentTools();
        const attachR = await (tools as any).attachScript('node-a2', 'db://assets/scriptX.ts');
        const cid = attachR.data?.newComponentCid;
        const r = await (tools as any).getComponents('node-a2');
        expect(r.data?.components.length).toBe(1);
        // type 是 mock 生成的 cid hash，含 scriptName 子串
        expect(r.data?.components[0].type).toBe(cid);
        expect(r.data?.components[0].type).toMatch(/scriptX/);
    });

    it('script path 提取 className 正确：路径含目录', async () => {
        makeNode('node-a3', {});
        const tools = new ComponentTools();
        const r = await (tools as any).attachScript('node-a3', 'db://assets/script/sub/deep/ABC.ts');
        expect(r.success).toBe(true);
        expect(r.data?.componentName).toBe('ABC');
    });

    it('Invalid scriptPath → INVALID_PARAMS', async () => {
        makeNode('node-a4', {});
        const tools = new ComponentTools();
        const r = await (tools as any).attachScript('node-a4', '');
        expect(r.success).toBe(false);
        expect(r.errorCode).toBe(ERROR_CODES.INVALID_PARAMS);
    });
});

// ============================================================================
// Integration: Boolean coercion in setComponentProperty —— 补丁 #7
// ============================================================================
describe('Integration · setComponentProperty boolean coercion (补丁 #7)', () => {
    it('boolean false 走 type: "Boolean" 分支 + 真正 set 到 false', async () => {
        makeNode('node-c1', {
            comps: [
                makeComp('cc.UITransform', 'ut-c1'),
                makeComp('cc.Layout', 'lt-c1', { enabled: true })
            ]
        });
        const tools = new ComponentTools();
        const r = await (tools as any).setComponentProperty({
            nodeUuid: 'node-c1',
            componentType: 'cc.Layout',
            property: 'enabled',
            propertyType: 'boolean',
            value: false
        });
        expect(r.success).toBe(true);
        expect(r.data?.actualValue).toBe(false);
        expect(state.nodes.get('node-c1')?.__comps__[1].value.enabled).toBe(false);
        // 验证发出的 dump 带 type: 'Boolean'
        const setMsg = [...state.sentMessages].reverse().find(m => m.method === 'set-property');
        expect(setMsg?.args.dump.type).toBe('Boolean');
    });

    it('string "false" 不会被 Boolean("false") truthy 坑误转 true', async () => {
        makeNode('node-c2', {
            comps: [
                makeComp('cc.UITransform', 'ut-c2'),
                makeComp('cc.Layout', 'lt-c2', { enabled: true })
            ]
        });
        const tools = new ComponentTools();
        const r = await (tools as any).setComponentProperty({
            nodeUuid: 'node-c2',
            componentType: 'cc.Layout',
            property: 'enabled',
            propertyType: 'boolean',
            value: 'false'
        });
        // 关键 assertion: 最终值是 false 而不是 true
        expect(state.nodes.get('node-c2')?.__comps__[1].value.enabled).toBe(false);
    });
});
