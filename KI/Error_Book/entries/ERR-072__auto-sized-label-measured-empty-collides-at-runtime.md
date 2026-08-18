---
id: ERR-072
type: error
errorCode: ERR-072
severity: medium
status: resolved
recurrence: 0
firstSeen: "2026-07-28"
tags:
  - ki/error-book
  - error
  - severity/medium
  - engine/cocos
  - domain/layout
  - project/guandan
prevention:
  - "**`cc.Label` 的 `overflow=NONE` ⇒ 节点宽度随文案自适应**。prefab 里存的 `_contentSize` 是**最后一次编辑时那句样例文案**的尺寸; 若运行期清空(常见: bind 时 `label.string=''`), 存盘值可能小到几十像素。拿这个数排版 = 拿空态尺寸算占位, 运行期文案一填就撑破邻件"
  - "**排版前先量运行期真实宽度, 别读 prefab**。在 preview 里对着实际文案取 `UITransform.contentSize` —— 本案 prefab 存 33.4, 运行期「座位1 出牌…」实测 175(5 倍)。只读解析 .prefab 做碰撞审计时, 自适应 Label 必须按**最长可能文案**估, 否则审计会漏报"
  - "**自适应尺寸的元素靠锚点约束生长方向, 比留边距可靠**。把锚点设成 `(1, 0.5)` 让它只向左长(或 `(0,0.5)` 只向右长), 文案再长也不会侵入被保护的一侧。留固定边距的做法只在『文案长度有上界且你知道那个上界』时才成立"
  - "**同一元素挪位后要重新做碰撞审计, 不能沿用挪位前的结论**。本案 nodeTimer 从中央挪到右侧时沿用了 prefab 的空态宽度, 结果右沿伸到 +487 压住 x[445,595] 的战绩钮 —— 挪位前它在中央、两侧都空, 这个隐患从未暴露"
ci_rules: []
mem_ref: 019fa7b1-dd43-7361-8bf9-de0826a56d46
mem_status: linked
req_ref: REQ-20260727-234602
related:
  - "Error_Book/entries/ERR-069__cocos-mcp-tool-quirks-collection.md"
  - "Error_Book/entries/ERR-042__cocos-parent-layout-auto-reposition-overrides-lpos.md"
  - "Error_Book/entries/ERR-002__python-modify-cocos-prefab.md"
aliases:
  - "ERR-072"
  - "auto-sized-label-collision"
---

# 自适应宽度的 Label 按 prefab 空态尺寸排版 → 运行期文案撑宽后压住邻件

## 错误现象

掼蛋横版布局重排, 把回合指示 Label `nodeTimer`(「轮到你 17s」/「座位1 出牌…」)从画面中央
挪到按钮行右侧 `x=+400`。落位前用 python 只读解析 `.prefab` 做了全带碰撞审计, **报告无重叠**。

进 preview 一看: 「轮到你 17s」**直接压在「战绩」按钮上**。

## 排查过程

审计脚本读的是 prefab 里的 `_contentSize`:

```
nodeTimer UITransform = 33.36 × 42.84
```

按这个数算, x=+400 时区间是 `[383, 417]`, 而战绩钮在 `x[445, 595]` —— 确实不重叠。

但在 preview 里对着**真实文案**量:

```js
{"text":"座位1 出牌…","fontSize":30,"overflow":0,
 "size":[175.008, 42.84], "worldX":[952.5, 1127.5]}
```

**运行期 175 宽, 是 prefab 存盘值的 5.2 倍。**

根因: `cc.Label` 的 `overflow = NONE(0)` 时, 节点尺寸由文案**反推**。
prefab 存的是最后一次编辑时的样例文案(而且本节点在 `onInit` 里被 `string=''` 清空过)的度量结果,
它既不是上界, 甚至不是典型值 —— 拿它做排版依据等于拿空态尺寸算占位。

## 解决方案

**不是加边距, 是约束生长方向**: 把锚点改成右锚定, 让它只能向左长。

| | 旧 | 新 |
|---|---|---|
| 位置 | `(400, 105)` | `(-320, 95)` |
| 锚点 | `(0.5, 0.5)` | **`(1, 0.5)`** |

右锚定后, 右沿钉死在 x=-320(按钮带左侧), 文案再长也只往左边的空白区生长,
不可能侵入 `btnPass`(x 起点 -310)或右侧任何快捷钮。**长度上界不再需要知道。**

## 验证方式

- 运行期取 `UITransform.contentSize` 复量, 确认锚点生效
- preview 实屏复看: 「轮到你 1s」落在过钮左侧, 与战绩钮完全分离

## 记档

只读解析 `.prefab` 做碰撞审计仍是必要手段(见 [[ERR-069__cocos-mcp-tool-quirks-collection|ERR-069]]:
MCP 返回体不可信, 必须落盘复核), 但它对**自适应尺寸节点**天然失真。
两者分工: 静态尺寸件靠 prefab 解析审计, 自适应件靠 preview 运行期量。

## 关联

- [[ERR-069__cocos-mcp-tool-quirks-collection|ERR-069]] —— 同族: 工具/文件给的数不等于运行期的数, 结构性改动一律落盘 + 实屏双复核
- [[ERR-042__cocos-parent-layout-auto-reposition-overrides-lpos|ERR-042]] —— 同族: 节点的最终几何未必是你写进 prefab 的那个(那条是 `cc.Layout` 反客为主, 本条是 Label 自度量)
- [[ERR-002__python-modify-cocos-prefab|ERR-002]] —— 本条的审计脚本严格只读解析, 未触碰红线
