---
id: ERR-083
type: error
errorCode: TOOL-003
severity: high
status: resolved
recurrence: 0
firstSeen: "2026-07-31"
tags:
  - ki/error-book
  - error
  - severity/high
  - engine/cocos
  - tool/MCP
  - failure/deadlock
prevention:
  - "**任何可能弹「确认/覆盖/冲突」原生对话框的 MCP 写参数一律不用**（`overwrite` / `force` / `replace` / `confirm` 家族）。编辑器内嵌的 MCP server 与 UI 共用 Electron 主线程消息循环，模态框一弹 = **整条 MCP 通道死锁**，不是单次调用失败。改走等价的非交互路径：先 `delete` 再导入，或 [[PAT-040__meta-inheriting-asset-import-bypass|PAT-040]] 的 copy+覆写+reimport"
  - "**诊断顺序：进程活着 + 所有 MCP 调用超时 = 高度疑似模态框，第一步截屏看 UI，不是重启**。`ps -p <pid>` 能证明进程没死但证明不了它没卡；`screencapture -x` 是唯一非侵入的诊断手段，一张图直接看到对话框内容。跳过截屏直接杀进程 = 丢掉根因，下次照犯"
  - "**别指望用 osascript 程序化点掉对话框**。Terminal / Claude Code 通常没有 TCC 辅助功能授权（`osascript is not allowed assistive access`, error -1728），点不了按钮也读不到窗口标题。授权是用户级操作，不能在故障中途现加"
  - "**重启编辑器前先把 `settings/mcp-server.json` 的 `autoStart` 置 true**，否则重启后 MCP server 不自动起，白等一轮再重启。这个配置改动属救场必需，应记入 Scope 偏差备案而非悄悄回滚"
  - "**与 [[ERR-069__cocos-mcp-tool-quirks-collection|ERR-069]] 的『success≠生效』分属两类**：那类是调用返回成功但没效果（假阳性）；本类是调用**把整条通道打死**（后续所有工具全瘫）。故障面从「这一步没做成」升级为「这个 session 做不下去了」，处置优先级也不同"
ci_rules: []
mem_ref: f2fc0920-e60f-4b21-b000-6797dd42b4ae
mem_status: linked
req_ref: REQ-20260731-053000
related:
  - "Error_Book/entries/ERR-069__cocos-mcp-tool-quirks-collection.md"
  - "Error_Book/entries/ERR-079__png-import-texture-type-spriteframe-missing.md"
  - "Internal_KI/patterns/PAT-040__meta-inheriting-asset-import-bypass.md"
aliases:
  - ERR-083
  - mcp-modal-deadlock
  - overwrite-弹框锁死
---

# MCP 写参数触发编辑器原生模态框 → 整条 MCP 通道死锁

## 错误现象

掼蛋美术第二批入库，试图用 `cocos_asset import(overwrite=true)` 覆盖一张探针图。该调用超时；
此后**所有** `cocos_*` 调用一律超时（`check_ready` 这种只读操作也超时）。
`ps` 查编辑器进程：主进程与全部 helper 进程健在，CPU 正常。

截屏才看清：编辑器正中弹着原生对话框 **「文件已存在，是否覆盖?」**，三个按钮（覆盖／重命名／取消）等着人点。

## 根因分析

cocos-mcp-server 是**编辑器扩展**，MCP server 跑在编辑器的 Electron 主进程内。
原生模态框阻塞主线程消息循环 → MCP 请求根本进不到处理函数 → 表现为"服务还在监听端口，但每个请求都超时"。

三层放大了排查难度：

| 层 | 现象 | 误导性 |
|---|---|---|
| 进程层 | `ps` 显示进程全活、CPU 正常 | 看起来"服务是好的"，容易往网络/端口方向查 |
| 端口层 | 3000 端口仍在监听，TCP 握手成功 | `curl` 能连上，更坐实"服务正常"的错判 |
| 自动化层 | `osascript` 想读窗口/点按钮 → `not allowed assistive access` (-1728) | 连"看一眼 UI"的自动化手段都被 TCC 挡掉 |

**打破僵局的是截屏**（`screencapture -x`）——不需要任何授权，一张图直接坐实根因。

## 解决方案

**当轮处置**：
1. `screencapture -x` 确认模态框（唯一非侵入诊断）
2. 先改 `settings/mcp-server.json` → `autoStart: true`（**重启前改，否则重启后 MCP 不自动回线**）
3. `kill -TERM` → 不退再 `kill -9` → 重开项目
4. 清理探针残留（编辑器停机时文件系统操作安全）

**根治**：改用 [[PAT-040__meta-inheriting-asset-import-bypass|PAT-040]] 的 copy → 字节覆写 → reimport 管线，
全程不触碰任何会弹框的参数，30 张一次成型。

## 预防规则

见 frontmatter。一句话：**编辑器内嵌的 MCP，任何会弹框的参数都是自杀开关；进程活着不等于通道活着，先截屏再动手。**

ci_rules 评估：可做「MCP 调用参数黑名单」静态检查，但参数名因工具而异且新工具会引入新的，
维护成本高于收益；防护面在工作法（本条 prevention + PAT-040），不在 linter，故留空。

## 关联

- [[ERR-069__cocos-mcp-tool-quirks-collection|ERR-069]] — 同域不同类：那条是「调用成功但没生效」，本条是「调用打死整条通道」
- [[ERR-079__png-import-texture-type-spriteframe-missing|ERR-079]] — 本次入库任务的另一条主线（导入类型），两条一起催生了 PAT-040
- [[PAT-040__meta-inheriting-asset-import-bypass|PAT-040]] — 本条的正向出路：完全绕开弹框参数
- [[ERR-006__mcp-port-conflict-not-persisted|ERR-006]] — 同属「MCP 服务配置未持久化导致重启后失联」族，本条新增 `autoStart` 这一具体开关
