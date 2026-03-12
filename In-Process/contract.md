# In-Process — 项目级运行期过程文件接口契约

> **本文件是接口定义，不存放任何项目的实际过程数据。**
> 各项目根据本契约在自己的目录中创建 In-Process 实例。

## 1. 用途

In-Process 是项目级的运行期过程文件层，存放任务执行过程中产生的全部工件：
状态机、执行计划、变更清单、QA 报告、审计记录、临时文件等。

每个项目独立管理自己的 In-Process 实例，项目间互不干扰。

与 Internal_KI 的区别：
- Internal_KI = 项目级正向知识（长期保留，跨 session 复用）
- In-Process = 项目级运行期工件（随 run 生命周期流转，最终归档或清理）

## 2. 项目中的目录结构

```
{project}/
└── .in-process/
    ├── active/                    ← 当前活跃 run（最多 1 个）
    │   └── {run_id}/
    │       ├── state.json
    │       ├── requirement_package.md
    │       ├── execution_plan.md
    │       ├── task_dag.json
    │       ├── handoffs/
    │       │   └── T{n}.json
    │       ├── change_manifests/
    │       │   └── T{n}_manifest.json
    │       ├── rework_orders/
    │       │   └── rework_{n}.json
    │       ├── qa_report.md
    │       ├── req_impl_matrix.md
    │       └── delivery_cert.md
    ├── archive/                   ← 已完成 run（90 天保留）
    │   └── {run_id}/
    ├── audit/                     ← 审计记录（永不删除）
    │   └── {date}__{project}__audit__{id}__{slug}.md
    ├── index/                     ← 归档索引（永久）
    │   └── archive_manifest.json
    └── scratch/                   ← 临时文件（session 结束清理）
        └── _*.{ext}
```

## 3. 子目录职责

| 子目录 | 职责 | 保留策略 | 可删除 |
|--------|------|---------|--------|
| `active/` | 当前活跃 run 的工作空间（最多 1 个） | 直到 DELIVERED → 移至 archive/ | 归档后移除 |
| `archive/{run_id}/` | 已完成 run 的全套工件 | **90 天** | 90 天后可清理 |
| `audit/` | 永久审计记录（合规要求） | **永久** | 永不删除 |
| `index/` | archive_manifest.json 索引 | **永久** | 永不删除 |
| `scratch/` | session 范围的临时文件 | **session** | session 结束即清理 |

## 4. Run 工件说明

### 4.1 state.json — 状态机

记录 run 在生命周期中的状态转移：

```
INTAKE → PM_ANALYSIS → CTO_PLANNING → EXECUTION → QA_VERIFICATION
    ↑                                                    │
    └────────────────── REWORK ◄─────────────────────────┘
                                                         │
                                              JOINT_APPROVAL → DELIVERED
```

每次状态转移对应一个 Gate：
- **Gate1** (PM_ANALYSIS → CTO_PLANNING): 需求包完整性
- **Gate2** (CTO_PLANNING → EXECUTION): 计划 + DAG 批准
- **Gate3** (EXECUTION → QA_VERIFICATION): 所有 manifest 已提交
- **Gate4** (QA_VERIFICATION → JOINT_APPROVAL): 五层 QA PASS
- **Gate5** (JOINT_APPROVAL → DELIVERED): CTO + PM 双签

### 4.2 核心工件

| 工件 | 产出角色 | 模板/Schema | 用途 |
|------|---------|------------|------|
| `requirement_package.md` | PM | `PM/templates/requirement_package.tmpl.md` | 标准化需求 |
| `execution_plan.md` | CTO | `Agent/templates/execution_plan.tmpl.md` | 技术方案 + 文件追踪 |
| `task_dag.json` | CTO | `Agent/schemas/task_dag.schema.json` | 任务依赖图 |
| `handoffs/T{n}.json` | CTO | `Agent/schemas/handoff.schema.json` | 任务交接包 |
| `change_manifests/T{n}_manifest.json` | Execution | `Agent/schemas/change_manifest.schema.json` | 变更记录 |
| `rework_orders/rework_{n}.json` | QA | `Agent/schemas/rework_order.schema.json` | 返工指令 |
| `qa_report.md` | QA | `Agent/templates/qa_report.tmpl.md` | 五层验证结果 |
| `req_impl_matrix.md` | QA | `Agent/templates/req_impl_matrix.tmpl.md` | 需求↔实现追踪 |
| `delivery_cert.md` | CTO + PM | `Agent/templates/delivery_cert.tmpl.md` | 最终交付证书 |

## 5. 文件命名规范

### Run 目录命名
```
{run_id} = YYYYMMDD-HHMMSS
示例: .in-process/active/20260307-061500/
```

### 审计文件命名
```
{date}__{project}__{type}__{id}__{slug}.md
示例: 20260307__myapp__audit__001__skill-dedup-review.md
```

### 临时文件命名
```
_*.{ext}    (下划线前缀标识临时文件)
示例: _20260307_perf_analysis.md
```

### 字段说明
| 字段 | 格式 | 约束 |
|------|------|------|
| date | YYYYMMDD | — |
| project | kebab-case | ≤20 字符 |
| type | plan / audit / run / report / analysis | 固定枚举 |
| id | 三位序号 001-999 或 REQ-{id} | — |
| slug | kebab-case | ≤30 字符 |

## 6. 生命周期

### 6.1 Session/Run 开始时
- [ ] 检查 `.in-process/scratch/` 是否有上次残留 → 清理或 promote
- [ ] 检查 `.in-process/active/` 是否有未归档的旧 run → 归档到 archive/

### 6.2 Session/Run 结束时
- [ ] 清空 `.in-process/scratch/`（已 promote 的除外，promote 后再删除原件）
- [ ] 将 `.in-process/active/{id}/` 移到 `.in-process/archive/{id}/`
- [ ] 更新 `.in-process/index/archive_manifest.json`

### 6.3 定期维护（建议每月或每 10 个 run）
- [ ] 检查 `.in-process/archive/` 中超过 90 天的 run → 可清理
- [ ] 清理前建议导出关键 findings 到 Internal_KI

## 7. Promotion 流程（临时 → 正式）

```
.in-process/scratch/_analysis.md
    │
    ├── 有审计价值 → 创建正式 audit 工件 (.in-process/audit/)
    ├── 有计划价值 → 创建正式 plan 工件 (.in-process/active/{id}/)
    ├── 有知识价值 → 追加到 .claude/internal_ki/
    └── 无保留价值 → session 结束时删除
```

## 8. archive_manifest.json 格式

```json
{
    "_meta": {
        "projectName": "{project_name}",
        "projectPath": "{project_absolute_path}",
        "description": "Archive index — all completed run records",
        "version": "1.0",
        "lastUpdated": "YYYY-MM-DD"
    },
    "entries": [
        {
            "runId": "{YYYYMMDD-HHMMSS}",
            "taskId": "TASK-{NNN}",
            "description": "{run 描述}",
            "status": "archived",
            "archivedDate": "YYYY-MM-DD",
            "artifacts": [
                "requirement_package.md",
                "execution_plan.md",
                "task_dag.json",
                "qa_report.md",
                "delivery_cert.md",
                "change_manifests/T1_manifest.json"
            ],
            "kiRefback": {
                "decisionsExtracted": [],
                "lessonsExtracted": [],
                "errorsRecorded": []
            },
            "tags": []
        }
    ],
    "lifecycle": {
        "activeRetention": "until completion or cancellation",
        "archiveRetention": "90 days",
        "auditRetention": "permanent",
        "scratchRetention": "session-scoped, cleared at session end"
    }
}
```

## 9. 索引同步规则

**强制约束**：run 完成归档时，必须同步更新 `archive_manifest.json`。

- 新 run 归档 → entries 追加 entry
- kiRefback 记录从本次 run 提炼到 Internal_KI / Error_Book 的条目
- tags 用于后续检索

## 10. 全局 Agent Skill 链接方式

项目 CLAUDE.md 中必须声明 In-Process 路径：

```markdown
## In-Process（运行期过程文件）
- **接口契约**: `{TOOLBOX}/In-Process/contract.md`
- **路径**: `.in-process/`
- **索引**: `.in-process/index/archive_manifest.json`
```

全局 Agent Skill 通过读取项目 CLAUDE.md 获取路径，再按需读写过程文件。

## 11. Token 优化策略

1. **不预加载**: In-Process 文件仅在 run 执行时读写，非 run 状态不加载
2. **state.json 做路由**: 通过 state.json 判断当前阶段，只加载当前阶段需要的工件
3. **archive 不加载**: 归档的 run 仅在明确需要回溯时读取
