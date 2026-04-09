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

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const LINTER_PATH = resolve(import.meta.dirname, 'error-book-linter.mjs');

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

// 运行 CI
try {
  const stdout = execSync(`node "${LINTER_PATH}" --mode=precommit`, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // CI 通过
  const msg = `[Post-Push CI] ✓ CI 通过 — Error Book 规则检查无违规`;
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: msg,
    },
  }));
} catch (err) {
  // CI 失败
  const stdout = err.stdout || '';
  const msg = [
    '[Post-Push CI] ✗ CI 未通过 — 请自动执行以下流程:',
    '1. 分析下方违规详情，定位问题文件',
    '2. 修复问题',
    '3. 重新运行 CI (node Error Book linter)',
    '4. CI 通过后重新 commit + push',
    '',
    '--- 违规详情 ---',
    stdout.replace(/\x1b\[[0-9;]*m/g, ''),  // 去掉 ANSI 颜色码
  ].join('\n');

  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: msg,
    },
  }));
}
