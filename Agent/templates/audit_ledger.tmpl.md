# Audit Ledger
<!--
  命名: {date}__{project}__audit__{id}__{slug}.md
  位置: .in-process/audit/
  状态: active | pending_remediation | closed | archived
-->

- **Audit ID**: AUDIT-{id}
- **Run Ref**: REQ-{run_id} (如关联 run,否则 N/A)
- **Created**: {ISO 8601}
- **Status**: active
- **Auditor**: {role}
- **Last Updated**: {ISO 8601}

---

## Audit Scope
{本次审计覆盖的范围、文件、模块、时间段}

### Audit Type
<!-- 选一个或多个 -->
- [ ] Code Quality
- [ ] Architecture
- [ ] Skill Deduplication
- [ ] Fix Verification
- [ ] High-Risk Change Review
- [ ] QA Remediation Tracking
- [ ] Security

---

## Findings Summary

| Severity | Count | Remediated | Verified |
|----------|-------|------------|----------|
| CRITICAL | 0 | 0 | 0 |
| HIGH | 0 | 0 | 0 |
| MEDIUM | 0 | 0 | 0 |
| LOW | 0 | 0 | 0 |
| INFO | 0 | 0 | 0 |
| **Total** | **0** | **0** | **0** |

---

## Detailed Findings

### F-001: {Finding 标题}
- **Severity**: CRITICAL / HIGH / MEDIUM / LOW / INFO
- **Category**: {BUILD / REQ / BHV / ISO / EVD / ARCH / SKILL}
- **Description**: {问题描述}
- **Evidence**: {证据:文件路径、行号、截图、命令输出}
- **Impact**: {如果不修复会怎样}
- **Recommendation**: {建议的修复方式}

**Remediation**:
| Status | Owner | Action | Date |
|--------|-------|--------|------|
| OPEN | {角色} | {整改动作} | {日期} |

**Verification**:
- [ ] 已修复
- [ ] 已复测
- Verification Evidence: {复测证据}
- Verified By: {角色}
- Verified Date: {日期}

---

### F-002: {Finding 标题}
<!-- 重复 F-001 格式 -->

---

## Remediation Summary
| Finding | Severity | Status | Owner | Fixed Date | Verified |
|---------|----------|--------|-------|------------|----------|
| F-001 | {级别} | OPEN/FIXED/VERIFIED/WONT_FIX/DEFERRED | {角色} | {日期} | Yes/No |

---

## Audit Conclusion

### Overall Assessment
- **Rating**: PASS / CONDITIONAL / FAIL
- **Critical/High Open**: {N}
- **Recommendation**: {结论性建议}

### Lessons Learned
- {可沉淀到 Error_Book 的模式}

### Follow-up Actions
- [ ] {后续跟踪项}

---

## Cross References
- **Plan**: {对应 plan 工件 ID,无则 N/A}
- **Run**: {对应 run ID}
- **Failure Memory**: {是否已写入 Error_Book,entry ID}
