---
id: ERR-035
type: error
errorCode: "BUILD-002"
severity: "medium"
status: "resolved"
recurrence: 0
firstSeen: "2026-06-24"
tags:
  - "error/medium"
  - "tool/MCP"
  - "topic/git-hygiene"
  - "layer/Tool"
  - "errorCode/BUILD-002"
  - ki/error-book
prevention: "把大型第三方 git 仓 clone 进被 git 跟踪的 Tool/ 前：先 du -sh 估体积，gitignore 重的生成/构建目录，并删除 nested .git（否则 git 记录成 gitlink 而非文件）。"
aliases:
  - "ERR-035"
mem_ref: "285f6011-72c7-4586-9a61-113e5cec5579"
mem_status: "linked"
ci_rules:
  - type: "file-pattern-ban"
    pattern: "^Tool/[^/]+/(internal|vendored|node_modules|build|dist)/"
    message: "第三方仓的生成/构建目录被 git 跟踪 — 应 gitignore（ERR-035 重目录 bloat）"
---

# 把大型第三方 git 仓 vendoring 进 Tool/ 的两个坑：gitlink 陷阱 + 重目录 bloat

## 错误现象
`/find` 入库 `codebase-memory-mcp-pro`（含 158 个生成的 tree-sitter `parser.c`）时，两个坑差点污染 toolBox 仓库：

1. **重目录 bloat**：`git clone` 后整仓 **1.2 G**（`internal/`=1.1G + `vendored/`=43M 全是生成的 grammar parser.c，单文件可达 100M）。若直接 `git add Tool/<repo>/`，1.2G 会被提交进治理仓。
2. **gitlink 陷阱**：`Tool/<repo>/` 保留了 clone 带来的 nested `.git/`。`git add` 该目录时，git 把它当**嵌入式子仓库**记录成 gitlink（mode 160000，单条目），而**不跟踪里面的文件** —— `git add -n` 只列 1 条。`.gitignore Tool/**/.git/` 只挡 .git 内容，挡不住 gitlink 行为。

## 根因分析
1. Tool/ 层是被 toolBox git **跟踪**的（4490 文件，cocos/unity MCP 都已提交），不是 submodule 也不是 gitignored，所以 clone 进来的东西默认会进主仓提交面。
2. 既有 Tool/ 仓（Skill_Seekers/cocos-mcp-server/unity-mcp）都是**纯文件 vendoring**——它们的 nested `.git` 在入库时被移除了。这是约定，但 `/find`/`skill_ingestion` 工作流的 `git clone` 步骤没显式写"删 .git"，容易漏。
3. 第三方代码-intelligence 仓携带大量生成产物（grammar parser.c、UI bundle、bench fixture），与"轻量 markdown skill 仓"的体量假设不符。

## 解决方案
1. **先估体积**：`du -sh <repo>` + `du -sh <repo>/*/ | sort -rh`，识别重的生成/构建目录。
2. **gitignore 重目录**（不删源文件，保留本地引用，IL04 源不动）：把 `Tool/<repo>/{internal,vendored,...}/` 加入根 `.gitignore`。本例 1.2G → 提交面仅 **11M**（README/docs/src/tools/scripts）。
3. **删 nested .git**：`rm -rf Tool/<repo>/.git`，匹配 vendoring 约定，使文件被当普通文件跟踪（非 gitlink）。provenance 由 `source_registry.json` 的 `lastCommitHash` 留存。
4. **优先 npx/uvx 运行体**：若 MCP 发布了 npm/pypi 包（看 `server.json`），用 `npx -y <pkg>` 让新项目零本地构建，根本不需要把重仓当运行体。

## 预防规则
- Agent 在 `/find` 或任何 `git clone ... Tool/` 后、`git add` 前，**必须**：① `du -sh` 估体积；② `[ -e Tool/<repo>/.git ] && rm -rf Tool/<repo>/.git`；③ `git add -n Tool/<repo>/ | grep -E '(internal|vendored|node_modules|build)/'` 确认 0 重目录泄漏。
- gitlink 自检（非内容正则，CI 可加 shell 检查）：`git ls-files -s Tool/ | awk '$1==160000'` 必须为空。
- 体量异常（`du -sh` > ~50M）即停下评估该 gitignore 哪些生成目录，不要无脑全量提交。

## 关联
- [[PAT-014__external-mcp-server-find-ingestion-as-plugin|PAT-014]] — 外部 MCP server 入库的正确完整模式（本错题是其 vendoring 步骤的反面教材）
- [[ERR-007__obsidian-mcp-wrong-config-path|ERR-007]] — 同属 MCP 集成治理：全局 MCP 必须 `claude mcp add --scope user`，不能手写 ~/.claude/.mcp.json
- [[DEC-006__codebase-memory-conditional-code-structure-memory|DEC-006]] — 本次入库对象的决策记录
