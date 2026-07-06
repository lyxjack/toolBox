---
id: ERR-045
type: error
errorCode: "EVD-001"
severity: "medium"
status: "resolved"
recurrence: 0
firstSeen: "2026-07-06"
tags:
  - "error/medium"
  - "process/skill-governance"
  - "tool/claude-code"
  - "errorCode/EVD-001"
  - ki/error-book
prevention: "slash command / SKILL 的正文只允许一个权威源（git 项目级）；用户级仅放指向绝对路径的薄指针；同名跨作用域必须同义，否则改名"
aliases:
  - "ERR-045"
mem_ref: "94555254-0c5d-4c86-978a-d232401daecf"
mem_status: "linked"
ci_rules: []  # 已评估：用户级 ~/.claude/commands 在 repo 外，静态 CI 无法比对双作用域一致性 → 不可自动化
---

# Slash command 双作用域重复定义漂移（同名不同义）

> CI: Tier 2 only — 用户级 `~/.claude/commands/` 不在 git repo 内，CI 无法比对两个作用域的定义一致性；靠预防规则 + 定期审计拦截。

## 错误现象
2026-07-06 审计发现 skill 列表中 pm/distill/find/init 各重复列出 2-3 次，且定义漂移：
- **pm 三重定义**：`toolBox/.claude/skills/pm/SKILL.md`、`~/.claude/commands/pm.md`、`toolBox/.claude/commands/pm.md` 三处描述各异，项目级 command 连 frontmatter 都没有
- **init 同名冲突**：用户级是"Agent Skills 项目脚手架"，项目级是"toolBox bootstrap"，语义完全不同，存在误触发风险
- **find 纯冗余**：两作用域内容完全相同的副本
- **distill 跨载体不同步**：SKILL.md 已升级双源蒸馏，用户级 command 仍是旧单源描述

## 根因分析
1. **无注册管辖**：`skill_registry.json` 只登记 13 个知识 anchor + 2 个外部 plugin，执行型 skill（pm/distill/find/init）不在任何注册表内，无一致性校验
2. **正文复制而非指针引用**：把 command 正文复制到多个作用域，升级时必然漏改（违反 CLAUDE.md「无冗余副本」）
3. **命名空间无治理**：用户级与项目级同名时靠作用域优先级隐式覆盖，语义冲突不报错

## 解决方案
- 删项目级 `commands/pm.md`（以 `.claude/skills/pm/SKILL.md` 为权威）；删用户级 `find.md`（以 git 内项目级为权威）
- 用户级 `/init` 改名 `/skills-init`，`/init` 让位给 CLAUDE.md 钦定的 toolBox bootstrap
- 用户级 `distill.md` 同步为双源描述（其正文本就是指向 `Agent/workflow/distill.md` 的薄指针，只需同步 description）

## 预防规则
- 新增/修改 slash command 或 SKILL 时：正文（工作流逻辑）只写在 **git 项目级一处**；用户级如需跨项目全局可用，只放"读取并遵循 `<绝对路径>`"的薄指针 + 与权威源一致的 description
- 同名跨作用域必须同义；语义不同就改名
- 升级 SKILL.md 时 grep `~/.claude/commands/` 检查是否有薄指针的 description 需要同步
- 关键词召回：`slash command`、`SKILL.md`、`commands`、`双作用域`、`重复定义`、`skill 注册`

## 关联
- [[ERR-044__ki-renumber-without-inbound-link-sync|ERR-044]] — 同次全库审计发现的另一类"工件与实际漂移"（Iron Law 8 ARTIFACTS STAY CURRENT 的两个实例）
- External_KI anchor `KI/External_KI/skills/meta-tooling/meta-tooling.md` — 含 /skill-stocktake 审计思路，可用于周期性 skill 盘点（anchor 不在 wiki-link 审计域，用路径引用）
