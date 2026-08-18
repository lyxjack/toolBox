---
id: ERR-109
type: error
errorCode: LOOP-STARVE-001
severity: high
status: open
recurrence: 0
firstSeen: "2026-08-04"
tags:
  - ki/error-book
  - error
  - severity/high
  - domain/platform
  - domain/testing
  - project/guandan
prevention:
  - "**基类主循环里 `return` 之前的每一道门禁，都是子类主循环的饿死点**。`onUpdate()` 里 `if (门禁命中) { handleEscape(); return }` —— 这个 `return` 跳过的是**同一函数末尾的 `handleUpdate(dt)`**，即子类的整个游戏循环。只要门禁条件**不因 handleEscape 而消解**，它就不是「触发一次」而是「每 tick 都触发」，游戏永久冻结。接手第三方基类时，先把主循环里所有 early-return 逐个问一遍：这条路径退出后，谁负责让条件不再成立？"
  - "**幂等的 handler 配上不刷新的计时器 = 死锁**。`handleEscape` 写成 `setUserTuoguan(c, true)` 看着安全（幂等），而 `setUserTuoguan` 在状态未变时提前返回、**不刷新 `tuoguanTime`**。于是门禁条件永真。判据：任何「门禁 → handler」结构，都要确认 handler 真的动了门禁读的那个量；只在 handler 里重申既有状态 = 空操作 = 门禁永真"
  - "**冒烟直接调 `handleUpdate` 就照不出基类门禁**。掼蛋所有回合冒烟都绕开 `onUpdate()`，全绿也证明不了生产链路可用——生产是 `initRoom()` 里 50ms 一次的 `setInterval(onUpdate)`。规则：**冒烟的入口函数必须与生产入口同名同层**；不得已下探时，明写「本套件不覆盖 <基类函数> 内的逻辑」"
ci_rules: []
mem_ref: "602273bc-d8ca-44b0-9337-984dfdeb2b9b"
mem_status: linked
aliases:
  - "ERR-109"
  - "base-class-gate-early-return-starves-subclass-update"
  - "托管逃跑门禁冻桌"
related:
  - "Internal_KI/patterns/PAT-045__tunable-knob-registry-before-retuning.md"
  - "Error_Book/entries/ERR-105__fixture-collapses-phases-so-the-gap-cannot-exist.md"
---

# 机器人上桌约 120 秒后整桌永久冻死（未修，候旨）

## 现象

尚未在现网观测到——2026-08-04 由 codex 只读审查提出，臣顺调用链核实后确认成立。**冒烟全绿照不出它**。

含机器人的掼蛋牌局，机器人落座起算约 **120 秒**后，整桌不再推进任何回合，永久卡死。

## 根因链

1. 生产主循环：`kds-game-base/src/roomBase.ts:369` `initRoom()` 里 `setInterval(onUpdate, 50)`。
2. 门禁：`roomBase.ts:1367-1377`（平台 2025.9.29 / 10.9 增补）——任一在座玩家 `tuoguan && tuoguanTime > 0` 且 `now - tuoguanTime >= getUserOfflineEscapeTimeout()*1000`（掼蛋 = 120s）**或** `tuoguanCount >= 5` → `handleEscape(chairNo)` 然后 **`return`**。
3. 这个 `return` 跳过的是同函数末尾的 `this.handleUpdate(this.dt_)`——**掼蛋的整个游戏循环**。
4. 掼蛋 `handleEscape`（`gdRoom.ts:1298`）只做 `setUserTuoguan(c, true)`：掼蛋明定不因托管散局，由代打续打。
5. 而 `setUserTuoguan`（`roomBase.ts:879`）在 `user.tuoguan == b && !force` 时**提前返回，不刷新 `tuoguanTime`**。
6. ⇒ 门禁条件永真，此后每 50ms 都走 early-return。**`handleUpdate` 再也不执行。**

机器人补位落座即永久托管（`gdRoom.ts:1458`，托管 = 机器人行动力来源），`tuoguanTime` 只写一次、永不刷新 ⇒ 必然在 120 秒后命中。`tuoguanCount` 虽在 RoundStart 归零，`tuoguanTime` 不归零。

**与出牌时限无关**：门禁按墙钟从托管起算，不读 `TurnSec`。20 秒时代就存在。但 180 秒调参后每桌能打的手数骤减，等于把这枚雷从「打完一局才可能踩到」推到「测试人员用满一手就踩到」。

## 为什么测试面全无感

`bridge.smoke` / `roomConfig.smoke` 的超时用例都直接调 `(room as any).handleUpdate(0)`，**绕过 `onUpdate()` 的门禁**。生产入口是 `onUpdate`，冒烟入口是 `handleUpdate` —— 差一层，门禁整段不在覆盖面内。同族：[[ERR-105__fixture-collapses-phases-so-the-gap-cannot-exist]]。

## 待定的修法（候旨，未实施）

掼蛋侧一处即可，不碰平台底座：`gdRoom.handleEscape` 里**重新武装托管钟** —— `setUserTuoguan(c, true, /*force*/ true)`（force 绕过幂等早退，刷新 `tuoguanTime`）**并把 `tuoguanCount` 归零**（否则 10 分钟后改由 `count >= 5` 分支永真，等于没修）。代价：每 120 秒丢一个 50ms tick，无感。

语义依据：掼蛋本就明定「不因托管散局、由代打续打」，这道门禁对掼蛋应是空操作，而不该饿死主循环。

**修完必须加的防线**：一条走 `onUpdate()`（而非 `handleUpdate`）、把托管钟回拨 120 秒以上的用例——否则改完仍然无人守。
