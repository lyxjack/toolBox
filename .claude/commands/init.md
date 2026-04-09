---
description: toolBox bootstrap & update. Detects new user (full setup) or existing user (incremental migration).
---

# /init — toolBox Bootstrap & Update

Run the bootstrap script to initialize or update toolBox:

```bash
bash bootstrap.sh
```

## What This Does

The script auto-detects whether you are a **new user** or an **existing user**:

### New User (no `.toolbox_version` file)
Full bootstrap:
1. Check prerequisites (git, Node.js >= 18, Claude Code CLI)
2. Validate five-layer directory structure
3. Configure Claude Code hooks
4. Knowledge management setup (Obsidian recommended, or traditional index fallback)
5. Optional global CLAUDE.md configuration
6. Run validation tests
7. Print status report

### Existing User (`.toolbox_version` exists, behind `VERSION`)
Incremental update:
1. Compare local version vs repo version
2. Run pending migration scripts (`Agent/migrations/v*.sh`) in order
3. Update local version
4. Print upgrade summary

### Already Up To Date
If local version matches repo version, prints "Already up to date." and exits.

## Flags

| Flag | Effect |
|------|--------|
| `--skip-obsidian` | Use traditional index mode instead of Obsidian |
| `--non-interactive` | Skip all interactive prompts (CI environments) |

## Key Files

| File | Purpose |
|------|---------|
| `bootstrap.sh` | Main script (this command runs it) |
| `Agent/lib/bootstrap-utils.sh` | Shared shell functions |
| `Agent/migrations/v*.sh` | Per-version migration scripts |
| `VERSION` | Repo's declared version (semver) |
| `.toolbox_version` | Local installed version (gitignored) |
| `.toolbox_config` | Local config preferences (gitignored) |
| `CHANGELOG.md` | Human-readable release history |

## User's Request

$ARGUMENTS
