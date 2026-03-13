# Project Rules — toolBox
# Version: 1.0

---

## 项目信息
- **项目名**: toolBox
- **创建日期**: 2026-03-07
- **项目定位**: 企业级 AI Agent Skills 中心——收集、索引、治理、调度开源 skills
- **技术栈**: PowerShell (脚本), JSON (数据), Markdown (文档/规则), Claude Code (runtime)

## 项目特殊约束

### C1 — 源文件只读
toolBox 下的 16 个 skill 仓库均为 `git clone` 的开源项目。
所有原始 SKILL.md 及其 companion 文件**只可读取**,治理层通过 registry 和 review 做映射推荐。

**只读仓库清单**:
- everything-claude-code/
- superpowers/
- ui-ux-pro-max-skill/
- subagent-driven-development/
- systematic-debugging/
- test-driven-development/
- skill-creator/
- find-skills/
- content-strategy/
- social-content/
- frontend-design/
- canvas-design/
- composition-patterns/
- react-native-skills/

### C2 — 索引系统已建成
`KI/External_KI/` 已包含完整的两级索引系统,不需要重建。
变更索引时必须同步更新 master_index.json 和对应 category JSON。

### C3 — 置信度数据已审计
`KI/External_KI/_quality_audit_results.json` 和 `KI/External_KI/_quality_audit_corrected.json` 包含基于 20 个客观信号的置信度评分。
后续 skill 评估必须引用这些数据,不可再靠主观估值。

### C4 — 项目无业务代码
toolBox 不包含应用代码。它是一个 skill 资产管理项目。
因此 QA 的 Layer 1(Build Correctness)主要检查 JSON 合法性和文档格式。

## 启用的功能类别
基于 `KI/External_KI/master_index.json` 的 12 个类别全部与本项目相关:
frontend, backend, testing, security, devops, ai_agent, content, language_specific, mobile_native, workflow, meta_tooling, business

## 项目级 Iron Law 扩展

### C-IL-01 — 索引一致性
修改任何 skill 索引数据时,master_index.json 和对应 category JSON 必须同步更新。

### C-IL-02 — 审计数据引用
Skill Governance 的任何推荐/评级必须引用 `KI/External_KI/_quality_audit_corrected.json` 中的客观数据。

### C-IL-03 — 仓库不污染
不得在只读仓库目录下创建任何新文件。治理文件只放在 `Agent/rules/` 和 `Agent/` 下。
