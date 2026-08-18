---
id: DEC-001
type: decision
title: "Index Architecture"
status: superseded
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
两级 JSON 索引已建成，但 markdown 知识召回侧已被 Obsidian MCP 取代（`Error_Book/index.json` / `Internal_KI/index.json` 已冻结，见 `KI/Internal_KI/contract.md` §10.4）；结构化 metadata 侧仍 active（`master_index.json` + `categories/*.json`），categories 现为 14 个（以 `KI/External_KI/master_index.json` 为准）。后续演进见 [[DEC-003__five-layer-migration|DEC-003]]。
