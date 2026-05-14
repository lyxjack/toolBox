---
id: ERR-017
type: error
errorCode: BHV-002
severity: high
status: resolved
recurrence: 1
firstSeen: 2026-05-11
lastSeen: 2026-05-11
tags:
  - error/high
  - sdk/jweixin
  - env-detection
  - project/kingDianPuzzle
  - browser/chrome
  - errorCode/BHV-002
  - ki/error-book
prevention: "检测是否在微信小程序 web-view 内**绝不能**用 `typeof wx.miniProgram !== 'undefined'`。jweixin-1.6.0.js SDK 加载后在任意浏览器都会注入 `window.wx` 和 `wx.miniProgram` 桥接 stub 对象，普通浏览器调 `wx.miniProgram.navigateBack()` 会**静默 no-op**（不抛错也不做事）。正确判定：**`window.__wxjs_environment === 'miniprogram'`** —— 只有微信小程序 web-view 容器会注入此变量。两个连锁后果：1) 后续 `return` 跳过所有 fallback 路径；2) Console 完全没错误日志，bug 极难定位。"
aliases:
  - ERR-017
---

# jweixin SDK stub 在非微信环境也注入 `wx.miniProgram`，导致环境检测误判

## 错误现象

三消 Web 版 `wxJumpHelper.jumpBackToParent()` 在 Chrome 测试时，**点 sharePageBtn 后什么也不发生**：

- 没有弹出 `needBackToParentTip` 提示 prefab（预期场景 3 兜底）
- 没有任何 console.error / PrintError
- Console 仅有 `button_click` 声音 log 重复出现（确认按钮触发了 onClick）
- 完全没有 `openView = ui/needBackToParentTip` 日志（说明 openView 从未被调）

本地 Cocos Creator Preview 模式工作正常，**只在生产部署（build/web-mobile）后才坏**。

## 错误代码（buggy）

```ts
public static isInWxMiniProgramWebView(): boolean {
    return typeof wx !== 'undefined'
        && wx !== null
        && typeof wx.miniProgram !== 'undefined'   // ← 错误假设
        && wx.miniProgram !== null;
}

public static jumpBackToParent(): void {
    if (this.isInWxMiniProgramWebView()) {
        try {
            wx.miniProgram.navigateBack();   // ← Chrome 里静默 no-op
            return;                          // ← 走到这里就 return，永不到 fallback
        } catch (e) { /* navigateBack 不抛错 */ }
    }
    this.showNeedBackTip();   // ← 在 Chrome 里永远到不了
}
```

## 根因（两步推导）

### 第 1 步：jweixin SDK 在任何浏览器都注入 `window.wx`

`build-templates/web-mobile/index.html` 头部：
```html
<script src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js" async></script>
```

这个 SDK 加载完，**在所有浏览器**（不止微信）会创建：
- `window.wx` —— 对象
- `window.wx.miniProgram` —— 对象（用于和宿主小程序 web-view 通信的桥）

SDK 这样设计是为了让小程序 web-view 内的页面有统一 API。但**副作用**：普通浏览器也会拿到这两个对象 stub，但调用桥方法静默 no-op（因为没有宿主小程序在监听）。

### 第 2 步：`wx.miniProgram.navigateBack()` 在普通浏览器静默不响应

在小程序 web-view 内 → 桥消息发给宿主 → 宿主响应 navigateBack。
在 Chrome 内 → 桥消息发不出去 → 内部 catch + 丢弃 → **不抛错、不返回 false、不打 log**。

结合第 1 步 + 第 2 步：buggy 代码以为"`wx.miniProgram` 存在 = 我在小程序 web-view 内"，调 navigateBack 后 return，但 navigateBack 实际什么都没做。用户看到按钮"没反应"。

## 为什么 Preview 模式没事

Cocos Creator Preview 模式使用临时生成的 HTML，**不走 build-templates/web-mobile/index.html**，所以不加载 jweixin SDK → `window.wx` undefined → 检测返 false → 进 fallback 弹 prefab ✓。

**这是 Preview / Production 行为不一致的高频陷阱**：build-templates 改动只在 build 产物里生效，preview 看不到。Phase A T6 验证 AC7 时被这一点误导。

## 修复

```ts
public static isInWxMiniProgramWebView(): boolean {
    if (typeof window === 'undefined') return false;
    return (window as any).__wxjs_environment === 'miniprogram';
}
```

**判定依据**：`window.__wxjs_environment` 是微信小程序 web-view 容器**在创建 web-view 时主动注入到 page window 的特殊变量**，值固定为字符串 `'miniprogram'`。任何其他环境（浏览器、PC、SDK 加载完）这个变量都是 `undefined`。

文档来源：微信官方 web-view 组件文档
https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html

## 预防规则（写进 SOP）

### Hard Rule

引入 jweixin SDK 后，**检测是否在小程序 web-view 内只能用** `window.__wxjs_environment === 'miniprogram'`，不要用任何 `wx.xxx` 存在性判定。

### 同类陷阱

凡是"SDK 加载后注入全局对象"的第三方库（jweixin / 抖音 / Facebook SDK / Google Analytics），都要警惕 **stub 假对象误判环境**。检测环境应用 SDK 提供的**显式环境变量**或 UA 判断，不能用 `typeof window.xxx`。

### Preview vs Production 行为差异

build-templates/web-mobile/index.html 改动**只在 build 产物里生效**，Cocos Preview 模式跑不到。**新引入的 script tag / meta 标签**必须在 build 后浏览器开真实部署测试，不能只在 Preview 验证。

## 关联

- 项目代码：`assets/script/wx/wxJumpHelper.ts:46-58`
- 引入 SDK：`build-templates/web-mobile/index.html:39-41`
- 需求：REQ-20260511-153558（分享/广告 Web 链路）
- 关联设计文档：`.in-process/active/20260511-153558/requirement_package.md` §C.1/§C.3 三场景判定

## 验证修复

Chrome Console:
```js
window.__wxjs_environment   // → undefined （Chrome）
WxJumpHelper.isInWxMiniProgramWebView()   // → false （修复后）
WxJumpHelper.jumpBackToParent()   // → 弹 needBackToParentTip prefab（走 fallback）
```

微信开发者工具小程序 web-view 内：
```js
window.__wxjs_environment   // → "miniprogram"
WxJumpHelper.isInWxMiniProgramWebView()   // → true
WxJumpHelper.jumpBackToParent()   // → 实际 navigateBack 回宿主
```
