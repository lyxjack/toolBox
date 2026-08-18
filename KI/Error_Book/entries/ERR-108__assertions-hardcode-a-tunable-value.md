---
id: ERR-108
type: error
errorCode: ASSERT-PIN-002
severity: medium
status: resolved
recurrence: 0
firstSeen: "2026-08-04"
tags:
  - ki/error-book
  - error
  - severity/medium
  - domain/testing
  - domain/config
  - project/guandan
prevention:
  - "**断言的期望值一律由被测常量导出，字面钉只留一处**。测试里每写一个复刻可调参数的裸数字，就是给未来每一次调参加一条假红。掼蛋 2026-08-04 把出牌时限 20→180，`bridge.smoke`/`roomConfig.smoke`/`robotFill.smoke` 共 9 条断言变红，**没有一条是真缺陷**——全是断言自己抄了旧值。正确形状：期望值写 `=== GDRule.TurnSec`，另在**唯一一处**写 `check(\"TurnSec = 180(用户定值)\", GDRule.TurnSec === 180)`。判别力不减，调参成本从 O(断言数) 降到 O(1)"
  - "**时间推进量也是期望值，同样要导出**。最隐蔽的一类：`dt_ = 30` 跨 20 秒 deadline、「恒推 60 秒」跨 30/20/15 三档——它们不是断言、是**前提**，读代码时不显眼，调参后却静默失效（超时永不发生 → 断言红在「代打没发生」，指向完全错误的方向）。写法：`dt_ = Math.max(TurnSec, ...PlayTimeLimitSeconds) + 10`、`ticks = Math.ceil(sec / DT) + 2`"
  - "**由常量导出后，先反证一次再信它**：把常量改坏，看断言是否真红。导出化天然有滑向自证空钉的风险（见 ERR-104），唯一解药是保留那一处字面钉 + 走一遍 PAT-035 的反证"
ci_rules: []
mem_ref: "602273bc-d8ca-44b0-9337-984dfdeb2b9b"
mem_status: linked
aliases:
  - "ERR-108"
  - "assertions-hardcode-a-tunable-value"
  - "断言写死可调参数"
related:
  - "Internal_KI/patterns/PAT-045__tunable-knob-registry-before-retuning.md"
  - "Error_Book/entries/ERR-096__assertion-pinned-to-the-wrong-quantity.md"
  - "Error_Book/entries/ERR-104__assumption-written-as-assertion-and-hollow-pin.md"
  - "Internal_KI/patterns/PAT-035__negative-control-before-trusting-a-new-assertion.md"
---

# 改一个运营参数，9 条断言集体变红，红的没有一条是真缺陷

## 错误现象

用户要把掼蛋出牌时限 20 秒临时改成 180 秒（测试人员记录用）。常量改完跑 `test:all`，分三轮共 9 条红：

| 轮 | 红在哪 | 红的内容 |
|---|---|---|
| 1 | `bridge.smoke.ts:273` | 「超时未收消息，代打自动出牌」失败 |
| 2 | `roomConfig.smoke.ts:741` | 好友房三档 ×2 条 = 6 条，「timeout = 30 实得 180」「推 60 秒后确实超时托管代打」失败 |
| 3 | `robotFill.smoke.ts:540` | 「真人席 8 条路径逐一等于 T6 改前值」失败 |

**一条真缺陷都没有。** 生产代码行为完全正确：180 秒就该下发 180，超时就该在 180 秒后发生。

## 根因

三处断言各自**抄写**了可调参数的绝对值，而不是引用它：

1. `bridge.smoke.ts`：`dt_ = 30`，注释写「推进 dt 超过本回合超时(首出回合超时=20s)」。参数变 180 后 30 秒跨不过 deadline，超时永不发生。**这是前提失效，不是断言失效**——所以红的措辞是「代打没发生」，指向的方向完全错。
2. `roomConfig.smoke.ts`：期望值写死 `30/20/15`，且**恒推 60 秒**。前者报「期望 30 实得 180」（断言抄了旧值），后者报「没超时」（推进量不够）。同一处踩中两种。
3. `robotFill.smoke.ts`：真人八条路径钉死 T6 改前字面量。它要证的是「机器人拟人化没污染真人路径」，写死后变成「真人值有没有变过」——**语义漂移**：用户合法改参也会红，误报成污染。

共同形状：**断言把「可调的量」当成「不变量」**。它们在参数不动时全绿，参数一动就集体失真，且失真的措辞普遍指向错误方向，排查成本远高于改参本身。

## 修复

三处全部改为**由常量导出**：

- `dt_ = Math.max(GDRule.TurnSec, ...GDRule.PlayTimeLimitSeconds) + 10`
- `TIERS` 从 `PlayTimeLimitSeconds` 取值；`ticks = Math.ceil(sec / DT) + 2` 保证推进量恒跨过本档
- 真人路径表期望值写 `GDRule.TurnSec` / `PlayTimeLimitSeconds[code]`，断言名改回它真正要证的「拟人化零污染」

**字面钉保留在唯一一处**：`roomConfig.smoke.ts` §3 的 `check("TurnSec = 180(用户定值, 字面钉)", H === 180)`，外加三档值、兜底档、全模式一致各一条。判别力没丢——常量被改坏，这一处必红。

## 判据

写测试时自问：**这个数字是我要证的结论，还是我抄来的配置？** 抄来的一律导出。分辨方法：如果产品经理有权改它，它就是配置。

时间推进量、超时窗、循环次数这类**前提量**同样适用——它们不在 `check()` 里，最容易漏。

## 相关

- [[PAT-045__tunable-knob-registry-before-retuning|PAT-045]] —— 调参前先立可调旋钮登记表，本条是「没立表就调」的下游代价
- [[ERR-096__assertion-pinned-to-the-wrong-quantity|ERR-096]] —— 同族：断言把一个自己不掌控的量当成基准
- [[ERR-104__assumption-written-as-assertion-and-hollow-pin|ERR-104]] —— 导出化会滑向自证空钉，故必须保留唯一一处字面钉
- [[PAT-035__negative-control-before-trusting-a-new-assertion|PAT-035]] —— 导出化之后先把常量改坏跑一次反证，再采信它的绿
