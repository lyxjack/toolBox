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

// 运行 8 个检查，独立收集结果，最后汇总到 additionalContext
const results = { errorBook: null, complexityGate: null, governance: null, obsidianStructure: null, distillSkill: null, distillOutputAudit: null, p3SelfCheck: null, memLink: null };

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

// 检查 2 + 3：node --test 类型,共享 cleanEnv
// graceful skip：测试文件不存在 → 标 skipped 不算 fail
// 清掉 NODE_TEST_CONTEXT 避免被 node --test 嵌套调用时进入 child-v8 模式吃失败
const cleanEnv = { ...process.env };
delete cleanEnv.NODE_TEST_CONTEXT;
delete cleanEnv.NODE_TEST_TARGET;

function runNodeTest(path) {
  if (!existsSync(path)) return { pass: true, skipped: true };
  try {
    execSync(`node --test "${path}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: cleanEnv,
    });
    return { pass: true };
  } catch (err) {
    return {
      pass: false,
      detail: (err.stdout || '').replace(/\x1b\[[0-9;]*m/g, '').slice(-2000),
    };
  }
}

results.complexityGate = runNodeTest(COMPLEXITY_TEST_PATH);
results.governance = runNodeTest(GOVERNANCE_TEST_PATH);
results.obsidianStructure = runNodeTest(OBSIDIAN_STRUCTURE_TEST_PATH);
results.distillSkill = runNodeTest(DISTILL_TEST_PATH);
results.distillOutputAudit = runNodeTest(DISTILL_OUTPUT_AUDIT_PATH);
results.p3SelfCheck = runNodeTest(P3_SELF_CHECK_PATH);
results.memLink = runNodeTest(MEM_LINK_TEST_PATH);

// 汇报
function statusLine(label, r) {
  if (r.skipped) return `⊘ ${label} (skipped — no tests)`;
  return r.pass ? `✓ ${label}` : `✗ ${label}`;
}
const ebStatus = statusLine('Error Book', results.errorBook);
const cgStatus = statusLine('Complexity Gate', results.complexityGate);
const gvStatus = statusLine('Governance (P9/P10/P11)', results.governance);
const osStatus = statusLine('Obsidian Structure (P0)', results.obsidianStructure);
const dsStatus = statusLine('Distill Skill Structure', results.distillSkill);
const doaStatus = statusLine('Distill Output Audit', results.distillOutputAudit);
const p3Status = statusLine('P3 Schema Self-Check', results.p3SelfCheck);
const mlStatus = statusLine('Mem Link', results.memLink);

const allPass = results.errorBook.pass && results.complexityGate.pass && results.governance.pass && results.obsidianStructure.pass && results.distillSkill.pass && results.distillOutputAudit.pass && results.p3SelfCheck.pass && results.memLink.pass;
let msg;
if (allPass) {
  msg = `[Post-Push CI] CI 通过 — ${ebStatus} | ${cgStatus} | ${gvStatus} | ${osStatus} | ${dsStatus} | ${doaStatus} | ${p3Status} | ${mlStatus}\n\n💡 8 层 CI 全过 — 建议跑 \`/distill\` 把本次对话沉淀到 Obsidian KI Vault(按 7 大类自动归档,详见 \`KI/Internal_KI/contract.md\` § 3.5)。`;
} else {
  const sections = ['[Post-Push CI] ✗ CI 未通过', `${ebStatus} | ${cgStatus} | ${gvStatus} | ${osStatus} | ${dsStatus} | ${doaStatus} | ${p3Status} | ${mlStatus}`, ''];
  if (!results.errorBook.pass) {
    sections.push('--- Error Book 违规 ---', results.errorBook.detail);
  }
  if (!results.complexityGate.pass) {
    sections.push('--- Complexity Gate 失败 ---', results.complexityGate.detail);
  }
  if (!results.governance.pass) {
    sections.push('--- Governance (P9/P10/P11) 失败 ---', results.governance.detail);
  }
  if (!results.obsidianStructure.pass) {
    sections.push('--- Obsidian Structure (P0) 失败 ---', results.obsidianStructure.detail);
  }
  if (!results.distillSkill.pass) {
    sections.push('--- Distill Skill Structure 失败 ---', results.distillSkill.detail);
  }
  if (!results.distillOutputAudit.pass) {
    sections.push('--- Distill Output Audit 失败 ---', results.distillOutputAudit.detail);
  }
  if (!results.p3SelfCheck.pass) {
    sections.push('--- P3 Schema Self-Check 失败 ---', results.p3SelfCheck.detail);
  }
  if (!results.memLink.pass) {
    sections.push('--- Mem Link 失败 ---', results.memLink.detail);
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
