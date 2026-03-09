---
description: CTO + PM è”åˆéªŒæ”¶ã€‚åŒæ–¹ç‹¬ç«‹å‡ºå…·æ„è§ï¼Œä»»ä¸€å¦å†³åˆ™è¿”å·¥ã€‚
---

# Joint Approval

## è§¦å‘æ¡ä»¶
QA 5 å±‚å…¨ PASSï¼Œ`state.json` çš„ `currentState` ä¸º `JOINT_APPROVAL`ã€‚

## è¾“å…¥
- `requirement_package.md`
- `execution_plan.md`
- `qa_report.md`ï¼ˆPASS çŠ¶æ€ï¼‰
- æ‰€æœ‰ `change_manifests/*.json`
- æ‰€æœ‰ `rework_orders/*.json`ï¼ˆå¦‚æœ‰ï¼‰

## æ­¥éª¤

### Step 1: ç”Ÿæˆ Delivery Certificate è‰ç¨¿
æŒ‰ `d:\toolBox\AI\_agent_arch\global\templates\delivery_cert.tmpl.md` æ¨¡æ¿:

**1a. Requirement â†” Implementation Matrix**
ä»Ž qa_report Layer 2 ä¸­æå–é€æ¡ AC å¯¹ç…§ç»“æžœã€‚

**1b. Error â†” Fix Matrix**
ä»Žæ‰€æœ‰ rework_order æ±‡æ€»:
- æ¯æ¬¡é©³å›žçš„ reason_code + æè¿°
- ä¿®å¤æŽªæ–½
- æœ€ç»ˆéªŒè¯çŠ¶æ€
å¦‚æ— è¿”å·¥ï¼Œå¡« N/Aã€‚

**1c. Test Results Summary**
ä»Ž change_manifests èšåˆ testResultsã€‚

**1d. Minimal Change Certification**
å¼•ç”¨ execution_plan ä¸­çš„ Minimal Change Rationaleã€‚

### Step 2: CTO å®¡æ‰¹
CTO è§†è§’å®¡æŸ¥:
- [ ] æŠ€æœ¯æ–¹æ¡ˆæ˜¯å¦æŒ‰è®¡åˆ’æ‰§è¡Œ
- [ ] æ˜¯å¦æœ‰éšè—çš„æŠ€æœ¯å€ºåŠ¡
- [ ] å˜æ›´èŒƒå›´æ˜¯å¦æœ€å°åŒ–
- [ ] æž¶æž„å†³ç­–æ˜¯å¦åˆç†

**CTO Verdict**: APPROVE / REJECT
**CTO Notes**: {å®¡æŸ¥æ„è§}

### Step 3: PM å®¡æ‰¹
PM è§†è§’å®¡æŸ¥:
- [ ] ç”¨æˆ·éœ€æ±‚æ˜¯å¦è¢«æ­£ç¡®æ»¡è¶³
- [ ] AC å¯¹ç…§è¡¨æ˜¯å¦å…¨éƒ¨ PASS
- [ ] äº¤ä»˜æ˜¯å¦ç¬¦åˆç”¨æˆ·é¢„æœŸ
- [ ] æ˜¯å¦æœ‰è¢«é—å¿˜çš„éœ€æ±‚é¡¹

**PM Verdict**: APPROVE / REJECT
**PM Notes**: {å®¡æŸ¥æ„è§}

### Step 4: æœ€ç»ˆåˆ¤å®š

**åŒæ–¹ APPROVE:**
1. å®Œæˆ `delivery_cert.md`
2. æ›´æ–° state â†’ `DELIVERED`
3. å‘ç”¨æˆ·äº¤ä»˜æˆæžœï¼Œé™„å¸¦:
   - éœ€æ±‚ä¸Žå®žçŽ°å¯¹ç…§è¡¨
   - é”™è¯¯ä¸Žä¿®æ”¹å¯¹ç…§è¡¨ï¼ˆå¦‚æœ‰ï¼‰
   - æµ‹è¯•ç»“æžœ
   - æœ€å°åŒ–ä¿®æ”¹è®¤è¯

**ä»»ä¸€ REJECT:**
1. åœ¨ delivery_cert ä¸­è®°å½•å¦å†³æ„è§
2. åˆ›å»º rework_orderï¼ˆç”±å¦å†³æ–¹æŒ‡å®š reason_code å’Œ targetï¼‰
3. æ›´æ–° state â†’ `REWORK`
4. è·¯ç”±åˆ°ç›®æ ‡è§’è‰²

### Step 5: Session å½’æ¡£
äº¤ä»˜å®ŒæˆåŽ:
- `_tmp/` ç›®å½•ä¸­æœ‰ä»·å€¼çš„æ–‡ä»¶ç§»åˆ° session æ ¹ç›®å½•
- æ¸…ç† `_tmp/`
- session ç›®å½•ä¿ç•™ä½œä¸ºå®¡è®¡è®°å½•
