#!/usr/bin/env node

/**
 * Error Book Linter — 从错题本自动提取规则，拦截已知错误模式
 *
 * 用法:
 *   node Agent/lint/error-book-linter.mjs              # 检查 staged changes (当前目录)
 *   node Agent/lint/error-book-linter.mjs --mode=ci    # CI 模式，对比 origin/main
 *   node Agent/lint/error-book-linter.mjs --mode=precommit  # pre-commit 模式
 *   node Agent/lint/error-book-linter.mjs --validate   # 验证条目 ci_rules 覆盖率
 *
 * 全局使用:
 *   规则始终从 toolBox Error Book 加载 (基于脚本位置)
 *   变更文件检测基于调用者的 cwd (当前项目的 git 仓库)
 *
 * 零依赖 — 仅用 node:fs, node:path, node:child_process
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { execSync } from 'node:child_process';

// ── 路径 ──────────────────────────────────────────────
// TOOLBOX_ROOT: 规则加载源 (始终指向 toolBox，基于脚本自身位置)
const TOOLBOX_ROOT = resolve(import.meta.dirname, '..', '..');
const ENTRIES_DIR = join(TOOLBOX_ROOT, 'KI', 'Error_Book', 'entries');

// PROJECT_CWD: 变更检测目标 (调用者的当前工作目录)
const PROJECT_CWD = process.cwd();

// ── 颜色 ──────────────────────────────────────────────
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// ── YAML Frontmatter 简易解析器 ───────────────────────
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  return parseYaml(match[1]);
}

function yamlUnescape(str) {
  return str.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
}

function parseYaml(text) {
  const result = {};
  let currentKey = null;
  let currentArray = null;
  let inNestedObject = false;
  let nestedObj = {};

  for (const line of text.split('\n')) {
    // 数组项（嵌套对象内的字段）
    if (inNestedObject && /^\s{4,}\w/.test(line)) {
      const m = line.match(/^\s+(\w[\w_]*):\s*"?([^"]*)"?\s*$/);
      if (m) {
        nestedObj[m[1]] = yamlUnescape(m[2]);
      }
      continue;
    }

    // 结束嵌套对象
    if (inNestedObject && /^\s{2}-\s/.test(line)) {
      currentArray.push({ ...nestedObj });
      nestedObj = {};
      // 继续处理下一个数组项（不跳过）
    } else if (inNestedObject && !/^\s{4,}/.test(line)) {
      currentArray.push({ ...nestedObj });
      nestedObj = {};
      inNestedObject = false;
    }

    // 简单数组项: "  - value"
    if (/^\s+-\s/.test(line)) {
      const val = line.replace(/^\s+-\s*/, '').replace(/^["']|["']$/g, '').trim();
      if (currentArray) {
        // 检查是否是嵌套对象开始: "  - type: xxx"
        const nested = val.match(/^(\w[\w_]*):\s*"?([^"]*)"?\s*$/);
        if (nested) {
          if (inNestedObject) {
            // 前一个嵌套对象已经 push 了
          }
          inNestedObject = true;
          nestedObj = { [nested[1]]: yamlUnescape(nested[2]) };
        } else {
          currentArray.push(val);
        }
      }
      continue;
    }

    // 顶级 key: value
    const kv = line.match(/^(\w[\w_]*):\s*(.*)/);
    if (kv) {
      // 收尾上一个嵌套
      if (inNestedObject) {
        currentArray.push({ ...nestedObj });
        nestedObj = {};
        inNestedObject = false;
      }

      const key = kv[1];
      let val = kv[2].replace(/^["']|["']$/g, '').trim();

      if (val === '' || val === '[]') {
        // 可能是数组的开始
        result[key] = [];
        currentKey = key;
        currentArray = result[key];
      } else {
        // 尝试解析数字
        if (/^\d+$/.test(val)) val = parseInt(val, 10);
        result[key] = val;
        currentKey = null;
        currentArray = null;
      }
    }
  }

  // 收尾最后一个嵌套对象
  if (inNestedObject && currentArray) {
    currentArray.push({ ...nestedObj });
  }

  return result;
}

// ── 加载所有 Error Book 条目 ──────────────────────────
function loadEntries() {
  const files = readdirSync(ENTRIES_DIR).filter(f => f.startsWith('ERR-') && f.endsWith('.md'));
  return files.map(f => {
    const content = readFileSync(join(ENTRIES_DIR, f), 'utf-8');
    const meta = parseFrontmatter(content);
    return { file: f, ...meta };
  });
}

// ── 获取变更文件列表 ─────────────────────────────────
function getChangedFiles(mode) {
  try {
    let cmd;
    switch (mode) {
      case 'ci':
        cmd = 'git diff --name-only origin/main...HEAD';
        break;
      case 'precommit':
      default:
        cmd = 'git diff --cached --name-only';
        break;
    }
    const output = execSync(cmd, { cwd: PROJECT_CWD, encoding: 'utf-8' }).trim();
    return output ? output.split('\n') : [];
  } catch {
    return [];
  }
}

// ── 读取文件内容（用于 code-pattern 检查）────────────
function readFileContent(filePath) {
  try {
    return readFileSync(join(PROJECT_CWD, filePath), 'utf-8');
  } catch {
    return null;
  }
}

// ── 规则执行引擎 ─────────────────────────────────────

function checkFilePatternBan(rule, changedFiles, entry) {
  const violations = [];
  const regex = new RegExp(rule.pattern);

  for (const file of changedFiles) {
    if (regex.test(file)) {
      violations.push({
        entry_id: entry.id,
        severity: entry.severity,
        file,
        message: rule.message,
      });
    }
  }
  return violations;
}

function checkCodePatternBan(rule, changedFiles, entry) {
  const violations = [];
  const fileRegex = rule.file_pattern ? new RegExp(rule.file_pattern) : null;
  const codeRegex = new RegExp(rule.pattern, 'gm');

  for (const file of changedFiles) {
    if (fileRegex && !fileRegex.test(file)) continue;
    const content = readFileContent(file);
    if (!content) continue;

    const matches = content.match(codeRegex);
    if (matches) {
      violations.push({
        entry_id: entry.id,
        severity: rule.severity_override || entry.severity,
        file,
        message: rule.message,
        matches: matches.length,
      });
    }
  }
  return violations;
}

function checkCodePatternRequire(rule, changedFiles, entry) {
  const violations = [];
  const fileRegex = rule.file_pattern ? new RegExp(rule.file_pattern) : null;
  const triggerRegex = new RegExp(rule.trigger_pattern, 'gm');
  const requiredRegex = new RegExp(rule.required_pattern, 'gm');

  for (const file of changedFiles) {
    if (fileRegex && !fileRegex.test(file)) continue;
    const content = readFileContent(file);
    if (!content) continue;

    if (triggerRegex.test(content) && !requiredRegex.test(content)) {
      violations.push({
        entry_id: entry.id,
        severity: rule.severity_override || entry.severity,
        file,
        message: rule.message,
      });
    }
  }
  return violations;
}

// ── 主函数 ───────────────────────────────────────────

function runLint(mode) {
  const entries = loadEntries();
  const changedFiles = getChangedFiles(mode);

  const rulesCount = entries.filter(e => e.ci_rules?.length > 0).length;
  console.log(`${DIM}[Error Book CI] 已加载 ${entries.length} 条错题记录 (${rulesCount} 条含 ci_rules)${RESET}`);

  if (changedFiles.length === 0) {
    console.log(`${GREEN}✓ CI 通过${RESET} — 无变更文件`);
    process.exit(0);
  }

  console.log(`${DIM}[Error Book CI] 检查 ${changedFiles.length} 个变更文件...${RESET}\n`);

  const allViolations = [];

  for (const entry of entries) {
    if (!entry.ci_rules || !Array.isArray(entry.ci_rules)) continue;

    for (const rule of entry.ci_rules) {
      let violations = [];
      switch (rule.type) {
        case 'file-pattern-ban':
          violations = checkFilePatternBan(rule, changedFiles, entry);
          break;
        case 'code-pattern-ban':
          violations = checkCodePatternBan(rule, changedFiles, entry);
          break;
        case 'code-pattern-require':
          violations = checkCodePatternRequire(rule, changedFiles, entry);
          break;
      }
      allViolations.push(...violations);
    }
  }

  // 输出结果
  if (allViolations.length === 0) {
    console.log(`${GREEN}✓ CI 通过${RESET}`);
    process.exit(0);
  }

  // 按 severity 排序
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  allViolations.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));

  let hasBlocking = false;

  for (const v of allViolations) {
    const isBlocking = v.severity === 'critical' || v.severity === 'high';
    if (isBlocking) hasBlocking = true;

    const icon = isBlocking ? `${RED}✗` : `${YELLOW}⚠`;
    const sev = isBlocking ? `${RED}${v.severity}` : `${YELLOW}${v.severity}`;
    console.log(`${icon} [${v.entry_id}] ${sev}${RESET}: ${v.message}`);
    console.log(`  ${DIM}→ ${v.file}${RESET}`);
    if (v.matches) console.log(`  ${DIM}  (${v.matches} matches)${RESET}`);
    console.log();
  }

  // 汇总
  const blocking = allViolations.filter(v => v.severity === 'critical' || v.severity === 'high');
  const warnings = allViolations.filter(v => v.severity !== 'critical' && v.severity !== 'high');

  if (hasBlocking) {
    console.log(`${RED}${BOLD}✗ CI 未通过${RESET} — ${blocking.length} 条错题本规则被违反`);
    if (warnings.length) console.log(`  ${YELLOW}另有 ${warnings.length} 条警告${RESET}`);
  } else {
    console.log(`${GREEN}✓ CI 通过${RESET}${warnings.length ? ` (${warnings.length} 条警告)` : ''}`);
  }

  process.exit(hasBlocking ? 1 : 0);
}

function runValidate() {
  const entries = loadEntries();

  console.log(`${BOLD}Error Book CI Rules Coverage Report${RESET}\n`);

  let uncovered = 0;
  for (const entry of entries) {
    const hasCiRules = entry.ci_rules && Array.isArray(entry.ci_rules) && entry.ci_rules.length > 0;
    const isCriticalOrHigh = entry.severity === 'critical' || entry.severity === 'high';

    const status = hasCiRules ? `${GREEN}✓ has ci_rules${RESET}` : isCriticalOrHigh ? `${RED}✗ MISSING ci_rules${RESET}` : `${DIM}— no ci_rules (Tier 2 only)${RESET}`;

    console.log(`  ${entry.id} [${entry.severity}] ${status}`);

    if (!hasCiRules && isCriticalOrHigh) uncovered++;
  }

  console.log();
  if (uncovered > 0) {
    console.log(`${YELLOW}⚠ ${uncovered} critical/high entries without ci_rules — consider adding static rules${RESET}`);
  } else {
    console.log(`${GREEN}✓ All critical/high entries have ci_rules coverage${RESET}`);
  }
}

// ── CLI 入口 ────────────────────────────────────────
const args = process.argv.slice(2);

if (args.includes('--validate')) {
  runValidate();
} else {
  const modeArg = args.find(a => a.startsWith('--mode='));
  const mode = modeArg ? modeArg.split('=')[1] : 'precommit';
  runLint(mode);
}
