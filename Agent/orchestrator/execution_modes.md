# Execution Modes v2

## 概述
本文件定义 v2 执行引擎支持的三种执行模式。CTO 在 `execution_plan.md` 中必须声明所选模式。

---

## Mode 1: Serial（串行）

### 行为定义
- 按 `task_dag.json` 的依赖关系逐个执行 task
- 每个 task 完成后才启动下一个
- 每个 task 产出 `change_manifest` 和 `handoff`

### 执行伪代码
```
tasks = topological_sort(task_dag)
for task in tasks:
    load_skill(task.skillRef)
    execute(task)
    output(change_manifest)
    output(handoff)
    update_dag(task.status = "done")
```

### 适用场景
- 核心流程改造
- Schema / API contract 变更
- 任务间存在写后读依赖
- 文件重叠率 > 50%

### Gate③ 检查
- 所有 task status = "done"
- 所有 change_manifest 存在
- 所有 handoff 文件存在
- scopeNotes 无未授权变更

---

## Mode 2: Parallel（并发）

### 行为定义
- 分析 `task_dag.json` 的依赖图，识别可并行的 task 组
- 同一组内的 task 使用 Agent tool 并行派发
- 组间仍按依赖顺序串行
- 每个 task 独立产出 `change_manifest` 和 `handoff`

### 执行伪代码
```
groups = partition_by_dependency(task_dag)
for group in groups:
    parallel_results = []
    for task in group:
        agent = launch_agent(task)  // 并行
        parallel_results.append(agent)
    wait_all(parallel_results)
    for result in parallel_results:
        verify(result.change_manifest)
        verify(result.handoff)
```

### 并行安全检查（CTO 必须在 planning 阶段完成）
- [ ] 确认并行 task 间无文件写冲突
- [ ] 确认并行 task 间无共享状态修改
- [ ] 确认并行 task 可独立验证
- [ ] 定义合并策略（如有输出需要汇总）

### 适用场景
- 独立模块开发
- 多文件文档更新
- 多维度审计
- 独立测试编写

### Gate③ 检查
- 同 Serial，额外检查:
- 并行 task 间无文件冲突（同一文件未被多个 task 修改）
- 合并后的整体构建/测试通过

---

## Mode 3: Swarm（蜂群）

### 行为定义
- 每个 task 作为独立探索单元并行启动
- 各 task 可产出不同方案/分析结果
- 无严格的依赖排序要求
- 最终由 CTO 汇总、对比、选择最优结果
- 适用于探索性、非确定性任务

### 执行伪代码
```
agents = []
for task in task_dag.tasks:
    agent = launch_agent(task, mode="exploration")
    agents.append(agent)
wait_all(agents)

// CTO 汇总阶段
results = collect_all(agents)
summary = cto_evaluate_and_merge(results)
output(summary_manifest)
```

### 蜂群特殊要求
- 每个 agent 独立产出分析报告（作为 change_manifest 的替代）
- CTO 汇总时需要产出一个 `swarm_summary.md`，包含:
  - 各 agent 的关键发现
  - 对比分析
  - 最终选择及理由
  - 被弃用方案的归档位置
- 被弃用方案归入 `In-Process/scratch/`

### 适用场景
- 大规模知识提炼（如 Tool → KI 批量提取）
- 多方案架构探索
- 外部 skill 横向评估
- 多角度安全审计

### Gate③ 检查
- `swarm_summary.md` 存在
- 选择理由明确
- 被弃用方案已归档
- 最终方案的 change_manifest 完整

---

## 模式选择记录格式

CTO 在 `execution_plan.md` 中使用以下格式记录:

```markdown
## Execution Mode

**Selected Mode**: parallel
**Rationale**: 3 个独立模块无文件重叠，可并行开发。文件重叠率 < 5%。
**Task Groups**:
- Group 1 (parallel): T1, T2, T3
- Group 2 (serial, depends on Group 1): T4

**Merge Strategy**: 各 task 修改独立文件，无需合并。Gate③ 后做整体构建验证。
```

---

## 混合模式

允许在同一个 execution_plan 中混合使用模式:
- 部分 task 串行
- 部分 task 并行
- 部分 task 蜂群

CTO 必须在 Task Groups 中明确标注每组的模式。

---

## 参考

- 选择决策矩阵: `Agent/orchestrator/strategy.md`
- Anthropic patterns: Prompt Chaining (serial), Sectioning/Voting (parallel), Evaluator-Optimizer (swarm)
- Google ADK: SequentialAgent / ParallelAgent / LoopAgent
- CrewAI: Sequential / Hierarchical process
- OpenAI Agents SDK: Runner + Handoffs (swarm)
