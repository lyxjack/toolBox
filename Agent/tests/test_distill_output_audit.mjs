/**
 * test_distill_output_audit.mjs — P2 /distill 输出 audit 测试 (end-to-end)
 *
 * 与 test_distill_structure.mjs(skill/workflow 文档结构)+
 * test_distill_integration.mjs(hook 链路)不同 — 本测试**端到端审计**
 * /distill 实际写入的 Obsidian 笔记是否符合 P0 contract 规范:
 *   1. 必填 frontmatter 字段(对照 contract § 3.6.1 / pattern_entry.tmpl / error_book_entry.tmpl)
 *   2. wiki link 目标真实存在(无孤儿)
 *   3. cross-ref gate(每条 ≥ 1 wiki link 或 bootstrap: true)
 *   4. schema 字段与模板一致(execution_log 不该有 complements 等 PAT 专用字段)
 *
 * Run: node --test Agent/tests/test_distill_output_audit.mjs
 *
 * 设计思路:与 unit/integration 互补 — unit 验证文档结构,integration 验证 hook 链路,
 * output audit 验证**实际产物**(skill 跑完后的输出)符合契约。
 *
 * 复用 P0 7 大类:execution_logs / patterns / Error_Book/entries / security / data-analysis。
 *
 * 容错:如果某类目录无 distill 产物(冷启动 / 空目录),跳过该类(不算 fail)。
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const KI_PATHS = {
  execLogs: resolve(ROOT, 'KI/Internal_KI/execution_logs'),
  patterns: resolve(ROOT, 'KI/Internal_KI/patterns'),
  security: resolve(ROOT, 'KI/Internal_KI/security'),
  dataAnalysis: resolve(ROOT, 'KI/Internal_KI/data-analysis'),
  errorBook: resolve(ROOT, 'KI/Error_Book/entries'),
};

// 必填 schema(对照 contract.md § 3.6.1 + 模板)
const SCHEMA = {
  execution_log: {
    required: ['id', 'type', 'req_ref', 'status', 'created', 'tags', 'related', 'aliases'],
    forbidden: ['complements'], // 这是 PAT 专用字段,EXEC 不该有
    idPattern: /^EXEC-\d{4}-\d{2}-\d{2}-/,
    reqRefPattern: /^(REQ-\d{8}-\d{6}|PLAN-)/, // 允许 REQ 或 PLAN
  },
  pattern: {
    required: ['id', 'type', 'title', 'status', 'created', 'trigger_condition', 'tags', 'aliases'],
    forbidden: [], // pattern 允许 complements 和 related 并存
    idPattern: /^PAT-\d{3}$/,
    triggerConditionEnum: ['user_explicit', 'quality_audit', 'both'],
  },
  error: {
    required: ['id', 'type', 'errorCode', 'severity', 'status', 'recurrence', 'firstSeen', 'tags', 'prevention', 'aliases'],
    forbidden: ['complements'], // ERR 模板/ERR-001 都没用,新条目也不该用
    idPattern: /^ERR-\d{3}$/,
    severityEnum: ['critical', 'high', 'medium', 'low'],
  },
};

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('\n---', 4);
  if (end === -1) return null;
  return content.slice(4, end);
}

function listEntries(dir, extension = '.md') {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith(extension) && f !== 'README.md' && f !== '.gitkeep')
    .map(f => resolve(dir, f));
}

function extractWikiLinks(content) {
  // Obsidian 不解析代码块/行内代码中的 [[...]],文档示例性链接不算真实引用(也不满足 cross-ref gate)
  const stripped = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  const matches = stripped.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);
  // markdown 表格内合法的 Obsidian 别名链接写法是 [[target\|alias]],去掉转义符落入 target 的尾部 `\`
  return [...matches].map(m => m[1].replace(/\\$/, ''));
}

function findInVault(target) {
  // target 可能带或不带 .md;在 KI/ 全 vault 搜索
  for (const dir of [KI_PATHS.execLogs, KI_PATHS.patterns, KI_PATHS.security, KI_PATHS.dataAnalysis, KI_PATHS.errorBook, resolve(ROOT, 'KI/Internal_KI/decisions'), resolve(ROOT, 'KI/Internal_KI/lessons')]) {
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir);
    if (files.some(f => f === target || f === `${target}.md` || basename(f, '.md') === target)) {
      return true;
    }
  }
  return false;
}

function fieldExists(fm, field) {
  // YAML frontmatter parse(简化):匹配 `field:` 在行首
  const re = new RegExp(`^${field}\\s*:`, 'm');
  return re.test(fm);
}

function getFieldValue(fm, field) {
  const re = new RegExp(`^${field}\\s*:\\s*(.+?)$`, 'm');
  const m = fm.match(re);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}

// ──────────────────────────────────────────────────────────
// Audit-1: execution_logs/ — 必填字段 + req_ref pattern + 禁用 complements
// ──────────────────────────────────────────────────────────
describe('Audit-1: execution_logs/ 条目合规', () => {
  const files = listEntries(KI_PATHS.execLogs);

  it('execution_logs/ 至少 1 个条目(冷启动后应有)', () => {
    assert.ok(files.length >= 1, `execution_logs/ 应有 distill 产物,实际 ${files.length}`);
  });

  for (const f of files) {
    const name = basename(f);
    const content = readFileSync(f, 'utf-8');
    const fm = parseFrontmatter(content);

    it(`${name} 必填字段齐全`, () => {
      assert.ok(fm !== null, `${name} 必须有 frontmatter`);
      for (const field of SCHEMA.execution_log.required) {
        assert.ok(fieldExists(fm, field), `${name} 缺必填字段 ${field}`);
      }
    });

    it(`${name} 禁用字段不存在(complements 是 PAT 专用)`, () => {
      for (const field of SCHEMA.execution_log.forbidden) {
        assert.ok(!fieldExists(fm, field), `${name} 不应有 ${field}(execution_log 模板未定义)`);
      }
    });

    it(`${name} id 符合 EXEC-YYYY-MM-DD-* pattern`, () => {
      const id = getFieldValue(fm, 'id');
      assert.match(id, SCHEMA.execution_log.idPattern, `${name} id="${id}" 不符合 pattern`);
    });

    it(`${name} req_ref 符合 REQ-*|PLAN-* pattern`, () => {
      const ref = getFieldValue(fm, 'req_ref');
      assert.match(ref, SCHEMA.execution_log.reqRefPattern, `${name} req_ref="${ref}" 不符合 pattern`);
    });
  }
});

// ──────────────────────────────────────────────────────────
// Audit-2: patterns/ — 含 trigger_condition + 枚举值合法
// ──────────────────────────────────────────────────────────
describe('Audit-2: patterns/ 条目合规', () => {
  const files = listEntries(KI_PATHS.patterns);

  it('patterns/ 至少 1 个 PAT-* 条目', () => {
    const patFiles = files.filter(f => basename(f).startsWith('PAT-'));
    assert.ok(patFiles.length >= 1, `patterns/ 应有 PAT-* 条目,实际 ${patFiles.length}`);
  });

  for (const f of files) {
    const name = basename(f);
    if (!name.startsWith('PAT-')) continue;
    const content = readFileSync(f, 'utf-8');
    const fm = parseFrontmatter(content);

    it(`${name} 必填字段齐全`, () => {
      assert.ok(fm !== null);
      for (const field of SCHEMA.pattern.required) {
        // trigger_condition 是 P0 新增,旧 PAT-001..005 可能没有 → 仅对新条目(created >= 2026-05-17)强制
        if (field === 'trigger_condition') {
          const created = getFieldValue(fm, 'created');
          if (created && created >= '2026-05-17') {
            assert.ok(fieldExists(fm, field), `${name}(${created}) 缺 trigger_condition`);
          }
        } else {
          assert.ok(fieldExists(fm, field), `${name} 缺字段 ${field}`);
        }
      }
    });

    it(`${name} id 符合 PAT-NNN pattern`, () => {
      const id = getFieldValue(fm, 'id');
      assert.match(id, SCHEMA.pattern.idPattern, `${name} id="${id}"`);
    });

    it(`${name} trigger_condition 枚举值合法(若存在)`, () => {
      const tc = getFieldValue(fm, 'trigger_condition');
      if (tc !== null) {
        assert.ok(SCHEMA.pattern.triggerConditionEnum.includes(tc),
          `${name} trigger_condition="${tc}" 不在枚举 ${SCHEMA.pattern.triggerConditionEnum.join('|')}`);
      }
    });
  }
});

// ──────────────────────────────────────────────────────────
// Audit-3: Error_Book/entries/ — 禁用 complements + severity 枚举
// ──────────────────────────────────────────────────────────
describe('Audit-3: Error_Book/entries/ 条目合规', () => {
  const files = listEntries(KI_PATHS.errorBook).filter(f => basename(f).startsWith('ERR-'));

  it('Error_Book/entries/ 至少 1 个 ERR-* 条目', () => {
    assert.ok(files.length >= 1);
  });

  for (const f of files) {
    const name = basename(f);
    const content = readFileSync(f, 'utf-8');
    const fm = parseFrontmatter(content);

    it(`${name} 必填字段齐全`, () => {
      for (const field of SCHEMA.error.required) {
        assert.ok(fieldExists(fm, field), `${name} 缺 ${field}`);
      }
    });

    it(`${name} severity 枚举值合法`, () => {
      const sev = getFieldValue(fm, 'severity');
      assert.ok(SCHEMA.error.severityEnum.includes(sev),
        `${name} severity="${sev}" 不在枚举`);
    });

    it(`${name} 禁用字段不存在(complements 是 PAT 专用)`, () => {
      // 仅对本 P2 distill 新创建的 ERR-027+ 强制(旧 ERR-001..026 不动)
      const id = getFieldValue(fm, 'id');
      const idNum = parseInt(id.replace('ERR-', ''), 10);
      if (idNum >= 27) {
        for (const field of SCHEMA.error.forbidden) {
          assert.ok(!fieldExists(fm, field), `${name}(新条目)不应有 ${field}`);
        }
      }
    });
  }
});

// ──────────────────────────────────────────────────────────
// Audit-4: Cross-Reference Gate — 每条 distill 新产物 ≥ 1 wiki link OR bootstrap
//   范围 = execution_logs 全部 + PAT-006+ + ERR-027+(本次 distill 产出的)
// ──────────────────────────────────────────────────────────
describe('Audit-4: Cross-Reference Gate(本次 distill 产物)', () => {
  const distillProducts = [
    ...listEntries(KI_PATHS.execLogs),
    ...listEntries(KI_PATHS.patterns).filter(f => {
      const num = parseInt(basename(f).match(/^PAT-(\d+)/)?.[1] || '0', 10);
      return num >= 6;
    }),
    ...listEntries(KI_PATHS.errorBook).filter(f => {
      const num = parseInt(basename(f).match(/^ERR-(\d+)/)?.[1] || '0', 10);
      return num >= 27;
    }),
  ];

  for (const f of distillProducts) {
    const name = basename(f);
    const content = readFileSync(f, 'utf-8');
    const fm = parseFrontmatter(content);

    it(`${name}: ≥ 1 wiki link OR bootstrap: true`, () => {
      const linkCount = extractWikiLinks(content).length;
      const isBootstrap = fieldExists(fm, 'bootstrap') && getFieldValue(fm, 'bootstrap') === 'true';
      assert.ok(linkCount >= 1 || isBootstrap,
        `${name}: 0 wiki link 且无 bootstrap: true → 违反 Cross-Ref Gate`);
    });
  }
});

// ──────────────────────────────────────────────────────────
// Audit-5: Wiki link 目标真实存在(无孤儿)
//   范围 = 本次 P2 distill 直接产物(execution_logs/ + 新 PAT-006+ + 新 ERR-027+)
//   不审计早期 ERR-019..026(P2 前从外部沉淀,可能引用项目级笔记)
// ──────────────────────────────────────────────────────────
describe('Audit-5: Wiki link 目标真实性(本次 distill 产物)', () => {
  // 限定 = execution_logs 全部(都是 P2 之后)+ PAT-006+(P0 后)+ ERR-027+(P2 后)
  const distillProducts = [
    ...listEntries(KI_PATHS.execLogs),
    ...listEntries(KI_PATHS.patterns).filter(f => {
      const name = basename(f);
      if (!name.startsWith('PAT-')) return false;
      const num = parseInt(name.match(/^PAT-(\d+)/)?.[1] || '0', 10);
      return num >= 6;
    }),
    ...listEntries(KI_PATHS.errorBook).filter(f => {
      const name = basename(f);
      if (!name.startsWith('ERR-')) return false;
      const num = parseInt(name.match(/^ERR-(\d+)/)?.[1] || '0', 10);
      return num >= 27;
    }),
  ];

  it('distill 产物清单 ≥ 1(冷启动后)', () => {
    assert.ok(distillProducts.length >= 1, `期望 ≥ 1 distill 产物,实际 ${distillProducts.length}`);
  });

  for (const f of distillProducts) {
    const name = basename(f);
    const content = readFileSync(f, 'utf-8');
    const links = [...new Set(extractWikiLinks(content))];

    it(`${name}: wiki link 目标全在 vault(无孤儿)`, () => {
      const orphans = links.filter(t => !findInVault(t));
      assert.equal(orphans.length, 0,
        `${name}: 孤儿链接 ${orphans.join(', ')}`);
    });
  }
});
