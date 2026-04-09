# Migration Scripts

Per-version migration scripts for incremental toolBox updates.

## How It Works

When a user runs `bash bootstrap.sh` (or `/init` in Claude Code) after `git pull`:
1. Script reads `.toolbox_version` (local) and `VERSION` (repo)
2. Finds migration scripts where version > local AND <= repo
3. Runs them sequentially in semver order
4. Updates `.toolbox_version` to the new version

## Migration Script Convention

**Filename**: `v{MAJOR}.{MINOR}.{PATCH}.sh` — the version this script migrates TO.

**Contract**:
- Must `source` `Agent/lib/bootstrap-utils.sh` for shared functions
- Must be **idempotent** (safe to run twice)
- Must use `log_info/ok/warn/error` for output
- Must `exit 0` on success, non-zero on failure
- Must NOT execute git operations
- Receives `$TOOLBOX_ROOT` via the sourced utils (or as `$1`)

**Example** (`Agent/migrations/v1.1.0.sh`):
```bash
#!/usr/bin/env bash
# Migration: 1.0.0 -> 1.1.0
# What changed: Added SessionStart hook for game engine detection
set -euo pipefail
source "$(dirname "$0")/../lib/bootstrap-utils.sh"

log_info "Adding SessionStart hook..."

# Check if already done (idempotent)
if [[ -f "$TOOLBOX_ROOT/.some-marker" ]]; then
  log_ok "Already applied, skipping."
  exit 0
fi

# Apply change
# ...

log_ok "Migration complete."
```

## Version Bump Rules

| Bump | When | Migration needed? |
|------|------|-------------------|
| **MAJOR** (X.0.0) | Breaking change to five-layer structure, incompatible config change | Always |
| **MINOR** (x.X.0) | New feature, new workflow, new hook, new guide | Usually |
| **PATCH** (x.x.X) | Bug fix, doc correction, typo fix | Rarely |

## Release Checklist

1. Update `VERSION` file with new version number
2. Update `CHANGELOG.md`:
   - Move items from `[Unreleased]` to new version section
   - Add release date
   - Add comparison link at bottom
3. If structural/config changes exist:
   - Create `Agent/migrations/vX.Y.Z.sh`
   - Test: run twice, verify no errors (idempotency)
4. Commit: `git commit -m "release: vX.Y.Z"`
5. Tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
6. Push: `git push origin main --tags`
