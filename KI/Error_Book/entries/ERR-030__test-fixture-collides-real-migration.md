---
id: ERR-030
type: error
errorCode: "ISO-003"
severity: "high"
status: "resolved"
recurrence: 1
firstSeen: "2026-06-10"
tags:
  - error/high
  - tool/nodejs
  - errorCode/ISO-003
  - ki/error-book
prevention: "测试 fixture 禁止以可能与生产文件撞名的名字写入真实目录：要么用隔离临时目录，要么用现实中到不了的命名空间(如版本号 v99.x)，且清理只删自己创建的文件"
aliases:
  - "ERR-030"
ci_rules: []
# ci_rules 评估: 无可静态拦截规则 — "fixture 写真实目录"本身在 findPendingMigrations 硬编码 TOOLBOX_ROOT
# 的前提下不可避免；防线是 test_mem_link.mjs 的分发保障 suite(断言 v1.3.0.mjs 存在),migration 被误删即红。
mem_ref: "ec4079d6-6143-4f2d-bde8-2dca4e89c60d"
mem_status: "linked"
---

# 测试 fixture 与真实生产文件撞名，清理时误删真实 migration

## 错误现象

创建 `Agent/migrations/v1.3.0.mjs`（v1.3.0 真实 migration：claude-mem 自动安装）并验证运行成功后，跑了一次全量测试，migration 文件**无声消失** — 目录里只剩 README.md。`test_mem_link.mjs` 的存在性断言变红才暴露。

## 根因分析

`test_bootstrap.mjs` 的 `findPendingMigrations` 测试组把 fixture 文件（`v1.3.0.mjs`、`v1.1.0.mjs`、`v1.7.0.mjs` 等）直接写进**真实的** `Agent/migrations/` 目录：
1. `writeFileSync` 先**覆盖**了同名真实 migration 的内容（`// test\n`）
2. finally 块 `unlinkSync` 清理 fixture 时把这个文件**整个删除**

写测试时（2026-05）migrations 目录只有 README，fixture 版本号 `v1.3.0` 当时不撞任何真实文件 — 这是**时间炸弹**：真实版本号迟早追上 fixture 版本号。

## 解决方案

fixture 版本号全部移到现实到不了的命名空间 `v99.x`（查询范围同步改 `('99.0.0','100.0.0')`），范围外用例用 `v300.0.0`。修复后连续两次全量运行，真实 `v1.3.0.mjs` 完好，420/420 通过。

## 预防规则

- 测试 fixture 写入**真实目录**时，回忆本条：命名必须用生产永远到不了的命名空间（版本号 99.x、前缀 `__test__` 等），且 finally 清理前确认文件是自己创建的。
- 更优先：能隔离就隔离（临时目录 + 依赖注入路径）；本例因 `findPendingMigrations` 硬编码 `TOOLBOX_ROOT` 而不可行，属次优解。
- 关键词召回: `fixture`、`migration`、`测试误删`、`writeFileSync 真实目录`、`unlinkSync`、`时间炸弹`。
- 新增真实 migration 文件后，必须跑两遍含 bootstrap 测试的全量套件并确认文件仍在（本条的发现方式）。

## 关联

- [[ERR-029__wiki-link-parser-table-escaped-pipe|ERR-029]] — 同一 REQ 交付链中发现的另一类"写时正确、后续被破坏"问题；两条共同说明：交付验证必须含"产物在全套件运行后仍完好"检查
- [[ERR-005__python-json-dump-prefab-id-shift|ERR-005]] — 同 ISO-003 类：程序化操作破坏不该触碰的文件
