# Project Rules â€” toolBox
# Version: 1.0

---

## é¡¹ç›®ä¿¡æ¯
- **é¡¹ç›®å**: toolBox
- **åˆ›å»ºæ—¥æœŸ**: 2026-03-07
- **é¡¹ç›®å®šä½**: ä¼ä¸šçº§ AI Agent Skills ä¸­å¿ƒâ€”â€”æ”¶é›†ã€ç´¢å¼•ã€æ²»ç†ã€è°ƒåº¦å¼€æº skills
- **æŠ€æœ¯æ ˆ**: PowerShell (è„šæœ¬), JSON (æ•°æ®), Markdown (æ–‡æ¡£/è§„åˆ™), Claude Code (runtime)

## é¡¹ç›®ç‰¹æ®Šçº¦æŸ

### C1 â€” æºæ–‡ä»¶åªè¯»
toolBox ä¸‹çš„ 16 ä¸ª skill ä»“åº“å‡ä¸º `git clone` çš„å¼€æºé¡¹ç›®ã€‚
æ‰€æœ‰åŽŸå§‹ SKILL.md åŠå…¶ companion æ–‡ä»¶**åªå¯è¯»å–**ï¼Œæ²»ç†å±‚é€šè¿‡ registry å’Œ review åšæ˜ å°„æŽ¨èã€‚

**åªè¯»ä»“åº“æ¸…å•**:
- everything-claude-code/
- superpowers/
- ui-ux-pro-max-skill/
- subagent-driven-development/
- systematic-debugging/
- test-driven-development/
- skill-creator/
- find-skills/
- content-strategy/
- social-content/
- frontend-design/
- canvas-design/
- composition-patterns/
- react-native-skills/

### C2 â€” ç´¢å¼•ç³»ç»Ÿå·²å»ºæˆ
`KI/External_KI/` å·²åŒ…å«å®Œæ•´çš„ä¸¤çº§ç´¢å¼•ç³»ç»Ÿï¼Œä¸éœ€è¦é‡å»ºã€‚
å˜æ›´ç´¢å¼•æ—¶å¿…é¡»åŒæ­¥æ›´æ–° master_index.json å’Œå¯¹åº” category JSONã€‚

### C3 â€” ç½®ä¿¡åº¦æ•°æ®å·²å®¡è®¡
`KI/External_KI/_quality_audit_results.json` å’Œ `KI/External_KI/_quality_audit_corrected.json` åŒ…å«åŸºäºŽ 20 ä¸ªå®¢è§‚ä¿¡å·çš„ç½®ä¿¡åº¦è¯„åˆ†ã€‚
åŽç»­ skill è¯„ä¼°å¿…é¡»å¼•ç”¨è¿™äº›æ•°æ®ï¼Œä¸å¯å†é ä¸»è§‚ä¼°å€¼ã€‚

### C4 â€” é¡¹ç›®æ— ä¸šåŠ¡ä»£ç 
toolBox ä¸åŒ…å«åº”ç”¨ä»£ç ã€‚å®ƒæ˜¯ä¸€ä¸ª skill èµ„äº§ç®¡ç†é¡¹ç›®ã€‚
å› æ­¤ QA çš„ Layer 1ï¼ˆBuild Correctnessï¼‰ä¸»è¦æ£€æŸ¥ JSON åˆæ³•æ€§å’Œæ–‡æ¡£æ ¼å¼ã€‚

## å¯ç”¨çš„åŠŸèƒ½ç±»åˆ«
åŸºäºŽ `KI/External_KI/master_index.json` çš„ 12 ä¸ªç±»åˆ«å…¨éƒ¨ä¸Žæœ¬é¡¹ç›®ç›¸å…³:
frontend, backend, testing, security, devops, ai_agent, content, language_specific, mobile_native, workflow, meta_tooling, business

## é¡¹ç›®çº§ Iron Law æ‰©å±•

### C-IL-01 â€” ç´¢å¼•ä¸€è‡´æ€§
ä¿®æ”¹ä»»ä½• skill ç´¢å¼•æ•°æ®æ—¶ï¼Œmaster_index.json å’Œå¯¹åº” category JSON å¿…é¡»åŒæ­¥æ›´æ–°ã€‚

### C-IL-02 â€” å®¡è®¡æ•°æ®å¼•ç”¨
Skill Governance çš„ä»»ä½•æŽ¨è/è¯„çº§å¿…é¡»å¼•ç”¨ `KI/External_KI/_quality_audit_corrected.json` ä¸­çš„å®¢è§‚æ•°æ®ã€‚

### C-IL-03 â€” ä»“åº“ä¸æ±¡æŸ“
ä¸å¾—åœ¨åªè¯»ä»“åº“ç›®å½•ä¸‹åˆ›å»ºä»»ä½•æ–°æ–‡ä»¶ã€‚æ²»ç†æ–‡ä»¶åªæ”¾åœ¨ `Agent/rules/` å’Œ `Agent/` ä¸‹ã€‚
