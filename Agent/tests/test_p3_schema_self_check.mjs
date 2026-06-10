/**
 * test_p3_schema_self_check.mjs — P3 改进的 CI 集成测试
 *
 * P3 改了 3 处治理文档(workflow.md Phase 6.5 / contract.md § 3.6.1 / PAT-006 加注),
 * 本测试验证:
 *  1. 3 处改动落地(grep 结构关键字)
 *  2. **元一致性**(关键): test_distill_output_audit.mjs 的"防御代码"与
 *     workflow.md Phase 6.5 / contract.md § 3.6.1 的"防御标准"是同步的
 *
 * 元一致性是 P3 最容易出问题的地方 — 改 workflow 文档说"允许 PLAN-*"
 * 但忘了同步 audit test regex,会形成"文档说允许、测试还在拒"的脱钩。
 *
 * Run: node --test Agent/tests/test_p3_schema_self_check.mjs
 *
 * 与既有测试的分工:
 *  - test_distill_structure.mjs   — /distill skill/workflow 文档结构(P2 时写)
 *  - test_distill_output_audit.mjs — distill 实际产物合规(P2 audit 时写)
 *  - test_p3_schema_self_check.mjs(本测试)— P3 改进自身 + 元一致性
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const FILES = {
  workflow: resolve(ROOT, 'Agent/workflow/distill.md'),
  contract: resolve(ROOT, 'KI/Internal_KI/contract.md'),
  pat006: resolve(ROOT, 'KI/Internal_KI/patterns/PAT-006__swarm-3-phase-governance.md'),
  auditTest: resolve(ROOT, 'Agent/tests/test_distill_output_audit.mjs'),
};

function read(key) {
  return readFileSync(FILES[key], 'utf-8');
}

// ──────────────────────────────────────────────────────────
// P3-1: workflow.md Phase 6.5 schema 自检章节
// ──────────────────────────────────────────────────────────
describe('P3-1: workflow.md Phase 6.5 Frontmatter Schema 自检', () => {
  const wf = read('workflow');

  it('Phase 6.5 顶级标题存在', () => {
    assert.match(wf, /^## Phase 6\.5: Frontmatter Schema 自检/m);
  });

  it('Phase 6.5 含 4 个子段(6.5.1 ~ 6.5.4)', () => {
    for (const sub of ['6.5.1', '6.5.2', '6.5.3', '6.5.4']) {
      assert.match(wf, new RegExp(`^### ${sub.replace('.', '\\.')}`, 'm'),
        `缺 § ${sub}`);
    }
  });

  it('6.5.1 含 5 种 type schema 表(execution_log / pattern / error / security_config / data_analysis)', () => {
    const section = wf.match(/^### 6\.5\.1[\s\S]*?(?=^### 6\.5\.2)/m)?.[0] || '';
    for (const type of ['execution_log', 'pattern', 'error', 'security_config', 'data_analysis']) {
      assert.match(section, new RegExp(`\`${type}\``),
        `6.5.1 schema 表缺 type=${type}`);
    }
  });

  it('6.5.2 含 trigger_condition / severity / status / req_ref 枚举说明', () => {
    const section = wf.match(/^### 6\.5\.2[\s\S]*?(?=^### 6\.5\.3)/m)?.[0] || '';
    assert.match(section, /trigger_condition/);
    assert.match(section, /severity/);
    assert.match(section, /req_ref/);
  });

  it('6.5.4 明示与 Audit-5 / test_distill_output_audit.mjs 的关系(双层防御)', () => {
    const section = wf.match(/^### 6\.5\.4[\s\S]*?(?=^---|^## )/m)?.[0] || '';
    assert.match(section, /test_distill_output_audit\.mjs/);
    assert.match(section, /双重保险|双层防御/);
  });
});

// ──────────────────────────────────────────────────────────
// P3-2: contract.md § 3.6.1 req_ref 双格式说明
// ──────────────────────────────────────────────────────────
describe('P3-2: contract.md § 3.6.1 req_ref 双格式', () => {
  const c = read('contract');

  it('§ 3.6.1 含 "req_ref 字段允许的两种格式" 段标题', () => {
    assert.match(c, /req_ref.*字段允许.*两种格式/);
  });

  it('§ 3.6.1 含 REQ-\\d{8}-\\d{6} pattern', () => {
    assert.match(c, /REQ-\\d\{8\}-\\d\{6\}/);
  });

  it('§ 3.6.1 含 PLAN- 前缀说明', () => {
    assert.match(c, /PLAN-/);
    assert.match(c, /plan_ref/);
  });

  it('§ 3.6.1 含示例引用 (REQ-20260517-* / PLAN-2026-05-17-*)', () => {
    assert.match(c, /REQ-20260517-/);
    assert.match(c, /PLAN-2026-05-17/);
  });
});

// ──────────────────────────────────────────────────────────
// P3-3: PAT-006 适用场景加注
// ──────────────────────────────────────────────────────────
describe('P3-3: PAT-006 模式光谱 + case 注释', () => {
  const pat = read('pat006');

  it('含"模式光谱"图(Serial ↔ Hybrid ↔ Swarm ↔ Parallel)', () => {
    assert.match(pat, /模式光谱/);
    assert.match(pat, /纯 Serial/);
    assert.match(pat, /纯 Parallel/);
    assert.match(pat, /Hybrid/);
  });

  it('REQ-032402 P9/P10/P11 标注为 hybrid 模式(与 swarm 区分)', () => {
    assert.match(pat, /REQ-20260517-032402.*hybrid|hybrid.*REQ-20260517-032402/);
  });

  it('REQ-043739 P2 /distill 标注为"本 pattern 的诞生案例"', () => {
    assert.match(pat, /REQ-20260517-043739.*诞生案例|诞生案例.*REQ-20260517-043739/);
  });

  it('P0 Obsidian 标注为"本 pattern 的第一次实战"', () => {
    assert.match(pat, /第一次实战/);
  });
});

// ──────────────────────────────────────────────────────────
// 元一致性 1: audit code reqRefPattern <-> contract § 3.6.1 声明
// ──────────────────────────────────────────────────────────
describe('元一致性 1: audit test reqRefPattern == contract § 3.6.1', () => {
  const audit = read('auditTest');
  const contract = read('contract');

  it('audit test 的 reqRefPattern 含 REQ-\\d{8}-\\d{6} 和 PLAN- 两种', () => {
    // audit test 用 JS regex: ^(REQ-\d{8}-\d{6}|PLAN-)
    assert.match(audit, /reqRefPattern.*REQ-\\d\{8\}-\\d\{6\}.*PLAN-|REQ-\\d\{8\}-\\d\{6\}\|PLAN-/);
  });

  it('contract § 3.6.1 声明的 pattern 与 audit code 一致', () => {
    // contract 用 markdown 反引号: `^REQ-\d{8}-\d{6}$` 和 `^PLAN-{date}-{slug}$`
    assert.match(contract, /REQ-\\d\{8\}-\\d\{6\}/);
    assert.match(contract, /PLAN-/);
    // audit 也要含同样的 pattern
    assert.match(audit, /REQ-\\d\{8\}-\\d\{6\}/);
    assert.match(audit, /PLAN-/);
  });
});

// ──────────────────────────────────────────────────────────
// 元一致性 2: audit forbidden 字段 <-> workflow Phase 6.5.1 表
// ──────────────────────────────────────────────────────────
describe('元一致性 2: audit forbidden == workflow Phase 6.5.1 表', () => {
  const audit = read('auditTest');
  const wf = read('workflow');

  it('audit execution_log forbidden 含 complements(PAT 专用,EXEC 禁用)', () => {
    // audit code:execution_log: { forbidden: ['complements'] }
    assert.match(audit, /execution_log[\s\S]{0,400}forbidden:\s*\[\s*['"]complements['"]/);
  });

  it('audit error forbidden 含 complements(ERR 模板无此字段)', () => {
    assert.match(audit, /error:\s*\{[\s\S]{0,300}forbidden:\s*\[\s*['"]complements['"]/);
  });

  it('workflow § 6.5.1 表中 execution_log 行的"禁用字段"含 complements', () => {
    const table = wf.match(/^### 6\.5\.1[\s\S]*?(?=^### 6\.5\.2)/m)?.[0] || '';
    // 表格中应该有 execution_log 一行,禁用字段列含 complements
    const execLine = table.match(/\| `execution_log` \|[^\n]+/)?.[0] || '';
    assert.match(execLine, /complements/, 'workflow 6.5.1 execution_log 行应明示禁用 complements');
  });

  it('workflow § 6.5.1 表中 error 行的"禁用字段"含 complements', () => {
    const table = wf.match(/^### 6\.5\.1[\s\S]*?(?=^### 6\.5\.2)/m)?.[0] || '';
    const errorLine = table.match(/\| `error` \|[^\n]+/)?.[0] || '';
    assert.match(errorLine, /complements/, 'workflow 6.5.1 error 行应明示禁用 complements');
  });
});

// ──────────────────────────────────────────────────────────
// 元一致性 3: pattern 的 trigger_condition 枚举三方对齐
// ──────────────────────────────────────────────────────────
describe('元一致性 3: trigger_condition 枚举(audit / workflow / pattern_entry.tmpl 三方对齐)', () => {
  const audit = read('auditTest');
  const wf = read('workflow');
  const patTmpl = readFileSync(resolve(ROOT, 'KI/Templates/pattern_entry.tmpl.md'), 'utf-8');

  for (const v of ['user_explicit', 'quality_audit', 'both']) {
    it(`枚举值 "${v}" 在 audit / workflow / 模板三处都存在`, () => {
      assert.match(audit, new RegExp(v), `audit 缺 ${v}`);
      assert.match(wf, new RegExp(v), `workflow 缺 ${v}`);
      assert.match(patTmpl, new RegExp(v), `pattern_entry.tmpl.md 缺 ${v}`);
    });
  }
});
