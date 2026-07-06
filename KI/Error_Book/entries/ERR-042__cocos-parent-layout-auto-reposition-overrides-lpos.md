---
id: ERR-042
type: error
errorCode: BHV-002
severity: high
status: recurring
recurrence: 2
firstSeen: 2026-05-13
tags:
  - error/high
  - engine/cocos
  - tool/mcp
  - asset/prefab
  - errorCode/BHV-002
  - ki/error-book
prevention: "改子节点 lpos 前必须先 query 父节点 cc.Layout._layoutType。非 0 (HORIZONTAL/VERTICAL/GRID) 会在 prefab save/reopen 时自动按 _spacingX/Y 重排所有子节点，吃掉手动 lpos。若需手动定位，先把 _layoutType 改成 0 (NONE)。"
aliases:
  - ERR-042
---

# Cocos 父节点 cc.Layout 自动重排吃掉子节点手动 lpos

## 错误现象

Agent 通过 MCP 给子节点设了 `_lpos.x = ±138`，set 返回 `success: true`、`changed: true`，
保存 prefab 后 `prefab_save_edit` 也成功，但**用户在 Cocos 编辑器里打开 prefab 再保存退出，子节点位置又被改回了 -155/+138**（或其他 Layout 算出来的对称值）。

用户反馈："我在编辑器里修改保存然后退出又变成以前一样了。"

类似症状还包括：
- 子节点的 _lpos.x/y/z 在 prefab 文件上和 Agent 设的值一致，但下次 reopen 后又变了
- 加新子节点（duplicate / create_node）后所有兄弟节点位置突然全部偏移
- 拖拽节点修改位置后编辑器一刷新又复原

## 根因分析

Cocos Creator 的 `cc.Layout` 组件是 **运行时 + 编辑器双重激活的布局管理器**。挂在父节点上时，
只要 `_layoutType` 不是 0 (NONE)，每次以下事件都会触发 Layout 把所有子节点的 `_lpos` 重算：

- 子节点的 transform / contentSize 变化
- 子节点的 active 状态变化
- 子节点的 sibling order 变化
- 父节点的 contentSize 变化
- prefab 打开 / 保存
- 编辑器重新渲染（dirty-frame）

`_layoutType` 取值：

| 值 | 模式 | 子节点位置 |
|----|------|----------|
| 0 | NONE | 不排版，手动 lpos 完全生效 |
| 1 | HORIZONTAL | 按 `_spacingX` + `_paddingLeft/Right` 横向均布 |
| 2 | VERTICAL | 按 `_spacingY` + `_paddingTop/Bottom` 纵向均布 |
| 3 | GRID | 按 `_cellSize` + `_startAxis` 网格化 |

**关键陷阱**：Layout 的重算是**编辑器无声后台行为**，不会反馈给 MCP，
所以 `set_node_transform` 立即 query 返回的 actualValue 是正确的（"我刚刚设的就是这个"），
但 prefab 一旦经过 save→close→reopen 循环，Layout 就把磁盘上的 lpos 覆盖了。

**这是"silent override"，比"silent no-op"还隐蔽** — set 当时成功且生效，事后被改回去。

## 解决方案

### Step 1：改 lpos 前先 audit Layout

任何"我要给某个子节点设 _lpos"的操作前，第一步：

```bash
# Bash 速查（不进入 edit mode）
grep -A3 '"__type__": "cc.Layout"' <prefab.prefab> | grep _layoutType
```

或 MCP：

```js
node_find_node_by_name(<parent_name>)  // 拿父节点 uuid
component_query({action: "info", nodeUuid, componentType: "cc.Layout"})
// 看 _layoutType / layoutType 字段
```

### Step 2：如果 _layoutType != 0，先关 Layout

走 v1.6.2 setter 已知 bug（见 BUGS_TO_FIX.md Bug #5），用 raw __comps__ 路径：

```js
// 假设 cc.Layout 在 __comps__ 索引 1
node_set_node_property({
  uuid: <parent_uuid>,
  property: '__comps__.1.type',  // 'type' 是 Layout 的 layoutType 在 dump 里的名
  value: 0  // NONE
})
```

verify 会因 path-syntax 误报 silent no-op，事后 `component_query` 或 `grep _layoutType` 二次确认。

> ⚠️ 也可以走 `_enabled = false` 关整个 Layout，但**项目惯例是保留 Layout 占位 + 改 layoutType=0**（见 `staminaEmptyView.prefab/btn`）。改 _enabled 与 boolean setter bug 历史踩过坑 — 不推荐。

### Step 3：再设 lpos

```js
node_set_node_transform({uuid: <child>, position: {x: -138, y: -60, z: 0}})
```

### Step 4：save + close + 二次 reopen 确认

不只看 set 当时的返回，必须经过一轮 `prefab_save_edit → prefab_close_edit_mode → prefab_open_edit_mode` 后**再次** `node_get_node_info` 验证 lpos 没变。这是检测 Layout silent override 的唯一可靠方法。

### 项目惯例（kingDianPuzzle）

本项目所有"双按钮 / 多按钮并排"的 btn 父节点（`staminaEmptyView/btn`、`needBackToParentTip/btn` 等）
都用 `cc.Layout { _layoutType: 0, _enabled: true }` ——保留 Layout 组件占位，但不排版，完全手动定位。
新建/duplicate 类似结构时必须显式设 layoutType=0，**不能信任 Cocos 默认值**（默认是 HORIZONTAL）。

## 预防规则

**Agent 在以下场景必须主动召回本条目并 audit 父 Layout**：

1. 用户提到"调整位置/坐标"、"挪到左/右/上/下"、"按钮分布"、"间距"、"对齐"等关键词
2. 用户报告"我在编辑器里改了/保存了但又变回去了"、"打开 prefab 时位置不对"
3. 通过 `node_lifecycle duplicate` 复制子节点后（duplicate 会继承父结构，包括 Layout 设置）
4. 通过 `node_create_node` 给已有节点添加新 child 后
5. 任何 `set_node_transform` 改 lpos 的操作前

**绝对禁止**：在没 audit 过父 Layout 的情况下就向用户报告"位置已设好" — 必须经过 reopen 验证。

**也绝对禁止**：替用户解释"是 MCP 的 bug 导致位置不持久" — 99% 概率是 Layout 在自动重排，不是工具问题。先查 Layout 再讨论 MCP。

> CI: Tier 2 only — 这是 prefab 运行时行为，无法用静态规则覆盖。Tier 2 召回 = 用户说"位置/坐标/挪/左右/对齐/按钮分布"或"编辑器改了又变回去"时优先加载本条。

## 关联

- [[ERR-002__python-modify-cocos-prefab|ERR-002]]: 严禁脚本写 .prefab/.scene（本条修复必须走 MCP）
- [[ERR-013__partial-prefab-copy-broken-layout|ERR-013]]: 基于 prefab 模板裁剪兄弟节点忘记重算 position（不同根因 — ERR-013 是手动忘算，本条是 Layout 自动重算覆盖）
- `extensions/cocos-mcp-server/BUGS_TO_FIX.md` Bug #5: v1.6.2 setter 对原始类型属性失败 — 关 Layout 时被迫走 raw __comps__ 路径绕路
- 项目惯例参考：`assets/resources/prefab/ui/staminaEmptyView.prefab` 的 btn 子节点 Layout 配置
