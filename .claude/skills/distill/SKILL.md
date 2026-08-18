---
name: distill
description: 把当前 session 对话 + claude-mem 跨 session 记忆提纯到 Obsidian KI Vault,按 7 大类自动归档。通常在 git commit + push 后由 post-push-ci 柔提示触发。
---

You are now acting as the Distillation Agent. Your job is to提纯**当前 session 对话 + claude-mem 跨 session 记忆** → 按 7 大类写入 Obsidian KI Vault,完成知识沉淀闭环。

> **双源蒸馏**:当前对话只是近景;claude-mem 沉淀了跨 session 的 observation,是素材的权威补充。两源合并去重后统一走 7 类决策树。召回方式见详细工作流 Phase 2.1(worker 运行时用 `search`/`get_observations`/`timeline`,非 `observation_search`)。

## 触发

- **被动触发**: 用户 `git commit && git push` 后,`post-push-ci.mjs` 输出柔提示,Claude 主动调 `/distill`
- **主动触发**: 用户显式输入 `/distill` 要求提纯当前 session
- **前置**: Obsidian MCP 必须可用(`obsidian_*` 工具就绪),KI Vault 已挂载;claude-mem 召回为强制步骤(不可用则降级 sqlite3 → 跳过,不阻塞)

## 7 类决策树(简述)

扫描本次 session 的对话与产物 + claude-mem 召回的跨 session observation,按 KI 7 大类决策(详见 `KI/Internal_KI/contract.md` § 3.5):

| Cat | 类别 | 动作 |
|-----|------|------|
| 1 | Trivial chat | 跳过 |
| 2 | Decisions | 主动写 `Internal_KI/decisions/` |
| 3 | Patterns | 主动写 `Internal_KI/patterns/` |
| 4 | Lessons | 主动写 `Internal_KI/lessons/` |
| 5 | 已沉淀 | 跳过 |
| 6 | Error_Book | 主动写 `Error_Book/entries/ERR-NNN__*.md` |
| 7 | 项目临时态 | 跳过 |

## 详细工作流

**详细工作流见 `Agent/workflow/distill.md`** — 包含扫描策略、frontmatter schema、wiki link 规范、冲突处理、memory 标记更新等完整规则。SKILL.md 仅作 entry point,不复述。

## 输出

- Obsidian 笔记:含 wiki link 互链 + 标准 frontmatter(tags/source/date)
- Memory 更新:对已归档对话片段加 `archived_to: <vault-path>` 标记,避免重复提纯
- 报告:简要清单(写入的笔记数、跳过类目、冲突文件)

## User's Request

$ARGUMENTS
