/**
 * test_obsidian_structure_integration.mjs — CI 钩子链集成测试 (P0 Obsidian 结构)
 *
 * 目标:验证 `pre-commit-hook.mjs` + `post-push-ci.mjs` 能正确串入
 * `test_obsidian_structure.mjs`,并在 P0 结构破坏时正确 block。
 *
 * Run:
 *   单独跑: node --test Agent/tests/test_obsidian_structure_integration.mjs
 *   全套跑: node --test --test-concurrency=1 Agent/tests/*.mjs
 *
 * **并发陷阱**: 与 test_complexity_gate_integration / test_p9_p11_governance_integration
 * 一起跑时必须 `--test-concurrency=1`。三者 I3 都会改写文件(I3 反例),并发时 hook
 * 先碰到对方的 corruption 触发对方的 block reason,断言失败。
 *
 * 设计取舍:与 test_p9_p11_governance_integration.mjs 同结构(spawnSync 调
 * hook,mock stdin 喂 JSON,解析 stdout)。
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
const STRUCTURE_TEST = resolve(__dirname, 'test_obsidian_structure.mjs');
const CONTRACT = resolve(ROOT, 'KI/Internal_KI/contract.md');

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

// 暂时改坏 contract.md(删 § 3.5 标题),验证 hook block
function withContractCorrupted(fn) {
  const original = readFileSync(CONTRACT, 'utf-8');
  // 把 § 3.5 标题换成不匹配 regex 的格式
  const corrupted = original.replace(/^## 3\.5 7-Category Taxonomy/m, '## 3.5-DELETED');
  if (corrupted === original) {
    throw new Error('Failed to corrupt contract.md — § 3.5 header not found');
  }
  writeFileSync(CONTRACT, corrupted);
  try {
    fn();
  } finally {
    writeFileSync(CONTRACT, original);
  }
}

// ──────────────────────────────────────────────────────────
// I1: 静态前置 — 两个 hook 文件 + structure test 文件都存在
// ──────────────────────────────────────────────────────────
describe('I1: 静态前置', () => {
  it('pre-commit-hook 存在并引用 OBSIDIAN_STRUCTURE_TEST_PATH', () => {
    assert.ok(existsSync(PRE_COMMIT_HOOK));
    const content = readFileSync(PRE_COMMIT_HOOK, 'utf-8');
    assert.match(content, /OBSIDIAN_STRUCTURE_TEST_PATH/, 'pre-commit-hook 必须串入 obsidian structure test');
    assert.match(content, /existsSync/, 'hook 必须有 graceful skip 守卫');
  });
  it('post-push-ci 存在并引用 OBSIDIAN_STRUCTURE_TEST_PATH', () => {
    assert.ok(existsSync(POST_PUSH_CI));
    const content = readFileSync(POST_PUSH_CI, 'utf-8');
    assert.match(content, /OBSIDIAN_STRUCTURE_TEST_PATH/);
    assert.match(content, /Obsidian Structure/, 'additionalContext 应有 Obsidian Structure 标识');
  });
  it('obsidian structure unit test 存在', () => {
    assert.ok(existsSync(STRUCTURE_TEST));
  });
});

// ──────────────────────────────────────────────────────────
// I2: pre-commit hook 正例 — P0 结构完整 + git commit → approve
// ──────────────────────────────────────────────────────────
describe('I2: pre-commit hook 正例(P0 结构完整)', () => {
  it('git commit + structure test PASS → decision: approve', () => {
    const { parsed, exitCode, stderr } = runHook(PRE_COMMIT_HOOK, {
      tool_name: 'Bash',
      tool_input: { command: 'git commit -m "test"' },
    });
    assert.equal(exitCode, 0, `hook 应正常退出. stderr=${stderr?.slice(0,200)}`);
    assert.ok(parsed, 'hook 输出必须是 JSON');
    assert.equal(parsed.decision, 'approve',
      `预期 approve,实际 ${parsed.decision}(reason: ${parsed.reason?.slice(0,300)})`);
  });
});

// ──────────────────────────────────────────────────────────
// I3: pre-commit hook 反例 — contract.md § 3.5 被删 → block
// ──────────────────────────────────────────────────────────
describe('I3: pre-commit hook 反例(§ 3.5 被删)', () => {
  it('故意删 contract.md § 3.5 → hook decision: block', () => {
    withContractCorrupted(() => {
      const onDisk = readFileSync(CONTRACT, 'utf-8');
      assert.match(onDisk, /## 3\.5-DELETED/, 'pre-assert: 应该已破坏 § 3.5');
      assert.doesNotMatch(onDisk, /^## 3\.5 7-Category Taxonomy/m,
        'pre-assert: 原 § 3.5 标题应不存在');

      const { parsed, stdout } = runHook(PRE_COMMIT_HOOK, {
        tool_name: 'Bash',
        tool_input: { command: 'git commit -m "test"' },
      });
      assert.equal(parsed?.decision, 'block',
        `§ 3.5 删除后应 block. stdout[0:300]=${stdout.slice(0, 300)}. parsed=${JSON.stringify(parsed)?.slice(0,300)}`);
      assert.match(parsed?.reason || '', /Obsidian Structure|3\.5|Taxonomy/,
        'reason 应明示是 obsidian structure / § 3.5 失败');
    });
  });

  it('恢复 contract 后再跑应回 approve', () => {
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
  it('test_obsidian_structure.mjs 移走后 hook 仍 approve', () => {
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
// I5: post-push-ci hook smoke — additionalContext 含 4 个检查标识
// ──────────────────────────────────────────────────────────
describe('I5: post-push-ci hook', () => {
  it('git push → additionalContext 含 Obsidian Structure 标识', () => {
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
    assert.match(ctx, /CI 通过|✓/);
  });
});
