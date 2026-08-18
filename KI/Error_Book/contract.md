# Error_Book — 全局级错题本规范

> **Error_Book 是全局级资产,跨所有项目共享。**
> 数据存放在 `KI/Error_Book/` 中,不跟项目走。

## 1. 用途

Error_Book 是用户手动维护的 Agent 错误记录。当用户指令中的关键词与错题记录匹配时,
Agent 优先索引到对应的解决方案,避免重复犯同一个错误。

与 Internal_KI 的区别:
- Internal_KI = 项目级正向知识(应该怎么做),跟项目走
- Error_Book = 全局级负向记录(不应该怎么做),跨项目共享

## 2. 目录结构

```
KI/Error_Book/
├── contract.md                 ← 本文件(规范定义)
├── index.json                  ← 错题索引(必需)
└── entries/                    ← 错题详情目录
    └── ERR-{NNN}__{slug}.md
```

## 3. 文件命名规范

### 错题详情文件
```
ERR-{NNN}__{slug}.md
```
- `NNN`: 三位数序号,从 001 开始
- `slug`: kebab-case,描述性短语,最长 40 字符
- 分隔符: 双下划线 `__`
- 示例: `ERR-001__unhandled-promise-rejection.md`

### 索引文件
- 固定名称: `index.json`

## 4. 文件内容格式

### index.json 格式
```json
{
    "_meta": {
        "description": "全局 Error Book 索引",
        "version": "string",
        "lastUpdated": "YYYY-MM-DD",
        "entryTemplate": "KI/Templates/error_book_entry.tmpl.md",
        "detailDir": "KI/Error_Book/entries/"
    },
    "entries": [
        {
            "id": "ERR-{NNN}",
            "errorCode": "{错误码}",
            "pattern": "{错误模式一句话描述}",
            "keywords": ["{关键词1}", "{关键词2}", "{关键词3}"],
            "prevention": "{预防措施一句话}",
            "severity": "critical | high | medium | low",
            "status": "open | resolved | recurring",
            "recurrence": 0,
            "relatedTasks": [],
            "file": "entries/ERR-{NNN}__{slug}.md",
            "firstSeen": "YYYY-MM-DD"
        }
    ],
    "errorCodeReference": {}
}
```

### 错题详情 .md 格式

条目结构以 `KI/Templates/error_book_entry.tmpl.md` 为准（YAML frontmatter，字段规范见 §7.2；旧 `## Metadata` 段落格式已废止）。

## 5. 关键词召回机制

召回走 **Obsidian MCP**（全文 / 标签 / `leading_word` 检索，scope `Error_Book/entries/`；两路径定义见 `KI/README.md`。index.json 已冻结不参与召回，见 §7.5）。命中条目的解决方案与预防规则纳入当前任务的决策依据。

**优先级**: Error_Book 召回优先于 Internal_KI 查询。先看"不该怎么做",再看"应该怎么做"。

## 6. 生命周期

| 状态 | 触发条件 | 操作 |
|------|---------|------|
| **创建** | 用户手动添加(Agent 犯错后) | 写入 entries/ + 更新 index.json + **必须评估并添加 ci_rules**（见第 8 节） |
| **更新** | 同类错误再次发生 | recurrence +1,更新 status 为 recurring |
| **解决** | 错误根因已消除 | status 改为 resolved |
| **删除** | 不删除,错题永久保留 | — |

## 7. Obsidian 集成

### 7.1 Vault 配置
Error_Book 是 Obsidian Vault（root: `KI/`）的一部分。Obsidian + Local REST API 插件必须运行才能使用 MCP 召回。

### 7.2 YAML Frontmatter 规范
所有条目使用 YAML frontmatter 替代原 `## Metadata` 段落。必需字段：
- `id`, `type`, `errorCode`, `severity`, `status`, `recurrence`, `firstSeen`, `tags`, `prevention`, `aliases`, `leading_word`（新建条目必填；存量触碰即补）

#### 7.2.1 leading_word 字段
一个模型预训练语料中已有的紧凑概念词（如 `tight`、`red`、`blast-radius`），承载条目的核心行为模式：召回时作检索锚点，执行时以最少 token 召回整片先验行为。要求：单词或短词组；在标题与 `prevention` 句中复现；选已有概念词——生造词无先验，付出定义成本换不来行为。Pattern Book 条目同规，但复现位置为标题与「适用场景」首句（Pattern 无 `prevention` 字段）。来源：`Tool/mattpocock-skills` writing-great-skills（Leading Word / Leitwort）。

### 7.3 标签体系
使用 Obsidian 层级标签：`error/{severity}`, `engine/{name}`, `tool/{name}`, `asset/{type}`, `errorCode/{code}`, `ki/error-book`

### 7.4 Wikilinks
交叉引用使用 Obsidian wikilink 语法：`[[ERR-NNN__slug|ERR-NNN]]`
aliases 字段确保短链接 `[[ERR-NNN]]` 可正确解析。

### 7.5 index.json 状态
index.json 已冻结（`_meta.frozen: true`），不再参与召回流程。仅作为历史快照保留。

## 8. CI 自动拦截 (ci_rules)

### 8.1 概述
Error Book 条目可以包含可选的 `ci_rules` 字段，将预防规则转化为 CI 可自动检查的静态规则。
运行方式：`npm run lint`（本地）或 GitHub Actions（PR 检查）。
Linter 脚本：`Agent/lint/error-book-linter.mjs`（零依赖）。

### 8.2 ci_rules Schema
```yaml
ci_rules:                              # 可选，数组
  - type: "file-pattern-ban"           # 规则类型（见下表）
    pattern: "regex"                   # 匹配模式
    file_pattern: "regex"              # 可选，限定文件范围
    trigger_pattern: "regex"           # code-pattern-require 专用：触发条件
    required_pattern: "regex"          # code-pattern-require 专用：必须存在的模式
    message: "拦截提示信息"             # 必需
    severity_override: "medium"        # 可选，覆盖条目默认 severity
```

### 8.3 规则类型

| type | 用途 | 必需字段 |
|------|------|---------|
| `file-pattern-ban` | 禁止修改匹配文件名的文件 | `pattern`, `message` |
| `code-pattern-ban` | 禁止文件中出现的代码模式 | `pattern`, `message`, 可选 `file_pattern` |
| `code-pattern-require` | 当 trigger 出现时必须有 required | `trigger_pattern`, `required_pattern`, `message`, 可选 `file_pattern` |

### 8.4 severity 与拦截行为
- `critical` / `high` → **阻断**（exit 1，CI 失败）
- `medium` / `low` → **警告**（exit 0，仅打印提示）
- `severity_override` 可覆盖条目默认级别

### 8.5 强制规则 — 创建条目时必须评估 ci_rules

> **这是不可跳过的强执行约束。每次创建新 Error Book 条目时，Agent 必须执行以下流程：**

1. **评估可自动化性**：判断该错误是否可以用 `file-pattern-ban`、`code-pattern-ban`、`code-pattern-require` 三种规则类型之一表达
2. **可自动化 → 必须添加 ci_rules**：在 YAML frontmatter 中写入 ci_rules 字段，确保规则立即生效
3. **不可自动化 → 必须标注原因**：在条目的 `预防规则` 章节末尾添加 `> CI: Tier 2 only — {原因}`，说明为什么无法用静态规则覆盖
4. **添加后运行验证**：执行 `npm run lint:validate` 确认覆盖率

**违反此规则等同于创建了一条没有防护的错误记录 — 错题本的价值在于防止复犯，不加 ci_rules 就是留了一个没锁的门。**

## 9. 索引同步规则（已废止 2026-08-03）

~~任何错题的增加或状态变更,必须同步更新 `index.json`。~~ index.json 已冻结（§7.5），条目元数据由 YAML frontmatter 承载，Obsidian 召回无需索引同步。

## 10. Token 优化策略

1. **只加载命中条目**:Obsidian 搜索未命中时不读取任何详情文件
2. **severity 排序**:多条命中时,critical > high > medium > low 优先展示
