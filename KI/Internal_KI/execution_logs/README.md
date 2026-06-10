# execution_logs/ — Prompt 需求拆解日志(Cat 2)

> **用户分类**: Cat 2 — Prompt 需求拆解类
> **契约**: 见 `KI/Internal_KI/contract.md` § Cat 2 章节

## 用途

存放 PM → CTO → Execution → QA 闭环中,**AI 对硬需求理解的过程日志**。每个 REQ 完整闭环后,把"用户原始请求 → PM 澄清意图 → 最终实现状态"提炼成一份 execution_log,用于:

- 追溯 AI 是否真正理解了用户意图
- 复盘 PM↔CTO pushback 频率(若 P9 Assumption Pushback Gate 被频繁触发)
- 复用相似需求的拆解模式

## 与 `decisions/` 的边界

- `decisions/` = **结构性技术决策**(为何选 Principle 而非 Iron Law、为何 K-M4 不引入)
- `execution_logs/` = **需求理解过程**(用户说 X,PM 解读为 Y,CTO 拆为 N 个 task,QA 验证 12 AC 全过)

两者通过 wiki link 交叉引用:execution_log 若涉及关键决策 → `[[DEC-NNN__slug]]`;decision 若来源于某次 REQ → `[[YYYY-MM-DD_REQ-slug]]`。

## 文件命名

`{YYYY-MM-DD}_{REQ-id-short}.md`,例如 `2026-05-17_karpathy-p9-p11.md`。

## 模板

`KI/Templates/execution_log.tmpl.md`

## 状态

P0 占位目录(2026-05-17 创建)。toolBox 内由 /distill 自动填充(Phase 2 REQ);项目级也可手填。
