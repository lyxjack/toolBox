# Agent Orchestration Strategy Guide

## 执行模式选择

CTO 在 planning 阶段必须显式选择执行模式并记录理由。

### 1. 串行(Serial)

**适用场景:**
- 强依赖上下游输出
- 高耦合任务
- 核心流程改造(schema / flow / contract / 主线逻辑)
- 一个阶段结果直接决定下一个阶段输入

**框架参考:**
- Anthropic Prompt Chaining
- CrewAI Sequential Process
- Google ADK SequentialAgent
- LangGraph 线性图

**选择信号:**
- 任务间有数据依赖
- 文件重叠率 > 50%
- 存在写后读(Write-After-Read)关系
- 涉及状态机变更

---

### 2. 并发(Parallel)

**适用场景:**
- 边界清晰、相互独立
- 文件重叠少
- 可独立测试
- 汇总成本可控

**框架参考:**
- Anthropic Parallelization(Sectioning / Voting)
- Google ADK ParallelAgent
- LangGraph Fan-out/Fan-in
- CrewAI 并行任务分配

**选择信号:**
- 任务间无数据依赖
- 文件重叠率 < 20%
- 各任务可独立验证
- 汇总只需合并,不需复杂冲突解决

---

### 3. 蜂群(Swarm)

**适用场景:**
- 探索性任务
- 多方案对比
- 大量外部 skills 归纳整合
- 多角度审计
- 大规模知识提炼与对照

**框架参考:**
- OpenAI Swarm / Agents SDK Handoffs
- AutoGen Swarm Mode
- Anthropic Evaluator-Optimizer(探索式循环)

**选择信号:**
- 任务边界模糊,需要探索
- 多个 agent 各自独立调研,最终人工或 CTO 汇总
- 最优方案需要对比多个候选

---

## 模式选择决策矩阵

| 条件 | 串行 | 并发 | 蜂群 |
|------|------|------|------|
| 任务间有数据依赖 | ✅ | ❌ | ❌ |
| 文件重叠率 > 50% | ✅ | ❌ | ❌ |
| 任务独立且可并行测试 | ❌ | ✅ | ⚠️ |
| 需要多方案探索对比 | ❌ | ❌ | ✅ |
| 大规模知识提炼 | ❌ | ⚠️ | ✅ |
| 核心架构变更 | ✅ | ❌ | ❌ |
| 文档/审计/索引任务 | ❌ | ✅ | ⚠️ |

## CTO 记录要求

在 execution_plan.md 中必须包含:
1. 选择的执行模式
2. 选择理由(引用上述信号)
3. 任务分组(哪些串行、哪些并发、哪些蜂群)
4. 汇总策略(并发/蜂群结果如何合并)
