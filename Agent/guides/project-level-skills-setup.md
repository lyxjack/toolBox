# 项目级 Agent Skills 设置指南

> **本文件是全局级 Agent Skills 对项目级内容的完整指导。**
> 当一个项目引用全局 Agent Skills 并需要建立自己的项目级 Skills 时，必须按照本指南操作。
> 保证所有项目的一致性、可解读性和准确性。

## 1. 架构总览

```
全局级 (megaProject repo)                  项目级 (项目自己的 repo)
┌──────────────────────────────┐          ┌──────────────────────────────┐
│ Agent Skills 定义             │          │ 项目源码                      │
│ 治理规则 & 接口契约            │──指导──→│ 项目级 Skills 实例             │
│ Error_Book (全局共享)         │          │ - Internal_KI                │
│ 本指南                       │          │ - 项目级 Skills               │
│                              │          │                              │
│ 增删改 → 用户确认 → push      │          │ 增删改 → 用户确认 → push       │
│ repo: megaProject            │          │ repo: 项目自行指定             │
└──────────────────────────────┘          └──────────────────────────────┘
```

### 关键原则
- **全局级**定义能力和规范（做饭），**不存放**任何项目的实际数据
- **项目级**存放具体实现（菜谱），**跟项目走**，存入项目 repo
- **Error_Book 是例外**：全局级共享，跨所有项目，不跟项目走

## 2. 项目初始化步骤

### Step 1: 创建项目 CLAUDE.md

在项目根目录创建 `CLAUDE.md`，声明所有项目级内容：

```markdown
# {项目名} — {一句话描述}

## 技术栈
- Language: {语言}
- Framework: {框架}
- Test: {测试框架}

## Project-Level Content

### Internal KI（项目知识库）
- **接口契约**: `${TOOLBOX_ROOT}/KI/Internal_KI/contract.md`
- **路径**: `.claude/internal_ki/`
- **索引**: `.claude/internal_ki/index.json`
- **启用 Category**: {从 frontend, backend, data-logic, code-design 中选择}

开发前必须查询 Internal KI 中与当前任务相关的知识条目。

## Git
- **项目 Repo**: {项目的 GitHub repo 地址，如有}

## 文件治理
本项目遵循 `${TOOLBOX_ROOT}/Agent/rules/file_governance.md` 规范。
```

### Step 2: 创建 Internal_KI 目录结构

```bash
mkdir -p .claude/internal_ki/{frontend,backend,data-logic,code-design}
```

仅创建项目需要的 category 目录。参考 `KI/Internal_KI/contract.md` §3 确定启用哪些。

### Step 3: 初始化 Internal_KI 索引

创建 `.claude/internal_ki/index.json`：

```json
{
    "_meta": {
        "projectName": "{项目名}",
        "projectPath": "{项目绝对路径}",
        "version": "1.0",
        "lastUpdated": "{YYYY-MM-DD}",
        "categories": ["{启用的 category 列表}"]
    },
    "entries": []
}
```

### Step 4: 配置 .gitignore

确保脱敏相关文件不被推送：

```gitignore
# Sanitization (contains sensitive mappings)
.claude/sanitize.map
.claude/.backup-pre-push/
```

### Step 5: 配置脱敏映射（如项目有 repo）

创建 `.claude/sanitize.map`（参见 §6 脱敏原则）。

## 3. Internal_KI 条目管理

### 3.1 何时创建 KI 条目

| 触发时机 | 示例 |
|---------|------|
| 重大技术选型确定后 | 选定 TypeScript + Vitest |
| QA 通过后有可沉淀经验 | 发现 async 函数必须 try-catch |
| 某模式在项目中高频复用 | Result 类型在 15+ 处使用 |
| 确定项目级规则/约定后 | DTO 命名规范、API 错误响应格式 |

### 3.2 创建流程

1. **确定 category**：条目属于 frontend / backend / data-logic / code-design 中的哪个
2. **命名文件**：`{slug}.md`，kebab-case，最长 40 字符
3. **填写内容**：按 `KI/Internal_KI/contract.md` §5 的 .md 格式
4. **更新索引**：在 `index.json` 的 `entries` 数组中追加条目
5. **校验**：
   - [ ] 文件名 kebab-case
   - [ ] 放在正确的 category 目录下
   - [ ] index.json 已同步
   - [ ] ID 编号无冲突

### 3.3 Category 选择指南

| 你在做什么 | 选哪个 Category |
|-----------|----------------|
| UI 组件、样式、用户交互、前端错误展示 | `frontend` |
| API 设计、服务层、中间件、后端错误 fallback | `backend` |
| DTO、Schema、数据校验、数据库、数据流转 | `data-logic` |
| 设计模式、架构规则、命名约定、复用模式 | `code-design` |
| 跨领域的通用规则 | `code-design`（默认） |

## 4. Error_Book 使用说明

Error_Book 是**全局级**的，不需要在项目中创建。

- **位置**: `${TOOLBOX_ROOT}/KI/Error_Book/`
- **规范**: `KI/Error_Book/contract.md`
- **使用方式**: Agent 自动在所有项目中启用关键词召回

### 何时添加错题

当 Agent 犯了一个错误，用户希望 Agent 不再犯同样的错时：
1. 用户告知 Agent 这是一个错误
2. Agent 按 `KI/Error_Book/contract.md` §4 格式创建条目
3. 写入 `KI/Error_Book/entries/ERR-{NNN}__{slug}.md`
4. 更新 `KI/Error_Book/index.json`
5. keywords 字段必须填写，用于后续自动召回

## 5. 项目级 Git 推送规则

### 5.1 推送对象

| 内容 | 推到哪里 | 何时推送 |
|------|---------|---------|
| 全局 Agent Skills 变更 | megaProject repo (`main` 分支) | 用户确认后自动 commit & push |
| 项目级文件变更 | 项目自己的 repo | 用户确认后自动 commit & push |
| 项目级 Agent Skills 变更 | 项目自己的 repo | 用户确认后自动 commit & push |

### 5.2 Commit Message 格式

Conventional Commits：`{type}({scope}): {description}`

| type | 用途 |
|------|------|
| `feat` | 新增功能/条目 |
| `fix` | 修复 |
| `refactor` | 重构（不改变行为） |
| `docs` | 文档变更 |
| `chore` | 杂项（.gitignore 等） |

scope 为变更模块：`internal-ki`、`error-book`、`agent`、`governance` 等。

### 5.3 Agent 文件与项目文件分开 commit

同一次操作涉及 Agent 文件和项目文件时，必须分开 commit：
- Agent 文件：`.claude/` 目录、`CLAUDE.md`
- 项目文件：`src/`、配置文件等

## 6. 脱敏原则（全局级和项目级共用）

### 6.1 脱敏范围

| 敏感类型 | 替换为 |
|----------|--------|
| 本地绝对路径（toolBox） | `${TOOLBOX_ROOT}/` |
| 用户主目录路径 | `${USER_HOME}/` |
| 项目绝对路径 | `${PROJECT_ROOT}` |
| 用户名 | `${USER}` |
| GitHub 用户名 | `${GITHUB_USER}` |
| 硬编码数值（端口、密钥等） | `${对应占位符}` |

### 6.2 脱敏配置文件

每个有 repo 的项目/workspace 维护一个 `.claude/sanitize.map`：

```
# Format: SENSITIVE_VALUE<TAB>REPLACEMENT
${TOOLBOX_ROOT}/	${TOOLBOX_ROOT}/
${USER_HOME}/	${USER_HOME}/
{project_path}	${PROJECT_ROOT}
{username}	${USER}
```

此文件**必须在 .gitignore 中排除**，不得推送。

### 6.3 脱敏执行流程

1. 备份原文件
2. 按 sanitize.map 替换敏感内容
3. Commit & push 脱敏后的版本
4. 恢复原文件

### 6.4 脱敏报告（必须输出）

每次脱敏推送后，必须输出脱敏细则报告：

```
=== 脱敏报告 ===
文件: {filename}
  L{行号}: {原始值} → {替换值}
  L{行号}: {原始值} → {替换值}
文件: {filename}
  L{行号}: {原始值} → {替换值}
未脱敏文件: {不含敏感内容的文件列表}
```

## 7. 完整项目目录结构参考

```
{project}/
├── CLAUDE.md                          ← 项目入口（必需）
├── .gitignore                         ← 排除 sanitize.map 等
├── .claude/
│   ├── sanitize.map                   ← 脱敏映射（不推送）
│   ├── scripts/
│   │   └── sanitize-push.sh           ← 脱敏推送脚本
│   ├── internal_ki/                   ← 项目知识库
│   │   ├── index.json
│   │   ├── frontend/
│   │   ├── backend/
│   │   ├── data-logic/
│   │   └── code-design/
│   └── skills/                        ← 项目级技能（按需）
│       └── {skill-name}/
│           └── SKILL.md
└── src/                               ← 项目源码
```

注意：`error_book/` **不在项目中**，它是全局级资产，位于 `${TOOLBOX_ROOT}/KI/Error_Book/`。
