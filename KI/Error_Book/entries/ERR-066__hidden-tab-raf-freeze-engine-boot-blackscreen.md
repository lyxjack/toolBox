---
id: ERR-066
type: error
errorCode: ERR-066
severity: high
status: resolved
recurrence: 3
firstSeen: 2026-07-25
tags:
  - ki/error-book
  - error
  - severity/high
  - domain/browser
  - engine/cocos
prevention:
  - 浏览器游戏纯黑屏且引擎零日志时, 第一探针=页面 `document.visibilityState` + requestAnimationFrame
    探活（3s 不回调即冻结）——Chrome 对隐藏/被遮/最小化标签冻结 rAF, cc.game.init 等首帧永远等不到, 呈纯黑无错
  - "该态与工程/编辑器状态完全无关: 服务器 200、脚本可手动 import、编辑器重启均不改变现象——先排环境再动系统,
    勿按黑屏惯性重启编辑器/重开场景"
  - 用扩展驱动浏览器自动化测试时, 截图能拍≠标签在前台; 长跑测试须与用户约定保持窗口可见, 或每轮先探 visibilityState
  - boot 后再替换 window.requestAnimationFrame 对 Cocos 无效——cc.game._pacer 构造时已把原生
    rAF 捕获进 _pacer._rAF。要么把注入与 navigate 放进同一批次抢在 bootstrap() 之前, 要么直接
    _pacer.stop() 后自驱 _pacer._onTick()
  - targetFrameRate ≠ 显示器刷新率时 pacer 走 setTimeout 路径而非 rAF——只 shim rAF 会毫无效果,
    排查帧停摆前先对表这两个值
  - "『FPS 正常 + loadBundle 永不回调 + 下载队列恒空 + 零网络请求(fetch/XHR 手测 200)』= Chrome
    intensive timer throttling 饿死了 cc.assetManager(其下载流水线由 setTimeout
    驱动)。见此指纹别查资源/bundle/CDN, 查定时器: 用 MessageChannel 宏任务循环同时接管 _pacer._onTick 与
    setTimeout/setInterval, 并把 cc.game.pause 置空"
  - "运行期注入的帧泵是观测手段不是修复: 图片解码与纹理上传在真隐藏态下无法用 JS 绕开, 视觉类验收(布局/位置/配色)必须窗口置前后重跑"
ci_rules: []
mem_ref: 2b771c42-2d14-4883-8ff4-1afb0c0c3f12
mem_status: linked
related:
  - Error_Book/entries/ERR-056__watchdog-silence-mistaken-for-death-false-kill.md
  - Error_Book/entries/ERR-019__cosmetic-change-to-loadbearing-module-unverified.md
aliases:
  - ERR-066
  - hidden-tab-blackscreen
---

# Chrome 隐藏标签 rAF 冻结 → 引擎 boot 挂死纯黑屏, 被误诊为工程/编辑器故障

## 错误现象

preview 页面纯黑、引擎零日志零异常, 持续三小时。期间依次误试: 场景软重载、重开场景、编辑器窗口重载、preview 服务重启、**编辑器整进程重启**（劳动用户）——全部无效。1:46 同一套提交曾完整跑通对局, 加重「工程被改坏」错觉。

## 根因

逐层探针收敛: 资源全 200 → `cc` 对象在 → `gameInited:false, frame:0` → WebGL/WebGPU 正常 → 最终 `visibility=hidden, rAF FROZEN(3s)`。Chrome 冻结隐藏标签的 requestAnimationFrame; Cocos boot 链 `game.init` 等首帧, 永不返回。1:46 能跑只因当时窗口恰在前台。扩展截图对后台标签依然出图（拍到冻结前最后一帧的黑 canvas）, 掩盖了「标签不可见」这一唯一变量。

## 修复

窗口调回前台即自愈（新建窗口置前亦可）。与工程零关系, 编辑器重启纯属误伤（还引出「重启后未开 Live 场景 → preview 跑空场景」次生坑, 以 MCP HTTP 直连 `cocos_scene open` 解决）。

## 预防规则

见 frontmatter。与 [[ERR-056__watchdog-silence-mistaken-for-death-false-kill|ERR-056]] 同一哲学: **安静/黑≠死亡, 处置前先拿硬证据**; 本条是它在浏览器渲染域的镜像。

## 关联

- [[ERR-056__watchdog-silence-mistaken-for-death-false-kill|ERR-056]] — 同哲学: 静默态误判为故障导致误处置
- [[ERR-019__cosmetic-change-to-loadbearing-module-unverified|ERR-019]] — 反向教训呼应: 黑屏≠必然是承重改动引发, 环境因素同权重排查

---

## 补遗 — 冻结不止 rAF: pacer 捕获期、setTimeout 路径、assetManager 饿死

> 来源: REQ-20260726-030631(掼蛋横版化 T1/T5 冒烟)。本条首版只查到「rAF 被冻结, 窗口置前即自愈」;
> 本轮因编辑器长期遮挡 Chrome、且 AppleScript 抬窗被系统权限弹窗阻断, 被迫在冻结态下把绕行做到底, 于是挖到三层更深的现象。

### ① `cc.game._pacer` 在**构造时**就把原生 rAF 存进了 `_pacer._rAF` —— boot 后替换 `window.requestAnimationFrame` 无效

首版结论「补一个 rAF 泵就行」只在**注入早于 boot** 时成立。引擎 boot 完成后再改 `window.requestAnimationFrame`, pacer 手里握的仍是构造期捕获的原生引用, 泵完全不接线。

两条可行姿势(本案两种都实测过):

- **注入早于 boot** —— 把 `navigate` 与补丁注入放进**同一个 browser_batch**, 抢在 `window.onload → bootstrap()` 之前完成
- **直接改 `_pacer`** —— 改写 `_pacer._rAF` 后 `stop()` / `start()`, 或 `stop()` 后自己驱动 `_pacer._onTick()`

补泵后 pacer 从 `_frameCount = 0` 恢复正常计数, 稳定 **59–60 FPS 真渲染**。

### ② `targetFrameRate ≠ 显示器刷新率` 时, pacer 根本不走 rAF 而走 `setTimeout`

这解释了为什么「只 shim rAF」有时仍然一动不动: 该配置下引擎的帧驱动落在定时器路径上, 而定时器同样被后台标签节流。**判定帧停摆的原因前, 先看 `targetFrameRate` 与显示率是否相等**, 否则会拿着 rAF 探针在错误的路径上找问题。

### ③ ⚠️ 最隐蔽的一层: **intensive timer throttling 会饿死 `cc.assetManager`**

Chrome 对长期隐藏的标签施加 intensive timer throttling(定时器降到分钟级)。而 `cc.assetManager` 的**下载流水线由 `setTimeout` 驱动** —— 于是出现一组极具误导性的症状:

| 现象 | 直觉判断(错) | 真相 |
|---|---|---|
| FPS 正常(泵已接管 rAF) | 引擎活着, 没问题 | 只有渲染活着, 定时器仍被节流 |
| `loadBundle` **永不回调** | bundle 配置错 / 路径错 / meta 坏 | 下载任务根本没被调度 |
| 下载队列**恒空** | 请求已发完 | 请求从未入队 |
| **零网络请求**(DevTools 干净) | 网络断了 / CORS | 手测 `fetch`/`XHR` 均 200, **网络完全无辜** |

「FPS 正常 + 零网络请求 + loadBundle 不回调」这个三件套是本层的指纹。见到它别去查资源、查 bundle、查 CDN —— 查定时器。

### ④ 完整解法(本案实测生效)

```
1. cc.game._pacer.stop()                     // 停掉引擎自己的帧驱动
2. 用 MessageChannel 建宏任务循环             // 宏任务不受 rAF 冻结, 节流面也远轻于 setTimeout
3. 在该循环里驱动 cc.game._pacer._onTick()    // 接管帧
4. 把 setTimeout / setInterval 一并 shim 到同一循环  // ← 关键: 救活 assetManager 下载流水线
5. cc.game.pause 置空                         // 防引擎在可见性变化时自己再暂停
6. 辅助: 改写 document.hidden / visibilityState / hasFocus 恒为可见
```

第 4 步是本轮新增的核心 —— 只做 1–3 只能拿到「会动的黑屏 / 会动但加载不出资源的页面」。

### 纪律边界

以上全部是**浏览器运行期注入**, 不落盘、刷新即失效, 不改动被测产物。它是**观测手段**, 不是修复 —— 真正的解仍是**让窗口可见**。图片解码与纹理上传在真隐藏态下无法用 JS 绕开, 所以视觉类验收(布局/位置/配色亲验)必须窗口置前后重跑, 不能拿泵出来的帧当证据。

### ⑤ 补遗二(2026-07-28, REQ-20260727-234602 实测)：泵的驱动源改用 **Web Worker 定时器**，别用 MessageChannel 忙轮询

④ 给的解法是 `MessageChannel` 自投递驱动 `_pacer._onTick()`。本轮再用时发现它有**反效果**：

```
ticks = 4029630 / 10s ≈ 400k tick/s   →   _inited 仍为 false, boot 反而跑不完
```

`port2.postMessage(0)` 在 `onmessage` 末尾自投递 = **无节流紧循环**，把主线程吃满，
boot 链上真正要干活的任务抢不到时间片 —— **泵活着，引擎饵死**。

**换成 Web Worker 里的 `setInterval`**：Worker 不受隐藏页节流，60Hz 稳定投递且不占主线程。

```js
const w = new Worker(URL.createObjectURL(new Blob(
  ['setInterval(function(){ postMessage(0); }, 16);'], {type:'text/javascript'})));
w.onmessage = function(){ /* 到期定时器队列 → rAF 队列 → g._pacer._onTick() */ };
try { g.resume(); } catch(e) {}
```

实测 `ticks=625/10s`(≈62Hz)、`inited:true`、`paused:false`、帧数正常增长，
登录→大厅→场次→整局全链走通，FPS 60~83。

另一处易漏：**`g.pause = function(){}` 只挡住后续暂停**；装泵前若已被 visibilitychange
置为 `_paused = true`，必须**显式调一次 `g.resume()`** 才活过来 —— ④ 的清单只写了
「resume 不可置空」，没写「要主动调」，本轮第一次装泵就卡在 `paused:true` 上。

navigate 与装泵仍必须同一个 `browser_batch`(④ 已述，复验仍成立)。

### 补遗关联
### ⑥ 补遗三(2026-07-28, 美工切图接线实测)：**暂停积压型**指纹 + tab 级激活

本轮第三次撞上本条。现象与前两版**指纹不同**, 补记以便日后识别:

| 项 | 前两版 | 本轮 |
|---|---|---|
| `cc.game.isPaused()` | 未记录 | **`true`** —— 引擎已被 visibilitychange 主动暂停 |
| 下载队列 | **恒空**(请求从未入队) | **恒 17**(请求已入队, 但不推进) |
| 网络请求 | 零 | 已有 200(png/json 都下来了), 只是回调不触发 |

即本轮是"**队列积压型**"而非"饿死型": 任务已排进 `downloader._queue`, 但驱动它推进的帧/定时器被节流, 于是**队列长度恒定不减**。见到 `isPaused()===true` + 队列非空不减, 直接判本条, 不必再逐层探针。

**两个新教训**:

1. **`cc.game.resume()` 救不回积压队列**。实测 resume 后 `paused:false` 但 `queue` 仍恒 17、`loadScene` 回调仍不触发 —— 暂停期间形成的死锁不随 resume 解开, **必须重新加载页面**(且加载全程 tab 可见)。
2. **抬窗要抬到 tab 级, 不是应用级**。`osascript -e 'tell application "Google Chrome" to activate'` 只把应用置前; 若目标页不是当前窗口的**活动标签**, `document.visibilityState` 依旧 `hidden`。正确姿势(本案实测生效):

```applescript
tell application "Google Chrome"
  activate
  repeat with w in windows
    set n to count of tabs of w
    repeat with i from 1 to n
      try
        if URL of tab i of w contains "7456" then
          set active tab index of w to i
          set index of w to 1
          return "activated"
        end if
      end try
    end repeat
  end repeat
end tell
```

> 用 `repeat with i from 1 to n` 索引遍历 + `try` 包裹; 直接 `repeat with t in tabs of w` 在标签数变动时会报 `Invalid index (-1719)`。

抬完必须复验 `document.visibilityState === 'visible' && document.hasFocus()`, 再**重新加载**页面, 才有资格开始运行期取证。

**误判代价**: 本轮黑屏排查逾半小时, 期间误试重开场景、重导入资源、换 URL 参数、清缓存、换 origin(localhost→127.0.0.1) —— 全部无效, 唯一变量是 tab 不可见。与首版"误重启编辑器"是同一种误诊, 说明**本条的召回时机没建立**(见 [[ERR-080__error-book-recall-keyword-mismatch|ERR-080]]: 排查阶段必须召回, 不只动手前)。


- [[ERR-065__external-file-edit-no-recompile-stale-preview-chunk|ERR-065]] — 同为 preview 验收的前置门禁: 一个管「跑的是不是新码」, 一个管「页面是不是真的在跑」。两道门都过了, 运行期结论才算数
- [[ERR-069__cocos-mcp-tool-quirks-collection|ERR-069]] — 同 REQ 蒸馏; 同属「表面指标正常(success / FPS 正常)掩盖真实状态」家族

## 复犯记录 #3（2026-08-02，REQ-20260801-205151 回放全链验证夜）

同一 rAF 冻结母题在一夜里以**三副面孔**连环出场，合计烧掉约一小时排查：

1. **boot 假死链**：preview 黑屏 → 依次排除三层才见底——①编辑器打包 worker 楔死（`waiting the ready of builder worker` 33 分钟，重启编辑器解）；②编辑器没开任何场景时 `/scene/current_scene.json` 永挂 pending，且 preview 引导脚本的 XHR helper **只在 200 时 resolve、无 error/timeout 分支**——boot 静默卡死零报错（`cc.game` 存在但 `inited=false`、`totalFrames=0`、console 空）；③窗口被全屏 Space 遮挡 → rAF 不跳 → `game.init` 都走不完。
2. **播放键"坏了"假象**：回放查看器点播放不走、点关闭没反应——`playing_=true` 而 tick 不走、label 不刷。真相=`cc.game.isPaused()` / 主循环因 tab 后台冻结；前台化后位置立即 103→137 推进。**组件级排查（scheduler/enabled/组件实例）全是弯路，第一探针应是 `document.visibilityState` + frameDelta**。
3. **AppleScript 前台化的极限**：`activate + set index of w to 1` 在用户开着全屏视频（独立 Space）时**不生效**，`visibilityState` 仍 hidden——window z 序 ≠ Space 可见性。用户在用机时不要连环抢屏；改请用户亲手把标签页带到前台（本案哨兵盯壳日志的登录流量作为"屏亮了"的信号，用户切过来即自动接续）。

新增预防细则：**判断"引擎类页面活着没有"的标准探针 = `document.visibilityState` + `director.getTotalFrames()` 两次采样差**；frameDelta=0 时一切"组件不响应"的排查都缓行。CDP 截图/点击不依赖可见性，会制造"看得见画面所以页面活着"的错觉。
