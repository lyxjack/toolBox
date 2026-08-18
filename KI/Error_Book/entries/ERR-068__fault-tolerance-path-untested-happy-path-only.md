---
id: ERR-068
type: error
title: 改了容错/重试逻辑，却只测「不触发容错」的顺路 → 容错本身是死的
severity: high
status: resolved
recurrence: 1
firstSeen: 2026-07-25
tags:
  - error/high
  - domain/testing
  - errorCode/BHV-004
  - ki/error-book
prevention: 凡新增或修改「失败时怎么办」的分支（重试、降级、兜底、fail-close），验收测试必须**强制让主路径失败**再跑一遍。主路径能成功时跑出的绿勾，对容错分支零覆盖
  —— 那条分支一行都没执行过。强制失败的手段要在写代码时就一并想好（可注入的失败源），否则「测不了」就会变成「不测」。
ci_rules: []
related:
  - Internal_KI/patterns/PAT-031__external-quota-autonomous-gate.md
  - Error_Book/entries/ERR-062__degraded-fallback-data-treated-as-success-defeats-fail-close.md
  - Error_Book/entries/ERR-063__adversarial-review-scope-spiral-no-stopping-rule.md
mem_ref: e39e2fb2-d982-4129-aa64-19d5a18db0c9
mem_status: linked
errorCode: ERR-068
aliases:
  - ERR-068
  - fault-tolerance-path-untested
---

# 容错分支从未被执行过

## 错误现象

额度闸门（[[PAT-031__external-quota-autonomous-gate|PAT-031]]）在真实条件下**连续两次把用户锁死**，两次都发生在「刷新时刻到了，复核用量」这一步的失败分支上：

| 次 | 时长 | 直接原因 |
|---|---|---|
| 1 | **10 小时 42 分** | 额度耗尽时端点返回 `five_hour: null`，校验判「异常」；而「验不出就绝不解闸」是死规矩 → 每分钟重试 347 次，永不放行 |
| 2 | **33 分钟** | 为修第 1 次而加的重试用了递归 + `isRetry` 标志，把等待循环的剩余时间钉死在 `60_000`，`if (left <= 0) break` 永不成立 → 静默死循环；暂停期间又跳过探测，**连日志都不写** |

第 2 次尤其刺眼：它是**修第 1 次时新引入的**。用户从手机上喊「继续」，喊到的是一个已经僵住的闸——因为「暂停」的实现就是拦 prompt，闸一坏，求救的路也被自己堵死，只剩终端里那条人工 `resume`。

## 根因

两次验收都跑出了满屏绿勾，但**绿勾覆盖的都是「主路径成功」的那条线**：

```
测试时：端点正常 → probe 成功 → refreshed → unpaused → 全绿 ✅
真实时：额度耗尽 → probe 失败 → 进入重试/兜底分支 → 从未被执行过的代码 → 死锁
```

而「额度耗尽」恰恰是这个闸门**唯一会真正生效的时刻**。也就是说：**唯一重要的那条路，从来没跑过。**

第 2 次还叠加了一层：明明刚加完兜底期限，测试却只构造了「一进来就直接超期 → 立刻放行」，**跳过了中间的重试循环**——而 bug 正好在重试循环里。测「兜底放行」不等于测「重试后兜底放行」。

## 修复

**一、失败注入必须在写代码时就设计好。** 本例最终用的手段：把 keychain 服务名临时改成不存在的项，让 `usage()` 必抛。若当初没有这个可注入点，测试就会因为「构造不出失败」而被跳过 —— 而「测不了」在实践中一律等于「不测」。

**二、容错逻辑写成可证明终止的形状，别用递归 + 标志位。**

```js
// 错：递归 + isRetry，剩余时间被钉死，循环永不退出，且静默
async function wait(x, isRetry = false) {
  const left = isRetry ? 60_000 : due - Date.now();   // ← 重试时恒为正
  ...
  return wait(x, true);                                // ← 递归重入
}

// 对：单层循环 + 绝对期限，无递归，必然终止
async function wait(x) {
  let dueMs = ..., giveUpMs = dueMs + GIVEUP * 1000;
  for (;;) {
    if (Date.now() < dueMs) { ...; await sleep(...); continue; }
    try { ...; break; }
    catch (e) {
      if (Date.now() >= giveUpMs) { log('forced'); break; }   // ← 硬期限
      log('retry', { giveUpAt });                             // ← 每次重试都留痕
      await sleep(RETRY * 1000);
    }
  }
}
```

**三、任何「等待/重试」都要有绝对期限，并把期限写进日志。** 上例每条重试日志都带 `giveUpAt`，运维时一眼能看出「它还剩多久放弃」。第 1、2 次事故的共同特征就是：**日志里看不出它在等什么、等到什么时候为止**（第 2 次干脆一条不写）。

**四、fail-closed 的兜底方向要按风险不对称性定。** 这个闸门「放行」的最坏后果是宿主自己再撞一次限（宿主本来就会处理）；「不放行」的最坏后果是把人锁死十小时。所以入口 fail-closed（拿不准就拦），出口要有兜底期限（拿不准也得放）。**两者不矛盾——代价不对称时，方向就该不一样。**

## 预防规则

| 规则 | 说明 |
|---|---|
| 改了容错分支 → 必须强制主路径失败再验一遍 | 主路径成功时的绿勾对容错分支零覆盖 |
| 失败注入点在写代码时一并设计 | 否则「测不了」会变成「不测」 |
| 等待/重试必须有绝对期限 | 且期限写进日志，随时可看还剩多久放弃 |
| 容错逻辑禁用递归 + 标志位控制循环 | 单层循环 + 绝对期限，形状上可证明终止 |
| 静默 = 事故 | 容错分支每走一次都要留痕；第 2 次事故 33 分钟零日志 |
| 入口 fail-closed，出口给兜底 | 按两个方向的代价不对称性分别定，不要一刀切 |

## 关联

- [[PAT-031__external-quota-autonomous-gate|PAT-031]] — 两次事故都发生在该模式的实现上
- [[ERR-062__degraded-fallback-data-treated-as-success-defeats-fail-close|ERR-062]] — 同一段代码的另一面：那条是降级数据被当成功，本条是失败分支根本没测
- [[ERR-063__adversarial-review-scope-spiral-no-stopping-rule|ERR-063]] — 同族：那条是「审计说了就改」，本条是「改了不验真路」，都属交付纪律
