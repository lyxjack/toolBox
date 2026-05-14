/**
 * test_complexity_gate_integration.mjs — CI 钩子链集成测试
 *
 * 目标：验证 `pre-commit-hook.mjs` + `post-push-ci.mjs` 能正确串入
 * `test_complexity_gate.mjs`，并在不同状态（PASS / FAIL / 缺失）下行为正确。
 *
 * Run: node --test Agent/tests/test_complexity_gate_integration.mjs
 *
 * 方法：用 child_process.spawnSync mock stdin 触发 hook 进程，解析 stdout
 * JSON 反推决策。无需真实 git 状态。
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK_DIR = resolve(__dirname, '..', 'lint');
const PRE_COMMIT_HOOK = resolve(HOOK_DIR, 'pre-commit-hook.mjs');
const POST_PUSH_CI = resolve(HOOK_DIR, 'post-push-ci.mjs');
const COMPLEXITY_TEST = resolve(__dirname, 'test_complexity_gate.mjs');

// 用 spawnSync 调 hook：stdin 喂 JSON，捕获 stdout
function runHook(hookPath, stdinJson) {
  const result = spawnSync('node', [hookPath], {
    input: JSON.stringify(stdinJson),
    encoding: 'utf-8',
    timeout: 30000,
  });
  // hook 自己 console.log 输出 JSON 到 stdout
  let parsed = null;
  try {
    parsed = JSON.parse(result.stdout.trim());
  } catch {}
  return { exitCode: result.status, parsed, stdout: result.stdout, stderr: result.stderr };
}

// 暂时把 test 文件搬走（模拟缺失），用完恢复
function withTestFileMissing(fn) {
  const moved = `${COMPLEXITY_TEST}.moved-for-test`;
  renameSync(COMPLEXITY_TEST, moved);
  try {
    fn();
  } finally {
    renameSync(moved, COMPLEXITY_TEST);
  }
}

// 暂时改坏 test 文件的一个 fixture，验失败被捕；用完恢复
function withCorruptedTest(fn) {
  const original = readFileSync(COMPLEXITY_TEST, 'utf-8');
  // 把 fixture[0] 期望从 'micro' 改成 'standard' 制造一个真实失败
  const corrupted = original.replace(
    /name: 'micro: 改 fontSize 30→28',[\s\S]*?expected: 'micro',/,
    (match) => match.replace(`expected: 'micro',`, `expected: 'standard',`)
  );
  if (corrupted === original) {
    throw new Error('Failed to corrupt test fixture — pattern not matched');
  }
  writeFileSync(COMPLEXITY_TEST, corrupted);
  try {
    fn();
  } finally {
    writeFileSync(COMPLEXITY_TEST, original);
  }
}

// ──────────────────────────────────────────────────────────
// I1: 静态前置 — hook 文件 + 测试文件存在 + 包含集成入口
// ──────────────────────────────────────────────────────────
describe('I1: 静态前置', () => {
  it('pre-commit-hook 存在并引用 COMPLEXITY_TEST_PATH', () => {
    assert.ok(existsSync(PRE_COMMIT_HOOK), 'pre-commit-hook.mjs 必须存在');
    const content = readFileSync(PRE_COMMIT_HOOK, 'utf-8');
    assert.match(content, /COMPLEXITY_TEST_PATH/, 'hook 必须串入 complexity gate test');
    assert.match(content, /existsSync/, 'hook 必须有 graceful skip 守卫');
  });

  it('post-push-ci 存在并引用 COMPLEXITY_TEST_PATH', () => {
    assert.ok(existsSync(POST_PUSH_CI));
    const content = readFileSync(POST_PUSH_CI, 'utf-8');
    assert.match(content, /COMPLEXITY_TEST_PATH/);
    assert.match(content, /existsSync/);
    assert.match(content, /Error Book/, 'Error Book 既有行为保留');
  });

  it('complexity gate unit test 存在', () => {
    assert.ok(existsSync(COMPLEXITY_TEST));
  });
});

// ──────────────────────────────────────────────────────────
// I2: pre-commit hook 正例 — git commit + 测试 PASS → approve
// ──────────────────────────────────────────────────────────
describe('I2: pre-commit hook 正例（测试 PASS）', () => {
  it('git commit 命令 + 所有测试通过 → decision: approve', () => {
    const { parsed, exitCode } = runHook(PRE_COMMIT_HOOK, {
      tool_name: 'Bash',
      tool_input: { command: 'git commit -m "test"' },
    });
    assert.equal(exitCode, 0, 'hook 应正常退出');
    assert.ok(parsed, 'hook 输出必须是 JSON');
    assert.equal(parsed.decision, 'approve', `预期 approve，实际 ${parsed.decision}（reason: ${parsed.reason?.slice(0,200)}）`);
  });

  it('非 git commit 命令直接 approve（不跑测试）', () => {
    const { parsed } = runHook(PRE_COMMIT_HOOK, {
      tool_name: 'Bash',
      tool_input: { command: 'ls -la' },
    });
    assert.equal(parsed?.decision, 'approve');
  });
});

// ──────────────────────────────────────────────────────────
// I3: pre-commit hook 反例 — 测试 FAIL → block
// ──────────────────────────────────────────────────────────
describe('I3: pre-commit hook 反例（测试 FAIL）', () => {
  it('故意破坏测试 → hook decision: block', () => {
    withCorruptedTest(() => {
      // 调试：确认文件确实被改坏了
      const onDisk = readFileSync(COMPLEXITY_TEST, 'utf-8');
      const cleanOnDisk = onDisk.includes("name: 'micro: 改 fontSize 30→28',") &&
                          /name: 'micro: 改 fontSize 30→28',[\s\S]*?expected: 'standard',/.test(onDisk);
      assert.ok(cleanOnDisk, 'pre-assert: 文件应已被改坏（包含 expected: standard 在 micro fixture 中）');

      const { parsed, stdout, exitCode } = runHook(PRE_COMMIT_HOOK, {
        tool_name: 'Bash',
        tool_input: { command: 'git commit -m "test"' },
      });
      assert.equal(parsed?.decision, 'block',
        `测试 FAIL 时应 block. exitCode=${exitCode}. stdout[0:300]=${stdout.slice(0, 300)}. parsed=${JSON.stringify(parsed)?.slice(0,300)}`);
      assert.match(parsed?.reason || '', /Complexity Gate 测试拦截/, 'reason 应明示是 complexity gate 失败');
    });
  });

  it('恢复后再跑应回 approve', () => {
    const { parsed } = runHook(PRE_COMMIT_HOOK, {
      tool_name: 'Bash',
      tool_input: { command: 'git commit -m "test"' },
    });
    assert.equal(parsed?.decision, 'approve', '恢复后必须重新通过');
  });
});

// ──────────────────────────────────────────────────────────
// I4: pre-commit hook 优雅降级 — 测试文件缺失 → 仅跑 linter
// ──────────────────────────────────────────────────────────
describe('I4: 测试文件缺失 → graceful skip', () => {
  it('test_complexity_gate.mjs 移走后 hook 仍 approve（仅 linter）', () => {
    withTestFileMissing(() => {
      const { parsed } = runHook(PRE_COMMIT_HOOK, {
        tool_name: 'Bash',
        tool_input: { command: 'git commit -m "test"' },
      });
      // linter 单独跑应该 PASS（Error Book 规则未违规）
      assert.equal(parsed?.decision, 'approve', '测试文件缺失但 linter 过 → 应 approve');
    });
  });
});

// ──────────────────────────────────────────────────────────
// I5: post-push-ci hook smoke — git push 后报告含两个检查结果
// ──────────────────────────────────────────────────────────
describe('I5: post-push-ci hook', () => {
  it('git push 命令 → additionalContext 含两个检查的 ✓ 标识', () => {
    const { parsed } = runHook(POST_PUSH_CI, {
      tool_name: 'Bash',
      tool_input: { command: 'git push origin main' },
    });
    assert.ok(parsed?.hookSpecificOutput, 'post-push-ci 必须用 hookSpecificOutput 协议');
    const ctx = parsed.hookSpecificOutput.additionalContext || '';
    assert.match(ctx, /Error Book/, 'additionalContext 应含 Error Book 检查名');
    assert.match(ctx, /Complexity Gate/, 'additionalContext 应含 Complexity Gate 检查名');
    assert.match(ctx, /CI 通过|✓/, 'CI 通过时应有正向标识');
  });

  it('非 git push 命令直接 exit 0（不跑检查）', () => {
    const { exitCode } = runHook(POST_PUSH_CI, {
      tool_name: 'Bash',
      tool_input: { command: 'ls -la' },
    });
    assert.equal(exitCode, 0);
  });
});
