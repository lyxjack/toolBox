---
description: CTO + PM 联合验收。双方独立出具意见,任一否决则返工。
---

# Joint Approval

## 触发条件
QA 5 层全 PASS,`state.json` 的 `currentState` 为 `JOINT_APPROVAL`。

## 输入
- `requirement_package.md`
- `execution_plan.md`
- `qa_report.md`(PASS 状态)
- 所有 `change_manifests/*.json`
- 所有 `rework_orders/*.json`(如有)

## 步骤

### Step 1: 生成 Delivery Certificate 草稿
按 `{TOOLBOX}/Agent/templates/delivery_cert.tmpl.md` 模板:

**1a. Requirement <-> Implementation Matrix**
从 qa_report Layer 2 中提取逐条 AC 对照结果。

**1b. Error <-> Fix Matrix**
从所有 rework_order 汇总:
- 每次驳回的 reason_code + 描述
- 修复措施
- 最终验证状态
如无返工,填 N/A。

**1c. Test Results Summary**
从 change_manifests 聚合 testResults。

**1d. Minimal Change Certification**
引用 execution_plan 中的 Minimal Change Rationale。

### Step 2: CTO 审批
CTO 视角审查:
- [ ] 技术方案是否按计划执行
- [ ] 是否有隐藏的技术债务
- [ ] 变更范围是否最小化
- [ ] 架构决策是否合理

**CTO Verdict**: APPROVE / REJECT
**CTO Notes**: {审查意见}

### Step 3: PM 审批
PM 视角审查:
- [ ] 用户需求是否被正确满足
- [ ] AC 对照表是否全部 PASS
- [ ] 交付是否符合用户预期
- [ ] 是否有被遗忘的需求项

**PM Verdict**: APPROVE / REJECT
**PM Notes**: {审查意见}

### Step 4: 最终判定

**双方 APPROVE:**
1. 完成 `delivery_cert.md`,**写入 `.in-process/active/{session_id}/`**
2. 更新 state -> `DELIVERED`
3. 向用户交付成果,附带:
   - 需求与实现对照表
   - 错误与修改对照表(如有)
   - 测试结果
   - 最小化修改认证

**任一 REJECT:**
1. 在 delivery_cert 中记录否决意见
2. 创建 rework_order(由否决方指定 reason_code 和 target)
3. 更新 state -> `REWORK`
4. 路由到目标角色

### Step 5: Session 归档
交付完成后:
- `.in-process/scratch/` 中有价值的文件 promote 到 session 目录或 audit/
- 清理 `.in-process/scratch/`
- 将 `.in-process/active/{session_id}/` 移至 `.in-process/archive/{session_id}/`
- 更新 `.in-process/index/archive_manifest.json`
- session 目录保留作为审计记录
