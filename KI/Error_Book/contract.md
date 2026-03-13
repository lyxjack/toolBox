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
```markdown
# {错误标题}

## Metadata
- **ID**: ERR-{NNN}
- **Error Code**: {错误码}
- **Severity**: {级别}
- **Keywords**: [{触发关键词}]
- **First Seen**: YYYY-MM-DD
- **Recurrence**: {次数}
- **Status**: open | resolved | recurring

## 错误现象
{Agent 做错了什么}

## 根因分析
{为什么会犯这个错}

## 解决方案
{正确的做法}

## 预防规则
{Agent 在什么情况下应该回忆起这条记录}

## 关联
- {关联的 KI 条目或其他 Error Book 条目}
```

## 5. 关键词召回机制

当用户指令包含 index.json 中某条 entry 的 `keywords` 字段中的关键词(精确匹配或高相似度)时:
1. Agent 读取 `KI/Error_Book/index.json`
2. 匹配 keywords 字段
3. 加载对应的详情文件
4. 将解决方案和预防规则纳入当前任务的决策依据

**优先级**: Error_Book 召回优先于 Internal_KI 查询。先看"不该怎么做",再看"应该怎么做"。

## 6. 生命周期

| 状态 | 触发条件 | 操作 |
|------|---------|------|
| **创建** | 用户手动添加(Agent 犯错后) | 写入 entries/ + 更新 index.json |
| **更新** | 同类错误再次发生 | recurrence +1,更新 status 为 recurring |
| **解决** | 错误根因已消除 | status 改为 resolved |
| **删除** | 不删除,错题永久保留 | — |

## 7. 索引同步规则

**强制约束**:任何错题的增加或状态变更,必须同步更新 `index.json`。

## 8. Token 优化策略

1. **index.json 轻量化**:keywords 字段用于快速匹配,避免加载所有详情文件
2. **只加载命中条目**:关键词未命中时不读取任何详情文件
3. **severity 排序**:多条命中时,critical > high > medium > low 优先展示
