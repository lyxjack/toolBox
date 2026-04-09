---
id: DEC-001
type: decision
title: "Index Architecture"
status: active
created: 2026-03-07
tags:
  - ki/decision
  - layer/KI
aliases:
  - DEC-001
---

# Index Architecture

## Decision
Two-level hierarchical JSON index (master + 12 categories)

## Rationale
Optimized for ≤7500 token per-load budget. quickLookup enables O(1) routing.

## Alternatives Considered
- Flat single JSON
- SQLite
- Vector DB

## Outcome
Pending
