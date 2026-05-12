/**
 * REQ-20260511-234213 — Sprint 1 (v1.6.2) 6 P0/P1 修复 unit tests
 *
 * Covers (按 task_dag T2-T7 + 实证补丁 #7-#11)：
 *   T2 FIX-1   removeComponent 5-fallback chain（含 remove-array-element 兜底）
 *   T3 FIX-2a  setComponentProperty boolean 分支 + dump.type='Boolean'
 *   T4 FIX-2b  setNodeProperty CC_NODE_PROPERTY_TYPES 注册表
 *   T5 FIX-3   attachScript verify 改组件数量增量判断
 *   T6 OPT-1   getComponents mode='minimal' 默认 + compactProperties helper
 *   T7 UX-1    所有 setter before/after diff verify (silent no-op → structured error)
 *   补丁 #7    setComponentProperty case 'boolean' 字符串→布尔解析（JS truthy 坑）
 *   补丁 #8    getComponents 顶层 uuid 提取多路径 fallback
 *   补丁 #10   removeComponent remove-array-element 兜底（自定义脚本可删的关键）
 *   补丁 #11   setNodeProperty 字符串→布尔 coercion
 *
 * 测试风格沿用 v1.6.1-p2-fixes.test.ts: 源码 introspection + pure-logic 直测，
 * 不依赖 Editor.Message.request（CI 无 Cocos 编辑器）。
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ComponentTools } from '../source/tools/component-tools';
import { NodeTools } from '../source/tools/node-tools';
import { ERROR_CODES } from '../source/utils/error-response';

const ROOT = path.join(__dirname, '..');
const SRC_COMPONENT = fs.readFileSync(path.join(ROOT, 'source', 'tools', 'component-tools.ts'), 'utf-8');
const SRC_NODE = fs.readFileSync(path.join(ROOT, 'source', 'tools', 'node-tools.ts'), 'utf-8');

// --------------------------------------------------------------------------------------------
// FIX-1 — removeComponent 5-fallback chain
// --------------------------------------------------------------------------------------------
describe('FIX-1 — removeComponent 5-fallback chain', () => {
    const removeBlock = (() => {
        const start = SRC_COMPONENT.indexOf('private async removeComponent');
        return SRC_COMPONENT.slice(start, SRC_COMPONENT.indexOf('private async', start + 100));
    })();

    it('包含全部 4 个 remove-component identifier 候选 + remove-array-element 兜底', () => {
        expect(removeBlock).toContain('component uuid (');
        expect(removeBlock).toContain('properties.uuid');
        expect(removeBlock).toContain('__comps__.');
        expect(removeBlock).toContain('cid (');
        expect(removeBlock).toContain("'remove-array-element'");
    });

    it('remove-array-element fallback 调用 path 是 __comps__，传 matchedIndex', () => {
        expect(removeBlock).toMatch(/remove-array-element[^}]*path:\s*['"]__comps__['"]/s);
        expect(removeBlock).toMatch(/index:\s*matchedIndex/);
    });

    it('成功返回带 strategy 和 identifierUsed 字段', () => {
        expect(removeBlock).toMatch(/strategy:\s*['"]remove-component['"]/);
        expect(removeBlock).toMatch(/strategy:\s*['"]remove-array-element['"]/);
        expect(removeBlock).toContain('identifierUsed');
    });

    it('全失败走 createErrorResponse + EDITOR_API_ERROR + triedIdentifiers', () => {
        expect(removeBlock).toContain('createErrorResponse');
        expect(removeBlock).toContain('EDITOR_API_ERROR');
        expect(removeBlock).toContain('triedIdentifiers');
    });

    it('seenPayloads dedupe 防同 payload 重复尝试', () => {
        expect(removeBlock).toContain('seenPayloads');
    });
});

// --------------------------------------------------------------------------------------------
// FIX-2a — setComponentProperty boolean 分支
// --------------------------------------------------------------------------------------------
describe('FIX-2a — setComponentProperty boolean propertyType 分支', () => {
    it('源码含 propertyType === boolean 显式分支', () => {
        expect(SRC_COMPONENT).toMatch(/propertyType\s*===\s*['"]boolean['"]/);
    });

    it('boolean dump 显式带 type: "Boolean" 元数据', () => {
        const branchIdx = SRC_COMPONENT.search(/else if \(propertyType === ['"]boolean['"]\)/);
        expect(branchIdx).toBeGreaterThan(0);
        const block = SRC_COMPONENT.slice(branchIdx, branchIdx + 700);
        expect(block).toMatch(/type:\s*['"]Boolean['"]/);
        expect(block).toContain('set-property');
    });

    it('非 boolean 类型入参返 INVALID_PARAMS', () => {
        const branchIdx = SRC_COMPONENT.search(/else if \(propertyType === ['"]boolean['"]\)/);
        const block = SRC_COMPONENT.slice(branchIdx, branchIdx + 700);
        expect(block).toContain('INVALID_PARAMS');
        expect(block).toMatch(/typeof processedValue !==\s*['"]boolean['"]/);
    });
});

// --------------------------------------------------------------------------------------------
// 补丁 #7 — case 'boolean' 早期 value 处理修复 JS Boolean("false")===true 坑
// --------------------------------------------------------------------------------------------
describe('补丁 #7 — case boolean 早期处理对 string "false" 正确解析', () => {
    it('源码避免裸用 Boolean(value)，用显式 string parse', () => {
        const switchIdx = SRC_COMPONENT.indexOf('switch (propertyType)');
        expect(switchIdx).toBeGreaterThan(0);
        const block = SRC_COMPONENT.slice(switchIdx, switchIdx + 1500);
        // case 'boolean': 后面应有 typeof value === 'string' 检查
        expect(block).toMatch(/case\s*['"]boolean['"]:[\s\S]*?typeof value\s*===\s*['"]string['"]/);
        expect(block).toMatch(/value\.toLowerCase\(\)\s*===\s*['"]true['"]/);
    });
});

// --------------------------------------------------------------------------------------------
// FIX-2b — setNodeProperty CC_NODE_PROPERTY_TYPES 注册表
// --------------------------------------------------------------------------------------------
describe('FIX-2b — CC_NODE_PROPERTY_TYPES 注册表 + dump.type wrap', () => {
    it('源码定义 const CC_NODE_PROPERTY_TYPES 字段类型 map', () => {
        expect(SRC_NODE).toMatch(/const\s+CC_NODE_PROPERTY_TYPES\s*:\s*Record<string,\s*string>/);
    });

    it('注册表至少含 active/name/layer/mobility/siblingIndex 5 个键', () => {
        const mapIdx = SRC_NODE.indexOf('CC_NODE_PROPERTY_TYPES:');
        const block = SRC_NODE.slice(mapIdx, mapIdx + 500);
        expect(block).toMatch(/active:\s*['"]Boolean['"]/);
        expect(block).toMatch(/name:\s*['"]String['"]/);
        expect(block).toMatch(/layer:\s*['"]Number['"]/);
        expect(block).toMatch(/mobility:\s*['"]Number['"]/);
        expect(block).toMatch(/siblingIndex:\s*['"]Number['"]/);
    });

    it('setNodeProperty 内 dump 按 registeredType 包装 type 字段', () => {
        const fnIdx = SRC_NODE.indexOf('private async setNodeProperty');
        const block = SRC_NODE.slice(fnIdx, fnIdx + 3000);
        expect(block).toContain('CC_NODE_PROPERTY_TYPES[property]');
        expect(block).toMatch(/dump.*registeredType.*\{\s*value:\s*coercedValue,\s*type:\s*registeredType\s*\}/s);
    });
});

// --------------------------------------------------------------------------------------------
// 补丁 #11 — setNodeProperty 字符串→布尔 coercion
// --------------------------------------------------------------------------------------------
describe('补丁 #11 — setNodeProperty 对 Boolean 字段字符串入参的 coercion', () => {
    it('源码对 Boolean 字段处理 typeof string + toLowerCase 解析', () => {
        const fnIdx = SRC_NODE.indexOf('private async setNodeProperty');
        const block = SRC_NODE.slice(fnIdx, fnIdx + 2500);
        expect(block).toContain('registeredType === \'Boolean\'');
        expect(block).toMatch(/typeof value\s*===\s*['"]string['"]/);
        expect(block).toMatch(/value\.toLowerCase\(\)/);
    });

    it('非法字符串返 INVALID_PARAMS 而非 silent coerce', () => {
        const fnIdx = SRC_NODE.indexOf('private async setNodeProperty');
        const block = SRC_NODE.slice(fnIdx, fnIdx + 2500);
        expect(block).toContain('INVALID_PARAMS');
        expect(block).toMatch(/got string\s*'/);
    });
});

// --------------------------------------------------------------------------------------------
// FIX-3 — attachScript verify 改组件数量增量判断
// --------------------------------------------------------------------------------------------
describe('FIX-3 — attachScript verify by component count delta', () => {
    const attachBlock = (() => {
        const start = SRC_COMPONENT.indexOf('private async attachScript');
        return SRC_COMPONENT.slice(start, SRC_COMPONENT.indexOf('private async', start + 100));
    })();

    it('记录 attach 前组件数量 + cid set 作为基线', () => {
        expect(attachBlock).toContain('countBefore');
        expect(attachBlock).toContain('cidsBefore');
        // cidsBefore 应是 new Set(...) 的赋值结果
        expect(attachBlock).toMatch(/cidsBefore\s*=\s*new Set\(/);
    });

    it('verify 用 length 比较，不依赖 comp.type === scriptName', () => {
        expect(attachBlock).toMatch(/componentsAfter\.length\s*>=\s*countBefore\s*\+\s*1/);
        expect(attachBlock).toContain('newCids');
        // 旧代码 `find((comp: any) => comp.type === scriptName)` 在 verify 步骤里
        // 已被替换；保留只在 existing 早期检测里（自动 fail-soft 不阻挡）
        const verifySection = attachBlock.split('componentsAfter')[1] || '';
        expect(verifySection).not.toMatch(/find\s*\(.*comp\.type\s*===\s*scriptName/);
    });

    it('成功返回 newComponentCid + newComponentUuid', () => {
        expect(attachBlock).toContain('newComponentCid');
        expect(attachBlock).toContain('newComponentUuid');
    });

    it('失败返结构化 EDITOR_API_ERROR 含 countBefore/countAfter/availableCids', () => {
        expect(attachBlock).toContain('createErrorResponse');
        expect(attachBlock).toContain('countBefore');
        expect(attachBlock).toContain('countAfter');
        expect(attachBlock).toContain('availableCids');
    });
});

// --------------------------------------------------------------------------------------------
// OPT-1 — getComponents mode='minimal' 默认 + compactProperties
// --------------------------------------------------------------------------------------------
describe('OPT-1 — getComponents minimal mode + compactProperties', () => {
    it('getComponents 签名含 mode?: full|minimal|values_only', () => {
        const fnIdx = SRC_COMPONENT.indexOf('private async getComponents');
        const sig = SRC_COMPONENT.slice(fnIdx, fnIdx + 200);
        expect(sig).toMatch(/mode\s*:\s*['"]full['"]\s*\|\s*['"]minimal['"]\s*\|\s*['"]values_only['"]/);
        expect(sig).toMatch(/=\s*['"]minimal['"]/);
    });

    it('compactProperties helper 存在并被 getComponents 调用', () => {
        expect(SRC_COMPONENT).toContain('compactProperties');
        const fnIdx = SRC_COMPONENT.indexOf('private async getComponents');
        const body = SRC_COMPONENT.slice(fnIdx, fnIdx + 2000);
        expect(body).toMatch(/mode === ['"]full['"] \? rawProperties : this\.compactProperties/);
    });

    it('compactProperties 直测：剔除 _ 前缀字段', () => {
        const tools = new ComponentTools();
        const result = (tools as any).compactProperties({
            uuid: 'real-uuid',
            _color: 'should-be-stripped',
            color: { value: { r: 255 }, type: 'cc.Color' }
        }, 'minimal');
        expect(result).not.toHaveProperty('_color');
        expect(result).toHaveProperty('color');
        expect(result.uuid).toBe('real-uuid');
    });

    it('compactProperties 直测：sub-meta 包装剥成 {value, type}（minimal）', () => {
        const tools = new ComponentTools();
        const result = (tools as any).compactProperties({
            fontSize: {
                value: 28,
                type: 'number',
                displayName: 'i18n:foo',  // 应被剥
                tooltip: 'i18n:bar',       // 应被剥
                default: 24,                // 应被剥
                readonly: false             // 应被剥
            },
            spriteFrame: {
                value: { uuid: 'sf-uuid' },
                type: 'cc.SpriteFrame',
                displayName: 'i18n:sf'
            }
        }, 'minimal');
        // 简单类型：取 value
        expect(result.fontSize).toBe(28);
        // cc.* 引用类型：保留 {value, type}
        expect(result.spriteFrame).toEqual({ value: { uuid: 'sf-uuid' }, type: 'cc.SpriteFrame' });
    });

    it('compactProperties values_only 模式：扁平 key-value', () => {
        const tools = new ComponentTools();
        const result = (tools as any).compactProperties({
            fontSize: { value: 28, type: 'number' },
            spriteFrame: { value: { uuid: 'sf' }, type: 'cc.SpriteFrame' }
        }, 'values_only');
        expect(result.fontSize).toBe(28);
        expect(result.spriteFrame).toEqual({ uuid: 'sf' });
    });

    it('compactProperties 保留 __scriptAsset / __prefab（虽然 _ 前缀但有特殊含义）', () => {
        const tools = new ComponentTools();
        const result = (tools as any).compactProperties({
            __scriptAsset: { value: { uuid: 'script-uuid' }, type: 'cc.Script' },
            __prefab: { value: null, type: 'cc.Prefab' }
        }, 'minimal');
        expect(result).toHaveProperty('__scriptAsset');
        expect(result).toHaveProperty('__prefab');
    });

    it('query tool schema 含 mode 参数 + minimal default', () => {
        const queryIdx = SRC_COMPONENT.indexOf("name: 'query'");
        const block = SRC_COMPONENT.slice(queryIdx, queryIdx + 2000);
        expect(block).toMatch(/mode:\s*\{/);
        expect(block).toMatch(/enum:\s*\[['"]full['"],\s*['"]minimal['"],\s*['"]values_only['"]\]/);
        expect(block).toMatch(/default:\s*['"]minimal['"]/);
    });
});

// --------------------------------------------------------------------------------------------
// 补丁 #8 — getComponents 顶层 uuid 提取多路径 fallback
// --------------------------------------------------------------------------------------------
describe('补丁 #8 — getComponents instanceUuid 多路径提取', () => {
    it('源码尝试 comp.value.uuid.value / comp.value.uuid / comp.uuid.value / comp.uuid 四条路径', () => {
        const fnIdx = SRC_COMPONENT.indexOf('private async getComponents');
        const block = SRC_COMPONENT.slice(fnIdx, fnIdx + 2000);
        expect(block).toContain('instanceUuid');
        expect(block).toMatch(/comp\.value\?\.uuid\?\.value/);
        expect(block).toMatch(/comp\.value\?\.uuid/);
    });

    it('uuid 字段最终是 string 或 null（非 object）', () => {
        const fnIdx = SRC_COMPONENT.indexOf('private async getComponents');
        const block = SRC_COMPONENT.slice(fnIdx, fnIdx + 2000);
        expect(block).toMatch(/typeof instanceUuid === ['"]string['"] \? instanceUuid : null/);
    });
});

// --------------------------------------------------------------------------------------------
// UX-1 — set 类操作 before/after diff verify
// --------------------------------------------------------------------------------------------
describe('UX-1 — setter before/after diff verify (silent no-op detection)', () => {
    it('setComponentProperty 失败时返结构化 EDITOR_API_ERROR + intended/before/actual', () => {
        const fnIdx = SRC_COMPONENT.indexOf('private async setComponentProperty');
        const block = SRC_COMPONENT.slice(fnIdx, SRC_COMPONENT.indexOf('private ', fnIdx + 100));
        expect(block).toContain('!verification.verified');
        expect(block).toContain('silently no-op');
        expect(block).toContain('intended:');
        expect(block).toContain('before:');
        expect(block).toContain('actual:');
    });

    it('setComponentProperty 成功返简化 {actualValue, changed}（无 verificationData 膨胀）', () => {
        const fnIdx = SRC_COMPONENT.indexOf('private async setComponentProperty');
        const block = SRC_COMPONENT.slice(fnIdx, SRC_COMPONENT.indexOf('private ', fnIdx + 100));
        // 必须有 changed 字段
        expect(block).toMatch(/changed:\s*JSON\.stringify\(originalValue\)\s*!==\s*JSON\.stringify/);
        // 不应该再返回旧的 beforeAfterComparison 字段
        expect(block).not.toContain('beforeAfterComparison');
    });

    it('setNodeProperty 同样做 before snapshot + after diff', () => {
        const fnIdx = SRC_NODE.indexOf('private async setNodeProperty');
        const block = SRC_NODE.slice(fnIdx, SRC_NODE.indexOf('private async setNodeTransform', fnIdx));
        expect(block).toContain('beforeValue');
        expect(block).toContain('intendedJson');
        expect(block).toContain('actualJson');
        expect(block).toContain('verified');
        expect(block).toContain('silently no-op');
    });

    it('setNodeTransform 移除了 verificationData.beforeAfterComparison 膨胀', () => {
        const fnIdx = SRC_NODE.indexOf('private async setNodeTransform');
        const block = SRC_NODE.slice(fnIdx, fnIdx + 4000);
        // 检查的是 JSON 字段语法（"beforeAfterComparison:" 作 key），而非 prose 注释里的提及
        expect(block).not.toMatch(/beforeAfterComparison\s*:/);
        // 也不应有旧 verificationData 块
        expect(block).not.toMatch(/verificationData\s*:\s*\{[^}]*nodeInfo/s);
    });
});

// --------------------------------------------------------------------------------------------
// Cross-cutting — 引入了正确的依赖
// --------------------------------------------------------------------------------------------
describe('Cross-cutting — 依赖与错误码使用', () => {
    it('component-tools 用 ERROR_CODES.EDITOR_API_ERROR 包错', () => {
        expect(SRC_COMPONENT).toContain('ERROR_CODES.EDITOR_API_ERROR');
        expect(SRC_COMPONENT).toContain('ERROR_CODES.INVALID_PARAMS');
        expect(SRC_COMPONENT).toContain('ERROR_CODES.NOT_FOUND');
    });

    it('node-tools 用 createErrorResponse + ERROR_CODES', () => {
        expect(SRC_NODE).toContain('createErrorResponse');
        expect(SRC_NODE).toContain('ERROR_CODES.INVALID_PARAMS');
        expect(SRC_NODE).toContain('ERROR_CODES.EDITOR_API_ERROR');
    });

    it('REQ-20260511-234213 标志在多处源码留下，便于日后追溯', () => {
        // toolBox 6+ 处，node-tools 3+ 处
        const cocount = (SRC_COMPONENT.match(/REQ-20260511-234213/g) || []).length;
        const ncount = (SRC_NODE.match(/REQ-20260511-234213/g) || []).length;
        expect(cocount).toBeGreaterThanOrEqual(5);
        expect(ncount).toBeGreaterThanOrEqual(2);
    });
});

// --------------------------------------------------------------------------------------------
// 类实例化 smoke test —— 至少 constructor 不抛
// --------------------------------------------------------------------------------------------
describe('Smoke — class instantiation', () => {
    it('ComponentTools 实例化通过', () => {
        const c = new ComponentTools();
        expect(c).toBeInstanceOf(ComponentTools);
        // getTools 不访问 Editor，应能调
        const tools = c.getTools();
        expect(Array.isArray(tools)).toBe(true);
        expect(tools.length).toBeGreaterThan(0);
        // 验证 query tool 在列表里
        expect(tools.find(t => t.name === 'query')).toBeDefined();
        // 验证 set_component_property 还在（向后兼容）
        expect(tools.find(t => t.name === 'set_component_property')).toBeDefined();
    });

    it('NodeTools 实例化通过 + getTools 非空', () => {
        const n = new NodeTools();
        const tools = n.getTools();
        expect(Array.isArray(tools)).toBe(true);
        expect(tools.find(t => t.name === 'set_node_property')).toBeDefined();
        expect(tools.find(t => t.name === 'set_node_transform')).toBeDefined();
    });

    it('ERROR_CODES 8 个枚举值都在', () => {
        expect(ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND');
        expect(ERROR_CODES.INVALID_PARAMS).toBe('INVALID_PARAMS');
        expect(ERROR_CODES.INVALID_STATE).toBe('INVALID_STATE');
        expect(ERROR_CODES.EDITOR_API_ERROR).toBe('EDITOR_API_ERROR');
        expect(ERROR_CODES.IO_ERROR).toBe('IO_ERROR');
        expect(ERROR_CODES.OPERATION_TIMEOUT).toBe('OPERATION_TIMEOUT');
        expect(ERROR_CODES.PERMISSION_DENIED).toBe('PERMISSION_DENIED');
        expect(ERROR_CODES.UNKNOWN).toBe('UNKNOWN');
    });
});
