---
id: PAT-020
type: pattern
title: "KI 条目重编号与断链修复：最小扰动法"
status: active
created: "2026-07-06"
tags:
  - "pattern/ki-maintenance"
  - "tool/obsidian"
  - ki/pattern
trigger_condition: "user_explicit"
complements:
  - "[[ERR-044__ki-renumber-without-inbound-link-sync|ERR-044]]"
  - "[[ERR-011__error-book-duplicate-id|ERR-011]]"
related:
  - "Error_Book/entries/ERR-044__ki-renumber-without-inbound-link-sync.md"
  - "Error_Book/entries/ERR-011__error-book-duplicate-id.md"
  - "Error_Book/entries/ERR-029__wiki-link-parser-table-escaped-pipe.md"
aliases:
  - "PAT-020"
mem_ref: "94555254-0c5d-4c86-978a-d232401daecf"
mem_status: "linked"
---

# KI 条目重编号与断链修复：最小扰动法

## 适用场景

Obsidian KI 库出现以下任一情况时：重复 ID（两个文件共用同一编号）、条目需要改名/改号、审计发现断链簇。目标是**用最小的改动面恢复一致性**，不引入新的断链。

## 步骤

1. **入链盘点先于动文件**：`grep -rn "<完整slug>\|<短ID>"` 全库扫两种形态（frontmatter `complements`/`related` + 正文 + 表格），列出全部入链方
2. **裁决谁改号**：重复 ID 场景下，**改零入链（或入链最少）的那个文件**，入链多的保留原号——本次 ERR-018/019 各两个文件撞号，改号方（→ERR-042/043）均为零入链，保留方的 4+ 处入链一字未动
3. **原子改号**：`git mv` 改文件名 + frontmatter `id` + `aliases` 三处同步（perl 单行精确替换，别用手改）
4. **入链修复三分法**（对每条受影响链接判定目标状态）：
   - 目标仍存在 → 改指现行 slug，`|别名` 同步改现行编号
   - 内容已内化进其他条目 → 转纯文本 + 注明去向
   - 目标是项目级未入库笔记 → 转 inline code + 标注"未入本 vault"；删链导致孤儿时补同族互链
5. **审计报告不可盲信**：批量修复前对每条"可疑"逐一读原文核实——本次审计标记 PAT-011 的 ERR-006 链接"语义可疑"，核实后确认是正确关联，拒改
6. **收尾验证**：`npm run lint:ki`（0 断链 / 0 重复 ID / 0 id-mismatch 才算完成），warning 级孤儿存量另行治理

## 反模式

| 错误做法 | 正确做法 | 关联错误 |
|---------|---------|---------|
| 先改文件名再找引用 | 先 grep 入链盘点再动文件 | [[ERR-044__ki-renumber-without-inbound-link-sync\|ERR-044]] |
| 改入链多的那个文件的编号 | 改零入链的最小扰动方 | [[ERR-044__ki-renumber-without-inbound-link-sync\|ERR-044]] |
| 断链一律删除了事 | 三分法：改指 / 内化转文本 / 标注未入库 | [[ERR-044__ki-renumber-without-inbound-link-sync\|ERR-044]] |
| 手写正则解析 wiki link 不剥代码块 | 先 strip code fence/span，支持表格 `\|` 转义 | [[ERR-029__wiki-link-parser-table-escaped-pipe\|ERR-029]] |
| 新建条目不查最大 ID | `ls entries/ \| sort \| tail` 取 max+1 | [[ERR-011__error-book-duplicate-id\|ERR-011]] |

## 关联错误

- [[ERR-044__ki-renumber-without-inbound-link-sync|ERR-044]] — 本 playbook 对应的负面案例（改号不同步入链 → 13 断链成簇）
- [[ERR-011__error-book-duplicate-id|ERR-011]] — 撞号的源头错误（创建时不查最大 ID）
- [[ERR-029__wiki-link-parser-table-escaped-pipe|ERR-029]] — 链接解析器的两个已知坑（lint:ki 已按此实现）
