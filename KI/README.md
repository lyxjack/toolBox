# KI Layer — 文件地图与使用细则

> 自 toolBox `CLAUDE.md`「Layer Details」下放（REQ-20260803-184500），按需加载。
> 权威契约: `Internal_KI/contract.md` · `Error_Book/contract.md`。

## 目录

- External_KI: `KI/External_KI/` — skill 主索引 + 类别索引 + 质量审计 + 交叉引用
- Internal_KI: `KI/Internal_KI/` — 项目级知识库接口契约(实际数据在各项目中),含 Pattern Book(`patterns/`)、`decisions/`(含 rejection 知识库,契约 §10.3.1)、`lessons/`、`runs/`(压测流水,契约 §3.6.4)
- Error_Book: `KI/Error_Book/` — 全局级错题本(跨项目共享,含 entries/)
- Templates: `KI/Templates/` — ki_entry, error_book_entry 等模板

## 知识召回 vs 工作流 metadata(两条路径,不混用)

- **Markdown 知识索引** — `KI/Error_Book/index.json` + `KI/Internal_KI/index.json` 已冻结(frontmatter `frozen: true`),仅作历史快照保留。这两类知识改由 **Obsidian MCP**(Local REST API 插件)对 KI Vault 做全文 / 标签 / 笔记关系召回。
- **结构化工作流 metadata** — `KI/External_KI/master_index.json` + `categories/*.json` + `cross_references.json` + `quality_audit.json` 以及 `Agent/index/{skill_registry,duplicate_review,source_registry}.json` **仍是 active 状态**,由 `find` / `find_update` / `skill_ingestion` / `cto_planning` 等工作流程序化读写。Anchor path / confidence / merged_count / 上游 URL 等结构化字段不走 Obsidian,因为 Obsidian MCP 设计目标是 markdown 知识召回而非 schema 查询。

## 7 大类分层管理(P0,2026-05-17 立起)

7 大类: 技术栈 anchors(`KI/External_KI/categories/`,数量以 master_index.json 为准)、Prompt 需求拆解(`KI/Internal_KI/execution_logs/`)、逻辑流程与可复用功能(`KI/Internal_KI/patterns/`,以 trigger_condition=user_explicit / quality_audit 区分)、安全权限(`KI/Internal_KI/security/`)、DB 归档日志分析(`KI/Internal_KI/data-analysis/`)、错题本(`KI/Error_Book/entries/`)。目录 + 模板 + frontmatter schema 的**唯一权威定义**见 `KI/Internal_KI/contract.md § 3.5-3.7`;模板对照表见 `KI/Templates/README.md`。

Cross-Reference: 新条目至少 1 个 wiki link(冷启动 `bootstrap: true` 例外);规则全文见 `KI/Internal_KI/contract.md` §3.7。/distill 提纯链路自动按此分类写入。

## 双层记忆体系

claude-mem = 会话级短期记忆(自动捕获工具调用与会话摘要,SQLite 本地库),用于会话连续性,**参考上下文不构成约束**;Obsidian KI Vault = 策展长期知识(7 大类),Error_Book 命中 = 强制约束,Pattern Book 命中 = 推荐参考(语义不变)。

- 优先级: Error_Book(强制)> Pattern Book(推荐)> claude-mem session 上下文(参考)。
- 召回入口: mem-search skill;worker 不可用降级 `sqlite3 ~/.claude-mem/claude-mem.db` 只读查询;都不可用 → 跳过 mem 召回,不阻塞流程。
- 触发时机: 任务延续既往 session / 用户提及历史工作 / PM·CTO 需要近期变更上下文;纯新任务或纯知识性问题查 Obsidian 即可。
- 双向关联: 新建 Obsidian entry 必须含 `mem_ref` / `mem_status` frontmatter 字段(详见 `KI/Internal_KI/contract.md` §3.8)。
