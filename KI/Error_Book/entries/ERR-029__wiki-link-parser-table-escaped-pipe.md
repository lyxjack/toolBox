---
id: ERR-029
type: error
errorCode: "BHV-001"
severity: "medium"
status: "resolved"
recurrence: 1
firstSeen: "2026-06-10"
tags:
  - error/medium
  - tool/obsidian
  - tool/nodejs
  - errorCode/BHV-001
  - ki/error-book
prevention: "解析 wiki link 双中括号语法必须兼容两种形态：表格内转义管道符别名写法（target 尾部多出的反斜杠要 strip）+ 代码块/行内代码中的示例链接（解析前先 strip code fence/span）；新增 wiki link 解析逻辑必须带表格内别名链接测试用例"
aliases:
  - "ERR-029"
ci_rules: []
# ci_rules 评估: 无可静态拦截规则 — 表格内转义管道符别名链接是 Obsidian 合法语法（不能 ban）；
# 解析器侧的正确性由 test_distill_output_audit.mjs 自身对 PAT-010 的回归断言充当 canary（已含真实触发样本）。
mem_ref: "ki-bridge-toolBox"
mem_status: "linked"
---

# 自写 wiki link 解析器漏掉 Obsidian 表格转义管道符，孤儿链接误报

## 错误现象

`test_distill_output_audit.mjs` Audit-5 报 PAT-010 存在"孤儿链接 `ERR-002__python-modify-cocos-prefab\`"（注意尾部反斜杠），但 ERR-002 实际存在于 vault。CI 因误报变红，阻塞 AC 全绿。

## 根因分析

Markdown 表格单元格内的管道符必须转义，所以 Obsidian 别名链接在表格里的合法写法是 `[[target\|alias]]`。
解析正则 `/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/` 的 target 捕获组 `[^\]|]+` 在**字面 `|`** 处停止，把转义符 `\` 留在了 target 末尾 → `findInVault("...prefab\\")` 查无此文件 → 误判孤儿。

## 解决方案

提取后 strip 目标尾部转义符（一行修复）：

```js
return [...matches].map(m => m[1].replace(/\\$/, ''));
```

## 预防规则

- Agent 写**任何** wiki link 解析逻辑（正则/parser）时，回忆本条：测试样本必须包含表格内 `[[target\|alias]]` 写法。
- 同根因变体（本条创建时自触发）：代码块/行内代码中的 `[[...]]` 是文档示例不是真实链接（Obsidian 不解析），解析前必须 strip code fence + code span，否则示例性链接造成孤儿误报、且会虚假满足 cross-ref gate。
- 关键词召回: `wiki link`、`孤儿链接`、`orphan`、`表格`、`转义`、`\|`。
- 误报修复优先改解析器而非改正文 — `\|` 是合法 Obsidian 语法，改正文属于治标。

## 关联

- [[PAT-010__cocos-2x-to-3x-inplace-migration-playbook|PAT-010]] — 触发样本（表格行内别名链接）
- [[PAT-011__dual-layer-memory-recall|PAT-011]] — 同会话沉淀的双层记忆体系模式（本条由该 REQ 的 QA 阶段发现）
- [[ERR-011__error-book-duplicate-id|ERR-011]] — 同属"写入前未校验既有状态"的 Agent 行为类错误
