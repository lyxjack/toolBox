---
id: ERR-013
type: error
errorCode: BHV-001
severity: medium
status: resolved
recurrence: 1
firstSeen: 2026-05-04
tags:
  - error/medium
  - engine/cocos
  - tool/mcp
  - asset/prefab
  - errorCode/BHV-001
  - ki/error-book
prevention: "基于 prefab 模板改造时默认走「不删只改」路线（rename + Label 改字 + active=false 隐藏）；要删兄弟节点时必须重算所有留下兄弟的 position，不能保留原坐标"
aliases:
  - ERR-013
---

# 基于 prefab 模板改造时半成品式裁剪 — 删了兄弟节点却保留剩余节点的原 position

## 错误现象

用户要求"仿照 resultView prefab 做一个 staminaEmptyView"。Agent 通过 MCP 实例化 resultView 后：
1. ✅ 删掉不需要的兄弟节点（Steps 标签、coin0 金币图标、Label-001 价格、shareBtn/adv 角标等）
2. ✅ 改了保留节点的名字和 Label 文字
3. ❌ **保留节点的 position 全部沿用原 prefab 的坐标**

结果：交付的 prefab 视觉上是错位的 — adBtn 还停在"原 shareBtn 在两个按钮分布中的左半侧位置"、homeBtn 在右半侧；按钮内部的残留 Label 还停在"原本要给金币图标让位的偏移位置"。用户反馈"很多 position 都需要我细调整"。

## 根因分析

1. **"原模原样抄"的语义被错误执行**：用户说"仿照 X"时，Agent 部分按字面意思抄了（保留 position），部分自作主张改了（删兄弟节点）。两个动作搭在一起 = 半成品。

2. **绝对定位 + 删兄弟 = 留洞**：Cocos prefab 用绝对坐标，没有 flexbox 那种 `justify-content: center` 自动重算。删一个兄弟，剩下的兄弟不会自动居中。原 position 是按"和被删兄弟共同分布"算的，删了兄弟后这些 position 就失去了语义。

3. **MCP 操作"瞎眼"，无法目检结果**：Agent 看不到渲染像素，只能改数字。改完之后 Agent 没有验证手段 — 即使留下的节点位置严重偏离视觉中心，Agent 也无法察觉。这是工具层面的根本约束。

4. **缺少"all-or-nothing"原则**：Agent 没有意识到结构改动和坐标改动必须配套：
   - 全保留（hide 不需要的）→ position 100% 对
   - 全重排（删完后重算所有 position）→ position 重新对
   - 留一半删一半 + 不重排 → 必然错

## 解决方案

### 默认路线（首选）：不删只改

仿照模板做新 prefab 时，默认走"纯文字替换 + 隐藏不需要的兄弟"：

1. 实例化模板（`unlinkPrefab=true`）
2. 重命名节点（auto-bind 用，比如 shareBtn → adBtn）
3. 改 Label 的 `string` 属性
4. 不需要的节点设 `active=false`，**不删**
5. 替换需要 attach 的脚本组件
6. 保存为新 prefab

这样所有 position 100% = 原版，永远对。代价：prefab 文件多一些"沉睡节点"，运行时性能影响可忽略（active=false 不参与渲染和事件）。

### 备选路线（仅当用户明确要求精简结构）：删完后重算

如果用户明确说"把这些不需要的节点删掉"：

1. 删兄弟前先把所有兄弟节点的 transform 都读出来
2. 删完后，逐个 `node_set_node_transform` 把留下的节点重定位到"新场景下的合理位置"（比如 2 个按钮居中分布而非左右对称两组）
3. **明确告诉用户："位置我用经验估了，可能需要你在编辑器里目检"** — 不要交付一个自己都不知道对不对的版本

### 红线：永远不能做的事

**不要做"删一半 + 不重排"** — 这是最差的中间档，必然出错。要么不删，要么删完重排。

## 预防规则

**用户说"仿照 X 做 Y"时，Agent 必须先回答自己一个问题：要不要删 X 的兄弟节点？**

- 不删 → 安全路线，所有 position 自动对
- 要删 → 必须配套重算 position，并主动告知用户视觉验证

**绝对禁止"删了一些兄弟节点 + 保留剩余节点的原 position"这种半成品交付。** 如果不打算重排，就不要删。如果决定删，就必须重排。

> CI: Tier 2 only — 这是"删除节点的语义判断 + 保留节点的位置语义"的行为约束，无法用 file-pattern-ban / code-pattern-ban / code-pattern-require 三种静态规则中的任何一种表达。Tier 1 拦不住"我应该删完后重新算坐标但我没算"这种逻辑断点。Tier 2 召回 = 用户说"仿照/抄/参考/模板"等关键词时优先加载本条。

## 关联

- ERR-002: 禁止脚本写入 .prefab/.scene 文件（本错与该约束并存：必须走 MCP，但 MCP 也容易做半成品）
- ERR-010: 被告知"参考 X"时不动脑子照搬 — 同源问题的不同变种（ERR-010 是参考代码逻辑，本条是参考 prefab 结构）
- 项目 memory `feedback_mcp_prefab_save.md`: MCP 修改 prefab 必须 scene_save → prefab_update 两步保存
