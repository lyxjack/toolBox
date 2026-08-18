---
id: DEC-004
type: decision
title: "Execution Mode Upgrade"
status: active
created: 2026-03-09
tags:
  - ki/decision
  - layer/KI
aliases:
  - DEC-004
---

# Execution Mode Upgrade

## Decision
Upgrade execution.md from v1 (serial-only) to v2 (serial/parallel/swarm)

## Rationale
v1 serial-only was a known limitation.

## Alternatives Considered
- Keep serial-only
- Parallel-only (no swarm)

## Outcome
execution.md and strategy.md updated.
v2 三模式已扩展：hybrid 混合模式（见 execution logs 实践）与 dynamic workflow（见 [[DEC-007__pm-dynamic-workflow-ultracode-gate|DEC-007]] / `PM/pm_workflow.md` Step 4.6）。
