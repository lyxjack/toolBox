---
description: 按 Task DAG 执行任务,根据执行模式选择串行/并发/蜂群策略。输出 change_manifest 和 handoff。禁止擅自改需求或扩 scope。
---

# Execution

## 前置约束 — Execution 子门禁
> 进入本工作流时,以下铁律自动生效(全文见 `Agent/rules/iron_laws.md`)。

| 铁律 | 一句话 | 门禁效果 |
|------|--------|---------|
| **IL 03** | REUSE BEFORE BUILD | 未查现有 skill/code 不得新建文件 |

## 触发条件
CTO 完成 Gate② 后交接,`state.json` 的 `currentState` 为 `EXECUTION`。

## 输入
- `requirement_package.md`(只读参考,不得修改)
- `execution_plan.md`(只读参考,不得修改)
- `task_dag.json`(读取 task 列表和依赖)

## 步骤

### Step 1: 加载计划并确定执行策略
1. 读取 `task_dag.json`
2. 读取 `execution_plan.md` 中的 **Execution Mode** 章节
3. 获取执行模式: serial / parallel / swarm / hybrid
4. 对每个 task,记录 `anchorRef`(Category + Anchor 路径)以备按需加载知识切片
5. 参考 `{TOOLBOX}/Agent/orchestrator/execution_modes.md` 确认执行策略

**必须严格按照 CTO 指定的执行模式执行,不得自行降级为串行。**

### Step 2: 按模式执行

#### Mode A: Serial(串行)
逐 task 顺序执行(见 Step 3 通用流程)。

#### Mode B: Parallel(并发)

**必须使用 Agent tool 并行派发独立 task。** 具体步骤:

1. 读取 `execution_plan.md` 中的 Task Groups
2. 对每个 Group:
   - 如果 Group 内的 task 标记为 parallel,**在同一个消息中发起多个 Agent tool 调用**
   - 每个 Agent 的 prompt 必须包含:
     - task 的完整 description 和 verificationCriteria
     - 需要修改的文件列表
     - 对应的 anchorRef(Category + Anchor 路径,如有)
     - 明确指令: 完成后输出 change_manifest 和 handoff 的内容
   - 等待所有 Agent 返回结果
3. 收集各 Agent 的 change_manifest 和 handoff,写入 session 目录
4. 检查并行 task 间无文件冲突
5. Group 间按依赖关系串行执行

**并发执行示例:**
```
// Task Groups: Group 1 (parallel): T1, T2, T3
// 在同一个消息中发起 3 个 Agent tool 调用:
Agent(prompt="Execute T1: ...", description="Execute task T1")
Agent(prompt="Execute T2: ...", description="Execute task T2")
Agent(prompt="Execute T3: ...", description="Execute task T3")
// 等待全部完成后,汇总结果,执行 Group 2
```

#### Mode C: Swarm(蜂群)

1. 为每个 task 启动独立 Agent(同并发模式,使用 Agent tool 并行派发)
2. 每个 Agent 独立探索,产出分析报告
3. 所有 Agent 完成后,汇总结果:
   - 创建 `swarm_summary.md`,包含:
     - 各 Agent 的关键发现
     - 对比分析
     - 最终选择及理由
     - 被弃用方案的归档位置
   - 被弃用方案归入 `.in-process/scratch/`
   - 最终方案产出正式 change_manifest

#### Mode D: Hybrid(混合)

按 Task Groups 的模式标注分别执行。独立 Group 并发,依赖 Group 串行。

### Step 3: 通用 Task 执行流程
对每个 task:

**3a. 加载 Anchor 知识切片(如有)**
- 如果 task 有 `anchorRef`(Category + Anchor 路径),读取对应 Anchor md 文件
- 利用 Anchor frontmatter 中的内部索引(`tier_index` / section line ranges)**定位具体知识切片**,只加载与当前 task 相关的 section,减省 token 消耗
- 按选定切片中的指导执行
- **不全量加载 Anchor,不加载无关 Category 的 Anchor**

**3b. 执行代码变更**
- 严格按 task 的 `description` 执行
- 如遇到需要修改计划外文件的情况 → **停下,报告阻塞**,不得擅自修改
- 如发现需求理解有歧义 → **停下,报告阻塞**,不得自行猜测

**3c. 验证 task**
- 对照 task 的 `verificationCriteria` 做基本验证
- 运行相关测试

**3d. 输出 change_manifest**
创建 `change_manifests/{task_id}_manifest.json`,参考 schema:
`{TOOLBOX}/Agent/schemas/change_manifest.schema.json`

必须填写:
- `filesCreated`, `filesModified`, `filesDeleted`
- `linesAdded`, `linesRemoved`
- `anchorsUsed`(使用的 Anchor 及具体知识切片)
- `testResults`
- `scopeNotes`: 必须明确写 `"No scope changes from plan"` 或说明偏差原因

**3e. 输出 handoff(每个 task 必须)**
创建 `handoffs/{task_id}.json`,参考 schema:
`{TOOLBOX}/Agent/schemas/handoff.schema.json`

必须填写:
- `task_id`, `parent_request_id`, `title`, `objective`
- `scope_in`, `scope_out`, `constraints`
- `expected_outputs`, `acceptance_checks`, `evidence_required`
- `relevant_anchors`(实际使用的 Anchor 及知识切片列表)

**3f. 更新 task_dag.json**
将 task 的 `status` 更新为 `"done"`

### Step 4: 阻塞处理
如果任何 task 被阻塞:
1. 在 change_manifest 的 `blockers` 中记录原因
2. 将 task status 设为 `"blocked"`
3. 更新 state → `CTO_PLANNING`,交回 CTO 处理

### Step 5: 所有 Task 完成后
1. 确认所有 task status = `"done"`
2. 做一次全局构建/测试验证
3. Gate③: 检查所有 change_manifest 都存在且 scopeNotes 无未授权变更
4. Gate③+: 检查所有 handoff 文件都已生成
5. **确认所有工件已写入 `.in-process/active/{session_id}/`**
6. 更新 state → `QA_VERIFICATION`
7. 交接 QA

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
- ❌ 修改计划外的文件(scope creep)
- ❌ 未查现有 skill/code 就新建文件(Iron Law 03)
- ❌ 声称"完成"而不提供 change_manifest
- ❌ 声称"完成"而不生成 handoff
- ❌ 吞掉阻塞不上报
- ❌ CTO 指定了并发/蜂群模式却自行降级为串行执行
- ❌ 工件仅在对话中输出而不写入 `.in-process/`
