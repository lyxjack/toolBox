/**
 * test_bootstrap_integration.mjs — End-to-end integration tests for bootstrap.mjs
 * Simulates full bootstrap lifecycle: fresh install → already up to date → update mode.
 * Uses --non-interactive to avoid interactive prompts.
 *
 * Run: node --test Agent/tests/init/test_bootstrap_integration.mjs
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, unlinkSync, copyFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

import { TOOLBOX_ROOT } from '../../lib/bootstrap-utils.mjs';

// --- Helpers ---
const BOOTSTRAP_MJS = join(TOOLBOX_ROOT, 'bootstrap.mjs');
const BOOTSTRAP_SH = join(TOOLBOX_ROOT, 'bootstrap.sh');
const VERSION_FILE = join(TOOLBOX_ROOT, '.toolbox_version');
const CONFIG_FILE = join(TOOLBOX_ROOT, '.toolbox_config');
const SETTINGS_LOCAL = join(TOOLBOX_ROOT, '.claude', 'settings.local.json');

function runBootstrap(args = '', opts = {}) {
  return execSync(`node "${BOOTSTRAP_MJS}" ${args}`, {
    encoding: 'utf8',
    cwd: TOOLBOX_ROOT,
    timeout: 30000,
    env: { ...process.env, NO_COLOR: '1' },
    ...opts,
  });
}

function runBootstrapSh(args = '') {
  return execSync(`bash "${BOOTSTRAP_SH}" ${args}`, {
    encoding: 'utf8',
    cwd: TOOLBOX_ROOT,
    timeout: 30000,
    env: { ...process.env, NO_COLOR: '1' },
  });
}

function runBootstrapExit(args = '') {
  try {
    runBootstrap(args);
    return { code: 0 };
  } catch (e) {
    return { code: e.status, stderr: e.stderr, stdout: e.stdout };
  }
}

// --- State backup/restore ---
let backups = {};

function backupFile(path, key) {
  if (existsSync(path)) {
    backups[key] = readFileSync(path, 'utf8');
  } else {
    backups[key] = null; // mark as non-existent
  }
}

function restoreFile(path, key) {
  if (backups[key] === null) {
    if (existsSync(path)) unlinkSync(path);
  } else if (backups[key] !== undefined) {
    writeFileSync(path, backups[key]);
  }
}

// ============================================================
// Full lifecycle integration test
// ============================================================
describe('Bootstrap lifecycle (integration)', () => {
  before(() => {
    backupFile(VERSION_FILE, 'version');
    backupFile(CONFIG_FILE, 'config');
    backupFile(SETTINGS_LOCAL, 'settings');
  });

  after(() => {
    restoreFile(VERSION_FILE, 'version');
    restoreFile(CONFIG_FILE, 'config');
    restoreFile(SETTINGS_LOCAL, 'settings');
  });

  // --- Phase 1: Fresh install (new user) ---
  describe('Phase 1: Fresh install (--non-interactive)', () => {
    let output;

    before(() => {
      // Remove version file to simulate new user
      if (existsSync(VERSION_FILE)) unlinkSync(VERSION_FILE);
      // Remove config to get clean state
      if (existsSync(CONFIG_FILE)) unlinkSync(CONFIG_FILE);
      output = runBootstrap('--non-interactive');
    });

    it('shows First-Time Setup header', () => {
      assert.ok(output.includes('First-Time Setup'), `Missing header. Output:\n${output}`);
    });

    it('Step 1: detects OS', () => {
      assert.ok(
        output.includes('Step 1/8: Detecting OS'),
        'Missing Step 1'
      );
      assert.ok(
        output.includes('detected') || output.includes('Unknown OS'),
        'No OS detection result'
      );
    });

    it('Step 2: checks prerequisites (git, node, npm, claude)', () => {
      assert.ok(output.includes('Step 2/8: Checking prerequisites'), 'Missing Step 2');
      assert.ok(output.includes('git:'), 'Missing git check');
      assert.ok(output.includes('Node.js:'), 'Missing Node.js check');
      assert.ok(output.includes('npm:'), 'Missing npm check');
      // Claude Code CLI may or may not be installed
      assert.ok(
        output.includes('Claude Code CLI:') || output.includes('Claude Code CLI is not installed'),
        'Missing Claude CLI check'
      );
    });

    it('Step 3: validates directory structure', () => {
      assert.ok(output.includes('Step 3/8: Validating directory structure'), 'Missing Step 3');
      assert.ok(output.includes('Five-layer directory structure is valid'), 'Structure validation failed');
    });

    it('Step 4: configures hooks', () => {
      assert.ok(output.includes('Step 4/8: Configuring Claude Code hooks'), 'Missing Step 4');
      assert.ok(
        output.includes('hooks already configured') || output.includes('hooks configured'),
        'Hooks not configured'
      );
    });

    it('Step 5: knowledge management (skipped in non-interactive)', () => {
      assert.ok(output.includes('Step 5/8: Knowledge management setup'), 'Missing Step 5');
      assert.ok(output.includes('Obsidian skipped'), 'Non-interactive should skip Obsidian');
    });

    it('Step 6: global CLAUDE.md (skipped in non-interactive)', () => {
      assert.ok(output.includes('Step 6/8: Global CLAUDE.md'), 'Missing Step 6');
      assert.ok(
        output.includes('already exists') || output.includes('Skipping') || output.includes('configured'),
        'Step 6 did not complete'
      );
    });

    it('Step 7: runs validation', () => {
      assert.ok(output.includes('Step 7/8: Running validation'), 'Missing Step 7');
      assert.ok(
        output.includes('validation passed') || output.includes('validation warning'),
        'No validation result'
      );
    });

    it('Step 8: finalizes and prints report', () => {
      assert.ok(output.includes('Step 8/8: Finalizing'), 'Missing Step 8');
      assert.ok(output.includes('Bootstrap Report'), 'Missing Bootstrap Report');
      assert.ok(output.includes("toolBox is ready"), 'Missing ready message');
    });

    it('creates .toolbox_version file', () => {
      assert.ok(existsSync(VERSION_FILE), '.toolbox_version should exist after bootstrap');
      const localVer = readFileSync(VERSION_FILE, 'utf8').trim();
      const repoVer = readFileSync(join(TOOLBOX_ROOT, 'VERSION'), 'utf8').trim();
      assert.equal(localVer, repoVer, 'Local version should match repo version');
    });

    it('creates .toolbox_config with ki_mode=traditional', () => {
      assert.ok(existsSync(CONFIG_FILE), '.toolbox_config should exist');
      const content = readFileSync(CONFIG_FILE, 'utf8');
      assert.ok(content.includes('ki_mode=traditional'), 'Should set ki_mode=traditional in non-interactive');
    });

    it('creates or updates settings.local.json with hooks', () => {
      assert.ok(existsSync(SETTINGS_LOCAL), 'settings.local.json should exist');
      const settings = JSON.parse(readFileSync(SETTINGS_LOCAL, 'utf8'));
      assert.ok(settings.hooks, 'hooks key should exist');
      assert.ok(settings.hooks.PreToolUse, 'PreToolUse hooks should exist');
      const lintHook = settings.hooks.PreToolUse.find(h =>
        h.hooks && h.hooks.some(cmd => {
          // hooks entries can be strings or objects with a .command property
          const cmdStr = typeof cmd === 'string' ? cmd : cmd?.command || '';
          return cmdStr.includes('pre-commit-hook.mjs');
        })
      );
      assert.ok(lintHook, 'Lint hook should be registered');
    });

    it('report contains all expected fields', () => {
      const fields = ['OS:', 'Node.js:', 'npm:', 'Obsidian:', 'Hooks:', 'Structure:', 'KI Mode:', 'Version:'];
      for (const field of fields) {
        assert.ok(output.includes(field), `Report missing field: ${field}`);
      }
    });
  });

  // --- Phase 2: Already up to date ---
  describe('Phase 2: Already up to date', () => {
    it('exits immediately with "Already up to date"', () => {
      const output = runBootstrap('--non-interactive');
      assert.ok(output.includes('Already up to date'), `Expected "Already up to date", got:\n${output}`);
    });

    it('does not re-run the 8 steps', () => {
      const output = runBootstrap('--non-interactive');
      assert.ok(!output.includes('Step 1/8'), 'Should not run Step 1 when already up to date');
    });
  });

  // --- Phase 3: Update mode ---
  describe('Phase 3: Update mode (simulated)', () => {
    let output;

    before(() => {
      // Set local version to something older to trigger update mode
      writeFileSync(VERSION_FILE, '0.0.1\n');
      output = runBootstrap('--non-interactive');
    });

    it('shows Update header with version transition', () => {
      assert.ok(output.includes('toolBox Update'), 'Missing update header');
      assert.ok(output.includes('0.0.1'), 'Should mention old version');
    });

    it('shows Update Summary', () => {
      assert.ok(output.includes('Update Summary'), 'Missing Update Summary');
      assert.ok(output.includes('From:'), 'Missing From: field');
      assert.ok(output.includes('To:'), 'Missing To: field');
    });

    it('updates .toolbox_version to repo version', () => {
      const localVer = readFileSync(VERSION_FILE, 'utf8').trim();
      const repoVer = readFileSync(join(TOOLBOX_ROOT, 'VERSION'), 'utf8').trim();
      assert.equal(localVer, repoVer);
    });
  });

  // --- Phase 4: Newer local version ---
  describe('Phase 4: Local version newer than repo', () => {
    it('shows "Nothing to do" warning', () => {
      writeFileSync(VERSION_FILE, '999.0.0\n');
      const output = runBootstrap('--non-interactive');
      assert.ok(output.includes('Nothing to do'), 'Should say nothing to do when local > repo');
    });
  });
});

// ============================================================
// bootstrap.sh wrapper integration
// ============================================================
describe('bootstrap.sh wrapper (integration)', () => {
  before(() => {
    backupFile(VERSION_FILE, 'version_sh');
  });

  after(() => {
    restoreFile(VERSION_FILE, 'version_sh');
  });

  it('delegates to bootstrap.mjs (already up to date path)', () => {
    // Ensure version matches so we hit the fast path
    const repoVer = readFileSync(join(TOOLBOX_ROOT, 'VERSION'), 'utf8').trim();
    writeFileSync(VERSION_FILE, repoVer + '\n');
    const output = runBootstrapSh();
    assert.ok(output.includes('Already up to date'), 'bootstrap.sh should delegate to bootstrap.mjs');
  });

  it('forwards --help flag', () => {
    const output = runBootstrapSh('--help');
    assert.ok(output.includes('--skip-obsidian'), '--help should be forwarded');
    assert.ok(output.includes('--non-interactive'), '--help should be forwarded');
  });

  it('forwards --non-interactive flag', () => {
    // Set old version to trigger bootstrap mode
    writeFileSync(VERSION_FILE, '0.0.1\n');
    const output = runBootstrapSh('--non-interactive');
    assert.ok(output.includes('toolBox Update'), 'Should run update mode via bootstrap.sh');
  });
});

// ============================================================
// --skip-obsidian flag
// ============================================================
describe('--skip-obsidian flag', () => {
  before(() => {
    backupFile(VERSION_FILE, 'version_skip');
    backupFile(CONFIG_FILE, 'config_skip');
    backupFile(SETTINGS_LOCAL, 'settings_skip');
    if (existsSync(VERSION_FILE)) unlinkSync(VERSION_FILE);
    if (existsSync(CONFIG_FILE)) unlinkSync(CONFIG_FILE);
  });

  after(() => {
    restoreFile(VERSION_FILE, 'version_skip');
    restoreFile(CONFIG_FILE, 'config_skip');
    restoreFile(SETTINGS_LOCAL, 'settings_skip');
  });

  it('skips Obsidian but completes all 8 steps', () => {
    const output = runBootstrap('--skip-obsidian --non-interactive');
    assert.ok(output.includes('Obsidian skipped'), 'Should skip Obsidian');
    assert.ok(output.includes('Bootstrap Report'), 'Should still complete with report');
    assert.ok(output.includes('toolBox is ready'), 'Should show ready message');
  });
});

// ============================================================
// Error paths
// ============================================================
describe('Error paths', () => {
  it('unknown flag returns exit code 1', () => {
    const result = runBootstrapExit('--invalid-flag');
    assert.equal(result.code, 1, 'Should exit with code 1');
  });

  it('multiple unknown flags return exit code 1', () => {
    const result = runBootstrapExit('--foo --bar');
    assert.equal(result.code, 1);
  });
});

// ============================================================
// Cross-platform path handling
// ============================================================
describe('Cross-platform concerns', () => {
  it('settings.local.json hook paths use forward slashes', () => {
    if (existsSync(SETTINGS_LOCAL)) {
      const settings = JSON.parse(readFileSync(SETTINGS_LOCAL, 'utf8'));
      const hooks = settings.hooks?.PreToolUse || [];
      for (const h of hooks) {
        for (const entry of (h.hooks || [])) {
          const cmdStr = typeof entry === 'string' ? entry : entry?.command || '';
          assert.ok(!cmdStr.includes('\\'), `Hook command should not contain backslashes: ${cmdStr}`);
        }
      }
    }
  });

  it('bootstrap.mjs has no platform-blocking exit for windows', () => {
    const content = readFileSync(BOOTSTRAP_MJS, 'utf8');
    // The old bootstrap.sh had: if windows -> exit 1
    // bootstrap.mjs should NOT have this pattern
    assert.ok(
      !content.includes("'windows':\n    logError") && !content.includes("process.exit(1);\n    break;\n  case 'windows'"),
      'bootstrap.mjs should not block Windows with exit(1)'
    );
    // Verify windows case exists and does NOT exit
    assert.ok(
      content.includes("case 'windows':"),
      'Should have a windows case in OS detection'
    );
  });

  it('bootstrap.bat exists and references bootstrap.mjs', () => {
    const batPath = join(TOOLBOX_ROOT, 'bootstrap.bat');
    assert.ok(existsSync(batPath), 'bootstrap.bat should exist');
    const content = readFileSync(batPath, 'utf8');
    assert.ok(content.includes('bootstrap.mjs'), 'bootstrap.bat should reference bootstrap.mjs');
    assert.ok(content.includes('node'), 'bootstrap.bat should call node');
  });
});
