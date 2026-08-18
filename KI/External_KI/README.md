# External_KI — Anchor Index System

外部知识以 **anchor 架构**组织：每个领域一个 anchor 目录（`skills/{domain}/{domain}.md`），外部 skill 增量合并进 anchor，永不整体替换。当前 14 个 anchor；**数量与清单以 `master_index.json` 为准**。

## 两级加载策略

1. 先读 `master_index.json`（Level 0：领域路由 + confidence + anchor path）
2. 按需读 `categories/{category_id}.json`（Level 1：该领域细节索引）
3. 最后按索引中的 path 读 anchor md 本体
4. 单次请求预算：≤ 7500 tokens（master + 1 category + 路由开销）

## Confidence 分档

| Score | Label | Criteria |
|-------|-------|----------|
| 0.9-1.0 | **Excellent** | Comprehensive, code examples, actionable, well-structured |
| 0.7-0.89 | **Good** | Solid content, minor gaps, usable as-is |
| 0.5-0.69 | **Fair** | Useful but incomplete, may need supplementation |
| 0.3-0.49 | **Basic** | Minimal content, stub-like, or highly specific niche |
| 0.0-0.29 | **Poor** | Deprecated, placeholder, or superseded |

## 相关文档

- KI 层总览：`KI/README.md`；结构化 metadata 权威：`master_index.json`（含 `categories/`、`cross_references.json`、`quality_audit.json` 的用法边界见 `/Users/jackliu/toolBox/CLAUDE.md` KI Layer 节）
