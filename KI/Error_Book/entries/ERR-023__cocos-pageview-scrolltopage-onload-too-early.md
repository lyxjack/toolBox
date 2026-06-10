---
id: ERR-023
type: error
errorCode: BHV-007
severity: medium
status: open
recurrence: 1
firstSeen: 2026-05-15
tags:
  - error/medium
  - engine/cocos
  - asset/prefab
  - cc-pageview
  - lifecycle
  - errorCode/BHV-007
  - ki/error-book
prevention: "cc.PageView.scrollToPage(idx, 0) 在 Component.onLoad 阶段调用会 silent no-op — PageView 内部 _pages 数组在 onEnable 阶段才填充（遍历 content.children）。onLoad 时 _pages.length === 0 → scrollToPage 直接 return。视觉默认会停在 pagesContent 局部中心位置的那个 page（如 5 页时是 page3）。 修复：把 scrollToPage 挪到 start() 生命周期 + 再用 scheduleOnce(0) 兜底一帧避免 Layout race。"
aliases:
  - ERR-023
---

# cc.PageView.scrollToPage 在 onLoad 阶段调用 silent no-op — 起始页错位

## 错误现象

新做的 5 页教学弹窗，PageView 横向 5 个 page 子节点（page1~page5，layout=horizontal）。
预期：第一次打开显示 page1（idx=0），右翻 → page2 → page3 → page4 → page5。
实际：
- 打开后**视觉显示 page3**（5 个 page 中间那个）
- 点右箭头 → 显示 page2 ❌
- 点左箭头 → 显示 page1
- 用户视觉/逻辑完全错乱

根因复盘脚本：
```ts
// tutorialViewCmpt.onLoad
this.pageView = this.viewList.get('content/pageView').getComponent(PageView);
this.pageView.node.on(PageView.EventType.PAGE_TURNING, this.onPageTurning, this);
this.pageView.scrollToPage(0, 0);  // ← 这里"应该"归位 page0，实际 no-op
```

## 根因分析

cc.PageView 内部实现细节：

| 阶段 | 行为 |
|------|------|
| 构造（instantiate） | _pages = [] 空数组；_curPageIdx = 0 |
| onLoad | 还没填 _pages（因为 content.children 在 component 串行化加载时机不确定）|
| onEnable | **第一次填 _pages** — 遍历 content.children |
| start | _pages 已就绪 |

`scrollToPage(idx, time)` 源码：
```ts
scrollToPage(idx, time) {
    if (idx < 0 || idx >= this._pages.length) return;  // ← onLoad 阶段 _pages.length===0 直接 return
    this._curPageIdx = idx;
    ...
}
```

所以 onLoad 阶段调它就是 silent return。`_curPageIdx` 保持默认 0。

**视觉为什么是 page3？** —— 5 个 page 在 pagesContent 里横向排列（page1.x=-1290, page2.x=-645, page3.x=0, page4.x=645, page5.x=1290），pagesContent.lpos.x 默认 0 → 几何中心位置的 page3（x=0）正好落在 pageView 视窗中心。

**逻辑为什么错？** —— `_curPageIdx` 是 0，但视觉是第 3 个 page。点右箭头 → `scrollToPage(0+1=1)` → 跳到 page2（idx=1）。从用户视角看：page3 → 点"下一页" → page2（其实是从错误的逻辑起点 0 推进到 1）。

## 解决方案

### 把 scrollToPage 挪到 start() + scheduleOnce(0) 兜底

```ts
start() {
    if (!this.pageView) return;
    this.scheduleOnce(() => {
        if (this.pageView) {
            this.pageView.scrollToPage(0, 0);  // 现在 _pages 已填充，能真正归位
            this.updateArrowVis(0);
        }
    }, 0);
}
```

为什么 start 还要 scheduleOnce(0)：
- 防 Layout 排版 race —— 如果 pagesContent 有 cc.Layout 在做异步排版，多 defer 一帧让 layout 算完再 scroll
- scheduleOnce(0) 在 Cocos 等同于 next-frame microtask

### 不要在 onLoad 里:
- 不要 `pageView.scrollToPage(...)`
- 不要 `pageView.getCurrentPageIndex()` 期望拿到正确值
- 不要假设 `pageView._pages` 已就绪

但 onLoad 里**可以**：
- `viewList.get('content/pageView').getComponent(PageView)` 拿引用
- 监听 `PageView.EventType.PAGE_TURNING`

## 预防规则

**用 cc.PageView / cc.ScrollView 的初始化任何依赖 _pages 数组的逻辑（scrollToPage / getCurrentPageIndex / pages 数）**：

1. **不放 onLoad**，最早从 `start()` 调
2. start 里再用 `scheduleOnce(0)` 多 defer 一帧
3. 调完 scrollToPage 后**同步** UI 状态（如箭头 visible 跟 curPageIdx）
4. 测试至少要验：
   - 第一次打开 → 显示 idx=0 page
   - 点右箭头 → idx=1
   - 点左箭头从 idx>0 → idx-1
   - 末页右箭头隐藏 / 首页左箭头隐藏

5. 用户报告"打开就显示中间那一页"时，**第一时间查 scrollToPage 调用位置** — 99% 是放在 onLoad 了。

> CI: Tier 2 only — 简单 grep `scrollToPage` 在 .ts 文件中无法区分 "在 onLoad 里"vs"在 start 里"vs"在事件回调里"，跨多行 regex 检测调用 scope 不可靠（容易误伤合法 start/scheduleOnce 调用 + 漏伤实际错误调用）。Tier 2 召回 = 用户做 PageView/ScrollView 初始化、或报告"第一次打开显示中间那张"时优先加载本条。

## 关联

- ERR-009: overengineered-scroll-recycling（同 ScrollView 家族踩坑）
- `assets/script/game/ui/homeViewCmpt.ts` 主页底部 PageView（项目里另一处 PageView 实例，可参考 layout 模式）
- 实例 session: `.in-process/active/20260514-123313_tutorial/` 创建 tutorialView.prefab 的 5 页教学弹窗时踩到
- Cocos 3.8 `cc.PageView` 源码（来自 engine `cocos/ui/components/page-view.ts`）
