---
id: ERR-087
type: error
errorCode: CSS-GRID-001
severity: low
status: resolved
recurrence: 0
firstSeen: "2026-08-02"
tags:
  - ki/error-book
  - error
  - severity/low
  - domain/css
  - domain/web-frontend
prevention:
  - "**网格子元素设 position:absolute 后，其包含块是自己的 grid-area，不是网格容器**（CSS Grid 规范行为）。top/left 偏移全部相对该 area 结算——想锚到容器角落，必须先让该元素铺满网格：`grid-column: 1 / -1; grid-row: 1 / -1; justify-self/align-self: start`，或把元素挪出网格流"
  - "**绝对定位元素『没到预期位置』先查包含块链**，不要先怀疑 top/left 值：本案 top:10/left:10 完全正确，错在包含块是中列格子——按坐标调值只会越调越糊"
ci_rules: []
mem_ref: b36d3553-ef1f-4e33-9c49-65f1bab40f34
mem_status: linked
req_ref: REQ-20260801-205151
related:
  - "Error_Book/entries/ERR-079__png-import-texture-type-spriteframe-missing.md"
aliases:
  - ERR-087
  - grid-area-containing-block
  - 状态板锚错中列
---

# CSS Grid 绝对定位子元素以自身 grid-area 为包含块

## 错误现象

回放查看器状态板按用户令「缩小放角落」：`.center { position:absolute; top:10px; left:10px }`，容器 `.felt { position:relative }`——面板却出现在**牌桌中列上缘**而非左上角。

## 根因分析

`#centerCol` 声明了 `grid-area: c`（中列格子）。规范规定：绝对定位的网格子元素若其包含块是网格容器，则**以其 grid-area 为包含块**——`left:10px` = 中列格子内 10px，不是牌桌 10px。数值全对，参照系错了。

## 解决方案

`#centerCol { grid-column: 1 / -1; grid-row: 1 / -1; justify-self: start; align-self: start }` 铺满网格后 top/left 才锚到真容器角。`getBoundingClientRect` 实测 (299,71) = 牌桌左上角落定。

## 预防规则

见 frontmatter。一句话：**绝对定位跑偏，先查包含块，后调坐标。**

## 关联

- [[ERR-079__png-import-texture-type-spriteframe-missing|ERR-079]] — 同为「参数没错、隐式规则改了语义」族：那条是资源导入类型，本条是 CSS 包含块
