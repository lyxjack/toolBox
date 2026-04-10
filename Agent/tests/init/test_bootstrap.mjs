/**
 * test_bootstrap.mjs — Unit tests for bootstrap-utils.mjs
 * Uses Node.js built-in test runner (node:test) — zero dependencies.
 *
 * Run: node --test Agent/tests/init/test_bootstrap.mjs
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

import {
  TOOLBOX_ROOT,
  versionGt,
  versionEq,
  detectOS,
  checkCommand,
  run,
  getRepoVersion,
  getLocalVersion,
  setLocalVersion,
  getConfig,
  setConfig,
  validateStructure,
  findPendingMigrations,
  checkNodeVersion,
  logInfo,
  logOk,
  logWarn,
  logError,
  logStep,
} from '../../lib/bootstrap-utils.mjs';

// ============================================================
// Semver Comparison
// ============================================================
describe('versionGt', () => {
  it('returns true when major is greater', () => {
    assert.equal(versionGt('2.0.0', '1.0.0'), true);
  });

  it('returns true when minor is greater', () => {
    assert.equal(versionGt('1.2.0', '1.1.0'), true);
  });

  it('returns true when patch is greater', () => {
    assert.equal(versionGt('1.1.2', '1.1.1'), true);
  });

  it('returns false when equal', () => {
    assert.equal(versionGt('1.1.1', '1.1.1'), false);
  });

  it('returns false when less', () => {
    assert.equal(versionGt('1.0.0', '2.0.0'), false);
  });

  it('handles single-segment versions', () => {
    assert.equal(versionGt('2', '1'), true);
  });

  it('handles two-segment versions', () => {
    assert.equal(versionGt('1.2', '1.1'), true);
  });
});

describe('versionEq', () => {
  it('returns true for identical strings', () => {
    assert.equal(versionEq('1.1.0', '1.1.0'), true);
  });

  it('returns false for different strings', () => {
    assert.equal(versionEq('1.1.0', '1.1.1'), false);
  });
});

// ============================================================
// OS Detection
// ============================================================
describe('detectOS', () => {
  it('returns a known OS string', () => {
    const os = detectOS();
    assert.ok(
      ['macos', 'linux', 'wsl', 'windows', 'unknown'].includes(os),
      `detectOS() returned unexpected value: ${os}`
    );
  });

  it('returns macos on darwin platform', () => {
    // We can only verify the current platform
    if (process.platform === 'darwin') {
      assert.equal(detectOS(), 'macos');
    }
  });

  it('returns windows on win32 platform', () => {
    if (process.platform === 'win32') {
      assert.equal(detectOS(), 'windows');
    }
  });
});

// ============================================================
// Command Check
// ============================================================
describe('checkCommand', () => {
  it('finds node (we are running in it)', () => {
    assert.equal(checkCommand('node'), true);
  });

  it('finds git', () => {
    assert.equal(checkCommand('git'), true);
  });

  it('returns false for nonexistent command', () => {
    assert.equal(checkCommand('__nonexistent_cmd_xyz__'), false);
  });
});

// ============================================================
// run()
// ============================================================
describe('run', () => {
  it('returns trimmed stdout', () => {
    const result = run('echo hello');
    assert.equal(result, 'hello');
  });

  it('throws on failing command', () => {
    assert.throws(() => run('false'), Error);
  });
});

// ============================================================
// Version Helpers (file-based)
// ============================================================
describe('getRepoVersion', () => {
  it('reads VERSION file from TOOLBOX_ROOT', () => {
    const version = getRepoVersion();
    assert.ok(/^\d+\.\d+\.\d+$/.test(version), `Expected semver, got: ${version}`);
  });

  it('matches actual VERSION file content', () => {
    const expected = readFileSync(join(TOOLBOX_ROOT, 'VERSION'), 'utf8').trim();
    assert.equal(getRepoVersion(), expected);
  });
});

describe('getLocalVersion / setLocalVersion', () => {
  const versionFile = join(TOOLBOX_ROOT, '.toolbox_version');
  let originalContent;

  before(() => {
    if (existsSync(versionFile)) {
      originalContent = readFileSync(versionFile, 'utf8');
    }
  });

  after(() => {
    // Restore original state
    if (originalContent !== undefined) {
      writeFileSync(versionFile, originalContent);
    } else if (existsSync(versionFile)) {
      unlinkSync(versionFile);
    }
  });

  it('setLocalVersion writes and getLocalVersion reads back', () => {
    setLocalVersion('99.88.77');
    assert.equal(getLocalVersion(), '99.88.77');
  });

  it('getLocalVersion returns empty string when file does not exist', () => {
    // Temporarily remove
    const backup = existsSync(versionFile) ? readFileSync(versionFile, 'utf8') : null;
    if (existsSync(versionFile)) unlinkSync(versionFile);
    assert.equal(getLocalVersion(), '');
    // Restore for cleanup
    if (backup !== null) writeFileSync(versionFile, backup);
  });
});

// ============================================================
// Config Helpers
// ============================================================
describe('getConfig / setConfig', () => {
  const configFile = join(TOOLBOX_ROOT, '.toolbox_config');
  let originalContent;

  before(() => {
    if (existsSync(configFile)) {
      originalContent = readFileSync(configFile, 'utf8');
    }
  });

  after(() => {
    if (originalContent !== undefined) {
      writeFileSync(configFile, originalContent);
    } else if (existsSync(configFile)) {
      unlinkSync(configFile);
    }
  });

  it('setConfig writes a key-value pair', () => {
    setConfig('test_key', 'test_value');
    assert.equal(getConfig('test_key'), 'test_value');
  });

  it('setConfig overwrites existing key', () => {
    setConfig('test_key', 'value_1');
    setConfig('test_key', 'value_2');
    assert.equal(getConfig('test_key'), 'value_2');
  });

  it('getConfig returns empty string for missing key', () => {
    assert.equal(getConfig('__nonexistent_key__'), '');
  });

  it('handles values with equals signs', () => {
    setConfig('url_key', 'https://example.com?a=1&b=2');
    assert.equal(getConfig('url_key'), 'https://example.com?a=1&b=2');
  });
});

// ============================================================
// Structure Validation
// ============================================================
describe('validateStructure', () => {
  it('returns true for the real toolBox directory', () => {
    assert.equal(validateStructure(), true);
  });
});

// ============================================================
// Migration Discovery
// ============================================================
describe('findPendingMigrations', () => {
  const migrationsDir = join(TOOLBOX_ROOT, 'Agent', 'migrations');
  let dirExisted;

  before(() => {
    dirExisted = existsSync(migrationsDir);
  });

  it('returns empty array when no migrations directory', () => {
    if (!dirExisted) {
      const result = findPendingMigrations('1.0.0', '2.0.0');
      assert.deepEqual(result, []);
    }
  });

  it('finds .mjs migrations in range', () => {
    // Create temp migration files
    if (!existsSync(migrationsDir)) {
      mkdirSync(migrationsDir, { recursive: true });
    }
    const testFile = join(migrationsDir, 'v1.5.0.mjs');
    writeFileSync(testFile, '// test migration\n');

    try {
      const result = findPendingMigrations('1.0.0', '2.0.0');
      const found = result.find(r => r.version === '1.5.0');
      assert.ok(found, 'Should find v1.5.0.mjs migration');
      assert.equal(found.type, 'mjs');
    } finally {
      unlinkSync(testFile);
      if (!dirExisted) {
        rmSync(migrationsDir, { recursive: true });
      }
    }
  });

  it('excludes migrations outside the version range', () => {
    if (!existsSync(migrationsDir)) {
      mkdirSync(migrationsDir, { recursive: true });
    }
    const testFile = join(migrationsDir, 'v3.0.0.mjs');
    writeFileSync(testFile, '// test migration\n');

    try {
      const result = findPendingMigrations('1.0.0', '2.0.0');
      const found = result.find(r => r.version === '3.0.0');
      assert.equal(found, undefined, 'Should not find v3.0.0 (out of range)');
    } finally {
      unlinkSync(testFile);
      if (!dirExisted) {
        rmSync(migrationsDir, { recursive: true });
      }
    }
  });

  it('finds .sh migrations', () => {
    if (!existsSync(migrationsDir)) {
      mkdirSync(migrationsDir, { recursive: true });
    }
    const testFile = join(migrationsDir, 'v1.3.0.sh');
    writeFileSync(testFile, '#!/bin/bash\n');

    try {
      const result = findPendingMigrations('1.0.0', '2.0.0');
      const found = result.find(r => r.version === '1.3.0');
      assert.ok(found, 'Should find v1.3.0.sh migration');
      assert.equal(found.type, 'sh');
    } finally {
      unlinkSync(testFile);
      if (!dirExisted) {
        rmSync(migrationsDir, { recursive: true });
      }
    }
  });

  it('returns migrations sorted by version', () => {
    if (!existsSync(migrationsDir)) {
      mkdirSync(migrationsDir, { recursive: true });
    }
    const files = ['v1.3.0.mjs', 'v1.1.0.mjs', 'v1.7.0.mjs'];
    for (const f of files) {
      writeFileSync(join(migrationsDir, f), '// test\n');
    }

    try {
      const result = findPendingMigrations('1.0.0', '2.0.0');
      const versions = result.map(r => r.version);
      assert.deepEqual(versions, ['1.1.0', '1.3.0', '1.7.0']);
    } finally {
      for (const f of files) {
        unlinkSync(join(migrationsDir, f));
      }
      if (!dirExisted) {
        rmSync(migrationsDir, { recursive: true });
      }
    }
  });
});

// ============================================================
// Node.js Version Check
// ============================================================
describe('checkNodeVersion', () => {
  it('returns true for current node (must be >= 18)', () => {
    assert.equal(checkNodeVersion(18), true);
  });

  it('returns true for a lower threshold', () => {
    assert.equal(checkNodeVersion(1), true);
  });

  it('returns false for an impossibly high threshold', () => {
    assert.equal(checkNodeVersion(999), false);
  });
});

// ============================================================
// Logging (smoke test — just ensure they don't throw)
// ============================================================
describe('logging functions', () => {
  it('logInfo does not throw', () => {
    assert.doesNotThrow(() => logInfo('test'));
  });

  it('logOk does not throw', () => {
    assert.doesNotThrow(() => logOk('test'));
  });

  it('logWarn does not throw', () => {
    assert.doesNotThrow(() => logWarn('test'));
  });

  it('logError does not throw', () => {
    assert.doesNotThrow(() => logError('test'));
  });

  it('logStep does not throw', () => {
    assert.doesNotThrow(() => logStep('test'));
  });
});

// ============================================================
// TOOLBOX_ROOT
// ============================================================
describe('TOOLBOX_ROOT', () => {
  it('points to a directory containing CLAUDE.md', () => {
    assert.ok(existsSync(join(TOOLBOX_ROOT, 'CLAUDE.md')), 'CLAUDE.md should exist at TOOLBOX_ROOT');
  });

  it('points to a directory containing VERSION', () => {
    assert.ok(existsSync(join(TOOLBOX_ROOT, 'VERSION')), 'VERSION should exist at TOOLBOX_ROOT');
  });
});

// ============================================================
// bootstrap.mjs integration tests
// ============================================================
describe('bootstrap.mjs CLI', () => {
  it('--help exits with code 0 and shows usage', () => {
    const output = run(`node "${join(TOOLBOX_ROOT, 'bootstrap.mjs')}" --help`);
    assert.ok(output.includes('--skip-obsidian'), 'Should mention --skip-obsidian');
    assert.ok(output.includes('--non-interactive'), 'Should mention --non-interactive');
  });

  it('unknown flag exits with code 1', () => {
    assert.throws(
      () => run(`node "${join(TOOLBOX_ROOT, 'bootstrap.mjs')}" --bogus`),
      (err) => err.status === 1,
      'Should exit with code 1 for unknown flag'
    );
  });

  it('imports only Node.js built-in modules', () => {
    const mainContent = readFileSync(join(TOOLBOX_ROOT, 'bootstrap.mjs'), 'utf8');
    const utilsContent = readFileSync(join(TOOLBOX_ROOT, 'Agent', 'lib', 'bootstrap-utils.mjs'), 'utf8');

    const builtins = new Set([
      'fs', 'path', 'os', 'child_process', 'url', 'readline',
      'node:fs', 'node:path', 'node:os', 'node:child_process', 'node:url', 'node:readline',
    ]);

    // Extract all import ... from '...' statements
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    for (const content of [mainContent, utilsContent]) {
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const mod = match[1];
        // Skip relative imports
        if (mod.startsWith('.') || mod.startsWith('/')) continue;
        assert.ok(builtins.has(mod), `Non-builtin import found: '${mod}'`);
      }
    }
  });
});
