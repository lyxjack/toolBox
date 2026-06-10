---
date: 2026-05-17
req_ref: REQ-20260517-032402
type: governance-decision
status: active
impacts:
  - Agent/rules/constitution.md
  - Agent/rules/iron_laws.md
  - PM/pm_workflow.md
  - PM/templates/requirement_package.tmpl.md
  - PM/templates/requirement_package_micro.tmpl.md
  - Agent/workflow/cto_planning.md
  - Agent/templates/execution_plan.tmpl.md
  - Agent/workflow/qa_verification.md
  - KI/External_KI/skills/workflow/workflow.md
tags: [governance, principle, karpathy, iron-law, gate]
---

# Decision: Karpathy 4 条原则从知识层提升为规则层

## 背景

通过 `/find` 把 `multica-ai/andrej-karpathy-skills` 仓库的 4 条原则增量并入 `KI/External_KI/skills/workflow/workflow.md §10`(知识层)。用户提出:这 4 条是"第一性原理"级别,应进入 PM → CTO → Execution → QA 闭环的运行时强约束。

`grep iron law/assumption/surgical/simplicity` 在 `constitution.md` / `iron_laws.md` / `pm_workflow.md` 三个核心治理文件**几乎零命中**(仅 PM checklist 一个 "Clarified Intent"),确认存在真实覆盖缺口。

## Decision 1: Principle vs Iron Law(选 Principle,不增 IL)

**选择**: 在 `constitution.md` 新增 **P9 Assumption Transparency / P10 Simplicity Discipline / P11 Surgical Scope**。Iron Laws 总数保持 **11 条不变**,仅在末尾加 `Related Principles` cross-reference footnote。

**理由**:
- **IL 已达 11 条**: 继续加会稀释强度("每条都不可违反"变成"每条都可违反")
- **Karpathy 原则的违反语义不应触发 ISO-003**: 它是"行为方式"问题,不是"行为是否允许"。例如"代码本身没压到最小"不等于"违反合规",只是"应改进"
- **Principle 更易演化**: P9-P11 可在一周复盘后调整措辞,而 IL 一旦定义即近乎冻结
- **避免冗余**: P2 (Minimal Change) 与 P4 (No Silent Scope Expansion) 已部分覆盖 K-M2/K-M3 的"文件数"维度;P9-P11 补的是"代码本身/假设/drive-by"维度

**Phase 2 回退路径**: 若 1 周后规则被频繁绕过(KPI 见末尾),另起 REQ 升级为 IL12-14。

## Decision 2: K-M4 (Goal-Driven Execution) 不引入

**选择**: 不为 K-M4 新增规则或挂载点。

**理由**:
- **重叠率 ~90%**:
  - PM Gate① "AC 使用可验证的陈述" — 覆盖 K-M4 上半段(把模糊任务转为可验证目标)
  - QA IL05 "QA IS A GATE" + Layer 2 "逐条对照 AC, 标记 PASS/FAIL" — 覆盖 K-M4 下半段(loop until verified)
  - workflow Anchor §7 "Verification Before Completion" — 文档形式存在
- **剩余 10% 在 micro tier 故意松**: micro AC 允许"目检通过" / "PENDING USER",red-green TDD 循环未强制。这是 tier 设计的有意妥协(< 30 行的小改动 TDD 收益不抵成本),不应通过新规则取消
- **新增规则会与 §2 Planning TDD task structure 重复**: 该结构已是 standard tier 的强制要求

**回退路径**: 若一周内 KPI 显示"AC 不可测的 REJECT 数 ≥ 1",重新引入 K-M4 相关规则,目标挂载点为 micro tier 的 AC 自检。

## Decision 3: Micro tier 弱化形式(允许 None identified / 一行)

**选择**: 所有新检查项(Hidden Assumptions / Simplicity Justification / Surgical Trace Check)在 micro tier 弱化:
- **Hidden Assumptions**: 允许 `None identified`,但若 micro 任务触及关键词(新功能/新接口/业务领域/跨层/schema/storage),**禁止** None identified,强制至少 1 条 — 否则触发 micro→standard 升级
- **Simplicity Justification**: 允许一行,如"< 30 行变更,无抽象/配置项膨胀嫌疑"
- **Surgical Trace Check**: < 30 行变更跳过 Step 5.5(Layer 4 主体检查已足够)

**理由**:
- **保护 micro 路径 25% token 节约**: 若 micro 也强制完整段,本来节约的 token 被吞掉,违反 PM Step 4.5 "micro 是狭窄通道而非默认路径"的设计
- **保留升级 escape hatch**: 关键词触发 + 范围爆了自动升级 standard,确保高风险 micro 不漏审
- **与现有 micro 模板 None identified 占位语义一致**: Risk Notes 段已有此 pattern

## Risk 缓解

| Risk | 缓解措施(已落地) |
|------|------------------|
| R1 多文件不同步 (IL08) | T1 Serial 先完,T2-T7 Parallel 引用 T1 输出;T8/T9 在 T1-T7 完成后才动 |
| R2 模板与 workflow 描述不一致 | T3+T4 在同 Group 中,Executor 同 worker 串联;两者引用同一 P9 路径 |
| R3 Gate checklist 漏新增 | 每改 workflow 的 task verificationCriteria 含"checklist 新增 N 项 + 旧项保留"双向检查 |
| R4 字数膨胀 | C4 字数预算硬约束,每 task verificationCriteria 含 "新增行数 ≤ X" |
| R5 grep 关键词误命中 | 关键词用 H3 标题或代码块包裹,grep 验证用 = 而非 ≥ |
| R6 workflow §10 主体被误改 | T8 字节数约束 ≤ 200 bytes;实际写入 193 bytes,Anchor 主体 0 改动 |
| R7 micro tier 吞掉精简收益 | Decision 3 落地 |
| R8 规则被频繁绕过 | 一周复盘 KPI(下文) |

## 一周复盘 KPI(2026-05-24 触发)

| 指标 | 目标 | 触发动作 |
|------|------|---------|
| **AC 不可测 REJECT** | < 1 次 | ≥ 1 → 引入 K-M4 相关规则,挂载点为 micro AC 自检 |
| **PM↔CTO 来回(Assumption Pushback 触发)** | < 0.3 次/REQ | ≥ 0.5 → 弱化 P9 措辞,或允许 CTO 在低风险时补假设(需 PM 事后追认) |
| **Token 增量(PM 包 + execution_plan)** | < 20% | ≥ 30% → 简化 Hidden Assumptions / Simplicity Justification 段格式 |
| **新增 Gate checklist 项命中率(grep 关键词)** | 100% | < 100% → 修复模板/workflow 不一致 |
| **drive-by REJECT 数** | 0-2 次(正常) | > 5 → 说明 Layer 4 Step 5.5 过严,微调阈值或弱化 |
| **规则被显式绕过的次数(state.json.history 中出现 "skip P9/P10/P11" 字样)** | = 0 | > 0 → 启动 Phase 2,升级 P9/P10/P11 为 IL12/13/14 |

## 引用源

- Karpathy 原文(workflow §10 知识源): https://x.com/karpathy/status/2015883857489522876
- 仓库: https://github.com/multica-ai/andrej-karpathy-skills (commit 2c60614)
- /find 入库记录: workflow Anchor frontmatter `merged_from.karpathy-guidelines (confidence 0.35, date 2026-05-17)`
- PM 分析: `.in-process/active/20260517-032402/requirement_package.md` (5 questions Q1-Q5)
- CTO 执行计划: `.in-process/active/20260517-032402/execution_plan.md` (Mode=hybrid, 9 tasks)
