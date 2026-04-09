# Obsidian KI 知识管理 — 设置与使用教程

> **本教程指导团队成员将 toolBox 的 KI 层接入 Obsidian + MCP，实现 Agent 智能知识召回。**
> 适用于首次配置和新成员 onboarding。

## 0. 背景：为什么要用 Obsidian

toolBox 的 KI（Knowledge Intelligence）层管理三类知识资产：

| 类型 | 路径 | 作用 |
|------|------|------|
| **Error Book** | `KI/Error_Book/entries/` | 反向知识 — "不该怎么做" |
| **Pattern Book** | `KI/Internal_KI/patterns/` | 正向知识 — "应该怎么做" |
| **Internal_KI** | `KI/Internal_KI/decisions/` `lessons/` | 架构决策和经验教训 |

之前 Agent 通过读 `index.json` + 关键词匹配来召回知识，存在两个问题：
1. **召回质量**：依赖手动维护的 keywords 数组，同义词遗漏导致漏召回
2. **维护成本**：每次增删条目都要同步更新 index.json

接入 Obsidian MCP 后，Agent 直接调用 Obsidian 的全局搜索、标签系统、frontmatter 查询，不再依赖手动索引。

---

## 1. 架构总览

```
┌─────────────────────────────────────────────┐
│  Claude Code Agent                          │
│                                             │
│  用户需求 → 提取关键字                        │
│              │                              │
│              ▼                              │
│     obsidian_global_search (MCP)            │
│              │                              │
│              ▼                              │
│     Obsidian MCP Server                     │
│     (@cyanheads/obsidian-mcp-server)        │
│              │                              │
│              ▼                              │
│     Obsidian App + Local REST API Plugin    │
│              │                              │
│              ▼                              │
│     KI/ Vault (本地文件夹)                   │
│     ┌────────┼───────────┐                  │
│     ▼        ▼           ▼                  │
│  Error_Book  Patterns  Internal_KI          │
│  (防错)     (复用)    (决策/教训)             │
└─────────────────────────────────────────────┘
```

**核心依赖**：Obsidian 必须在后台运行。Agent 通过 MCP 协议与 Obsidian 通信。

---

## 2. 环境搭建（首次配置）

### 2.1 安装 Obsidian

1. 访问 https://obsidian.md 下载对应平台版本
2. macOS：拖入 Applications 并启动
3. Windows：运行安装程序
4. Linux：下载 AppImage 或 Snap

### 2.2 打开 KI Vault

> **不要选"Create new vault"**，选择打开已有文件夹。

1. 启动 Obsidian
2. 选择 **"Open folder as vault"**
3. 浏览到 toolBox 的 `KI/` 目录，例如：
   - macOS: `/Users/<你的用户名>/toolBox/KI`
   - Windows: `C:\Users\<你的用户名>\toolBox\KI`
4. 点击 Open
5. 左侧文件树应显示：`Error_Book/`、`Internal_KI/`、`External_KI/`、`Templates/`

> **注意**：因为团队共享 toolBox 仓库，`.obsidian/` 配置已提交 git。
> clone 后首次打开 Vault，插件和设置会自动加载。如果插件未自动启用，请手动在 Settings → Community plugins 中启用。

### 2.3 安装社区插件（仅首次配置者需要）

> 如果你是从 git clone 的 toolBox，这些插件配置已经存在，只需确认启用即可。
> 如果是全新配置，按以下步骤操作。

1. 点击左下角 **齿轮图标** → Settings
2. 左侧找 **Community plugins**
3. 关闭 **Restricted mode**（安全模式）
4. 点 **Browse**，搜索并安装以下 4 个插件：

| 插件名 | 搜索关键字 | 用途 | 安装后设置 |
|--------|-----------|------|-----------|
| Local REST API | `local rest api` | 让 MCP Server 与 Obsidian 通信 | 启用后进设置，复制 API Key |
| Dataview | `dataview` | 结构化查询 frontmatter 字段 | 启用即可 |
| Templater | `templater` | 用模板创建新条目 | 设置 Template folder = `Templates` |
| Tag Wrangler | `tag wrangler` | 批量管理标签 | 启用即可 |

### 2.4 获取 Local REST API 的 API Key

1. Settings → Community plugins → Local REST API → 点击齿轮图标（插件设置）
2. 找到 **API Key** 字段，复制这串字符
3. 确认端口为 `27124`（默认值，不要修改）
4. 验证：浏览器访问 `https://127.0.0.1:27124`
   - 会提示证书不安全，点"继续访问"/"高级"→"继续前往"
   - 看到 REST API 文档页面 = 成功

> **每个人的 API Key 不同**，不要提交到 git。下一步会配置到本地 `.mcp.json`。

### 2.5 配置 Claude Code 的 MCP 连接

Obsidian MCP 已配置为**全局生效**（`~/.claude/.mcp.json`），所有项目目录下的 Claude Code 都能使用知识召回。

如果你需要手动配置，在 `~/.claude/.mcp.json`（全局）或项目根目录 `.mcp.json`（项目级）中添加：

```json
{
  "mcpServers": {
    "obsidian-ki": {
      "command": "npx",
      "args": ["-y", "obsidian-mcp-server"],
      "env": {
        "OBSIDIAN_API_KEY": "<替换为你的 API Key>",
        "OBSIDIAN_BASE_URL": "https://127.0.0.1:27124",
        "OBSIDIAN_VERIFY_SSL": "false",
        "OBSIDIAN_ENABLE_CACHE": "true"
      }
    }
  }
}
```

**重要**：
- npm 包名是 `obsidian-mcp-server`（不带 `@cyanheads/` 前缀）
- `OBSIDIAN_API_KEY` 替换为你在 2.4 步复制的值
- `OBSIDIAN_BASE_URL` 使用 HTTPS（端口 27124），`OBSIDIAN_VERIFY_SSL` 设为 `false`（Obsidian 使用自签名证书）
- `.mcp.json` 包含个人密钥，已在 `.gitignore` 中排除，不会提交到 git
- 如果 toolBox 已有 `.mcp.json`（例如包含 Cocos MCP 配置），将 `obsidian-ki` 条目合并进去即可

### 2.6 验证 MCP 连接

1. 确保 Obsidian 在后台运行且 KI Vault 已打开
2. 启动 Claude Code（在 toolBox 目录下）
3. 尝试让 Agent 搜索知识库：

```
请搜索 Error Book 中与 prefab 相关的条目
```

如果 Agent 成功调用 `obsidian_global_search` 并返回结果，配置完成。

---

## 3. KI Vault 文件格式规范

### 3.1 YAML Frontmatter（核心）

所有 KI 条目使用 YAML frontmatter 存储结构化元数据。Obsidian 和 Agent 都通过 frontmatter 查询和过滤。

#### Error Book 条目

```yaml
---
id: ERR-002
type: error
errorCode: ISO-003
severity: critical
status: recurring
recurrence: 2
firstSeen: 2026-04-06
tags:
  - error/critical
  - engine/cocos
  - tool/python
  - asset/prefab
prevention: "绝对禁止用脚本写入 Cocos 资产文件，只能通过编辑器操作"
aliases:
  - ERR-002
---

# 错误标题

## 错误现象
...

## 根因分析
...

## 解决方案
...

## 预防规则
...

## 关联
- [[ERR-006__python-json-dump-prefab-id-shift|ERR-006]] — 相关的 __id__ 错位问题
```

#### Pattern Book 条目

```yaml
---
id: PAT-001
type: pattern
title: "MCP Prefab 修改完整流程"
status: active
created: 2026-04-08
tags:
  - pattern/MCP
  - pattern/prefab
  - engine/cocos
complements:
  - "[[ERR-004__mcp-prefab-layer-ui2d|ERR-004]]"
  - "[[ERR-005__mcp-prefab-save-two-steps|ERR-005]]"
aliases:
  - PAT-001
---

# MCP Prefab 修改完整流程

## 适用场景
...

## 步骤
1. ...
2. ...

## 关联错误
- [[ERR-004__mcp-prefab-layer-ui2d|ERR-004]] — 忘设 layer 导致不可见
- [[ERR-005__mcp-prefab-save-two-steps|ERR-005]] — 保存需要两步
```

#### Internal_KI 决策/教训条目

```yaml
---
id: DEC-001
type: decision
title: "Anchor-based 两级索引架构"
status: active
created: 2026-03-11
tags:
  - ki/decision
  - layer/KI
aliases:
  - DEC-001
---
```

### 3.2 统一字段说明

| 字段 | 必需 | 说明 |
|------|------|------|
| `id` | Yes | 唯一编号：ERR-{NNN} / PAT-{NNN} / DEC-{NNN} / LES-{NNN} |
| `type` | Yes | `error` \| `pattern` \| `decision` \| `lesson` |
| `tags` | Yes | 层级标签数组，用于分类和搜索（见 3.3） |
| `status` | Yes | `open` \| `resolved` \| `recurring` \| `active` \| `deprecated` |
| `aliases` | Yes | Obsidian 别名，让 `[[ERR-002]]` 能正确链接 |
| `severity` | Error only | `critical` \| `high` \| `medium` \| `low` |
| `errorCode` | Error only | 错误码分类（BHV-001, ISO-003 等） |
| `recurrence` | Error only | 复发次数 |
| `prevention` | Error only | 一句话预防措施 |
| `firstSeen` | Error only | 首次发现日期 YYYY-MM-DD |
| `title` | Pattern/Decision/Lesson | 标题 |
| `created` | Pattern/Decision/Lesson | 创建日期 YYYY-MM-DD |
| `complements` | Pattern only | 关联的 Error Book 条目（wikilink 格式） |

### 3.3 标签分类体系

标签使用 Obsidian 层级标签语法（`/` 分隔），Agent 和人类都可以用标签过滤。

| 前缀 | 用途 | 示例 |
|------|------|------|
| `error/` | Error 严重级别 | `error/critical` `error/high` `error/medium` `error/low` |
| `pattern/` | 正确模式分类 | `pattern/MCP` `pattern/prefab` `pattern/save-workflow` |
| `status/` | 生命周期状态 | `status/resolved` `status/recurring` `status/active` |
| `engine/` | 游戏引擎 | `engine/cocos` `engine/unity` |
| `tool/` | 工具/技术 | `tool/MCP` `tool/python` `tool/editor` |
| `asset/` | 资产类型 | `asset/prefab` `asset/scene` `asset/anim` |
| `errorCode/` | 错误码分类 | `errorCode/BHV-001` `errorCode/ISO-003` |
| `ki/` | KI 类型 | `ki/error-book` `ki/decision` `ki/lesson` `ki/pattern` |
| `layer/` | 五层架构层 | `layer/PM` `layer/Agent` `layer/KI` |

### 3.4 Wikilinks 交叉引用

用 Obsidian 双向链接替代纯文本引用：

```markdown
<!-- 推荐：使用 wikilink + 显示别名 -->
- [[ERR-006__python-json-dump-prefab-id-shift|ERR-006]] — __id__ 索引错位

<!-- 不推荐：纯文本引用 -->
- ERR-006 — __id__ 索引错位
```

好处：
- 在 Obsidian 中点击即跳转
- 自动生成反向链接（backlinks）
- Agent 通过 MCP 的 backlinks 工具发现关联

---

## 4. Agent 知识召回机制

### 4.1 召回流程

Agent 在执行任务前自动触发两路召回：

```
用户需求 → 提取关键字（如 prefab, MCP, save）
                │
    ┌───────────┴───────────┐
    ▼                       ▼
  路径 A                  路径 B
  Error Book 召回          Pattern Book 召回
  scope: Error_Book/       scope: Internal_KI/patterns/
  结果: 强制约束            结果: 推荐参考
```

### 4.2 召回规则

| 规则 | 说明 |
|------|------|
| **源头拦截** | 在动手操作之前查，不是犯错后 debug 时查 |
| **匹配即遵守** | Error Book 命中的预防规则是**强制约束**，不是建议 |
| **犯过的错不再犯** | 已记录的错误模式复犯 = 严重事故 |
| **模式优先复用** | Pattern Book 命中时优先采用已验证的正确做法 |

### 4.3 MCP 工具对照

| Agent 需要 | 调用的 MCP 工具 | 说明 |
|-----------|----------------|------|
| 搜索知识 | `obsidian_global_search` | 关键字搜索，可限定路径范围 |
| 读取条目 | `obsidian_read_note` | 读取完整内容 |
| 查询元数据 | `obsidian_manage_frontmatter` | 获取 severity、status 等字段 |
| 更新条目 | `obsidian_update_note` | 修改内容（如 recurrence +1） |
| 管理标签 | `obsidian_manage_tags` | 增删标签 |

---

## 5. 日常操作

### 5.1 新增 Error Book 条目

1. 在 Obsidian 中，右键 `Error_Book/entries/` → New note
2. 使用 Templater：输入 `Ctrl/Cmd + T` 选择 `error_book_entry` 模板
3. 填写 frontmatter 字段和正文
4. 文件命名：`ERR-{NNN}__{kebab-case-slug}.md`（如 `ERR-009__unity-shader-compile.md`）
5. 在 `## 关联` 中用 `[[wikilinks]]` 链接相关条目

### 5.2 新增 Pattern Book 条目

1. 右键 `Internal_KI/patterns/` → New note
2. 使用模板 `pattern_entry`
3. 文件命名：`PAT-{NNN}__{kebab-case-slug}.md`（如 `PAT-006__unity-asset-import.md`）
4. 在 `complements` frontmatter 中链接对应的 Error 条目
5. 在 Error 条目的 `## 关联` 中反向链接回来

### 5.3 更新已有条目

- **错误复发**：`recurrence` +1，`status` 改为 `recurring`
- **错误解决**：`status` 改为 `resolved`
- **模式废弃**：`status` 改为 `deprecated`（永不删除）

### 5.4 Dataview 查询示例

在 Obsidian 中创建任意 .md 文件，插入 Dataview 代码块即可实时查询：

**查看所有 critical 且 recurring 的错误：**

````markdown
```dataview
TABLE severity, status, recurrence, prevention
FROM "Error_Book/entries"
WHERE severity = "critical" AND status = "recurring"
SORT recurrence DESC
```
````

**查看所有正确模式及其关联错误：**

````markdown
```dataview
TABLE title, status, complements
FROM "Internal_KI/patterns"
WHERE type = "pattern"
SORT created DESC
```
````

**查看某个标签下的所有条目：**

````markdown
```dataview
LIST
FROM #engine/cocos
SORT file.name ASC
```
````

---

## 6. Git 协作规范

### 6.1 什么提交，什么不提交

| 提交到 git | 不提交（.gitignore） |
|-----------|-------------------|
| `KI/.obsidian/plugins/` | `KI/.obsidian/workspace.json` |
| `KI/.obsidian/community-plugins.json` | `KI/.obsidian/workspace-mobile.json` |
| `KI/.obsidian/app.json` | `KI/.obsidian/graph.json` |
| `KI/.obsidian/appearance.json` | `KI/.obsidian/cache/` |
| `KI/.obsidian/core-plugins.json` | `toolBox/.mcp.json`（含个人 API Key） |
| 所有 entries/*.md | |
| 所有 patterns/*.md | |

### 6.2 新成员 Onboarding

1. `git clone` toolBox 仓库
2. 安装 Obsidian
3. "Open folder as vault" → 选择 `KI/` 目录
4. 插件会自动加载（配置已在 git 中）
5. 手动启用 Community plugins（首次需关闭安全模式）
6. 进入 Local REST API 设置，复制自己的 API Key
7. 在 toolBox 根目录创建 `.mcp.json`，填入自己的 API Key（参考 Section 2.5）
8. **重启 Claude Code**（`.mcp.json` 变更需要重启才生效）
9. 验证连接（参考 Section 2.6）

---

## 7. 故障排查

### Obsidian 未运行

**现象**：Agent 报 MCP 连接失败
**解决**：启动 Obsidian，确保 KI Vault 已打开

### MCP 工具不可用

**现象**：Agent 找不到 `obsidian_global_search` 工具
**检查**：
1. Obsidian 是否在运行？
2. Local REST API 插件是否启用？
3. `.mcp.json` 是否在 toolBox 根目录？
4. API Key 是否正确？
5. 端口 27124 是否被占用？（`lsof -i :27124`）
6. **修改 `.mcp.json` 后是否重启了 Claude Code？**（MCP 配置仅在启动时加载）

### npm 包名错误

**现象**：MCP Server 启动报 `npm error 404 Not Found`
**原因**：包名写错了。正确的包名是 `obsidian-mcp-server`，不是 `@cyanheads/obsidian-mcp-server`。
**验证**：`npx -y obsidian-mcp-server --help`

### SSL 证书错误

**现象**：MCP Server 启动后无法连接 Obsidian REST API
**原因**：Obsidian Local REST API 使用自签名 HTTPS 证书
**解决**：确保 `.mcp.json` 中包含 `"OBSIDIAN_VERIFY_SSL": "false"`

### 搜索无结果

**可能原因**：
1. 条目缺少 YAML frontmatter → 检查文件格式
2. 标签拼写错误 → 用 Tag Wrangler 检查
3. 搜索范围不对 → 确认 scope 路径正确

### 端口冲突

toolBox 的端口分配：

| 端口 | 用途 |
|------|------|
| 3000 | 游戏后端 |
| 3001 | Cocos MCP Server |
| 27124 | Obsidian Local REST API（默认） |

如果 27124 被占用，在 Obsidian 的 Local REST API 设置中更改端口，并同步更新 `.mcp.json` 中 `OBSIDIAN_BASE_URL` 的端口号。

---

## 8. 参考资料

- Obsidian 官方文档：https://help.obsidian.md
- Obsidian MCP Server：https://github.com/cyanheads/obsidian-mcp-server
- Local REST API 插件：在 Obsidian Community plugins 中搜索 "Local REST API"
- Dataview 文档：https://blacksmithgu.github.io/obsidian-dataview/
- toolBox 五层架构：`/toolBox/CLAUDE.md`
- Error Book 契约：`KI/Error_Book/contract.md`
- Internal_KI 契约：`KI/Internal_KI/contract.md`
