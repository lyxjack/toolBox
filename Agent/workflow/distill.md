---
description: /distill 提纯链路工作流。把当前 session 对话提纯到 Obsidian KI 7 大类。
---

# /distill — Workflow

## 前置约束 — /distill 子门禁

> 进入本工作流时,以下铁律/原则自动生效:

| Rule | 一句话 | 门禁效果 |
|---|---|---|
| IL 04 | SOURCE PRESERVATION | `Tool/` 不动,只读源仓库 |
| IL 11 | SKILL FILE GOVERNANCE | 写入 `KI/` 要符合 frontmatter schema + 同步索引 |
| P9 | Assumption Transparency | /distill 写入前显式列出假设(谁触发、提纯哪几类、置信度) |
| Cross-Ref Gate | 至少 1 个 `[[]]` 引用(见 `KI/Internal_KI/contract.md § 3.7`) | 否则 frontmatter 必须含 `bootstrap: true` 例外 |

## 数据流总览

```
Phase 1     Phase 2        Phase 3           Phase 4         Phase 5      Phase 6           Phase 7        Phase 8
触发    →   Inputs    →    7 类决策树    →   切片        →   去重    →   Cross-Ref    →   Write     →   Memory
            收集           (Cat 2/3/4/6)    (复用            (复用       Gate              (Obsidian      Cleanup
                                            skill_         skill_                          MCP +
                                            ingestion      ingestion                       Fallback)
                                            Phase 2.3)     Phase 3)
```

---

## Phase 1: 触发

**触发场景**:
- 用户显式输入 `/distill`
- `git commit + push` 之后由 `post-push-ci` hook 柔提示触发
- Claude 在 session 末发现累积 ≥ 3 条可沉淀信号(错误模式 / 复用逻辑 / 安全配置 / Prompt 拆解)时主动提议

**触发上下文**:
- 当前 session 已结束主任务(`/pm` 闭环结束 或 用户明示"收工")
- 当前 session 已产生至少 1 个可提纯候选(否则直接跳过,报告"无可提纯内容")

**禁止触发场景**:
- session 中途、任务进行中(会污染未完成的 working set)
- 与外部 skill 库入库混淆(那是 `/find` 的工作)

---

## Phase 2: Inputs 收集

收集以下输入作为提纯素材:

| Input | 来源 | 用途 |
|---|---|---|
| 当前 session 对话 | Claude 自有上下文 | 提纯的主素材 |
| 现有 memory 文件 | `~/.claude/projects/-Users-jackliu-toolBox/memory/` | 候选提纯目标(feedback / project / reference 三类) |
| `state.json`(若有) | 当前 session 走过 `/pm` 的 active run 目录 | REQ id 锚定 Cat 2 execution_log |
| 最新 commit message | `git log -1 --pretty=%B` | 锁定本次工作的语义边界 |
| 当前分支 / 仓库 | `git rev-parse --abbrev-ref HEAD` + `git config --get remote.origin.url` | 判断写入位置(toolBox vs 项目级) |
| claude-mem session 记录 | `sqlite3 ~/.claude-mem/claude-mem.db` 只读查询本 project 最近 session | 提纯素材的补充来源 + mem_ref 关联目标(不可用 → 跳过并在 Phase 7 标记 mem_status: unavailable) |

**收集策略**: 全部 read-only。不修改任何 input 文件。

---

## Phase 3: 7 类决策树

> /distill **主动写**: Cat 2 / Cat 3 / Cat 4 / Cat 6
> /distill **跳过**: Cat 1 / Cat 5 / Cat 7

### Cat 2 — Prompt 需求拆解(主动)

**识别信号**:
- session 中包含 `/pm` 闭环(PM → CTO → Execution → QA → Joint Approval)
- 有明确 `REQ-{yyyymmdd-hhmmss}` id 锚点
- 涉及需求理解、拆解、变更轨迹

**写入路径**: `KI/Internal_KI/execution_logs/{YYYY-MM-DD}_{REQ-slug}.md`
**模板**: `KI/Templates/execution_log.tmpl.md`
**必填 frontmatter**: `id`, `type`, `req_ref`, `status`, `created`, `tags`, `related`, `aliases`
**Tag 前缀**: `ki/internal`, `execution_log`, `req-tracking`

### Cat 3 — 逻辑流程类(主动,触发条件 = user_explicit)

**识别信号**:
- 用户在 session 中明示"这块逻辑要复用" / "记下这个流程"
- 是业务硬逻辑(状态机、流程图、决策树),不是装饰器或 helper

**写入路径**: `KI/Internal_KI/patterns/PAT-{NNN}.md`
**模板**: `KI/Templates/pattern_entry.tmpl.md`
**关键字段**: `trigger_condition: user_explicit`(区别于 Cat 7 的 `quality_audit`)
**Tag 前缀**: `ki/internal`, `pattern`, `trigger/user_explicit`

### Cat 4 — 安全权限类(主动)

**识别信号**:
- session 中出现 ENV 变量配置、SSH key 处理、YML / TOML secret 字段、auth flow、token 管理
- 涉及风险评估(secret 暴露、权限越界、信任边界)

**写入路径**: `KI/Internal_KI/security/{topic}.md`(kebab-case)
**模板**: `KI/Templates/security_config.tmpl.md`
**必填 frontmatter**: `id`, `type`, `topic`, `scope`, `risk_level`, `status`, `created`, `anchor_ref`, `tags`, `related`, `aliases`
**Tag 前缀**: `ki/internal`, `security`, `config`, `risk/<level>`

### Cat 6 — 错题本(主动)

**识别信号**:
- session 中出现错误 → 排查 → 根因 → 修复的完整链
- 错误有可泛化的预防规则(不只是 typo)

**写入路径**: `KI/Error_Book/entries/ERR-{NNN}__{slug}.md`
**模板**: `KI/Templates/error_book_entry.tmpl.md`
**必填 frontmatter**: `id`, `type`, `errorCode`, `severity`, `status`, `recurrence`, `firstSeen`, `tags`, `prevention`, `aliases`(参考 ERR-007 结构)
**Tag 前缀**: `ki/error-book`, `error`, `severity/<level>`

### Cat 1 — 技术栈类(跳过)

**理由**: 13 个 Anchor 由 `/find` 工作流管理,Anchor 永不替换。/distill 不能动 Anchor。
**例外**: 无。即使 session 产生"对某 Anchor 的增量补充",也应通过 `/find` 入库,不走 /distill。

### Cat 5 — DB 归档日志分析(跳过)

**理由**: toolBox 不强填(契约 § 3.6.3 明确标注 "toolBox 内不强填,项目级落")。
**项目级路径**: `{project}/.claude/Internal_KI/data-analysis/`(由项目级 /distill 处理)。

### Cat 7 — 可复用功能类(跳过)

**理由**: 留给未来 `/Quality` skill。本 REQ 不实现。
**与 Cat 3 边界**: Cat 7 是装饰器 / static helper / utility function(`trigger_condition: quality_audit`,质量审计驱动),Cat 3 是业务硬逻辑(`user_explicit`)。

---

## Phase 4: 切片(复用 skill_ingestion Phase 2.3)

> 直接引用 `Agent/workflow/skill_ingestion.md` Phase 2.3 的 **20 信号质量评分 + 知识切片算法**,不重新发明。

**适配 /distill 的调整**:
- 评分对象不是外部 SKILL.md,而是 session 中的候选条目片段
- 每个候选条目独立切片,产出: 模块名、要点摘要(3-5 条)、置信度
- **质量阈值**: 信号评分 `confidence < 0.4` → 跳过写入,记录"低信号,不入库"
- 切片粒度: 一个候选 = 一个 KI 条目;不要把多个不相关主题塞进同一条目

---

## Phase 5: 去重(复用 skill_ingestion Phase 3)

> 直接引用 `Agent/workflow/skill_ingestion.md` Phase 3 的 **逐模块对比 + 增量决策规则**,不重新发明。

**Obsidian MCP 查重流程**:

1. 提取候选条目的核心关键字(`key`)
2. 调用 `obsidian_search_notes(query=<key>)` 在对应类别目录中查重
3. 根据结果决策:

| 场景 | 决策 | MCP 调用 |
|---|---|---|
| 无命中 | 新建 | `obsidian_write_note` |
| 命中已有条目 + 内容重复 | 不新建,增量 | `obsidian_patch_note` 追加到对应 section |
| 命中已有条目 + 内容互补 | 新建,但 frontmatter `related` 含命中条目路径 | `obsidian_write_note` + 设 `related: [...]` |
| 命中已有条目 + 语义冲突 | 上报用户,不自动写 | 不调用 MCP,记录到 Phase 7 输出 |

---

## Phase 6: Cross-Reference Gate

> 挂载 `KI/Internal_KI/contract.md § 3.7` 强制规则。

**Gate 检查清单**(每条新条目逐项验证):

- [ ] 至少 1 个 Obsidian wiki link `[[other-note]]` 在 markdown 正文中
- [ ] 写入前 `obsidian_search_notes(query=<target-note-name>)` 验证 wiki link 目标存在(避免笔误产生孤儿链接)
- [ ] frontmatter `related: [path1, path2]` 数组同步写入(grep 友好 backup)
- [ ] 改名场景: 由 Obsidian 自动同步 wiki link;下次 /distill 跑时校正 `related` 数组

**冷启动例外**:
- 当目标目录为空(如新建的 `execution_logs/` / `security/` / `data-analysis/` 首条),无引用对象
- frontmatter 加 `bootstrap: true` 例外,允许 0 个 wiki link
- bootstrap 条目不计入"未引用警告"
- 第二条进入同目录时,bootstrap 例外失效,必须至少引用首条

---

## Phase 6.5: Frontmatter Schema 自检(写入前最后一道关)

> 起源:首次 P2 /distill 出口审计发现 4 条新笔记中 3 条 frontmatter schema 不齐(EXEC 多了 PAT 专用的 `complements` 字段;EXEC P0 `req_ref` 不符合 `REQ-*|PLAN-*` pattern)。本 Phase 在 Write 前最后一道自检,保证产物即合规,不留给 audit 阶段抓。

### 6.5.1 必填字段对照(按候选条目 type 选 schema)

| type | 必填字段 | 禁用字段 | id pattern |
|---|---|---|---|
| `execution_log` | id / type / req_ref / status / created / tags / related / aliases | `complements`(PAT 专用) | `^EXEC-\d{4}-\d{2}-\d{2}-` |
| `pattern` | id / type / title / status / created / `trigger_condition` / tags / aliases(允许 `complements` 和 `related` 并存) | — | `^PAT-\d{3}$` |
| `error` | id / type / errorCode / severity / status / recurrence / firstSeen / tags / prevention / aliases | `complements`(ERR 模板无此字段) | `^ERR-\d{3}$` |
| `security_config` | id / type / topic / scope / risk_level / status / created / anchor_ref / tags / related / aliases | — | `^SEC-\d{3}$` |
| `data_analysis` | id / type / data_source / analysis_type / status / created / retention_days / tags / related / aliases | — | `^DATA-\d{3}$` |

> **所有 type 额外必填**: `mem_ref` + `mem_status`(claude-mem 双向关联,见 contract § 3.8)。校验: `mem_status: linked` ⇒ `mem_ref` 非 null;`mem_status: unavailable` ⇒ `mem_ref: null`。存量条目(2026-06-10 前)免回填。

### 6.5.2 枚举值合法性

| 字段 | 合法枚举 |
|---|---|
| `pattern.trigger_condition` | `user_explicit` / `quality_audit` / `both` |
| `error.severity` | `critical` / `high` / `medium` / `low` |
| `error.status` | `open` / `resolved` / `recurring` |
| `execution_log.status` | `pass` / `fail` / `partial` |
| `execution_log.req_ref` | 必须匹配 `^(REQ-\d{8}-\d{6}\|PLAN-)` — 见 contract § 3.6.1 |
| `*.mem_status` | `linked` / `unavailable` — 见 contract § 3.8 |

### 6.5.3 自检失败处理

- **缺必填字段** → 补齐后再写入,不靠 audit 阶段才发现
- **存在禁用字段**(如 EXEC 含 `complements`)→ 删除后再写入
- **id pattern 不匹配** → 重新生成符合 pattern 的 id
- **枚举值非法** → 矫正为合法值

### 6.5.4 与 Audit-5 (test_distill_output_audit.mjs) 的关系

本 Phase 6.5 是 /distill **写入前**的自检;`test_distill_output_audit.mjs` 是 commit/push **链路上**的 audit。两者重叠但分工:
- Phase 6.5 防止脏数据进入 vault
- Audit-5 防止脏数据被 commit 上去(双重保险)

---

## Phase 7: Write via Obsidian MCP

### 写入前: mem 关联获取(contract § 3.8)

```bash
sqlite3 "file:$HOME/.claude-mem/claude-mem.db?mode=ro" \
  "SELECT content_session_id FROM sdk_sessions WHERE project='{project}' ORDER BY started_at_epoch DESC LIMIT 1;"
```
- 查得 → 每条新条目 frontmatter 填 `mem_ref: <content_session_id>` + `mem_status: linked`
- DB 不存在 / 查询失败 / 结果为空 → `mem_ref: null` + `mem_status: unavailable`,**不阻塞**,继续写入并在报告中提示(降级,禁止重试/中断)

### 主路径(Obsidian MCP 在线)

| MCP Tool | 使用场景 |
|---|---|
| `obsidian_write_note` | 新建条目(无命中 或 内容互补新建) |
| `obsidian_patch_note` | 增量追加(命中重复条目,补充 section) |
| `obsidian_manage_tags` | 维护层级标签(按 contract § 10.5: `ki/<category>` 根 + 类前缀) |
| `obsidian_search_notes` | 已在 Phase 5 / 6 用过 |

**写入顺序**:
1. 先 `obsidian_write_note` 或 `obsidian_patch_note` 落 markdown 内容
2. 再 `obsidian_manage_tags` 补齐层级标签
3. 写入完成后,不调用任何索引脚本(`index.json` 已冻结,见契约 § 10.4)

### Fallback(Obsidian MCP 离线)

**触发条件**: `obsidian_list_notes("/")` 返回连接错误,或主路径任何 MCP 调用失败。

**降级路径**:
1. 引用 [[ERR-007__obsidian-mcp-wrong-config-path|ERR-007]] 的诊断流程,先尝试自愈(检查 `~/.claude.json` 是否有 `obsidian-ki` 注册项)
2. 自愈失败 → 降级为直接 `Write` markdown 文件到 `KI/{path}/`
3. 提醒用户: 启动 Obsidian + 启用 Local REST API 插件后,Obsidian 会自动 reindex 新文件
4. **不阻塞 /distill 流程** — 继续走 Phase 8 Memory Cleanup

---

## Phase 8: Memory Cleanup

提纯到 Obsidian 的 memory 项需要标记 audit trail,不能简单删除。

### Cleanup 规则

| Memory 类型 | 处理 |
|---|---|
| `feedback` | 提纯后 frontmatter 加 `archived_to: KI/Internal_KI/{cat}/{file}.md`,**不删除**(audit trail) |
| `project` | 同上,加 `archived_to` |
| `reference` | 同上,加 `archived_to` |
| `user` | **不动** — user 类是身份元信息,跨 session 共享,/distill 不该动 |

### archived_to 字段写法

在 memory 文件 frontmatter 顶部追加:

```yaml
---
archived_to: KI/Error_Book/entries/ERR-007__obsidian-mcp-wrong-config-path.md
archived_at: 2026-05-17
archived_by: /distill
---
```

### 不删除的理由

- audit trail: 后续追溯哪些 memory 已沉淀到 Obsidian,哪些还在工作区
- 双轨备份: Obsidian 损坏时 memory 文件仍是可用副本
- user 类不动: 跨 session 身份信息(邮箱、日期等),不属于本 session 提纯范围

---

## 禁止行为

- 修改 `Tool/` 中任何源文件(违反 IL 04)
- 改 13 个 Anchor 文件(Cat 1 是 `/find` 的领域,/distill 不能动)
- 删除 memory 文件(只能 archive 标记)
- 动 `user` 类 memory(跨 session 身份)
- 在没有 `bootstrap: true` 例外的情况下写入 0 wiki link 条目
- 强行写 toolBox 的 Cat 5 data-analysis(契约明确 toolBox 不强填)
- 启动 `/Quality` skill 来填 Cat 7(本 REQ 不实现)
- 把多个不相关主题塞进同一 KI 条目(切片粒度违反)

## Cross-References

- 7-Category Taxonomy + Cross-Ref Gate: `KI/Internal_KI/contract.md § 3.5-3.7`
- 切片算法: `Agent/workflow/skill_ingestion.md` Phase 2.3
- 去重算法: `Agent/workflow/skill_ingestion.md` Phase 3
- KI 维护通用流程: `Agent/workflow/ki_maintenance.md`
- Obsidian MCP 诊断与 Fallback: [[ERR-007__obsidian-mcp-wrong-config-path|ERR-007]]
- Iron Laws 总门禁: `Agent/rules/iron_laws.md`
- 模板目录: `KI/Templates/`(`execution_log` / `security_config` / `pattern_entry` / `error_book_entry`)
