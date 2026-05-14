# Iron Laws — 不可违反的铁律
# Version: 2.1 | 生效方式: 总门禁 via CLAUDE.md + 子门禁 via workflow 前置约束

> **2.1 注脚（complexity tier）**：以下所有铁律对 `complexity = micro / standard / major` **三档全部生效**，**语义不变**。仅 evidence 形式不同：standard / major 用独立工件（requirement_package.md + execution_plan.md + task_dag.json + verification_log.md + qa_report.md），micro 把它们合并到单一 `requirement_package_micro.md`。**不存在"micro 跳过铁律"这种情况**。分档规则见 `PM/pm_workflow.md` Step 4.5。

---

## 总门禁 (Global Gate)
> 进入 Agent 系统时即刻生效,所有角色/工作流/层均须遵守。

### IRON LAW 08 — ARTIFACTS STAY CURRENT
重大变更 / 返工 / 修复 / 审计结论必须同步更新正式工件。
不得让 execution_plan 与实际执行不一致。

### IRON LAW 09 — TEMP FILES ARE MANAGED
临时文件必须放在项目的 `.in-process/scratch/` 下。
会话结束时:有价值的归档,无价值的删除。
禁止在项目根目录随意创建临时文件。
接口契约见 `In-Process/contract.md`。

### IRON LAW 10 — PLAN-DRIVEN MODE FOR LARGE CHANGES
当文件读取超过 15 个或修改超过 5 个文件时,
必须切入计划文件驱动模式(先写 execution_plan,再执行)。
禁止在无计划状态下进行大规模变更。

---

## 子门禁 (Sub Gates)
> 由各工作流「前置约束」章节加载。仅在进入对应工作流时生效,但一旦加载不可绕过。

### PM 子门禁 (pm_workflow.md)

#### IRON LAW 01 — NO REQUIREMENT, NO EXECUTION
无 PM 标准需求包 (`requirement_package.md`),不得进入实现阶段。
Gate① 不通过时,必须停在 PM_ANALYSIS 状态。

### CTO 子门禁 (cto_planning.md)

#### IRON LAW 02 — NO PLAN, NO CODE
无 scope / constraints / acceptance criteria / verification plan,不得执行。
`execution_plan.md` 和 `task_dag.json` 必须同时存在。

#### IRON LAW 03 — REUSE BEFORE BUILD
未检查 `KI/External_KI/` 索引和项目现有代码前,禁止新造轮子。
CTO 的 `execution_plan.md` 必须包含 "Reuse Audit" 章节。

### QA 子门禁 (qa_verification.md)

#### IRON LAW 05 — QA IS A GATE
无 QA 证据 (`qa_report.md`),不得声称完成。
EXECUTION → DELIVERED 之间必须经过 QA_VERIFICATION。

#### IRON LAW 06 — NO CI-ONLY APPROVAL
QA 不得仅凭编译通过 / CI 绿灯 / 测试全过放行。
必须完成五层验证的全部检查项。

#### IRON LAW 07 — REJECTION REQUIRES REASON CODE
QA 驳回必须带结构化原因码 (`{CATEGORY}-{SUBCATEGORY}`)。
必须产出 `rework_order.json` 指明返工目标。

### Skill/KI 子门禁 (skill_ingestion.md)

#### IRON LAW 04 — SOURCE PRESERVATION
原始 skill 仓库中的文件只可读取,不得修改、删除或重写。
治理层只做映射、评级、推荐。违规触发 ISO-002。

> **例外 — `/find-update` 版本替换授权**
> 当且仅当通过 `/find-update` 工作流(见 `Agent/workflow/find_update.md`)执行时,
> 允许对 `Tool/` 中的外部库目录执行**整目录替换**操作(删除旧版本 → 写入新版本)。
> 前置条件:
> 1. 上游仓库确认存在更新(通过 `source_registry.json` 追踪)
> 2. 新旧版本已完成内容对比,模型判定更新有实质价值
> 3. 替换后必须触发 skill_ingestion.md Phase 2-6 重新入库
>
> 此例外不授权任何其他工作流修改 Tool/ 内容。

#### IRON LAW 11 — SKILL FILE GOVERNANCE
Agent Skills 的增删改必须遵守以下治理流程,违反触发 ISO-003。

##### 11.1 — 新增 Skill
1. Skill 源仓库只能 git clone 到 `Tool/` 目录(只读,不可修改源文件,参见 IRON LAW 04)。
2. 新增后必须在 `KI/External_KI/master_index.json` 注册条目(skill 名称、路径、类别、置信度)。
3. 对应类别索引文件 `KI/External_KI/categories/{category}.json` 必须同步更新。
4. `Agent/index/skill_registry.json` 必须同步新增启用记录。
5. 必须运行去重审查并更新 `Agent/index/duplicate_review.json` 和 `KI/External_KI/cross_references.json`。
6. 所有外部 skill 入库时,必须与对应 Category Anchor 进行逐模块对比(参见 skill_ingestion.md Phase 3)。每个模块独立决策取最优,模块级对比结果记录到 `Agent/index/duplicate_review.json`。不设整体重叠率阈值——去重由模块级对比天然保证。

##### 11.2 — 删除 Skill
1. 删除前必须确认无活跃任务依赖该 skill(检查项目 `.in-process/active/`)。
2. 从 `Tool/` 中移除源仓库目录。
3. 同步删除 `KI/External_KI/master_index.json`、对应类别索引、`cross_references.json` 中的条目。
4. 同步删除 `Agent/index/skill_registry.json` 和 `duplicate_review.json` 中的条目。
5. 在 `KI/Internal_KI/decisions/` 记录删除决策(原因、日期、审批人)。

##### 11.3 — 质量审计
1. 新增 skill 必须经过 20 信号结构化质量审计,结果写入 `KI/External_KI/quality_audit.json`。
2. 审计置信度 < 0.4 的 skill 不得进入 `skill_registry.json` 的启用列表。

##### 11.4 — 禁止事项
- 禁止在 `Tool/` 以外的任何位置存放 skill 源仓库。
- 禁止绕过索引系统直接引用 `Tool/` 中的 skill 文件。
- 禁止在根目录或其他层创建 skill 相关的冗余副本。
