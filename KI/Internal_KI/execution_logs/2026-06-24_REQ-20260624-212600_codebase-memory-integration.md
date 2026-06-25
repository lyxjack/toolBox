---
id: "EXEC-2026-06-24-codebase-memory-integration"
type: execution_log
req_ref: "REQ-20260624-212600"
status: "pass"
created: "2026-06-24"
tags:
  - execution_log
  - req-tracking
  - ki/internal
  - tool/MCP
  - topic/memory-system
related:
  - "Internal_KI/decisions/DEC-006__codebase-memory-conditional-code-structure-memory.md"
  - "Internal_KI/patterns/PAT-014__external-mcp-server-find-ingestion-as-plugin.md"
  - "Error_Book/entries/ERR-035__heavy-mcp-repo-vendoring-into-tool-layer.md"
  - "Internal_KI/patterns/PAT-012__mcp-out-of-process-json-pipeline.md"
aliases:
  - "EXEC-2026-06-24-codebase-memory-integration"
mem_ref: "285f6011-72c7-4586-9a61-113e5cec5579"
mem_status: "linked"
---

# codebase-memory-mcp-pro 评估并集成为"第三类记忆"，/find 入库 + CTO 触发门禁落地

## User Intent (Original)
"查看 github 上的 codebase-memory-mcp-pro 对 toolBox 有没有提升，是否加入工作流" → 后续："pull 到 Tool 里、放入 KI、把工作流完全建立好，以后开新项目直接用" → "commit，然后 /distill"。

## PM Clarified Intent
不是无脑装 MCP，而是带门禁的技术选型评估 + 受控集成：① 评估净增益（尤其对比 Obsidian 文件治理、与现有能力的冗余/token）；② 定 trigger；③ 受控写进工作流。用户澄清：价值不在 toolBox 自身治理，而在**以后打开新代码项目时浏览结构、理解需求**。

## Hidden Assumptions Surfaced
- A1: "文件治理"有两层（toolBox markdown 治理 vs 代码项目结构治理）——评估需分别回答 — 挂载 P9
- A2: "别引入冗余 + token 暴增"是一票否决项 — 用户已确认
- A3: 集成 = 改 Agent 治理 + KI 注册，不等于立即装二进制（档位 1）

## CTO Plan Summary
- 任务数：分两批（治理集成 5 文件 + /find 入库 5 索引/配置）
- 执行模式：Serial（文档强一致 + 无冗余副本要求，trigger 单一权威源）
- 关键依赖：trigger 权威定义（cto_planning Step 2.5）→ deploy_guide / DEC-006 / PM 指针全部路径引用，不复制

## Execution Outcome
- 结果：PASS
- AC 命中率：5/5（评估结论 + 四要素→两级 trigger + 五层治理自检 + DEC-006 含 mem_ref/wiki + 去冗余声明）
- 关键交付：DEC-006 决策；cto_planning Step 2.5 两级门禁；deploy_guide 三装法；profile(npx)；externalPlugin 三索引注册；Tool/ clone（11M lean，1.1G gitignore）
- commit c4559bb（未 push，版号待 pre-push 询问）

## Lessons Extracted
1. **trigger 必须源于工具自述 + 多源交叉验证**：初版按"用户给的场景"推断 trigger（按任务 gate、默认全关），经 fork/上游 README + 官方 docs + DeepWiki + 实践文 **5 源交叉验证**校正为"per-project index-once、项目内长期辅助"。教训：集成外部工具时，trigger 条件不能从用户举例外推，要落到工具官方文档 — 见 [[PAT-014__external-mcp-server-find-ingestion-as-plugin|PAT-014]]
2. **MCP server 入库走 externalPlugin 而非 anchor 合并**：运行时二进制非 markdown 知识，循 claude-mem 先例注册到 master_index/skill_registry 的 externalPlugins，不污染 13 类 Anchor — 见 [[DEC-006__codebase-memory-conditional-code-structure-memory|DEC-006]]
3. **大型第三方仓 vendoring 的两个坑**（gitlink + 1.2G bloat） — 见 [[ERR-035__heavy-mcp-repo-vendoring-into-tool-layer|ERR-035]]
4. **三类记忆边界**：codebase-memory=代码结构记忆，与 claude-mem 会话记忆、Obsidian KI 知识记忆互补；对 toolBox 纯 markdown 治理层零价值（官方明示文档类 not-first-class），印证排除规则

## Cross-References
- [[DEC-006__codebase-memory-conditional-code-structure-memory|DEC-006]] — 决策记录（含使用模型校正 + 交叉验证留痕）
- [[PAT-014__external-mcp-server-find-ingestion-as-plugin|PAT-014]] — 沿用/沉淀的入库正确模式
- [[ERR-035__heavy-mcp-repo-vendoring-into-tool-layer|ERR-035]] — 触发的预防规则
- [[PAT-012__mcp-out-of-process-json-pipeline|PAT-012]] — MCP 集成 + token 边界先例
- [[ERR-032__bulk-data-through-llm-context-token-bomb|ERR-032]] — token 经济边界，门禁 P1/P3 论据
