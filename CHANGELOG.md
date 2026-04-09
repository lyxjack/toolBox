# Changelog

All notable changes to toolBox will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-04-09

### Added
- `bootstrap.sh` — unified init & update entry point for new and existing users
- `VERSION` file — semver version tracking (this release: 1.0.0)
- `CHANGELOG.md` — human-readable release history (this file)
- `Agent/lib/bootstrap-utils.sh` — shared shell functions for bootstrap and migrations
- `Agent/migrations/` — per-version migration scripts directory
- `/init` command now triggers toolBox bootstrap (replaces old project-level init)
- Knowledge management dual mode: Obsidian (recommended) or traditional index (fallback)

### Changed
- `.claude/commands/init.md` — repurposed from project-level init to toolBox bootstrap entry
- `README.md` — Quick Start updated to reference `bootstrap.sh` / `/init`
- `Agent/guides/setup/README.md` — updated to reference bootstrap flow
- `CLAUDE.md` — root directory whitelist updated to include new files
- `.gitignore` — added `.toolbox_version`, `.toolbox_config`

### Removed
- Old project-level `/init` behavior (project dirs are now created on-demand by workflows)

[Unreleased]: https://github.com/YixinLiu-Lulu/toolBox/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/YixinLiu-Lulu/toolBox/releases/tag/v1.0.0
