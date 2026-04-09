---
id: DEC-002
type: decision
title: "Confidence Scoring Method"
status: active
created: 2026-03-07
tags:
  - ki/decision
  - layer/KI
aliases:
  - DEC-002
---

# Confidence Scoring Method

## Decision
Automated 20-signal structural audit via PowerShell script

## Rationale
Initial intuition-based scoring was systematically biased +0.28 avg. Automated audit is reproducible.

## Alternatives Considered
- Manual full-read review
- File size proxy
- LLM-based scoring

## Outcome
All 92 scores corrected downward. 0 Excellent, 10 Good, 39 Fair.
