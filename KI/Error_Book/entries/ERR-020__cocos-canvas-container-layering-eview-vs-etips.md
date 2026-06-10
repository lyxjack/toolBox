---
id: ERR-020
type: error
errorCode: BHV-004
severity: high
status: open
recurrence: 1
firstSeen: 2026-05-15
tags:
  - error/high
  - engine/cocos
  - asset/prefab
  - viewManager
  - render-order
  - errorCode/BHV-004
  - ki/error-book
prevention: "Cocos UI 的 Canvas 子节点容器分层（view/tips/toast/pop/network）按 Canvas children 排序决定渲染优先级 — tips 永远在 view 之上，等等。开 prefab 之前必须查清楚 BaseViewCmpt.viewType 的目标层；如果新弹窗要叠加在已有弹窗（如 settingGameView=eTips）上，新弹窗的 viewType 至少要等于或高于对方。setSiblingIndex 只在同一容器内有效，跨容器无解。"
aliases:
  - ERR-020
---

# Cocos viewManager 容器分层 — eView/eTips/... 决定渲染优先级，setSiblingIndex 救不回来

## 错误现象

新建一个 BaseViewCmpt 派生弹窗 prefab，默认 `viewType=WindowType.eView`(2)。
打开后从主界面入口能正常显示在最上层 ✓
但从游戏内"暂停/设置"（`settingGameView`）入口打开，新弹窗**渲染在 settingGameView 之下**：
- 即使新弹窗后于 settingGameView 打开
- 即使在 `start()` 里调 `this.node.setSiblingIndex(-1)`
- 即使 BlockInputEvents 已挡输入

setSiblingIndex 完全没效果。视觉效果：新弹窗的内容在 settingGameView 的 dialog 透明区域里"漏"出一部分，其余被盖住。

## 根因分析

Cocos 项目通常在 `Canvas/` 下预置多层容器：

```
Canvas
├── Camera
├── BG_Home
├── view       ← WindowType.eView 进这里
├── tips       ← WindowType.eTips 进这里
├── toast      ← WindowType.eToast
├── pop
└── network    ← WindowType.eNetwork
```

`viewManager.getRootView(viewType)` 按 viewType 取对应容器，然后 `root.addChild(viewCmpt.node)`。

**关键**：Canvas 的渲染按子节点数组顺序 —— `view` 是较早的子节点，`tips` 较晚 → **整个 tips 容器在 view 容器之上渲染**，跟 tips 内的子节点顺序无关。

所以：
- `viewType=eView` 的 prefab 永远在 `viewType=eTips` 的 prefab 之下
- 跨容器 setSiblingIndex 无效（只在同一 parent.children 数组内有效）

本项目 `settingGameView.prefab` 用 `viewType=3 (eTips)`（因为它是"暂停弹窗"性质），而新建的 `tutorialView.prefab` 默认 `viewType=2 (eView)` —— 错位。

## 解决方案

### 主选：在 prefab 编辑器把新 prefab 的 viewType 设到 eTips(3) 或更高

打开 prefab → 选根节点 → 属性检查器找 `<YourViewCmpt>` 组件 → `viewType` 下拉框改成 "弹窗(eTips)" 或更高（toast/marquee）。

> ⚠️ **MCP 写不了 BaseViewCmpt 继承属性** — `component_set_component_property` 报 "Property not found on component, available: __scriptAsset, node, __prefab"。直接改 prefab JSON 违反 ERR-002。所以只能用编辑器 UI 改。

### 兜底：runtime reparent 到目标容器

如果不方便改 prefab：

```ts
start() {
    const scene = director.getScene();
    const canvas = scene?.getChildByName('Canvas');
    const tips = canvas?.getChildByName('tips');
    if (tips && this.node.parent !== tips) {
        tips.addChild(this.node);  // 自动从原 parent 移除
    }
}
```

`viewManager.closeView` 用 `removeFromParent + destroy`，不关心 parent 是谁，所以 reparent 不影响 close 逻辑。

### 决策表

| 新 prefab 要叠在...... 之上 | 应选 viewType |
|----------------------------|-------------|
| 普通页面（home / game / across） | `eView`(2)（默认） |
| settingGameView / 暂停 / 关卡内弹窗 | `eTips`(3) |
| 飘字提示 / 跑马灯 | `eToast`(4) / `eMarquee` |
| 所有东西之上（如 network 断线 tip） | `eNetwork` |

## 预防规则

**Agent 在创建新弹窗 prefab 时必须**：

1. 先用 `python` / `grep` 检查 **要叠在其上的** 兄弟 prefab 的 BaseViewCmpt 序列化 `viewType`：

   ```bash
   python3 -c "
   import json
   d=json.load(open('assets/resources/prefab/ui/X.prefab'))
   for o in d:
       if isinstance(o,dict) and o.get('__type__','').startswith('5851'):  # 项目里 BaseViewCmpt 派生 cid
           print('viewType:', o.get('viewType'))
           break
   "
   ```

2. 把新 prefab 的 viewType 设成 **≥** 对方的值（在编辑器里选根节点改属性面板）。

3. 不要假设新 prefab 默认 `eView` 一定能盖在已有弹窗上 — 必须按业务场景判定层级。

4. 遇到"setSiblingIndex 救不回来"时，**第一反应去查 viewType 容器**，不要继续在同容器内挣扎。

> CI: Tier 2 only — 跨容器渲染序是运行时 Cocos 引擎行为，且 viewType 序列化值在 .prefab JSON 而非 .ts 源码里，简单 grep regex 难以可靠覆盖所有场景。Tier 2 召回 = 用户说"弹窗被另一个弹窗盖住"、"setSiblingIndex 没用"、"渲染层级不对"时优先加载本条。

## 关联

- ERR-019: MCP prefab_open_edit_mode 返回 root 不对（本错题同样无法用 MCP 改 viewType）
- ERR-002: 禁脚本写 .prefab（如果硬要改 viewType 需 MCP 受限 / 编辑器手动 / runtime reparent）
- `assets/script/core/viewManager.ts` getRootView() 实现就是按 viewType switch container
- `assets/script/const/enumConst.ts` WindowType 枚举定义
