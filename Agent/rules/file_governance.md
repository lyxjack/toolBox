# 文件治理规范

> **本文件是全局级文件治理的总纲。**
> 覆盖 Agent Skills 相关的所有文件:全局级和项目级。
> Agent Skills 的增删改操作必须强制执行本规范。

## 1. 治理范围

### 1.1 全局级(公有 Workspace)

| 位置 | 内容 | 治理要求 |
|------|------|---------|
| `~/.claude/skills/` (用户全局) | 全局 Agent Skills | SKILL.md frontmatter 规范 |
| `{TOOLBOX}/README.md` | 开源入口文档 | 根目录白名单允许 |
| ``{TOOLBOX}/KI/Internal_KI/`` | Internal_KI 接口定义 | 仅存 `contract.md`,不存项目数据 |
| ``{TOOLBOX}/KI/Error_Book/`` | 全局 Error_Book(数据+规范) | `contract.md` + `index.json` + `entries/` |
| ``{TOOLBOX}/In-Process/`` | In-Process 接口定义 | 仅存 `contract.md`,不存项目数据 |
| ``{TOOLBOX}/Agent/templates/project_scaffold/`` | 项目脚手架模板 | 定义项目初始结构 |
| ``{TOOLBOX}/Agent/index/`` | 全局 Skill Registry | 全局技能索引 |

### 1.2 项目级(跟项目走)

| 位置 | 内容 | 接口契约 |
|------|------|---------|
| `{project}/.claude/Internal_KI/` | 项目知识库 | `KI/Internal_KI/contract.md` |
| `{project}/.in-process/` | 运行期过程文件 | `In-Process/contract.md` |
| `{project}/.claude/skills/` | 项目级技能 | SKILL.md frontmatter 规范 |
| `{project}/CLAUDE.md` | 项目规则声明 | 必须声明所有项目级内容路径 |

## 2. 文件夹层级规范

### 2.1 项目标准目录结构

```
{project}/
├── CLAUDE.md                          ← 项目入口(必需)
├── .claude/
│   ├── Internal_KI/                   ← 项目知识库(按需)
│   │   ├── index.json                 ← KI 索引
│   │   ├── frontend/                  ← 基础 category
│   │   ├── backend/
│   │   ├── data-logic/
│   │   └── code-design/
│   │                                  (Error_Book 为全局级,见 KI/Error_Book/)
│   └── skills/                        ← 项目级技能(按需)
│       └── {skill-name}/
│           └── SKILL.md
├── .in-process/                       ← 运行期过程文件(按需)
│   ├── active/                        ← 当前活跃 run
│   ├── archive/                       ← 已完成 run(90 天保留)
│   ├── audit/                         ← 审计记录(永久)
│   ├── index/
│   │   └── archive_manifest.json      ← 归档索引
│   └── scratch/                       ← 临时文件(session 清理)
│                                      (接口契约见 In-Process/contract.md)
└── src/                               ← 项目源码
```

### 2.2 目录命名规则

| 规则 | 要求 |
|------|------|
| 格式 | kebab-case,全小写 |
| 长度 | 最长 30 字符 |
| 字符集 | `[a-z0-9-]` |
| 禁止 | 空格、下划线(下划线仅用于文件名分隔符)、大写字母、中文 |

## 3. 文件命名规范

### 3.1 通用规则

| 规则 | 要求 |
|------|------|
| 固定名文件 | `index.json`、`CLAUDE.md`、`SKILL.md`、`contract.md` — 名称不可变 |
| 条目文件 | `{slug}.md`(KI)或 `{ID}__{slug}.md`(Error Book) |
| slug 格式 | kebab-case,最长 40 字符 |
| ID 格式 | `KI-{NNN}` 或 `ERR-{NNN}`,三位数序号 |
| 分隔符 | 双下划线 `__` 分隔 ID 与 slug |
| 禁止 | 空格、中文、特殊字符 |

### 3.2 各文件类型命名

| 文件类型 | 命名模式 | 示例 |
|----------|---------|------|
| KI 条目 | `{slug}.md` | `result-type-pattern.md` |
| Error Book 条目 | `ERR-{NNN}__{slug}.md` | `ERR-001__unhandled-rejection.md` |
| SKILL 定义 | `SKILL.md`(固定) | `skills/pm/SKILL.md` |
| 索引文件 | `index.json`(固定) | `.claude/Internal_KI/index.json` |
| 接口契约 | `contract.md`(固定) | `KI/Internal_KI/contract.md` |

## 4. 文件内容格式规范

### 4.1 SKILL.md

必须包含 YAML frontmatter:
```yaml
---
name: {skill-name}           # 必填,kebab-case
description: {触发描述}       # 必填,说明何时触发
version: "1.0"                # 必填
created: YYYY-MM-DD           # 必填
lastUpdated: YYYY-MM-DD       # 必填
---
```

### 4.2 index.json

必须包含 `_meta` 块:
```json
{
    "_meta": {
        "projectName": "string",
        "projectPath": "string",
        "version": "string",
        "lastUpdated": "YYYY-MM-DD"
    }
}
```

### 4.3 KI 条目 .md

格式见 `KI/Internal_KI/contract.md` §5。

### 4.4 Error Book 条目 .md

格式见 `KI/Error_Book/contract.md` §4。

## 5. 生命周期规范

### 5.1 项目级内容生命周期

| 阶段 | 触发 | 操作 | 索引同步 |
|------|------|------|---------|
| **创建** | 新条目产生 | 写入对应目录 | 必须同步更新 index.json |
| **更新** | 内容变更 | 修改条目文件 | 必须更新 index.json 的 lastVerified/lastUpdated |
| **废弃** | 不再适用 | status → deprecated | 必须更新 index.json |
| **归档** | 项目关闭 | 整个 `.claude/` 随项目归档 | — |

### 5.2 全局级内容生命周期

| 内容 | 生命周期 | 可删除 |
|------|---------|--------|
| 接口契约 (contract.md) | 永久 | 否 |
| 全局 Skill (SKILL.md) | 永久,可 deprecated | 否 |
| 项目脚手架模板 | 永久 | 否 |

## 6. 索引同步强制规则

> **铁律:任何文件的增删改,必须同步更新对应的 index.json。违反此规则的操作无效。**

### 6.1 同步矩阵

| 操作 | 文件变更 | index.json 变更 |
|------|---------|----------------|
| 新增 KI 条目 | 创建 `{category}/{slug}.md` | 追加 entry |
| 修改 KI 条目 | 修改 .md 文件 | 更新 lastVerified |
| 废弃 KI 条目 | 不删除 .md | status → deprecated |
| 新增错题 | 创建 `entries/ERR-{NNN}__{slug}.md` | 追加 entry |
| 错误复发 | 更新 .md | recurrence +1, status → recurring |

## 7. Agent Skills 增删改的强制检查清单

### 7.1 新增 Skill

- [ ] SKILL.md 包含完整 frontmatter(name, description, version, created, lastUpdated)
- [ ] 目录名与 name 字段一致(kebab-case)
- [ ] 全局 Skill 已更新 `Agent/index/skill_registry.json`
- [ ] 无重复技能(已查 `Agent/index/duplicate_review.json`)

### 7.2 新增 KI 条目

- [ ] 文件名符合 `{slug}.md` 规范
- [ ] 放置在正确的 category 目录下
- [ ] 内容格式符合 contract.md §5
- [ ] index.json 已同步更新
- [ ] ID 编号无冲突

### 7.3 新增 Error Book 条目

- [ ] 文件名符合 `ERR-{NNN}__{slug}.md` 规范
- [ ] 放置在 `entries/` 目录下
- [ ] keywords 字段已定义(用于召回)
- [ ] index.json 已同步更新
- [ ] ID 编号无冲突

### 7.4 修改/删除

- [ ] index.json 已同步更新
- [ ] 不物理删除,仅标记 deprecated(KI)或 resolved(Error Book)
