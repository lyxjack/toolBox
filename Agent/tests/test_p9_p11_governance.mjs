/**
 * test_p9_p11_governance.mjs — Unit tests for REQ-20260517-032402
 *
 * 验证 P9 (Assumption Transparency) / P10 (Simplicity Discipline) / P11 (Surgical Scope)
 * 三条 Constitution Principle 及其挂载点(PM Step 5.5 / CTO Step 1.5 + Step 7 Part B /
 * QA Step 5.5 Surgical Trace + Layer 5 list)的结构完整性。
 *
 * Run: node --test Agent/tests/test_p9_p11_governance.mjs
 *
 * 设计思路:本测试是 REQ-20260517-032402 的 12 条 AC 在 Node test runner 中的可执行镜像。
 * 静态 grep + 字节数 + 文件存在性,无外部依赖,可作为 pre-commit 回归 baseline。
 *
 * Companion: test_p9_p11_governance_integration.mjs(集成测试,验证 hook 串入)。
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

// 治理规则涉及的所有文件
const FILES = {
  constitution: resolve(ROOT, 'Agent/rules/constitution.md'),
  ironLaws: resolve(ROOT, 'Agent/rules/iron_laws.md'),
  pmWorkflow: resolve(ROOT, 'PM/pm_workflow.md'),
  reqTmpl: resolve(ROOT, 'PM/templates/requirement_package.tmpl.md'),
  reqMicroTmpl: resolve(ROOT, 'PM/templates/requirement_package_micro.tmpl.md'),
  ctoPlanning: resolve(ROOT, 'Agent/workflow/cto_planning.md'),
  execPlanTmpl: resolve(ROOT, 'Agent/templates/execution_plan.tmpl.md'),
  qaVerification: resolve(ROOT, 'Agent/workflow/qa_verification.md'),
  workflowAnchor: resolve(ROOT, 'KI/External_KI/skills/workflow/workflow.md'),
  decision: resolve(ROOT, 'KI/Internal_KI/decisions/2026-05-17-karpathy-elevation-to-principle.md'),
};

function read(key) {
  return readFileSync(FILES[key], 'utf-8');
}

function countMatches(s, regex) {
  const m = s.match(regex);
  return m ? m.length : 0;
}

// ──────────────────────────────────────────────────────────
// AC-1: Constitution P9 / P10 / P11 + P1-P8 保留
// ──────────────────────────────────────────────────────────
describe('AC-1: Constitution P9/P10/P11 + P1-P8 保留', () => {
  const c = read('constitution');

  it('P9 — Assumption Transparency 段存在', () => {
    assert.match(c, /^### P9 — Assumption Transparency/m);
  });
  it('P10 — Simplicity Discipline 段存在', () => {
    assert.match(c, /^### P10 — Simplicity Discipline/m);
  });
  it('P11 — Surgical Scope 段存在', () => {
    assert.match(c, /^### P11 — Surgical Scope/m);
  });
  it('原有 P1-P8 全保留', () => {
    const count = countMatches(c, /^### P[1-8] /gm);
    assert.equal(count, 8, `P1-P8 应保留 8 条,实际 ${count}`);
  });
  it('每条新 Principle 含 4 要素 (何时生效 / 违反后果 / 知识源)', () => {
    for (const p of ['P9', 'P10', 'P11']) {
      const block = c.match(new RegExp(`^### ${p} —[\\s\\S]*?(?=^### |^## )`, 'm'))?.[0] || '';
      assert.match(block, /何时生效/, `${p} 缺 "何时生效" 段`);
      assert.match(block, /违反后果/, `${p} 缺 "违反后果" 段`);
      assert.match(block, /知识源/, `${p} 缺 "知识源" 段`);
    }
  });
});

// ──────────────────────────────────────────────────────────
// AC-2: Iron Laws = 13 不变 + Related Principles footnote
// (P9-P11 交付时为 11；IL-12 ROYAL SALUTATION 后续入法；
//  IL-13 PREFAB EDITOR-FIRST 于 2026-07-25 用户钦定入法(REQ-20260725-151422 UD-9), 基线随之更新)
// ──────────────────────────────────────────────────────────
describe('AC-2: Iron Laws 数量不变 + Related Principles cross-ref', () => {
  const il = read('ironLaws');

  it('Iron Law 数量 = 13 (未新增)', () => {
    const count = countMatches(il, /^(### |#### )IRON LAW \d+/gm);
    assert.equal(count, 13, `IL 数应保持 13,实际 ${count}`);
  });
  it('末尾 Related Principles 章节存在', () => {
    assert.match(il, /^## Related Principles/m);
  });
  it('Related Principles 引用 P9/P10/P11 + constitution.md 路径', () => {
    assert.match(il, /P9/);
    assert.match(il, /P10/);
    assert.match(il, /P11/);
    assert.match(il, /Agent\/rules\/constitution\.md/);
  });
});

// ──────────────────────────────────────────────────────────
// AC-3 + AC-11: PM workflow Step 5.5 + Gate① + Step 6 必填
// ──────────────────────────────────────────────────────────
describe('AC-3: PM workflow Hidden Assumptions 挂载', () => {
  const pm = read('pmWorkflow');

  it('Step 5.5 Hidden Assumptions 子步骤存在', () => {
    assert.match(pm, /#### Step 5\.5: Hidden Assumptions/);
  });
  it('Step 6 必填字段含 Hidden Assumptions', () => {
    // Step 6 段中含 Hidden Assumptions 行
    const step6 = pm.match(/### Step 6:[\s\S]*?(?=### Step 7:)/)?.[0] || '';
    assert.match(step6, /Hidden Assumptions/);
  });
  it('Gate① checklist 含 Hidden Assumptions 检查', () => {
    const gate1 = pm.match(/### Step 7: Gate① 检查[\s\S]*?(?=### Step 8:)/)?.[0] || '';
    assert.match(gate1, /Hidden Assumptions/);
  });
  it('旧 "Clarified Intent" 检查保留 (无 regression)', () => {
    assert.match(pm, /Clarified Intent/);
  });
});

// ──────────────────────────────────────────────────────────
// AC-4: PM 两个模板 Hidden Assumptions 段
// ──────────────────────────────────────────────────────────
describe('AC-4: PM 模板 Hidden Assumptions 段', () => {
  it('standard 模板含 ### Hidden Assumptions 段 + 表头', () => {
    const t = read('reqTmpl');
    assert.match(t, /^### Hidden Assumptions/m);
    assert.match(t, /信源/);
    assert.match(t, /待澄清/);
  });
  it('micro 模板含 ### Hidden Assumptions + None identified 占位', () => {
    const t = read('reqMicroTmpl');
    assert.match(t, /^### Hidden Assumptions/m);
    assert.match(t, /None identified/);
  });
  it('micro 模板含关键词触发禁用 None identified 的说明', () => {
    const t = read('reqMicroTmpl');
    assert.match(t, /(新功能|新接口|跨层|schema|storage)/);
    assert.match(t, /禁止/);
  });
});

// ──────────────────────────────────────────────────────────
// AC-5: CTO planning Pushback Gate + Simplicity Justification + Gate②
// ──────────────────────────────────────────────────────────
describe('AC-5: CTO Step 1.5 + Step 7 Part B + Gate②', () => {
  const cto = read('ctoPlanning');

  it('Step 1.5 Assumption Pushback Gate 存在', () => {
    assert.match(cto, /Step 1\.5.*Assumption Pushback Gate/);
  });
  it('Step 7 Part B Simplicity Justification 存在', () => {
    assert.match(cto, /Part B.*Simplicity Justification/);
  });
  it('Gate② checklist 含 Simplicity Justification 检查', () => {
    const gate2 = cto.match(/### Step 9: Gate② 检查[\s\S]*?(?=##|$)/)?.[0] || '';
    assert.match(gate2, /Simplicity Justification 段已写入/);
  });
  it('Gate② checklist 含 Assumption Pushback Gate 检查', () => {
    const gate2 = cto.match(/### Step 9: Gate② 检查[\s\S]*?(?=##|$)/)?.[0] || '';
    assert.match(gate2, /Assumption Pushback Gate 已执行/);
  });
  it('Gate② 旧 8 项 checklist 全保留', () => {
    const gate2 = cto.match(/### Step 9: Gate② 检查[\s\S]*?(?=##|$)/)?.[0] || '';
    const oldPatterns = [
      /Reuse Audit 非空/,
      /执行模式已选定/,
      /模式选择符合 Step 3b/,
      /每个 task 有 verificationCriteria/,
      /Minimal Change Rationale 存在/,
      /Verification Plan 存在/,
      /execution_plan\.md 已写入/,
    ];
    for (const p of oldPatterns) {
      assert.match(gate2, p, `Gate② 旧 checklist 项缺失: ${p}`);
    }
  });
});

// ──────────────────────────────────────────────────────────
// AC-6: execution_plan 模板 Simplicity Justification 段
// ──────────────────────────────────────────────────────────
describe('AC-6: execution_plan 模板新段', () => {
  it('## Simplicity Justification 顶级段存在', () => {
    const t = read('execPlanTmpl');
    assert.match(t, /^## Simplicity Justification/m);
  });
  it('段内含 micro/standard 弱化说明', () => {
    const t = read('execPlanTmpl');
    assert.match(t, /micro/);
    assert.match(t, /standard/);
  });
  it('原 Minimal Change Rationale 段保留', () => {
    const t = read('execPlanTmpl');
    assert.match(t, /Minimal Change Rationale/);
  });
});

// ──────────────────────────────────────────────────────────
// AC-7: QA verification Step 5.5 Surgical Trace + Layer 5 list
// ──────────────────────────────────────────────────────────
describe('AC-7: QA Step 5.5 Surgical Trace', () => {
  const qa = read('qaVerification');

  it('Step 5.5 Surgical Trace Check 子步骤存在', () => {
    assert.match(qa, /#### Step 5\.5: Surgical Trace Check/);
  });
  it('引用 P11 锚点路径', () => {
    assert.match(qa, /constitution\.md.*P11/);
  });
  it('Layer 4 旧 5 项检查项全保留', () => {
    const layer4 = qa.match(/### Step 5: Layer 4[\s\S]*?(?=### Step 6:)/)?.[0] || '';
    assert.match(layer4, /聚合所有 change_manifest/);
    assert.match(layer4, /对比实际文件变更/);
    assert.match(layer4, /确认无计划外文件被修改/);
    assert.match(layer4, /确认 Tool\/ 中原始 skill/);
    assert.match(layer4, /确认无全局状态被意外修改/);
  });
  it('Layer 5 evidence 表含 Hidden Assumptions / Simplicity Justification / Surgical Trace 三项', () => {
    const layer5 = qa.match(/### Step 6: Layer 5[\s\S]*?(?=### Step 7:)/)?.[0] || '';
    assert.match(layer5, /Hidden Assumptions/);
    assert.match(layer5, /Simplicity Justification/);
    assert.match(layer5, /Surgical Trace/);
  });
});

// ──────────────────────────────────────────────────────────
// AC-8: workflow Anchor §10 Cross-References footnote ≤ 200 bytes
// ──────────────────────────────────────────────────────────
describe('AC-8: workflow §10 Cross-References footnote', () => {
  const wf = read('workflowAnchor');

  it('cross-ref HTML 注释 marker 存在', () => {
    assert.match(wf, /<!-- cross-ref: 2026-05-17 REQ-20260517-032402 -->/);
  });
  it('footnote 引用 P9/P10/P11 + 3 个 workflow 挂载点', () => {
    // 找 cross-ref marker 后到下一个 --- 的内容
    const block = wf.match(/<!-- cross-ref:[\s\S]*?(?=^---$)/m)?.[0] || '';
    assert.match(block, /constitution\.md/);
    assert.match(block, /P9\/P10\/P11/);
    assert.match(block, /PM Step 5\.5/);
    assert.match(block, /CTO Step 1\.5/);
    assert.match(block, /QA Step 5\.5/);
  });
  it('footnote 字节数 ≤ 250 (硬预算 200 + 20% buffer)', () => {
    const block = wf.match(/<!-- cross-ref:[\s\S]*?(?=^---$)/m)?.[0] || '';
    // 用 byte length 而非 char length(UTF-8 中文 3 bytes/char)
    const bytes = Buffer.byteLength(block, 'utf-8');
    assert.ok(bytes <= 250, `footnote 应 ≤ 250 bytes,实际 ${bytes}`);
  });
});

// ──────────────────────────────────────────────────────────
// AC-9: Internal_KI decision file
// ──────────────────────────────────────────────────────────
describe('AC-9: Internal_KI decision 沉淀文件', () => {
  it('decision 文件存在', () => {
    assert.ok(existsSync(FILES.decision), 'decision file 必须存在');
  });
  it('含 3 个核心 Decision 段', () => {
    const d = read('decision');
    assert.equal(countMatches(d, /^## Decision \d+:/gm), 3, 'Decision 1/2/3 三段必须齐全');
  });
  it('frontmatter 含 req_ref 和 impacts 列表', () => {
    const d = read('decision');
    assert.match(d, /req_ref: REQ-20260517-032402/);
    assert.match(d, /impacts:/);
  });
  it('含一周复盘 KPI 区块 (≥ 6 个 KPI 行)', () => {
    const d = read('decision');
    const kpiBlock = d.match(/^## 一周复盘 KPI[\s\S]*?(?=^## )/m)?.[0] || '';
    const kpiRows = countMatches(kpiBlock, /^\| \*\*.*\*\* \|/gm);
    assert.ok(kpiRows >= 6, `KPI 行数应 ≥ 6,实际 ${kpiRows}`);
  });
});

// ──────────────────────────────────────────────────────────
// AC-12: 5 grep keywords 元一致性
// ──────────────────────────────────────────────────────────
describe('AC-12: 5 grep keywords 元自检', () => {
  it('"Hidden Assumptions" 在 pm_workflow + 两个 PM 模板共 3 个文件命中', () => {
    let n = 0;
    for (const key of ['pmWorkflow', 'reqTmpl', 'reqMicroTmpl']) {
      if (/Hidden Assumptions/.test(read(key))) n++;
    }
    assert.equal(n, 3);
  });
  it('"Assumption Pushback" 在 cto_planning 命中', () => {
    assert.match(read('ctoPlanning'), /Assumption Pushback/);
  });
  it('"Simplicity Justification" 在 cto_planning + execution_plan 模板共 2 文件命中', () => {
    let n = 0;
    for (const key of ['ctoPlanning', 'execPlanTmpl']) {
      if (/Simplicity Justification/.test(read(key))) n++;
    }
    assert.equal(n, 2);
  });
  it('"Surgical Trace" 在 qa_verification 命中', () => {
    assert.match(read('qaVerification'), /Surgical Trace/);
  });
  it('"Related Principles" 在 iron_laws 命中', () => {
    assert.match(read('ironLaws'), /Related Principles/);
  });
});
