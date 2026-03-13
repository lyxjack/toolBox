# Artifact Lifecycle — 工件生命周期治理规范
# Version: 2.0 (替代 temp_artifact_lifecycle.md v1.0)

---

## 1. 工件分类

### 1.1 Global Governance Files(全局治理文件)
| 位置 | 内容 | 生命周期 | 可否删除 |
|------|------|---------|---------|
| `Agent/rules/constitution.md` | 治理宪章 | **永久** | ❌ 不可 |
| `Agent/rules/iron_laws.md` | 铁律 | **永久** | ❌ 不可 |
| `Agent/rules/qa_standard.md` | QA 规范 | **永久** | ❌ 不可 |
| `Agent/rules/plan_driven_mode.md` | Plan 模式规则 | **永久** | ❌ 不可 |
| `Agent/rules/audit_ledger_mode.md` | Audit 模式规则 | **永久** | ❌ 不可 |
| `Agent/rules/artifact_lifecycle.md` | 本文件 | **永久** | ❌ 不可 |
| `Agent/schemas/*.json` | Schema 定义 | **永久** | ❌ 不可 |
| `Agent/templates/*.md` | 模板 | **永久** | ❌ 不可 |
| `KI/Error_Book/` | 全局错误记忆 | **永久追加** | ❌ 不可 |
| `Agent/roles/*.md` | 角色定义 | **永久** | ❌ 不可 |
| `Agent/workflow/*.md` | 工作流 | **永久** | ❌ 不可 |

### 1.2 Project Operational Records(项目运营记录)
| 位置 | 内容 | 生命周期 | 可否删除 |
|------|------|---------|---------|
| `Agent/rules/project_rules.md` | 项目规则 | **项目期** | ❌ 项目存续期内不可 |
| `Agent/index/skill_registry.json` | Skill 启用清单 | **项目期** | ❌ 不可 |
| `Agent/index/duplicate_review.json` | Skill 治理记录 | **项目期** | ❌ 不可 |
| `.in-process/audit/*.md` | 审计记录 | **永久** | ❌ 审计记录永不删除 |
| `KI/Internal_KI/index.json` | 项目记忆 | **项目期** | ❌ 不可 |

### 1.3 Run Artifacts(运行工件)
| 位置 | 内容 | 生命周期 | 可否删除 |
|------|------|---------|---------|
| `.in-process/active/{id}/state.json` | 状态机 | **Active run** → 归档 | 归档后保留 |
| `.in-process/active/{id}/*.md` | Plan/Report/Cert | **Active run** → 归档 | 归档后保留 |
| `.in-process/active/{id}/*.json` | DAG/Manifest/Handoff | **Active run** → 归档 | 归档后保留 |
| `.in-process/archive/{id}/` | 已完成 run | **90 天** | ✅ 90 天后可清理 |
| `.in-process/scratch/*` | 临时文件 | **Session** | ✅ Session 结束即清理 |

---

## 2. 5-Layer 目录结构与职责

```
toolBox/
├── Agent/rules/← 项目级配置(长期保留)
│   └── project_rules.md项目约束、技术栈、测试要求
│
├── Agent/index/← 项目级 Skill 治理(长期保留)
│   ├── skill_registry.json        启用的 skill 清单 + 使用效果
│   └── duplicate_review.json      重复 skill 的治理决策记录
│
├── .in-process/audit/← 审计记录(永不删除)
│   └── {date}__{proj}__audit__{id}__{slug}.md
│
├── In-Process/← 运行记录
│   ├── active/                    当前活跃 run(最多 1 个)
│   │   └── {run_id}/
│   │       ├── state.json
│   │       ├── plan.md            ← 正式 plan(非随手笔记)
│   │       ├── requirement_package.md
│   │       ├── execution_plan.md
│   │       ├── task_dag.json
│   │       ├── handoffs/T{n}.json
│   │       ├── change_manifests/T{n}_manifest.json
│   │       ├── rework_orders/rework_{n}.json
│   │       ├── qa_report.md
│   │       ├── req_impl_matrix.md
│   │       └── delivery_cert.md
│   └── archive/                   已完成 run(90 天保留)
│       └── {run_id}/
│
├── KI/Internal_KI/← 项目级记忆(长期保留)
│   └── index.json                 跨 session 的学习和决策
│
└── .in-process/scratch/← 临时文件(session 结束清理)
    └── _*.{ext}                   调试脚本、中间数据、草稿
```

---

## 3. 命名规则

### 3.1 格式
```
{date}__{project}__{type}__{id}__{slug}.{ext}

字段说明:
  date    = YYYYMMDD
  project = 项目短名 (kebab-case, ≤20 字符)
  type    = plan | audit | run | report | analysis
  id      = 三位序号 001-999 或 REQ-{id}
  slug    = 描述性短语 (kebab-case, ≤30 字符)
  ext     = md | json
```

### 3.2 实际命名样例

| 场景 | 文件名 |
|------|--------|
| API 重构的 plan | `20260307__myapp__plan__001__api-refactor.md` |
| Skill 去重审计 | `20260307__toolbox__audit__001__skill-dedup-review.md` |
| 安全审查 | `20260308__myapp__audit__002__security-review.md` |
| 某次 run 的 QA report | `20260307__myapp__report__REQ-20260307-061500__qa-result.md` |
| 性能分析(临时) | `.in-process/scratch/_20260307_perf_analysis.md` (session 结束删除)|

### 3.3 Run 目录命名
```
{run_id} = YYYYMMDD-HHMMSS
示例: .in-process/active/20260307-061500/
```

---

## 4. 生命周期状态

```
                    ┌──────────┐
                    │  active  │ ← 创建时的初始状态
                    └────┬─────┘
                         │
            ┌────────────┼────────────┐
            â–¼            â–¼            â–¼
     ┌────────────┐ ┌─────────┐ ┌───────────┐
     │ superseded │ │ closed  │ │  expired  │
     └────┬───────┘ └────┬────┘ └─────┬─────┘
          │              │            │
          â–¼              â–¼            â–¼
     ┌──────────────────────────────────────┐
     │             archived                  │
     └──────────────────┬───────────────────┘
                        │ (90 天后)
                        â–¼
                  ┌───────────┐
                  │  deleted  │
                  └───────────┘
```

| 状态 | 定义 | 触发条件 |
|------|------|---------|
| **active** | 当前正在使用 | 创建时 |
| **superseded** | 被新版本替代 | plan/audit 更新后旧版标记 |
| **closed** | 任务完成 | Run DELIVERED / Audit 全 resolved |
| **expired** | 超过保留期 | tmp 文件 session 结束 |
| **archived** | 移入归档存储 | closed 后移到 .in-process/archive/ |
| **deleted** | 物理删除 | archive 满 90 天 / expired |

---

## 5. 保留与删除规则

### 5.1 不可删除(永久保留)
- `Agent/rules/` 下的所有文件
- `Agent/rules/` 下的文件
- `Agent/index/` 下的文件
- `.in-process/audit/` 下的文件
- `KI/Internal_KI/` 下的文件

### 5.2 可归档(保留 90 天后可清理)
- `.in-process/archive/{id}/` — 已完成 run 的全套工件
- 清理前建议导出关键 findings 到 `KI/Internal_KI/`

### 5.3 可删除(session 结束即清理)
- `.in-process/scratch/` 下的所有文件
- **注意**: 如果 tmp 中有价值的内容,必须在 session 结束前 promote:
  - 分析结果 → `KI/Internal_KI/`
  - 可复用脚本 → 项目代码目录
  - 审计发现 → `.in-process/audit/`

### 5.4 Promotion 流程(临时 → 正式)
```
.in-process/scratch/_analysis.md
    │
    ├── 有审计价值 → 创建正式 audit 工件 (.in-process/audit/)
    ├── 有计划价值 → 创建正式 plan 工件 (.in-process/active/{id}/)
    ├── 有记忆价值 → 追加到 KI/Internal_KI/index.json
    └── 无保留价值 → session 结束时删除
```

---

## 6. 执行时机

### 6.1 Session/Run 开始时
- [ ] 检查 `.in-process/scratch/` 是否有上次残留 → 清理或 promote
- [ ] 检查 `.in-process/active/` 是否有未归档的旧 run → 归档到 archive/

### 6.2 Session/Run 结束时
- [ ] 清空 `.in-process/scratch/`(已 promote 的除外,promote 后再删除 tmp 原件)
- [ ] 将 `.in-process/active/{id}/` 移到 `.in-process/archive/{id}/`

### 6.3 定期维护(建议每月或每 10 个 run)
- [ ] 检查 `.in-process/archive/` 中超过 90 天的 run → 可清理
- [ ] 检查 `KI/Internal_KI/index.json` → 清理过时条目

---

## 7. 规则归属

### 应进入 Constitution 的规则
- 工件分类三层体系(Global / Project / Run)
- Plan 和 Audit 是正式工件,不是随手笔记
- 审计记录永不删除
- Global 文件永不删除

### 应进入 Iron Laws 的规则
- Iron Law 09(已有): 临时文件纳入规范目录
- Iron Law 10(已有): 大变更必须 Plan-Driven

### 应进入 Project Rules 的规则
- 项目特定的保留期调整(90 天可按项目调整)
- 项目特定的命名规则扩展
- 项目特定的 promote 判断标准
