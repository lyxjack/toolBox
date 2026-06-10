# Changelog

All notable changes to toolBox will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.3.0] - 2026-06-10

### Added — claude-mem 双层记忆体系集成 (REQ-20260609-210628)
- **claude-mem v13.5.0**（plugin marketplace `thedotmack`）作为会话级短期记忆层接入：5 lifecycle hooks 自动捕获 + SessionStart 注入 + mem-search 检索；worker 端口 37701 固定并持久化（ERR-006 规则）
- **治理注册**: `Agent/index/skill_registry.json` + `KI/External_KI/master_index.json` 新增 `externalPlugins` 节（运行时 plugin 不走 anchor 知识合并，理由内嵌 governanceNote）
- **工作流召回接入**: PM Step 4 / CTO 输入+Step 2 / distill Phase 2 + 全局与项目 CLAUDE.md「双层记忆体系」规则；优先级 Error_Book（强制）> Pattern Book（推荐）> claude-mem（参考）
- **双向关联机制**: 7 大类新建 entry 强制 `mem_ref`/`mem_status` frontmatter 字段（contract § 3.8：session id 关联 + sqlite 只读获取 + 降级 unavailable 不阻塞 + 存量豁免）；5 个 KI 模板同步
- **CI 第 8 层**: `test_mem_link.mjs`（34 用例）接入 pre-commit + post-push 双 hook
- **E2E**: PAT-011（双层记忆体系模式）经 Obsidian MCP 写入并完成 mem_ref ↔ sdk_sessions 闭环验证

### Added — 自动分发（新老用户 setup 一致性保证）
- **Migration `v1.3.0.mjs`**（老用户 `git pull && bash bootstrap.sh` 路径）：幂等安装 claude-mem plugin + 给已有 `~/.claude/CLAUDE.md` 补「双层记忆体系」节（插于 Iron Laws 前）；安装失败则中止 update 下次重试
- **Bootstrap Step 6/9**（新用户路径）：`setupClaudeMem()` 同款安装；全局 CLAUDE.md 模板 `global_claude_md.md` 已含双层记忆体系节
- 共享实现 `bootstrap-utils.mjs#ensureClaudeMemPlugin/patchGlobalClaudeMdMemSection`；marketplace 用 **HTTPS** URL（规避无 SSH key 机器失败）
- `test_mem_link.mjs` 新增「分发保障」suite（4 用例）锁定该链路

### Fixed
- `test_distill_output_audit.mjs` extractWikiLinks 两个解析缺陷：表格内合法转义 `[[target\|alias]]` 尾部反斜杠落入 target 造成孤儿误报（PAT-010 触发）；代码块/行内代码中的示例链接被当真实链接。已沉淀 ERR-029

## [1.2.0] - 2026-05-18

### Added — Governance Principles
- **Constitution P9 — Assumption Transparency**: PM/CTO/QA 输出工件必须显式列隐含假设(挂载 PM Step 5.5 + CTO Step 1.5 + QA Step 7)
- **Constitution P10 — Simplicity Discipline**: 代码本身最小化(无未请求抽象/配置/防御);CTO Step 7 Part B `Simplicity Justification` 段必填
- **Constitution P11 — Surgical Scope**: 每行 diff 可追溯到 task/AC;QA Layer 4 Step 5.5 Surgical Trace Check 抓 drive-by 编辑
- Iron Laws `Related Principles` footnote 引用 P9/P10/P11 路径(IL 总数保持 11)
- Knowledge source: `KI/External_KI/skills/workflow/workflow.md` §10 (Karpathy Coding Discipline)

### Added — Obsidian KI 7-Category Layered Structure (P0)
- 3 个新 Internal_KI 子目录:`execution_logs/` (Cat 2) / `security/` (Cat 4) / `data-analysis/` (Cat 5)
- 4 个模板:`execution_log.tmpl.md` / `security_config.tmpl.md` / `data_analysis.tmpl.md` + `Templates/README.md`
- `pattern_entry.tmpl.md` 加 `trigger_condition` 字段(Cat 3 vs Cat 7 区分:`user_explicit` / `quality_audit` / `both`)
- `KI/Internal_KI/contract.md` § 3.5 (7-Category Taxonomy) / § 3.6 (3 子目录契约) / § 3.7 (Cross-Reference 强制规则) / § 10.5 (Tag 层级对齐)
- `req_ref` 字段允许 `REQ-*` OR `PLAN-*` 双格式 + 可选 `plan_ref` 字段

### Added — /distill 提纯链路 (P2)
- 新 skill `.claude/skills/distill/SKILL.md` — 把当前 session 对话提纯到 Obsidian KI 7 大类
- 新工作流文档 `Agent/workflow/distill.md` — 8 phase(触发 / Inputs / 7 类决策树 / 切片 / 去重 / Cross-Ref Gate / Write / Memory Cleanup)+ Phase 6.5 Schema Self-Check
- 柔触发:`post-push-ci.mjs` 全过分支追加 `💡 建议跑 /distill` 提示,Claude 看到主动调

### Added — CI 7-Layer Hook Chain
- `Agent/lint/pre-commit-hook.mjs` + `post-push-ci.mjs` 7 层检查链:
  1. Error Book Linter / 2. Complexity Gate / 3. Governance (P9/P10/P11) /
  4. Obsidian Structure (P0) / 5. Distill Skill Structure (P2) / 6. Distill Output Audit (P2) / 7. P3 Schema Self-Check
- 6 个新测试文件覆盖 **302 个测试用例**(含元一致性 + 反例 + graceful skip):
  - `test_p9_p11_governance.mjs` + `_integration.mjs` (47)
  - `test_obsidian_structure.mjs` + `_integration.mjs` (57)
  - `test_distill_structure.mjs` + `_integration.mjs` (30)
  - `test_distill_output_audit.mjs` (120)
  - `test_p3_schema_self_check.mjs` (22)

### Added — Skill Ingestion
- `/find` 入库 `multica-ai/andrej-karpathy-skills` → workflow Anchor §10 增量(Karpathy 4 原则,3 模块入,K-M4 跳过)
- `Tool/andrej-karpathy-skills/` git clone(只读源仓库)
- 6 个索引同步更新:`master_index.json` / `categories/workflow.json` / `cross_references.json` / `quality_audit.json` / `Agent/index/{skill_registry,duplicate_review,source_registry}.json`

### Added — Internal_KI Sediment
- `KI/Internal_KI/decisions/2026-05-17-karpathy-elevation-to-principle.md` — P9/P10/P11 提升决策记录(3 决策 + 8 risk 缓解 + 6 KPI)
- `KI/Internal_KI/patterns/PAT-006__swarm-3-phase-governance.md` — Swarm 3-Phase governance REQ pattern(P2 /distill 蜂群实施的元应用)
- `KI/Internal_KI/execution_logs/` 2 个 EXEC(P2 /distill 闭环 + P0 plan-driven 闭环,冷启动)
- `KI/Error_Book/entries/ERR-027__integration-test-concurrency-collision.md` — 多 integration test 并发互撞,强制 `--test-concurrency=1`

### Changed — Index Migration Clarification
- `CLAUDE.md` L80-82 收紧"index 已冻结"措辞:**markdown 知识索引**(`Error_Book/index.json` + `Internal_KI/index.json`)已迁 Obsidian MCP;**结构化工作流 metadata**(`master_index.json` + `categories/*.json` + `cross_references.json` + `quality_audit.json` + `Agent/index/*.json`)仍为 active JSON

### Changed — Workflow Doc Updates
- `PM/pm_workflow.md` Step 5.5 加 `Hidden Assumptions` 子步;Step 6 必填字段 + Gate① 加自检项
- `PM/templates/requirement_package.tmpl.md` + `requirement_package_micro.tmpl.md` 加 `Hidden Assumptions` 段
- `Agent/workflow/cto_planning.md` Step 1.5 Assumption Pushback Gate + Step 7 Part B Simplicity Justification + Gate② 加 2 自检项
- `Agent/templates/execution_plan.tmpl.md` 加 `## Simplicity Justification` 段
- `Agent/workflow/qa_verification.md` Layer 4 Step 5.5 Surgical Trace Check + Layer 5 evidence list 加 3 项挂载点

## [1.1.2] - 2026-04-12

### Fixed
- cocos-mcp-server Bug 3: `node_create_node` 默认 layer 从 DEFAULT(1073741824) 改为 UI_2D(33554432)
- cocos-mcp-server Bug 1: `prefab_update_prefab` 自定义脚本组件 `__type__` 从字符串类名转为压缩 UUID
- cocos-mcp-server Bug 2: `prefab_update_prefab` 节点 position/contentSize 不再被重置为默认值

### Added
- cocos-mcp-server: vitest 单元测试框架 + 39 个 bug 修复覆盖测试
- Error Book entries: ERR-014(中文文件名), ERR-015(spriteFrame missing), ERR-016(class ID 损坏), ERR-017(layer 重置)

## [1.1.1] - 2026-04-10

### Added
- `bootstrap.mjs` — cross-platform bootstrap entry point (Node.js ESM), replaces bash-only bootstrap.sh logic
- `Agent/lib/bootstrap-utils.mjs` — cross-platform shared utilities for bootstrap
- `bootstrap.bat` — Windows entry point (thin wrapper calling node bootstrap.mjs)
- `Agent/tests/init/test_bootstrap.mjs` — 44 unit tests for bootstrap-utils
- `Agent/tests/init/test_bootstrap_integration.mjs` — 28 integration tests covering full lifecycle
- Error Book entries: ERR-011, ERR-012, ERR-013

### Changed
- `bootstrap.sh` — refactored to thin wrapper delegating to `node bootstrap.mjs` (backward compatible)
- `README.md` — added Windows Quick Start guide and cross-platform support table
- `.claude/commands/init.md` — added Windows/cross-platform entry commands

## [1.1.0] - 2026-04-09

### Added
- `Agent/lint/prefab-write-guard.mjs` — prefab 写入拦截独立 lint 模块（从 ERR-002/ERR-006 ci_rules 提取）
- `KI/Error_Book/entries/ERR-010` — push 前未确认版号更新的错题记录

### Changed
- ERR-002 / ERR-006 — ci_rules 清空，拦截逻辑迁移至独立 lint 模块

## [1.0.0] - 2026-04-09

### Added
- `bootstrap.sh` — unified init & update entry point for new and existing users
- `VERSION` file — semver version tracking (this release: 1.0.0)
- `CHANGELOG.md` — human-readable release history (this file)
- `Agent/lib/bootstrap-utils.sh` — shared shell functions for bootstrap and migrations
- `Agent/migrations/` — per-version migration scripts directory
- `/init` command now triggers toolBox bootstrap (replaces old project-level init)
- Knowledge management dual mode: Obsidian (recommended) or traditional index (fallback)

### Changed
- `.claude/commands/init.md` — repurposed from project-level init to toolBox bootstrap entry
- `README.md` — Quick Start updated to reference `bootstrap.sh` / `/init`
- `Agent/guides/setup/README.md` — updated to reference bootstrap flow
- `CLAUDE.md` — root directory whitelist updated to include new files
- `.gitignore` — added `.toolbox_version`, `.toolbox_config`

### Removed
- Old project-level `/init` behavior (project dirs are now created on-demand by workflows)

[Unreleased]: https://github.com/YixinLiu-Lulu/toolBox/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/YixinLiu-Lulu/toolBox/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/YixinLiu-Lulu/toolBox/releases/tag/v1.0.0
