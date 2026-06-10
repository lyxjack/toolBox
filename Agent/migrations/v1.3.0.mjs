#!/usr/bin/env node
/**
 * Migration: 1.2.0 -> 1.3.0
 * What changed: claude-mem 双层记忆体系集成 (REQ-20260609-210628)
 *   1. 自动安装 claude-mem plugin (marketplace: thedotmack, HTTPS)
 *   2. 已存在的 ~/.claude/CLAUDE.md 幂等补「双层记忆体系」节(内容源: Agent/templates/global_claude_md.md)
 *
 * Contract (Agent/migrations/README.md):
 *   - Idempotent: 重复运行安全(plugin 已装则跳过;节已存在则跳过)
 *   - No git operations
 *   - exit 0 = success; 非零 = 失败并中止 update(下次 bootstrap 重试)
 */
import {
  ensureClaudeMemPlugin,
  patchGlobalClaudeMdMemSection,
  logInfo, logOk, logError,
} from '../lib/bootstrap-utils.mjs';

logInfo('v1.3.0: claude-mem 双层记忆体系集成');

// 1. plugin 安装(核心步骤,失败则中止 — .toolbox_version 不前进,下次重跑)
const plugin = ensureClaudeMemPlugin();
if (plugin === 'failed-cli' || plugin === 'failed-install') {
  logError('claude-mem 自动安装未完成。修复后重新运行: bash bootstrap.sh');
  process.exit(1);
}

// 2. 全局 CLAUDE.md 补节(无全局文件 = 用户未启用全局规则,合法跳过)
const patch = patchGlobalClaudeMdMemSection();
if (patch === 'failed') {
  logError('全局 CLAUDE.md 补节失败(模板异常)。');
  process.exit(1);
}
if (patch === 'absent') {
  logInfo('未检测到 ~/.claude/CLAUDE.md(未启用全局规则),跳过补节');
}

logOk('v1.3.0 migration 完成 — 重启 Claude Code 后 claude-mem hooks 生效');
process.exit(0);
