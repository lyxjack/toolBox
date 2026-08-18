---
id: DEC-006
type: decision
title: "codebase-memory-mcp 作为按需触发的第三类记忆(代码结构记忆)"
status: active
created: 2026-06-24
tags:
  - ki/decision
  - tool/MCP
  - layer/Agent
  - topic/memory-system
related:
  - "Internal_KI/patterns/PAT-012__mcp-out-of-process-json-pipeline.md"
  - "Error_Book/entries/ERR-032__bulk-data-through-llm-context-token-bomb.md"
aliases:
  - DEC-006
mem_ref: null
mem_status: "unavailable"  # 沉淀时 claude-mem 无可靠 session 归属(contract § 3.8 降级形态；原误标 pending，2026-07-06 审计修正)
---

# codebase-memory-mcp 作为按需触发的第三类记忆(代码结构记忆)

## Decision
采纳 `codebase-memory-mcp-pro`(源码结构知识图谱引擎:tree-sitter + SQLite + Cypher)为 toolBox 的**第三类记忆 —— 代码结构记忆**,与 claude-mem(会话记忆)、Obsidian KI(知识记忆)并列。

采用**档位 1:规则先行,延后安装**:
- trigger 门禁写入 `Agent/workflow/cto_planning.md` **Step 2.5**(唯一权威定义,本记录不复制);
- 安装 runbook 写入 `Agent/mcp/deploy_guide.md`,**默认不装**,命中门禁且用户确认后才在该项目一次性安装;
- **非全局常驻**;同域与 claude-mem `smart-explore` **二选一**,禁止双开。

## 使用模型(多源交叉验证后校正)
> 第一版误把它定为"按任务临时调用、默认全关"。经 **5 源交叉验证**(fork README + 上游 DeusData README + 官方 docs 站 `deusdata.github.io` + DeepWiki + DEV.to 实践文章)校正为:

- **每个值得的项目 `index_repository` 一次,之后在该项目内长期辅助**(官方:"Index this project" → 后台 watcher 增量同步;DeepWiki:"Always-on per indexed project")。索引后还以 `PreToolUse` hook 被动增强该项目内的 Grep/Glob。
- 故判定是**两级**的:**A 级**决定"项目要不要索引"(主判定,画像 P1 真实源码 / P2 会反复探索 / P3 非一次性);**B 级**是"索引后项目内按问题选工具"(explore / trace_path / detect_changes / get_architecture / search_graph),不再逐任务开关。
- 索引成本低(Django 量级 ~6s,内核级 ~3min);唯一净亏 = 对 doc-only / 微型 / 看一眼即走的仓索引 —— P1/P2/P3 即为拦此。
- **交叉验证留痕**:所有源均**无**明确"硬性 not-for"清单,但一致把目标场景指向"大型/多语言/monorepo 代码库 + 反复结构化探索";文档类项目被上游列为 not-first-class,印证 toolBox 治理库应排除。

## Rationale
1. **填补能力空白,不与 Obsidian 重叠**:它治理的是**源代码结构**(调用图/影响半径/架构/死代码),Obsidian 治理的是 **markdown 策展知识**。README 明示文档/wiki 类项目属其 *When NOT to use* → 两者不同战场,互补不互斥,不存在"谁取代谁"。
2. **对 toolBox 自身零价值**:toolBox 五层是纯 markdown 治理库,无代码可建图;常驻只会带来工具 schema + 后台 watcher + 每项目 SQLite 的净开销。故**必须门禁**(P1 排除 toolBox 治理层)。
3. **真正价值在被管理的代码项目**:打开陌生代码项目做 onboarding(先看清架构再厘清需求)、重构、大范围影响分析、死代码清理时,用结构化查询替代逐文件 grep,token 效率显著(官方称 5 查询 ~3.4k vs grep ~412k)。
4. **Token 经济是双刃**(参见 [[ERR-032__bulk-data-through-llm-context-token-bomb|ERR-032]]):省 token 只在**会反复探索的真实代码项目**成立;doc-only/微型仓索引为净亏 → P1/P2/P3 门禁即为拦此而设。
5. **去冗余**:claude-mem 已自带 `smart-explore`(tree-sitter AST)/`learn-codebase`;本工具在代码结构上严格更强(持久图+调用链)但同域 → 立"二选一"规则,避免双开浪费。

## Alternatives Considered
| 方案 | 否决理由 |
|------|---------|
| **常驻全局 MCP(always-on)** | 对 toolBox 治理层与小项目净亏 token;后台 watcher 常驻空耗 |
| **完全拒绝/不引入** | 放弃陌生项目 onboarding 与重构影响分析的真实增益 |
| **立即全量安装落地(档位 2)** | 在无真实大型代码任务前就承担供应链(`curl\|bash` 第三方二进制)+ watcher 常驻成本 |
| **下线 smart-explore 全量替换** | 过度;smart-explore 轻量场景仍够用,二选一已足够去冗余 |

## Trigger(权威定义在别处,本记录仅指针)
两级门禁(A 级项目画像 P1-P3 决定是否索引 / B 级项目内按问题选工具)+ 去冗余"二选一"+ 延后安装规则的**唯一权威定义**见 `Agent/workflow/cto_planning.md` Step 2.5。安装步骤见 `Agent/mcp/deploy_guide.md` codebase-memory 章节。本记录**不复制**清单(无冗余副本)。

## Outcome
Active(规则已入工作流;二进制延后到首次命中门禁的真实代码任务再安装)。
首次实用后若证明高频可靠,再评估是否提升为 CLAUDE.md 核心"记忆体系"段的一等公民(当前暂不改 CLAUDE.md,避免未落地先宣告)。

## 关联
- [[PAT-012__mcp-out-of-process-json-pipeline|PAT-012]] — MCP 集成与 token 边界先例
- [[ERR-032__bulk-data-through-llm-context-token-bomb|ERR-032]] — token 经济边界教训,P1/P2/P3 门禁的直接论据
