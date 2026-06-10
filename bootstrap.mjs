#!/usr/bin/env node
/**
 * bootstrap.mjs — toolBox unified init & update entry point (cross-platform)
 *
 * Usage:
 *   New user:  git clone <repo> toolBox && cd toolBox && node bootstrap.mjs
 *   Existing:  cd toolBox && git pull && node bootstrap.mjs
 *
 * Flags:
 *   --skip-obsidian     Skip Obsidian setup (use traditional index mode)
 *   --non-interactive   Skip all interactive prompts (CI environments)
 *   --help, -h          Show usage
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, sep } from 'path';
import { execSync } from 'child_process';
import { platform } from 'os';

import {
  TOOLBOX_ROOT,
  logInfo, logOk, logWarn, logError, logStep,
  detectOS, checkCommand, run,
  getRepoVersion, getLocalVersion, setLocalVersion,
  versionEq, versionGt,
  setConfig,
  validateStructure,
  runMigrations,
  checkNodeVersion,
  prompt,
  ensureClaudeMemPlugin,
  patchGlobalClaudeMdMemSection,
} from './Agent/lib/bootstrap-utils.mjs';

// --- Parse flags ---
const args = process.argv.slice(2);
let SKIP_OBSIDIAN = false;
let NON_INTERACTIVE = false;

for (const arg of args) {
  switch (arg) {
    case '--skip-obsidian':
      SKIP_OBSIDIAN = true;
      break;
    case '--non-interactive':
      NON_INTERACTIVE = true;
      SKIP_OBSIDIAN = true;
      break;
    case '--help':
    case '-h':
      console.log('Usage: node bootstrap.mjs [--skip-obsidian] [--non-interactive]');
      console.log('');
      console.log('  --skip-obsidian     Use traditional index mode instead of Obsidian');
      console.log('  --non-interactive   Skip all interactive prompts (CI environments)');
      process.exit(0);
    default:
      logError(`Unknown flag: ${arg}`);
      console.log('Usage: node bootstrap.mjs [--skip-obsidian] [--non-interactive]');
      process.exit(1);
  }
}

// --- Determine mode ---
const LOCAL_VERSION = getLocalVersion();
const REPO_VERSION = getRepoVersion();
let MODE;

if (!LOCAL_VERSION) {
  MODE = 'bootstrap';
  logStep(`toolBox Bootstrap — First-Time Setup (v${REPO_VERSION})`);
} else if (versionEq(LOCAL_VERSION, REPO_VERSION)) {
  logOk(`Already up to date (v${REPO_VERSION})`);
  process.exit(0);
} else if (versionGt(REPO_VERSION, LOCAL_VERSION)) {
  MODE = 'update';
  logStep(`toolBox Update — v${LOCAL_VERSION} → v${REPO_VERSION}`);
} else {
  logWarn(`Local version (${LOCAL_VERSION}) is newer than repo version (${REPO_VERSION}). Nothing to do.`);
  process.exit(0);
}

// ============================================================
// UPDATE MODE — Run migrations and exit
// ============================================================
if (MODE === 'update') {
  const currentOS = detectOS();
  const ok = runMigrations(LOCAL_VERSION, REPO_VERSION, currentOS);
  if (!ok) process.exit(1);

  setLocalVersion(REPO_VERSION);
  console.log('');
  logOk(`Updated to v${REPO_VERSION}`);
  console.log('');
  console.log('=== toolBox Update Summary ===');
  console.log(`  From:    v${LOCAL_VERSION}`);
  console.log(`  To:      v${REPO_VERSION}`);
  console.log('  See CHANGELOG.md for details');
  console.log('');
  process.exit(0);
}

// ============================================================
// BOOTSTRAP MODE — Full first-time setup
// ============================================================

const OS = detectOS();
let REPORT_OS = OS;
let REPORT_NODE = '';
let REPORT_NPM = '';
let REPORT_CLAUDE = '';
let REPORT_OBSIDIAN = '';
let REPORT_MCP = '';
let REPORT_HOOKS = '';
let REPORT_STRUCTURE = '';
let REPORT_KI_MODE = '';
let REPORT_GLOBAL_CLAUDE = '';
let REPORT_CLAUDE_MEM = '';

// --- Step 1: Detect OS ---
logStep('Step 1/9: Detecting OS');
switch (OS) {
  case 'macos':
    logOk('macOS detected');
    break;
  case 'linux':
    logOk('Linux detected');
    break;
  case 'wsl':
    logOk('WSL (Windows Subsystem for Linux) detected');
    break;
  case 'windows':
    logOk('Windows detected');
    break;
  default:
    logWarn('Unknown OS. Proceeding, but some features may not work.');
    break;
}

// --- Step 2: Check prerequisites ---
logStep('Step 2/9: Checking prerequisites');

// git
if (checkCommand('git')) {
  try {
    const gitVer = run('git --version');
    logOk(`git: ${gitVer}`);
  } catch {
    logOk('git: installed');
  }
} else {
  logError('git is not installed');
  if (OS === 'windows') {
    console.log('  Install: https://git-scm.com/download/win');
  } else if (OS === 'macos') {
    console.log('  Install: xcode-select --install');
  } else {
    console.log('  Install: sudo apt install git');
  }
  process.exit(1);
}

// Node.js (we're already running in Node, but check version)
if (checkNodeVersion()) {
  REPORT_NODE = run('node --version');
  logOk(`Node.js: ${REPORT_NODE}`);
} else {
  logError('Node.js >= 18 is required');
  console.log('  Install: https://nodejs.org/');
  process.exit(1);
}

// npm
if (checkCommand('npm')) {
  REPORT_NPM = run('npm --version');
  logOk(`npm: v${REPORT_NPM}`);
} else {
  logError('npm is not installed (should come with Node.js)');
  process.exit(1);
}

// Claude Code CLI
if (checkCommand('claude')) {
  REPORT_CLAUDE = 'installed';
  logOk('Claude Code CLI: installed');
} else {
  logError('Claude Code CLI is not installed');
  console.log('  Install: npm install -g @anthropic-ai/claude-code');
  process.exit(1);
}

// --- Step 3: Validate directory structure ---
logStep('Step 3/9: Validating directory structure');
if (validateStructure()) {
  REPORT_STRUCTURE = 'valid';
} else {
  logError('Directory structure validation failed. Is this a complete toolBox clone?');
  process.exit(1);
}

// --- Step 4: Configure Claude Code hooks ---
logStep('Step 4/9: Configuring Claude Code hooks');

const SETTINGS_LOCAL = join(TOOLBOX_ROOT, '.claude', 'settings.local.json');

function hooksAlreadyConfigured() {
  if (!existsSync(SETTINGS_LOCAL)) return false;
  try {
    const s = JSON.parse(readFileSync(SETTINGS_LOCAL, 'utf8'));
    return !!s.hooks;
  } catch {
    return false;
  }
}

if (hooksAlreadyConfigured()) {
  logOk('Claude Code hooks already configured');
  REPORT_HOOKS = 'configured';
} else {
  // Ensure .claude directory exists
  const claudeDir = join(TOOLBOX_ROOT, '.claude');
  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
  }

  let settings = {};
  if (existsSync(SETTINGS_LOCAL)) {
    try {
      settings = JSON.parse(readFileSync(SETTINGS_LOCAL, 'utf8'));
    } catch { /* start fresh */ }
  }

  settings.hooks = settings.hooks || {};
  settings.hooks.PreToolUse = settings.hooks.PreToolUse || [];

  // Use forward slashes for the hook command path (works on all platforms)
  const hookPath = join(TOOLBOX_ROOT, 'Agent', 'lint', 'pre-commit-hook.mjs').split(sep).join('/');
  const lintHook = `node ${hookPath}`;
  const hasLint = settings.hooks.PreToolUse.some(h => h.hooks && h.hooks.includes(lintHook));

  if (!hasLint) {
    settings.hooks.PreToolUse.push({
      matcher: 'Bash',
      hooks: [lintHook],
    });
  }

  writeFileSync(SETTINGS_LOCAL, JSON.stringify(settings, null, 2) + '\n');
  logOk('Claude Code hooks configured in settings.local.json');
  REPORT_HOOKS = 'configured';
}

// --- Step 5: Knowledge management mode ---
logStep('Step 5/9: Knowledge management setup');

async function setupKnowledgeManagement() {
  if (SKIP_OBSIDIAN) {
    logWarn('Obsidian skipped — using traditional index mode');
    logWarn('Knowledge recall will use index.json + direct file reads (reduced capability)');
    setConfig('ki_mode', 'traditional');
    REPORT_KI_MODE = 'traditional (index.json)';
    REPORT_OBSIDIAN = 'skipped';
    REPORT_MCP = 'skipped';
    return;
  }

  if (NON_INTERACTIVE) {
    setConfig('ki_mode', 'traditional');
    REPORT_KI_MODE = 'traditional (non-interactive)';
    REPORT_OBSIDIAN = 'skipped';
    REPORT_MCP = 'skipped';
    return;
  }

  console.log('');
  console.log('  Knowledge management mode:');
  console.log('    [1] Obsidian (recommended) — full knowledge recall with semantic search');
  console.log('    [2] Traditional index     — basic recall via index.json + file reads');
  console.log('');

  const kiChoice = (await prompt('  Choose [1/2] (default: 1): ')) || '1';

  if (kiChoice === '2') {
    logInfo('Using traditional index mode');
    setConfig('ki_mode', 'traditional');
    REPORT_KI_MODE = 'traditional (index.json)';
    REPORT_OBSIDIAN = 'skipped';
    REPORT_MCP = 'skipped';
    return;
  }

  // --- Obsidian setup ---
  setConfig('ki_mode', 'obsidian');
  REPORT_KI_MODE = 'obsidian (full)';

  // Check if Obsidian is installed
  let obsidianInstalled = false;
  if (OS === 'macos' && existsSync('/Applications/Obsidian.app')) {
    obsidianInstalled = true;
  } else if (OS === 'windows') {
    // Check common Windows install paths
    const localAppData = process.env.LOCALAPPDATA || '';
    if (localAppData && existsSync(join(localAppData, 'Obsidian', 'Obsidian.exe'))) {
      obsidianInstalled = true;
    } else if (checkCommand('obsidian')) {
      obsidianInstalled = true;
    }
  } else if (checkCommand('obsidian')) {
    obsidianInstalled = true;
  }

  if (obsidianInstalled) {
    logOk('Obsidian is installed');
    REPORT_OBSIDIAN = 'installed';
  } else {
    logWarn('Obsidian is not installed');
    if (OS === 'macos') {
      const installObs = (await prompt('  Install Obsidian via Homebrew? [Y/n]: ')) || 'Y';
      if (/^[Yy]/.test(installObs)) {
        logInfo('Installing Obsidian...');
        try {
          run('brew install --cask obsidian', { stdio: 'inherit' });
          REPORT_OBSIDIAN = 'installed';
          logOk('Obsidian installed');
        } catch {
          logError('Failed to install Obsidian via Homebrew');
          REPORT_OBSIDIAN = 'not installed';
        }
      } else {
        console.log('  Please install manually: https://obsidian.md');
        console.log('  Then re-run this script.');
        REPORT_OBSIDIAN = 'not installed';
      }
    } else {
      console.log('  Please install Obsidian manually: https://obsidian.md');
      console.log('  Then re-run this script.');
      REPORT_OBSIDIAN = 'not installed';
    }
  }

  // Guide user through Obsidian configuration
  if (REPORT_OBSIDIAN === 'installed') {
    console.log('');
    console.log('  +----------------------------------------------------+');
    console.log('  | Obsidian Setup (manual steps required)              |');
    console.log('  |                                                     |');
    console.log('  | 1. Open Obsidian                                    |');
    console.log('  | 2. Open folder as vault -> select toolBox/KI/       |');
    console.log('  | 3. Settings -> Community plugins                    |');
    console.log('  |    -> Turn OFF Restricted mode                      |');
    console.log('  |    -> Enable \'Local REST API\' plugin                |');
    console.log('  | 4. Local REST API settings -> copy the API Key      |');
    console.log('  +----------------------------------------------------+');
    console.log('');

    // Loop until user provides API key or skips
    while (true) {
      const apiKey = await prompt("  Paste your Obsidian API Key (or 'skip' to use traditional mode): ");
      if (apiKey === 'skip') {
        logWarn('Obsidian MCP registration skipped. Falling back to traditional mode.');
        setConfig('ki_mode', 'traditional');
        REPORT_KI_MODE = 'traditional (index.json)';
        REPORT_MCP = 'skipped';
        break;
      } else if (apiKey) {
        logInfo('Registering Obsidian MCP server...');
        try {
          run(
            `claude mcp add obsidian-ki --scope user` +
            ` -e OBSIDIAN_API_KEY=${apiKey}` +
            ` -e OBSIDIAN_BASE_URL=https://127.0.0.1:27124` +
            ` -e OBSIDIAN_VERIFY_SSL=false` +
            ` -e OBSIDIAN_ENABLE_CACHE=true` +
            ` -- npx -y obsidian-mcp-server`,
            { stdio: 'ignore' }
          );
          logOk('Obsidian MCP server registered globally');
          REPORT_MCP = 'registered';
        } catch {
          logError('Failed to register MCP server. You can retry later with:');
          console.log('  claude mcp add obsidian-ki --scope user \\');
          console.log('    -e OBSIDIAN_API_KEY=<your-key> \\');
          console.log('    -e OBSIDIAN_BASE_URL=https://127.0.0.1:27124 \\');
          console.log('    -e OBSIDIAN_VERIFY_SSL=false \\');
          console.log('    -e OBSIDIAN_ENABLE_CACHE=true \\');
          console.log('    -- npx -y obsidian-mcp-server');
          REPORT_MCP = 'failed';
        }
        break;
      } else {
        logWarn("API Key cannot be empty. Please paste the key or type 'skip'.");
      }
    }
  }
}

// --- Step 6: claude-mem persistent memory (双层记忆体系第二层) ---
function setupClaudeMem() {
  logStep('Step 6/9: claude-mem persistent memory');
  const result = ensureClaudeMemPlugin();
  REPORT_CLAUDE_MEM = { already: 'installed', installed: 'installed' }[result] || result;
  // 已有全局 CLAUDE.md 的机器(模板生成路径覆盖不到)幂等补「双层记忆体系」节
  const patch = patchGlobalClaudeMdMemSection();
  if (patch === 'patched') REPORT_GLOBAL_CLAUDE = 'mem-section patched';
}

// --- Step 7: Global CLAUDE.md ---
async function setupGlobalClaudeMd() {
  logStep('Step 7/9: Global CLAUDE.md configuration');

  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const globalClaude = join(homeDir, '.claude', 'CLAUDE.md');

  if (existsSync(globalClaude)) {
    logOk('Global CLAUDE.md already exists at ~/.claude/CLAUDE.md');
    REPORT_GLOBAL_CLAUDE = 'exists';
    return;
  }

  if (NON_INTERACTIVE) {
    logInfo('Skipping global CLAUDE.md (non-interactive mode)');
    REPORT_GLOBAL_CLAUDE = 'skipped';
    return;
  }

  console.log('');
  console.log('  Optional: Configure global CLAUDE.md so toolBox rules apply in ALL projects.');
  console.log('  (If you only use Claude Code inside the toolBox directory, this is not needed.)');
  console.log('');

  const setupGlobal = (await prompt('  Set up global CLAUDE.md? [y/N]: ')) || 'N';

  if (/^[Yy]/.test(setupGlobal)) {
    const claudeDir = join(homeDir, '.claude');
    if (!existsSync(claudeDir)) {
      mkdirSync(claudeDir, { recursive: true });
    }

    const templatePath = join(TOOLBOX_ROOT, 'Agent', 'templates', 'global_claude_md.md');
    if (existsSync(templatePath)) {
      let template = readFileSync(templatePath, 'utf8');
      // Replace placeholder with actual path (use forward slashes for consistency)
      const toolboxPathNormalized = TOOLBOX_ROOT.split(sep).join('/');
      template = template.replace(/\{TOOLBOX_ROOT\}/g, toolboxPathNormalized);
      writeFileSync(globalClaude, template);
      logOk('Global CLAUDE.md created at ~/.claude/CLAUDE.md');
      REPORT_GLOBAL_CLAUDE = 'configured';
    } else {
      logWarn('Template not found: Agent/templates/global_claude_md.md');
      REPORT_GLOBAL_CLAUDE = 'skipped';
    }
  } else {
    logInfo('Skipped. You can set this up later.');
    REPORT_GLOBAL_CLAUDE = 'skipped';
  }
}

// --- Step 8: Validation ---
function runValidation() {
  logStep('Step 8/9: Running validation');

  let localErrors = 0;

  for (const f of [
    'CLAUDE.md', 'VERSION', 'CHANGELOG.md',
    'Agent/rules/iron_laws.md', 'Agent/rules/constitution.md',
  ]) {
    if (!existsSync(join(TOOLBOX_ROOT, f))) {
      logWarn(`Missing: ${f}`);
      localErrors++;
    }
  }

  // Validate JSON files
  for (const j of ['Agent/index/skill_registry.json', 'KI/External_KI/master_index.json']) {
    const p = join(TOOLBOX_ROOT, j);
    if (existsSync(p)) {
      try {
        JSON.parse(readFileSync(p, 'utf8'));
      } catch {
        logWarn(`Invalid JSON: ${j}`);
        localErrors++;
      }
    }
  }

  if (localErrors === 0) {
    logOk('Basic validation passed');
  } else {
    logWarn(`${localErrors} validation warning(s)`);
  }
}

// --- Step 9: Finalize & Report ---
function printReport() {
  logStep('Step 9/9: Finalizing');
  setLocalVersion(REPO_VERSION);
  logOk(`Local version set to ${REPO_VERSION}`);

  const pad = (label, value, width = 44) => {
    const content = `  ${label.padEnd(14)} ${value}`;
    return content.padEnd(width);
  };

  console.log('');
  console.log('+==============================================+');
  console.log('|        toolBox Bootstrap Report              |');
  console.log('+==============================================+');
  console.log(`|${pad('OS:', REPORT_OS)}|`);
  console.log(`|${pad('Node.js:', REPORT_NODE || 'N/A')}|`);
  console.log(`|${pad('npm:', REPORT_NPM ? `v${REPORT_NPM}` : 'N/A')}|`);
  console.log(`|${pad('Claude Code:', REPORT_CLAUDE || 'N/A')}|`);
  console.log(`|${pad('Obsidian:', REPORT_OBSIDIAN || 'N/A')}|`);
  console.log(`|${pad('MCP:', REPORT_MCP || 'N/A')}|`);
  console.log(`|${pad('Hooks:', REPORT_HOOKS || 'N/A')}|`);
  console.log(`|${pad('Structure:', REPORT_STRUCTURE || 'N/A')}|`);
  console.log(`|${pad('KI Mode:', REPORT_KI_MODE || 'N/A')}|`);
  console.log(`|${pad('Global CLAUDE:', REPORT_GLOBAL_CLAUDE || 'N/A')}|`);
  console.log(`|${pad('claude-mem:', REPORT_CLAUDE_MEM || 'N/A')}|`);
  console.log(`|${pad('Version:', `v${REPO_VERSION}`)}|`);
  console.log('+==============================================+');
  console.log('|  toolBox is ready. Run \'claude\' to start.   |');
  console.log('+==============================================+');
  console.log('');
}

// --- Main (async wrapper for interactive prompts) ---
async function main() {
  await setupKnowledgeManagement();
  setupClaudeMem();
  await setupGlobalClaudeMd();
  runValidation();
  printReport();
}

main().catch(err => {
  logError(`Unexpected error: ${err.message}`);
  process.exit(1);
});
