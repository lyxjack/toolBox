---
id: ERR-073
type: error
errorCode: ERR-073
severity: medium
status: resolved
recurrence: 0
firstSeen: "2026-07-28"
tags:
  - ki/error-book
  - error
  - severity/medium
  - engine/cocos
  - domain/ui-lifecycle
  - project/guandan
prevention:
  - "**prefab 内的克隆模板节点, 隐藏动作必须挂在组件 `onLoad`, 不能挂在『首次喂数据』**。IL13 要求模板留在 prefab 里可见可编辑, 于是它在编辑期恒为 `active=true` 且带样例文案; 若隐藏它的 `ensureInit()` 走懒初始化(等首次 `setHand`/`setData` 才跑), 从组件挂载到首帧数据到达之间就有一个**幽灵窗口**, 屏上挂着一枚写着样例文案的假控件"
  - "**判据(一眼可查)**: prefab 里存在 `active=true` 的模板节点 + 组件里有 `ensureInit/lazy init` + 主层只 `addComponent` 不立即喂数据 —— 三者同时成立即存在幽灵窗口。窗口长度 = 从进场到服务端首帧下发, 联机场景下可能是几十秒(等人)"
  - "**`ensureInit` 幂等就该放 `onLoad`**。懒初始化的收益(省掉未使用组件的开销)在 UI 组件上几乎为零, 而代价是把『初始化时机』变成一个隐式契约。幂等的初始化一律提前到 `onLoad`, 原有懒路径保留做兜底, 两者不冲突"
  - "**这类缺陷不会被单测/类型检查/主路径冒烟抓到** —— 主路径永远是『进场→发牌→看手牌』, 而幽灵只出现在『进场→(还没发牌)』这个中间态。要覆盖必须显式验中间态: 进桌后先不推数据, 截一屏"
ci_rules: []
mem_ref: 019fa7b1-dd43-7361-8bf9-de0826a56d46
mem_status: linked
req_ref: REQ-20260727-234602
related:
  - "Error_Book/entries/ERR-023__cocos-pageview-scrolltopage-onload-too-early.md"
  - "Error_Book/entries/ERR-068__fault-tolerance-path-untested-happy-path-only.md"
  - "Error_Book/entries/ERR-069__cocos-mcp-tool-quirks-collection.md"
aliases:
  - "ERR-073"
  - "ghost-template-before-first-data"
---

# 懒初始化 → 发牌前手牌区挂着一枚幽灵「四炸」标签

## 错误现象

掼蛋一键理牌需要给每个牌型组打底标(四炸/三带二/顺子…)。数量随牌型动态变化,
按 IL13 属「数据驱动的可变数量集合」豁免面 —— 做法是在 prefab 里放一个**可见可编辑的模板节点**
`nodeHand/tplGroupTag`(带样例文案「四炸」), 运行期 `instantiate` 克隆。

结果: **进牌桌后、服务端首次发牌之前, 手牌区中央凭空挂着一枚写着「四炸」的小标签。**

## 排查过程

隐藏模板的动作在组件的懒初始化里:

```ts
private ensureInit() {
    if (this.inited_) return
    this.inited_ = true
    ...
    this.tagTpl_ = this.node.getChildByName('tplGroupTag')
    if (this.tagTpl_) this.tagTpl_.active = false   // ← 隐藏在这
}
setHand(cards, level) { this.ensureInit(); ... }    // ← 只有喂数据才触发
```

而主层建 UI 时只挂组件, 不喂数据:

```ts
const nodeHand = this.node.getChildByName("nodeHand")
this.hand_ = nodeHand.getComponent(WMGDPokerHandCards_l)
          || nodeHand.addComponent(WMGDPokerHandCards_l)   // ← 到此为止
```

真正的 `setHand` 要等服务端 `deal` / 重连 `sync` 才到。**中间这段时间 `ensureInit` 根本没跑**,
模板保持编辑期的 `active=true`, 带着样例文案「四炸」直接显示。

金币场等人时这个窗口可能是几十秒, 好友房更长。

## 根因

三个各自合理的决定叠出来的:

1. **IL13** 要求模板必须是 prefab 内**可见**实体节点(否则美术改不动) ⇒ 编辑期 `active=true`
2. 组件走**懒初始化**(常见写法, 省未使用组件的开销)
3. 主层**先挂组件后喂数据**(网络游戏的必然时序)

任何一条单看都没问题, 合起来就留出一个「模板已在场、隐藏它的代码还没跑」的窗口。

## 解决方案

`ensureInit` 本就幂等, 提到 `onLoad`:

```ts
protected onLoad() {
    this.ensureInit()
}
```

挂载即隐藏模板, 原有的懒路径(`setHand`/`setArranged` 里仍调 `ensureInit`)保留做兜底。

## 验证方式

进桌后不推数据, 运行期断言:

```js
{"模板存在": true, "模板已隐藏": true, ...}
```

## 关联

- [[ERR-023__cocos-pageview-scrolltopage-onload-too-early|ERR-023]] —— 镜像面: 那条是**初始化太早**(onLoad 里调 PageView API 时子节点还没就绪), 本条是**初始化太晚**。同一个「Cocos 组件生命周期与数据到达时序错配」家族, 方向相反
- [[ERR-068__fault-tolerance-path-untested-happy-path-only|ERR-068]] —— 同族: 只验主路径, 中间态无人看
- [[ERR-069__cocos-mcp-tool-quirks-collection|ERR-069]] —— 本模板节点由 cocos-mcp 建成并按该条纪律做了落盘只读复核
