---
id: PAT-011
type: pattern
title: "双层记忆体系：claude-mem × Obsidian KI 召回与双向关联"
status: active
created: "2026-06-10"
tags:
  - pattern/workflow
  - tool/claude-mem
  - ki/pattern
complements:
  - "[[ERR-006__mcp-port-conflict-not-persisted|ERR-006]]"
trigger_condition: "user_explicit"
aliases:
  - "PAT-011"
mem_ref: "ki-bridge-toolBox"
mem_status: "linked"
---

# 双层记忆体系：claude-mem × Obsidian KI 召回与双向关联

## 适用场景

任何需要历史上下文的任务。两层记忆分工互补，按问题性质选层：
- **claude-mem**（会话级短期记忆，SQLite 自动捕获）：任务延续既往 session、用户提及"上次做了什么 / 之前怎么改的"、PM/CTO 需要近期变更上下文。性质为**参考，不构成约束**。
- **Obsidian KI Vault**（策展长期知识，7 大类）：防错（Error_Book = 强制约束）与复用（Pattern Book = 推荐参考）。
- 优先级：Error_Book（强制）> Pattern Book（推荐）> claude-mem session 上下文（参考）。

## 步骤

1. **召回**：mem-search skill（claude-mem 内置）；worker 不可用降级 `sqlite3 "file:$HOME/.claude-mem/claude-mem.db?mode=ro"` 只读查询；都不可用 → 跳过，不阻塞。
2. **写入双向关联**：写入新 KI entry 前按 `KI/Internal_KI/contract.md` §3.8 取 `content_session_id` 填 `mem_ref`/`mem_status`，并按其降级规则处理。

## 反模式

| 错误做法 | 正确做法 | 关联错误 |
|---------|---------|---------|
| 把 mem 召回结果当强制约束，与 Error_Book 同级 | mem 仅作会话连续性参考，约束只来自 Error_Book | — |
| claude-mem 不可用时阻塞 / 重试 KI 写入 | 降级 `mem_status: unavailable`，流程照常 | — |
| worker 端口随用随改、不持久化 | 端口 37700+(uid%100) 固定后写入 skill_registry（本机 37701） | [[ERR-006__mcp-port-conflict-not-persisted|ERR-006]] |
| 关联异步生成的 summary id（写入时可能不存在） | 关联同步创建的 session id | — |

## 关联错误

- [[ERR-006__mcp-port-conflict-not-persisted|ERR-006]] — MCP 端口冲突未持久化：claude-mem worker 端口沿用同一预防规则
- [[PAT-003__mcp-port-allocation|PAT-003]] — 端口分配模式：37701 已纳入分配表语义
