/**
 * bootstrap-utils.mjs — Shared utilities for bootstrap.mjs
 * Cross-platform (macOS, Linux, WSL, Windows)
 * Zero third-party dependencies — Node.js built-ins only
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { platform } from 'os';
import { fileURLToPath } from 'url';

// --- Path Resolution ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const TOOLBOX_ROOT = join(__dirname, '..', '..');

// --- Local State Files ---
const TOOLBOX_VERSION_FILE = join(TOOLBOX_ROOT, '.toolbox_version');
const TOOLBOX_CONFIG_FILE = join(TOOLBOX_ROOT, '.toolbox_config');

// --- Color Support ---
const useColor = process.stdout.isTTY !== false;

const color = {
  reset: useColor ? '\x1b[0m' : '',
  blue: useColor ? '\x1b[0;34m' : '',
  green: useColor ? '\x1b[0;32m' : '',
  yellow: useColor ? '\x1b[0;33m' : '',
  red: useColor ? '\x1b[0;31m' : '',
  cyanBold: useColor ? '\x1b[1;36m' : '',
};

// --- Logging ---
export function logInfo(msg) {
  console.log(`${color.blue}[INFO]${color.reset}  ${msg}`);
}

export function logOk(msg) {
  console.log(`${color.green}[OK]${color.reset}    ${msg}`);
}

export function logWarn(msg) {
  console.log(`${color.yellow}[WARN]${color.reset}  ${msg}`);
}

export function logError(msg) {
  console.log(`${color.red}[ERROR]${color.reset} ${msg}`);
}

export function logStep(msg) {
  console.log(`\n${color.cyanBold}==> ${msg}${color.reset}`);
}

// --- OS Detection ---
export function detectOS() {
  const p = platform();
  if (p === 'darwin') return 'macos';
  if (p === 'win32') return 'windows';
  if (p === 'linux') {
    try {
      const procVersion = readFileSync('/proc/version', 'utf8');
      if (/microsoft/i.test(procVersion)) return 'wsl';
    } catch {
      // /proc/version not readable — plain linux
    }
    return 'linux';
  }
  return 'unknown';
}

// --- Command Check ---
export function checkCommand(cmd) {
  try {
    const where = platform() === 'win32' ? 'where' : 'which';
    execSync(`${where} ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// --- Run command and return stdout (trimmed) ---
export function run(cmd, options = {}) {
  return execSync(cmd, { encoding: 'utf8', ...options }).trim();
}

// --- Version Helpers ---
export function getRepoVersion() {
  const versionFile = join(TOOLBOX_ROOT, 'VERSION');
  if (existsSync(versionFile)) {
    return readFileSync(versionFile, 'utf8').trim();
  }
  return '0.0.0';
}

export function getLocalVersion() {
  if (existsSync(TOOLBOX_VERSION_FILE)) {
    return readFileSync(TOOLBOX_VERSION_FILE, 'utf8').trim();
  }
  return '';
}

export function setLocalVersion(version) {
  writeFileSync(TOOLBOX_VERSION_FILE, version + '\n');
}

// --- Semver Comparison ---
function parseSemver(v) {
  const parts = v.split('.').map(Number);
  return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
}

export function versionGt(a, b) {
  const va = parseSemver(a);
  const vb = parseSemver(b);
  if (va.major !== vb.major) return va.major > vb.major;
  if (va.minor !== vb.minor) return va.minor > vb.minor;
  return va.patch > vb.patch;
}

export function versionEq(a, b) {
  return a === b;
}

// --- Config Helpers ---
export function getConfig(key) {
  if (!existsSync(TOOLBOX_CONFIG_FILE)) return '';
  const lines = readFileSync(TOOLBOX_CONFIG_FILE, 'utf8').split('\n');
  for (const line of lines) {
    if (line.startsWith(`${key}=`)) {
      return line.slice(key.length + 1);
    }
  }
  return '';
}

export function setConfig(key, value) {
  let lines = [];
  if (existsSync(TOOLBOX_CONFIG_FILE)) {
    lines = readFileSync(TOOLBOX_CONFIG_FILE, 'utf8')
      .split('\n')
      .filter(l => !l.startsWith(`${key}=`));
  }
  lines.push(`${key}=${value}`);
  writeFileSync(TOOLBOX_CONFIG_FILE, lines.filter(l => l !== '').join('\n') + '\n');
}

// --- Structure Validation ---
export function validateStructure() {
  let errors = 0;

  // Five-layer directories
  for (const dir of ['Agent', 'In-Process', 'KI', 'PM', 'Tool']) {
    const p = join(TOOLBOX_ROOT, dir);
    if (!existsSync(p) || !statSync(p).isDirectory()) {
      logError(`Missing directory: ${dir}/`);
      errors++;
    }
  }

  // Key files
  for (const file of ['CLAUDE.md', 'README.md', 'VERSION']) {
    if (!existsSync(join(TOOLBOX_ROOT, file))) {
      logError(`Missing file: ${file}`);
      errors++;
    }
  }

  // Agent layer key files
  for (const file of [
    'Agent/rules/iron_laws.md',
    'Agent/rules/constitution.md',
    'Agent/rules/file_governance.md',
  ]) {
    if (!existsSync(join(TOOLBOX_ROOT, file))) {
      logError(`Missing file: ${file}`);
      errors++;
    }
  }

  if (errors === 0) {
    logOk('Five-layer directory structure is valid');
    return true;
  }
  logError(`${errors} structural issue(s) found`);
  return false;
}

// --- Migration Discovery & Execution ---
export function findPendingMigrations(fromVersion, toVersion) {
  const migrationsDir = join(TOOLBOX_ROOT, 'Agent', 'migrations');
  if (!existsSync(migrationsDir)) return [];

  const entries = readdirSync(migrationsDir)
    .filter(f => /^v[\d.]+\.(mjs|sh)$/.test(f))
    .sort((a, b) => {
      const va = a.replace(/^v/, '').replace(/\.(mjs|sh)$/, '');
      const vb = b.replace(/^v/, '').replace(/\.(mjs|sh)$/, '');
      return versionGt(va, vb) ? 1 : versionGt(vb, va) ? -1 : 0;
    });

  const pending = [];
  for (const entry of entries) {
    const scriptVersion = entry.replace(/^v/, '').replace(/\.(mjs|sh)$/, '');
    if (versionGt(scriptVersion, fromVersion) && !versionGt(scriptVersion, toVersion)) {
      pending.push({
        file: entry,
        path: join(migrationsDir, entry),
        version: scriptVersion,
        type: entry.endsWith('.mjs') ? 'mjs' : 'sh',
      });
    }
  }
  return pending;
}

export function runMigrations(fromVersion, toVersion, currentOS) {
  const scripts = findPendingMigrations(fromVersion, toVersion);
  if (scripts.length === 0) {
    logInfo('No migration scripts to run');
    return true;
  }

  logInfo(`Found ${scripts.length} migration(s) to run`);

  for (const script of scripts) {
    logStep(`Migrating to v${script.version}...`);

    if (script.type === 'sh' && currentOS === 'windows') {
      logWarn(`Migration v${script.version} is a .sh script and cannot run on native Windows.`);
      logWarn('Please run this migration in WSL or on macOS/Linux, then retry.');
      return false;
    }

    try {
      if (script.type === 'mjs') {
        run(`node "${script.path}" "${TOOLBOX_ROOT}"`, { stdio: 'inherit' });
      } else {
        run(`bash "${script.path}" "${TOOLBOX_ROOT}"`, { stdio: 'inherit' });
      }
      logOk(`Migration v${script.version} completed`);
    } catch {
      logError(`Migration v${script.version} failed! Aborting.`);
      return false;
    }
  }
  return true;
}

// --- Node.js Version Check ---
export function checkNodeVersion(requiredMajor = 18) {
  if (!checkCommand('node')) return false;
  try {
    const version = run('node --version').replace(/^v/, '');
    const major = parseInt(version.split('.')[0], 10);
    return major >= requiredMajor;
  } catch {
    return false;
  }
}

// --- claude-mem 双层记忆体系 (v1.3.0+, REQ-20260609-210628) ---
export const CLAUDE_MEM_MARKER = '## 双层记忆体系 — claude-mem × Obsidian KI';
const CLAUDE_MEM_MARKETPLACE_URL = 'https://github.com/thedotmack/claude-mem'; // HTTPS 而非 SSH,避免无 SSH key 机器失败

/**
 * 幂等安装 claude-mem plugin(marketplace: thedotmack)。
 * 返回: 'already' | 'installed' | 'failed-cli' | 'failed-install'
 */
export function ensureClaudeMemPlugin() {
  if (!checkCommand('claude')) {
    logWarn('Claude Code CLI 不可用,无法自动安装 claude-mem');
    return 'failed-cli';
  }
  try {
    if (/claude-mem@thedotmack/.test(run('claude plugin list'))) {
      logOk('claude-mem plugin already installed');
      return 'already';
    }
  } catch { /* list 失败不致命,继续走安装 */ }
  try {
    run(`claude plugin marketplace add ${CLAUDE_MEM_MARKETPLACE_URL}`, { stdio: 'pipe' });
  } catch { /* marketplace 已注册或临时失败 — 由下方 install + verify 最终判定 */ }
  try {
    run('claude plugin install claude-mem@thedotmack --scope user', { stdio: 'pipe' });
    if (!/claude-mem@thedotmack/.test(run('claude plugin list'))) {
      throw new Error('安装后 plugin list 中未见 claude-mem');
    }
    logOk('claude-mem installed (marketplace: thedotmack)');
    logInfo('重启 Claude Code 后 hooks 生效;首次会话自动初始化 ~/.claude-mem(如提示则运行: npx claude-mem repair)');
    return 'installed';
  } catch (e) {
    logError(`claude-mem 自动安装失败: ${e.message}`);
    console.log('  手动安装:');
    console.log(`    claude plugin marketplace add ${CLAUDE_MEM_MARKETPLACE_URL}`);
    console.log('    claude plugin install claude-mem@thedotmack --scope user');
    return 'failed-install';
  }
}

/**
 * 给已存在的 ~/.claude/CLAUDE.md 幂等补「双层记忆体系」节(内容唯一来源: 全局模板)。
 * 新用户走模板生成路径,模板已含本节,无需本函数。
 * 返回: 'patched' | 'already' | 'absent' | 'failed'
 */
export function patchGlobalClaudeMdMemSection() {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const globalClaude = join(homeDir, '.claude', 'CLAUDE.md');
  if (!existsSync(globalClaude)) return 'absent';

  const content = readFileSync(globalClaude, 'utf8');
  if (content.includes(CLAUDE_MEM_MARKER)) {
    logOk('全局 CLAUDE.md 已含双层记忆体系节');
    return 'already';
  }
  const tmplPath = join(TOOLBOX_ROOT, 'Agent', 'templates', 'global_claude_md.md');
  if (!existsSync(tmplPath)) {
    logWarn('模板缺失: Agent/templates/global_claude_md.md,无法补节');
    return 'failed';
  }
  const tmpl = readFileSync(tmplPath, 'utf8');
  const start = tmpl.indexOf(CLAUDE_MEM_MARKER);
  if (start === -1) {
    logWarn('模板内未找到双层记忆体系节,无法补节');
    return 'failed';
  }
  let end = tmpl.indexOf('\n## ', start + CLAUDE_MEM_MARKER.length);
  if (end === -1) end = tmpl.length;
  const section = tmpl.slice(start, end)
    .replace(/\{TOOLBOX_ROOT\}/g, TOOLBOX_ROOT.split('\\').join('/'))
    .trimEnd();

  // 与模板顺序一致:插在 Iron Laws 节之前;用户自定义文件找不到该节则追加到末尾
  const ironIdx = content.indexOf('\n## Iron Laws');
  const updated = ironIdx !== -1
    ? `${content.slice(0, ironIdx)}\n${section}\n${content.slice(ironIdx)}`
    : `${content.trimEnd()}\n\n${section}\n`;
  writeFileSync(globalClaude, updated);
  logOk('全局 CLAUDE.md 已补双层记忆体系节(插于 Iron Laws 前)');
  return 'patched';
}

// --- Readline helper (cross-platform interactive prompt) ---
import { createInterface } from 'readline';

export function prompt(question) {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}
