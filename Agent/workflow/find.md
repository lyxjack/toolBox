---
description: 整合性 Skill 发现、学习、分类、入库工作流。唯一入口 /find。串联 find-skills → Skill Seekers → skill_ingestion。
---

# /find — Skill 发现与入库整合工作流

## 前置约束 — Skill/KI 子门禁
> 进入本工作流时,以下铁律自动生效(全文见 `Agent/rules/iron_laws.md`)。

| 铁律 | 一句话 | 门禁效果 |
|------|--------|---------|
| **IL 04** | SOURCE PRESERVATION | Tool/ 中源文件只读 |
| **IL 11** | SKILL FILE GOVERNANCE | Skill 增删改必须同步所有索引 |
| **IL 03** | REUSE BEFORE BUILD | 先查现有能力再新建 |

## 能力来源(只引用,不复述)

| 能力 | 源文件 | 用途 |
|------|--------|------|
| **find-skills** | `{TOOLBOX}/Tool/find-skills/SKILL.md` | Phase 1: 搜索开放生态 |
| **Skill Seekers** | `{TOOLBOX}/Tool/Skill_Seekers/AGENTS.md`、`{TOOLBOX}/Tool/Skill_Seekers/CLAUDE.md` | Phase 2-3: 深度学习与分析 |
| **Skill Ingestion** | `{TOOLBOX}/Agent/workflow/skill_ingestion.md` | Phase 4-5: 分类与增量入库 |

> **执行时必须读取上述源文件获取具体操作指令。本工作流只定义串联逻辑和阶段交接。**

---

## Phase 1: 搜索(find-skills)

**输入**: 用户通过 `/find` 描述需要的技能方向。

### Step 1.1 — 查重
先查 `{TOOLBOX}/KI/External_KI/master_index.json` 的 `quickLookup`,确认现有 Anchor 是否已覆盖该需求。
- **已覆盖** → 告知用户对应 Anchor 路径,询问是否仍需搜索外部。
- **未覆盖或需增强** → 进入 Step 1.2。

### Step 1.2 — 搜索外部生态
按 `{TOOLBOX}/Tool/find-skills/SKILL.md` 中的指令执行搜索:
```bash
npx skills find [query]
```
- 用多个关键词组合搜索,尝试同义词。

### Step 1.3 — 呈现结果
列出搜索结果的 **前 5 名**,每个包含:
1. Skill 名称与功能描述
2. 安装命令
3. 链接(如有)

### Step 1.4 — 用户选择
等待用户选定一个(或多个)skill。用户可选择:
- **选定** → 进入 Phase 2
- **无满意结果** → 终止流程,建议用户用通用能力完成或 `npx skills init` 创建自定义 skill
- **现有 Anchor 已足够** → 终止流程

---

## Phase 2: Clone(落盘到 Tool/)

### Step 2.1 — Clone 仓库
将用户选定的 skill 从 GitHub clone 到 `{TOOLBOX}/Tool/`:
```bash
cd {TOOLBOX}/Tool/
git clone <repo-url>
```
- 验证目录完整性。

### Step 2.2 — 记录来源
记录仓库名称、URL、clone 日期,供 Phase 5 索引更新使用。

---

## Phase 3: 深度学习(Skill Seekers)

**目标**: 利用 Skill Seekers 对 clone 下来的仓库做深度分析,理解其完整能力。

### Step 3.1 — 读取 Skill Seekers 指令
读取以下文件获取具体操作方法:
- `{TOOLBOX}/Tool/Skill_Seekers/AGENTS.md` — 项目概述与核心工作流
- `{TOOLBOX}/Tool/Skill_Seekers/CLAUDE.md` — 详细命令与架构

### Step 3.2 — 分析仓库
根据 Skill Seekers 的 Core Workflow(Scrape → Build → Enhancement → Package)对仓库执行分析:
- 识别仓库中所有 skill 文件(SKILL.md 或等效文档)
- 理解每个 skill 的核心功能、适用场景、知识模块
- 提取代码示例、最佳实践、反模式

### Step 3.3 — 产出学习成果
输出结构化的仓库能力清单:
- 仓库包含的 skill 列表(名称、功能、质量初评)
- 知识模块拆解(每个 skill 的可独立对比单元)

---

## Phase 4: 分类(按 External_KI 类别体系)

### Step 4.1 — 读取分类体系
读取 `{TOOLBOX}/KI/External_KI/master_index.json`,获取现有 12 个 Category 及其 Anchor 路径。

### Step 4.2 — 归类
将 Phase 3 产出的每个 skill/知识模块归入对应 Category(12 类之一):
- 如可归入现有 Category → 标注对应 Anchor 路径
- 如所有 Category 均无法归类 → 标记为「待新建 Category」(按 `skill_ingestion.md` 的新 Category 初始化流程处理)

### Step 4.3 — 呈现分类结果
向用户展示分类方案,格式:

| Skill/模块 | 归属 Category | Anchor 路径 | 备注 |
|------------|--------------|-------------|------|
| skill-a 模块 X | backend | `KI/External_KI/skills/backend/backend.md` | — |
| skill-b 模块 Y | testing | `KI/External_KI/skills/testing/testing.md` | — |

等待用户确认分类无误后进入 Phase 5。

---

## Phase 5: 增量入库(skill_ingestion)

**目标**: 按已有的 Anchor 基线做增量更新,不替换、不重复。

### Step 5.1 — 触发 Skill Ingestion 流程
严格按 `{TOOLBOX}/Agent/workflow/skill_ingestion.md` 执行:
- **Phase 2 (Deep Audit)**: 20 信号质量评分 + 知识切片
- **Phase 3 (Anchor Compare)**: 与对应 Category Anchor 逐模块对比(强制门禁)
- **Phase 4 (Incremental Write)**: 增量写入 Anchor
- **Phase 5 (Rebuild Index)**: 同步更新 6 个索引文件
- **Phase 6 (Audit Report)**: 输出结构化入库报告

> **不得跳过 skill_ingestion.md 的任何 Phase 或 Gate。** 本工作流的 Phase 5 等同于完整执行 skill_ingestion.md 的 Phase 2-6。

### Step 5.2 — 输出入库报告
完成后向用户展示入库结果摘要:
- 哪些模块增量写入了哪个 Anchor
- 哪些模块被跳过(Anchor 已有更优内容)
- 索引更新清单

---

## 流程总览

```
用户 /find "我需要 X"
       │
       ▼
  Phase 1: 搜索 (find-skills)
  ├── 查重 → 已有? 告知用户
  ├── npx skills find → 前 5 名
  └── 用户选择
       │
       ▼
  Phase 2: Clone 到 Tool/
       │
       ▼
  Phase 3: 深度学习 (Skill Seekers)
  ├── 分析仓库能力
  └── 产出知识模块清单
       │
       ▼
  Phase 4: 分类 (External_KI 类别体系)
  ├── 归入 12 类
  └── 用户确认
       │
       ▼
  Phase 5: 增量入库 (skill_ingestion.md)
  ├── Deep Audit → Anchor Compare → Incremental Write
  ├── Rebuild Index
  └── Audit Report → 用户
```

## 禁止行为

- 跳过 Phase 1 查重直接搜索
- 不经用户选择自行 clone
- 不经 Phase 3 分析直接入库
- 跳过 Phase 4 分类确认
- 跳过 skill_ingestion.md 的任何 Phase 或 Gate
- 修改或删除 Tool/ 中的源文件(Iron Law 04)
- 替换 Anchor 文件(Anchor 铁律)
- 写入与 Anchor 已有内容语义重复的内容
