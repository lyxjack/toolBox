---
id: ERR-086
type: error
errorCode: MCP-STRUCT-001
severity: high
status: resolved
recurrence: 0
firstSeen: "2026-08-02"
tags:
  - ki/error-book
  - error
  - severity/high
  - domain/cocos-mcp
  - tooling/editor
prevention:
  - "**cocos-mcp 的结构类操作（paste/reorder/move）回执不可信，每一步后必须树查询复核**：paste 实测落在指定 parent 的【上一级】且回执照样报成功并谎报 targetParent；reorder 会把节点直接甩到场景根（报错文案还是乱的 expected parent [object Object]）。唯一可信的是 move+targetParent+siblingIndex 后的 `cocos_node tree` 实查"
  - "**编辑器轨收工前必做盘上终验**：prefab 保存后用脚本解析 .prefab JSON 断言（子树唯一性/无游离节点/组件类型 uuid 吻合），不以 MCP 会话内的树查询为最终凭据——本案 mask 一度游离到游戏层根部（active=true 全屏遮罩），仅靠盘上复核才确认清零"
  - "**兄弟序（渲染层级）不依赖编辑器摆放结果，代码兜底**：MCP 兄弟序信号混乱时，在组件 bind 时用 `setSiblingIndex` 强制关键次序（mask 必须压底），把正确性从『编辑器操作成功』降级为『运行时一行代码』"
ci_rules: []
mem_ref: b36d3553-ef1f-4e33-9c49-65f1bab40f34
mem_status: linked
req_ref: REQ-20260801-205151
related:
  - "Error_Book/entries/ERR-083__mcp-write-param-triggers-modal-deadlock.md"
  - "Error_Book/entries/ERR-038__delivery-claim-not-verified-against-git-diff.md"
aliases:
  - ERR-086
  - mcp-paste-off-by-one-level
  - reorder甩场景根
---

# cocos-mcp 结构操作落点错位且回执谎报成功

## 错误现象

在横版 prefab 里用 cocos-mcp 搭回放列表面板（REQ-20260801-205151 编辑器轨）：

1. `cocos_node paste` 指定 parent=overlayReplayList，回执 `"targetParent": "<该节点uuid>"` 报成功——实际五个节点**全部落在其上一级**；mask 甚至落到了游戏层根部（active=true 的全屏遮罩，险些盖死整个牌桌）。
2. `cocos_node reorder` 想把 mask 调到兄弟序 0——节点被**甩到场景根**，报错文案 `expected parent [object Object], actual: <Scene uuid>`。

## 根因分析

MCP 工具的结构操作在编辑器消息层有落点换算缺陷，且**回执按请求参数回显而非按实际结果回读**——工具嘴上说的和编辑器实际做的是两件事。paste 固定偏移一级、reorder 的 set-parent 语义错乱。

## 解决方案

- 全部改用 `move`（targetParent+siblingIndex）迁移归位——该操作实测忠实；
- 每步后 `cocos_node tree` 实查 + 收工后解析 .prefab JSON 盘上终验；
- 渲染层级要害处（mask 压底）在组件代码里 `setSiblingIndex(0)` 兜底，不赌编辑器摆放。

## 预防规则

见 frontmatter。一句话：**结构操作的凭据是树/盘实查，不是工具回执。**

## 关联

- [[ERR-083__mcp-write-param-triggers-modal-deadlock|ERR-083]] — 同族：cocos-mcp 能力面的另一处坑（写参数触发模态死锁），本条是结构面
- [[ERR-038__delivery-claim-not-verified-against-git-diff|ERR-038]] — 母题「声称成功 ≠ 可验证成功」在编辑器工具上的映射
