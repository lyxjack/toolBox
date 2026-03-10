# Execution Plan
<!-- 
  å‘½å: {date}__{project}__plan__{id}__{slug}.md
  ä½ç½®: .in-process/active/{run_id}/
  çŠ¶æ€: active | superseded | closed | archived
-->

- **Plan ID**: PLAN-{id}
- **Run Ref**: REQ-{run_id}
- **Created**: {ISO 8601}
- **Status**: active
- **Last Updated**: {ISO 8601}

---

## Objective
{ä¸€å¥è¯æè¿°æœ¬æ¬¡æ‰§è¡Œçš„ç›®æ ‡}

## Scope
- **In**: {åŒ…å«çš„èŒƒå›´}
- **Out**: {æŽ’é™¤çš„èŒƒå›´}

## Constraints
- {æŠ€æœ¯çº¦æŸ}
- {ä¸šåŠ¡çº¦æŸ}
- {è´¨é‡çº¦æŸ}

---

## File Tracking

### Files Read
<!-- æ¯è¯»ä¸€ä¸ªæ–°æ–‡ä»¶æ—¶è¿½åŠ ã€‚æ ¼å¼: - [x] path (è¡Œå·èŒƒå›´/ç›®çš„) -->
- [ ] {path/to/file} â€” {è¯»å–ç›®çš„}

### Files To Modify (Planned)
<!-- è§„åˆ’é˜¶æ®µå¡«å†™ã€‚å¦‚æ–°å¢žè®¡åˆ’å¤–æ–‡ä»¶éœ€ CTO æ‰¹å‡†å¹¶è®° Status Log -->
- [ ] {path/to/file} â€” {ä¿®æ”¹ç›®çš„}

### Files Actually Modified
<!-- å®žé™…ä¿®æ”¹åŽè¿½åŠ ã€‚QA ä¼šå¯¹ç…§æ­¤åˆ—è¡¨ä¸Ž change_manifest -->
- [ ] {path/to/file} â€” {+N/-M lines} â€” {ä¿®æ”¹å†…å®¹}

---

## Steps

### Phase 1: {é˜¶æ®µå}
- [ ] Step 1.1: {å…·ä½“åŠ¨ä½œ}
- [ ] Step 1.2: {å…·ä½“åŠ¨ä½œ}

### Phase 2: {é˜¶æ®µå}
- [ ] Step 2.1: {å…·ä½“åŠ¨ä½œ}
- [ ] Step 2.2: {å…·ä½“åŠ¨ä½œ}

---

## Findings
<!-- æ‰§è¡Œè¿‡ç¨‹ä¸­çš„é‡è¦å‘çŽ°ã€‚å¦‚éœ€æ•´æ”¹ï¼Œåˆ›å»ºç‹¬ç«‹ audit å·¥ä»¶ -->
| # | Finding | Impact | Action |
|---|---------|--------|--------|
| F1 | {å‘çŽ°} | {å½±å“} | {å¤„ç†æ–¹å¼} |

## Risks
| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|------------|
| R1 | {é£Žé™©} | H/M/L | H/M/L | {ç¼“è§£æŽªæ–½} |

## Blockers
<!-- é˜»å¡žé¡¹ã€‚å‘çŽ°æ—¶ç«‹å³è®°å½• -->
| # | Blocker | Reported | Resolution | Resolved |
|---|---------|----------|------------|----------|
| B1 | {æè¿°} | {æ—¶é—´} | {æ–¹æ¡ˆ} | Yes/No |

---

## Status Log
<!-- å…³é”®èŠ‚ç‚¹çš„æ—¶é—´çº¿ã€‚æœ€æ–°åœ¨æœ€ä¸Š -->
| Timestamp | Event | Notes |
|-----------|-------|-------|
| {time} | Plan created | â€” |

## Next Actions
<!-- å½“å‰åº”è¯¥åšä»€ä¹ˆã€‚æ¯ä¸ª step å®ŒæˆåŽæ›´æ–° -->
1. {ä¸‹ä¸€æ­¥åŠ¨ä½œ}

---

## Cross References
- **Audit**: {å¯¹åº” audit å·¥ä»¶ IDï¼Œæ— åˆ™ N/A}
- **Upstream**: {requirement_package.md}
- **Downstream**: {task_dag.json, change_manifests/}
