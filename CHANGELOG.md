# Changelog

All notable changes to toolBox will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.1.2] - 2026-04-12

### Fixed
- cocos-mcp-server Bug 3: `node_create_node` 默认 layer 从 DEFAULT(1073741824) 改为 UI_2D(33554432)
- cocos-mcp-server Bug 1: `prefab_update_prefab` 自定义脚本组件 `__type__` 从字符串类名转为压缩 UUID
- cocos-mcp-server Bug 2: `prefab_update_prefab` 节点 position/contentSize 不再被重置为默认值

### Added
- cocos-mcp-server: vitest 单元测试框架 + 39 个 bug 修复覆盖测试
- Error Book entries: ERR-014(中文文件名), ERR-015(spriteFrame missing), ERR-016(class ID 损坏), ERR-017(layer 重置)

## [1.1.1] - 2026-04-10

### Added
- `bootstrap.mjs` — cross-platform bootstrap entry point (Node.js ESM), replaces bash-only bootstrap.sh logic
- `Agent/lib/bootstrap-utils.mjs` — cross-platform shared utilities for bootstrap
- `bootstrap.bat` — Windows entry point (thin wrapper calling node bootstrap.mjs)
- `Agent/tests/init/test_bootstrap.mjs` — 44 unit tests for bootstrap-utils
- `Agent/tests/init/test_bootstrap_integration.mjs` — 28 integration tests covering full lifecycle
- Error Book entries: ERR-011, ERR-012, ERR-013

### Changed
- `bootstrap.sh` — refactored to thin wrapper delegating to `node bootstrap.mjs` (backward compatible)
- `README.md` — added Windows Quick Start guide and cross-platform support table
- `.claude/commands/init.md` — added Windows/cross-platform entry commands

## [1.1.0] - 2026-04-09

### Added
- `Agent/lint/prefab-write-guard.mjs` — prefab 写入拦截独立 lint 模块（从 ERR-002/ERR-006 ci_rules 提取）
- `KI/Error_Book/entries/ERR-010` — push 前未确认版号更新的错题记录

### Changed
- ERR-002 / ERR-006 — ci_rules 清空，拦截逻辑迁移至独立 lint 模块

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

[Unreleased]: https://github.com/YixinLiu-Lulu/toolBox/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/YixinLiu-Lulu/toolBox/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/YixinLiu-Lulu/toolBox/releases/tag/v1.0.0
