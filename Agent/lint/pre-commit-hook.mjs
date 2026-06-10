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
const GOVERNANCE_TEST_PATH = resolve(import.meta.dirname, '..', 'tests', 'test_p9_p11_governance.mjs');
const OBSIDIAN_STRUCTURE_TEST_PATH = resolve(import.meta.dirname, '..', 'tests', 'test_obsidian_structure.mjs');
const DISTILL_TEST_PATH = resolve(import.meta.dirname, '..', 'tests', 'test_distill_structure.mjs');
const DISTILL_OUTPUT_AUDIT_PATH = resolve(import.meta.dirname, '..', 'tests', 'test_distill_output_audit.mjs');
const P3_SELF_CHECK_PATH = resolve(import.meta.dirname, '..', 'tests', 'test_p3_schema_self_check.mjs');
const MEM_LINK_TEST_PATH = resolve(import.meta.dirname, '..', 'tests', 'test_mem_link.mjs');

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
const cleanEnv = { ...process.env };
delete cleanEnv.NODE_TEST_CONTEXT;
delete cleanEnv.NODE_TEST_TARGET;

if (existsSync(COMPLEXITY_TEST_PATH)) {
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

// Governance structure regression test (REQ-20260517-032402)
// 验证 Constitution P9/P10/P11 + 5 个 workflow 挂载点结构未被破坏
if (existsSync(GOVERNANCE_TEST_PATH)) {
  try {
    execSync(`node --test "${GOVERNANCE_TEST_PATH}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: cleanEnv,
    });
  } catch (err) {
    const stdout = err.stdout || '';
    const reason = `Governance 结构测试拦截 (P9/P10/P11):\n${stdout.replace(/\x1b\[[0-9;]*m/g, '').slice(-2000)}`.trim();
    console.log(JSON.stringify({
      decision: 'block',
      reason,
    }));
    process.exit(0);
  }
}

// Obsidian Structure regression test (P0 — Obsidian 7-Category Layered Mgmt)
// 验证 7 大类目录 / 模板 / contract / CLAUDE.md 结构未被破坏
if (existsSync(OBSIDIAN_STRUCTURE_TEST_PATH)) {
  try {
    execSync(`node --test "${OBSIDIAN_STRUCTURE_TEST_PATH}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: cleanEnv,
    });
  } catch (err) {
    const stdout = err.stdout || '';
    const reason = `Obsidian Structure 测试拦截 (P0 7-Category):\n${stdout.replace(/\x1b\[[0-9;]*m/g, '').slice(-2000)}`.trim();
    console.log(JSON.stringify({
      decision: 'block',
      reason,
    }));
    process.exit(0);
  }
}

// Distill Skill Structure regression test (REQ-20260517-043739 P2)
if (existsSync(DISTILL_TEST_PATH)) {
  try {
    execSync(`node --test "${DISTILL_TEST_PATH}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: cleanEnv,
    });
  } catch (err) {
    const stdout = err.stdout || '';
    const reason = `Distill Skill Structure 测试拦截 (P2 /distill):\n${stdout.replace(/\x1b\[[0-9;]*m/g, '').slice(-2000)}`.trim();
    console.log(JSON.stringify({
      decision: 'block',
      reason,
    }));
    process.exit(0);
  }
}

// Distill Output Audit (端到端验证 distill 产物符合 contract schema)
if (existsSync(DISTILL_OUTPUT_AUDIT_PATH)) {
  try {
    execSync(`node --test "${DISTILL_OUTPUT_AUDIT_PATH}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: cleanEnv,
    });
  } catch (err) {
    const stdout = err.stdout || '';
    const reason = `Distill Output Audit 测试拦截 (KI 笔记 schema 违规):\n${stdout.replace(/\x1b\[[0-9;]*m/g, '').slice(-2000)}`.trim();
    console.log(JSON.stringify({
      decision: 'block',
      reason,
    }));
    process.exit(0);
  }
}

// P3 Schema Self-Check (元一致性 — workflow / contract / audit-code 三方同步)
if (existsSync(P3_SELF_CHECK_PATH)) {
  try {
    execSync(`node --test "${P3_SELF_CHECK_PATH}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: cleanEnv,
    });
  } catch (err) {
    const stdout = err.stdout || '';
    const reason = `P3 Schema Self-Check 拦截 (workflow / contract / audit-code 元一致性脱钩):\n${stdout.replace(/\x1b\[[0-9;]*m/g, '').slice(-2000)}`.trim();
    console.log(JSON.stringify({
      decision: 'block',
      reason,
    }));
    process.exit(0);
  }
}

// Mem Link regression test (REQ-20260609-210628 — claude-mem 双向关联机制)
if (existsSync(MEM_LINK_TEST_PATH)) {
  try {
    execSync(`node --test "${MEM_LINK_TEST_PATH}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: cleanEnv,
    });
  } catch (err) {
    const stdout = err.stdout || '';
    const reason = `Mem Link 测试拦截 (claude-mem 双向关联结构破坏):\n${stdout.replace(/\x1b\[[0-9;]*m/g, '').slice(-2000)}`.trim();
    console.log(JSON.stringify({
      decision: 'block',
      reason,
    }));
    process.exit(0);
  }
}

// 八个检查都通过
console.log(JSON.stringify({ decision: 'approve' }));
process.exit(0);
