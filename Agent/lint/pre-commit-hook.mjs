#!/usr/bin/env node

/**
 * Claude Code PreToolUse Hook — 拦截 git commit 前运行 Error Book Lint
 *
 * 全局生效: 注册在 ~/.claude/settings.json，任何项目中 Claude 执行 git commit 都触发。
 *
 * 接收方式: Claude Code 通过 stdin 传入 JSON { tool_name, tool_input }
 * 输出方式:
 *   - stdout JSON: { "decision": "block", "reason": "..." } 阻断
 *   - stdout JSON: { "decision": "approve" } 放行
 *
 * 仅当 Bash 命令包含 "git commit" 时触发 lint 检查。
 * Linter 使用绝对路径调用，规则从 toolBox 加载，变更检测在当前项目 cwd 执行。
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const LINTER_PATH = resolve(import.meta.dirname, 'error-book-linter.mjs');
// 只跑 unit test，不跑 integration test —— integration 会递归 spawn hook 进程，
// 制造混乱状态。Integration test 留给手工 `node --test` 单独跑。
const COMPLEXITY_TEST_PATH = resolve(import.meta.dirname, '..', 'tests', 'test_complexity_gate.mjs');

// 读取 stdin
let input = '';
try {
  input = readFileSync(0, 'utf-8');
} catch {
  // 无 stdin，放行
  console.log(JSON.stringify({ decision: 'approve' }));
  process.exit(0);
}

let parsed;
try {
  parsed = JSON.parse(input);
} catch {
  console.log(JSON.stringify({ decision: 'approve' }));
  process.exit(0);
}

// 只拦截包含 git commit 的 Bash 命令
const command = parsed?.tool_input?.command || '';
if (!command.match(/\bgit\s+commit\b/)) {
  console.log(JSON.stringify({ decision: 'approve' }));
  process.exit(0);
}

// 运行 linter（precommit 模式，检查 staged files）
// cwd 不指定，继承当前工作目录（即 Claude Code 所在的项目目录）
try {
  execSync(`node "${LINTER_PATH}" --mode=precommit`, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
} catch (err) {
  // lint 失败（exit 1 = 有 blocking violations）
  const stderr = err.stderr || '';
  const stdout = err.stdout || '';
  const reason = `Error Book Lint 拦截:\n${stdout}${stderr}`.trim();

  console.log(JSON.stringify({
    decision: 'block',
    reason,
  }));
  process.exit(0);
}

// Linter 通过后，追跑 Complexity Gate 单元测试（regression guard）
// graceful skip：测试文件不存在（老 toolBox 版本）→ 跳过仅算 lint 结果
//
// 关键：清掉 NODE_TEST_CONTEXT 等 node:test runner 内部 env，
// 否则当 hook 被 node --test 调用时，子 node --test 进程继承到 child-v8
// 上下文会进入子模式而不报失败 — 已踩坑确认。
if (existsSync(COMPLEXITY_TEST_PATH)) {
  const cleanEnv = { ...process.env };
  delete cleanEnv.NODE_TEST_CONTEXT;
  delete cleanEnv.NODE_TEST_TARGET;
  try {
    execSync(`node --test "${COMPLEXITY_TEST_PATH}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: cleanEnv,
    });
  } catch (err) {
    const stdout = err.stdout || '';
    const reason = `Complexity Gate 测试拦截:\n${stdout.replace(/\x1b\[[0-9;]*m/g, '').slice(-2000)}`.trim();
    console.log(JSON.stringify({
      decision: 'block',
      reason,
    }));
    process.exit(0);
  }
}

// 两个检查都通过
console.log(JSON.stringify({ decision: 'approve' }));
process.exit(0);
