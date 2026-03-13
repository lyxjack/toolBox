# Plan-Driven Execution Mode
# Version: 1.0 | Iron Law 10 的完整实现

---

## 1. 触发条件

满足**任一**即强制启用:

| 条件 | 阈值 |
|------|------|
| 预计读取文件数 | > 15 |
| 预计修改文件数 | > 5 |
| 涉及模块/目录数 | > 3 |
| 涉及多 skill/workflow 协作 | ≥ 2 个 skill |
| 存在多轮返工风险 | CTO 判定 |
| 任务类型 | 审计 / 迁移 / 联调 / 重构 |

**边界判定**: 如果不确定是否触发,**默认启用**。Plan 开销远小于无计划的失控开销。

## 2. 启用后的强制行为

### 2.1 创建 Plan 工件
在 `.in-process/active/{run_id}/` 下创建正式 plan 文件:
```
命名: {date}__{project}__{type}__{id}__{slug}.md
示例: 20260307__myapp__plan__001__api-refactor.md
```
使用模板: `Agent/templates/plan.tmpl.md`

### 2.2 必须追踪的字段

| 字段 | 何时更新 |
|------|---------|
| **Files Read** | 每读一个新文件时追加 |
| **Files To Modify** | 规划阶段填写,执行时如有偏差必须更新 |
| **Files Actually Modified** | 每次实际修改后追加 |
| **Objective** | 规划阶段填写,不得后续擅自修改 |
| **Scope** | 规划阶段填写 |
| **Constraints** | 规划阶段填写 |
| **Steps** | 规划阶段填写,执行时标记完成状态 |
| **Findings** | 执行过程中追加 |
| **Risks** | 执行过程中追加 |
| **Blockers** | 发现时立即记录 |
| **Status Log** | 每个重要节点追加 |
| **Next Actions** | 每个 step 完成后更新 |

### 2.3 同步更新规则

以下事件发生时,**必须**同步更新 plan:
- 发现需要修改计划外的文件 → 更新 Files To Modify + 记 Status Log
- 发现新风险 → 追加 Risks
- Step 完成 → 标记 `[x]` + 更新 Next Actions
- 遇到阻塞 → 追加 Blockers + 更新 Status Log
- Scope 偏差 → 更新 Scope + 记录原因(需 CTO 批准)

### 2.4 Plan 与其他工件的关系

```
plan.md ──────── 驱动 ─────→ task_dag.json (详细 task 拆解)
    │                              │
    │                              ▼
    │                        handoff.json (每个 task 的交接包)
    │                              │
    │                              ▼
    └── 追踪 ◄──────────── change_manifest.json (执行结果)
```

- plan 是**总控文件**,task_dag 是 plan 的细化
- plan 的 Files Actually Modified 必须与 change_manifests 一致
- QA 在 Layer 4 检查 plan ↔ manifest 一致性

## 3. 退出条件

Plan-Driven Mode 在以下情况退出:
1. 所有 Steps 标记完成
2. QA 验证通过
3. Plan 状态更新为 `closed`

## 4. 违规处置

- 未启用 Plan-Driven Mode 就进行大规模变更 → QA 直接驳回 `ISO-001`
- Plan 与实际执行不一致 → QA 驳回 `EVD-004`
- Files Actually Modified 中出现 Files To Modify 之外的文件 → QA 驳回 `ISO-001`
