/**
 * test_mem_link.mjs — Unit tests for claude-mem 双向关联机制 (REQ-20260609-210628 T5)
 *
 * 验证:
 *  - AC-3: skill_registry.json externalPlugins 注册 + master_index.json 顶层引用 + anchors 无回归
 *  - AC-5: 5 个 KI/Templates 模板 frontmatter 含 mem_ref / mem_status + contract.md § 3.8 字段契约
 *  - AC-4/AC-7: distill.md Phase 6.5 额外必填 + 枚举行 + Phase 7 mem 关联获取 + 降级规则 + 行数/H2 约束
 *  - AC-4: pm_workflow / cto_planning / CLAUDE.md 召回规则 — "参考,不构成约束" 语义一致
 *
 * Run: node --test Agent/tests/test_mem_link.mjs
 *
 * 设计思路:与 test_distill_structure.mjs 同模式 — 静态 grep + JSON 解析 + 行数 + 文件存在性,
 * 无外部依赖(不要求 claude-mem worker 在线),作为 pre-commit/post-push CI 回归 baseline。
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const PATHS = {
  skillRegistry: resolve(ROOT, 'Agent/index/skill_registry.json'),
  masterIndex: resolve(ROOT, 'KI/External_KI/master_index.json'),
  contract: resolve(ROOT, 'KI/Internal_KI/contract.md'),
  workflow: resolve(ROOT, 'Agent/workflow/distill.md'),
  pmWorkflow: resolve(ROOT, 'PM/pm_workflow.md'),
  ctoPlanning: resolve(ROOT, 'Agent/workflow/cto_planning.md'),
  claudeMd: resolve(ROOT, 'CLAUDE.md'),
};

const TEMPLATE_FILES = [
  'error_book_entry.tmpl.md',
  'pattern_entry.tmpl.md',
  'execution_log.tmpl.md',
  'security_config.tmpl.md',
  'data_analysis.tmpl.md',
];

function read(key) {
  return readFileSync(PATHS[key], 'utf-8');
}

function readJson(key) {
  return JSON.parse(read(key));
}

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('\n---', 4);
  if (end === -1) return null;
  return content.slice(4, end);
}

// ──────────────────────────────────────────────────────────
// AC-3: 注册 — skill_registry.json + master_index.json
// ──────────────────────────────────────────────────────────
describe('AC-3: claude-mem 注册 (skill_registry + master_index)', () => {
  it('skill_registry.json 可解析为 JSON', () => {
    assert.ok(existsSync(PATHS.skillRegistry), 'skill_registry.json 必须存在');
    assert.doesNotThrow(() => readJson('skillRegistry'), 'skill_registry.json 必须是合法 JSON');
  });
  it('externalPlugins 为数组且含 name === "claude-mem" 条目', () => {
    const reg = readJson('skillRegistry');
    assert.ok(Array.isArray(reg.externalPlugins), 'externalPlugins 必须是数组');
    const entry = reg.externalPlugins.find((p) => p.name === 'claude-mem');
    assert.ok(entry, 'externalPlugins 必须含 name === "claude-mem" 的条目');
  });
  it('claude-mem 条目含 version / source / dataPath / governanceNote 字段', () => {
    const entry = readJson('skillRegistry').externalPlugins.find((p) => p.name === 'claude-mem');
    for (const field of ['version', 'source', 'dataPath', 'governanceNote']) {
      assert.ok(entry[field], `claude-mem 条目必须含非空 ${field} 字段`);
    }
  });
  it('claude-mem workerPort === 37701 (固定端口,ERR-006 预防规则)', () => {
    const entry = readJson('skillRegistry').externalPlugins.find((p) => p.name === 'claude-mem');
    assert.strictEqual(entry.workerPort, 37701, 'workerPort 必须为 37701');
  });
  it('claude-mem capabilities 为非空数组', () => {
    const entry = readJson('skillRegistry').externalPlugins.find((p) => p.name === 'claude-mem');
    assert.ok(Array.isArray(entry.capabilities), 'capabilities 必须是数组');
    assert.ok(entry.capabilities.length > 0, 'capabilities 不能为空');
  });
  it('skill_registry 仍含原 anchors key (无回归)', () => {
    const reg = readJson('skillRegistry');
    assert.ok('anchors' in reg, '注册 externalPlugins 不得破坏原 anchors 结构');
  });
  it('master_index.json 可解析且 externalPlugins[0].name === "claude-mem"', () => {
    assert.ok(existsSync(PATHS.masterIndex), 'master_index.json 必须存在');
    const mi = readJson('masterIndex');
    assert.ok(Array.isArray(mi.externalPlugins), 'master_index externalPlugins 必须是数组');
    assert.strictEqual(mi.externalPlugins[0]?.name, 'claude-mem');
  });
  it('master_index claude-mem registryRef 指向 skill_registry#externalPlugins', () => {
    const mi = readJson('masterIndex');
    assert.strictEqual(
      mi.externalPlugins[0]?.registryRef,
      'Agent/index/skill_registry.json#externalPlugins',
      'registryRef 必须指向 Agent/index/skill_registry.json#externalPlugins'
    );
  });
});

// ──────────────────────────────────────────────────────────
// AC-5: 5 个模板 frontmatter 含 mem_ref / mem_status
// ──────────────────────────────────────────────────────────
describe('AC-5: KI/Templates 模板 mem 字段', () => {
  for (const file of TEMPLATE_FILES) {
    const path = resolve(ROOT, 'KI/Templates', file);

    it(`${file}: frontmatter 含 mem_ref: 与 mem_status: 行`, () => {
      assert.ok(existsSync(path), `${file} 必须存在`);
      const fm = parseFrontmatter(readFileSync(path, 'utf-8'));
      assert.ok(fm !== null, `${file} frontmatter 必须以 --- 开闭`);
      assert.match(fm, /^mem_ref:/m, `${file} frontmatter 必须含 mem_ref: 行`);
      assert.match(fm, /^mem_status:/m, `${file} frontmatter 必须含 mem_status: 行`);
    });

    it(`${file}: mem_status 行同时提及 linked 与 unavailable`, () => {
      const fm = parseFrontmatter(readFileSync(path, 'utf-8'));
      const line = fm.split('\n').find((l) => l.startsWith('mem_status:'));
      assert.ok(line, `${file} 必须有 mem_status: 行`);
      assert.ok(line.includes('linked'), `${file} mem_status 行必须提及 linked`);
      assert.ok(line.includes('unavailable'), `${file} mem_status 行必须提及 unavailable`);
    });
  }
});

// ──────────────────────────────────────────────────────────
// AC-5: contract.md § 3.8 字段契约
// ──────────────────────────────────────────────────────────
describe('AC-5: contract.md § 3.8', () => {
  // 取 § 3.8 节内容(到下一个 H2 为止),保证关键词在本节而非全文偶然命中
  function section38() {
    const c = read('contract');
    const start = c.search(/^## 3\.8/m);
    assert.ok(start !== -1, 'contract.md 必须含 "## 3.8" 标题');
    const rest = c.slice(start);
    const next = rest.slice(6).search(/^## /m);
    return next === -1 ? rest : rest.slice(0, next + 6);
  }

  it('含 ## 3.8 标题', () => {
    assert.match(read('contract'), /^## 3\.8/m);
  });
  it('§ 3.8 定义 mem_ref / mem_status 字段', () => {
    const s = section38();
    assert.match(s, /mem_ref/, '§ 3.8 必须定义 mem_ref');
    assert.match(s, /mem_status/, '§ 3.8 必须定义 mem_status');
  });
  it('§ 3.8 含 content_session_id / sdk_sessions 关联目标说明', () => {
    const s = section38();
    assert.match(s, /content_session_id/, '§ 3.8 必须含 content_session_id');
    assert.match(s, /sdk_sessions/, '§ 3.8 必须含 sdk_sessions');
  });
  it('§ 3.8 含降级关键词 (unavailable + 不[可]阻塞)', () => {
    const s = section38();
    assert.match(s, /unavailable/, '§ 3.8 必须含 unavailable 降级值');
    assert.match(s, /不可?阻塞/, '§ 3.8 必须声明降级不阻塞流程');
  });
  it('§ 3.8 含存量条目免回填豁免', () => {
    const s = section38();
    assert.match(s, /存量/, '§ 3.8 必须提及存量条目');
    assert.match(s, /回填/, '§ 3.8 必须提及回填豁免');
  });
});

// ──────────────────────────────────────────────────────────
// AC-4/AC-7: distill.md workflow — Phase 6.5 / Phase 7 mem 链路
// ──────────────────────────────────────────────────────────
describe('AC-4/AC-7: distill.md mem 链路', () => {
  const wf = () => read('workflow');

  it('Phase 6.5 含 "所有 type 额外必填" 注记 (mem_ref + mem_status, contract § 3.8)', () => {
    const c = wf();
    const note = c.split('\n').find((l) => l.includes('额外必填'));
    assert.ok(note, 'distill.md 必须含 "额外必填" 注记行');
    assert.ok(note.includes('mem_ref'), '额外必填注记必须含 mem_ref');
    assert.ok(note.includes('mem_status'), '额外必填注记必须含 mem_status');
    assert.ok(note.includes('contract § 3.8'), '额外必填注记必须引用 contract § 3.8');
  });
  it('6.5.2 枚举表含 mem_status 行 (linked / unavailable)', () => {
    assert.match(
      wf(),
      /\|\s*`\*\.mem_status`\s*\|\s*`linked`\s*\/\s*`unavailable`/,
      '6.5.2 枚举表必须含 `*.mem_status` | `linked` / `unavailable` 行'
    );
  });
  it('Phase 7 含 "### 写入前: mem 关联获取" 小节', () => {
    assert.match(wf(), /^### 写入前: mem 关联获取/m);
  });
  it('含 sqlite 只读查询 (mode=ro)', () => {
    assert.match(wf(), /mode=ro/, 'sqlite 查询必须用 mode=ro 只读模式');
  });
  it('降级行同时含 mem_status: unavailable 与 不阻塞', () => {
    const line = wf().split('\n').find(
      (l) => l.includes('mem_status: unavailable') && l.includes('不阻塞')
    );
    assert.ok(line, 'distill.md 必须有同时含 "mem_status: unavailable" 与 "不阻塞" 的降级行');
  });
  it('文件长度 ≤ 350 行 (C4 Simplicity 硬约束)', () => {
    const lines = wf().split('\n').length;
    assert.ok(lines <= 350, `期望 ≤ 350 行,实际 ${lines}`);
  });
  it('含至少 7 个 ## 二级标题', () => {
    const matches = wf().match(/^## /gm) || [];
    assert.ok(matches.length >= 7, `期望 ≥ 7 个 H2,实际 ${matches.length}`);
  });
});

// ──────────────────────────────────────────────────────────
// AC-4: 召回规则 — pm_workflow / cto_planning / CLAUDE.md
// ──────────────────────────────────────────────────────────
describe('AC-4: 召回规则 (参考,不构成约束)', () => {
  it('pm_workflow.md Step 4 召回区域含 claude-mem', () => {
    const c = read('pmWorkflow');
    const start = c.indexOf('### Step 4: 召回上下文');
    assert.ok(start !== -1, 'pm_workflow.md 必须含 "### Step 4: 召回上下文"');
    const end = c.indexOf('### Step 4.5', start);
    const region = end === -1 ? c.slice(start) : c.slice(start, end);
    assert.ok(region.includes('claude-mem'), 'Step 4 召回区域必须含 claude-mem');
  });
  it('cto_planning.md 含 claude-mem', () => {
    assert.match(read('ctoPlanning'), /claude-mem/);
  });
  it('CLAUDE.md 含 双层记忆体系 + mem_ref', () => {
    const c = read('claudeMd');
    assert.match(c, /双层记忆体系/, 'CLAUDE.md 必须含 "双层记忆体系"');
    assert.match(c, /mem_ref/, 'CLAUDE.md 必须含 mem_ref 字段引用');
  });
  it('三处召回规则均含 "不构成约束" (语义一致性)', () => {
    for (const key of ['pmWorkflow', 'ctoPlanning', 'claudeMd']) {
      assert.ok(read(key).includes('不构成约束'), `${PATHS[key]} 必须含 "不构成约束"`);
    }
  });
});

// ──────────────────────────────────────────────────────────
// 分发保障: 他人 bootstrap/update 后自动获得一致的 claude-mem setup (v1.3.0)
// ──────────────────────────────────────────────────────────
describe('分发保障: claude-mem 自动安装链路 (v1.3.0)', () => {
  it('migration v1.3.0.mjs 存在且含 ensureClaudeMemPlugin 调用', () => {
    const p = resolve(ROOT, 'Agent/migrations/v1.3.0.mjs');
    assert.ok(existsSync(p), 'Agent/migrations/v1.3.0.mjs 必须存在(老用户 update 路径)');
    const c = readFileSync(p, 'utf-8');
    assert.match(c, /ensureClaudeMemPlugin/, 'migration 必须调用 ensureClaudeMemPlugin');
    assert.match(c, /patchGlobalClaudeMdMemSection/, 'migration 必须调用 patchGlobalClaudeMdMemSection');
  });
  it('bootstrap-utils.mjs 导出 ensureClaudeMemPlugin / patchGlobalClaudeMdMemSection,且 marketplace 用 HTTPS', () => {
    const c = readFileSync(resolve(ROOT, 'Agent/lib/bootstrap-utils.mjs'), 'utf-8');
    assert.match(c, /export function ensureClaudeMemPlugin/, '必须导出 ensureClaudeMemPlugin');
    assert.match(c, /export function patchGlobalClaudeMdMemSection/, '必须导出 patchGlobalClaudeMdMemSection');
    assert.match(c, /https:\/\/github\.com\/thedotmack\/claude-mem/, 'marketplace add 必须用 HTTPS URL(避免 SSH key 缺失失败)');
  });
  it('bootstrap.mjs 新用户路径含 setupClaudeMem 步骤', () => {
    const c = readFileSync(resolve(ROOT, 'bootstrap.mjs'), 'utf-8');
    assert.match(c, /setupClaudeMem\(\)/, 'main() 必须调用 setupClaudeMem()');
    assert.match(c, /claude-mem persistent memory/, '必须有 claude-mem 安装步骤标题');
  });
  it('全局 CLAUDE.md 模板含双层记忆体系节(新用户内容源 + 老用户补节来源)', () => {
    const c = readFileSync(resolve(ROOT, 'Agent/templates/global_claude_md.md'), 'utf-8');
    assert.match(c, /^## 双层记忆体系 — claude-mem × Obsidian KI/m, '模板必须含双层记忆体系 H2 节');
    assert.match(c, /mem_ref/, '模板节必须提及 mem_ref 双向关联要求');
    assert.match(c, /不构成约束/, '模板节必须保持"参考,不构成约束"语义');
  });
});

// ──────────────────────────────────────────────────────────
// AC-6 强制执行: 新建 KI entry (created/firstSeen ≥ 2026-06-10) 必须含 mem 字段
// contract § 3.8: 存量条目免回填,新建条目强制 — 本 suite 把规则升级为 CI gate
// ──────────────────────────────────────────────────────────
describe('AC-6: 新建 KI entry mem 字段强制 (cutoff 2026-06-10)', () => {
  const CUTOFF = '2026-06-10';
  const ENTRY_DIRS = [
    'KI/Internal_KI/patterns',
    'KI/Internal_KI/execution_logs',
    'KI/Internal_KI/security',
    'KI/Internal_KI/data-analysis',
    'KI/Error_Book/entries',
  ];

  function fmDate(fm) {
    // created (PAT/EXEC/SEC/DATA) 或 firstSeen (ERR);带引号或不带
    const m = fm.match(/^(?:created|firstSeen):\s*"?(\d{4}-\d{2}-\d{2})"?/m);
    return m ? m[1] : null;
  }

  const newEntries = [];
  for (const dir of ENTRY_DIRS) {
    const abs = resolve(ROOT, dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs).filter((n) => n.endsWith('.md'))) {
      const content = readFileSync(resolve(abs, f), 'utf-8');
      const fm = parseFrontmatter(content);
      if (!fm) continue;
      const date = fmDate(fm);
      if (date && date >= CUTOFF) newEntries.push({ name: `${dir}/${f}`, fm });
    }
  }

  it(`扫描完成 (本次发现 ${newEntries.length} 条 cutoff 后新 entry)`, () => {
    assert.ok(Array.isArray(newEntries));
  });

  for (const { name, fm } of newEntries) {
    it(`${name}: 含 mem_ref + mem_status 且取值合法`, () => {
      assert.match(fm, /^mem_ref:/m, `${name} 新建条目必须含 mem_ref (contract § 3.8)`);
      const statusLine = fm.match(/^mem_status:\s*"?(\w+)"?/m);
      assert.ok(statusLine, `${name} 新建条目必须含 mem_status`);
      assert.ok(
        ['linked', 'unavailable'].includes(statusLine[1]),
        `${name} mem_status 必须为 linked | unavailable,实际 ${statusLine[1]}`
      );
      const refLine = fm.match(/^mem_ref:\s*"?([^"\n]*)"?\s*$/m);
      if (statusLine[1] === 'linked') {
        assert.ok(refLine && refLine[1] && refLine[1] !== 'null', `${name} linked 时 mem_ref 必须非 null`);
      } else {
        assert.ok(refLine && (refLine[1] === 'null' || refLine[1] === ''), `${name} unavailable 时 mem_ref 必须为 null`);
      }
    });
  }
});
