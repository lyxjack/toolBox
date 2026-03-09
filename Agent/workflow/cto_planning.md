---
description: CTO 将需求包拆解为 Task DAG，做 skill 选型、风险评估、验证规划。
---

# CTO Planning

## 触发条件
PM 完成 Gate① 后交接，`state.json` 的 `currentState` 为 `CTO_PLANNING`。

## 输入
- `requirement_package.md`（来自 PM）
- `d:\toolBox\KI\External_KI\master_index.json`
- `d:\toolBox\KI\Error_Book\index.json`
- `d:\toolBox\Agent\orchestrator\strategy.md`（执行模式选择指南）

## 步骤

### Step 1: 需求可行性评审
阅读 `requirement_package.md`，评估:
- 技术可行性
- 需求是否自洽（Scope vs Constraints 是否矛盾）
- AC 是否可在当前技术栈下验证

**如果不可行或自相矛盾** → 更新 state → `PM_ANALYSIS`，退回 PM 并说明原因。

### Step 2: Reuse Audit（Iron Law 03）
1. 读取 `d:\toolBox\KI\External_KI\master_index.json`
2. 根据需求关键词，在 `quickLookup` 中定位类别
3. 读取对应 `categories/{id}.json`（**只读相关类别，不全部加载**）
4. 按 `confidence` 降序选最佳 skill
5. 检查 `crossRef.overlaps` 避免选重复 skill
6. 检查 `d:\toolBox\KI\External_KI\cross_references.json` 的 `superseded` 避免选旧版
7. 扫描项目现有代码，检查是否有可复用的模块

将结果填入 `execution_plan.md` 的 **Reuse Audit** 表。

### Step 3: 执行模式选择
参照 `d:\toolBox\Agent\orchestrator\strategy.md` 的决策矩阵:
1. 评估任务间依赖关系和文件重叠率
2. 选择执行模式: Serial / Parallel / Swarm / 混合
3. 记录选择理由和 Task Groups
4. 详细模式定义见 `d:\toolBox\Agent\orchestrator\execution_modes.md`

### Step 4: Task DAG 拆解
将需求拆解为独立 task:
- 每个 task 映射到一个明确的 skill 或代码模块
- 标明 task 间依赖关系
- 每个 task 必须有 `verificationCriteria`

创建 `task_dag.json`，参考 schema: `d:\toolBox\Agent\schemas\task_dag.schema.json`

### Step 5: Risk Assessment
识别风险并制定缓解措施:
- 技术风险（新技术、未验证方案）
- 集成风险（与现有代码的交互）
- Scope 风险（哪些 AC 可能引发 scope creep）

### Step 6: Verification Plan
为 QA 制定验证计划:
- 基于每个 AC 列出具体验证步骤
- 指明哪些需要自动化测试，哪些需要手动验证
- 标明 Layer 3（行为正确性）的关键检查点

### Step 7: Minimal Change Rationale（Iron Law 02 / 10）
论证当前方案是最小化修改:
- 为什么不能更少？
- 如果修改文件 > 5 个，说明为什么每个都必须改

### Step 8: 输出 execution_plan.md
按 `d:\toolBox\Agent\templates\execution_plan.tmpl.md` 模板填写。

### Step 9: Gate② 检查
自检:
- [ ] Reuse Audit 非空
- [ ] 执行模式已选定并记录理由
- [ ] task_dag.json 中每个 task 有 skillRef 或明确说明为何不需要
- [ ] 每个 task 有 verificationCriteria
- [ ] Minimal Change Rationale 存在
- [ ] Verification Plan 存在

**通过** → 更新 state → `EXECUTION`，交接执行层
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
