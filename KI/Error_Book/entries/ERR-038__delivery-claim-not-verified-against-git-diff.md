---
id: ERR-038
type: error
errorCode: "EVD-003"
severity: "high"
status: "resolved"
recurrence: 0
firstSeen: "2026-07-04"
tags:
  - "error/high"
  - "topic/delivery-integrity"
  - "topic/audit"
  - "errorCode/EVD-003"
  - ki/error-book
prevention: "任何'已落地/已实现'的交付宣称，审计与 QA 时必须用 git diff / 代码实读核实到具体行；文档、README、cert 里的宣称不作为证据。发现宣称与代码不符 = 高严重度诚实性问题，立即补落地并如实标注。"
aliases:
  - "ERR-038"
mem_ref: "93f1823f-1c87-45ad-9d47-a7dcab69da36"
mem_status: "linked"
---

# 交付宣称未经 git diff 核实——文档说"已落地"但代码是死代码

## 错误现象

catIdea 项目 2026-07-04 全项目审计（REQ-20260704-223429）发现：文档与既往 cert 宣称"P1.2 结构化 retry prompt 已落地"，但 `validators/errors.py` 的 `to_detailed()` 实为**死代码**——`make_retry_prompt` 从未调用它，retry 反馈仍是旧格式。宣称与代码现实脱节，且已通过一轮交付评审未被发现。

## 根因分析

1. 交付时以"计划/文档更新"代替"代码验证"——写了设计就当成做了实现。
2. QA 层核对的是工件之间的一致性（文档↔文档），没有核对文档↔代码。
3. 后续 session 继承了错误宣称，误差随传播放大。

## 解决方案

审计中用 `git log -p` + 代码实读逐条核实所有"已落地"宣称，发现即补实现（REQ-20260704-223429 当场把 to_detailed 接入 retry prompt 并加测试锁定）。

## 预防规则

- "已实现"三个字必须能指到 commit + 行号；指不到就改口为"已设计未实现"。
- QA Layer 4（工件一致性）必须包含**文档宣称 ↔ 代码现实**的抽查。
- 相关模式：[[ERR-019__cosmetic-change-to-loadbearing-module-unverified|ERR-019]]（未运行期验证 ≠ 完成，同族"宣称≠现实"）。
