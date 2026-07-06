---
id: PAT-013
type: pattern
title: "Cocos 主游戏 WebView 嵌入独立 H5 子游戏(共享身份/货币/体力)集成模式"
status: active
created: "2026-06-12"
tags:
  - "pattern/integration"
  - "engine/cocos"
  - ki/pattern
complements:
  - "[[ERR-017__jweixin-sdk-stub-misdetected-as-miniprogram-webview|ERR-017]]"
  - "[[PAT-007__ip-sk-dual-factor-server-to-server-auth|PAT-007]]"
trigger_condition: "user_explicit"
aliases:
  - "PAT-013"
mem_ref: "705b1054-82b9-409a-bce1-6cb8fcfde2f1"
mem_status: "linked"
---

# Cocos 主游戏 WebView 嵌入独立 H5 子游戏(共享身份/货币/体力)集成模式

> 实战来源:滚子平台(`ccc-newkds-3.8`)大厅新增「糖果消消乐」入口,嵌入独立部署的三消 H5(`kingDianPuzzle`,`https://puzzle.pkgame.com`),共享玩家金币、显示实时体力(REQ-20260611-211308)。

## 适用场景

Cocos 主游戏要把**另一个独立部署的 Cocos H5 子游戏**作为入口嵌入,共享玩家身份与货币,但**不把子游戏代码/资源打进主包**(子游戏是独立工程 + 独立服务器 + 已上线 H5)。

## 核心做法(7 要点)

1. **WebView 开线上 H5,不打包**:`cc.WebView.url = "https://子域名/index.html?userID=<真实ID>&userName=<昵称>"`;子游戏读 URL query(`userId` ‖ `userID`)进服务器持久化模式。⚠️ **微信小游戏不支持 cc.WebView**(web-view 是小程序能力);H5 / 小程序 / Preview 可用,纯小游戏出包需改 `wx.navigateToMiniProgram`。
2. **真实身份传递**:userID 取 `rcData.get("login/data").userID`(**禁硬编码测试 ID**);userName 供子游戏排行榜显示——传前 `nickName.replace(/%/g,"")` 剔除字面 `%`(子游戏端 `URLSearchParams.get` 已 decode 一次,二次 `decodeURIComponent` 遇 % 抛 URIError 会连带丢弃 userId → 玩家静默降级单机模式)。两端都修:发送端剔 % 兜底 + 子游戏端把 userName 的二次 decode 隔离进独立 try/catch。
3. **返回刷新**:WebView 层 `onPop()` 触发回调,回主游戏刷一次子游戏状态(体力等)。
4. **进子游戏期间静音主游戏全部音频**:`AudioManager.setTempMuted(true)`/`(false)` —— **临时态,不写玩家音效设置存档**(用 `setMusicEnabled(false)` 会持久化,玩家在子游戏里杀进程后永久关掉自己的设置);静音停 music+effect 双 source 但保留 `cacheMusicName_`,恢复按缓存曲目续播且尊重玩家原设置。`onPush` 静音 / `onPop` + `onDestroy` 兜底恢复(幂等,覆盖不走 onPop 的销毁路径)。
5. **WebView 全屏吞触摸**:native/DOM 覆盖物吞掉全部触摸,mask 点击关不掉 → `Widget.top=140` 顶部让出一条 + 显式 `btn_close`(MCP 设不了 Button.transition,运行期补按压反馈,见 [[ERR-034__cocos-mcp-server-161-property-whitelist-and-tool-gaps|ERR-034]])。
6. **货币/体力服务端权威**:共享金币经主平台 `updateUserCurrencyEx` 写;子游戏体力经子服务器 Parent API(**server-to-server**,IP 白名单 + sk,见 [[PAT-007__ip-sk-dual-factor-server-to-server-auth|PAT-007]])。链路 = 主客户端 → 主后端 → 子 Parent API,**客户端不直连子 Parent API**(会泄露 sk + IP 对不上白名单)。客户端按契约接桩(`WebReqBase.reqAK`),后端就绪零改动联调。
7. **mock 代理联调手法**(后端没就绪时跑通端到端):本地 Node 代理 ① 实现待开发的新端点(本地内存模拟,幂等去重)② **其余请求原样转发真实服务器**(登录/金币/签到照常)③ **改写登录响应的 `lobbyHost` 指向代理**(登录后所有 lobby 请求自动流经代理,客户端零改动)④ 给所有响应加 CORS 头(顺带解决浏览器 Preview 跨域)。该代理同时是后端契约的可运行参考实现。

## 反模式

| 错误做法 | 正确做法 | 关联 |
|---------|---------|------|
| 把子游戏代码/资源打包进主游戏包 | WebView 开线上 H5,主包不含子游戏 | 本模式 §1 |
| WebView URL 硬编码测试 userID | 运行期取 `rcData.get("login/data").userID` | §2 |
| 进子游戏用 `setMusicEnabled(false)` 静音 | 临时态 `setTempMuted`,不污染玩家设置存档 | §4 |
| 客户端直连子游戏 Parent API(带 sk) | 走主后端 server-to-server 转调 | §6 / [[PAT-007__ip-sk-dual-factor-server-to-server-auth\|PAT-007]] |
| WebView 全屏后靠 mask 点击关闭 | Widget.top 让位 + 显式 btn_close | §5 |
| 等后端就绪才能联调 | mock 代理 + 改写 lobbyHost 接管,客户端零改动 | §7 |

## 关联错误
- [[ERR-017__jweixin-sdk-stub-misdetected-as-miniprogram-webview|ERR-017]] — 微信 web-view 环境检测 / back-to-parent,本模式 §1 的小游戏 vs 小程序差异同源
- [[ERR-033__destroyob-oncompdestroy-dead-hook-listener-leak|ERR-033]] — 本次同 session 根治的监听泄漏(WebView 层 onPop/onDestroy 接线依赖正确的销毁回调)
- [[ERR-034__cocos-mcp-server-161-property-whitelist-and-tool-gaps|ERR-034]] — MCP 属性白名单,本模式的 Button.transition/Label 运行期兜底来源
