---
description: CTO 将需求包拆解为 Task DAG,做 skill 选型、风险评估、验证规划。必须显式选择执行模式并通过强制 Gate。
---

# CTO Planning

## 前置约束 — CTO 子门禁
> 进入本工作流时,以下铁律自动生效(全文见 `Agent/rules/iron_laws.md`)。

| 铁律 | 一句话 | 门禁效果 |
|------|--------|---------|
| **IL 02** | NO PLAN, NO CODE | 无 execution_plan + task_dag 不得执行 |
| **IL 03** | REUSE BEFORE BUILD | 未查 KI/External_KI/ 和现有代码前禁止新建 |

## 触发条件
PM 完成 Gate① 后交接,`state.json` 的 `currentState` 为 `CTO_PLANNING`。

## 输入
- `requirement_package.md`(来自 PM)
- `{TOOLBOX}/KI/External_KI/master_index.json`
- `{TOOLBOX}/KI/Error_Book/index.json`
- `{TOOLBOX}/Agent/orchestrator/strategy.md`(执行模式选择指南)
- claude-mem 近期 session 上下文(可选,mem-search skill / `sqlite3 ~/.claude-mem/claude-mem.db` 只读;**参考性质,不构成约束**,不可用则跳过)

## 步骤

### Step 1: 需求可行性评审
阅读 `requirement_package.md`,评估:
- 技术可行性
- 需求是否自洽(Scope vs Constraints 是否矛盾)
- AC 是否可在当前技术栈下验证

**如果不可行或自相矛盾** → 更新 state → `PM_ANALYSIS`,退回 PM 并说明原因。

#### Step 1.5: Assumption Pushback Gate(挂载 P9 Assumption Transparency)

> 引用:`Agent/rules/constitution.md` § P9。
> 目的:CTO 不得在 PM Hidden Assumptions 不完整时自行填补假设。

CTO 必须检查 PM 的 Hidden Assumptions 段:

- **缺失关键假设**(PM 没列但 CTO 规划时需依赖) → state → `PM_ANALYSIS` 返工,**禁止** CTO 自行假设
- **假设可疑**(PM 标 `用户已确认` 但与对话记录不符) → state → `PM_ANALYSIS` 返工
- **假设有冲突**(A1 与 A3 互斥) → state → `PM_ANALYSIS` 返工
- **全部假设合理且完整** → 进入 Step 2

**违反后果**: 若 CTO 跳过此 gate 自行假设,QA Layer 4 发现 plan 引用了未声明假设 → REJECT with REQ-003 (HIDDEN-ASSUMPTION-FILLED-BY-CTO)。

### Step 2: Reuse Audit(Iron Law 03) — Anchor 架构
1. 读取 `{TOOLBOX}/KI/External_KI/master_index.json`
2. 根据需求关键词,在 `quickLookup` 中定位相关 **Category**(12 类之一)
3. 读取对应 `categories/{id}.json`(**只读相关类别,不全部加载**)
4. 确认该 Category 的 **Anchor** 文件路径(每个 Category 有且仅有一个 Anchor md)
5. 检查 `{TOOLBOX}/KI/External_KI/cross_references.json` 确认跨类别引用关系
6. 扫描项目现有代码,检查是否有可复用的模块
7. 如任务延续既往 session,用 mem-search(降级 sqlite 只读)查 claude-mem 近期观察,避免重复劳动(**参考,不构成约束**,优先级低于 Error_Book 强制与 Pattern Book 推荐;不可用跳过)

> **CTO 职责边界**: CTO 只选定相关的 Category 及其 Anchor 路径,**不深入读取 Anchor 内容**。具体使用 Anchor 中的哪些知识切片(section / tier),由 Executor 在执行阶段根据 Anchor 内部索引(frontmatter 的 tier_index / section line ranges)自主抉择。

将结果填入 `execution_plan.md` 的 **Reuse Audit** 表,格式:

| Category | Anchor Path | Confidence | 备注 |
|----------|-------------|------------|------|
| testing | `KI/External_KI/skills/testing/testing.md` | 0.71 | Executor 按 tier_index 选取 |
| backend | `KI/External_KI/skills/backend/backend.md` | 0.67 | Executor 按 section 选取 |

### Step 2.5: 代码结构记忆启用判定(codebase-memory-mcp · 第三类记忆)

> **本节是 trigger 的唯一权威定义**。PM/部署指南/决策记录(DEC-006)均**路径引用**本节,不得复制(无冗余副本硬约束)。
> 背景:`codebase-memory-mcp-pro` 是源码结构知识图谱引擎(tree-sitter + SQLite + Cypher),把代码解析成调用图。它是"代码结构记忆",与 claude-mem(会话记忆)、Obsidian KI(知识记忆)并列为**第三类记忆**,**互补不互斥**。决策依据 + 多源交叉验证见 `KI/Internal_KI/decisions/DEC-006`。
> **使用模型(经 fork/上游 README + 官方 docs + DeepWiki + 实践文章交叉验证)**:它不是"按任务临时调用",而是 **"每个值得的项目 `index_repository` 一次,之后在该项目内长期辅助"** —— 索引后还会以 `PreToolUse` hook 被动增强该项目内的 Grep/Glob。**因此判定是两级的:A 决定项目要不要索引(主判定),B 是索引后项目内怎么用(不再逐任务 gate)。**

#### A. 项目级判定 —— 这个项目值不值得索引?(主判定,`index_repository` 一次)
下列**画像三条全中**才索引(目标:真实代码 + 会反复结构化探索 + 持续工作):

| 判据 | 命中条件 |
|------|---------|
| **P1 真实源码项目** | 游戏 TS / `cocos-mcp-server/source/` / `server/src/` 等**源码仓**;**排除** doc-only / 纯 markdown 仓 —— 含 **toolBox 治理库本身**(上游明示"documentation-centric projects" 属 *not first-class*) |
| **P2 会反复探索** | 中大型 / 多文件 / 多语言 / monorepo;或"这东西在哪被用到 / 谁调用它"是高频问题;或 agent 反复读同一批文件吃 context(官方定位的核心场景) |
| **P3 非一次性** | 该项目你会**持续工作**(不是看一眼就走,否则索引开销摊不平常驻成本) |

→ 三条全中:在该项目 `index_repository` 一次(成本低:Django 量级 ~6s,内核级 28M LOC ~3min),后台 watcher 增量同步,**在该项目内长期可用**。任一不中 → 不索引,降级原生 grep/Read。

#### B. 项目内使用 —— 索引后按问题选工具(不再逐任务开关)

| 触发时刻 | 工具 | 答的问题 |
|---------|------|---------|
| 摸架构 / onboarding / 设计评审 | `get_architecture`(先跑一次) | 语言/包/路由/热点/集群/死代码总览 |
| 理解某符号后再改它 | `explore` | 该符号的 blast-radius + 1-hop 邻居 + 带行号源码(替代盲读 Read)|
| "谁调用了它 / 完整调用链" | `trace_path`(depth 1-5) | 入向/出向调用链 |
| 改动影响面 / 提交或重构前 | `detect_changes` | git diff → 受影响符号 + blast radius + 风险分级 |
| "X 在哪用到" / grep 替代 | `search_graph` / `search_code` | 结构化定位,~120x 少 token |

#### 去冗余 / 安装 / Token —— 三条硬规则
- **去冗余(同域二选一)**:在已索引项目内,结构化探索一律走 codebase-memory,**不再并行** claude-mem `smart-explore`/`learn-codebase`(同域,双开浪费 token)。
- **延后安装(档位 1)**:不做全局常驻 MCP。**按合格项目**装/注册(项目根 `.mcp.json` 或在该项目工作期注册),装前用户确认(第三方 C 二进制,供应链,参照 security skill 告警)。runbook 见 `Agent/mcp/deploy_guide.md` 的 **codebase-memory** 章节;未装则降级 grep/smart-explore,不阻塞。
- **Token 账(参照 ERR-032)**:索引便宜,价值是"结构化查询替代逐文件 grep 的 token 暴增"(官方 ~120x)。**唯一净亏 = 对 doc-only / 微型 / 看一眼即走的仓索引** → P1/P2/P3 就是为拦此而设。

**记录格式**:在 `execution_plan.md` 写一行 `code-structure-memory: indexed <project> | n/a (reason: P1-P3 命中/未命中)`。

### Step 3: 执行模式选择(强制 Gate)

参照 `{TOOLBOX}/Agent/orchestrator/strategy.md` 的决策矩阵和 `{TOOLBOX}/Agent/orchestrator/execution_modes.md` 的详细定义。

> **与 dynamic workflow 衔接**:dynamic workflow ≈ **机械化的 Swarm**。若本任务 PM **Step 4.6 Workflow Gate** 已判 `recommended:true`(state.json.workflowGate),且此处选定 **Swarm**,则按 Step 4.6 的"模型分层 + 预算计划"执行(haiku 广度 / opus 收敛);但仍由**用户 opt-in** 开 ultracode,CTO 不自动 launch。权威定义见 `PM/pm_workflow.md` Step 4.6,本处不复制。

**3a. 量化评估(必须完成)**
1. 统计 task 总数
2. 计算任务间文件重叠率(共享文件数 / 总涉及文件数)
3. 分析任务间数据依赖关系(有向图)
4. 判断任务性质(确定性 vs 探索性)

**3b. 强制选择规则**

| 条件 | 必须选择的模式 | 禁止的模式 |
|------|--------------|-----------|
| task 数 >= 3 且文件重叠率 < 20% 且无数据依赖 | **Parallel** 或 **Swarm** | Serial |
| 探索性任务或需要多方案对比 | **Swarm** | Serial |
| 大规模知识提炼(涉及 >= 5 个 skill/文件) | **Swarm** 或 **Parallel** | Serial |
| 任务间有数据依赖 或 文件重叠率 > 50% | **Serial** | — |
| 混合场景 | **混合模式**(独立部分并发,依赖部分串行) | 全部串行 |

**3c. 记录格式**
在 `execution_plan.md` 中必须包含:
```markdown
## Execution Mode

**Selected Mode**: {serial / parallel / swarm / hybrid}
**Task Count**: {N}
**File Overlap Rate**: {X%}
**Data Dependencies**: {描述}
**Rationale**: {为什么选择此模式,引用上表条件}
**Task Groups**:
- Group 1 ({mode}): T1, T2, T3
- Group 2 ({mode}, depends on Group 1): T4

**Merge Strategy**: {并发/蜂群结果如何合并}
```

**3d. 如果选择了 Serial 但 task >= 3**
必须在 Rationale 中逐条解释为什么每对 task 之间存在强依赖,否则 Gate② 不通过。

### Step 4: Task DAG 拆解
将需求拆解为独立 task:
- 每个 task 标注所属 **Category** 及 Anchor 路径(`anchorRef`),由 Executor 在执行时按 Anchor 内部索引选取具体知识切片
- 标明 task 间依赖关系
- 每个 task 必须有 `verificationCriteria`

创建 `task_dag.json`,参考 schema: `{TOOLBOX}/Agent/schemas/task_dag.schema.json`

### Step 5: Risk Assessment
识别风险并制定缓解措施:
- 技术风险(新技术、未验证方案)
- 集成风险(与现有代码的交互)
- Scope 风险(哪些 AC 可能引发 scope creep)

### Step 6: Verification Plan
为 QA 制定验证计划:
- 基于每个 AC 列出具体验证步骤
- 指明哪些需要自动化测试,哪些需要手动验证
- 标明 Layer 3(行为正确性)的关键检查点

### Step 7: Minimal Change Rationale + Simplicity Justification(Iron Law 02 / 10 + P10 Simplicity Discipline)

> Step 7 在 P2 (Minimal Change By Default) 之外,挂载 P10 (Simplicity Discipline):**P2 看文件数,P10 看代码本身**。

**Part A — Minimal Change Rationale** (P2):
- 为什么不能更少?
- 如果修改文件 > 5 个,说明为什么每个都必须改

**Part B — Simplicity Justification** (P10):
- 代码本身能否更简洁(200 行能否压到 50)?
- 有无未请求的抽象 / 配置项 / 错误处理 / 防御性分支?
- 通过自检: "senior engineer 会说这过度复杂吗"
- 写入 `execution_plan.md` 的 `## Simplicity Justification` 段(必填)

**micro tier 弱化**: Part B 允许一行,如 "< 30 行变更,无抽象/配置项膨胀嫌疑"。

**违反后果**: Gate② Simplicity Justification 段缺失 / Part A 与 Part B 都未填 → Gate② FAIL,返工 CTO。

### Step 8: 输出 execution_plan.md
按 `{TOOLBOX}/Agent/templates/execution_plan.tmpl.md` 模板填写。
**保存到 `.in-process/active/{session_id}/execution_plan.md`。**

### Step 9: Gate② 检查
自检:
- [ ] Reuse Audit 非空
- [ ] **代码结构记忆判定已记录**(Step 2.5:`code-structure-memory: indexed <project> | n/a (reason)` 一行;A 级项目画像 P1-P3 任一不中即 n/a)
- [ ] **执行模式已选定,包含 Task Count / File Overlap Rate / Data Dependencies / Rationale**
- [ ] **模式选择符合 Step 3b 强制规则(串行需逐对证明依赖)**
- [ ] task_dag.json 中每个 task 有 anchorRef(Category + Anchor 路径)或明确说明为何不需要
- [ ] 每个 task 有 verificationCriteria
- [ ] Minimal Change Rationale 存在
- [ ] **Simplicity Justification 段已写入 execution_plan.md**(挂载 P10,见 Step 7 Part B)
- [ ] **Step 1.5 Assumption Pushback Gate 已执行**(挂载 P9,无可疑/缺失假设;若有,已 state→PM_ANALYSIS)
- [ ] Verification Plan 存在
- [ ] **execution_plan.md 已写入 `.in-process/active/{session_id}/`**

**通过** → 更新 state → `EXECUTION`,交接执行层
**不通过** → 补充后重检

## 返工入口
当 QA 以 `BHV-*` 或 `ISO-*` 原因码驳回时:
1. 读取 `rework_order.json`
2. 分析是设计问题还是实现问题
3. 如果是设计问题: 修改 `execution_plan.md` 和 `task_dag.json`
4. 如果是实现问题: 增加 task 的 verificationCriteria 后交回 Execution
5. 更新 state.json 记录返工

## 禁止行为
- ❌ 修改用户需求的业务含义
- ❌ 跳过 PM 直接接用户请求
- ❌ 跳过 QA 直接宣布完成
- ❌ 删除或修改原始 skill 源文件
- ❌ 在 task >= 3 且无依赖时仍选择串行模式
- ❌ 工件仅在对话中输出而不写入 `.in-process/`

---

## Micro Path（complexity = micro 时启用）

> 由 PM Step 4.5 决定 `complexity = micro` 后激活。本路径绕过独立的 `execution_plan.md` + `task_dag.json` 产出，但 IL02（NO PLAN, NO CODE）**仍然生效** — plan 内联到 `requirement_package_micro.md` 的 **Plan** 段。

### 行为差异

| 阶段 | standard | micro |
|------|----------|-------|
| Step 2 Reuse Audit | 写入 `execution_plan.md` Reuse Audit 表 | 一行写在 micro 模板 Plan 段的 "Reuse 引用" |
| Step 3 执行模式 | 强制 quantitative + 必填表格 | **跳过**（micro 默认 Serial，单段步骤） |
| Step 4 Task DAG | 必须 `task_dag.json` | **跳过** — micro 模板 Plan 段写 ≤ 5 步即可（无 DAG） |
| Step 5 Risk | 写 Risk Assessment 表 | 一行写在 micro 模板 Risk / Note 段 |
| Step 6 Verification Plan | 写在 `execution_plan.md` | 内联到 micro 模板 QA Evidence 段的 5 层表预期项 |
| Step 7 Minimal Change Rationale | 必须章节 | 一行写在 Plan 段末尾即可（"改 N 文件，无可减少"）|
| Step 8 落盘 | `execution_plan.md` + `task_dag.json` | **不产新文件**，CTO 直接 Edit `requirement_package_micro.md` 的 Plan 段 |
| Step 9 Gate② | 8 项 checklist | 简化 3 项：Plan 段非空 / Reuse 引用非空 / 升级触发条件无命中 |

### Gate② Micro 检查清单
- [ ] `requirement_package_micro.md` 的 Plan 段已填（工具 + 步骤 + Reuse 引用）
- [ ] 仍处于 micro 范围（≤ 2 文件 / ≤ 30 行 / 单层 / 无新 KI / 无 storage / 无安全敏感）— 若已超出，**立即升级 standard** 走 `pm_workflow.md` Step 4.5d
- [ ] Verification Plan（5 层预期）已填到 QA Evidence 段

通过 → state → `EXECUTION`，移交 Execution。
不通过 → 补段；若是范围爆了 → 升级 standard。

### 禁止
- ❌ 在 micro path 里偷偷创建 `execution_plan.md` / `task_dag.json` 占位空文件（要么 micro 路径不产，要么升级 standard 产完整版）
- ❌ Plan 段超过 5 步（超出说明该升级）
- ❌ 跳过 Reuse 引用（IL03 仍生效）
