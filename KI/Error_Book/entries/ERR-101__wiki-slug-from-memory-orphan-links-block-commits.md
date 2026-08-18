---
id: ERR-101
type: error
errorCode: KI-REF-001
severity: medium
status: resolved
recurrence: 0
firstSeen: "2026-08-04"
tags:
  - ki/error-book
  - error
  - severity/medium
  - domain/ki-governance
  - tool/git-hooks
prevention:
  - "**wiki link 的 slug 一律『查证后粘贴』, 禁止默写**: distill Phase 6 本就要求写前
    `obsidian_search_notes` 验证目标存在 —— 跳过这步写出的三条链接三条全孤儿。
    正确姿势是 ls/搜索拿到真实文件名后原样粘贴, 连同 `related:` 数组一起"
  - "**编号在人的记忆与 vault 之间会错位, 以 vault 为准**: 记忆里『ERR-034 = PNG导入类型』,
    vault 真身 ERR-034 是 mcp 白名单, PNG 那条实为 ERR-079。凭记忆写编号+意译 slug,
    等于给两条真实条目之间虚构了第三条"
  - "**孤儿链接的代价是全局的**: Audit-5 挂在 pre-commit 上, 一条孤儿锁死**所有仓库**的一切提交,
    且常由下一个无辜会话代付排查成本。写入侧一分钟的查证, 省掉提交侧跨会话的连坐"
ci_rules: []
mem_ref: b459b6b2-5df9-472a-92db-172861710d49
mem_status: linked
related:
  - Error_Book/entries/ERR-029__wiki-link-parser-table-escaped-pipe.md
  - Error_Book/entries/ERR-080__error-book-recall-keyword-mismatch.md
aliases:
  - ERR-101
  - 凭记忆写slug孤儿链接锁闸
  - orphan-wiki-slug-from-memory
---

# 凭记忆默写跨条目 slug —— 三条孤儿链接锁死全局提交闸门

## 错误现象

对三个仓库执行批次 git 收口, 首个 commit 被全局 pre-commit(Distill Output Audit / Audit-5)拦下:
错题本新条目 ERR-087/088/089 里三条 wiki link 目标不存在 ——
`ERR-052__synthetic-stub-passes-real-stack-fails`、`ERR-075__played-ranks-dual-path-consistency`、
`ERR-034__png-imported-as-texture-not-spriteframe` 全是**不存在的文件名**。
拦截发生在与写入无关的仓库、由与写入无关的会话承担修复。

## 根因分析

前次 distill 写条目时凭记忆默写了引用目标: 编号取自脑中印象, slug 按语义**意译**而非查证。
三条的真身分别是 `ERR-117__synthetic-double-models-imagined-not-actual-semantics`、
`ERR-075__incremental-path-fixed-snapshot-path-forgotten`、`ERR-079__png-import-texture-type-spriteframe-missing`
—— 语义方向全对, 字面全错; 其中 PNG 一条连编号都错位(记忆挂在 034, 真身在 079)。
与 [[ERR-080__error-book-recall-keyword-mismatch|ERR-080]] 同根: 人脑索引与 vault 实体的失配,
那条失配在检索侧(召回不到), 本条失配在写入侧(引用到虚空)。

## 解决方案

按语义找回真身(grep 意译关键词 → 命中真实文件)后 sed 三处 frontmatter `related` + 正文链接;
重跑 Audit-5 766 项全绿, 三仓提交放行。注意 frontmatter 与正文两处都要改,
且 `[[slug|显示名]]` 的显示编号也要跟着真身改。

## 预防规则

- 写任何 `[[...]]` 前: 先 `ls`/`obsidian_search_notes` 拿真实文件名, 复制粘贴, 不手打;
- 引用『我记得有一条讲 X 的』时, 用 X 的**内容关键词**搜真身, 别信记忆里的编号;
- 孤儿误报的另一形态(解析器缺陷)见 [[ERR-029__wiki-link-parser-table-escaped-pipe|ERR-029]] ——
  先分清是链接真孤儿还是解析器误判, 再动手改。