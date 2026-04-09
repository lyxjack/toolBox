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

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const LINTER_PATH = resolve(import.meta.dirname, 'error-book-linter.mjs');

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

  // lint 通过
  console.log(JSON.stringify({ decision: 'approve' }));
  process.exit(0);
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
