/**
 * test_distill_integration.mjs — CI 钩子链集成测试 (P2 /distill REQ-20260517-043739)
 *
 * 目标:验证 pre-commit-hook.mjs + post-push-ci.mjs 能正确串入
 * test_distill_structure.mjs,并在 P2 /distill 结构破坏时正确 block。
 *
 * Run:
 *   单独跑: node --test Agent/tests/test_distill_integration.mjs
 *   全套跑: node --test --test-concurrency=1 Agent/tests/*.mjs
 *
 * **并发陷阱**: 与 test_complexity_gate_integration / test_p9_p11_governance_integration /
 * test_obsidian_structure_integration 一起跑时必须 --test-concurrency=1。四者 I3 都改写文件,
 * 并发时 hook 先碰到对方的 corruption 触发对方的 block reason,断言失败。
 *
 * 设计取舍:与 test_obsidian_structure_integration.mjs 同结构。
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const HOOK_DIR = resolve(__dirname, '..', 'lint');
const PRE_COMMIT_HOOK = resolve(HOOK_DIR, 'pre-commit-hook.mjs');
const POST_PUSH_CI = resolve(HOOK_DIR, 'post-push-ci.mjs');
const STRUCTURE_TEST = resolve(__dirname, 'test_distill_structure.mjs');
const SKILL_MD = resolve(ROOT, '.claude/skills/distill/SKILL.md');

function runHook(hookPath, stdinJson) {
  const result = spawnSync('node', [hookPath], {
    input: JSON.stringify(stdinJson),
    encoding: 'utf-8',
    timeout: 30000,
  });
  let parsed = null;
  try {
    parsed = JSON.parse(result.stdout.trim());
  } catch {}
  return { exitCode: result.status, parsed, stdout: result.stdout, stderr: result.stderr };
}

// 暂时把 structure test 文件搬走,验证 graceful skip
function withStructureTestMissing(fn) {
  const moved = `${STRUCTURE_TEST}.moved-for-test`;
  renameSync(STRUCTURE_TEST, moved);
  try {
    fn();
  } finally {
    renameSync(moved, STRUCTURE_TEST);
  }
}

// 暂时改坏 SKILL.md (name: distill → name: distill-DELETED),让 unit AC-1 失败
function withSkillCorrupted(fn) {
  const original = readFileSync(SKILL_MD, 'utf-8');
  const corrupted = original.replace(/^name: distill$/m, 'name: distill-DELETED');
  if (corrupted === original) {
    throw new Error('Failed to corrupt SKILL.md — name: distill 未找到');
  }
  writeFileSync(SKILL_MD, corrupted);
  try {
    fn();
  } finally {
    writeFileSync(SKILL_MD, original);
  }
}

// ──────────────────────────────────────────────────────────
// I1: 静态前置 — 两个 hook 文件 + structure test 文件都存在并已串入
// ──────────────────────────────────────────────────────────
describe('I1: 静态前置', () => {
  it('pre-commit-hook 存在并引用 DISTILL_TEST_PATH', () => {
    assert.ok(existsSync(PRE_COMMIT_HOOK));
    const content = readFileSync(PRE_COMMIT_HOOK, 'utf-8');
    assert.match(content, /DISTILL_TEST_PATH/, 'pre-commit-hook 必须串入 distill structure test');
    assert.match(content, /existsSync\(DISTILL_TEST_PATH\)/, 'hook 必须有 graceful skip 守卫');
  });
  it('post-push-ci 存在并含 Distill Skill Structure 标识', () => {
    assert.ok(existsSync(POST_PUSH_CI));
    const content = readFileSync(POST_PUSH_CI, 'utf-8');
    assert.match(content, /DISTILL_TEST_PATH/);
    assert.match(content, /Distill Skill Structure/, 'additionalContext 应有 Distill Skill Structure 标识');
  });
  it('distill structure unit test 存在', () => {
    assert.ok(existsSync(STRUCTURE_TEST));
  });
});

// ──────────────────────────────────────────────────────────
// I2: pre-commit hook 正例 — P2 /distill 结构完整 + git commit → approve
// ──────────────────────────────────────────────────────────
describe('I2: pre-commit hook 正例(P2 结构完整)', () => {
  it('git commit + structure test PASS → decision: approve', () => {
    const { parsed, exitCode, stderr } = runHook(PRE_COMMIT_HOOK, {
      tool_name: 'Bash',
      tool_input: { command: 'git commit -m "test"' },
    });
    assert.equal(exitCode, 0, `hook 应正常退出. stderr=${stderr?.slice(0, 200)}`);
    assert.ok(parsed, 'hook 输出必须是 JSON');
    assert.equal(parsed.decision, 'approve',
      `预期 approve,实际 ${parsed.decision}(reason: ${parsed.reason?.slice(0, 300)})`);
  });
});

// ──────────────────────────────────────────────────────────
// I3: pre-commit hook 反例 — SKILL.md name: distill 被改坏 → block
// ──────────────────────────────────────────────────────────
describe('I3: pre-commit hook 反例(SKILL.md name 被改坏)', () => {
  it('故意把 name: distill 改成 name: distill-DELETED → hook decision: block', () => {
    withSkillCorrupted(() => {
      const onDisk = readFileSync(SKILL_MD, 'utf-8');
      assert.match(onDisk, /^name: distill-DELETED$/m, 'pre-assert: 应该已破坏 name 字段');
      assert.doesNotMatch(onDisk, /^name: distill$/m, 'pre-assert: 原 name 应不存在');

      const { parsed, stdout } = runHook(PRE_COMMIT_HOOK, {
        tool_name: 'Bash',
        tool_input: { command: 'git commit -m "test"' },
      });
      assert.equal(parsed?.decision, 'block',
        `SKILL.md 破坏后应 block. stdout[0:300]=${stdout.slice(0, 300)}. parsed=${JSON.stringify(parsed)?.slice(0, 300)}`);
      assert.match(parsed?.reason || '', /Distill/,
        'reason 应明示是 Distill Skill Structure 失败');
    });
  });

  it('恢复 SKILL.md 后再跑应回 approve', () => {
    const { parsed } = runHook(PRE_COMMIT_HOOK, {
      tool_name: 'Bash',
      tool_input: { command: 'git commit -m "test"' },
    });
    assert.equal(parsed?.decision, 'approve', '恢复后必须重新通过');
  });
});

// ──────────────────────────────────────────────────────────
// I4: graceful skip — structure test 文件缺失 → 仅跑其他检查
// ──────────────────────────────────────────────────────────
describe('I4: structure test 缺失 → graceful skip', () => {
  it('test_distill_structure.mjs 移走后 hook 仍 approve', () => {
    withStructureTestMissing(() => {
      const { parsed } = runHook(PRE_COMMIT_HOOK, {
        tool_name: 'Bash',
        tool_input: { command: 'git commit -m "test"' },
      });
      assert.equal(parsed?.decision, 'approve',
        '测试文件缺失但其他检查过 → 应 approve');
    });
  });
});

// ──────────────────────────────────────────────────────────
// I5: post-push-ci hook smoke — additionalContext 含 5 个 status + 柔提示
// ──────────────────────────────────────────────────────────
describe('I5: post-push-ci hook', () => {
  it('git push → additionalContext 含全部 5 个 status + 柔提示文字', () => {
    const { parsed } = runHook(POST_PUSH_CI, {
      tool_name: 'Bash',
      tool_input: { command: 'git push origin main' },
    });
    assert.ok(parsed?.hookSpecificOutput, 'post-push-ci 必须用 hookSpecificOutput 协议');
    const ctx = parsed.hookSpecificOutput.additionalContext || '';
    assert.match(ctx, /Error Book/);
    assert.match(ctx, /Complexity Gate/);
    assert.match(ctx, /Governance/);
    assert.match(ctx, /Obsidian Structure/);
    assert.match(ctx, /Distill Skill Structure/);
    assert.match(ctx, /CI 通过|✓/);
    // 柔提示三要素
    assert.match(ctx, /💡/, '柔提示必须含 💡');
    assert.match(ctx, /\/distill/, '柔提示必须引用 /distill');
    assert.match(ctx, /contract\.md/, '柔提示必须指向 contract.md');
  });
});
