# KI/Templates/ — 7 大类模板索引

> 详细契约见 `KI/Internal_KI/contract.md` § 7-Category Taxonomy

## 对照表

| # | 类别 | 目录 | 模板 | 用途 |
|---|---|---|---|---|
| 1 | 技术栈 | `KI/External_KI/categories/` | (Anchor metadata) | 跨项目通用 skill 索引 |
| 2 | Prompt 拆解 | `KI/Internal_KI/execution_logs/` | `execution_log.tmpl.md` | PM→CTO→QA 闭环复盘 |
| 3 | 逻辑流程 | `KI/Internal_KI/patterns/` | `pattern_entry.tmpl.md` (trigger_condition=user_explicit) | 业务硬逻辑模式 |
| 4 | 安全权限 | `KI/Internal_KI/security/` | `security_config.tmpl.md` | ENV/SSH/YML 配置语义 |
| 5 | DB 日志分析 | `KI/Internal_KI/data-analysis/` | `data_analysis.tmpl.md` | LOG 清理/归档 pipeline |
| 6 | 错题本 | `KI/Error_Book/entries/` | `error_book_entry.tmpl.md` | 错误模式 + 预防规则 |
| 7 | 可复用功能 | `KI/Internal_KI/patterns/` | `pattern_entry.tmpl.md` (trigger_condition=quality_audit) | 装饰器/static/class 复用 |

## Cross-Reference 强制规则

每条新条目必须:
1. **Primary**: markdown 正文用 wiki link `[[other-note-name]]` 至少引用 1 条已有条目
2. **Backup**: frontmatter `related: [path1, path2]` 数组备份(grep 友好)
3. **冷启动例外**: 首次进入空目录时,可在 frontmatter 加 `bootstrap: true`,允许 0 引用

## 通用 frontmatter 字段(7 类共享)

- `id`: 类前缀 + 编号(ERR-NNN / PAT-NNN / SEC-NNN / DATA-NNN / DEC-NNN / LES-NNN / EXEC-{date}-{slug})
- `type`: 文档类型枚举
- `status`: active | resolved | recurring | deprecated | rotated | sunset
- `created`: YYYY-MM-DD
- `tags`: 多级层级标签,至少含 `ki/<category>`
- `related`: wiki link 数组(可空)
- `aliases`: 短 ID(用于 wiki link 友好)
