---
id: ERR-057
type: error
errorCode: ERR-057
severity: high
status: resolved
recurrence: 0
firstSeen: "2026-07-24"
tags:
  - ki/error-book
  - error
  - severity/high
  - domain/architecture
  - language/javascript
prevention:
  - "env 依赖的路径解析在多进程系统中必须假定 env 不一致：写端把断言写到全部候选根，或读端全根验证，二选一必须做"
  - "写候选根时通过厂商自己的解析库（动态改 env 逐根定位），不得手写路径拼接——解析逻辑必须与读者同源"
  - "盘上『双状态根并存』（持久 data dir 与 tmp fallback 同时出现同名状态）是此缺陷的实锤信号，巡检可直接检测"
ci_rules: []
mem_ref: 019f9771-430b-7532-9be5-557197ad8c0e
mem_status: linked
related:
  - "Error_Book/entries/ERR-047__docker-credential-helper-not-in-noninteractive-ssh-path.md"
  - "Error_Book/entries/ERR-007__obsidian-mcp-wrong-config-path.md"
aliases:
  - "ERR-057"
  - "write-a-read-b"
---

# env 决定状态根：写 A 读 B 的 fail-open

## 错误现象

Codex review gate 开关明明已启用，插件 Stop hook 仍可能读到 false 而静默放行。盘上实锤：`~/.claude/plugins/data/codex-openai-codex/state/` 与 `$TMPDIR/codex-companion/` 两个状态根同时存在同名 workspace 状态。

## 根因

厂商 state 库按 `CLAUDE_PLUGIN_DATA` 环境变量解析状态根：有 → 持久 data dir；无 → tmp fallback。而用户 hook 进程、插件 hook 进程、会话 shell 的 env **不保证一致** → 断言进程写根 A，强制门进程读根 B。与 [[ERR-047__docker-credential-helper-not-in-noninteractive-ssh-path|ERR-047]] 同族：**同一段代码在不同进程上下文里因 env 差异走出不同路径**。

## 修复

断言脚本枚举全部候选根（当前 env 指向的、`~/.claude/plugins/data/*codex*` 通配、tmp fallback），通过厂商 state 库循环写入（写前动态设/删 env，让厂商解析逻辑自己定位每个根）；强制门侧要求**全根纯读为真**才放行（见 [[ERR-058__same-event-parallel-repair-race-partial-success-fail-open|ERR-058]]）。

## 预防规则

见 frontmatter。ci_rules 评估：跨进程 env 差异属部署形态问题，无稳定 lint 面，留空。

## 关联

- [[ERR-047__docker-credential-helper-not-in-noninteractive-ssh-path|ERR-047]] — env 差异家族（非交互 PATH）
- [[ERR-007__obsidian-mcp-wrong-config-path|ERR-007]] — 配置写错位置导致读者读不到的先例
