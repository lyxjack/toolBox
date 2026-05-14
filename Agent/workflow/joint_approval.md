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

---

## Micro Path（complexity = micro 时启用）

> 由 PM Step 4.5 决定 `complexity = micro` 后激活。本路径绕过独立 `delivery_cert.md` 产出，CTO + PM 双签 inline 进 `state.json.history`，或合并产一个极简 `delivery_cert_micro.md` (≤ 600 字符)。**双否决权 + 双 verdict 机制保留**（不削弱 PM/CTO 任一方的真实否决权）。

### 数据源映射（micro 没 qa_report / execution_plan / change_manifests）

| Joint Approval 字段 | standard 数据源 | micro 数据源 |
|--------------------|----------------|--------------|
| 1a Req↔Impl Matrix | qa_report Layer 2 | `requirement_package_micro.md` 的 **AC 段** + **QA Evidence 段 L2 行** |
| 1b Error↔Fix Matrix | rework_orders/*.json 汇总 | 通常 N/A（micro 无返工；有返工 = 已升级 standard）。若有就读 `rework_orders/*.json` |
| 1c Test Results | change_manifests testResults 聚合 | `requirement_package_micro.md` 的 **QA Evidence 段 L1+L3 行** |
| 1d Minimal Change Cert | execution_plan Minimal Change Rationale | `requirement_package_micro.md` 的 **Plan 段末尾**（"改 N 文件，无可减少"那行） |

### 行为差异

| 阶段 | standard | micro |
|------|----------|-------|
| Step 1 生成草稿 | 按 `Agent/templates/delivery_cert.tmpl.md` 模板产 `delivery_cert.md`（4 子段独立 ~2-3KB） | **二选一**：(a) 极简 `delivery_cert_micro.md` ≤ 600 字符，仅含 Verdict + CTO Notes + PM Notes + 1 句 Req/Impl 摘要；(b) **直接 inline** 到 `state.json.history` 最后一个事件的 `notes` 字段（推荐用 b，更省） |
| Step 2 CTO 审批 | 4 项 checklist + Verdict + Notes | 同 4 项（不能砍），但 Verdict + Notes 写到 state.json.history 而不是 delivery_cert |
| Step 3 PM 审批 | 4 项 checklist + Verdict + Notes | 同上 |
| Step 4 最终判定 | 双 APPROVE → 写 delivery_cert.md → state → DELIVERED | 双 APPROVE → state.json 加 `{from: JOINT_APPROVAL, to: APPROVED, gate: "Joint: PASS (CTO+PM both)", notes: "<内联 verdict 摘要>"}` |
| Step 5 归档 | 同 | 同（micro 工件少，归档更轻）|

### Step 4 micro 最终判定具体形态

**双方 APPROVE**（推荐路径 b，inline state.json.history）：
```json
{
  "from": "JOINT_APPROVAL",
  "to": "APPROVED",
  "timestamp": "...",
  "gate": "Joint: PASS",
  "notes": "CTO ✅ <技术 1 句>; PM ✅ <需求 1 句>; AC 全 PASS; minimal change: <N 文件 M 行>"
}
```

**任一 REJECT**：仍创建 `rework_orders/rework_{N}.json`（IL07 不可缩），state → `REWORK`。reject 触发即说明 micro 假设破裂 → **强制升级 standard 再返工**（不允许在 micro 里挂返工）。

### Gate Joint Micro 检查
- [ ] AC-1~N 在 micro 模板 AC 段全 ✅
- [ ] QA Evidence 5 层无 FAIL（PENDING USER 视情况升级，不能直接 APPROVED）
- [ ] CTO Notes + PM Notes 都写了（即使一句话）
- [ ] 仍在 micro 范围（任一 reject 即升 standard）

### 禁止
- ❌ 跳过 CTO 或 PM 任一方的审批表态（双签机制是 Joint Approval 的核心，三档都不能砍）
- ❌ 在 micro path 偷偷产 `delivery_cert.md` 占位
- ❌ micro reject 后留在 micro 路径继续返工（必须升 standard）
