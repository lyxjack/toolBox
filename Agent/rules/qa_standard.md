# QA Standard — 五层验证规范
# Version: 1.0

---

## 1. 验证层级

QA 验证必须按 L1 → L5 顺序执行。前一层 FAIL 时可提前终止(不必跑完全部层)。

### L1 — Build Correctness (构建正确性)
**问题**: 代码能否正常构建和运行?
**检查项**:
- 编译/解释无错误
- 类型检查通过(TypeScript/Python type hints/Go)
- Linter 无新增 error(warning 可接受)
- 现有测试套件全部通过
- 无运行时异常(基本冒烟测试)

**失败码**: BUILD-001 ~ BUILD-004

### L2 — Requirement Alignment (需求对齐)
**问题**: 实现是否对齐用户需求?
**检查项**:
- 逐条对照 requirement_package.md 中的 Acceptance Criteria
- 每条 AC 标记 PASS / FAIL / N/A,附证据
- Out of Scope 中的项确认未被实现
- Scope 中的项确认全部被覆盖
- 无 scope creep(对照 change_manifest.scopeNotes)

**失败码**: REQ-001 ~ REQ-004

### L3 — Behavioral Correctness (行为正确性)
**问题**: 功能行为是否正确?
**检查项**:
- 核心功能路径验证(happy path)
- 边界条件测试(空值、极值、超长输入)
- 错误处理路径验证(异常输入的优雅降级)
- 与现有功能的交互验证(不破坏已有功能)

**失败码**: BHV-001 ~ BHV-004

### L4 — Change Isolation (变更隔离)
**问题**: 修改是否控制在允许范围内?
**检查项**:
- change_manifest.filesModified 中每个文件的变更是必要的
- 未修改 task_dag 之外的文件
- 原始 skill 源文件未被修改(Iron Law 04)
- 无意外的全局状态/配置变更
- Git diff 与 change_manifest 一致

**失败码**: ISO-001 ~ ISO-003

### L5 — Evidence Completeness (证据完整性)
**问题**: 审计链是否完整?
**必需工件**:
- requirement_package.md
- execution_plan.md(含 Reuse Audit + Minimal Change Rationale)
- task_dag.json
- 每个 task 的 change_manifest
- 测试结果记录
- QA report 本身

**失败码**: EVD-001 ~ EVD-004

## 2. 判定规则

- **PASS**: 所有 5 层全部通过
- **REJECT**: 任何层失败。必须带 reason_code + rework_target
- **CONDITIONAL PASS**: 不允许。没有"附条件通过"

## 3. QA 不可做的事

- 不可仅凭 CI 通过放行(Iron Law 06)
- 不可自行修改代码修复问题
- 不可修改需求或计划
- 不可省略任何层的检查
- 驳回时不可不带 reason_code(Iron Law 07)

## 4. 返工后的复验

返工后 QA 需要:
1. 验证 rework_order 中指定的问题已修复
2. 重新执行受影响层的验证(不必全部 5 层重跑,除非变更范围不确定)
3. 确认修复未引入新问题(回归检查)
