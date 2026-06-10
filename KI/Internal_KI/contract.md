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

## 3.5 7-Category Taxonomy(全局分类体系)

| # | 类别 | 目标位置 | 性质 |
|---|---|---|---|
| 1 | 技术栈类 | `KI/External_KI/categories/` (13 anchors) | 跨项目通用 skill 索引(External) |
| 2 | Prompt 需求拆解 | `KI/Internal_KI/execution_logs/` | 项目级 PM→QA 闭环日志(Internal,新) |
| 3 | 逻辑流程类 | `KI/Internal_KI/patterns/` (trigger_condition=user_explicit) | 业务硬逻辑(Internal,复用 patterns/) |
| 4 | 安全权限类 | `KI/Internal_KI/security/` | 项目级 ENV/SSH/YML 配置语义(Internal,新) |
| 5 | DB 归档日志分析 | `KI/Internal_KI/data-analysis/` | 项目级 LOG/数据 pipeline(Internal,新,toolBox 不强填) |
| 6 | 错题本 | `KI/Error_Book/entries/` | 全局错误模式 + 预防规则(独立顶层) |
| 7 | 可复用功能类 | `KI/Internal_KI/patterns/` (trigger_condition=quality_audit) | 装饰器/static helper(Internal,与 Cat 3 共目录靠字段区分) |

**说明**:

- Cat 1 / Cat 6 在 External 或独立顶层,**不**走 Internal_KI/ 子目录。
- Cat 2 / 4 / 5 是本次 P0 新增的 Internal 子目录。
- Cat 3 / 7 共用 `patterns/`,用 frontmatter `trigger_condition: user_explicit | quality_audit | both` 区分语义。
- 旧的基础 Category(frontend / backend / data-logic / code-design,见 § 3) 保留作为**项目级低层启用 dimension**,与本 § 3.5 的 7 大类**正交**(项目可以同时启用 frontend + 写 Cat 2 execution_log,两个 dimension 独立)。

## 3.6 三个新子目录的契约(execution_logs / security / data-analysis)

### 3.6.1 execution_logs/

**对应类别**: Cat 2(Prompt 需求拆解)
**用途**: 项目级 PM→QA 闭环过程日志,记录需求理解、拆解、变更轨迹。
**文件命名**: `{YYYY-MM-DD}_{REQ-slug}.md`
**必填 frontmatter 字段**: `id`, `type`, `req_ref`, `status`, `created`, `tags`, `related`, `aliases`
**可选字段**: `plan_ref`(plan-driven 模式时指向 plan file 路径)
**模板**: `KI/Templates/execution_log.tmpl.md`
**与其他目录边界**: 决策性技术结论用 `decisions/`;过程性需求理解日志用 `execution_logs/`。
**toolBox 内填充策略**: toolBox 内由 /distill 自动填(Phase 2 REQ)。

#### `req_ref` 字段允许的两种格式

| 来源 | Pattern | 示例 |
|---|---|---|
| **正式 /pm REQ** | `^REQ-\d{8}-\d{6}$` | `REQ-20260517-043739` |
| **Plan-driven(无 /pm)** | `^PLAN-{date}-{slug}$` | `PLAN-2026-05-17-claude-memory-obsidian-skeleton` |

Plan-driven 模式额外要求填 `plan_ref` 字段,指向 plan file 绝对/相对路径(如 `~/.claude/plans/<slug>.md`),便于审计还原。

**parser 校验**: `test_distill_output_audit.mjs` Audit-1 用 regex `^(REQ-\d{8}-\d{6}|PLAN-)` 校验。

### 3.6.2 security/

**对应类别**: Cat 4(安全权限类)
**用途**: 项目级 ENV / SSH / YML / Secret 等配置语义与风险说明。
**文件命名**: `{topic}.md`(kebab-case)
**必填 frontmatter 字段**: `id`, `type`, `topic`, `scope`, `risk_level`, `status`, `created`, `anchor_ref`, `tags`, `related`, `aliases`
**模板**: `KI/Templates/security_config.tmpl.md`
**与其他目录边界**: `External_KI/categories/security.json` 是跨项目 Anchor metadata;本目录是项目级具体配置语义。
**toolBox 内填充策略**: toolBox 内不强填(项目级落)。

### 3.6.3 data-analysis/

**对应类别**: Cat 5(DB 归档日志分析)
**用途**: 项目级 LOG / 数据 pipeline / 归档与分析流程的过程沉淀。
**文件命名**: `{data-source}_{action}.md`(kebab-case)
**必填 frontmatter 字段**: `id`, `type`, `data_source`, `analysis_type`, `status`, `created`, `retention_days`, `tags`, `related`, `aliases`
**模板**: `KI/Templates/data_analysis.tmpl.md`
**与其他目录边界**: 与 Cat 1 backend skill 区分(skill 通用 vs 项目级 pipeline);与 Cat 4 security 区分(数据生命周期 vs 配置语义)。
**toolBox 内填充策略**: toolBox 内不强填。

## 3.7 Cross-Reference 强制规则

1. **机制**: 双轨并行
   - **Primary**: Obsidian wiki link `[[note-name]]` 在 markdown 正文(Obsidian MCP 原生双向追踪,改名自动同步)。
   - **Backup**: frontmatter `related: [path1, path2]` 数组(grep 友好,Obsidian 离线时仍可用)。

2. **强制 Gate**(留给 Phase 2 /distill 实施):
   - 每条新条目必须至少 1 个 `[[]]` wiki link 引用同类或跨类已有条目。
   - 写入前需 `obsidian_search_notes` 验证目标条目存在(避免笔误产生孤儿链接)。

3. **冷启动例外**:
   - 首次进入空目录(如刚建的 execution_logs / security / data-analysis)无引用对象时,frontmatter 加 `bootstrap: true`,允许 0 个 wiki link。
   - bootstrap 条目不计入"未引用警告"。

4. **同步 backup**:
   - 写入 wiki link 时,同步把 wiki link 目标的相对路径写到 frontmatter `related: [...]`。
   - 改名时(用 Obsidian rename),Obsidian 自动改 wiki link,但 frontmatter `related` 需 /distill 在下次跑时校正。

5. **不**扩展 `KI/External_KI/cross_references.json`(已冻结,只服务 13 个 Anchor 间的关系)。

## 3.8 claude-mem 双向关联(mem_ref / mem_status)

> 来源: REQ-20260609-210628。双层记忆体系: claude-mem = 会话级短期记忆(参考,不构成约束);Obsidian KI = 策展长期知识。注册信息见 `Agent/index/skill_registry.json#externalPlugins`。

1. **字段定义**(7 大类**新建**条目必填,模板已含):
   - `mem_ref`: 产出本条目的 claude-mem session 标识(`sdk_sessions.content_session_id`);claude-mem 不可用时为 `null`。
   - `mem_status`: `linked`(写入时已验证该 session 存在于 claude-mem DB)| `unavailable`(claude-mem 不可用,降级)。

2. **获取方式**(/distill Phase 7 写入前执行,只读查询,不依赖 worker 在线):
   ```bash
   sqlite3 "file:$HOME/.claude-mem/claude-mem.db?mode=ro" \
     "SELECT content_session_id FROM sdk_sessions WHERE project='{project}' ORDER BY started_at_epoch DESC LIMIT 1;"
   ```
   关联目标选 **session id** 而非 observation/summary id: session 记录由 UserPromptSubmit hook **同步**创建,写入时刻必然已存在;摘要为 Stop hook 后**异步**生成,写入时刻可能未落库。

3. **降级规则**(强制,不可阻塞): DB 不存在 / 查询失败 / 结果为空 → `mem_ref: null` + `mem_status: unavailable`,流程正常继续并在 /distill 报告中提示。禁止因 claude-mem 不可用而中断或重试 KI 写入。

4. **校验规则**: `mem_status: linked` ⇒ `mem_ref` 非 null 且可在 `sdk_sessions` 查得;`mem_status: unavailable` ⇒ `mem_ref` 为 null。存量条目(2026-06-10 前)不要求回填,校验仅对新建条目生效。

5. **mem 侧 → entry 方向**: 由 claude-mem PostToolUse hook 自动捕获 obsidian 写入操作,无需主动写入(claude-mem 无公开写 API)。

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

## 10.5 7-Category 与 Obsidian Tag 层级对齐

| 类别 | Obsidian tag 前缀 |
|---|---|
| Cat 1 | `skill/<anchor-name>` (如 `skill/backend`、`skill/frontend`) |
| Cat 2 | `execution_log`, `req-tracking` |
| Cat 3 | `pattern`, `trigger/user_explicit` |
| Cat 4 | `security`, `config`, `risk/<level>` |
| Cat 5 | `data-analysis`, `pipeline` |
| Cat 6 | `error`, `severity/<level>` |
| Cat 7 | `pattern`, `trigger/quality_audit` |

`ki/<category>` (如 `ki/internal`、`ki/error-book`)是所有类共有的根标签。
