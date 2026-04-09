# Internal_KI — 项目级知识库接口契约

> **本文件是接口定义,不存放任何项目的实际 KI 内容。**
> 各项目根据本契约在自己的目录中创建 Internal_KI 实例。

## 1. 用途

Internal_KI 是项目级的精华知识库,存放经过验证的、对项目开发有指导意义的规则和约定。
每条 KI 必须是**可操作的**(actionable),而非记录性的。

## 2. 项目中的目录结构

```
{project}/
└── .claude/
    └── Internal_KI/
        ├── index.json              ← 项目级 KI 索引(必需)
        ├── frontend/               ← 基础 category(按需启用)
        │   └── {slug}.md
        ├── backend/
        │   └── {slug}.md
        ├── data-logic/
        │   └── {slug}.md
        └── code-design/
            └── {slug}.md
```

## 3. 基础 Category(4 个)

| Category | 覆盖范围 | 启用条件 |
|----------|---------|---------|
| `frontend` | UI 组件约定、样式规范、前端错误展示策略、用户交互规则 | 项目含前端代码 |
| `backend` | API 约定、服务层规则、中间件逻辑、error-handling fallback 策略 | 项目含后端代码 |
| `data-logic` | DTO 定义、Schema 约定、数据流转规则、校验逻辑、数据库规范 | 项目含数据处理 |
| `code-design` | 设计模式约定、架构规则、命名约定、复用模式 | 所有项目 |

项目可根据需要只启用部分 category。不启用的 category 不创建目录。

## 4. 文件命名规范

### 目录命名
- 使用 kebab-case
- 仅限基础 category 名称,不自行新增

### KI 条目文件命名
```
{slug}.md
```
- `slug`: kebab-case,描述性短语,最长 40 字符
- 示例: `result-type-pattern.md`、`api-error-fallback.md`

### 索引文件
- 固定名称: `index.json`

## 5. 文件内容格式

### index.json 格式
```json
{
    "_meta": {
        "projectName": "{project_name}",
        "projectPath": "{project_absolute_path}",
        "version": "1.0",
        "lastUpdated": "YYYY-MM-DD",
        "categories": ["frontend", "backend", "data-logic", "code-design"]
    },
    "entries": [
        {
            "id": "KI-{NNN}",
            "category": "{category_name}",
            "title": "{标题}",
            "summary": "{一句话摘要,用于索引查询}",
            "file": "{category}/{slug}.md",
            "tags": ["{tag1}", "{tag2}"],
            "created": "YYYY-MM-DD",
            "lastVerified": "YYYY-MM-DD",
            "status": "active | deprecated"
        }
    ]
}
```

### KI 条目 .md 格式
```markdown
# {标题}

## Metadata
- **ID**: KI-{NNN}
- **Category**: {category}
- **Tags**: [{tag1}, {tag2}]
- **Created**: YYYY-MM-DD
- **Last Verified**: YYYY-MM-DD

## 适用场景
{何时使用}

## 规则/模式
{具体内容,含代码示例}

## 关联
- {关联的其他 KI 条目或 Error Book 条目}
```

## 6. 生命周期

| 状态 | 触发条件 | 操作 |
|------|---------|------|
| **创建** | QA 通过、重大技术选择、复用模式验证后 | 写入 category 目录 + 更新 index.json |
| **更新** | 规则变化、新证据 | 修改条目文件 + 更新 index.json 的 lastVerified |
| **废弃** | 规则不再适用 | status 改为 deprecated,不删除文件 |
| **删除** | 项目关闭时随项目整体归档 | 不单独删除条目 |

## 7. 索引同步规则

**强制约束**:任何 KI 条目的增删改,必须同步更新 `index.json`。

- 新增条目 → index.json 追加 entry
- 修改条目 → index.json 更新对应 entry 的 lastVerified
- 废弃条目 → index.json 标记 status: deprecated

## 8. 全局 Skill 链接方式

项目 CLAUDE.md 中必须声明 Internal_KI 路径:
```markdown
## Internal KI
- **路径**: `.claude/Internal_KI/`
- **索引**: `.claude/Internal_KI/index.json`
- **启用 Category**: frontend, backend, data-logic, code-design
```

全局 Agent Skill 通过读取项目 CLAUDE.md 获取路径,再按需加载 index.json 和具体条目。

## 9. Token 优化策略

1. **优先 Glob**:按 category 目录定位,避免加载全量 index.json
2. **index.json 只做路由**:summary 字段用于判断是否需要读取详情,避免全量加载
3. **按需加载**:只读取与当前任务相关的 category 目录下的文件

## 10. Obsidian 集成

### 10.1 Vault 配置
Internal_KI 是 Obsidian Vault（root: `KI/`）的一部分。Obsidian + Local REST API 插件必须运行才能使用 MCP 召回。

### 10.2 Pattern Book
Pattern Book 存放在 `patterns/` 目录中,记录经过验证的正确做法和可复用模式。

条目使用 YAML frontmatter 格式,必需字段：
- `id`, `type`, `title`, `status`, `created`, `tags`, `complements`, `aliases`

Pattern Book 通过 Obsidian MCP 进行召回,与 Error Book 形成互补：
- Error Book = 不应该怎么做（防错）
- Pattern Book = 应该怎么做（复用）

### 10.3 Decisions 与 Lessons
重大技术决策提取为独立 `.md` 文件,存放在 `decisions/` 目录。
经验教训提取为独立 `.md` 文件,存放在 `lessons/` 目录。

### 10.4 index.json 状态
index.json 已冻结（`_meta.frozen: true`），不再参与召回流程。仅作为历史快照保留。
Obsidian MCP 搜索替代 index.json 成为主要召回机制。
