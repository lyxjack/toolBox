#!/usr/bin/env node
/**
 * KI Vault 完整性 linter — 与 error-book-linter.mjs 互补:
 *   error-book-linter 管 ci_rules 对变更文件的执行;本脚本管知识库自身的结构完整性。
 *
 * 检查项(error 级,exit 1):
 *   1. duplicate-id     — frontmatter id 跨文件重复(参见 ERR-011)
 *   2. id-mismatch      — 文件名前缀编号与 frontmatter id 不一致
 *   3. broken-link      — [[wiki link]] 指向 vault 中不存在的笔记
 *   4. illegal-mem      — mem_status 非法枚举 / mem_ref 空字符串(contract § 3.8)
 * 检查项(warning 级,不影响 exit code):
 *   5. orphan           — 无任何出站 wiki link 且无 bootstrap: true 的条目(存量豁免,只报数)
 *
 * wiki link 解析约束(参见 ERR-029):
 *   - 解析前必须剥离 fenced code block 与 inline code span(示例链接不是真实链接)
 *   - 表格内 [[target\|alias]] 的 \| 是合法 Obsidian 转义,必须支持
 *
 * 用法: node Agent/lint/ki-integrity-linter.mjs [--strict]
 *   默认: 报告全部问题,有 error 级问题时 exit 1
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLBOX = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const KI_ROOT = join(TOOLBOX, 'KI');

// 扫描范围: 条目型知识库。Templates(占位符)、README(示例)、External_KI(anchor 体系)不在条目校验范围。
const ENTRY_DIRS = [
  'Error_Book/entries',
  'Internal_KI/patterns',
  'Internal_KI/decisions',
  'Internal_KI/lessons',
  'Internal_KI/security',
  'Internal_KI/data-analysis',
  'Internal_KI/execution_logs',
  'Internal_KI/runs',
];

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;

function walkMd(dir) {
  let out = [];
  let items;
  try { items = readdirSync(dir); } catch { return out; }
  for (const item of items) {
    const p = join(dir, item);
    if (statSync(p).isDirectory()) out = out.concat(walkMd(p));
    else if (item.endsWith('.md')) out.push(p);
  }
  return out;
}

function frontmatterBlock(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : '';
}

function fmScalar(fm, key) {
  const m = fm.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  return m ? m[1].trim() : null;
}

// ERR-029: 剥离 fenced code block 与 inline code span,防止示例链接被当成真实链接
function stripCode(content) {
  return content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    .replace(/`[^`\n]*`/g, '');
}

// 支持 [[target]] / [[target|alias]] / [[target\|alias]](表格转义) / [[target#heading]]
function extractLinks(content) {
  const links = [];
  const re = /\[\[([^\[\]]+?)\]\]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    let target = m[1].split(/\\\||\|/)[0].split('#')[0].trim();
    if (target) links.push(target);
  }
  return links;
}

// ─── 收集 vault 全量 basename 索引(Obsidian 按 basename 解析短链) ───
const allVaultMd = walkMd(KI_ROOT);
const basenameIndex = new Set(allVaultMd.map((p) => basename(p, '.md')));
// aliases 也可作为链接目标解析(Obsidian alias 解析)
for (const p of allVaultMd) {
  const fm = frontmatterBlock(readFileSync(p, 'utf8'));
  const aliasBlock = fm.match(/^aliases:\n((?:\s+-\s+.*\n?)+)/m);
  if (aliasBlock) {
    for (const line of aliasBlock[1].split('\n')) {
      const a = line.replace(/^\s*-\s*/, '').replace(/^["']|["']$/g, '').trim();
      if (a) basenameIndex.add(a);
    }
  }
}

// ─── 逐条目检查 ───
const errors = [];
const warnings = [];
const idMap = new Map(); // id -> [files]

const entryFiles = ENTRY_DIRS.flatMap((d) => walkMd(join(KI_ROOT, d)))
  .filter((p) => basename(p).toLowerCase() !== 'readme.md');

for (const file of entryFiles) {
  const rel = file.slice(KI_ROOT.length + 1);
  const content = readFileSync(file, 'utf8');
  const fm = frontmatterBlock(content);

  // 1+2. id 收集与文件名前缀比对
  const id = fmScalar(fm, 'id')?.replace(/^["']|["']$/g, '');
  if (id) {
    if (!idMap.has(id)) idMap.set(id, []);
    idMap.get(id).push(rel);
    const prefixMatch = basename(file).match(/^((?:ERR|PAT|DEC|LES|SEC|DA)-\d+)/);
    if (prefixMatch && prefixMatch[1] !== id) {
      errors.push(`id-mismatch   ${rel}: 文件名前缀 ${prefixMatch[1]} ≠ frontmatter id ${id}`);
    }
  }

  // 3. 断链
  const body = stripCode(content);
  const links = extractLinks(body);
  for (const target of links) {
    if (!basenameIndex.has(target)) {
      errors.push(`broken-link   ${rel}: [[${target}]] 在 vault 中不存在`);
    }
  }

  // 4. mem 字段合法性(仅在字段存在时校验;存量条目无字段属豁免)
  const memStatus = fmScalar(fm, 'mem_status');
  if (memStatus !== null) {
    const v = memStatus.split('#')[0].trim().replace(/^["']|["']$/g, '');
    if (v && !['linked', 'unavailable'].includes(v)) {
      errors.push(`illegal-mem   ${rel}: mem_status "${v}" 非法(允许: linked | unavailable)`);
    }
  }
  const memRef = fmScalar(fm, 'mem_ref');
  if (memRef === '""' || memRef === "''") {
    errors.push(`illegal-mem   ${rel}: mem_ref 为空字符串(不可用时应为 null)`);
  }

  // 5. 孤儿(warning)
  const isBootstrap = /^bootstrap:\s*true$/m.test(fm);
  if (links.length === 0 && !isBootstrap) {
    warnings.push(`orphan        ${rel}: 无出站 wiki link(且无 bootstrap: true)`);
  }
}

// 1. 重复 id 汇总
for (const [id, files] of idMap) {
  if (files.length > 1) {
    errors.push(`duplicate-id  ${id} 被 ${files.length} 个文件共用: ${files.join(' , ')}`);
  }
}

// ─── 输出 ───
console.log(dim(`[KI Integrity] 已扫描 ${entryFiles.length} 个条目 (vault 共 ${allVaultMd.length} 个 md,basename 索引含 alias ${basenameIndex.size} 项)`));

if (errors.length) {
  console.log(red(`\n✗ ${errors.length} 个 error 级问题:`));
  for (const e of errors) console.log(red(`  ${e}`));
}
if (warnings.length) {
  console.log(yellow(`\n⚠ ${warnings.length} 个 warning(孤儿存量,不阻塞):`));
  for (const w of warnings) console.log(yellow(`  ${w}`));
}
if (!errors.length) {
  console.log(green(`✓ 完整性通过 — 无重复 ID、无断链、无非法 mem 字段${warnings.length ? `(${warnings.length} 个存量孤儿待补链)` : ''}`));
}

process.exit(errors.length ? 1 : 0);
