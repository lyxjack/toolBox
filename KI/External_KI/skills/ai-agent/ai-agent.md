---
name: ai-agent
category: ai-agent
type: anchor
confidence: 0.72
anchor_base: autonomous-loops
created: 2026-03-11
lastUpdated: 2026-03-11
merged_from:
  - { name: autonomous-loops, confidence: 0.72, origin: ECC }
  - { name: continuous-learning-v2, confidence: 0.72, origin: ECC }
  - { name: eval-harness, confidence: 0.63, origin: ECC }
  - { name: iterative-retrieval, confidence: 0.57, origin: ECC }
  - { name: foundation-models-on-device, confidence: 0.57, origin: ECC }
  - { name: cost-aware-llm-pipeline, confidence: 0.54, origin: ECC }
  - { name: regex-vs-llm-structured-text, confidence: 0.44, origin: ECC }
  - { name: agent-harness-construction, confidence: 0.25, origin: ECC }
  - { name: ai-first-engineering, confidence: 0.19, origin: ECC }
  - { name: agentic-engineering, confidence: 0.16, origin: ECC }
  - { name: enterprise-agent-ops, confidence: 0.16, origin: ECC }
iron_law: >
  This anchor file is the SINGLE source of truth for the ai-agent category.
  It must not be duplicated into other layers or categories.
  All original skill files have been merged here and deleted.
  Any future updates to ai-agent knowledge must be made in this file only.
---

# AI Agent -- Category Anchor

Consolidated knowledge for designing, running, and operating AI agent systems. Covers autonomous loop architectures, agent harness construction, evaluation frameworks, retrieval patterns, cost optimization, continuous learning, on-device models, enterprise operations, and hybrid text-processing pipelines.

---

## 1. Agent Loop Patterns

### Loop Pattern Spectrum

From simplest to most sophisticated:

| Pattern | Complexity | Best For |
|---------|-----------|----------|
| Sequential Pipeline | Low | Daily dev steps, scripted workflows |
| NanoClaw REPL | Low | Interactive persistent sessions |
| Infinite Agentic Loop | Medium | Parallel content generation, spec-driven work |
| Continuous Claude PR Loop | Medium | Multi-day iterative projects with CI gates |
| De-Sloppify Pattern | Add-on | Quality cleanup after any Implementer step |
| RFC-Driven DAG (Ralphinho) | High | Large features, multi-unit parallel work with merge queue |

### 1.1 Sequential Pipeline (`claude -p`)

Break development into a chain of non-interactive calls. Each call gets a fresh context window.

```bash
#!/bin/bash
set -e
claude -p "Read the spec in docs/auth-spec.md. Implement OAuth2 login in src/auth/. Write tests first (TDD)."
claude -p "Review all files changed. Remove unnecessary type tests, overly defensive checks. Run test suite after cleanup."
claude -p "Run build + lint + type check + tests. Fix any failures. Do not add new features."
claude -p "Create a conventional commit for all staged changes."
```

Design principles:
- Each step is isolated -- fresh context, no bleed.
- Order matters -- each builds on filesystem state from the previous.
- Negative instructions are dangerous -- use a separate cleanup step instead.
- Exit codes propagate via `set -e`.

Variations: model routing (`--model opus` for research, default for implementation), environment context via files, `--allowedTools` restrictions for read-only or write-only passes.

### 1.2 Infinite Agentic Loop

A two-prompt system: an Orchestrator parses a spec, scans output, plans iterations, and deploys N sub-agents in parallel. Each sub-agent receives the full spec, a unique creative direction, and a specific iteration number.

Batching strategy: 1-5 agents simultaneously, 6-20 in batches of 5, infinite mode in waves of 3-5 with progressive sophistication.

Key insight: the orchestrator **assigns** each agent a specific creative direction -- never rely on agents to self-differentiate.

### 1.3 Continuous Claude PR Loop

A production-grade shell loop that creates branches, runs `claude -p`, pushes PRs, waits for CI, auto-fixes failures, and merges. Supports `--max-runs`, `--max-cost`, `--max-duration`, and completion signals.

Cross-iteration context is bridged via `SHARED_TASK_NOTES.md` -- read at iteration start, updated at iteration end.

CI failure recovery: fetch failed run ID via `gh run list`, spawn a fix agent with CI context, re-wait for checks (up to `--ci-retry-max` attempts).

Completion signal: Claude outputs a magic phrase; three consecutive signals stop the loop.

| Flag | Purpose |
|------|---------|
| `--max-runs N` | Stop after N iterations |
| `--max-cost $X` | Stop after spending $X |
| `--max-duration 2h` | Stop after time elapsed |
| `--merge-strategy squash` | squash, merge, or rebase |
| `--worktree <name>` | Parallel execution via git worktrees |
| `--review-prompt "..."` | Add reviewer pass per iteration |
| `--ci-retry-max N` | Auto-fix CI failures |

### 1.4 The De-Sloppify Pattern

An add-on for any loop. When an LLM implements with TDD, it often produces tests that verify language features rather than business logic, overly defensive runtime checks, and excessive error handling.

Rather than adding negative instructions (which degrade overall quality), add a **separate cleanup pass**:

```bash
claude -p "Implement the feature with full TDD. Be thorough with tests."
claude -p "Review all changes. Remove tests for language/framework behavior, redundant type checks, over-defensive handling, console.log, commented-out code. Keep business logic tests. Run test suite."
```

Two focused agents outperform one constrained agent.

### 1.5 RFC-Driven DAG Orchestration (Ralphinho)

The most sophisticated pattern. AI decomposes an RFC into a dependency DAG of work units, each with an ID, description, dependencies, acceptance criteria, and complexity tier (trivial/small/medium/large).

Execution proceeds layer by layer through the DAG. Each unit runs through a tiered quality pipeline in its own worktree:

| Tier | Pipeline |
|------|----------|
| trivial | implement -> test |
| small | implement -> test -> code-review |
| medium | research -> plan -> implement -> test -> PRD-review + code-review -> review-fix |
| large | + final-review |

Each stage runs in a **separate agent process** (separate context window). The reviewer never wrote the code it reviews, eliminating author bias.

Merge queue with eviction: rebase onto main, run tests; on failure, capture full eviction context (conflicting files, diffs, test output) and re-enter the pipeline. Non-overlapping units land in parallel; overlapping units land sequentially.

State is persisted to SQLite for resumability.

### 1.6 Choosing the Right Pattern

```
Single focused change?
  Yes -> Sequential Pipeline
  No  -> Written spec/RFC?
    Yes -> Need parallel implementation?
      Yes -> Ralphinho (DAG)
      No  -> Continuous Claude (PR loop)
    No  -> Need many variations?
      Yes -> Infinite Agentic Loop
      No  -> Sequential Pipeline + De-Sloppify
```

### Loop Anti-Patterns

- Infinite loops without exit conditions (always set max-runs/cost/duration).
- No context bridge between iterations (use filesystem state or shared notes).
- Retrying the same failure without capturing error context.
- Negative instructions instead of cleanup passes.
- All agents in one context window -- separate concerns into different processes.
- Ignoring file overlap in parallel work without a merge strategy.

---

## 2. Agent Harness Construction

### Quality Constraints

Agent output quality is bounded by four factors:
1. **Action space quality** -- tool design
2. **Observation quality** -- tool response structure
3. **Recovery quality** -- error handling
4. **Context budget quality** -- prompt management

### Action Space Design

- Stable, explicit tool names. Schema-first, narrow inputs. Deterministic output shapes.
- Micro-tools for high-risk operations (deploy, migration, permissions).
- Medium tools for common edit/read/search loops.
- Macro-tools only when round-trip overhead dominates.
- Avoid catch-all tools unless isolation is impossible.

### Observation Design

Every tool response should include:
- `status`: success | warning | error
- `summary`: one-line result
- `next_actions`: actionable follow-ups
- `artifacts`: file paths or IDs

### Error Recovery Contract

For every error path, provide:
- Root cause hint
- Safe retry instruction
- Explicit stop condition

### Context Budgeting

1. Keep system prompt minimal and invariant.
2. Move large guidance into skills loaded on demand.
3. Prefer file references over inlining long documents.
4. Compact at phase boundaries, not arbitrary token thresholds.

### Architecture Patterns

- **ReAct**: best for exploratory tasks with uncertain paths.
- **Function-calling**: best for structured deterministic flows.
- **Hybrid (recommended)**: ReAct planning + typed tool execution.

### Harness Anti-Patterns

- Too many tools with overlapping semantics.
- Opaque tool output with no recovery hints.
- Error-only output without next steps.
- Context overloading with irrelevant references.

---

## 3. Evaluation Frameworks

### Eval-Driven Development (EDD)

Treat evals as the unit tests of AI development:
- Define expected behavior BEFORE implementation.
- Run evals continuously during development.
- Track regressions with each change.

### Eval Types

**Capability Evals** -- test if the agent can do something new. Define task, success criteria, expected output.

**Regression Evals** -- ensure changes do not break existing functionality. Run against a baseline checkpoint.

### Grader Types

1. **Code-based** -- deterministic assertions (grep, test suite, build).
2. **Rule-based** -- regex/schema constraints.
3. **Model-based** -- LLM-as-judge with rubric (score 1-5 with reasoning).
4. **Human** -- manual adjudication for ambiguous or security-sensitive outputs.

### pass@k Metrics

| Metric | Meaning | Target |
|--------|---------|--------|
| pass@1 | First-attempt success rate | Direct reliability |
| pass@3 | At least one success in 3 attempts | >= 0.90 for capability evals |
| pass^3 | All 3 trials succeed | = 1.00 for release-critical regression evals |

### Eval Workflow

1. **Define** -- write eval definition before coding (capability + regression + success metrics).
2. **Implement** -- write code to pass defined evals.
3. **Evaluate** -- run evals, record pass/fail.
4. **Report** -- generate summary with pass@k metrics and status.

### Eval Storage

```
.claude/evals/
  <feature>.md       # definition
  <feature>.log      # run history
  baseline.json      # regression baselines
```

### Eval Anti-Patterns

- Overfitting prompts to known eval examples.
- Measuring only happy-path outputs.
- Ignoring cost and latency drift while chasing pass rates.
- Allowing flaky graders in release gates.

---

## 4. Retrieval Patterns

### The Context Problem

Subagents do not know what context they need until they start working. Standard approaches fail: sending everything exceeds limits, sending nothing lacks critical information, guessing is often wrong.

### Iterative Retrieval (4-Phase Loop)

```
DISPATCH -> EVALUATE -> REFINE -> LOOP (max 3 cycles)
```

**Phase 1 -- DISPATCH**: Broad query with initial patterns, keywords, and exclusions.

**Phase 2 -- EVALUATE**: Score each file's relevance (0-1 scale). High >= 0.7, Medium 0.5-0.7, Low 0.2-0.4, None < 0.2.

**Phase 3 -- REFINE**: Add patterns and terminology discovered in high-relevance files. Exclude confirmed irrelevant paths. Target specific gaps.

**Phase 4 -- LOOP**: Repeat with refined criteria. Stop when 3+ high-relevance files found with no critical gaps, or after 3 cycles.

### Practical Example

```
Task: "Fix authentication token expiry bug"
Cycle 1: Search "token", "auth", "expiry" -> found auth.ts (0.9), tokens.ts (0.8), user.ts (0.3)
         Refine: add "refresh", "jwt"; exclude user.ts
Cycle 2: Found session-manager.ts (0.95), jwt-utils.ts (0.85) -> sufficient context
Result:  auth.ts, tokens.ts, session-manager.ts, jwt-utils.ts
```

### Retrieval Best Practices

- Start broad, narrow progressively.
- First cycle often reveals naming conventions.
- Explicit gap identification drives refinement.
- 3 high-relevance files beats 10 mediocre ones.
- Low-relevance files will not become relevant -- exclude confidently.

---

## 5. Cost Optimization

### Model Routing by Task Complexity

Select the cheapest capable model. Route to expensive models only when complexity thresholds are met.

```python
def select_model(text_length: int, item_count: int, force_model: str | None = None) -> str:
    if force_model is not None:
        return force_model
    if text_length >= 10_000 or item_count >= 30:
        return MODEL_SONNET
    return MODEL_HAIKU  # 3-4x cheaper
```

Agent-specific model routing:
- Haiku: classification, boilerplate transforms, narrow edits
- Sonnet: implementation and refactors
- Opus: architecture, root-cause analysis, multi-file invariants

Escalate model tier only when lower tier fails with a clear reasoning gap.

### Pricing Reference (2025-2026)

| Model | Input ($/1M tokens) | Output ($/1M tokens) | Relative Cost |
|-------|---------------------|----------------------|---------------|
| Haiku 4.5 | $0.80 | $4.00 | 1x |
| Sonnet 4.6 | $3.00 | $15.00 | ~4x |
| Opus 4.5 | $15.00 | $75.00 | ~19x |

### Immutable Cost Tracking

Track cumulative spend with frozen dataclasses. Each API call returns a **new** tracker -- never mutate state. Include model, token counts, cost_usd per record. Provide `over_budget` check before each call.

### Narrow Retry Logic

Retry only on transient errors (connection, rate limit, server). Fail fast on authentication or bad request errors. Use exponential backoff.

### Prompt Caching

Cache long system prompts (> 1024 tokens) via `cache_control: {"type": "ephemeral"}`. Saves both cost and latency on repeated calls.

### Cost Tracking Per Task

Track: model, token estimate, retries, wall-clock time, success/failure.

### Cost Anti-Patterns

- Using the most expensive model for all requests.
- Retrying on all errors (wastes budget on permanent failures).
- Mutating cost tracking state.
- Hardcoding model names throughout the codebase.
- Ignoring prompt caching for repetitive system prompts.

---

## 6. Hybrid Text Processing (Regex + LLM)

### Decision Framework

```
Is the text format consistent and repeating?
  Yes (>90% follows pattern) -> Start with Regex
    Regex handles 95%+ -> Done, no LLM needed
    Regex handles <95% -> Add LLM for edge cases only
  No (free-form, highly variable) -> Use LLM directly
```

### Pipeline Architecture

```
Source Text -> [Regex Parser] -> [Text Cleaner] -> [Confidence Scorer]
  High confidence (>=0.95) -> Direct output
  Low confidence (<0.95)   -> [LLM Validator] -> Output
```

### Confidence Scoring

Programmatically flag extractions that need LLM review: missing fields, short text, few choices. Score each item 0-1.

### Production Metrics

From a 410-item parsing pipeline: regex success rate 98%, LLM calls needed ~5 (2%), cost savings vs all-LLM ~95%.

### Hybrid Best Practices

- Start with regex -- even imperfect regex gives a baseline to improve.
- Use the cheapest LLM for validation (Haiku-class is sufficient).
- Never mutate parsed items -- return new instances.
- TDD works well for parsers -- write tests for known patterns first.
- Log metrics (regex success rate, LLM call count) to track pipeline health.

---

## 7. Continuous Learning

### Instinct-Based Architecture (v2.1)

Turns Claude Code sessions into reusable knowledge through atomic "instincts" -- small learned behaviors with confidence scoring and project scoping.

### The Instinct Model

An instinct is atomic: one trigger, one action, confidence-weighted (0.3 tentative to 0.9 near-certain), domain-tagged, evidence-backed, and scope-aware (project or global).

### How It Works

1. **Hooks** capture tool use (PreToolUse/PostToolUse) -- 100% reliable, deterministic.
2. **Project detection** via git remote URL hash (portable) or repo path (fallback).
3. **Pattern detection** (background Haiku agent): user corrections, error resolutions, repeated workflows.
4. **Instinct creation** with confidence score and scope decision.
5. **Evolution**: instincts cluster into skills, commands, or agents.

### Confidence Scoring

| Score | Meaning | Behavior |
|-------|---------|----------|
| 0.3 | Tentative | Suggested but not enforced |
| 0.5 | Moderate | Applied when relevant |
| 0.7 | Strong | Auto-approved for application |
| 0.9 | Near-certain | Core behavior |

Increases with repeated observation and lack of correction. Decreases on explicit correction, extended inactivity, or contradicting evidence.

### Scope Decision

| Pattern Type | Scope |
|-------------|-------|
| Language/framework conventions | project |
| File structure preferences | project |
| Code style | project |
| Security practices | global |
| General best practices | global |
| Tool workflow preferences | global |
| Git practices | global |

### Instinct Promotion

When the same instinct appears in 2+ projects with average confidence >= 0.8, it is promoted from project to global scope.

### Storage Structure

```
~/.claude/homunculus/
  projects.json          # registry: hash -> name/path/remote
  instincts/personal/    # global auto-learned
  instincts/inherited/   # global imported
  evolved/               # global generated agents/skills/commands
  projects/<hash>/       # per-project observations, instincts, evolved artifacts
```

### Privacy

Observations stay local. Only instincts (patterns) can be exported -- not raw observations or code.

---

## 8. On-Device Models (Apple FoundationModels, iOS 26)

### Core Patterns

**Availability check** -- always check `SystemLanguageModel.default.availability` before creating a session. Handle all unavailability cases (device not eligible, Apple Intelligence not enabled, model not ready).

**Basic session** -- single-turn (new session each time) or multi-turn (reuse session for conversation context). Define role and style in `instructions`.

**Guided generation** (`@Generable`) -- generate structured Swift types instead of raw strings. Use `@Guide` for constraints (range, count, description). Compile-time safe.

**Tool calling** -- define tools conforming to `Tool` protocol with `@Generable` arguments. The model invokes custom code for domain-specific actions.

**Snapshot streaming** -- stream structured responses for real-time UI via `PartiallyGenerated` types. Each snapshot is a complete partial state (not deltas).

### Key Constraints

| Constraint | Detail |
|-----------|--------|
| Context window | 4,096 tokens (instructions + prompt + output) |
| Concurrency | One request per session (`isResponding` guard) |
| Result access | Always `response.content`, not `.output` |
| Execution | On-device only -- no data leaves device, works offline |

### On-Device Anti-Patterns

- Creating sessions without checking availability.
- Exceeding the 4,096 token window.
- Concurrent requests on a single session.
- Using `.output` instead of `.content`.
- Complex multi-step logic in a single prompt -- break into multiple focused prompts.

---

## 9. Enterprise Agent Operations

### Operational Domains

1. **Runtime lifecycle**: start, pause, stop, restart.
2. **Observability**: logs, metrics, traces.
3. **Safety controls**: scopes, permissions, kill switches.
4. **Change management**: rollout, rollback, audit.

### Baseline Controls

- Immutable deployment artifacts.
- Least-privilege credentials.
- Environment-level secret injection.
- Hard timeout and retry budgets.
- Audit log for high-risk actions.

### Metrics to Track

- Success rate
- Mean retries per task
- Time to recovery
- Cost per successful task
- Failure class distribution

### Incident Response

When failure spikes:
1. Freeze new rollout.
2. Capture representative traces.
3. Isolate failing route.
4. Patch with smallest safe change.
5. Run regression + security checks.
6. Resume gradually.

### Deployment Integrations

Pairs with PM2, systemd, container orchestrators, and CI/CD gates.

---

## 10. AI-First Engineering Process

本节仅保留独有的 Eval-First Loop；其余为 workflow/testing 的复述，权威见：任务粒度/拆解 → `workflow.md` §2 (Planning → Task Granularity)；session/compaction 策略 → `workflow.md` §9 (Context Management)；AI 生成代码的测试与审查标准 → `testing.md`（Tier 2 Peer Review / Tier 5 Unit Testing / §5.8 Coverage）。

### Eval-First Loop

1. Define capability eval and regression eval.
2. Run baseline and capture failure signatures.
3. Execute implementation.
4. Re-run evals and compare deltas.

---

## References

| Project | Author |
|---------|--------|
| Ralphinho (RFC-Driven DAG) | @enitrat |
| Infinite Agentic Loop | @disler |
| Continuous Claude | @AnandChowdhary |
| NanoClaw REPL | ECC |
| Homunculus (instinct architecture inspiration) | Community |
