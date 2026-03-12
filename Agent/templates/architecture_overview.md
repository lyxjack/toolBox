# Agent Skills Init Manual

> **Purpose**: Self-contained operations manual for any LLM agent to understand and operate within the toolBox framework.
> **Version**: 2.0 | **Date**: 2026-03-09
> **Mission**: 读完本文档，任何具备文件读写能力的 AI Agent 都能正确初始化项目并按规范操作。

---

## §1 Minimum Agent Capability Requirements

### 必须能力（无则无法执行）

| 能力 | 用途 |
|------|------|
| 文件读取 | 读取契约、索引、知识条目 |
| 文件写入 | 创建 CLAUDE.md、index.json、KI 条目 |
| 目录创建 | 初始化项目目录结构 |
| Shell 命令执行 | `mkdir -p`、`git` 操作 |

### 推荐能力（有则效率更高）

| 能力 | 用途 |
|------|------|
| 多文件上下文 | 同时参考多个契约和索引 |
| 结构化 JSON 输出 | 生成 index.json、archive_manifest.json |
| Glob/Grep 搜索 | 快速定位文件和内容 |

### 降级模式

如果不具备文件写入能力：进入 **只读引用模式**。可以读取知识库、查询 Skill，但不能初始化项目或创建 KI 条目。所有写入操作需委托给具备写入能力的 Agent。

### 平台适配

| 平台 | 路径格式 | 示例 |
|------|---------|------|
| Windows | 正斜杠或反斜杠均可，推荐正斜杠 | `D:/toolBox/Agent/` |
| macOS/Linux | 正斜杠 | `/Users/{user}/toolBox/Agent/` |

toolBox 根目录在本文档中记为 `{TOOLBOX}` 或 `{TOOLBOX_ROOT}`（同义）。Agent 运行时根据当前操作系统解析为实际绝对路径。

---

## §2 Architecture Overview — Global vs Project

### 两层心智模型

对外部 Agent 而言，关键区分是 **全局共享** vs **项目私有**。

```
┌─────────────────────────────────────────────────────────────┐
│                    Global Tier（全局共享）                     │
│  治理规则 · External Skills · Error Book · 接口契约            │
│  存放在 {TOOLBOX_ROOT}，跨所有项目生效                         │
├─────────────────────────────────────────────────────────────┤
│                    Project Tier（项目私有）                    │
│  CLAUDE.md · Internal KI · In-Process · Project Skills      │
│  存放在 {project}/，跟项目走，存入项目 repo                    │
└─────────────────────────────────────────────────────────────┘
```

### Global Tier — 全局共享资产

| 资产 | 路径 | 职责 |
|------|------|------|
| 治理规则 | `Agent/rules/` | 铁律、宪法、QA 标准、文件治理——不可违反 |
| 角色与工作流 | `Agent/roles/`, `Agent/workflow/` | PM、CTO、QA 角色定义和状态机 |
| External Skills 索引 | `KI/External_KI/` | 88 个 Skill 的索引、类别、质量审计 |
| Skill 源仓库 | `Tool/` | 15 个 git clone 仓库（**只读**） |
| Error Book | `KI/Error_Book/` | 全局错题本——跨项目共享的负向知识 |
| 接口契约 | `KI/Internal_KI/contract.md`, `In-Process/contract.md` | 定义项目级目录的标准结构 |
| Skill Registry | `Agent/index/skill_registry.json` | 全局技能注册和启用状态 |

### Project Tier — 项目私有资产

| 资产 | 路径（相对项目根） | 职责 |
|------|-------------------|------|
| 项目规则 | `CLAUDE.md` | 项目入口——技术栈、启用的 KI 类别、路径声明 |
| Internal KI | `.claude/Internal_KI/` | 项目级正向知识（应该怎么做） |
| In-Process | `.in-process/` | 运行期工件（需求包、执行计划、QA 报告等） |
| Project Skills | `.claude/skills/` | 项目级自定义技能（按需） |

### Golden Rule

> **全局定义契约，项目创建实例。**
>
> - 全局层的 `contract.md` 定义"长什么样"
> - 项目层按契约创建实际数据
> - Error Book 是例外：数据直接存全局，跨项目共享

---

## §3 File Governance

### 目录命名规则

| 规则 | 要求 |
|------|------|
| 格式 | kebab-case，全小写 |
| 字符集 | `[a-z0-9-]` |
| 长度 | 最长 30 字符 |
| 禁止 | 空格、下划线、大写字母、中文 |

### 固定名文件

这些文件名不可更改：`index.json`、`CLAUDE.md`、`SKILL.md`、`contract.md`

### 条目命名

| 类型 | 命名模式 | 示例 |
|------|---------|------|
| KI 条目 | `{slug}.md` | `result-type-pattern.md` |
| Error Book 条目 | `ERR-{NNN}__{slug}.md` | `ERR-001__unhandled-rejection.md` |
| slug 格式 | kebab-case，最长 40 字符 | — |
| ID 格式 | `KI-{NNN}` 或 `ERR-{NNN}`（三位数） | `KI-003`, `ERR-012` |
| 分隔符 | 双下划线 `__` | — |

### 索引同步铁律

> **任何文件的增删改，必须同步更新对应的 index.json。违反此规则的操作无效。**

### 边界执行表

写文件前查此表确认：

| 想写什么 | 放到哪里 | 禁止放到 |
|---------|---------|---------|
| Skill 源仓库 | `Tool/` | 任何其他目录 |
| Skill 索引/审计 | `KI/External_KI/` | `Tool/`、项目目录 |
| 治理规则/模板/编排 | `Agent/` | `KI/`、`Tool/` |
| 需求入口文件 | `PM/` | `Agent/`、`KI/` |
| 接口契约 | `In-Process/contract.md`, `KI/Internal_KI/contract.md` | 项目目录 |
| 全局错题 | `KI/Error_Book/entries/` | 项目目录 |
| 项目 KI 条目 | `{project}/.claude/Internal_KI/{category}/` | 全局 `KI/` |
| 运行期工件 | `{project}/.in-process/` | 全局 `In-Process/` |
| 临时文件 | `{project}/.in-process/scratch/` | 项目根目录 |

---

## §4 Project-Level Directory Structure

```
{project}/
├── CLAUDE.md                              ← 项目入口（必需）
├── .gitignore
├── .claude/
│   ├── Internal_KI/                       ← 项目知识库
│   │   ├── index.json                     ← KI 索引（必需）
│   │   ├── frontend/                      ← 按需启用
│   │   │   └── {slug}.md
│   │   ├── backend/
│   │   │   └── {slug}.md
│   │   ├── data-logic/
│   │   │   └── {slug}.md
│   │   └── code-design/
│   │       └── {slug}.md
│   └── skills/                            ← 项目级技能（按需）
│       └── {skill-name}/
│           └── SKILL.md
├── .in-process/                           ← 运行期过程文件
│   ├── active/                            ← 当前活跃 run（最多 1 个）
│   │   └── {YYYYMMDD-HHMMSS}/
│   ├── archive/                           ← 已完成 run（90 天保留）
│   ├── audit/                             ← 审计记录（永不删除）
│   ├── index/
│   │   └── archive_manifest.json          ← 归档索引
│   └── scratch/                           ← 临时文件（session 结束清理）
└── src/                                   ← 项目源码
```

### Internal KI 四个基础 Category

| Category | 覆盖范围 | 启用条件 |
|----------|---------|---------|
| `frontend` | UI 组件、样式、前端交互规则 | 项目含前端代码 |
| `backend` | API、服务层、中间件、错误 fallback | 项目含后端代码 |
| `data-logic` | DTO、Schema、数据校验、数据库 | 项目含数据处理 |
| `code-design` | 设计模式、架构规则、命名约定 | 所有项目（默认启用） |

仅创建项目需要的 category 目录。不启用的不创建。

---

## §5 Init Protocol

### 前置条件

- [ ] Agent 具备文件写入和目录创建能力（见 §1）
- [ ] 已确定项目名称、绝对路径、技术栈
- [ ] 已确定需要启用哪些 Internal KI category

### Step 1: 创建 CLAUDE.md

在项目根目录创建 `CLAUDE.md`：

```markdown
# {项目名} — {一句话描述}

## 技术栈
- Language: {语言}
- Framework: {框架}
- Test: {测试框架}

## Project-Level Content

### Internal KI（项目知识库）
- **接口契约**: `{TOOLBOX_ROOT}/KI/Internal_KI/contract.md`
- **路径**: `.claude/Internal_KI/`
- **索引**: `.claude/Internal_KI/index.json`
- **启用 Category**: {从 frontend, backend, data-logic, code-design 中选择}

开发前必须查询 Internal KI 中与当前任务相关的知识条目。

### In-Process（运行期过程文件）
- **接口契约**: `{TOOLBOX_ROOT}/In-Process/contract.md`
- **路径**: `.in-process/`
- **索引**: `.in-process/index/archive_manifest.json`

## Git
- **项目 Repo**: {GitHub repo 地址，如有}

## 文件治理
本项目遵循 `{TOOLBOX_ROOT}/Agent/rules/file_governance.md` 规范。
```

### Step 2: 创建 Internal KI 目录 + index.json

创建目录（仅启用需要的 category）：

```bash
mkdir -p .claude/Internal_KI/{frontend,backend,data-logic,code-design}
```

创建 `.claude/Internal_KI/index.json`：

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

### Step 3: 创建 In-Process 目录 + archive_manifest.json

```bash
mkdir -p .in-process/{active,archive,audit,index,scratch}
```

创建 `.in-process/index/archive_manifest.json`：

```json
{
    "_meta": {
        "projectName": "{项目名}",
        "projectPath": "{项目绝对路径}",
        "description": "Archive index — all completed run records",
        "version": "1.0",
        "lastUpdated": "{YYYY-MM-DD}"
    },
    "entries": [],
    "lifecycle": {
        "activeRetention": "until completion or cancellation",
        "archiveRetention": "90 days",
        "auditRetention": "permanent",
        "scratchRetention": "session-scoped, cleared at session end"
    }
}
```

### Step 4: 配置 .gitignore

追加以下规则到 `.gitignore`：

```gitignore
# Agent Skills — sensitive files
.claude/sanitize.map
.claude/.backup-pre-push/

# In-Process runtime files
.in-process/active/
.in-process/scratch/
```

### Step 5: 验证 Checklist

- [ ] `CLAUDE.md` 存在于项目根目录
- [ ] `.claude/Internal_KI/index.json` 存在且 JSON 合法
- [ ] `.claude/Internal_KI/` 下有且仅有启用的 category 目录
- [ ] `.in-process/` 下有 `active/`、`archive/`、`audit/`、`index/`、`scratch/` 五个子目录
- [ ] `.in-process/index/archive_manifest.json` 存在且 JSON 合法
- [ ] `.gitignore` 包含敏感文件排除规则

### Step 6: 输出报告

Init 完成后，向用户输出：

```
=== Project Init Report ===
Project: {项目名}
Path: {项目绝对路径}
Created:
  ✓ CLAUDE.md
  ✓ .claude/Internal_KI/index.json
  ✓ .claude/Internal_KI/{启用的 category 列表}
  ✓ .in-process/{active,archive,audit,index,scratch}
  ✓ .in-process/index/archive_manifest.json
  ✓ .gitignore (updated)
Enabled KI Categories: {列表}
Ready for: /pm workflow
```

---

## §6 Workflow Overview

### 状态机

```
PM_ANALYSIS ──Gate1──▶ CTO_PLANNING ──Gate2──▶ EXECUTION ──Gate3──▶ QA_VERIFICATION
                                                   ▲                       │
                                                   │     Rework Order      │
                                                   └──────────────────────┘
                                                                           │
                                                              Gate4        ▼
                                                         JOINT_APPROVAL ──Gate5──▶ DELIVERED
```

### Phase / Role / Output / Gate

| Phase | Role | Output | Gate |
|-------|------|--------|------|
| PM_ANALYSIS | PM | `requirement_package.md` | Gate1: 需求包完整性 |
| CTO_PLANNING | CTO | `execution_plan.md` + `task_dag.json` | Gate2: 计划 + DAG 批准 |
| EXECUTION | Executor | `change_manifests/T{n}_manifest.json` | Gate3: 所有 manifest 已提交 |
| QA_VERIFICATION | QA | `qa_report.md` (PASS) 或 `rework_order.json` (FAIL) | Gate4: 五层 QA PASS |
| JOINT_APPROVAL | CTO + PM | `delivery_cert.md` | Gate5: CTO + PM 双签 |

### 三种执行模式

| 模式 | 适用场景 | 特点 |
|------|---------|------|
| **串行 (Serial)** | 强依赖、高耦合、核心流程改造 | 按依赖顺序逐个执行 |
| **并发 (Parallel)** | 独立模块、低重叠 | 多任务同时执行 |
| **蜂群 (Swarm)** | 探索性、多方案对比 | 多 Agent 独立探索，合并最优 |

CTO 在 CTO_PLANNING 阶段选择执行模式。详见 `Agent/orchestrator/strategy.md`。

---

## §7 11 Iron Laws

紧凑速查表。完整描述见 `Agent/rules/iron_laws.md`。

| # | Name | 一句话 |
|---|------|--------|
| 1 | NO REQUIREMENT, NO EXECUTION | 无需求包不得实现 |
| 2 | NO PLAN, NO CODE | 无计划不得写代码 |
| 3 | REUSE BEFORE BUILD | 先查已有能力再新建 |
| 4 | SOURCE PRESERVATION | `Tool/` 只读，严禁修改 |
| 5 | QA IS A GATE | 无 QA 证据不得声称完成 |
| 6 | NO CI-ONLY APPROVAL | 不得仅凭编译通过放行 |
| 7 | REJECTION REQUIRES REASON CODE | QA 驳回必须带原因码 |
| 8 | ARTIFACTS STAY CURRENT | 工件必须与实际一致 |
| 9 | TEMP FILES ARE MANAGED | 临时文件纳入 `.in-process/scratch/` |
| 10 | PLAN-DRIVEN MODE | 大变更必须先有 plan 工件 |
| 11 | SKILL FILE GOVERNANCE | Skill 增删必须同步更新索引 |

---

## §8 Knowledge Cycle

### Internal KI — 项目级正向知识（应该怎么做）

| 维度 | 说明 |
|------|------|
| **是什么** | 经过验证的、可操作的项目规则和模式 |
| **在哪里** | `{project}/.claude/Internal_KI/{category}/{slug}.md` |
| **索引** | `{project}/.claude/Internal_KI/index.json` |
| **何时创建** | QA 通过后、重大技术选型确定后、高频复用模式验证后 |
| **生命周期** | 跟项目走，status: active → deprecated，不物理删除 |
| **接口契约** | `KI/Internal_KI/contract.md` |

### Error Book — 全局级负向知识（不应该怎么做）

| 维度 | 说明 |
|------|------|
| **是什么** | Agent 犯过的错误记录，含根因、修复方案、预防规则 |
| **在哪里** | `KI/Error_Book/entries/ERR-{NNN}__{slug}.md` |
| **索引** | `KI/Error_Book/index.json` |
| **优先级** | Error Book 召回 **优先于** Internal KI 查询 |
| **触发机制** | 用户指令中的关键词与 `keywords` 字段匹配时自动召回 |
| **接口契约** | `KI/Error_Book/contract.md` |

### 知识流向

```
项目执行
  │
  ├── 正向经验 ──▶ Internal KI（项目级，跟项目走）
  │
  └── 负向教训 ──▶ Error Book（全局级，跨项目共享）
                       │
                       ▼
                 下一个项目自动召回
```

---

## §9 Artifact Lifecycle

| 存储位置 | 内容 | 保留策略 | 可删除 |
|---------|------|---------|--------|
| `.in-process/active/` | 当前活跃 run 工件 | 直到 DELIVERED | 归档后移除 |
| `.in-process/archive/` | 已完成 run 全套工件 | **90 天** | 90 天后可清理 |
| `.in-process/audit/` | 审计记录 | **永久** | 永不删除 |
| `.in-process/index/` | archive_manifest.json | **永久** | 永不删除 |
| `.in-process/scratch/` | 临时文件 | **session** | session 结束即清理 |
| `.claude/Internal_KI/` | 项目知识条目 | **项目生命周期** | 仅标记 deprecated |

### 生命周期操作

| 时机 | 操作 |
|------|------|
| Session 开始 | 检查 `scratch/` 残留 → 清理或 promote；检查 `active/` 旧 run → 归档 |
| Run 完成 | `active/{id}/` → `archive/{id}/`；更新 `archive_manifest.json` |
| Session 结束 | 清空 `scratch/`（已 promote 的除外） |
| 定期维护 | 清理 `archive/` 中超 90 天的 run；导出关键 findings 到 Internal KI |

---

## §10 Quick Reference — Key File Paths

### 全局级（相对 `{TOOLBOX_ROOT}`）

| 文件 | 路径 |
|------|------|
| 全局 CLAUDE.md | `CLAUDE.md` |
| 宪法 | `Agent/rules/constitution.md` |
| 铁律 | `Agent/rules/iron_laws.md` |
| 文件治理 | `Agent/rules/file_governance.md` |
| QA 标准 | `Agent/rules/qa_standard.md` |
| 工件生命周期 | `Agent/rules/artifact_lifecycle.md` |
| 计划驱动模式 | `Agent/rules/plan_driven_mode.md` |
| 编排策略 | `Agent/orchestrator/strategy.md` |
| Skill Registry | `Agent/index/skill_registry.json` |
| Skill 主索引 | `KI/External_KI/master_index.json` |
| Error Book 索引 | `KI/Error_Book/index.json` |
| Error Book 条目 | `KI/Error_Book/entries/` |
| Internal KI 契约 | `KI/Internal_KI/contract.md` |
| In-Process 契约 | `In-Process/contract.md` |
| Error Book 契约 | `KI/Error_Book/contract.md` |
| 项目初始化指南 | `Agent/guides/project-level-skills-setup.md` |
| 本文档 | `Agent/templates/architecture_overview.md` |

### 项目级（相对项目根）

| 文件 | 路径 |
|------|------|
| 项目 CLAUDE.md | `CLAUDE.md` |
| Internal KI 索引 | `.claude/Internal_KI/index.json` |
| Internal KI 条目 | `.claude/Internal_KI/{category}/{slug}.md` |
| Archive Manifest | `.in-process/index/archive_manifest.json` |
| 活跃 Run | `.in-process/active/{YYYYMMDD-HHMMSS}/` |
| 审计记录 | `.in-process/audit/` |
| 临时文件 | `.in-process/scratch/` |
