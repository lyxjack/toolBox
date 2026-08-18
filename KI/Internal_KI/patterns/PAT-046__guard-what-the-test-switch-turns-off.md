---
id: PAT-046
type: pattern
title: 为跑测试而关掉的功能，必须另立不受该开关影响的守门人
status: active
created: "2026-08-08"
trigger_condition: user_explicit
tags:
  - ki/internal
  - pattern
  - trigger/user_explicit
  - domain/testing
  - domain/timing
  - project/guandan
aliases:
  - "PAT-046"
  - "guard-what-the-test-switch-turns-off"
  - "关掉的功能要另立守门人"
mem_ref: "6ddbd2ab-80cb-4bd8-95d8-fb6e764bbae9"
mem_status: linked
related:
  - "Error_Book/entries/ERR-113__roster-assertions-fail-on-the-one-not-listed.md"
  - "Error_Book/entries/ERR-112__waiting-placed-on-the-side-that-dies-first.md"
  - "Error_Book/entries/ERR-108__assertions-hardcode-a-tunable-value.md"
complements:
  - "Internal_KI/patterns/PAT-035__negative-control-before-trusting-a-new-assertion.md"
  - "Internal_KI/patterns/PAT-045__tunable-knob-registry-before-retuning.md"
---

# 为跑测试而关掉的功能，必须另立不受该开关影响的守门人

## 问题

给对局加了「小局结算后按住 5 秒」的暂停后，所有**驱动整场对局**的冒烟夹具立刻失效 —— 按 dt 步进的步数预算被 `5s × N 副` 吃光，一场只跑得完 1 副（原本 11 副），大批断言从「通过」变成「跑不到」。

自然的处置是给这些脚本加环境变量关掉暂停（`GD_SETTLE_REVEAL_SEC=0`）。**但关掉之后，这个功能就没有任何测试在守了** —— 它被误删、被改坏、被漏掉一条实现路径，都不会有一条红。

这是个普遍形状：**为了让别的测试能跑，把某个功能关掉；关掉的那一刻，它自己失去了守卫。**

## 做法（三件套）

### 1. 关，但要用可外部覆盖的旋钮

```ts
static SettleRevealSec: number = (function () {
    let raw = Number(process.env.GD_SETTLE_REVEAL_SEC)
    return (isFinite(raw) && raw >= 0) ? raw : 5     // 缺省即生产值
})()
```

好处有三：改时长不必动代码；测试脚本各自决定关不关；**默认值就是生产行为**，不会出现「测试跑的是另一套语义」。

### 2. 另立一个**不受该开关影响**的守门人

新建独立断言文件，**纯静态解析源码**，不驱动对局 ⇒ 不吃步数预算 ⇒ 不需要被关掉。它钉三件事：

- 常量本身（存在 / 默认值落在合理域 / 可 env 覆盖 / **只定义一处**）
- 功能真的接上了（`await` 在、闸门条件对、调用点都 `await` 了）
- **哪些脚本被允许关掉它** —— 见下

并且钉一条自指的负向：**守门人自己不得带那个关闭开关**。

### 3. 补一条**行为级**实测，证明「真的按住了」

静态断言只能证明「代码里写了 await」，证不了「广播真的被推迟」。故另起 e2e：起真壳、连真 WS、量**墙钟间隔**。

```
★ Settle→下一副 间隔 ≈ 5s    实测 5.03s
★ Settle→收场   间隔 ≈ 5s    实测 5.02s
```

期望值**从被测源码现读**，不抄字面量（[[ERR-108__assertions-hardcode-a-tunable-value|ERR-108]]）：调参后断言自动跟上，不会一改参数就集体变红。

## 三个必须一起做的细节

**① 关闭清单要有闭包判据。** 「哪些脚本需要关」是一份名单，而名单的风险全在漏项 —— 本案 `shell:friend:smoke` 漏册，时长从 3s 调到 5s 那天撞穿它自己的 240s 预算，而守门段全绿。判据要写成「凡会驱动整场对局的脚本都必须带开关」，而不是逐一核对已在册的。详见 [[ERR-113__roster-assertions-fail-on-the-one-not-listed|ERR-113]]。

**② 同一语义若有多条实现路径，逐条都要钉。** 本案「按住公示窗」有两处（常规小局按住下一副发牌 / 整场末副按住收场），断言最初只钉了前者。写法：数「出现次数**恰为 2**」且「**都直接读同一个常量**」—— 前者挡漏掉一条，后者挡两处各写字面量各自漂移。

**③ 负控要真跑。** 本案首轮 6 条负控里 **2 条没报红**：查「游标是否在 await 前推进」用了 `lastIndexOf("broadcastCursor")`，而循环初始化 `for (let i = this.d.broadcastCursor; …)` 也含这个词；查「固定把数闸门」用了 `isFixedJuReached()` 是否出现过，而方法顶部的 break 条件里另有一处。**两条都是钉了标识符、没钉位置**。改成抠出闸门的条件文本与块体后再判，六条才全部报红。

## 适用判据

出现下列任一情形即适用：

- 为让测试跑得动而关掉某功能（超时、步数预算、外部依赖、耗时等待）
- 某功能只在特定模式/路径下生效，而主测试跑的是另一条路径
- 某行为需要**墙钟时间**才能观测（暂停、动画、节流、重试退避）

## 反模式

- **只加开关不加守门人** —— 功能从此裸奔，且没人会注意到
- **把守门人也加上关闭开关**（图省事让 `test:all` 快点）—— 等于没有
- **只写静态断言** —— 能证明「代码里有」，证不了「运行期真发生」
- **期望值抄字面量** —— 调参日全体变红，没有一条是真缺陷，久之被当噪音忽略
