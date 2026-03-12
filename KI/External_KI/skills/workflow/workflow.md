---
name: workflow
category: workflow
type: anchor
confidence: 0.57
anchor_base: dispatching-parallel-agents
created: 2026-03-11
lastUpdated: 2026-03-11
merged_from:
  - name: dispatching-parallel-agents
    confidence: 0.57
    origin: superpowers
  - name: finishing-a-development-branch
    confidence: 0.57
    origin: superpowers
  - name: using-git-worktrees
    confidence: 0.55
    origin: superpowers
  - name: receiving-code-review
    confidence: 0.54
    origin: superpowers
  - name: search-first
    confidence: 0.52
    origin: ECC
  - name: writing-plans
    confidence: 0.50
    origin: superpowers
  - name: subagent-driven-development
    confidence: 0.44
    origin: independent
  - name: strategic-compact
    confidence: 0.42
    origin: ECC
  - name: verification-before-completion
    confidence: 0.41
    origin: superpowers
  - name: requesting-code-review
    confidence: 0.36
    origin: superpowers
  - name: executing-plans
    confidence: 0.29
    origin: superpowers
  - name: brainstorming
    confidence: 0.25
    origin: superpowers
iron_law: >
  This anchor file is the single source of truth for the workflow category.
  It MUST NOT be modified without explicit instruction. All original source
  files have been merged and removed. Do not recreate individual skill files.
---

# Workflow — Anchor Skill

Comprehensive workflow knowledge for AI agent development: from brainstorming through planning, execution, code review, branching, parallel agents, verification, and context management.

---

## 1. Brainstorming — Ideas Into Designs

Turn ideas into fully formed designs through collaborative dialogue before any implementation begins.

### Hard Gate

Do NOT invoke any implementation skill, write any code, or take any implementation action until a design is presented and the user has approved it. Every project goes through this process regardless of perceived simplicity.

### Checklist

1. **Explore project context** — check files, docs, recent commits
2. **Ask clarifying questions** — one at a time; prefer multiple choice when possible
3. **Propose 2-3 approaches** — with trade-offs and your recommendation
4. **Present design** — scale each section to its complexity; get approval after each section
5. **Write design doc** — save to `docs/plans/YYYY-MM-DD-<topic>-design.md` and commit
6. **Transition** — invoke planning skill to create implementation plan

### Principles

- One question at a time; do not overwhelm
- YAGNI ruthlessly — remove unnecessary features from all designs
- Incremental validation — present design, get approval before moving on
- The terminal state of brainstorming is planning, not implementation

---

## 2. Planning — Writing Implementation Plans

Write comprehensive implementation plans assuming the engineer has zero context. Document everything: which files to touch, code, testing, docs, how to verify. Bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

### Task Granularity

Each step is one action (2-5 minutes):
- Write the failing test — step
- Run it to verify it fails — step
- Implement minimal code to pass — step
- Run tests to verify pass — step
- Commit — step

### Plan Document Header

Every plan MUST start with:

```markdown
# [Feature Name] Implementation Plan

> **For Claude:** Use executing-plans to implement this plan task-by-task.

**Goal:** [One sentence]
**Architecture:** [2-3 sentences]
**Tech Stack:** [Key technologies]
```

### Task Structure

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**
```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

**Step 2: Run test to verify it fails**
Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL

**Step 3: Write minimal implementation**
**Step 4: Run test to verify it passes**
**Step 5: Commit**
````

### Execution Handoff

After saving the plan, offer two choices:
1. **Subagent-Driven (this session)** — dispatch fresh subagent per task, review between tasks
2. **Parallel Session (separate)** — open new session, batch execution with checkpoints

### Planning Rules

- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits

---

## 3. Execution — Implementing Plans

### Batch Execution (Executing Plans)

Load plan, review critically, execute tasks in batches, report for review between batches.

**Process:**
1. **Load and Review** — read plan, identify concerns, raise them before starting
2. **Execute Batch** — default first 3 tasks; follow each step exactly; run verifications
3. **Report** — show what was implemented, show verification output, say "Ready for feedback"
4. **Continue** — apply changes from feedback, execute next batch, repeat
5. **Complete** — after all tasks verified, proceed to branch finishing

**When to stop:** Hit a blocker, plan has critical gaps, instruction unclear, verification fails repeatedly. Ask for clarification rather than guessing.

### Subagent-Driven Development

Execute plan by dispatching a fresh subagent per task with two-stage review: spec compliance first, then code quality.

**Process per task:**
1. Dispatch implementer subagent with full task text and context
2. Answer any subagent questions before implementation proceeds
3. Implementer implements, tests, commits, self-reviews
4. Dispatch spec reviewer — confirms code matches spec
5. If spec issues: implementer fixes, spec reviewer re-reviews
6. Dispatch code quality reviewer — evaluates implementation quality
7. If quality issues: implementer fixes, quality reviewer re-reviews
8. Mark task complete
9. After all tasks: dispatch final reviewer for entire implementation

**Advantages over manual execution:**
- Fresh context per task (no pollution)
- Two-stage review catches issues early
- Subagent can ask questions before and during work
- Spec compliance prevents over/under-building

**Red flags:**
- Never start code quality review before spec compliance is approved
- Never dispatch multiple implementation subagents in parallel (conflicts)
- Never make subagent read plan file — provide full text instead
- Never skip review loops — reviewer found issues means fix and re-review
- Never move to next task while either review has open issues

---

## 4. Code Review

### Requesting Code Review

Dispatch a code-reviewer subagent to catch issues before they cascade.

**When mandatory:**
- After each task in subagent-driven development
- After completing a major feature
- Before merge to main

**How to request:**
1. Get git SHAs: `BASE_SHA=$(git rev-parse HEAD~1)` and `HEAD_SHA=$(git rev-parse HEAD)`
2. Dispatch code-reviewer subagent with: what was implemented, plan/requirements, base SHA, head SHA, description
3. Act on feedback: fix Critical immediately, fix Important before proceeding, note Minor for later

### Receiving Code Review

Code review requires technical evaluation, not emotional performance.

**Response pattern:**
1. READ — complete feedback without reacting
2. UNDERSTAND — restate requirement in own words (or ask)
3. VERIFY — check against codebase reality
4. EVALUATE — technically sound for THIS codebase?
5. RESPOND — technical acknowledgment or reasoned pushback
6. IMPLEMENT — one item at a time, test each

**Forbidden responses:** "You're absolutely right!", "Great point!", "Let me implement that now" (before verification). Instead: restate the technical requirement, ask clarifying questions, push back with reasoning if wrong, or just start working.

**Handling unclear feedback:** If ANY item is unclear, STOP. Do not implement anything. Ask for clarification on all unclear items first. Items may be related; partial understanding leads to wrong implementation.

**Source-specific handling:**

| Source | Approach |
|--------|----------|
| Human partner | Trusted — implement after understanding; still ask if scope unclear |
| External reviewer | Verify technically correct for this codebase; check if breaks functionality; push back if wrong |

**When to push back:**
- Suggestion breaks existing functionality
- Reviewer lacks full context
- Violates YAGNI (unused feature)
- Technically incorrect for this stack
- Conflicts with architectural decisions

**Implementation order for multi-item feedback:**
1. Clarify anything unclear FIRST
2. Blocking issues (breaks, security)
3. Simple fixes (typos, imports)
4. Complex fixes (refactoring, logic)
5. Test each fix individually
6. Verify no regressions

**GitHub threads:** Reply in the comment thread (`gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies`), not as a top-level PR comment.

**YAGNI check:** If reviewer suggests "implementing properly", grep codebase for actual usage. If unused, question the need.

---

## 5. Branching — Git Worktrees

Git worktrees create isolated workspaces sharing the same repository, allowing work on multiple branches simultaneously.

### Directory Selection (Priority Order)

1. **Check existing:** `.worktrees/` (preferred, hidden) or `worktrees/`
2. **Check CLAUDE.md** for worktree directory preference
3. **Ask user** if nothing found — offer `.worktrees/` (project-local) or `~/.config/superpowers/worktrees/<project>/` (global)

### Safety Verification

For project-local directories, MUST verify directory is gitignored before creating worktree:

```bash
git check-ignore -q .worktrees 2>/dev/null
```

If NOT ignored: add to `.gitignore`, commit, then proceed. This prevents accidentally committing worktree contents.

### Creation Steps

```bash
project=$(basename "$(git rev-parse --show-toplevel)")
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

Then auto-detect and run project setup:
- Node.js: `npm install` (if `package.json`)
- Rust: `cargo build` (if `Cargo.toml`)
- Python: `pip install -r requirements.txt` or `poetry install`
- Go: `go mod download` (if `go.mod`)

Verify clean test baseline. If tests fail, report and ask whether to proceed.

### Finishing a Development Branch

**Process:** Verify tests -> Present options -> Execute choice -> Clean up.

**Step 1: Verify tests pass.** If tests fail, stop. Do not proceed.

**Step 2: Determine base branch.**

```bash
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

**Step 3: Present exactly 4 options:**

1. Merge back to base branch locally
2. Push and create a Pull Request
3. Keep the branch as-is
4. Discard this work

**Step 4: Execute choice:**

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Merge locally | Y | - | - | Y |
| 2. Create PR | - | Y | Y | - |
| 3. Keep as-is | - | - | Y | - |
| 4. Discard | - | - | - | Y (force) |

For Option 4, require typed "discard" confirmation before deleting.

**Step 5: Cleanup worktree** for Options 1 and 4 only. Keep for Options 2 and 3.

---

## 6. Parallel Agents — Dispatching Concurrent Work

When you have multiple unrelated failures or independent tasks, dispatch one agent per independent problem domain to work concurrently.

### When to Use

- 3+ test files failing with different root causes
- Multiple subsystems broken independently
- Each problem can be understood without context from others
- No shared state between investigations

### When NOT to Use

- Failures are related (fix one might fix others)
- Need to understand full system state first
- Agents would interfere (editing same files, shared resources)
- Exploratory debugging where scope is unknown

### The Pattern

1. **Identify independent domains** — group failures by what is broken
2. **Create focused agent tasks** — each gets specific scope, clear goal, constraints, expected output format
3. **Dispatch in parallel** — all agents run concurrently
4. **Review and integrate** — read summaries, verify no conflicts, run full suite

### Agent Prompt Structure

Good agent prompts are focused, self-contained, and specific about output:

```markdown
Fix the 3 failing tests in src/agents/agent-tool-abort.test.ts:

1. "should abort tool with partial output capture" - expects 'interrupted at'
2. "should handle mixed completed and aborted tools" - fast tool aborted
3. "should properly track pendingToolCount" - expects 3 results but gets 0

These are timing/race condition issues. Your task:
1. Read the test file and understand what each test verifies
2. Identify root cause
3. Fix by replacing arbitrary timeouts with event-based waiting

Do NOT just increase timeouts - find the real issue.
Return: Summary of what you found and what you fixed.
```

### Common Mistakes

- **Too broad:** "Fix all the tests" — agent gets lost
- **No context:** "Fix the race condition" — agent does not know where
- **No constraints:** Agent might refactor everything
- **Vague output:** "Fix it" — you do not know what changed

### Verification After Parallel Work

1. Review each agent's summary
2. Check for conflicts (did agents edit same code?)
3. Run full test suite
4. Spot check — agents can make systematic errors

---

## 7. Verification Before Completion

Claiming work is complete without verification is dishonesty, not efficiency.

### The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you have not run the verification command in this message, you cannot claim it passes.

### The Gate Function

1. IDENTIFY — what command proves this claim?
2. RUN — execute the FULL command (fresh, complete)
3. READ — full output, check exit code, count failures
4. VERIFY — does output confirm the claim?
5. ONLY THEN — make the claim

### Verification Requirements

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Regression test works | Red-green cycle verified | Test passes once |
| Agent completed | VCS diff shows changes | Agent reports "success" |
| Requirements met | Line-by-line checklist | Tests passing |

### Red Flags — STOP Immediately

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification
- About to commit/push/PR without verification
- Trusting agent success reports without checking
- Relying on partial verification
- ANY wording implying success without having run verification

### Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence is not evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter is not compiler |
| "Agent said success" | Verify independently |
| "Partial check is enough" | Partial proves nothing |

### Key Patterns

**Tests:** Run command, see output, then claim. Not "should pass now."

**Regression tests (TDD Red-Green):** Write -> Run (pass) -> Revert fix -> Run (MUST FAIL) -> Restore -> Run (pass).

**Requirements:** Re-read plan -> create checklist -> verify each item -> report gaps or completion.

**Agent delegation:** Agent reports success -> check VCS diff -> verify changes -> report actual state.

---

## 8. Search First — Research Before You Code

Systematize the "search for existing solutions before implementing" workflow.

### When to Use

- Starting a new feature that likely has existing solutions
- Adding a dependency or integration
- Before creating a new utility, helper, or abstraction

### Quick Mode (Inline)

Before writing a utility or adding functionality:

0. Does this already exist in the repo? Search through modules and tests first
1. Is this a common problem? Search package registries (npm, PyPI)
2. Is there an MCP server for this? Check settings and search
3. Is there a skill for this? Check skill directories
4. Is there a GitHub implementation? Run GitHub code search for maintained OSS

### Full Mode (Agent)

For non-trivial functionality, launch a researcher agent to search package registries, MCP servers, skills, and GitHub, returning a structured comparison with recommendation.

### Decision Matrix

| Signal | Action |
|--------|--------|
| Exact match, well-maintained, MIT/Apache | **Adopt** — install and use directly |
| Partial match, good foundation | **Extend** — install + write thin wrapper |
| Multiple weak matches | **Compose** — combine 2-3 small packages |
| Nothing suitable found | **Build** — write custom, informed by research |

### Common Search Shortcuts

| Category | Tools |
|----------|-------|
| Linting | eslint, ruff, textlint, markdownlint |
| Formatting | prettier, black, gofmt |
| Testing | jest, pytest, go test |
| HTTP clients | httpx (Python), ky/got (Node) |
| Validation | zod (TS), pydantic (Python) |
| Markdown | remark, unified, markdown-it |

### Anti-Patterns

- Jumping to code without checking for existing solutions
- Ignoring MCP servers that already provide the capability
- Over-customizing a library wrapper until benefits are lost
- Installing a massive package for one small feature

---

## 9. Context Management — Strategic Compaction

Suggest manual `/compact` at strategic workflow transition points rather than relying on arbitrary auto-compaction.

### When to Compact

| Phase Transition | Compact? | Reason |
|-----------------|----------|--------|
| Research -> Planning | Yes | Research context is bulky; plan is the distilled output |
| Planning -> Implementation | Yes | Plan is in file; free up context for code |
| Implementation -> Testing | Maybe | Keep if tests reference recent code |
| Debugging -> Next feature | Yes | Debug traces pollute context |
| Mid-implementation | No | Losing variable names, file paths, partial state is costly |
| After a failed approach | Yes | Clear dead-end reasoning before new approach |

### What Survives Compaction

| Persists | Lost |
|----------|------|
| CLAUDE.md instructions | Intermediate reasoning and analysis |
| TodoWrite task list | File contents previously read |
| Memory files | Multi-step conversation context |
| Git state (commits, branches) | Tool call history and counts |
| Files on disk | Nuanced user preferences stated verbally |

### Best Practices

1. Compact after planning — once plan is finalized, start fresh
2. Compact after debugging — clear error-resolution context
3. Do not compact mid-implementation — preserve context for related changes
4. Write important context to files or memory before compacting
5. Use `/compact` with a summary message for targeted retention

---

## 10. Workflow Integration Map

How the workflow components connect:

```
Brainstorming
    |
    v
Writing Plans -----> Execution Handoff
    |                      |
    +------+---------------+
           |               |
           v               v
  Subagent-Driven    Executing Plans
  Development        (Batch Mode)
           |               |
           +-------+-------+
                   |
                   v
         Code Review (Request + Receive)
                   |
                   v
         Verification Before Completion
                   |
                   v
         Finishing a Development Branch
                   |
                   v
         Worktree Cleanup
```

**Cross-cutting concerns:**
- **Search First** applies before any planning or implementation
- **Git Worktrees** applies before any execution begins
- **Strategic Compact** applies at every phase transition
- **Verification** applies before every completion claim
- **Parallel Agents** applies when independent problems can be solved concurrently

### Never Start on Main

Both execution modes and subagent-driven development share this rule: never start implementation on main/master branch without explicit user consent. Always use an isolated workspace (worktree or feature branch).

### Skill Dispatch Rules

- Brainstorming terminal state is planning (not implementation)
- Planning hands off to either subagent-driven or executing-plans
- Both execution paths end with finishing-a-development-branch
- Code review is mandatory before merge, optional at other points
- Verification is mandatory before any completion claim
