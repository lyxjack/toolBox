---
description: 五层验证。有真实否决权。驳回必须带原因码和返工流向。
---

# QA Verification

## 前置约束 — QA 子门禁
> 进入本工作流时，以下铁律自动生效（全文见 `Agent/rules/iron_laws.md`）。

| 铁律 | 一句话 | 门禁效果 |
|------|--------|---------|
| **IL 05** | QA IS A GATE | 无 qa_report 不得声称完成 |
| **IL 06** | NO CI-ONLY APPROVAL | 不得仅凭编译通过放行 |
| **IL 07** | REJECTION REQUIRES REASON CODE | 驳回必须带原因码和 rework_order |

## 触发条件
Execution 完成 Gate③ 后交接，`state.json` 的 `currentState` 为 `QA_VERIFICATION`。

## 输入
- `requirement_package.md`
- `execution_plan.md`
- `task_dag.json`
- `change_manifests/*.json`
- `handoffs/*.json`
- 实际代码变更（git diff 或文件对比）

## 步骤

### Step 1: 收集证据
1. 读取 session 目录中的所有工件
2. 确认必需文件全部存在
3. **确认每个 task 都有对应的 handoff 文件**
4. 如有缺失 → 直接 REJECT with `EVD-001`

### Step 2: Layer 1 — Build Correctness
执行构建和测试:
```
- 运行项目构建命令
- 运行类型检查（如适用）
- 运行 linter（确认无新增 error）
- 运行完整测试套件
```
记录每项的命令、exit code、输出。
**任何失败** → REJECT with `BUILD-00x`

### Step 3: Layer 2 — Requirement Alignment
逐条对照 `requirement_package.md` 的 Acceptance Criteria:
```
对每个 AC-N:
  1. 理解 AC 的预期行为
  2. 在实际代码/功能中验证
  3. 标记 PASS / FAIL
  4. 记录验证证据
```
检查 Out of Scope 中的项是否确实未被实现。
**任何 AC FAIL** → REJECT with `REQ-002`
**实现了 Out of Scope 的内容** → REJECT with `REQ-001`

### Step 4: Layer 3 — Behavioral Correctness
基于 `execution_plan.md` 中的 Verification Plan:
```
- 核心路径: 主要功能是否正常工作
- 边界条件: 空值、极值、异常输入
- 错误处理: 异常路径是否有合理处理
- 集成: 与现有功能是否冲突
```
**行为不正确** → REJECT with `BHV-00x`

### Step 5: Layer 4 — Change Isolation
```
1. 聚合所有 change_manifest 中的文件列表
2. 对比实际文件变更（git diff 或手动确认）
3. 确认无计划外文件被修改
4. 确认 Tool/ 中原始 skill 源文件未被动过
5. 确认无全局状态被意外修改
```
**隔离违规** → REJECT with `ISO-00x`

### Step 6: Layer 5 — Evidence Completeness
检查所有必需工件:
| 工件 | 必须存在 |
|------|---------|
| requirement_package.md | ✅ |
| execution_plan.md | ✅ |
| task_dag.json | ✅ |
| 每个 task 的 change_manifest | ✅ |
| 每个 task 的 handoff | ✅ |
| 测试结果记录 | ✅ |
| Minimal Change Rationale | ✅ |

**缺失** → REJECT with `EVD-00x`

### Step 7: 产出 QA Report
按 `Agent/templates/qa_report.tmpl.md` 模板填写。

### Step 8: 判定 Verdict

**如果 5 层全 PASS:**
1. Verdict = PASS
2. 评估是否有 Failure Memory Candidate（本次过程中发现的可沉淀模式）
3. 如果有 → 追加到 `KI/Error_Book/index.json` 的 entries 数组，格式:
   ```json
   {
     "id": "ERR-{NNN}",
     "errorCode": "{错误码}",
     "pattern": "{错误模式描述}",
     "prevention": "{预防措施}",
     "firstSeen": "{日期}",
     "recurrence": 1,
     "relatedTasks": ["{task_id}"],
     "status": "resolved"
   }
   ```
4. 评估是否有可沉淀的 Internal_KI（可复用的决策/经验/模式）
5. 如果有 → 追加到 `KI/Internal_KI/index.json`
6. 更新 state → `JOINT_APPROVAL`
7. 交接 Joint Approval

**如果任何层 FAIL:**
1. Verdict = REJECT
2. 确定 reason_code
3. 确定 rework_target（参照错误码路由表）
4. 创建 `rework_orders/rework_{iteration}.json`，参考 schema:
   `Agent/schemas/rework_order.schema.json`
5. 判断是否为 Failure Memory Candidate:
   - 同类错误重复出现？→ Yes
   - 根因可预防？→ Yes
   - 如果 Yes，追加到 `KI/Error_Book/index.json`
   - 同时在 `KI/Error_Book/entries/` 中创建详细 md（使用 `KI/Templates/error_book_entry.tmpl.md`）
6. 更新 state → `REWORK`
7. state.json 的 `reworkCount` += 1
8. 如果 `reworkCount >= 3` → 在 qa_report 中增加 **Root Cause Analysis** 章节
9. 按 rework_target 路由到对应 workflow

## 禁止行为
- ❌ 仅凭 "编译通过" 或 "测试全绿" 就判 PASS（Iron Law 06）
- ❌ 自行修改代码来"修复"问题
- ❌ 修改需求或计划
- ❌ 放行无 change_manifest 或无 handoff 的交付
- ❌ 驳回时不带 reason_code（Iron Law 07）
