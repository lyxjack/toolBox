---
name: meta-tooling
category: meta-tooling
type: anchor
confidence: 0.85
anchor_base: writing-skills
created: 2026-03-11
lastUpdated: 2026-03-11
merged_from:
  - name: writing-skills
    confidence: 0.85
    origin: superpowers
  - name: skill-stocktake
    confidence: 0.82
    origin: ECC
  - name: skill-creator
    confidence: 0.68
    origin: independent
  - name: project-guidelines-example
    confidence: 0.65
    origin: ECC
  - name: configure-ecc
    confidence: 0.62
    origin: ECC
  - name: find-skills
    confidence: 0.50
    origin: independent
  - name: using-superpowers
    confidence: 0.25
    origin: superpowers
  - name: nanoclaw-repl
    confidence: 0.12
    origin: ECC
iron_law: >
  This anchor file is immutable during normal operations.
  Any modification requires explicit governance approval through the
  Agent layer workflow. Do not edit, split, or duplicate this file
  without following the Skill File Governance process defined in
  Agent/rules/iron_laws.md §11.
---

# Meta-Tooling: Skill Creation, Discovery, Auditing & Configuration

Consolidated anchor for meta-tooling skills covering skill authoring with TDD methodology, skill auditing and stocktake, skill creation workflows, discovery and installation, project guidelines templates, ECC configuration, REPL tooling, and skill invocation discipline.

## When to Activate

- Creating, improving, or testing skills
- Auditing skill quality, overlap, or freshness
- Discovering and installing skills from the ecosystem
- Configuring Everything Claude Code (ECC)
- Setting up project-level guidelines or templates
- Working with NanoClaw REPL sessions
- Reviewing skill invocation discipline

---

# Part 1: Writing Skills (TDD for Documentation)

Writing skills IS Test-Driven Development applied to process documentation. You write test cases (pressure scenarios with subagents), watch them fail (baseline behavior), write the skill (documentation), watch tests pass (agents comply), and refactor (close loopholes).

**Core principle:** If you didn't watch an agent fail without the skill, you don't know if the skill teaches the right thing.

## What is a Skill

A skill is a reference guide for proven techniques, patterns, or tools. Skills help future Claude instances find and apply effective approaches.

**Skills are:** Reusable techniques, patterns, tools, reference guides
**Skills are NOT:** Narratives about how you solved a problem once

## When to Create a Skill

**Create when:**
- Technique wasn't intuitively obvious
- You'd reference this again across projects
- Pattern applies broadly (not project-specific)
- Others would benefit

**Don't create for:**
- One-off solutions
- Standard practices well-documented elsewhere
- Project-specific conventions (put in CLAUDE.md)
- Mechanical constraints enforceable with regex/validation

## Skill Types

- **Technique**: Concrete method with steps (condition-based-waiting, root-cause-tracing)
- **Pattern**: Way of thinking about problems (flatten-with-flags, test-invariants)
- **Reference**: API docs, syntax guides, tool documentation

## SKILL.md Structure

**Frontmatter (YAML):** Only `name` and `description` fields supported. Max 1024 characters total.
- `name`: Letters, numbers, hyphens only
- `description`: Third-person, describes ONLY when to use (NOT what it does). Start with "Use when..."

```markdown
---
name: Skill-Name-With-Hyphens
description: Use when [specific triggering conditions and symptoms]
---

# Skill Name
## Overview -- Core principle in 1-2 sentences
## When to Use -- Symptoms and use cases, when NOT to use
## Core Pattern -- Before/after code comparison
## Quick Reference -- Table or bullets for scanning
## Implementation -- Inline code or link to separate file
## Common Mistakes -- What goes wrong + fixes
```

## Claude Search Optimization (CSO)

### Rich Description Field

**CRITICAL: Description = When to Use, NOT What the Skill Does.** Testing revealed that when a description summarizes workflow, Claude may follow the description instead of reading the full skill content. Descriptions that summarize workflow create a shortcut Claude will take.

```yaml
# BAD: Summarizes workflow
description: Use when executing plans - dispatches subagent per task with code review between tasks

# GOOD: Just triggering conditions
description: Use when executing implementation plans with independent tasks in the current session
```

### Keyword Coverage

Use words Claude would search for: error messages, symptoms, synonyms, tool names.

### Token Efficiency

- getting-started workflows: <150 words each
- Frequently-loaded skills: <200 words total
- Other skills: <500 words
- Move details to tool `--help`, use cross-references, compress examples

## The Iron Law

```
NO SKILL WITHOUT A FAILING TEST FIRST
```

Applies to NEW skills AND EDITS. Write skill before testing? Delete it. Start over. No exceptions.

## RED-GREEN-REFACTOR for Skills

### RED: Write Failing Test (Baseline)

Run pressure scenario with subagent WITHOUT the skill. Document exact behavior: choices made, rationalizations used (verbatim), which pressures triggered violations.

### GREEN: Write Minimal Skill

Address those specific rationalizations. Run same scenarios WITH skill -- agent should comply.

### REFACTOR: Close Loopholes

Agent found new rationalization? Add explicit counter. Re-test until bulletproof.

## Bulletproofing Against Rationalization

### Close Every Loophole Explicitly

```markdown
Write code before test? Delete it. Start over.

**No exceptions:**
- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Delete means delete
```

### Build Rationalization Table

| Excuse | Reality |
|--------|---------|
| "Skill is obviously clear" | Clear to you does not equal clear to other agents. Test it. |
| "Testing is overkill" | Untested skills have issues. Always. |
| "I'm confident it's good" | Overconfidence guarantees issues. |

## Skill Creation Checklist

**RED Phase:**
- Create pressure scenarios (3+ combined pressures for discipline skills)
- Run WITHOUT skill -- document baseline behavior verbatim
- Identify rationalization patterns

**GREEN Phase:**
- Name: letters, numbers, hyphens only
- YAML frontmatter with name and description (max 1024 chars)
- Description starts with "Use when..." with specific triggers
- Address specific baseline failures
- Run WITH skill -- verify compliance

**REFACTOR Phase:**
- Identify new rationalizations from testing
- Add explicit counters, rationalization table, red flags list
- Re-test until bulletproof

---

# Part 2: Skill Stocktake (Auditing)

Slash command (`/skill-stocktake`) that audits all Claude skills using a quality checklist + AI holistic judgment. Supports Quick Scan (recently changed) and Full Stocktake (complete review).

## Scope

| Path | Description |
|------|-------------|
| `~/.claude/skills/` | Global skills |
| `{cwd}/.claude/skills/` | Project-level skills (if exists) |

## Modes

| Mode | Trigger | Duration |
|------|---------|---------|
| Quick Scan | `results.json` exists | 5-10 min |
| Full Stocktake | `results.json` absent, or `/skill-stocktake full` | 20-30 min |

## Full Stocktake Flow

### Phase 1 -- Inventory

Run `scan.sh` to enumerate skill files, extract frontmatter, collect UTC mtimes.

### Phase 2 -- Quality Evaluation

Launch subagent (Explore agent, model: opus) with full inventory and checklist. Each skill evaluated against:

- Content overlap with other skills checked
- Overlap with MEMORY.md / CLAUDE.md checked
- Freshness of technical references verified
- Usage frequency considered

**Verdict criteria:**

| Verdict | Meaning |
|---------|---------|
| Keep | Useful and current |
| Improve | Worth keeping, specific improvements needed |
| Update | Referenced technology outdated |
| Retire | Low quality, stale, or cost-asymmetric |
| Merge into [X] | Substantial overlap with another skill |

**Evaluation dimensions:** Actionability, Scope fit, Uniqueness, Currency.

**Reason quality:** Must be self-contained and decision-enabling. Never write "unchanged" alone -- always restate core evidence.

### Phase 3 -- Summary Table

| Skill | 7d use | Verdict | Reason |
|-------|--------|---------|--------|

### Phase 4 -- Consolidation

1. **Retire/Merge**: Present detailed justification before confirming with user
2. **Improve**: Present specific suggestions with rationale
3. **Update**: Present updated content with sources checked
4. Check MEMORY.md line count; propose compression if >100 lines

---

# Part 3: Skill Creator (Creation & Iteration Workflow)

A skill for creating new skills and iteratively improving them through eval-driven development.

## Core Loop

1. Decide what the skill should do
2. Write a draft
3. Create test prompts and run claude-with-skill on them
4. Evaluate results (qualitative via viewer + quantitative via benchmarks)
5. Rewrite based on feedback
6. Repeat until satisfied
7. Expand test set and try at larger scale

## Creating a Skill

### Capture Intent

1. What should this skill enable Claude to do?
2. When should this skill trigger?
3. What's the expected output format?
4. Should we set up test cases?

### Skill Writing Guide

```
skill-name/
  SKILL.md (required) -- YAML frontmatter + markdown instructions
  scripts/            -- Executable code for deterministic tasks
  references/         -- Docs loaded into context as needed
  assets/             -- Files used in output
```

**Progressive Disclosure:** Metadata always in context (~100 words), SKILL.md body when triggered (<500 lines), bundled resources as needed.

**Description should be "pushy"** -- combat undertriggering by including contexts for when to use.

### Test Cases

Save to `evals/evals.json`. Create 2-3 realistic test prompts.

## Running and Evaluating

1. Spawn with-skill AND baseline runs in same turn
2. Draft assertions while runs are in progress
3. Capture timing data as runs complete
4. Grade, aggregate, launch viewer with `generate_review.py`
5. Read feedback and iterate

## Description Optimization

Generate 20 trigger eval queries (mix of should-trigger and should-not-trigger). Run optimization loop:

```bash
python -m scripts.run_loop --eval-set <path> --skill-path <path> --model <model-id> --max-iterations 5
```

---

# Part 4: Skill Discovery and Installation

## Skills CLI

The Skills CLI (`npx skills`) is the package manager for the open agent skills ecosystem.

**Key commands:**
- `npx skills find [query]` -- Search for skills
- `npx skills add <package>` -- Install a skill
- `npx skills check` -- Check for updates
- `npx skills update` -- Update all installed skills

**Browse skills at:** https://skills.sh/

## How to Help Users Find Skills

1. **Understand the need**: Identify domain, specific task, and commonality
2. **Search**: `npx skills find [query]`
3. **Present options**: Name, description, install command, skills.sh link
4. **Install**: `npx skills add <owner/repo@skill> -g -y`

## Common Skill Categories

| Category | Example Queries |
|----------|----------------|
| Web Development | react, nextjs, typescript, css, tailwind |
| Testing | testing, jest, playwright, e2e |
| DevOps | deploy, docker, kubernetes, ci-cd |
| Documentation | docs, readme, changelog, api-docs |
| Code Quality | review, lint, refactor, best-practices |
| Design | ui, ux, design-system, accessibility |
| Productivity | workflow, automation, git |

## When No Skills Are Found

1. Acknowledge no existing skill was found
2. Offer to help directly with general capabilities
3. Suggest creating a custom skill with `npx skills init`

---

# Part 5: Project Guidelines Template

Template for creating project-specific skills. Based on real production application patterns.

## Project Skill Contents

- Architecture overview (tech stack, services)
- File structure
- Code patterns (API response format, frontend API calls, hooks)
- Testing requirements (backend + frontend)
- Deployment workflow and checklists
- Critical rules and environment variables

## Example Architecture

```
Frontend: Next.js 15 + TypeScript + TailwindCSS
Backend:  FastAPI + Python 3.11 + Pydantic
Database: Supabase (PostgreSQL)
AI:       Claude API with tool calling
Deploy:   Google Cloud Run
Testing:  Playwright (E2E), pytest (backend), React Testing Library
```

## Critical Rules for Projects

1. Immutability -- never mutate objects or arrays
2. TDD -- write tests before implementation
3. 80% coverage minimum
4. Many small files (200-400 lines typical, 800 max)
5. No console.log in production code
6. Proper error handling with try/catch
7. Input validation with Pydantic/Zod

---

# Part 6: ECC Configuration Wizard

Interactive installation wizard for Everything Claude Code. Uses step-by-step selection of skills and rules.

## Installation Flow

1. **Clone ECC**: `git clone https://github.com/affaan-m/everything-claude-code.git /tmp/everything-claude-code`
2. **Choose Level**: User-level (`~/.claude/`), Project-level (`.claude/`), or Both
3. **Select Skills**: Core (recommended) or Core + Niche categories
4. **Select Rules**: Common (8 files), TypeScript (5), Python (5), Go (5)
5. **Verify**: Check file existence, path references, cross-references
6. **Optimize** (optional): Remove irrelevant sections, adjust paths, customize

## Skill Categories

- **Framework & Language** (17 skills): Django, Spring Boot, Go, Python, Java, Frontend, Backend
- **Database** (3 skills): PostgreSQL, ClickHouse, JPA/Hibernate
- **Workflow & Quality** (8 skills): TDD, verification, learning, security, compaction
- **Business & Content** (5 skills): Article writing, content engine, market research, investor materials

---

# Part 7: Skill Invocation Discipline

**Invoke relevant skills BEFORE any response or action.** Even a 1% chance a skill might apply means invoke to check.

## Red Flags (Stop -- You're Rationalizing)

| Thought | Reality |
|---------|---------|
| "This is just a simple question" | Questions are tasks. Check for skills. |
| "I need more context first" | Skill check comes BEFORE clarifying questions. |
| "Let me explore the codebase first" | Skills tell you HOW to explore. |
| "This doesn't need a formal skill" | If a skill exists, use it. |
| "The skill is overkill" | Simple things become complex. Use it. |

## Skill Priority

1. **Process skills first** (brainstorming, debugging) -- determine HOW to approach
2. **Implementation skills second** (frontend-design, mcp-builder) -- guide execution

**Rigid skills** (TDD, debugging): Follow exactly.
**Flexible skills** (patterns): Adapt principles to context.

---

# Part 8: NanoClaw REPL

Use when running or extending `scripts/claw.js`.

## Capabilities

- Persistent markdown-backed sessions
- Model switching with `/model`
- Dynamic skill loading with `/load`
- Session branching with `/branch`
- Cross-session search with `/search`
- History compaction with `/compact`
- Export to md/json/txt with `/export`
- Session metrics with `/metrics`

## Operating Guidance

1. Keep sessions task-focused
2. Branch before high-risk changes
3. Compact after major milestones
4. Export before sharing or archival

## Extension Rules

- Keep zero external runtime dependencies
- Preserve markdown-as-database compatibility
- Keep command handlers deterministic and local
