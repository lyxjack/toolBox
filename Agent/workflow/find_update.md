---
description: 外部库版本更新工作流。扫描 Tool/ 所有上游仓库,检测更新,智能对比后替换,并触发 skill_ingestion 重新入库。
trigger: /find-update
---

# /find-update — 外部库版本更新工作流

## 前置约束 — Skill/KI 子门禁

> 进入本工作流时,以下铁律自动生效(全文见 `Agent/rules/iron_laws.md`)。

| 铁律 | 一句话 | 门禁效果 |
|------|--------|---------|
| **IL 04** | SOURCE PRESERVATION (含 /find-update 例外) | 仅本工作流可替换 Tool/ 中的外部库目录 |
| **IL 11** | SKILL FILE GOVERNANCE | Skill 增删改必须同步所有索引 |
| **IL 03** | REUSE BEFORE BUILD | 先查现有能力再新建 |

## 数据源

| 文件 | 用途 |
|------|------|
| `{TOOLBOX}/Agent/index/source_registry.json` | 上游仓库清单、提取路径、版本追踪 |
| `{TOOLBOX}/KI/External_KI/master_index.json` | 现有 Anchor 索引 |
| `{TOOLBOX}/Agent/workflow/skill_ingestion.md` | Phase 5 重新入库流程 |

---

## Phase 1: 扫描更新 (Scan)

**输入**: 用户执行 `/find-update`。

### Step 1.1 — 加载 Source Registry
读取 `{TOOLBOX}/Agent/index/source_registry.json`,获取 `upstreams[]` 列表。

### Step 1.2 — 逐上游检查更新
对每个 upstream,按 `trackMethod` 执行检查:

**releases+commits 类型:**
```bash
# 检查最新 release
gh api repos/{owner}/{repo}/releases/latest --jq '.tag_name,.published_at,.body' 2>/dev/null

# 检查最近 commits (对比 lastChecked 日期)
gh api repos/{owner}/{repo}/commits --jq '.[0:5] | .[] | [.sha[:7], .commit.message[:80], .commit.author.date[:10]] | @tsv'
```

**commits 类型:**
```bash
# 仅检查最近 commits
gh api repos/{owner}/{repo}/commits --jq '.[0:5] | .[] | [.sha[:7], .commit.message[:80], .commit.author.date[:10]] | @tsv'
```

**对于 monorepo 类型 upstream:**
需要额外检查特定子目录是否有变更:
```bash
# 检查特定子目录的最近变更
gh api "repos/{owner}/{repo}/commits?path={subpath}" --jq '.[0:3] | .[] | [.sha[:7], .commit.message[:80], .commit.author.date[:10]] | @tsv'
```

### Step 1.3 — 产出更新候选清单

汇总扫描结果,格式:

| 上游仓库 | 影响目录 | 本地版本 | 上游最新 | 最近变更摘要 | 状态 |
|----------|---------|---------|---------|-------------|------|
| obra/superpowers | superpowers, sdd, debugging, tdd | 未知 | v5.0.5 | 架构重构... | 有更新 |
| anthropics/skills | canvas-design, find-skills, skill-creator | 未知 | (3月18日commit) | ... | 有更新 |
| ... | ... | ... | ... | ... | 无更新 |

> 此步骤自动执行,无需用户确认。直接进入 Phase 2 处理所有「有更新」的上游。

---

## Phase 2: 拉取与对比 (Fetch & Compare)

### Step 2.1 — Clone 新版本到临时目录
对每个有更新的 upstream:

```bash
# Clone 到 scratch 目录
git clone --depth 1 {github_url} {TOOLBOX}/.in-process/scratch/update_{upstream_id}/
```

### Step 2.2 — 提取子目录(monorepo 类型)
对于 monorepo 类型 upstream,提取对应子目录:
```bash
# 例: obra/superpowers 中的 skills/systematic-debugging/
cp -r {scratch}/skills/systematic-debugging/ {scratch}/extracted/systematic-debugging/
```

standalone 类型则直接使用整个 clone 目录。

### Step 2.3 — 逐目录内容对比
对每个 Tool/{dir},对比新旧版本:

**a) 量化 diff:**
```bash
diff -rq {TOOLBOX}/Tool/{dir}/ {scratch}/extracted/{dir}/ | wc -l
diff -r {TOOLBOX}/Tool/{dir}/ {scratch}/extracted/{dir}/ --stat
```

**b) 关键文件变更:**
重点检查:
- `SKILL.md` / `AGENTS.md` — 核心指令是否变化
- `README.md` — 功能描述是否变化
- `package.json` — 版本号是否变化
- `CHANGELOG.md` / `RELEASE-NOTES.md` — 变更说明
- 新增/删除的文件

**c) 上游变更说明:**
如有 release notes 或 CHANGELOG,提取相关内容。

### Step 2.4 — 模型智能评估
对每个目录,模型基于以下维度判定是否值得更新:

| 维度 | 权重 | 评估标准 |
|------|------|---------|
| **功能增强** | 35% | 新增功能、新 skill 模块、新代码示例 |
| **质量提升** | 25% | 更好的文档结构、更详细的说明、错误修复 |
| **覆盖面扩展** | 20% | 新语言支持、新框架适配、新场景覆盖 |
| **破坏性变更** | 10% | 是否有不兼容改动(负面权重) |
| **活跃度信号** | 10% | commit 频率、社区参与度、维护者响应 |

**评估输出:**
```
更新评估: systematic-debugging (obra/superpowers)
  功能增强: 0.8 — 新增 3 种调试策略
  质量提升: 0.6 — 文档结构重组
  覆盖面:  0.4 — 无新语言
  破坏性:  0.1 — 无不兼容改动
  活跃度:  0.9 — 2天内有新commit
  综合得分: 0.67
  决策: UPDATE
```

### Step 2.5 — 产出更新决策矩阵

| Tool/ 目录 | 综合得分 | 决策 | 关键原因 |
|------------|---------|------|---------|
| superpowers | 0.82 | UPDATE | 架构重构,9个新skill |
| systematic-debugging | 0.67 | UPDATE | 3种新调试策略 |
| canvas-design | 0.15 | SKIP | 仅格式微调,无实质变化 |
| content-strategy | 0.71 | UPDATE | v1.2.0 新增 Composio 集成 |

**决策规则:**
- 综合得分 >= 0.5 → **UPDATE**
- 综合得分 0.3 ~ 0.5 → **REVIEW** (记录,下次再检查)
- 综合得分 < 0.3 → **SKIP**

> 自动执行,无需逐个确认。决策矩阵完成后直接进入 Phase 3。

---

## Phase 3: 替换 (Replace)

> **本 Phase 受 IL 04 /find-update 例外授权。**

### Step 3.1 — 替换前检查
对每个决策为 UPDATE 的目录:
- 确认 `{TOOLBOX}/Tool/{dir}/` 存在
- 确认新版本提取完整

### Step 3.2 — 执行替换
```bash
# 删除旧版本
rm -rf {TOOLBOX}/Tool/{dir}/

# 移入新版本
mv {scratch}/extracted/{dir}/ {TOOLBOX}/Tool/{dir}/
```

### Step 3.3 — 更新 Source Registry
更新 `source_registry.json` 中对应 repo 条目:
- `currentVersion` → 新版本号(如有)
- `lastCommitHash` → 新版本 commit hash
- `lastChecked` → 当前日期

---

## Phase 4: 重新入库 (Re-ingest)

**目标**: 对所有 UPDATE 的目录,重新执行 `/find` 的后半部分流程。

### Step 4.1 — 触发 Skill Ingestion
严格按 `{TOOLBOX}/Agent/workflow/skill_ingestion.md` 对每个更新的目录执行:

- **Phase 2 (Deep Audit)**: 20 信号质量评分 + 知识切片
- **Phase 3 (Anchor Compare)**: 与对应 Category Anchor 逐模块对比(强制门禁)
  - 重点关注: 新版本中**新增**的模块 vs Anchor 现有内容
  - 旧版本已入库的模块如果新版本有更优版本 → 标记为**增量替换**候选
- **Phase 4 (Incremental Write)**: 增量写入 Anchor
  - 新增模块 → 追加到 Anchor 对应 section
  - 更优模块 → 在 Anchor 中追加新版本内容,保留旧版本,标注来源
  - 标签格式: `<!-- incremental-update: {source_skill}, {old_version} → {new_version}, {date} -->`
- **Phase 5 (Rebuild Index)**: 同步更新 6 个索引文件
- **Phase 6 (Audit Report)**: 输出入库报告

> **不得跳过 skill_ingestion.md 的任何 Phase 或 Gate。**

### Step 4.2 — 批量处理策略
当多个目录来自同一 upstream 且归属同一 Category Anchor 时:
- 合并为一次 Anchor Compare,避免重复读取 Anchor
- 逐模块对比仍然独立执行

---

## Phase 5: 清理与报告 (Cleanup & Report)

### Step 5.1 — 清理临时文件
```bash
rm -rf {TOOLBOX}/.in-process/scratch/update_*/
```

### Step 5.2 — 产出更新报告

```markdown
## /find-update Report — {date}

### Scan Summary
- Upstreams checked: {N}
- Updates detected: {N}
- Updates applied: {N}
- Skipped (no value): {N}

### Updates Applied
| Tool/ 目录 | 上游仓库 | 旧版本 | 新版本 | 评估得分 | Anchor 影响 |
|------------|---------|--------|--------|---------|------------|
| superpowers | obra/superpowers | unknown | v5.0.5 | 0.82 | workflow, testing |
| content-strategy | coreyhaines31/marketingskills | v1.1.0 | v1.2.0 | 0.71 | content |

### Anchor Changes
| Anchor | 新增模块 | 更新模块 | 跳过模块 | 新增行数 |
|--------|---------|---------|---------|---------|
| workflow | 3 | 1 | 5 | 120 |
| content | 2 | 0 | 8 | 85 |

### Skipped Updates
| Tool/ 目录 | 原因 | 得分 |
|------------|------|------|
| canvas-design | 仅格式微调 | 0.15 |

### Index Updates
- [x] source_registry.json
- [x] master_index.json
- [x] categories/*.json
- [x] quality_audit.json
- [x] cross_references.json
- [x] skill_registry.json
- [x] duplicate_review.json

### Next Check
建议下次检查日期: {date + 14 days}
```

---

## Phase 6: 全链路 CI 集成测试 (End-to-End CI Verification)

> **目的**: 确保所有索引切片数据一致且精确,使日后模型调用时以最少 token 定位到正确 Anchor 和模块。
> 本 Phase 为强制门禁——任何一项 FAIL 则整个 `/find-update` 标记为失败,必须修复后重跑。

### Step 6.1 — 索引一致性验证 (Index Consistency)

对以下 7 个索引文件执行全量交叉校验:

| # | 检查项 | 数据源 | 预期 |
|---|--------|--------|------|
| 1 | **JSON 合法性** | 7 个 JSON 文件 | 全部 `json.load()` 无异常 |
| 2 | **totalSkills = 12** | `master_index.json` `_meta.totalSkills` | 固定 12 |
| 3 | **totalCategories = 12** | `master_index.json` `_meta.totalCategories` | 固定 12 |
| 4 | **每 Category 恰好 1 个 md** | `KI/External_KI/skills/{cat}/` | 每个目录只有 1 个 .md 文件 |
| 5 | **quickLookup 覆盖 12 个 Anchor** | `master_index.json` `quickLookup` | 12 个 key |
| 6 | **Anchor confidence 三方一致** | `master_index.json` vs `categories/{cat}.json` vs `skill_registry.json` | 对每个 category,三处 confidence 值相同 |
| 7 | **quality_audit 行数/字节与实际文件匹配** | `quality_audit.json` `totalLines`/`sizeBytes` vs `wc -l`/`wc -c` | 逐文件匹配 |
| 8 | **Anchor frontmatter lastUpdated 与 master_index generated 一致** | 被更新的 Anchor 的 `lastUpdated` >= `master_index._meta.generated` | 更新过的 Anchor 日期不早于索引日期 |
| 9 | **source_registry 版本与 Tool/ 实际内容匹配** | `source_registry.json` `currentVersion` vs Tool/{dir} 中的版本标记 | 版本号一致 |
| 10 | **cross_references 无孤立引用** | `cross_references.json` 中所有 `relatedAnchors` | 引用的 anchor 名在 `master_index` 中存在 |

### Step 6.2 — Anchor 内容完整性验证 (Anchor Integrity)

对每个本次被更新的 Anchor:

| # | 检查项 | 预期 |
|---|--------|------|
| 11 | **增量标签存在** | 每次增量写入必须有 `<!-- incremental-update: ... -->` 标签 |
| 12 | **frontmatter merged_from 包含更新记录** | `merged_from` 数组中有本次更新的 source skill 条目 |
| 13 | **无语义重复** | 增量内容与 Anchor 原有内容无段落级重复(关键词重叠率 < 30%) |
| 14 | **Anchor 原有内容未被删除** | 更新前后的 Anchor,原有 Part/Section 标题全部保留 |

### Step 6.3 — Token 效率验证 (Token Efficiency)

> 核心目标: 确保索引体系能让模型以最少 token 精确定位到目标知识。

| # | 检查项 | 预期 |
|---|--------|------|
| 15 | **master_index.json 体积 < 2000 tokens** | `master_index.json` 是入口索引,必须轻量 |
| 16 | **每个 category.json 体积 < 500 tokens** | 类别索引精简 |
| 17 | **quickLookup 可直接命中** | 给定 category id,quickLookup 能一步映射到 anchor 名 |
| 18 | **无冗余索引条目** | `master_index` 中每个 category 的 `anchorFile` 路径指向实际存在的文件 |

### Step 6.4 — 执行方式

所有检查以脚本方式自动执行,输出结构化结果:

```
=== /find-update CI Verification ===

Index Consistency (10 checks):
  [1]  JSON validity (7 files)        PASS
  [2]  totalSkills = 12               PASS
  [3]  totalCategories = 12           PASS
  [4]  1 md per category (12 dirs)    PASS
  [5]  quickLookup = 12 keys          PASS
  [6]  confidence 3-way match         PASS
  [7]  quality_audit metrics match    PASS
  [8]  lastUpdated consistency        PASS
  [9]  source_registry version match  PASS
  [10] cross_references no orphans    PASS

Anchor Integrity (4 checks per updated anchor):
  [11] incremental tags present       PASS
  [12] merged_from updated            PASS
  [13] no semantic duplication        PASS
  [14] original content preserved     PASS

Token Efficiency (4 checks):
  [15] master_index < 2000 tokens     PASS (est. 1450)
  [16] category JSONs < 500 tokens    PASS
  [17] quickLookup direct hit         PASS
  [18] no orphan anchorFile paths     PASS

=========================================
  RESULT: 18/18 PASSED — CI GREEN
=========================================
```

**如果任何检查 FAIL:**
1. 立即输出失败详情(哪个文件、哪个字段、期望值 vs 实际值)
2. 自动修复可修复的问题(如索引不一致)
3. 重跑 CI 直到全绿
4. 不可自动修复的问题(如语义重复)标记为需人工确认

---

## 流程总览

```
用户 /find-update
       |
       v
  Phase 1: 扫描 (Scan)
  |-- 读取 source_registry.json
  |-- gh api 检查 8 个上游仓库
  |-- 产出更新候选清单
       |
       v
  Phase 2: 拉取与对比 (Fetch & Compare)
  |-- Clone 有更新的上游到 scratch/
  |-- 提取子目录 (monorepo)
  |-- diff 对比 + 模型智能评估
  |-- 产出更新决策矩阵 (自动判定)
       |
       v
  Phase 3: 替换 (Replace)
  |-- rm -rf 旧版本
  |-- mv 新版本到 Tool/
  |-- 更新 source_registry.json
       |
       v
  Phase 4: 重新入库 (Re-ingest)
  |-- skill_ingestion Phase 2-6
  |-- Deep Audit -> Anchor Compare -> Incremental Write
  |-- Rebuild Index (6 files)
       |
       v
  Phase 5: 清理与报告
  |-- 删除 scratch/ 临时文件
  |-- 产出结构化更新报告
       |
       v
  Phase 6: 全链路 CI 集成测试
  |-- 索引一致性 (10 checks)
  |-- Anchor 完整性 (4 checks x 每个更新的 Anchor)
  |-- Token 效率 (4 checks)
  |-- 全绿 → 完成 / 有 FAIL → 修复后重跑
```

## 禁止行为

- 跳过 Phase 2 对比直接替换(必须先评估)
- 不经 source_registry.json 追踪直接拉取(必须有溯源)
- 替换后不触发 skill_ingestion 重新入库
- 手动修改 Tool/ 中的文件(只允许整目录替换)
- 跳过 skill_ingestion.md 的任何 Phase 或 Gate
- 删除 Anchor 已有内容(只增量,不删减)
- 保留 scratch/ 临时文件不清理

## 与 /find 的关系

- `/find` — 发现新 skill 并入库(从无到有)
- `/find-update` — 更新已有 skill 版本并重新入库(从旧到新)
- 两者共享 skill_ingestion.md 的 Phase 2-6(Deep Audit → Anchor Compare → Incremental Write → Rebuild Index → Audit Report)
