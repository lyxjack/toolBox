/**
 * test_distill_structure.mjs — Unit tests for P2 /distill 链路 (REQ-20260517-043739)
 *
 * 验证:
 *  - SKILL.md frontmatter + body 引用 workflow.md
 *  - workflow.md 7+ H2 + 7 类决策树 + Obsidian MCP 函数 + bootstrap + archived_to + ERR-007
 *  - post-push-ci.mjs 柔提示 + 5th status
 *  - pre-commit-hook.mjs 串入 DISTILL_TEST_PATH + graceful skip
 *
 * Run: node --test Agent/tests/test_distill_structure.mjs
 *
 * 设计思路:与 test_obsidian_structure.mjs 同模式 — 静态 grep + 行数 + 文件存在性,
 * 无外部依赖,作为 pre-commit/post-push CI 回归 baseline。
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const PATHS = {
  skill: resolve(ROOT, '.claude/skills/distill/SKILL.md'),
  workflow: resolve(ROOT, 'Agent/workflow/distill.md'),
  postPushCi: resolve(ROOT, 'Agent/lint/post-push-ci.mjs'),
  preCommit: resolve(ROOT, 'Agent/lint/pre-commit-hook.mjs'),
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
// AC-1: SKILL.md frontmatter + body
// ──────────────────────────────────────────────────────────
describe('AC-1: SKILL.md', () => {
  it('skill 文件存在', () => {
    assert.ok(existsSync(PATHS.skill), 'SKILL.md 必须存在');
  });
  it('frontmatter 含 name: distill', () => {
    const fm = parseFrontmatter(read('skill'));
    assert.ok(fm !== null, 'frontmatter 必须以 --- 开闭');
    assert.match(fm, /^name:\s*distill\s*$/m, 'name 字段必须为 distill');
  });
  it('frontmatter 含 description', () => {
    const fm = parseFrontmatter(read('skill'));
    assert.match(fm, /^description:\s*\S/m, 'description 字段必须非空');
  });
  it('body 含 Agent/workflow/distill.md 引用', () => {
    assert.match(read('skill'), /Agent\/workflow\/distill\.md/);
  });
});

// ──────────────────────────────────────────────────────────
// AC-2: workflow.md 总体结构
// ──────────────────────────────────────────────────────────
describe('AC-2: workflow.md 结构', () => {
  it('文件存在', () => {
    assert.ok(existsSync(PATHS.workflow), 'workflow.md 必须存在');
  });
  it('含至少 7 个 ## 二级标题', () => {
    const matches = read('workflow').match(/^## /gm) || [];
    assert.ok(matches.length >= 7, `期望 ≥ 7 个 H2,实际 ${matches.length}`);
  });
  it('含 frontmatter description', () => {
    const fm = parseFrontmatter(read('workflow'));
    assert.ok(fm !== null, 'frontmatter 必须存在');
    assert.match(fm, /^description:\s*\S/m, 'description 字段必须非空');
  });
  it('文件长度 ≤ 350 行 (C4 Simplicity 硬约束)', () => {
    const lines = read('workflow').split('\n').length;
    assert.ok(lines <= 350, `期望 ≤ 350 行,实际 ${lines}`);
  });
});

// ──────────────────────────────────────────────────────────
// AC-3: 7 类决策树
// ──────────────────────────────────────────────────────────
describe('AC-3: 7 类决策树', () => {
  const wf = () => read('workflow');

  it('主动写: Cat 2 / Cat 3 / Cat 4 / Cat 6 均命中', () => {
    const c = wf();
    for (const cat of ['Cat 2', 'Cat 3', 'Cat 4', 'Cat 6']) {
      assert.ok(c.includes(cat), `workflow.md 应含 "${cat}"`);
    }
  });
  it('跳过: Cat 1 / Cat 5 / Cat 7 + "跳过" 关键词命中', () => {
    const c = wf();
    for (const cat of ['Cat 1', 'Cat 5', 'Cat 7']) {
      assert.ok(c.includes(cat), `workflow.md 应含 "${cat}"`);
    }
    assert.match(c, /跳过/, 'workflow.md 应含 "跳过" 关键词说明 Cat 1/5/7 处理');
  });
});

// ──────────────────────────────────────────────────────────
// AC-4: Obsidian MCP 调用
// ──────────────────────────────────────────────────────────
describe('AC-4: Obsidian MCP 调用', () => {
  const wf = () => read('workflow');

  it('含 obsidian_search_notes', () => {
    assert.match(wf(), /obsidian_search_notes/);
  });
  it('含 obsidian_write_note', () => {
    assert.match(wf(), /obsidian_write_note/);
  });
  it('含 obsidian_patch_note', () => {
    assert.match(wf(), /obsidian_patch_note/);
  });
});

// ──────────────────────────────────────────────────────────
// AC-5: Cross-Ref Gate + Memory Cleanup + Fallback
// ──────────────────────────────────────────────────────────
describe('AC-5: Cross-Ref Gate + Memory Cleanup + Fallback', () => {
  const wf = () => read('workflow');

  it('含 bootstrap (cross-ref 例外标记)', () => {
    assert.match(wf(), /bootstrap/);
  });
  it('含 archived_to (memory cleanup 标记)', () => {
    assert.match(wf(), /archived_to/);
  });
  it('含 "user 类不动" 或等价说明', () => {
    const c = wf();
    // 验证既提到 user 类,又有否定/不动语义
    assert.match(c, /user\s*类/, 'workflow.md 应提及 "user 类"');
    assert.match(c, /不动|不该动|不删除/, 'workflow.md 应有否定动作关键词');
  });
  it('含 ERR-007 (fallback 引用)', () => {
    assert.match(wf(), /ERR-007/);
  });
});

// ──────────────────────────────────────────────────────────
// AC-6: post-push-ci.mjs 柔提示 + 5th status
// ──────────────────────────────────────────────────────────
describe('AC-6: post-push-ci.mjs 柔提示 + 5th status', () => {
  const cc = () => read('postPushCi');

  it('含 DISTILL_TEST_PATH 常量', () => {
    assert.match(cc(), /DISTILL_TEST_PATH/);
  });
  it('4 层 CI 全过分支含 💡 和 /distill 文字', () => {
    const c = cc();
    assert.match(c, /💡/, '应有 💡 柔提示标识');
    assert.match(c, /\/distill/, '应引用 /distill 命令');
  });
  it('additionalContext 含 "Distill Skill Structure" status 标识', () => {
    assert.match(cc(), /Distill Skill Structure/);
  });
});

// ──────────────────────────────────────────────────────────
// AC-7: pre-commit-hook.mjs 串入 DISTILL_TEST_PATH + graceful skip
// ──────────────────────────────────────────────────────────
describe('AC-7: pre-commit-hook.mjs 串入', () => {
  const pc = () => read('preCommit');

  it('含 DISTILL_TEST_PATH 常量', () => {
    assert.match(pc(), /DISTILL_TEST_PATH/);
  });
  it('含 existsSync(DISTILL_TEST_PATH) graceful skip 检查', () => {
    assert.match(pc(), /existsSync\(DISTILL_TEST_PATH\)/);
  });
});
