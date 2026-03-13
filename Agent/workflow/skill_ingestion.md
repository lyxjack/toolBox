---
description: 新外部 Skill 库入库流程(Anchor 机制)。从 Tool/ 审计 → 切片 → 与 Category Anchor 对比 → 增量写入 → 重建索引。每个 Category 有且仅有一个 Anchor md,永不替换,只做增量。
verified: 2026-03-11
---

# Skill Ingestion Workflow (Anchor-Based)

## 核心架构

```
External_KI/skills/
├── frontend/frontend.md          ← 唯一 Anchor
├── backend/backend.md            ← 唯一 Anchor
├── testing/testing.md            ← 唯一 Anchor(含 Tier 分层)
├── security/security.md          ← 唯一 Anchor
├── devops/devops.md              ← 唯一 Anchor
├── ai-agent/ai-agent.md          ← 唯一 Anchor
├── content/content.md            ← 唯一 Anchor
├── language-specific/language-specific.md  ← 唯一 Anchor
├── mobile-native/mobile-native.md          ← 唯一 Anchor
├── workflow/workflow.md          ← 唯一 Anchor
├── meta-tooling/meta-tooling.md  ← 唯一 Anchor
└── business/business.md          ← 唯一 Anchor
```

> **铁律**: 每个 Category 下有且仅有一个 md 文件(Anchor)。Anchor 一经认定,**永不替换**。新外部库只在 Anchor 基础上**增量写入**(取长补短,不重复)。

## 触发条件

用户提供外部 Skill 库(GitHub 链接或其他来源),Agent 自动执行本流程整合入 `KI/External_KI/`。

> **自动路由**: 用户给出外部库链接时,Agent 无需用户指定路径,直接 clone 到 `Tool/` 并执行本流程。

## 前置约束 — Skill/KI 子门禁
> 进入本工作流时,以下铁律自动生效(全文见 `Agent/rules/iron_laws.md`)。

| 铁律 | 一句话 | 门禁效果 |
|------|--------|---------|
| **IL 04** | SOURCE PRESERVATION | Tool/ 中源文件只读 |
| **IL 11** | SKILL FILE GOVERNANCE | Skill 增删改必须同步所有索引 |
| **IL 03** | REUSE BEFORE BUILD | 先查现有能力再新建 |

- **Anchor 铁律**: Anchor 永不替换,只做增量写入,严格去重确保无重复内容

## 数据流总览

```
Phase 1         Phase 2              Phase 3                Phase 4              Phase 5         Phase 6
Clone &    →    Deep            →    Anchor             →    Incremental     →    Rebuild    →    Audit
Inventory       Audit                Compare                 Write                Index           Report
                                     ⛔ 强制门禁                                 ⛔ CI 验证

产出:           产出:                产出:                   产出:                产出:           产出:
Skill清单       20信号评分           对比矩阵                 Change Manifest      更新后的索引     结构化报告
(名称,路径,     知识切片             增量写入决策              (增量内容记录)       一致性验证
 大小,行数)     (模块A/B/C)
```

> **强制处理顺序**: 外部库中的每个 Skill 必须**逐个**通过 Phase 2→3→4。不得批量跳过 Phase 3。

---

## Phase 1: Clone & Inventory(克隆与清点)

### Step 1.1 — Clone 到 Tool/

```bash
cd {TOOLBOX}/Tool/
git clone <repo-url>
```

- 目标目录: `{TOOLBOX}/Tool/{repo-name}/`
- 验证: `ls` 确认目录结构完整

### Step 1.2 — Skill 清点

遍历新仓库,定位所有 `SKILL.md` 文件,产出 **Skill 清单**(名称、路径、文件大小、行数)。

### Step 1.3 — 排除项

- 翻译文件(`/docs/ja-JP/`, `/docs/zh-CN/` 等)
- 已在 `duplicate_review.json` 中标记为 rejected 的 skill
- 同一 skill 在仓库内的镜像副本(如 `.agents/skills/` vs `skills/`),取主版本

### Step 1.4 — Category 归类

为清单中的每个 Skill 确定所属 Category(12 类之一),标注对应的 Anchor 文件路径。

---

## Phase 2: Deep Audit(深度审计)

### Step 2.1 — 内容理解

逐个阅读每个 SKILL.md,提取:

| 维度 | 提取内容 |
|------|---------|
| **核心功能** | 这个 skill 到底在做什么 |
| **适用场景** | 何时应该使用 |
| **知识模块** | 拆解为独立知识单元(A, B, C...) |
| **代码示例** | 包含的语言和示例质量 |
| **依赖关系** | 是否依赖其他 skill 或工具 |

### Step 2.2 — 20 信号质量评分

| 信号 | 满分 | 检查项 |
|------|------|--------|
| frontmatter | 4 | YAML 元数据完整性 |
| name | 2 | 命名规范 (kebab-case) |
| desc | 2 | 描述清晰度 |
| whenToUse | 4 | 明确使用场景 |
| headings5+ | 4 | H2 标题数 ≥ 5 |
| h3depth | 4 | H3 层级结构 |
| code8+ | 12 | 代码块数 ≥ 8 |
| goodBad | 5 | 正反示例对比 |
| multiLang | 5 | 多语言代码 |
| examples | 3 | 具体示例 |
| checklist | 5 | 行动清单 |
| bash | 4 | Bash 命令示例 |
| tables | 4 | 结构化表格 |
| bullets20+ | 4 | 要点 ≥ 20 |
| antiPatterns | 3 | 反模式文档 |
| lines300+ | 8 | 内容 ≥ 300 行 |
| companions | 4 | 伴随文件 |
| companionDirs | 4 | 伴随目录 |
| references | 4 | 引用/参考 |
| **合计** | **85** | confidence = rawScore / 100 (上限 1.0) |

### Step 2.3 — 知识切片

将每个 skill 拆解为可对比的**知识模块**:

```
skill-x 的知识模块:
  A: "API 设计原则" (lines 10-80)
  B: "错误处理模式" (lines 81-150)
  C: "认证流程" (lines 151-220)
```

每个模块标注: 模块名称、行范围、核心要点摘要(3-5 条)、模块级质量评估。

---

## Phase 3: Anchor Compare(Anchor 对比) — 强制门禁

> **Iron Law 11.1 §5-6 强制要求**: 每个外部 Skill 入库前**必须**与对应 Category 的 Anchor 进行逐模块对比。不得批量跳过。
>
> **Anchor 铁律**: Anchor 永不被替换。对比结果只决定"是否有增量内容可写入 Anchor"。

### Step 3.0 — 强制门禁(Gate)

每个外部 Skill 入库前必须通过以下检查,缺一不可:

- [ ] 已读取对应 Category 的 Anchor md 文件
- [ ] 已对外部 Skill 执行知识切片(Phase 2.3)
- [ ] 已对 Anchor 执行知识切片(同样方法)
- [ ] 已完成逐模块对比,产出对比矩阵
- [ ] 已确认增量内容不与 Anchor 现有内容重复
- [ ] 已完成所有模块的逐一对比,每个模块有独立的增量/跳过决策
- [ ] 若所有模块均为 Anchor 更优,记录"全模块跳过"决策及原因

> **违反此门禁即违反 Iron Law 11.1 §5-6,触发 ISO-003。**

### Step 3.1 — 读取 Anchor

读取 `KI/External_KI/skills/{category}/{category}.md`,对其执行知识切片,产出 Anchor 的模块清单。

### Step 3.2 — 逐模块对比

将外部 Skill 的知识模块与 Anchor 的知识模块逐一对比:

```
外部 skill-x 模块:  A1, B1, C1
Anchor 模块:        A2, B2, D2

对比矩阵:
┌──────────┬──────────┬──────────┬──────────────────────┐
│ 模块     │ 外部(分) │ Anchor(分)│ 决策                 │
├──────────┼──────────┼──────────┼──────────────────────┤
│ A (API)  │ A1(0.6)  │ A2(0.8)  │ ❌ Anchor 更优,跳过 │
│ B (错误) │ B1(0.9)  │ B2(0.5)  │ ✅ 增量写入 Anchor   │
│ C (认证) │ C1(0.7)  │ —        │ ✅ 新模块,追加      │
│ D (缓存) │ —        │ D2(0.7)  │ ❌ Anchor 已有,保留 │
└──────────┴──────────┴──────────┴──────────────────────┘
```

### Step 3.3 — 模块级置信度评估标准

| 维度 | 权重 | 评估标准 |
|------|------|---------|
| **深度** | 30% | 解释是否透彻,是否涵盖边界情况 |
| **准确性** | 25% | 技术内容是否正确,是否符合最佳实践 |
| **可操作性** | 20% | 是否可直接应用,代码示例是否可运行 |
| **覆盖面** | 15% | 是否涵盖该主题的关键方面 |
| **时效性** | 10% | 是否反映最新技术栈和最佳实践 |

**模块置信度** = Σ(维度分数 × 权重)

### Step 3.4 — 增量决策规则

> **宗旨**: Anchor 永不被替换。只做增量。Anchor 已有且更优的内容不动。

| 场景 | 决策 | 对 Anchor 的操作 |
|------|------|-----------------|
| Anchor 模块更优 | **跳过** | 不修改 |
| 外部模块更优且 Anchor 已有同主题 | **增量补充** | 在 Anchor 对应段落追加更优的代码/解释,不删除原有内容 |
| 外部模块涵盖 Anchor 没有的主题 | **追加新段落** | 在 Anchor 相关位置追加新段落 |
| 外部与 Anchor 内容高度重复 | **逐模块对比** | 即使整体相似度高,仍逐模块比较,取各模块最优版本。跳过的模块记录到 `duplicate_review.json` |
| 外部 Skill 整体无增量价值 | **跳过** | 不修改,记录"无需写入" |

**关键约束**:
- **不得删除** Anchor 中的任何现有内容
- **不得替换** Anchor 中的任何段落(只能在段落后追加补充)
- **不得写入** 与 Anchor 已有内容语义重复的内容
- 增量内容必须标注来源: `<!-- incremental: {source_skill}, {date} -->`

---

## Phase 4: Incremental Write(增量写入)

### Step 4.1 — 增量写入到 Anchor

根据 Phase 3.4 的决策,在 Anchor md 文件中追加增量内容:

1. **定位**: 找到 Anchor 中与增量内容相关的段落
2. **追加**: 在该段落末尾或相关 section 末尾追加新内容
3. **标注**: 增量内容首行添加来源注释
4. **去重检查**: 写入前最终确认不与已有内容重复

```markdown
## 某段落(Anchor 原有内容)

原有内容保持不变...

<!-- incremental: new-external-skill, 2026-03-15 -->
### 补充: 额外的模式
从新外部库提取的增量内容...
```

### Step 4.2 — 更新 Anchor Frontmatter

增量写入后,更新 Anchor 的 frontmatter:

```yaml
---
lastUpdated: YYYY-MM-DD   # 更新日期
merged_from:               # 追加新条目
  - { name: new-skill, confidence: 0.XX, origin: repo-name, date: YYYY-MM-DD }
---
```

### Step 4.3 — Change Manifest

Phase 4 完成后,输出结构化变更记录:

```json
{
  "changes": [
    {
      "anchor": "backend",
      "action": "incremental_write",
      "source_skill": "new-api-patterns",
      "modules_added": ["circuit-breaker", "rate-limiting"],
      "modules_skipped": ["REST-basics (anchor already covers)"],
      "lines_added": 45
    }
  ],
  "anchors_unchanged": ["frontend", "security"],
  "skills_with_no_increment": ["low-value-skill (anchor fully covers)"]
}
```

---

## Phase 5: Rebuild Index(重建索引) — CI 验证

### Step 5.1 — 更新文件清单

必须同步更新以下所有文件(遗漏任一项即违反 Iron Law 11):

| 文件 | 更新内容 |
|------|---------|
| `KI/External_KI/master_index.json` | `_meta` 元数据、各类别 `skills` 数组和 `quickLookup` |
| `KI/External_KI/categories/{cat}.json` | 对应类别的 Anchor 元数据(bulletPoints、tokenEstimate、confidence) |
| `KI/External_KI/quality_audit.json` | 新增外部 skill 的审计记录(标记为已合并入 Anchor) |
| `KI/External_KI/cross_references.json` | 更新跨类别引用关系 |
| `Agent/index/skill_registry.json` | 更新 Anchor 的元数据 |
| `Agent/index/duplicate_review.json` | 新增去重审查记录 |

### Step 5.2 — CI 层级一致性验证

完成更新后,执行以下验证(每项必须 PASS):

- [ ] 每个 Category 目录下有且仅有 1 个 md 文件(Anchor)
- [ ] `master_index.json` 的 `totalSkills` = 12(每 Category 一个 Anchor)
- [ ] 每个 Category 索引的 `skillCount` = 1
- [ ] `quickLookup` 包含所有 12 个 Anchor
- [ ] Anchor 的 `lastUpdated` 已更新
- [ ] `quality_audit.json` 包含新增外部 skill 的记录
- [ ] 所有 JSON 文件可正常解析
- [ ] Anchor 中无重复内容段落

---

## Phase 6: Audit Report(审计报告)

```markdown
## Skill Ingestion Report (Anchor-Based)

### Source
- Repo: {repo-name}
- URL: {url}
- Total skills found: N
- Excluded (translations/duplicates): N

### Increment Results
| Anchor | Skills Compared | Modules Added | Modules Skipped | Lines Added |
|--------|----------------|---------------|-----------------|-------------|
| backend | 3 | 5 | 8 | 120 |
| testing | 2 | 3 | 12 | 85 |
| ... | ... | ... | ... | ... |

### Anchors Unchanged
- frontend (all modules already covered)
- security (existing content superior)

### Verification
| Check | Result |
|-------|--------|
| 1 md per Category | PASS |
| totalSkills = 12 | PASS |
| JSON valid | PASS |
| No duplicate content | PASS |

### Index Updates
- [x] master_index.json
- [x] categories/*.json
- [x] quality_audit.json
- [x] cross_references.json
- [x] skill_registry.json
- [x] duplicate_review.json
```

---

## 禁止行为(违反触发 ISO-003)

- 修改或删除 `Tool/` 中的任何源文件(Iron Law 04)
- **替换 Anchor md 文件**(Anchor 铁律 — 只做增量写入,永不替换)
- **删除 Anchor 中的现有内容**(Anchor 铁律)
- 在 Category 目录下创建第二个 md 文件(每 Category 有且仅有一个 Anchor)
- 批量导入而不逐个执行 Phase 3 对比(Iron Law 11.1 §5)
- 跳过 Phase 3 门禁直接写入 Anchor(Iron Law 11.1 §5-6)
- 写入与 Anchor 已有内容语义重复的内容(去重铁律)
- 更新 Anchor 但不同步更新索引文件(Iron Law 11)
- 将门禁描述为"建议"或"可选"— 所有门禁均为**强制**,不可降级

## 新 Category 初始化流程

当外部库包含现有 12 个 Category 均无法归类的 skill 时:

1. 确认确实需要新 Category(不可强行归入现有类别)
2. 在 `KI/External_KI/skills/` 下创建新 Category 目录(kebab-case)
3. 从该 Category 的所有候选 skill 中选出置信度最高的作为 Anchor 基准
4. 其余 skill 按 Phase 3→4 流程增量写入 Anchor
5. 更新所有 6 个索引文件
6. Anchor 一经创建,适用所有 Anchor 铁律
