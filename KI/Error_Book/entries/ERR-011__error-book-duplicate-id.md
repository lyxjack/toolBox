---
id: ERR-011
type: error
errorCode: EVD-001
severity: medium
status: resolved
recurrence: 2
firstSeen: 2026-04-09
tags:
  - error/medium
  - process/error-book
  - errorCode/EVD-001
  - ki/error-book
prevention: 写入错题本前必须先查 entries/ 目录已有文件的最大 ID，新条目用 max+1；npm run lint:ki 的
  duplicate-id 检查为自动化兜底
aliases:
  - ERR-011
---

# 写入错题本时 ID 与已有条目重复

## 错误现象
新建 ERR-009 和 ERR-010 时，没有检查 entries/ 目录下已有同 ID 的文件（ERR-009__obsidian-mcp-wrong-config-path.md 和 ERR-010__push-without-version-check.md），导致 ID 冲突，需要事后重命名为 ERR-011 和 ERR-012。

## 根因分析
1. 只查了 index.json 中的条目（8 条），没有检查 entries/ 目录下的实际文件
2. index.json 可能不完整（被标记为 frozen 后有新条目通过 Obsidian 直接添加，未同步到 index.json）
3. 没有在创建前执行 `ls entries/ | tail -5` 确认最大 ID

## 解决方案
写入新错题本条目前，执行：
```bash
ls /Users/jackliu/toolBox/KI/Error_Book/entries/ERR-*.md | sort | tail -3
```
取最大 ID 号 +1 作为新条目 ID。

## 预防规则
**新建错题本条目前，必须扫描 entries/ 目录确认当前最大 ID，新条目 = max ID + 1。不能只看 index.json，因为可能不同步。**

## 关联
- Error_Book contract.md: ID 唯一性要求
- [[ERR-044__ki-renumber-without-inbound-link-sync|ERR-044]] — 姊妹错误：撞号修复（重编号）若不同步入链会引发的次生断链；两者的自动防线均为 `npm run lint:ki`

## 复发记录

- **2026-07-06（recurrence 2）**：全库审计发现 ERR-018 与 ERR-019 各有两个文件共用同一 ID（migration-pitfalls vs parent-layout；cosmetic-change vs uuid-mismatch），`[[ERR-018]]` 短链歧义无法解析——本条预防规则在这两次创建时未被执行。修复：零入链方改号为 ERR-042/043（最小扰动法，见 [[PAT-020__ki-renumber-minimal-churn-playbook|PAT-020]]）。防线升级：新增 `Agent/lint/ki-integrity-linter.mjs`（`npm run lint:ki`），duplicate-id 为 error 级自动检测，撞号从"靠自觉"变为"CI 可拦截"。