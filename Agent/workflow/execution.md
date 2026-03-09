---
description: 按 Task DAG 逐个执行任务，输出 change_manifest 和 handoff。禁止擅自改需求或扩 scope。
---

# Execution

## 触发条件
CTO 完成 Gate② 后交接，`state.json` 的 `currentState` 为 `EXECUTION`。

## 输入
- `requirement_package.md`（只读参考，不得修改）
- `execution_plan.md`（只读参考，不得修改）
- `task_dag.json`（读取 task 列表和依赖）

## 步骤

### Step 1: 加载计划
1. 读取 `task_dag.json`
2. 读取 `execution_plan.md` 中的执行模式（serial / parallel / swarm）
3. 按依赖关系排序，确定执行顺序:
   - **serial**: 逐 task 顺序执行
   - **parallel**: 无依赖的 task 同时执行（使用 Agent tool 并行派发）
   - **swarm**: 各 task 独立探索，最终由 CTO 汇总
4. 对每个 task，记录 `skillRef` 以备按需加载 SKILL.md
5. 参考 `Agent/orchestrator/strategy.md` 确认模式选择合理性

### Step 2: 逐 Task 执行
对每个 task（按 DAG 顺序）:

**2a. 加载 Skill（如有）**
- 如果 task 有 `skillRef` 和 `skillPath`，读取对应 SKILL.md
- 按 SKILL.md 中的指导执行
- **不加载无关 skill**

**2b. 执行代码变更**
- 严格按 task 的 `description` 执行
- 如遇到需要修改计划外文件的情况 → **停下，报告阻塞**，不得擅自修改
- 如发现需求理解有歧义 → **停下，报告阻塞**，不得自行猜测

**2c. 验证 task**
- 对照 task 的 `verificationCriteria` 做基本验证
- 运行相关测试

**2d. 输出 change_manifest**
创建 `change_manifests/{task_id}_manifest.json`，参考 schema:
`Agent/schemas/change_manifest.schema.json`

必须填写:
- `filesCreated`, `filesModified`, `filesDeleted`
- `linesAdded`, `linesRemoved`
- `skillsUsed`
- `testResults`
- `scopeNotes`: 必须明确写 `"No scope changes from plan"` 或说明偏差原因

**2e. 输出 handoff（每个 task 必须）**
创建 `handoffs/{task_id}.json`，参考 schema:
`Agent/schemas/handoff.schema.json`

必须填写:
- `task_id`, `parent_request_id`, `title`, `objective`
- `scope_in`, `scope_out`, `constraints`
- `expected_outputs`, `acceptance_checks`, `evidence_required`
- `relevant_skills`（实际使用的 skill 列表）

**2f. 更新 task_dag.json**
将 task 的 `status` 更新为 `"done"`

### Step 3: 阻塞处理
如果任何 task 被阻塞:
1. 在 change_manifest 的 `blockers` 中记录原因
2. 将 task status 设为 `"blocked"`
3. 更新 state → `CTO_PLANNING`，交回 CTO 处理

### Step 4: 所有 Task 完成后
1. 确认所有 task status = `"done"`
2. 做一次全局构建/测试验证
3. Gate③: 检查所有 change_manifest 都存在且 scopeNotes 无未授权变更
4. Gate③+: 检查所有 handoff 文件都已生成
5. 更新 state → `QA_VERIFICATION`
6. 交接 QA

## 返工入口
当 QA 以 `BUILD-*` 或 `EVD-*` 原因码驳回时:
1. 读取 `rework_order.json`
2. 定位 `affectedTasks`
3. 修复问题
4. 更新对应 change_manifest 和 handoff
5. 重新通过 Gate③ 交接 QA

## 禁止行为
- ❌ 修改 `requirement_package.md`
- ❌ 添加 `task_dag.json` 中未定义的 task
- ❌ 修改计划外的文件（scope creep）
- ❌ 未查现有 skill/code 就新建文件（Iron Law 03）
- ❌ 声称"完成"而不提供 change_manifest
- ❌ 声称"完成"而不生成 handoff
- ❌ 吞掉阻塞不上报
