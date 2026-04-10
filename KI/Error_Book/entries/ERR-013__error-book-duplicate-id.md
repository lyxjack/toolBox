---
id: ERR-013
type: error
errorCode: EVD-001
severity: medium
status: resolved
recurrence: 1
firstSeen: 2026-04-09
tags:
  - error/medium
  - process/error-book
  - errorCode/EVD-001
  - ki/error-book
prevention: "写入错题本前必须先查 entries/ 目录已有文件的最大 ID，新条目用 max+1"
aliases:
  - ERR-013
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
