## QA Report
- **Requirement Ref**: REQ-{id}
- **Timestamp**: {ISO 8601}
- **QA Iteration**: {1, 2, 3...}

### Layer 1: Build Correctness
| Check | Status | Evidence |
|-------|--------|----------|
| Compile/Parse | PASS/FAIL | {命令 + exit code} |
| Type Check | PASS/FAIL/N/A | {命令 + 输出} |
| Lint (no new errors) | PASS/FAIL | {工具 + 结果} |
| Existing Tests Pass | PASS/FAIL | {passed/failed 数} |

### Layer 2: Requirement Alignment
| AC ID | Criterion | Status | Evidence |
|-------|-----------|--------|----------|
| AC-1 | {从 requirement_package 抄} | PASS/FAIL | {验证方式和结果} |
| AC-2 | ... | ... | ... |

**Scope Check**: {确认未实现 Out of Scope 中的项}

### Layer 3: Behavioral Correctness
| Check | Status | Evidence |
|-------|--------|----------|
| Core Path | PASS/FAIL | {描述} |
| Edge Cases | PASS/FAIL | {描述} |
| Error Handling | PASS/FAIL | {描述} |
| Integration | PASS/FAIL/N/A | {描述} |

### Layer 4: Change Isolation
| Check | Status | Evidence |
|-------|--------|----------|
| Files match change_manifest | PASS/FAIL | {diff 校验} |
| No unauthorized file changes | PASS/FAIL | {列出} |
| No global state corruption | PASS/FAIL | {描述} |
| Source skills untouched | PASS/FAIL | 原始 skill 文件未被修改 |

### Layer 5: Evidence Completeness
| Artifact | Present | Valid |
|----------|---------|-------|
| requirement_package.md | Yes/No | Yes/No |
| execution_plan.md | Yes/No | Yes/No |
| task_dag.json | Yes/No | Yes/No |
| change_manifest(s) | Yes/No | Yes/No |
| Test evidence | Yes/No | Yes/No |
| Minimal change rationale | Yes/No | Yes/No |

---

### Verdict
- **Status**: PASS | REJECT
- **Reason Code**: {仅 REJECT 时填写,如 BHV-001}
- **Rework Target**: {PM / CTO / EXECUTION}
- **Details**: {驳回原因详述}

### Failure Memory Candidate
- **Eligible**: Yes / No
- **Pattern**: {如果 Yes,描述可沉淀的错误模式}
- **Prevention**: {未来如何预防}
