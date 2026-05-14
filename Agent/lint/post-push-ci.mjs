#!/usr/bin/env node

/**
 * Claude Code PostToolUse Hook — git push 后自动运行 Error Book CI
 *
 * 全局生效: 注册在 ~/.claude/settings.json PostToolUse
 *
 * 流程:
 *   1. 检测是否为 git push 命令
 *   2. 是 → 运行 Error Book linter
 *   3. 将结果通过 additionalContext 反馈给 Claude
 *   4. CI 失败时 Claude 自动进入修复流程
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const LINTER_PATH = resolve(import.meta.dirname, 'error-book-linter.mjs');
// 只跑 unit test，integration test 会递归 spawn hook 制造混乱，留给手工触发
const COMPLEXITY_TEST_PATH = resolve(import.meta.dirname, '..', 'tests', 'test_complexity_gate.mjs');

// 读取 stdin
let input = '';
try {
  input = readFileSync(0, 'utf-8');
} catch {
  process.exit(0);
}

let parsed;
try {
  parsed = JSON.parse(input);
} catch {
  process.exit(0);
}

// 只在 git push 后触发
const command = parsed?.tool_input?.command || '';
if (!command.match(/\bgit\s+push\b/)) {
  process.exit(0);
}

// 运行 2 个检查，独立收集结果，最后汇总到 additionalContext
const results = { errorBook: null, complexityGate: null };

// 检查 1：Error Book linter
try {
  execSync(`node "${LINTER_PATH}" --mode=precommit`, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  results.errorBook = { pass: true };
} catch (err) {
  results.errorBook = {
    pass: false,
    detail: (err.stdout || '').replace(/\x1b\[[0-9;]*m/g, ''),
  };
}

// 检查 2：Complexity Gate 单元测试
// graceful skip：测试文件不存在 → 标 skipped 不算 fail
// 清掉 NODE_TEST_CONTEXT 避免被 node --test 嵌套调用时进入 child-v8 模式吃失败
if (!existsSync(COMPLEXITY_TEST_PATH)) {
  results.complexityGate = { pass: true, skipped: true };
} else {
  const cleanEnv = { ...process.env };
  delete cleanEnv.NODE_TEST_CONTEXT;
  delete cleanEnv.NODE_TEST_TARGET;
  try {
    execSync(`node --test "${COMPLEXITY_TEST_PATH}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: cleanEnv,
    });
    results.complexityGate = { pass: true };
  } catch (err) {
    results.complexityGate = {
      pass: false,
      detail: (err.stdout || '').replace(/\x1b\[[0-9;]*m/g, '').slice(-2000),
    };
  }
}

// 汇报
const ebStatus = results.errorBook.pass ? '✓ Error Book' : '✗ Error Book';
const cgStatus = results.complexityGate.skipped
  ? '⊘ Complexity Gate (skipped — no tests)'
  : (results.complexityGate.pass ? '✓ Complexity Gate' : '✗ Complexity Gate');

let msg;
if (results.errorBook.pass && results.complexityGate.pass) {
  msg = `[Post-Push CI] CI 通过 — ${ebStatus} | ${cgStatus}`;
} else {
  const sections = ['[Post-Push CI] ✗ CI 未通过', `${ebStatus} | ${cgStatus}`, ''];
  if (!results.errorBook.pass) {
    sections.push('--- Error Book 违规 ---', results.errorBook.detail);
  }
  if (!results.complexityGate.pass) {
    sections.push('--- Complexity Gate 失败 ---', results.complexityGate.detail);
  }
  sections.push(
    '',
    '请自动执行以下流程:',
    '1. 分析上方违规详情，定位问题文件',
    '2. 修复问题',
    '3. 本地重跑 `node --test Agent/tests/`',
    '4. 通过后重新 commit + push'
  );
  msg = sections.join('\n');
}

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PostToolUse',
    additionalContext: msg,
  },
}));
