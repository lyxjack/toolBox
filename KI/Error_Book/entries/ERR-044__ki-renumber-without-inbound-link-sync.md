---
id: ERR-044
type: error
errorCode: "EVD-001"
severity: "medium"
status: "resolved"
recurrence: 0
firstSeen: "2026-07-06"
tags:
  - "error/medium"
  - "process/ki-maintenance"
  - "tool/obsidian"
  - "errorCode/EVD-001"
  - ki/error-book
prevention: "改名/重编号任何 KI 条目前，必须先全库 grep 完整 slug 与短 ID 两种形态的入链并同步更新；完成后跑 npm run lint:ki 验证 0 断链 0 重复 ID"
aliases:
  - "ERR-044"
mem_ref: "94555254-0c5d-4c86-978a-d232401daecf"
mem_status: "linked"
ci_rules: []  # 已评估：断链/重复 ID 检测不适配 error-book-linter 的 changed-file 规则类型，由专用 lint:ki 覆盖（见下方 CI 标注）
---

# KI 条目重编号后未同步入链 → 系统性断链簇

> CI: Tier 1 已覆盖 — `npm run lint:ki`（Agent/lint/ki-integrity-linter.mjs）的 broken-link + duplicate-id + id-mismatch 检查即本条的自动化防线；error 级 exit 1，可挂 CI。

## 错误现象
2026-07-06 全库审计发现 **13 处断链成簇**：PAT-001/002/003 的 5 处、ERR-005/007/008/018 的 5 处 `[[]]` 指向 Error_Book 早期（约 2026-04/05）重编号前的旧 slug（如 `[[ERR-008__mcp-port-conflict-not-persisted]]`，该内容实际已是 ERR-006）；另有 3 处指向从未落库的项目级笔记。断链在 Obsidian 中显示为红链、召回时无法跳转，且**静默存在了约两个月**无人发现。

## 根因分析
1. **重编号只改了文件名，不改入链**：一次 Error_Book 重编号事件（ERR-005~019 区间 slug 变动）后，没有全库 grep 反向引用并同步更新
2. **完整文件名链接对改名脆弱**：`[[ERR-008__long-slug|ERR-008]]` 形态把编号写死在两处（slug + 别名），改号时极易漏改
3. **无自动化检测**：当时没有任何 linter 校验 wiki link 目标存在性，断链只能靠人工/审计发现
4. 部分旧条目（两步保存、清理临时节点）在重编号中被合并进 PAT-001 正文后**原条目消失**，指向它们的链接悬空

## 解决方案
按入链目标状态三分法批量修复（perl 精确字面替换）：
1. **目标仍存在** → 改指现行文件名，`|别名` 同步改为现行编号
2. **内容已内化进其他条目** → 链接转纯文本，注明"规则已内化于本模式步骤"
3. **目标属项目级未入库笔记** → 转 inline code 标注"项目级 KI，未入本 vault"；若删链后条目变孤儿，补一条指向同族条目的有效互链（本次 ERR-025 ↔ ERR-026）

修复后 `npm run lint:ki` 验证：0 断链、0 重复 ID。

## 预防规则
- 改名/重编号任何 KI 条目 = **先** `grep -rn "<旧文件名basename>\|<旧短ID>"` 全库盘点入链（含 frontmatter `complements`/`related` 与正文），**后**动文件
- 有多个候选可改号时，**改零入链的那一个**（最小扰动，本次 ERR-018/019 重复号即按此裁决）
- 收尾必跑 `npm run lint:ki`，error 级问题清零才算完成
- 关键词召回：`重编号`、`改名`、`断链`、`broken link`、`rename`、`slug`

## 关联
- [[ERR-011__error-book-duplicate-id|ERR-011]] — 同域姊妹错误：本条是"改号不同步入链"，ERR-011 是"创建时撞号"；两者的自动防线均为 lint:ki
- [[ERR-029__wiki-link-parser-table-escaped-pipe|ERR-029]] — lint:ki 实现时遵守的解析约束（表格 `\|` 转义 + 剥离 code fence/span）
- [[PAT-020__ki-renumber-minimal-churn-playbook|PAT-020]] — 本条对应的正向操作 playbook
