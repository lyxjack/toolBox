---
id: ERR-085
type: error
errorCode: EVD-001
severity: medium
status: resolved
recurrence: 0
firstSeen: "2026-07-31"
tags:
  - ki/error-book
  - error
  - severity/medium
  - domain/governance
  - workflow/pm
prevention:
  - "**Gate 的通过条件是『工件文件存在』，不是『心里有计划』**。complexity=major/standard 时，Gate② 放行前必须 `ls` 到 `execution_plan.md` + `task_dag.json`；Gate③ 放行前必须 `ls` 到 `verification_log.md` + 证据文件。state.json 的 history 记「Gate② 通过」而目录里没有对应文件 = **状态机给自己盖了个空章**"
  - "**证据必须落在 session 目录内**（`.in-process/active/{id}/evidence/`）。scratchpad 是 session 级易失目录，**审计方（Codex / 用户 / 下一个 session）够不着**；verification_log 里引用一个外部审计员打不开的路径，等于没有证据。截图、外部审计报告全文、关键中间产物都要 cp 进来"
  - "**自主长作业（用户睡觉/离线）是本类失误的高发区**：没有人实时把关，agent 一边执行一边给自己盖章，`complexity: major` 与「只产出了 2 个工件」这对矛盾无人发现。对策：自主作业**先建工件骨架再动手**（哪怕先写空的 execution_plan 占位），让缺失在动手前就可见"
  - "**补档不丢分，不补才丢分；但补档必须自我标注**。QA 期补出的 execution_plan/task_dag 要在开头写明「QA 期补档（EVD-001）」并如实反映实际执行序，**不得伪装成事前产出**——否则下次读到的人会以为这套流程本来就跑通了，错误模式被洗白"
  - "**外部审计员是流程门禁的最后一道**。本案 Codex 在七项技术核验之外主动查了工件完整性并给出 FAIL；派发交叉验证时**应把『流程/证据完整性』显式写进核验清单**，别只让它验技术面"
ci_rules: []
mem_ref: f2fc0920-e60f-4b21-b000-6797dd42b4ae
mem_status: linked
req_ref: REQ-20260731-053000
related:
  - "Error_Book/entries/ERR-036__state-json-duplicate-currentstate-key-on-transition.md"
  - "Error_Book/entries/ERR-038__delivery-claim-not-verified-against-git-diff.md"
  - "Error_Book/entries/ERR-063__adversarial-review-scope-spiral-no-stopping-rule.md"
aliases:
  - ERR-085
  - empty-gate-stamp
  - major缺工件进QA
---

# 状态机盖了 Gate 章，Gate 依赖的证据工件却从未落盘

## 错误现象

REQ-20260731-053000（通宵自主作业）在 `state.json` 里标 `complexity: major`，
history 依次记录 Gate① / Gate② / Gate③ 全部通过，状态推进到 QA。

Codex 交叉验证在七项技术核验之外，主动查了工件完整性，判 **FAIL / EVD-001**：

- `execution_plan.md` — 不存在
- `task_dag.json` — 不存在
- `change_manifests/` / handoffs — 不存在
- `verification_log.md` 里引用的视觉证据截图路径指向 **session 外的 scratchpad**，审计方打不开

即：**major tier 该有的 6 件工件只产出了 2 件，但三道 Gate 全部"通过"了。**

## 根因分析

三条叠加：

| # | 根因 | 说明 |
|---|---|---|
| ① | **把"工件"理解成了"给用户看的报告"** | 于是写了 requirement_package + verification_log + 晨报（都面向人），漏掉 execution_plan/task_dag（面向流程与审计） |
| ② | **Gate 检查是自述式的，没有文件存在性断言** | 我在 history 里写「Gate② 通过：管线定案」——这句话为真（确实定了案），但 Gate② 的定义是"产出 execution_plan + task_dag"，自述与定义不是一回事 |
| ③ | **自主长作业无人实时把关** | 用户睡觉，没有第二双眼睛看见「complexity=major 却只有 2 个文件」这个矛盾。agent 自己既是执行者又是盖章者 |

关于证据位置：截图当时存在 scratchpad（`/private/tmp/.../scratchpad/`），
自己能看、能验证，就默认"证据有了"。**忽略了证据的本质是给别人看的**——
Codex 拿到 verification_log 里的路径，打不开，只能记 FAIL。

## 解决方案

**当轮**：QA 期补档 `execution_plan.md`（7 阶段，如实反映实际执行序，含开头「QA 期补档（EVD-001）」标注）
+ `task_dag.json`（T1–T8 串行依赖）+ `evidence/` 目录（两张截图 + Codex 全文 JSON 复制进来）。

**长效**：Gate 放行改为文件存在性断言（见 prevention 第 1 条），自主作业先建工件骨架再动手。

## 预防规则

见 frontmatter。一句话：**Gate 通过的证明是文件，不是我说通过了；证据放在审计方够得着的地方，才叫证据。**

ci_rules 评估：**可做且值得做** —— `state.json.complexity ∈ {major, standard}` 时校验同目录必需工件存在性，
纯文件系统检查、零误报。已列为 `.in-process` 治理链的候选 audit 项（本轮未实现，避免在蒸馏阶段扩范围）。

## 关联

- [[ERR-038__delivery-claim-not-verified-against-git-diff|ERR-038]] — 同族：「声称完成」与「可被第三方验证的完成」之间的鸿沟，那条是交付面，本条是流程面
- [[ERR-036__state-json-duplicate-currentstate-key-on-transition|ERR-036]] — 同一文件（state.json）的另一类失误，那条是写坏了，本条是写对了但没有背书
- [[ERR-063__adversarial-review-scope-spiral-no-stopping-rule|ERR-063]] — 外部审计的另一面：本条说明审计**该查流程**，那条约束审计发现**不该无限修**
- [[ERR-068__fault-tolerance-path-untested-happy-path-only|ERR-068]] — 母题「没被执行过的分支＝未验证的分支」在治理流程上的映射：没被落盘检查过的 Gate＝没生效的 Gate
