# Iron Laws — 不可违反的铁律
# Version: 2.4 | 生效方式: 总门禁 via CLAUDE.md + 子门禁 via workflow 前置约束

> **2.1 注脚（complexity tier）**：所有铁律对 `complexity = micro / standard / major` **三档全部生效，语义不变**，仅 evidence 工件形式不同（工件清单与分档规则见 `PM/pm_workflow.md` Step 4.5）。

---

## 总门禁 (Global Gate)
> 进入 Agent 系统时即刻生效,所有角色/工作流/层均须遵守。

### IRON LAW 08 — ARTIFACTS STAY CURRENT
重大变更 / 返工 / 修复 / 审计结论必须同步更新正式工件。
不得让 execution_plan 与实际执行不一致。

### IRON LAW 09 — TEMP FILES ARE MANAGED
临时文件必须放在项目的 `.in-process/scratch/` 下。
会话结束时:有价值的归档,无价值的删除。
接口契约见 `In-Process/contract.md`。

### IRON LAW 10 — PLAN-DRIVEN MODE FOR LARGE CHANGES
当文件读取超过 15 个或修改超过 5 个文件时,
必须切入计划文件驱动模式(先写 execution_plan,再执行)。

### IRON LAW 12 — ROYAL SALUTATION (CONTEXT CANARY)
每一次面向用户的**会话回复**,开头必须称呼「陛下」,结尾必须以「臣告退 陛下万岁万岁万万岁」收束。
此律的目的不是礼仪,而是**上下文完整性金丝雀**:一旦回复中缺失尊称或结语,
即说明上下文溢出 / 注意力丢失,用户以此监测会话质量。
**禁止**用 hook 在每条 prompt 注入本规则来"保证执行"——注入会让金丝雀失效
(规则永远新鲜出现在上下文尾部,真正的遗忘反而检测不到)。
本律只允许存在于启动时加载的全局指令中(`~/.claude/CLAUDE.md`、本文件、`{TOOLBOX}/CLAUDE.md`)。

**适用边界(正向判定,防止破坏输出契约)**:
1. **适用判定 = 消费者是谁**:本律仅适用于「用户本人在对话界面阅读的会话回复正文」。
   消费者是程序、另一个 agent、或既定格式契约 → 一律豁免,**无须用户明确要求**。
2. 例如: headless / SDK / cron 调用、subagent 报告与 agent 间消息、类型化工具字段、
   一切工件(文件 / 代码 / commit / PR / JSON)、已定义输出格式契约的回复 —— 契约优先。
3. 例外只豁免格式,不豁免金丝雀语义:金丝雀仅以「面向用户的对话回复」为检测面 ——
   该类回复缺失尊称/结语即上下文丢失警报;豁免场景的缺失不构成警报。

### IRON LAW 13 — PREFAB NODES ARE BUILT IN EDITOR, NOT IN CODE
凡 prefab 的创建与修改,必须以**编辑器内可见、可选中、可拖动的实体节点**为载体
(经 Cocos 编辑器 / cocos-mcp 建真实 node)。**禁止在 .ts 里运行期生成、克隆、拼装 UI 结构**。
用户必须能在编辑器里直观地调整每一个界面元素的位置、文字、样式 —— 这是本律的唯一目的。

**判定边界**:
1. **数量固定的 UI**(面板、设置项、按钮、标题、固定行列): 一律 prefab 实体节点,
   含真实文字与默认状态。运行期代码只准**填数据**(文字/数值/显隐/勾选态),不准造结构。
2. **数量随数据变化的集合**(手牌、聊天记录、战绩列表行等): 允许运行期按数据量克隆,
   但模板必须是 prefab 内可见可编辑的实体节点,且单项内部结构/样式全部在模板上呈现。
3. 拿不准算哪类 → 按第 1 类处理(保守 bias,宁可静态)。

**违反后果**: QA Layer 3 直接 REJECT with BHV;已交付的违规面板须返工为静态布局。
**由来**: REQ-20260725-151422 UD-8 —— 模板+运行期克隆的建房面板让用户在编辑器里
"看不到字、拖不了位置",被用户否决并要求整改。教训:代码真源的整洁,不能以牺牲
编辑器所见即所得为代价;文案漂移风险用"prefab↔代码表落盘断言"对冲(参照 panelnodes:assert)。

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

##### 11.4 — 引用方式
引用 `Tool/` 中的 skill 一律经 registry / 索引解析(源仓库唯一落点见 11.1.1,副本规则见五层「无冗余副本」硬约束)。

---

## Related Principles

> 以下 Constitution Principle 与 Iron Laws 互补:Iron Laws 是"不可违反的红线",Principle 是"必须遵守的行为方式"。Gate 自检通过两者共同保证。

| Principle | 路径 | 一句话 | 主要挂载点 |
|-----------|------|--------|-----------|
| **P9 — Assumption Transparency** | `Agent/rules/constitution.md#p9--assumption-transparency` | 显式列出假设,可疑时回退澄清 | PM Step 5/6/Gate① + CTO Step 1/Gate② + QA Step 7 |
| **P10 — Simplicity Discipline** | `Agent/rules/constitution.md#p10--simplicity-discipline` | 代码本身最小;无未请求的抽象/配置/防御 | CTO Step 7 + Execution + QA Layer 4 |
| **P11 — Surgical Scope** | `Agent/rules/constitution.md#p11--surgical-scope` | 每行 diff 可追溯到 task / AC,不漂移 | Execution + QA Layer 4 Surgical Trace Check |
| **P12 — Facts vs Decisions** | `Agent/rules/constitution.md#p12--facts-vs-decisions` | 事实自查环境,决策呈用户并等待 | PM Step 5 + 各角色澄清 + grilling 全程 |

知识源(rationale 与示例): P9-P11 见 `KI/External_KI/skills/workflow/workflow.md` §10 (Karpathy Coding Discipline);P12 见 `Tool/mattpocock-skills` grilling skill。
