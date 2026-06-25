---
id: PAT-014
type: pattern
title: "外部 MCP server 经 /find 入库为 externalPlugin（非 anchor 合并）"
status: active
created: "2026-06-24"
tags:
  - "pattern/integration"
  - "tool/MCP"
  - "layer/Tool"
  - ki/pattern
complements:
  - "[[ERR-035__heavy-mcp-repo-vendoring-into-tool-layer|ERR-035]]"
trigger_condition: "user_explicit"
related:
  - "Error_Book/entries/ERR-035__heavy-mcp-repo-vendoring-into-tool-layer.md"
  - "Internal_KI/decisions/DEC-006__codebase-memory-conditional-code-structure-memory.md"
  - "Internal_KI/patterns/PAT-012__mcp-out-of-process-json-pipeline.md"
aliases:
  - "PAT-014"
mem_ref: "285f6011-72c7-4586-9a61-113e5cec5579"
mem_status: "linked"
---

# 外部 MCP server 经 /find 入库为 externalPlugin（非 anchor 合并）

## 适用场景
`/find` 要入库的对象是一个 **MCP server / 运行时工具仓**（有 `server.json` / 二进制 / 工具集，但**没有 SKILL.md markdown 知识**），而非传统 markdown skill 仓。典型：`codebase-memory-mcp-pro`（代码结构知识图谱）、claude-mem（会话记忆 plugin）、cocos/unity MCP。这类对象**不能**走 `skill_ingestion` 的 13 类 Anchor 合并（Phase 3 对象是 markdown 切片），需走 externalPlugin 注册路径。

## 步骤
1. **判型**：看仓库有无 `SKILL.md`。无、但有 `server.json`/二进制/MCP 工具集 → 判为 MCP server，走本模式（不走 anchor 合并）。
2. **vendoring 进 Tool/（防 bloat/gitlink）**：先 `du -sh` 估体积 → gitignore 重的生成/构建目录 → `rm -rf <repo>/.git`。详见 [[ERR-035__heavy-mcp-repo-vendoring-into-tool-layer|ERR-035]]。
3. **注册为 externalPlugin（循 claude-mem 先例，不污染 Anchor）**：
   - `KI/External_KI/master_index.json` → `externalPlugins[]`（name/version/type/role/trigger/governanceRefs）+ 升 `_meta.lastUpdated`
   - `Agent/index/skill_registry.json` → `externalPlugins[]`（capabilities/installOptions/usageEntry/governanceNote）
   - `Agent/index/source_registry.json` → upstream + repo 条目（`/find-update` 版本追踪，记 lastCommitHash）
   - **不**写 `quality_audit.json`（那是 20 信号 markdown 审计，运行时插件不适用）
4. **trigger 必须源于工具自述 + 多源交叉验证**：trigger 条件**不能从用户举的场景外推**，要落到工具官方文档。最少交叉 fork README + 上游 README + 官方 docs + 第三方 wiki/实践文，确认"何时用 / 使用模型"。本例 5 源验证把"按任务 gate"校正为"per-project index-once"。trigger 权威定义落 `cto_planning.md`（单一来源），其余文档路径引用不复制。
5. **运行体优先 npx/uvx**：看 `server.json` 有无 npm/pypi 包；有则配 profile 用 `npx -y <pkg>`，新项目零本地构建、免供应链 curl|bash。装与否 = 用户确认动作；档位 1 延后安装、非全局常驻。
6. **决策落 DEC + 用法落 deploy_guide**：为什么引入 + 备选方案 → `Internal_KI/decisions/DEC-NNN`；如何装 → `Agent/mcp/deploy_guide.md`。

## 反模式
| 错误做法 | 正确做法 | 关联 |
|---------|---------|------|
| 把 MCP server 强塞进 13 类 Anchor 合并 | 注册到 externalPlugins，不动 Anchor | [[DEC-006__codebase-memory-conditional-code-structure-memory|DEC-006]] |
| trigger 按用户举的场景外推（按任务 gate、默认全关） | 落工具官方文档 + 多源交叉验证（per-project index-once） | 本模式步骤 4 |
| 直接 git add 1.2G clone / 留 nested .git | du 估体积 + gitignore 重目录 + 删 .git | [[ERR-035__heavy-mcp-repo-vendoring-into-tool-layer|ERR-035]] |
| 默认 curl\|bash 装二进制常驻 | 优先 npx/uvx，延后安装、按项目注册 | — |
| trigger 四要素清单在多个文件各写一份 | 单一权威源（cto_planning）+ 路径引用 | 无冗余副本硬约束 |

## 关联错误
- [[ERR-035__heavy-mcp-repo-vendoring-into-tool-layer|ERR-035]] — vendoring 步骤踩的 gitlink + bloat 两坑
- [[DEC-006__codebase-memory-conditional-code-structure-memory|DEC-006]] — 本模式首例（codebase-memory）的决策实例
- [[PAT-012__mcp-out-of-process-json-pipeline|PAT-012]] — 另一类 MCP 集成（进程外取数），与本模式互补
