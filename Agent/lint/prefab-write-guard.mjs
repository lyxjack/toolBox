#!/usr/bin/env node

/**
 * Claude Code PreToolUse Hook — 拦截 Edit/Write 工具写入 Cocos 资产文件
 *
 * 防护 ERR-002 / ERR-006：禁止 Claude 用脚本直接修改 .prefab/.scene/.anim 文件
 * 编辑器修改后的 git commit 不受影响（由 pre-commit-hook.mjs 的 ci_rules 控制）
 *
 * 接收: stdin JSON { tool_name, tool_input: { file_path } }
 * 输出: { "decision": "block"|"approve", "reason": "..." }
 */

import { readFileSync } from 'node:fs';

const BANNED_EXTENSIONS = /\.(prefab|scene|anim|animation)$/i;

let input = '';
try {
  input = readFileSync(0, 'utf-8');
} catch {
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

const filePath = parsed?.tool_input?.file_path || '';

if (BANNED_EXTENSIONS.test(filePath)) {
  console.log(JSON.stringify({
    decision: 'block',
    reason: `[ERR-002/ERR-006] 禁止用 ${parsed.tool_name} 直接修改 Cocos 资产文件: ${filePath}\n正确做法: 在 Cocos Creator 编辑器中修改，或通过 MCP API (scene_save + prefab_update)`,
  }));
} else {
  console.log(JSON.stringify({ decision: 'approve' }));
}
