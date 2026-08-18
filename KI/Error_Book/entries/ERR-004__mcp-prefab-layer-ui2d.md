---
id: ERR-004
type: error
errorCode: BHV-001
severity: critical
status: recurring
recurrence: 2
firstSeen: 2026-04-07
tags:
  - error/critical
  - engine/cocos
  - asset/prefab
  - tool/MCP
  - errorCode/BHV-001
  - ki/error-book
prevention: "MCP 创建 UI 节点后必须设置 layer=33554432 (UI_2D)"
aliases:
  - ERR-004
---

# MCP 创建的 Cocos 节点 layer 不是 UI_2D，导致运行时不可见

## 错误现象
通过 MCP `node_create_node` 创建的节点，layer 默认不是 `UI_2D`（33554432）。导致节点在编辑器 prefab 视图中显示正常，但运行时 Camera 不渲染这些节点，表现为弹窗完全不可见（只有代码创建的遮罩可见）。

## 根因分析
Cocos Creator 3.x 的 Camera 只渲染匹配其 visibility mask 的 layer。UI Camera 只渲染 `UI_2D` 层（1 << 25 = 33554432）。MCP 的 `node_create_node` 创建节点时可能使用默认 layer（DEFAULT = 1 << 30），不是 UI_2D。

## 解决方案
MCP 创建 UI 节点后，必须设置 layer：
```
node_set_node_property: uuid, property="layer", value=33554432
```
或者在代码中修复：
```typescript
node.layer = Layers.Enum.UI_2D; // 33554432
```

## 预防规则
**任何时候通过 MCP 创建 UI 节点或排查 UI 不可见问题时，第一时间检查 node.layer 是否为 33554432（UI_2D）。这是最常见的"节点存在但不可见"原因。**

## 关联
- [[ERR-003__buyview-mask-debug-failure|ERR-003]]: buyView 排查时也遇到过 UI 显示问题
- [[ERR-002__python-modify-cocos-prefab|ERR-002]]: prefab 文件操作约束
- [[PAT-001__mcp-prefab-workflow|PAT-001]] — MCP Prefab 完整修改流程

---

## ⚠️ 工程覆盖条（2026-08-04 补挂 —— 本条已被误用过一次）

**本条是通用铁律，但在 `ccc-newkds-gd`（掼蛋/滚子平台客户端）工程内被明文覆盖。**
读到本条时若正在该工程作业，**先看 [[ERR-034__cocos-mcp-server-161-property-whitelist-and-tool-gaps|ERR-034]] 的覆盖注**：

> 本工程（2.x 迁移）所有 lobby UI 节点 `layer=1`（非 3.x 原生 UI_2D=33554432），
> **MCP 新建节点跟随同级即可** —— 与 ERR-004 的"默认 layer=0 不可见"在本工程不冲突（工程惯例覆盖）。

**实测佐证**：`WMGDGameLayer_l.prefab` 共 503 个节点，**421 个是 `layer=1`**，
其中包含每局都看得见的头像、手牌、操作条、出牌槽的「过」字标 —— 相机 visibility 为 ALL，layer 1 正常渲染。

### 误用实录

2026-08-04 一次 Codex 对抗审计中，审计方召回本条，据此判定新加的四个接风标
（`layer=1`，跟随同级 `pass`/`cards`）会"在编辑器可见、运行时完全不渲染"，
并把它列为需重点核验项。**结论是错的** —— 覆盖条早已存在，只是没有从本条指过去。

### 泛化

**通用铁律遇工程覆盖条，先查覆盖。** 铁律条目本身要挂反向指针，
否则召回时只命中铁律、命不中覆盖，就会得出与工程现状相反的结论 ——
**知识库越权威，误召回的杀伤力越大**。

同类"召回命中却导向错误结论"的教训见
[[ERR-080__error-book-recall-keyword-mismatch|ERR-080]]（关键字对不上导致该召回的没召回，本条是反面：召回了但缺上下文）。
