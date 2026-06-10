---
description: 唯一入口。用户提交需求后,PM 分析需求、召回上下文、输出标准需求包。
---

# /pm — 需求受理与分析

## 前置约束 — PM 子门禁
> 进入本工作流时,以下铁律自动生效(全文见 `Agent/rules/iron_laws.md`)。

| 铁律 | 一句话 | 门禁效果 |
|------|--------|---------|
| **IL 01** | NO REQUIREMENT, NO EXECUTION | 无标准需求包不得进入实现阶段 |

## 触发条件
用户输入 `/pm` 或任何需要进入正式开发流程的请求。

## 步骤

### Step 1: 创建 Session
1. 生成 session ID: `{YYYYMMDD-HHMMSS}`
2. 创建 session 目录: `.in-process/active/{session_id}/`
3. 创建 `state.json`:
```json
{
  "sessionId": "{session_id}",
  "requirementRef": "REQ-{session_id}",
  "currentState": "INTAKE",
  "reworkCount": 0,
  "history": [
    { "from": "NONE", "to": "INTAKE", "timestamp": "{now}", "gate": "N/A", "notes": "Session created via /pm" }
  ]
}
```

### Step 2: 记录用户原始请求
将用户的完整原始请求记录到 session 目录中,不做任何修改。

### Step 3: 状态转移 → PM_ANALYSIS
更新 `state.json`: `currentState` → `"PM_ANALYSIS"`

### Step 4: 召回上下文
按优先级依次查询:
1. **Error Book**: 读取 `{TOOLBOX}/KI/Error_Book/index.json`,检索与当前需求相关的历史错误模式
2. **KI Summaries**: 检查对话中提供的 Knowledge Item 摘要,识别相关 KI
3. **Skills Index**: 读取 `{TOOLBOX}/KI/External_KI/master_index.json`,在 `quickLookup` 中识别可能相关的 skill 类别(**不深入读 skill 内容,只做初步标记**)
4. **Project Rules**: 如果存在 `Agent/rules/project_rules.md`,读取项目规则
5. **claude-mem 会话记忆**(补充召回源): 当任务延续既往 session 或用户提及历史工作时,用 mem-search skill 召回近期 session 上下文(worker 不可用时降级 `sqlite3 ~/.claude-mem/claude-mem.db` 只读查询);性质为**参考上下文,不构成约束**(优先级: Error_Book 强制 > Pattern Book 推荐 > mem 参考);两者都不可用 → 跳过,不阻塞流程

### Step 4.5: Complexity Classification（强制 Gate，输出 `complexity` 字段）

> 来源：REQ-20260513-152625 token-audit-report 建议 #1。目的：让小任务跳过重 ceremony，节省 ~25% conversation token；同时保留铁律语义（IL01/02/05 在所有 tier 都生效，只是 evidence 形式不同）。

#### 4.5a 三档定义

| Tier | 触发条件（**必须全部满足**才能归类 micro/major，否则 standard） | 工件路径 |
|------|----------------------------------------------------------|---------|
| **micro** | ≤ 2 文件改 / ≤ 30 行净变动 / 单层（frontend OR backend OR data，不跨）/ 无新 KI 或 skill / 无 storage schema / 无安全敏感（auth / 金币 delta / 权限）/ 不在 Error_Book 关键词命中 critical 级条目 | 单 `requirement_package_micro.md`（含 Intent + Scope + AC + Touched Files + Plan + QA Evidence + Risk 全部段） |
| **standard** | micro 任一条不满足 + IL10 未触发（< 15 文件读 / < 5 文件改） | 完整 6 工件：`requirement_package.md` + `execution_plan.md` + `task_dag.json` + `change_manifests/*.json` + `verification_log.md` + `qa_report.md` |
| **major** | IL10 触发（≥ 15 文件读 OR ≥ 5 文件改） OR 跨多个工作流子门禁 OR 涉及 skill 治理 | 同 standard + `rca.md`（Root Cause Analysis 根因分析）+ 多次返工时强制 |

#### 4.5b 否决式分类硬清单（**不是启发式**，是 10 项必答 disqualifier）

> 用户明示需求（REQ-20260513-191243）：复杂任务**必须**走完整 PM 流程。本节从"判断式"升级为"否决式"——Agent **无权**用模糊判断归 micro，必须逐条回答下表，**任一 YES 即强制 standard**，没有例外。

##### Step 4.5b-1：先做 mandatory pre-flight bash evidence

PM 在归类前**必须**先跑下列 bash，把输出记入 `state.json.complexityChecklist.preflight_evidence`：

```bash
# 1. 列出计划要改的文件清单（在 requirement_package 写 Touched Files 段之前先确认）
TOUCHED_FILES=( <从用户请求/PM 分析中识别出的所有计划改动文件> )
echo "TOUCHED COUNT=${#TOUCHED_FILES[@]}"

# 2. 每个 touched file 的下游 import 入度（被多少其它文件引用）
for f in "${TOUCHED_FILES[@]}"; do
  base=$(basename "$f" | sed 's/\.[^.]*$//')
  echo "$f indegree=$(grep -rl --include='*.ts' --include='*.prefab' "$base" assets/ server/ 2>/dev/null | wc -l)"
done

# 3. 计划改动行数估算（如果是改现有内容）
# 4. 是否触及 storage key / schemaVersion / playerSchema / storageHelper
grep -lE "(BombVer|BomVerr|schemaVersion|playerSchema|storageHelper)" "${TOUCHED_FILES[@]}" 2>/dev/null
# 5. Error_Book critical 关键词召回
grep -iE "(prefab.*序列化|storage.*key|share|redirect|gold.*delta)" <<< "<user-request 原文>"
```

##### Step 4.5b-2：10 项否决清单（**任一 YES → standard，不可归 micro**）

| # | Disqualifier 问题 | YES 触发 standard |
|---|---|---|
| Q1 | 计划改动文件数 > 2？ | ✓ |
| Q2 | 任一 touched file 的 import 入度 > 5？（高影响文件，改一处影响多处） | ✓ |
| Q3 | 任一 touched file 位于 `core/` / `const/` / `script/wx/` / `server/src/` / `playerSchema.ts` / `storageHelper.ts` / `cocos-mcp-server/source/` 等关键目录？ | ✓ |
| Q4 | 跨 frontend + backend OR frontend + data-layer OR backend + data？ | ✓ |
| Q5 | 用户请求含关键词："新功能" / "新接口" / "重构" / "迁移" / "整合" / "改造" / "schema" / "数据库" / "API"？ | ✓ |
| Q6 | 触及 Error_Book critical 级条目关键词（如 prefab JSON 序列化、storage key 同步规则、share view、gold delta、redirect 链路）？ | ✓ |
| Q7 | 触及金币 / 支付 / 登录 / 分享 / 排行榜 / 存档 / 体力经济（已 ship 系统）任一业务领域？ | ✓ |
| Q8 | 需要新建 KI 切片 OR 新建 Error_Book 条目 OR 新建 skill？ | ✓ |
| Q9 | 触及 storage key（含项目特有 `BombVer→BomVerr` typo 等）OR 改 `schemaVersion` OR 需要 migration 函数？ | ✓ |
| Q10 | 估算净改动行数 > 30？ | ✓ |

> **答完 10 题必须落盘到 state.json**，格式见 4.5e。**Agent 不许把上面任何一条答案改成 "N/A" 来逃避决策** — 拿不准就答 YES（保守 bias）。

##### Step 4.5b-3：决策矩阵（机械化判定，不留 Agent 自由裁量）

| 输入 | 输出 complexity |
|------|----------------|
| Q1-Q10 全 NO + IL10 未触发 + pre-flight 数值未超阈 | **micro** |
| Q1-Q10 任一 YES（不论几个） + IL10 未触发 | **standard** |
| IL10 触发（≥ 15 文件读 OR ≥ 5 文件改）OR 涉及 skill 治理 OR 跨多个工作流子门禁 | **major** |
| **判定边界模糊 / 任一答案不确定** | **standard**（粗体强制 — Agent 必须读这条） |

##### Step 4.5b-4：典型示例（参考但不替代 10 项清单）

**回放本 conv 第一个 /pm（替换 dialoguebg + 删除 Label）按新清单**：
- Q1 文件 > 2？1 prefab + 1 png = 2 文件 → NO
- Q2 入度 > 5？needBackToParentTip prefab 入度 ~3 → NO
- Q3 关键目录？不在 → NO
- Q4 跨层？纯 frontend → NO
- Q5 关键词？请求含"替换 dialoguebg 删子节点"——"替换/删"不在关键词清单，但接近 → 拿不准 → **YES（保守）**
- Q6 ERR critical？涉及 prefab 节点删除 → 命中 ERR-002/005/013 → **YES**
- → **standard**（Q5/Q6 任一 YES 即足够）

**回放添加 homeBtn 按新清单**：
- Q1 文件 > 2？2 (prefab + ts) → NO
- Q2 入度？BaseViewCmpt 入度极大但被改的是子类 → NO
- Q3-Q4 → NO
- Q5 "添加新按钮 + 新方法"——"新增" 是关键词 → **YES**
- Q6 → NO
- → **standard**

> 两个本来都"看起来小"的任务，按新清单都识别为 standard。这就是我们要的效果 — 漏审风险压低，宁可多写 ceremony。

##### Step 4.5b-5：真正能归 micro 的任务画像

经过 10 项过滤后，能进 micro 的典型任务收窄到：
- 改单个 prefab 的 1 个静态属性（如 fontSize 30→28 / color 调一档）— **不涉及节点增删**
- 改单个 .ts 的一行常量值 / 一行文字（不涉及 import / 不涉及业务领域关键词）
- bump 单个依赖版本（patch only，无 breaking change）
- 改单个 config flag（如 `STAMINA_ENABLED` 已知开关）
- 改一个非关键目录的注释 / 文档 typo

micro 是"狭窄通道"，不是"默认路径"。

#### 4.5c micro 路径行为

1. 用 `PM/templates/requirement_package_micro.tmpl.md` 模板（< 1.5KB）
2. **跳过** `execution_plan.md` 和 `task_dag.json` 独立产出，Plan 段内联 ≤ 5 步即可
3. **跳过** 独立 `verification_log.md` 和 `qa_report.md`，QA Evidence 段填 5 层表（5 行）
4. 状态机仍走 `PM_ANALYSIS → CTO_PLANNING → EXECUTION → QA → JOINT_APPROVAL → APPROVED`，但 CTO_PLANNING / QA 阶段**不产新文件**，只在 state.json.history 加事件
5. Gate①/②/③ 自检改成"micro 模板对应段是否填全"
6. Joint Approval 输出 `delivery_cert_micro.md`（≤ 600 字符）或直接 inline 进 state.json.history

#### 4.5d 升级路径（micro → standard）— 不可绕过

**触发条件**（执行中任一发生）：
- 实际触及第 3 个文件
- 实际改动超过 30 行
- 发现需要新 KI / Error_Book 条目
- 跨层（frontend 工作触及 backend / data）
- 用户反馈需要 RCA 或返工

**操作**：
1. PM 立即暂停执行
2. 把 `requirement_package_micro.md` 现有内容**逐段拆出**到 standard 工件：
   - Intent / Scope / AC / Out of Scope / Risk → `requirement_package.md`（standard 模板）
   - Plan → `execution_plan.md` + `task_dag.json`
   - QA Evidence → `verification_log.md` 占位
3. `state.json.complexity` 从 "micro" 改 "standard"，history 加事件 `{from: micro, to: standard, reason: <触发条件>}`
4. 重过 Gate②（CTO Planning 完整流程）
5. 继续执行

> **不允许：在 micro 模板里硬塞 standard 内容**。一旦升级条件触发，立即拆文件。

#### 4.5e 在 state.json 中记录

强制字段（**所有归类必填，micro 路径下尤其严格**）：
```json
{
  "complexity": "micro" | "standard" | "major",
  "complexityDecidedAt": "PM_ANALYSIS Step 4.5",
  "complexityReason": "<一句话引用 4.5a/b 哪条触发>",
  "complexityChecklist": {
    "files_gt_2": false,
    "import_indegree_gt_5": false,
    "touches_core_const_wx_server_layer": false,
    "cross_frontend_backend_or_data": false,
    "request_contains_NEW_REFACTOR_MIGRATION_INTEGRATION_keywords": false,
    "hits_ERR_Book_critical_keyword": false,
    "touches_gold_pay_login_share_rank_save": false,
    "requires_new_KI_or_skill": false,
    "touches_storage_key_or_schemaVersion": false,
    "estimated_line_delta_gt_30": false,
    "preflight_evidence": "<bash 输出关键行 / N/A 必须说明>"
  }
}
```

**校验规则**（Gate① 必查）：
- `complexity == "micro"` 时，`complexityChecklist` 中 10 个 bool 字段**必须全部为 false**；任一 true 即拒绝归类 micro
- `complexity == "standard"` 或 `"major"` 时，至少要有 1 个 bool 为 true（说明为什么不是 micro）
- `preflight_evidence` 字段不能省，没跑 bash 也要写明"N/A 因 X"
- 字段缺失或值无法落盘 → Gate① 不通过

### Step 5: 分析与厘清
- 理解用户真正的意图(而非字面请求)
- 如果需求不清晰,**停下来向用户提问**,不要猜测
- 识别隐含的约束条件
- 确定明确的 scope 边界和 out of scope

#### Step 5.5: Hidden Assumptions(强制,挂载 P9 Assumption Transparency)

> 引用:`Agent/rules/constitution.md` § P9 — Assumption Transparency。
> 目的:把 PM 理解需求时的隐含假设**显式化**,让 CTO 能精准识别哪些是用户已确认、哪些是 PM 推断的。

PM 在产出 requirement_package 前,必须列出本次需求分析的所有**隐含假设**,每条标注:
- **假设内容**:一句话
- **信源**:`用户已确认` / `文档推断({path})` / `PM 推断`
- **待澄清?**:`是` / `否`(后者意味 PM 自信此假设无误,愿承担误判后果)

格式(standard tier):

| # | 假设 | 信源 | 待澄清? |
|---|------|------|---------|
| A1 | {一句话} | {信源} | 是/否 |

**micro tier 弱化**:允许 `None identified`(单行),但若该 micro 任务涉及**任一**关键词(新功能 / 新接口 / 业务领域 / 跨层 / schema / storage key),**禁止**写 `None identified`,必须至少列 1 条假设 — 否则触发 micro→standard 升级条件。

**违反后果**: Gate① 自检失败,返工到 Step 5。

### Step 6: 输出 requirement_package(_micro).md

按 Step 4.5 的 `complexity` 分类选择模板：

| complexity | 模板 | 落盘文件名 |
|------------|------|----------|
| micro | `PM/templates/requirement_package_micro.tmpl.md` | `requirement_package_micro.md`（同时填 Plan + QA Evidence 段，因 CTO/QA 阶段不再独立产文件）|
| standard / major | `PM/templates/requirement_package.tmpl.md` | `requirement_package.md` |

保存到 session 目录 `.in-process/active/{session_id}/`。

必须确保以下字段非空:
- [ ] Clarified Intent
- [ ] **Hidden Assumptions**(至少 1 条 或 `None identified`,见 Step 5.5 micro 例外)
- [ ] Scope (至少 1 条)
- [ ] Out of Scope (至少 1 条)
- [ ] Constraints (至少 1 条)
- [ ] Acceptance Criteria (至少 1 条,每条可验证)

> **Iron Law: 所有工件必须写入 `.in-process/active/{session_id}/`,禁止仅在对话中输出而不落盘。**

### Step 7: Gate① 检查
自检 requirement_package.md 完整性:
- Scope 是否明确?
- AC 是否可验证(不是模糊的"应该好用")?
- Out of Scope 是否覆盖了容易 creep 的项?
- **Hidden Assumptions 段已填写**(挂载 P9,见 Step 5.5)
- **requirement_package.md 是否已写入 `.in-process/active/{session_id}/`?**

**通过** → 转交 CTO Planning(更新 state → `CTO_PLANNING`)
**不通过** → 回到 Step 5 补充或向用户提问

### Step 8: 交接 CTO
- 告知用户: "需求包已完成,现在进入技术规划。"
- 切换到 CTO Planning workflow (`Agent/workflow/cto_planning.md`)
- **micro 任务**：CTO 走 Micro Path 分支（见 `cto_planning.md` 末尾"Micro Path"章节），不产独立 execution_plan / task_dag，直接 inline 回 `requirement_package_micro.md` 的 Plan 段。

## 返工入口
当 QA 以 `REQ-*` 原因码驳回时,流程返回 PM:
1. 读取 `rework_order.json` 理解问题
2. 更新 `requirement_package.md`(如需修改 AC/Scope)
3. 如需用户厘清,向用户提问
4. 修改完成后重新通过 Gate①
5. 再次交接 CTO

## 禁止行为
- ❌ 做技术选型
- ❌ 直接修改代码
- ❌ 跳过 CTO 给 Execution 下指令
- ❌ 在 QA 阶段修改需求(需走本 workflow 的返工入口)
- ❌ 工件仅在对话中输出而不写入 `.in-process/`
