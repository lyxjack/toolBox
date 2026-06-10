# data-analysis/ — 数据库归档日志分析类(Cat 5)

> **用户分类**: Cat 5 — 数据库归档日志分析类
> **契约**: 见 `KI/Internal_KI/contract.md` § Cat 5 章节

## 用途

存放**LOG / 数据库 / 数据流的清理、清洗、分析、归档逻辑**。涵盖:

- LOG 滚动策略(每日/每周/每月)+ 保留期
- 数据清洗 pipeline(去重、补全、纠错)
- 归档策略(冷热分层、压缩格式、目标存储)
- 删除规则(GDPR / 合规)
- 归纳总结(数据汇总 query + 报告生成)

## 与其他类边界

- 与 Cat 1 技术栈(`External_KI/categories/backend.json` 含数据库 patterns)区分:Cat 1 是**通用技能 skill**(如何写 SQL、如何用 ORM);Cat 5 是**项目级具体策略**(本项目的 user_actions 表如何归档)
- 与 Cat 4 安全权限区分:Cat 4 是配置 + 权限;Cat 5 是数据生命周期
- 与 Cat 7 可复用功能区分:Cat 7 是装饰器/static helper;Cat 5 是数据 pipeline 配置

## 文件命名

`{data-source}_{action}.md`,例如 `user-events_archive.md` / `audit-logs_cleanup.md` / `metrics-rollup.md`。

## 模板

`KI/Templates/data_analysis.tmpl.md`

## 状态

P0 占位目录(2026-05-17 创建)。**toolBox 内无业务 LOG,不强填**;项目级在 `{project}/.claude/Internal_KI/data-analysis/` 落条目。
