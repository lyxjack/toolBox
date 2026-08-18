# Global — toolBox Enterprise AI Agent Workspace

> **使用说明**: 此为全局 `~/.claude/CLAUDE.md` 模板。
> 将 `{TOOLBOX_ROOT}` 替换为你的 toolBox 实际绝对路径后,保存到 `~/.claude/CLAUDE.md`。
>
> **路径示例**:
> - macOS: `/Users/<username>/toolBox`
> - Windows: `C:\Users\<username>\toolBox`
> - Linux: `/home/<username>/toolBox`
>
> **注意**: 全局 CLAUDE.md 是可选配置。如果你只在 toolBox 目录内使用 Claude Code,
> 项目级 `CLAUDE.md` 和 `.claude/commands/` 已提供全部能力,无需配置全局文件。
> 全局 CLAUDE.md 的作用是让你在 **其他项目目录** 中也能引用 toolBox 的治理规则和工作流。

> **toolBox 根目录**: `{TOOLBOX_ROOT}/`
> 本文件为全局规则,在任何工作目录下的 Claude Code 会话中均生效。
> 所有路径均为绝对路径。

## Five-Layer Architecture

本系统采用五层架构,每层职责单一、边界清晰。

| 层 | 绝对路径 | 职责 |
|----|----------|------|
| **PM** | `{TOOLBOX_ROOT}/PM/` | 唯一入口层:需求接收、标准化、分类、路由 |
| **Agent** | `{TOOLBOX_ROOT}/Agent/` | 治理与编排层:角色、规则、工作流、调度策略 |
| **KI** | `{TOOLBOX_ROOT}/KI/` | 核心知识资产层:External_KI、Internal_KI、Error_Book |
| **Tool** | `{TOOLBOX_ROOT}/Tool/` | 外部原始资源层:git clone 的 skill 仓库(只读) |
| **In-Process** | `{TOOLBOX_ROOT}/In-Process/` | 运行期过程文件层:仅存接口契约(`contract.md`),实际数据在各项目的 `.in-process/` 中 |

## Hard Constraint — 五层架构文件治理

> **所有对 `{TOOLBOX_ROOT}/` 的文件创建、移动、删除操作必须严格遵守五层架构边界。** 这是不可协商的强约束。

| 规则 | 描述 |
|------|------|
| **根目录纯净** | `{TOOLBOX_ROOT}/` 根目录只允许存在 `Agent/`、`In-Process/`、`KI/`、`PM/`、`Tool/` 五个业务目录,以及以下配置/文档/基础设施文件: `CLAUDE.md`、`README.md`、`LICENSE`、`package.json`、`.gitignore`、`VERSION`、`CHANGELOG.md`、`bootstrap.sh`。禁止创建任何其他业务文件夹或散落文件。 |
| **层间不越界** | 每层只存放属于该层职责的文件。PM 层不存代码,Agent 层不存原始 skill,Tool 层不存治理文档,KI 层不存过程文件,In-Process 层不存永久知识。 |
| **写入路径白名单** | Skill 源仓库 → `Tool/`;索引与知识 → `KI/`;治理规则/模板/编排 → `Agent/`;需求入口 → `PM/`;接口契约 → `In-Process/contract.md`;运行期工件 → 各项目的 `.in-process/`。不在白名单内的路径禁止写入。 |
| **无冗余副本** | 同一文件不得在多个层中存在副本。如需引用,使用路径引用而非复制。 |

## 双层记忆体系 — claude-mem × Obsidian KI

| 层 | 定位 | 性质 |
|----|------|------|
| **claude-mem** | 会话级短期记忆(自动捕获工具调用与会话摘要,SQLite 本地库)。用途:会话连续性 — "上次做了什么 / 之前怎么改的 / 接续未完成工作" | **参考上下文,不构成约束** |
| **Obsidian KI Vault** | 策展长期知识(7 大类) | Error_Book 命中 = 强制约束;Pattern Book 命中 = 推荐参考(语义不变) |

- **优先级**: Error_Book(强制)> Pattern Book(推荐)> claude-mem session 上下文(参考)。
- **召回入口**: mem-search skill(claude-mem 内置);worker 不可用时降级 `sqlite3 ~/.claude-mem/claude-mem.db` 只读查询;两者都不可用 → 跳过 mem 召回,不阻塞流程。
- **触发时机**: 任务延续既往 session、用户提及历史工作、或 PM/CTO 需要近期变更上下文时查 mem;纯新任务或纯知识性问题查 Obsidian 即可。
- **双向关联**: 所有新建 Obsidian entry 必须含 `mem_ref` / `mem_status` frontmatter 字段(详见 `{TOOLBOX_ROOT}/KI/Internal_KI/contract.md` § 3.8)。
- **安装**: claude-mem 由 bootstrap/migration 自动安装(plugin marketplace `thedotmack`,v13.5.0+);worker 端口 = 37700+(uid%100),注册见 `{TOOLBOX_ROOT}/Agent/index/skill_registry.json#externalPlugins`。

## Iron Laws (不可违反)

完整内容见 `{TOOLBOX_ROOT}/Agent/rules/iron_laws.md`。

1. **NO REQUIREMENT, NO EXECUTION** — 无需求包不得实现
2. **NO PLAN, NO CODE** — 无计划不得写代码
3. **REUSE BEFORE BUILD** — 先查 `{TOOLBOX_ROOT}/KI/External_KI/` 和现有代码再新建
4. **SOURCE PRESERVATION** — 不得修改/删除 `{TOOLBOX_ROOT}/Tool/` 中原始 skill 源文件
5. **QA IS A GATE** — 无 QA 证据不得声称完成
6. **NO CI-ONLY APPROVAL** — 不得仅凭编译通过放行
7. **REJECTION REQUIRES REASON CODE** — 驳回必须带原因码
8. **ARTIFACTS STAY CURRENT** — 工件必须与实际一致
9. **TEMP FILES ARE MANAGED** — 临时文件纳入项目 `.in-process/scratch/` 管理
10. **PLAN-DRIVEN MODE FOR LARGE CHANGES** — 大变更必须先有 plan 工件
11. **SKILL FILE GOVERNANCE** — Skill 增删必须同步更新索引、注册、去重审查
12. **ROYAL SALUTATION (CONTEXT CANARY)** — 会话回复开头必称「陛下」,结尾以「臣告退 陛下万岁万岁万万岁」收束;缺失即上下文丢失警报。适用判定=消费者是谁:仅用户亲读的会话回复正文;程序/agent/格式契约消费一律豁免,契约优先。禁止用 hook 注入本规则(注入使金丝雀失效);本律只存在于启动加载的全局指令中
13. **PREFAB NODES ARE BUILT IN EDITOR, NOT IN CODE** — prefab 一律编辑器内可见可拖的实体节点;运行期代码只填数据不造结构;仅数据驱动集合允许克隆且模板须为 prefab 内可见节点;拿不准按静态处理

## Workflow Entry Points

- `/pm` — 所有正式开发请求的唯一入口。触发 PM → CTO → Execution → QA → Joint Approval 闭环。
- `/init` — toolBox bootstrap & update 统一入口。新用户全量初始化,老用户增量迁移。终端等价命令: `bash bootstrap.sh`。

## Key Governance Docs

- Constitution: `{TOOLBOX_ROOT}/Agent/rules/constitution.md`
- Iron Laws: `{TOOLBOX_ROOT}/Agent/rules/iron_laws.md`
- Plan-Driven Mode: `{TOOLBOX_ROOT}/Agent/rules/plan_driven_mode.md`
- QA Standard: `{TOOLBOX_ROOT}/Agent/rules/qa_standard.md`
- Artifact Lifecycle: `{TOOLBOX_ROOT}/Agent/rules/artifact_lifecycle.md`
- Project Rules: `{TOOLBOX_ROOT}/Agent/rules/project_rules.md`
- Orchestration Strategy: `{TOOLBOX_ROOT}/Agent/orchestrator/strategy.md`
- Skill Registry: `{TOOLBOX_ROOT}/Agent/index/skill_registry.json`
- Master Index: `{TOOLBOX_ROOT}/KI/External_KI/master_index.json`
- File Governance: `{TOOLBOX_ROOT}/Agent/rules/file_governance.md`
- Internal_KI Contract: `{TOOLBOX_ROOT}/KI/Internal_KI/contract.md`
- In-Process Contract: `{TOOLBOX_ROOT}/In-Process/contract.md`
- Error_Book Contract: `{TOOLBOX_ROOT}/KI/Error_Book/contract.md`
- Project-Level Setup Guide: `{TOOLBOX_ROOT}/Agent/guides/project-level-skills-setup.md`

## Execution Modes

CTO 在规划阶段必须选择执行模式(详见 `{TOOLBOX_ROOT}/Agent/orchestrator/strategy.md`):
- **串行 (Serial)**: 强依赖、高耦合、核心流程改造
- **并发 (Parallel)**: 独立、低重叠、可并行测试
- **蜂群 (Swarm)**: 探索性、多方案对比、大规模知识提炼
