---
description: CTO 将需求包拆解为 Task DAG,做 skill 选型、风险评估、验证规划。必须显式选择执行模式并通过强制 Gate。
---

# CTO Planning

## 前置约束 — CTO 子门禁
> 进入本工作流时,以下铁律自动生效(全文见 `Agent/rules/iron_laws.md`)。

| 铁律 | 一句话 | 门禁效果 |
|------|--------|---------|
| **IL 02** | NO PLAN, NO CODE | 无 execution_plan + task_dag 不得执行 |
| **IL 03** | REUSE BEFORE BUILD | 未查 KI/External_KI/ 和现有代码前禁止新建 |

## 触发条件
PM 完成 Gate① 后交接,`state.json` 的 `currentState` 为 `CTO_PLANNING`。

## 输入
- `requirement_package.md`(来自 PM)
- `{TOOLBOX}/KI/External_KI/master_index.json`
- `{TOOLBOX}/KI/Error_Book/index.json`
- `{TOOLBOX}/Agent/orchestrator/strategy.md`(执行模式选择指南)

## 步骤

### Step 1: 需求可行性评审
阅读 `requirement_package.md`,评估:
- 技术可行性
- 需求是否自洽(Scope vs Constraints 是否矛盾)
- AC 是否可在当前技术栈下验证

**如果不可行或自相矛盾** → 更新 state → `PM_ANALYSIS`,退回 PM 并说明原因。

### Step 2: Reuse Audit(Iron Law 03) — Anchor 架构
1. 读取 `{TOOLBOX}/KI/External_KI/master_index.json`
2. 根据需求关键词,在 `quickLookup` 中定位相关 **Category**(12 类之一)
3. 读取对应 `categories/{id}.json`(**只读相关类别,不全部加载**)
4. 确认该 Category 的 **Anchor** 文件路径(每个 Category 有且仅有一个 Anchor md)
5. 检查 `{TOOLBOX}/KI/External_KI/cross_references.json` 确认跨类别引用关系
6. 扫描项目现有代码,检查是否有可复用的模块

> **CTO 职责边界**: CTO 只选定相关的 Category 及其 Anchor 路径,**不深入读取 Anchor 内容**。具体使用 Anchor 中的哪些知识切片(section / tier),由 Executor 在执行阶段根据 Anchor 内部索引(frontmatter 的 tier_index / section line ranges)自主抉择。

将结果填入 `execution_plan.md` 的 **Reuse Audit** 表,格式:

| Category | Anchor Path | Confidence | 备注 |
|----------|-------------|------------|------|
| testing | `KI/External_KI/skills/testing/testing.md` | 0.71 | Executor 按 tier_index 选取 |
| backend | `KI/External_KI/skills/backend/backend.md` | 0.67 | Executor 按 section 选取 |

### Step 3: 执行模式选择(强制 Gate)

参照 `{TOOLBOX}/Agent/orchestrator/strategy.md` 的决策矩阵和 `{TOOLBOX}/Agent/orchestrator/execution_modes.md` 的详细定义。

**3a. 量化评估(必须完成)**
1. 统计 task 总数
2. 计算任务间文件重叠率(共享文件数 / 总涉及文件数)
3. 分析任务间数据依赖关系(有向图)
4. 判断任务性质(确定性 vs 探索性)

**3b. 强制选择规则**

| 条件 | 必须选择的模式 | 禁止的模式 |
|------|--------------|-----------|
| task 数 >= 3 且文件重叠率 < 20% 且无数据依赖 | **Parallel** 或 **Swarm** | Serial |
| 探索性任务或需要多方案对比 | **Swarm** | Serial |
| 大规模知识提炼(涉及 >= 5 个 skill/文件) | **Swarm** 或 **Parallel** | Serial |
| 任务间有数据依赖 或 文件重叠率 > 50% | **Serial** | — |
| 混合场景 | **混合模式**(独立部分并发,依赖部分串行) | 全部串行 |

**3c. 记录格式**
在 `execution_plan.md` 中必须包含:
```markdown
## Execution Mode

**Selected Mode**: {serial / parallel / swarm / hybrid}
**Task Count**: {N}
**File Overlap Rate**: {X%}
**Data Dependencies**: {描述}
**Rationale**: {为什么选择此模式,引用上表条件}
**Task Groups**:
- Group 1 ({mode}): T1, T2, T3
- Group 2 ({mode}, depends on Group 1): T4

**Merge Strategy**: {并发/蜂群结果如何合并}
```

**3d. 如果选择了 Serial 但 task >= 3**
必须在 Rationale 中逐条解释为什么每对 task 之间存在强依赖,否则 Gate② 不通过。

### Step 4: Task DAG 拆解
将需求拆解为独立 task:
- 每个 task 标注所属 **Category** 及 Anchor 路径(`anchorRef`),由 Executor 在执行时按 Anchor 内部索引选取具体知识切片
- 标明 task 间依赖关系
- 每个 task 必须有 `verificationCriteria`

创建 `task_dag.json`,参考 schema: `{TOOLBOX}/Agent/schemas/task_dag.schema.json`

### Step 5: Risk Assessment
识别风险并制定缓解措施:
- 技术风险(新技术、未验证方案)
- 集成风险(与现有代码的交互)
- Scope 风险(哪些 AC 可能引发 scope creep)

### Step 6: Verification Plan
为 QA 制定验证计划:
- 基于每个 AC 列出具体验证步骤
- 指明哪些需要自动化测试,哪些需要手动验证
- 标明 Layer 3(行为正确性)的关键检查点

### Step 7: Minimal Change Rationale(Iron Law 02 / 10)
论证当前方案是最小化修改:
- 为什么不能更少?
- 如果修改文件 > 5 个,说明为什么每个都必须改

### Step 8: 输出 execution_plan.md
按 `{TOOLBOX}/Agent/templates/execution_plan.tmpl.md` 模板填写。
**保存到 `.in-process/active/{session_id}/execution_plan.md`。**

### Step 9: Gate② 检查
自检:
- [ ] Reuse Audit 非空
- [ ] **执行模式已选定,包含 Task Count / File Overlap Rate / Data Dependencies / Rationale**
- [ ] **模式选择符合 Step 3b 强制规则(串行需逐对证明依赖)**
- [ ] task_dag.json 中每个 task 有 anchorRef(Category + Anchor 路径)或明确说明为何不需要
- [ ] 每个 task 有 verificationCriteria
- [ ] Minimal Change Rationale 存在
- [ ] Verification Plan 存在
- [ ] **execution_plan.md 已写入 `.in-process/active/{session_id}/`**

**通过** → 更新 state → `EXECUTION`,交接执行层
**不通过** → 补充后重检

## 返工入口
当 QA 以 `BHV-*` 或 `ISO-*` 原因码驳回时:
1. 读取 `rework_order.json`
2. 分析是设计问题还是实现问题
3. 如果是设计问题: 修改 `execution_plan.md` 和 `task_dag.json`
4. 如果是实现问题: 增加 task 的 verificationCriteria 后交回 Execution
5. 更新 state.json 记录返工

## 禁止行为
- ❌ 修改用户需求的业务含义
- ❌ 跳过 PM 直接接用户请求
- ❌ 跳过 QA 直接宣布完成
- ❌ 删除或修改原始 skill 源文件
- ❌ 在 task >= 3 且无依赖时仍选择串行模式
- ❌ 工件仅在对话中输出而不写入 `.in-process/`

---

## Micro Path（complexity = micro 时启用）

> 由 PM Step 4.5 决定 `complexity = micro` 后激活。本路径绕过独立的 `execution_plan.md` + `task_dag.json` 产出，但 IL02（NO PLAN, NO CODE）**仍然生效** — plan 内联到 `requirement_package_micro.md` 的 **Plan** 段。

### 行为差异

| 阶段 | standard | micro |
|------|----------|-------|
| Step 2 Reuse Audit | 写入 `execution_plan.md` Reuse Audit 表 | 一行写在 micro 模板 Plan 段的 "Reuse 引用" |
| Step 3 执行模式 | 强制 quantitative + 必填表格 | **跳过**（micro 默认 Serial，单段步骤） |
| Step 4 Task DAG | 必须 `task_dag.json` | **跳过** — micro 模板 Plan 段写 ≤ 5 步即可（无 DAG） |
| Step 5 Risk | 写 Risk Assessment 表 | 一行写在 micro 模板 Risk / Note 段 |
| Step 6 Verification Plan | 写在 `execution_plan.md` | 内联到 micro 模板 QA Evidence 段的 5 层表预期项 |
| Step 7 Minimal Change Rationale | 必须章节 | 一行写在 Plan 段末尾即可（"改 N 文件，无可减少"）|
| Step 8 落盘 | `execution_plan.md` + `task_dag.json` | **不产新文件**，CTO 直接 Edit `requirement_package_micro.md` 的 Plan 段 |
| Step 9 Gate② | 8 项 checklist | 简化 3 项：Plan 段非空 / Reuse 引用非空 / 升级触发条件无命中 |

### Gate② Micro 检查清单
- [ ] `requirement_package_micro.md` 的 Plan 段已填（工具 + 步骤 + Reuse 引用）
- [ ] 仍处于 micro 范围（≤ 2 文件 / ≤ 30 行 / 单层 / 无新 KI / 无 storage / 无安全敏感）— 若已超出，**立即升级 standard** 走 `pm_workflow.md` Step 4.5d
- [ ] Verification Plan（5 层预期）已填到 QA Evidence 段

通过 → state → `EXECUTION`，移交 Execution。
不通过 → 补段；若是范围爆了 → 升级 standard。

### 禁止
- ❌ 在 micro path 里偷偷创建 `execution_plan.md` / `task_dag.json` 占位空文件（要么 micro 路径不产，要么升级 standard 产完整版）
- ❌ Plan 段超过 5 步（超出说明该升级）
- ❌ 跳过 Reuse 引用（IL03 仍生效）
