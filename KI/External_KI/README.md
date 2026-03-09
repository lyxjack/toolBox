# toolBox RAG Skills Index System

## Architecture Overview

This is a **two-level hierarchical index** optimized for token-efficient on-demand loading:

```
_rag_index/
├── README.md                    # This file - system documentation
├── master_index.json            # Level 0: Master registry (~3000 tokens)
│                                  Contains: all 88 skills, categories, routing
│
├── categories/                  # Level 1: Category sub-indices
│   ├── frontend.json            # Frontend skills detail index
│   ├── backend.json             # Backend skills detail index
│   ├── testing.json             # Testing skills detail index
│   ├── security.json            # Security skills detail index
│   ├── devops.json              # DevOps skills detail index
│   ├── ai_agent.json            # AI/Agent skills detail index
│   ├── content.json             # Content/Writing skills detail index
│   ├── language_specific.json   # Language-specific skills index
│   ├── mobile_native.json       # Mobile/Native skills index
│   ├── workflow.json            # Workflow/Process skills index
│   ├── meta_tooling.json        # Meta/Tooling skills index
│   └── business.json            # Business skills detail index
│
└── cross_references.json        # Duplicate/overlap mapping
```

## Loading Strategy

1. **Always load first**: `master_index.json` (~3000 tokens) → identifies which category to drill into
2. **On-demand load**: `categories/{category}.json` (~2000-5000 tokens) → get skill details
3. **Final load**: Actual SKILL.md file via path from index → only when needed
4. **Total per-request budget**: ≤ 7500 tokens (master + 1 category + routing overhead)

## Confidence Scoring System

| Score | Label | Criteria |
|-------|-------|----------|
| 0.9-1.0 | **Excellent** | Comprehensive, code examples, actionable, well-structured |
| 0.7-0.89 | **Good** | Solid content, minor gaps, usable as-is |
| 0.5-0.69 | **Fair** | Useful but incomplete, may need supplementation |
| 0.3-0.49 | **Basic** | Minimal content, stub-like, or highly specific niche |
| 0.0-0.29 | **Poor** | Deprecated, placeholder, or superseded |
