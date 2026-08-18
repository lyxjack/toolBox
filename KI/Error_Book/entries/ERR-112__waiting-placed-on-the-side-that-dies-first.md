---
id: ERR-112
type: error
errorCode: "LIFE-002"
severity: "high"
status: "resolved"
recurrence: 0
firstSeen: "2026-08-08"
tags:
  - "error/high"
  - "domain/lifecycle"
  - "domain/timing"
  - "engine/cocos"
  - "project/guandan"
  - "errorCode/LIFE-002"
  - ki/error-book
prevention: "把「等 N 秒再做某事」放在**生命周期更短的那一侧**，等于没做 —— 定时器随宿主一起被销毁，回调永不触发，且失败是静默的。排期一个延迟前先问：这 N 秒里，谁有权把我拆掉？客户端争取不到自己没有的时间；只有**掌控收场节奏的那一方**（服务端 / 父容器 / 调度者）才能真正把时间按住"
leading_word: "lifetime"
aliases:
  - "ERR-112"
  - "waiting-placed-on-the-side-that-dies-first"
  - "延迟放在先死的那一侧"
mem_ref: "6ddbd2ab-80cb-4bd8-95d8-fb6e764bbae9"
mem_status: "linked"
related:
  - "Error_Book/entries/ERR-033__destroyob-oncompdestroy-dead-hook-listener-leak.md"
  - "Error_Book/entries/ERR-074__client-side-irreversible-action-races-server-deadline.md"
  - "Error_Book/entries/ERR-105__fixture-collapses-phases-so-the-gap-cannot-exist.md"
---

# 延迟放在了先死的那一侧 —— 客户端争取不到自己没有的时间

## 案发

掼蛋要「一小局结束后停 5 秒，让玩家看清未出完玩家的手牌」。设计分了两条路：

- **多小局模式**：服务端 `pumpEvents` 广播完结算后 `await yieldTimeout(5)` 按住下一副 —— **有效**。
- **单局模式（经典模式）**：没有下一副可按，于是让**客户端**把结算面板 `scheduleOnce(…, 5)` 延后 —— **完全无效**。

用户实机连测两轮都是「秒出结算」。console 是自证的：

```
[handReveal] 公示 1 席 5s，结束后才弹结算面板   ← 代码确实跑到了
GS_GameEnd → GS_Exit → lobby/group/list
[BaseGameLayer] onDestroy                      ← 不到一秒，整个层被销毁
```

## 根因

单局模式里，结算之后服务端立刻收场：`setStatus(Result)` → `GS_GameEnd` → `GS_Exit` → 客户端导航回大厅 → **游戏层 onDestroy**。整个过程远不到一秒。

那枚 5 秒的 `scheduleOnce` 挂在游戏层组件上，**宿主没了，调度器随之消失，回调永不触发**。

**关键认知：客户端从来就没有那 5 秒。** 它不掌握收场节奏 —— 房间什么时候关、玩家什么时候被踢回大厅，全由服务端决定。让一个没有时间支配权的角色去「延后」，是把愿望当能力。

## 为什么静态检查与既有测试都没抓到

| 手段 | 为什么漏 |
|---|---|
| 类型检查 / 源码断言 | `scheduleOnce` 写法完全正确，钉「代码里有这个延迟」永远绿 |
| e2e（当时版本） | 只测了「多小局：Settle → 下一副 的墙钟间隔」，**单局那条路根本没进测试矩阵** —— 而那正是用户在打的模式 |
| 逻辑推演 | 我推的是「客户端延后 5 秒」这件事本身成不成立，没推「这 5 秒里客户端还活着吗」 |

## 修法

**把等待挪到掌控收场节奏的那一方。** 服务端在两处按住，客户端一秒都不自己数：

| 时机 | 按住什么 | 位置 |
|---|---|---|
| 常规小局 | 下一副发牌广播 | `pumpEvents` 的 deal-settled 分支之后 |
| **整场末副** | **收场**（`setStatus(Result)`） | `step_Playing` 跳出主循环之后 |

客户端相应简化为「立刻渲染、立刻弹面板」，删掉 `onDone` 回调、`scheduleOnce`、令牌字段 —— 时长常量只保留作与服务端配对的声明（有断言强制两侧相等）。

## 预防规则

1. **排期任何延迟前先问一句：这 N 秒里，谁有权把我拆掉？** 若答案里包含「对端 / 父容器 / 调度者」，这个延迟就不能放在自己这侧。
2. **等待要放在掌控节奏的那一方**：服务端控房间生命周期 → 服务端按住；父容器控子层 → 父容器按住。
3. **测试矩阵必须覆盖「生命周期最短的那条路」**。本案单局模式恰是层活得最短的一条，也恰是唯一失败的一条。凡「同一功能在不同模式下走不同机制」，**每条机制各要一条实测**，不能用其中一条的绿去替另一条背书。
4. **失败是静默的**：宿主销毁不会报错，回调只是永远不来。故此类设计必须有**行为级**证据（墙钟间隔实测），源码级断言证不了。

## 关联

- [[ERR-033__destroyob-oncompdestroy-dead-hook-listener-leak|ERR-033]] —— 同族的另一面：那次是回调**活过了**宿主（僵尸回调），本条是回调**没活到**触发。两者都源于「没把定时器的生命周期与宿主对齐」。
- [[ERR-074__client-side-irreversible-action-races-server-deadline|ERR-074]] —— 同族：本地计时与服务端 deadline 的从属关系没理清。那次是本地倒计时超出服务端窗口，本条是本地延迟撑不到服务端收场。
- [[ERR-105__fixture-collapses-phases-so-the-gap-cannot-exist|ERR-105]] —— 同族：测试夹具把两个相位压成一拍，使得空窗在测试里结构性不存在。本条是测试矩阵漏了整条路径。

> CI: Tier 2 only —— 「延迟是否活得到触发」取决于运行期生命周期，静态规则表达不了；由 e2e 的墙钟间隔实测承担（`settleRevealPause.e2e.mjs` 的「Settle→收场 间隔」一条）。
