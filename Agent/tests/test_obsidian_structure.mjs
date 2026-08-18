/**
 * test_obsidian_structure.mjs — Unit tests for P0 Obsidian 7-Category Layered Mgmt
 *
 * 验证 P0 交付:
 *  - 3 个新子目录(execution_logs/security/data-analysis)+ README + .gitkeep
 *  - 3 个新模板 + pattern_entry.tmpl.md 加 trigger_condition + Templates/README.md
 *  - Internal_KI/contract.md 新 § 3.5 / 3.6 / 3.7 / 10.5
 *  - toolBox/CLAUDE.md ### KI Layer 含 7 大类小节
 *  - 现有 PAT-001..005 frontmatter 无 regression
 *  - 冻结索引 frozen=true 状态保留
 *
 * Run: node --test Agent/tests/test_obsidian_structure.mjs
 *
 * Companion: test_obsidian_structure_integration.mjs(集成测试,验证 hook 串入)。
 *
 * 设计思路:与 test_p9_p11_governance.mjs 同模式 — 静态 grep + 字节数 +
 * 文件存在性,无外部依赖,可作为 pre-commit 回归 baseline。
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const PATHS = {
  // 3 new subdirs
  execLogsDir: resolve(ROOT, 'KI/Internal_KI/execution_logs'),
  securityDir: resolve(ROOT, 'KI/Internal_KI/security'),
  dataAnalysisDir: resolve(ROOT, 'KI/Internal_KI/data-analysis'),
  // Templates
  execLogTmpl: resolve(ROOT, 'KI/Templates/execution_log.tmpl.md'),
  securityTmpl: resolve(ROOT, 'KI/Templates/security_config.tmpl.md'),
  dataTmpl: resolve(ROOT, 'KI/Templates/data_analysis.tmpl.md'),
  patternTmpl: resolve(ROOT, 'KI/Templates/pattern_entry.tmpl.md'),
  templatesReadme: resolve(ROOT, 'KI/Templates/README.md'),
  // Contract + CLAUDE.md
  contract: resolve(ROOT, 'KI/Internal_KI/contract.md'),
  toolboxClaude: resolve(ROOT, 'CLAUDE.md'),
  kiReadme: resolve(ROOT, 'KI/README.md'),
  // Regression — frozen index files
  internalKIIndex: resolve(ROOT, 'KI/Internal_KI/index.json'),
  errorBookIndex: resolve(ROOT, 'KI/Error_Book/index.json'),
  // Regression — existing PAT files
  patternsDir: resolve(ROOT, 'KI/Internal_KI/patterns'),
};

function read(key) {
  return readFileSync(PATHS[key], 'utf-8');
}

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('\n---', 4);
  if (end === -1) return null;
  return content.slice(4, end);
}

// ──────────────────────────────────────────────────────────
// AC-1: 3 个新子目录存在 + README + .gitkeep
// ──────────────────────────────────────────────────────────
describe('AC-1: 3 子目录 + README + .gitkeep', () => {
  for (const [name, dirKey] of [
    ['execution_logs', 'execLogsDir'],
    ['security', 'securityDir'],
    ['data-analysis', 'dataAnalysisDir'],
  ]) {
    it(`${name}/ 目录存在`, () => {
      assert.ok(existsSync(PATHS[dirKey]), `${name} 目录必须存在`);
    });
    it(`${name}/README.md 存在 + 非空`, () => {
      const readmePath = resolve(PATHS[dirKey], 'README.md');
      assert.ok(existsSync(readmePath));
      const content = readFileSync(readmePath, 'utf-8');
      assert.ok(content.length > 100, 'README 应有内容描述用途');
    });
    it(`${name}/.gitkeep 存在`, () => {
      assert.ok(existsSync(resolve(PATHS[dirKey], '.gitkeep')));
    });
  }
});

// ──────────────────────────────────────────────────────────
// AC-2: 3 个新模板 + YAML 合法 + 7 必填字段
// ──────────────────────────────────────────────────────────
describe('AC-2: 3 个新模板 frontmatter 合规', () => {
  const REQUIRED = ['id:', 'type:', 'status:', 'created:', 'tags:', 'related:', 'aliases:'];

  for (const [name, key] of [
    ['execution_log', 'execLogTmpl'],
    ['security_config', 'securityTmpl'],
    ['data_analysis', 'dataTmpl'],
  ]) {
    it(`${name}.tmpl.md 存在`, () => {
      assert.ok(existsSync(PATHS[key]));
    });
    it(`${name}.tmpl.md frontmatter 合法 YAML 块`, () => {
      const fm = parseFrontmatter(read(key));
      assert.ok(fm !== null, 'frontmatter 必须以 --- 开闭');
    });
    it(`${name}.tmpl.md 含 7 个必填字段`, () => {
      const fm = parseFrontmatter(read(key));
      for (const field of REQUIRED) {
        assert.ok(fm.includes(field), `缺字段 ${field}`);
      }
    });
  }
});

// ──────────────────────────────────────────────────────────
// AC-3: pattern_entry.tmpl.md 加 trigger_condition + 3 档枚举
// ──────────────────────────────────────────────────────────
describe('AC-3: pattern_entry.tmpl.md 加 trigger_condition', () => {
  const content = read('patternTmpl');

  it('含 trigger_condition 字段', () => {
    assert.match(content, /trigger_condition/);
  });
  it('注释含 3 档枚举 (user_explicit / quality_audit / both)', () => {
    assert.match(content, /user_explicit/);
    assert.match(content, /quality_audit/);
    assert.match(content, /both/);
  });
  it('原有 PAT-NNN 风格 frontmatter 保留(id/type/title/status/created/tags/complements/aliases)', () => {
    for (const f of ['id:', 'type:', 'title:', 'status:', 'created:', 'tags:', 'complements:', 'aliases:']) {
      assert.ok(content.includes(f), `pattern_entry 应保留 ${f}`);
    }
  });
});

// ──────────────────────────────────────────────────────────
// AC-4: Templates/README.md 含 7 大类对照表
// ──────────────────────────────────────────────────────────
describe('AC-4: Templates README 7 大类对照表', () => {
  const content = read('templatesReadme');

  it('含 7 行编号 | 1 | 到 | 7 |', () => {
    const lines = content.match(/^\| [1-7] \|/gm) || [];
    assert.equal(lines.length, 7, `期望 7 行编号,实际 ${lines.length}`);
  });
  it('含 Cross-Reference 强制规则段', () => {
    assert.match(content, /Cross-Reference/);
    assert.match(content, /wiki link|\[\[/);
    assert.match(content, /bootstrap/);
  });
  it('引用 7 个模板路径', () => {
    for (const tmpl of ['execution_log', 'security_config', 'data_analysis', 'pattern_entry', 'error_book_entry']) {
      assert.ok(content.includes(`${tmpl}.tmpl.md`), `README 应引用 ${tmpl}.tmpl.md`);
    }
  });
});

// ──────────────────────────────────────────────────────────
// AC-5..AC-8: Internal_KI/contract.md 新章节
// ──────────────────────────────────────────────────────────
describe('AC-5: contract.md § 3.5 7-Category Taxonomy', () => {
  const c = read('contract');

  it('§ 3.5 标题存在', () => {
    assert.match(c, /^## 3\.5 7-Category Taxonomy/m);
  });
  it('§ 3.5 含 7 大类对照表(7 行编号 | N |)', () => {
    const section = c.match(/^## 3\.5[\s\S]*?(?=^## 3\.6)/m)?.[0] || '';
    const lines = section.match(/^\| [1-7] \|/gm) || [];
    assert.equal(lines.length, 7, '§ 3.5 应有 7 行类别表');
  });
  it('§ 3.5 含旧 4 基础 category 与新 7 大类正交说明', () => {
    const section = c.match(/^## 3\.5[\s\S]*?(?=^## 3\.6)/m)?.[0] || '';
    assert.match(section, /正交|orthogonal|独立 dimension/);
  });
});

describe('AC-6: contract.md § 3.6 三个新子目录契约', () => {
  const c = read('contract');

  it('§ 3.6 标题 + 3 个子节(3.6.1/2/3)', () => {
    assert.match(c, /^## 3\.6 /m);
    assert.match(c, /^### 3\.6\.1 /m);
    assert.match(c, /^### 3\.6\.2 /m);
    assert.match(c, /^### 3\.6\.3 /m);
  });
  it('3 个子节分别引用 execution_logs / security / data-analysis', () => {
    const section = c.match(/^## 3\.6[\s\S]*?(?=^## 3\.7)/m)?.[0] || '';
    assert.match(section, /execution_logs/);
    assert.match(section, /security/);
    assert.match(section, /data-analysis/);
  });
});

describe('AC-7: contract.md § 3.7 Cross-Reference 强制规则', () => {
  const c = read('contract');

  it('§ 3.7 标题存在', () => {
    assert.match(c, /^## 3\.7 Cross-Reference/m);
  });
  it('含 wiki link [[]] + frontmatter related: + bootstrap 三要素', () => {
    const section = c.match(/^## 3\.7[\s\S]*?(?=^## )/m)?.[0] || '';
    assert.match(section, /wiki link|\[\[/);
    assert.match(section, /related/);
    assert.match(section, /bootstrap/);
  });
});

describe('AC-8: contract.md § 10.5 Obsidian Tag 层级', () => {
  const c = read('contract');

  it('§ 10.5 标题存在', () => {
    assert.match(c, /^## 10\.5/m);
  });
  it('含 7 个类别的 tag 前缀映射', () => {
    const section = c.match(/^## 10\.5[\s\S]*$/m)?.[0] || '';
    // tag 行至少 7 行 | Cat N |
    for (const cat of ['Cat 1', 'Cat 2', 'Cat 3', 'Cat 4', 'Cat 5', 'Cat 6', 'Cat 7']) {
      assert.ok(section.includes(cat), `§ 10.5 应含 ${cat}`);
    }
  });
});

// ──────────────────────────────────────────────────────────
// AC-9: toolBox/CLAUDE.md ### KI Layer 加 7 大类小节
// ──────────────────────────────────────────────────────────
// 2026-08-03 REQ-20260803-184500: Layer Details 下放 — CLAUDE.md 只留指针,细节断言移到 KI/README.md
describe('AC-9: KI 层细则 — CLAUDE.md 指针 + KI/README.md 7 大类', () => {
  const c = read('toolboxClaude');
  const ki = read('kiReadme');

  it('CLAUDE.md 指向 KI/README.md', () => {
    assert.match(c, /KI\/README\.md/);
  });
  it('KI/README.md 含 "7 大类" 关键词', () => {
    assert.match(ki, /7 大类/);
  });
  it('KI/README.md 含 Cross-Reference 说明', () => {
    assert.match(ki, /Cross-Reference/);
  });
  it('KI/README.md 引用 KI/Internal_KI/contract.md', () => {
    assert.match(ki, /KI\/Internal_KI\/contract\.md/);
  });
});

// ──────────────────────────────────────────────────────────
// AC-10: Regression — 现有 PAT-001..005 frontmatter 仍可解析
// ──────────────────────────────────────────────────────────
describe('AC-10: 现有 PAT-* frontmatter 无 regression', () => {
  const files = readdirSync(PATHS.patternsDir).filter(f => f.startsWith('PAT-') && f.endsWith('.md'));

  it('patterns/ 目录含至少 5 个 PAT-* 文件', () => {
    assert.ok(files.length >= 5, `期望 ≥ 5,实际 ${files.length}`);
  });
  for (const f of files) {
    it(`${f} frontmatter 可解析`, () => {
      const content = readFileSync(resolve(PATHS.patternsDir, f), 'utf-8');
      const fm = parseFrontmatter(content);
      assert.ok(fm !== null, `${f} frontmatter 必须合法`);
      assert.match(fm, /^id:/m);
      assert.match(fm, /^type:/m);
    });
  }
});

// ──────────────────────────────────────────────────────────
// AC-11: Regression — 冻结索引仍 frozen=true
// ──────────────────────────────────────────────────────────
describe('AC-11: 冻结索引文件状态未变', () => {
  it('Internal_KI/index.json 仍 frozen=true', () => {
    const d = JSON.parse(read('internalKIIndex'));
    assert.equal(d._meta?.frozen, true, 'Internal_KI/index.json 必须保持冻结');
  });
  it('Error_Book/index.json 仍 frozen=true', () => {
    const d = JSON.parse(read('errorBookIndex'));
    assert.equal(d._meta?.frozen, true, 'Error_Book/index.json 必须保持冻结');
  });
});

// ──────────────────────────────────────────────────────────
// AC-12: Cross-Reference 元一致性 — 7 大类同时被 contract + README + CLAUDE.md 引用
// ──────────────────────────────────────────────────────────
describe('AC-12: 7 大类 grep 元一致性', () => {
  const contract = read('contract');
  const readme = read('templatesReadme');
  // 2026-08-03: 常驻文档一侧由 CLAUDE.md 改为 KI/README.md(Layer Details 下放)
  const claude = read('kiReadme');

  it('三处文档均引用 "execution_logs"', () => {
    assert.match(contract, /execution_logs/);
    assert.match(readme, /execution_logs/);
    assert.match(claude, /execution_logs/);
  });
  it('三处文档均引用 "security"(Cat 4)', () => {
    assert.match(contract, /Internal_KI\/security/);
    assert.match(readme, /Internal_KI\/security/);
    assert.match(claude, /Internal_KI\/security/);
  });
  it('三处文档均引用 "data-analysis"', () => {
    assert.match(contract, /data-analysis/);
    assert.match(readme, /data-analysis/);
    assert.match(claude, /data-analysis/);
  });
  it('三处文档均提到 trigger_condition 或 patterns/ 双用机制', () => {
    assert.match(contract, /trigger_condition/);
    assert.match(readme, /trigger_condition|user_explicit|quality_audit/);
    assert.match(claude, /user_explicit|quality_audit|patterns/);
  });
});
