---
id: ERR-010
type: error
errorCode: BHV-001
severity: high
status: resolved
recurrence: 1
firstSeen: 2026-04-09
tags:
  - error/high
  - tool/git
  - errorCode/BHV-001
  - ki/error-book
prevention: "git push 之前必须先询问用户是否需要更新版号，给出 semver 建议，等用户确认后再 push"
aliases:
  - ERR-010
ci_rules: []
---

# git push 前未确认版号更新，直接推送

## 错误现象
Agent 收到 "commit and push" 指令后，直接完成 commit + push 全流程，未询问用户版号是否需要更新。导致包含新功能的提交以旧版号 `1.0.0` 推送到远程。

## 根因分析
Agent 将 "commit and push" 理解为单纯的 git 操作，忽略了 toolBox 的版本管理流程。版本管理规范（`Agent/migrations/README.md`）要求每次 push 前评估版号变更，但 Agent 没有在 push 前插入确认步骤。

核心问题：Agent 对 push 操作的理解缺少"版本管理门禁"意识，把 push 当作无条件操作而非需要前置检查的受控操作。

## 解决方案
在执行 `git push` **之前**，必须完成以下步骤：

1. 读取当前 `VERSION` 文件
2. 分析本次变更的级别：
   - **MAJOR**: 破坏性变更、五层架构结构改动
   - **MINOR**: 新功能、新 workflow、新 hook、新 guide
   - **PATCH**: bug 修复、文档修正、typo
3. 向用户提出版号升级建议
4. 等用户确认版号后，更新 `VERSION` + `CHANGELOG.md`
5. 创建版本提交：`git commit -m "release: vX.Y.Z"`
6. 打 tag：`git tag -a vX.Y.Z -m "Release vX.Y.Z"`
7. 推送含 tag：`git push origin main --tags`

## 预防规则
**每次执行 git push 之前，Agent 必须主动询问用户版号是否需要更新，并给出 MAJOR/MINOR/PATCH 建议。不可跳过此步骤直接 push。** 即使用户只说 "push"，也要先确认版号。

> CI: Tier 2 only — 版号确认是 Agent 行为层面的流程门禁，无法用文件模式或代码模式的静态规则表达。需要 Agent 在 push 前主动执行检查，属于行为约束而非代码约束。

## 关联
- 版本管理规范：`Agent/migrations/README.md`
- [[ERR-009__obsidian-mcp-wrong-config-path|ERR-009]] — 同属 Agent 行为类错误（BHV-001）
