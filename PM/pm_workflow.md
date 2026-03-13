---
description: 唯一入口。用户提交需求后,PM 分析需求、召回上下文、输出标准需求包。
---

# /pm — 需求受理与分析

## 前置约束 — PM 子门禁
> 进入本工作流时,以下铁律自动生效(全文见 `Agent/rules/iron_laws.md`)。

| 铁律 | 一句话 | 门禁效果 |
|------|--------|---------|
| **IL 01** | NO REQUIREMENT, NO EXECUTION | 无标准需求包不得进入实现阶段 |

## 触发条件
用户输入 `/pm` 或任何需要进入正式开发流程的请求。

## 步骤

### Step 1: 创建 Session
1. 生成 session ID: `{YYYYMMDD-HHMMSS}`
2. 创建 session 目录: `.in-process/active/{session_id}/`
3. 创建 `state.json`:
```json
{
  "sessionId": "{session_id}",
  "requirementRef": "REQ-{session_id}",
  "currentState": "INTAKE",
  "reworkCount": 0,
  "history": [
    { "from": "NONE", "to": "INTAKE", "timestamp": "{now}", "gate": "N/A", "notes": "Session created via /pm" }
  ]
}
```

### Step 2: 记录用户原始请求
将用户的完整原始请求记录到 session 目录中,不做任何修改。

### Step 3: 状态转移 → PM_ANALYSIS
更新 `state.json`: `currentState` → `"PM_ANALYSIS"`

### Step 4: 召回上下文
按优先级依次查询:
1. **Error Book**: 读取 `{TOOLBOX}/KI/Error_Book/index.json`,检索与当前需求相关的历史错误模式
2. **KI Summaries**: 检查对话中提供的 Knowledge Item 摘要,识别相关 KI
3. **Skills Index**: 读取 `{TOOLBOX}/KI/External_KI/master_index.json`,在 `quickLookup` 中识别可能相关的 skill 类别(**不深入读 skill 内容,只做初步标记**)
4. **Project Rules**: 如果存在 `Agent/rules/project_rules.md`,读取项目规则

### Step 5: 分析与厘清
- 理解用户真正的意图(而非字面请求)
- 如果需求不清晰,**停下来向用户提问**,不要猜测
- 识别隐含的约束条件
- 确定明确的 scope 边界和 out of scope

### Step 6: 输出 requirement_package.md
按 `{TOOLBOX}/PM/templates/requirement_package.tmpl.md` 模板填写,**保存到 session 目录**(`.in-process/active/{session_id}/requirement_package.md`)。

必须确保以下字段非空:
- [ ] Clarified Intent
- [ ] Scope (至少 1 条)
- [ ] Out of Scope (至少 1 条)
- [ ] Constraints (至少 1 条)
- [ ] Acceptance Criteria (至少 1 条,每条可验证)

> **Iron Law: 所有工件必须写入 `.in-process/active/{session_id}/`,禁止仅在对话中输出而不落盘。**

### Step 7: Gate① 检查
自检 requirement_package.md 完整性:
- Scope 是否明确?
- AC 是否可验证(不是模糊的"应该好用")?
- Out of Scope 是否覆盖了容易 creep 的项?
- **requirement_package.md 是否已写入 `.in-process/active/{session_id}/`?**

**通过** → 转交 CTO Planning(更新 state → `CTO_PLANNING`)
**不通过** → 回到 Step 5 补充或向用户提问

### Step 8: 交接 CTO
- 告知用户: "需求包已完成,现在进入技术规划。"
- 切换到 CTO Planning workflow (`Agent/workflow/cto_planning.md`)

## 返工入口
当 QA 以 `REQ-*` 原因码驳回时,流程返回 PM:
1. 读取 `rework_order.json` 理解问题
2. 更新 `requirement_package.md`(如需修改 AC/Scope)
3. 如需用户厘清,向用户提问
4. 修改完成后重新通过 Gate①
5. 再次交接 CTO

## 禁止行为
- ❌ 做技术选型
- ❌ 直接修改代码
- ❌ 跳过 CTO 给 Execution 下指令
- ❌ 在 QA 阶段修改需求(需走本 workflow 的返工入口)
- ❌ 工件仅在对话中输出而不写入 `.in-process/`
