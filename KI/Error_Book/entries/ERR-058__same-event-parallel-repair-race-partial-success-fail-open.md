---
id: ERR-058
type: error
errorCode: ERR-058
severity: high
status: resolved
recurrence: 0
firstSeen: "2026-07-24"
tags:
  - ki/error-book
  - error
  - severity/high
  - domain/concurrency
  - language/javascript
prevention:
  - "强制门的前置条件必须在门读取之前的时间点建立完成：同一事件内的『当场修复』对并行读者不可见，等于没修"
  - "放行判据 = verified by pure read（纯读即为真），不是 asserted（断言过了）：修出来的不算、部分成功不算——失败/缺失的那个根可能恰是读者实际用的"
  - "async 启用 + 同步读取 = 竞态：门控开关的建立动作必须同步且毫秒级，禁用带慢探测的 async 启用路径"
  - "并行 hook 架构中 helper 的职责是 block/告警，不是『修好即放行』"
ci_rules: []
mem_ref: 019f9771-430b-7532-9be5-557197ad8c0e
mem_status: linked
related:
  - "Error_Book/entries/ERR-057__env-dependent-state-root-write-a-read-b-fail-open.md"
  - "Error_Book/entries/ERR-050__recovery-path-swallowed-by-drop-path.md"
aliases:
  - "ERR-058"
  - "repair-too-late"
---

# 同事件并行修复竞态：当场修好、部分成功都不足以放行

## 错误现象

review gate 加固过程中连吃三轮 fail-open：① async SessionStart 启用与首次 Stop 竞态（开关还没写完，门已读过）；② Stop 事件里辅助 hook 发现开关 false → 修好 → 放行，但插件强制门**并行**运行早已读到旧 false 而跳过复审；③ 多根断言"至少一根成功"即放行，而失败的根可能恰是门实际读的那个。

## 根因

同一事件的多个 hook 并行执行、无顺序保证。"当场修复"对并行读者不可见；"部分成功"对读者用哪个根无知。任何**晚于或并行于**读取的建立动作都等于没建立。

## 修复

Stop 端严格三态：所有根**纯读**即为真 → 静默放行；任何根是当场修出来的 → block（理由给收敛路径）；任何根失败 → block + 修复步骤。开关建立动作改为同步毫秒级直写（弃用带 CLI/auth 探测的 async setup）。多根问题本身见 [[ERR-057__env-dependent-state-root-write-a-read-b-fail-open|ERR-057]]。

## 预防规则

见 frontmatter。ci_rules 评估：时序架构缺陷，无 lint 面，留空。

## 关联

- [[ERR-057__env-dependent-state-root-write-a-read-b-fail-open|ERR-057]] — 多根分歧是本竞态的放大器
- [[ERR-050__recovery-path-swallowed-by-drop-path|ERR-050]] — 同族教训：防护链的次序即语义
