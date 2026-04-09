# toolBox — Enterprise AI Agent Workspace

A structured, governance-driven workspace for AI agents. toolBox provides a five-layer architecture with built-in quality gates, knowledge management, and workflow orchestration for Claude Code.

## Quick Start

```bash
# 1. Clone
git clone <repo-url> toolBox

# 2. Enter directory
cd toolBox

# 3. Bootstrap (installs dependencies, configures Obsidian, sets up hooks)
bash bootstrap.sh
# Or, inside Claude Code: /init

# 4. Launch Claude Code
claude
```

## Updating

```bash
cd toolBox
git pull
bash bootstrap.sh    # auto-detects version diff, runs incremental migrations
# Or, inside Claude Code: /init
```

## Core Commands

| Command | Description |
|---------|-------------|
| `/init` | Bootstrap & update toolBox. Auto-detects new user (full setup) or existing user (incremental migration). |
| `/pm` | Submit a development request. Triggers the full PM → CTO → Execution → QA → Joint Approval workflow. |
| `/find` | Discover, learn, classify, and ingest external Skills into the knowledge base. |

## Architecture

toolBox uses a five-layer architecture with clear separation of concerns:

```
toolBox/
├── PM/           Product Manager layer — requirement intake, standardization, routing
├── Agent/        Governance & orchestration — roles, rules, workflows, scheduling
├── KI/           Knowledge assets — External Skills index, Internal KI contracts, Error Book
├── Tool/         External skill repositories (read-only, git cloned)
├── In-Process/   Runtime interface contracts
├── CLAUDE.md     Project configuration entry point
├── README.md     This file
└── .claude/
    └── commands/ Project-level commands (/pm, /find, /init)
```

| Layer | Purpose |
|-------|---------|
| **PM** | Single entry point for all requests. Receives, standardizes, classifies, and routes requirements. |
| **Agent** | Governance and orchestration. Defines roles (PM, CTO, QA), rules (Iron Laws, Constitution), and workflow state machines. |
| **KI** | Core knowledge assets. 88 deduplicated skills across 12 categories, project-level knowledge contracts, cross-project Error Book. |
| **Tool** | Read-only storage for git-cloned skill repositories. Source preservation enforced by Iron Law 04. |
| **In-Process** | Runtime artifact contracts. Actual data lives in each project's `.in-process/` directory. |

## Key Concepts

### `{TOOLBOX}` Variable

All internal references use `{TOOLBOX}` as a placeholder for the toolBox root directory. This is resolved at runtime by the agent, enabling cross-platform compatibility with zero configuration.

### Iron Laws

11 non-negotiable rules that govern all agent operations:

1. **NO REQUIREMENT, NO EXECUTION** — No implementation without a requirement package
2. **NO PLAN, NO CODE** — No code without an approved plan
3. **REUSE BEFORE BUILD** — Check existing capabilities before creating new ones
4. **SOURCE PRESERVATION** — `Tool/` is read-only
5. **QA IS A GATE** — No completion claim without QA evidence
6. **NO CI-ONLY APPROVAL** — Build passing alone is not approval
7. **REJECTION REQUIRES REASON CODE** — QA rejection must include a reason code
8. **ARTIFACTS STAY CURRENT** — Artifacts must match actual state
9. **TEMP FILES ARE MANAGED** — Temp files go to `.in-process/scratch/`
10. **PLAN-DRIVEN MODE** — Large changes require a plan artifact first
11. **SKILL FILE GOVERNANCE** — Skill changes must sync all indexes

### Execution Modes

The CTO selects an execution mode during planning:

| Mode | When to Use |
|------|-------------|
| **Serial** | Strong dependencies, high coupling, core flow changes |
| **Parallel** | Independent modules, low overlap, parallelizable testing |
| **Swarm** | Exploratory, multi-approach comparison, large-scale knowledge extraction |

### Anchor Mechanism

Each skill category has an Anchor file (`KI/External_KI/skills/{category}/{category}.md`) — the single source of truth for that category's knowledge. New skills are incrementally merged into anchors, never replacing them.

## Platform Support

| Platform | Status |
|----------|--------|
| macOS | Fully supported |
| Windows | Supported (PowerShell / WSL2) |
| Linux | Fully supported |

See [Setup Guide](Agent/guides/setup/README.md) for platform-specific instructions.

## Optional: Global Configuration

If you want toolBox governance rules available in **other project directories**:

1. Copy `Agent/templates/global_claude_md.md` to `~/.claude/CLAUDE.md`
2. Replace `{TOOLBOX_ROOT}` with your actual toolBox path

This is entirely optional — all functionality works within the toolBox directory without it.

## Documentation

| Document | Path |
|----------|------|
| Setup Guide | `Agent/guides/setup/README.md` |
| Init Manual | `Agent/templates/architecture_overview.md` |
| Constitution | `Agent/rules/constitution.md` |
| Iron Laws | `Agent/rules/iron_laws.md` |
| File Governance | `Agent/rules/file_governance.md` |
| QA Standard | `Agent/rules/qa_standard.md` |
| Orchestration Strategy | `Agent/orchestrator/strategy.md` |

## License

Copyright 2026 Yixin Liu

Licensed under the Apache License, Version 2.0 — see [LICENSE](LICENSE) for the full text.

You may use, modify, and distribute this software under the terms of the license. Contributions are welcome under the same terms.

> **Note**: The `Tool/` layer contains third-party git-cloned repositories, each governed by their own respective licenses. Please review individual repository licenses before redistribution.
