---
id: PAT-034
type: pattern
title: 服务端单一权威时钟 + 客户端本地快通道(带权威标记闸门)
status: active
created: "2026-07-28"
trigger_condition: quality_audit
tags:
  - ki/internal
  - pattern
  - trigger/quality_audit
  - domain/client-server-timing
  - domain/protocol
  - project/guandan
mem_ref: 019faae3-1c68-76a2-9517-c8208c9479f0
mem_status: linked
related:
  - "Error_Book/entries/ERR-074__client-side-irreversible-action-races-server-deadline.md"
  - "Error_Book/entries/ERR-075__incremental-path-fixed-snapshot-path-forgotten.md"
complements:
  - "Internal_KI/patterns/PAT-033__derive-on-frozen-kernel-for-free-invariants.md"
aliases:
  - "PAT-034"
  - "server-authoritative-clock-with-local-fast-path"
  - "权威时钟加本地快通道"
---

# 服务端单一权威时钟 + 客户端本地快通道

## 适用场景

需要「大多数情况给足时间, 特定情况下让用户快速通过」的回合制交互:

- 掼蛋: 出牌 20 秒, 但**手里压不过桌面牌时**本地 5 秒自动过牌
- 泛化: 倒计时结束自动跳过 / 自动放弃 / 自动提交默认值

关键张力: **时限的真值必须在服务端**(否则客户端可作弊), 但**加速体验只在本地**。

## 结构

```
服务端  turnTimeout() 恒下发满额(单一真值) ──广播全桌──┐
                                                       │
客户端  收到满额 → 本地判定是否命中快通道条件           │
        命中 → 本地缩短倒计时 + 到点自动执行动作 ───────┘
        未命中 → 照满额倒数
```

服务端**不参与**快通道判定 —— 它只管一个数。好处: 真值单一、广播口径一致、
服务端零改动即可调整快通道策略。

## 三道闸门(缺一必翻车)

### 闸门一 · 本地时限严格早于服务端 deadline

服务端下发的秒数在不同场景下差异极大:

| 场景 | 下发值 |
|---|---|
| 新回合 | 满额(20s) |
| **重连快照** | **剩余秒数**(可能只剩 3s) |
| 托管态 | 2s |
| 不限时房 | 0 |

本地固定 5 秒会在后三种场景下**晚于**服务端 → 用户被判超时(掼蛋里是被转托管,
每手 2s 代打且要手动解除)。

```ts
// 返回 0 = 「立刻执行, 别起倒计时」, 不是「不计时」
function localFastSec(serverSec: number, fastSec: number): number {
  if (!(serverSec > 0)) return fastSec;              // 0 = 不限时, 无 deadline 可撞
  return Math.max(0, Math.min(fastSec, serverSec - 1));  // -1 = 留给上行往返
}
```

两个易错点(均已在 [[ERR-074__client-side-irreversible-action-races-server-deadline|ERR-074]] 栽过):

- 服务端秒数若是 `Math.floor` 向下取整的, 报 N 秒真实剩余是 `[N, N+1)` —— 按下界算
- 算下来 ≤0 时必须**当场执行**; 退化成"等 1 秒"是伪修复

### 闸门二 · `0` 的语义必须唯一

服务端"剩余秒数"函数天然有多条路径吐 0(不限时 / 已超时 / 不足 1 秒 / 无回合)。
客户端只能看到一个 0, 无从区分, 会把"马上超时"误当"不限时"。

**收口办法**: 服务端限时局最低报 1 秒、绝不吐 0, `0` 从此只属于「不限时」。

**测试要两侧各钉一半**:

- 服务端侧: 对时间轴逐格扫描, 断言限时局恒不为 0
- 客户端侧: 定义域全扫, 断言 `本地秒数 < 服务端剩余秒数`(严格小于)

单守一边不够 —— 客户端的 `0 → 满额` 分支完全依赖服务端那条约定。

### 闸门三 · 只有权威数据才配触发不可逆动作

快通道的判定依赖某份状态。若那份状态可能是客户端**猜出来的**(而非服务端下发的),
就不能据此替用户做不可逆决定。

掼蛋的做法: 把"这份状态是权威的还是猜的"作为一等公民透传 ——

```ts
interface TableModelSnapshot {
  tableCombo: Combo | null;
  tableComboAuthoritative: boolean;  // ← 与数据同行
}
```

判定函数首行即闸门:

```ts
if (!m.tableComboAuthoritative) return false;  // 猜的 → 不走快通道, 让用户自己决定
```

该标记在**每条**通道上维护(增量出牌看服务端下发的牌型字段, 重连快照看快照字段),
清空点(新回合/本墩清空)一并复位。相关漏洞见
[[ERR-075__incremental-path-fixed-snapshot-path-forgotten|ERR-075]]。

## 调用次序陷阱

"当场执行"的分支是**同步内联触发副作用**。若它排在"刷新 UI 状态"之前,
后者可能把刚设好的防重锁清掉:

```ts
// ✗ 错: startTurnTimer 内可能当场提交, 随后 updateActionBar 把 pendingPlay_ 清回 false
this.startTurnTimer(); this.updateActionBarForTurn();

// ✓ 对
this.updateActionBarForTurn(); this.startTurnTimer();
```

## 可测性

快通道的秒数计算**要放在无 UI 依赖的核心包里**(掼蛋放在 `gd-client-core`),
客户端只调用不另写一份 —— 否则算法躺在 Cocos 组件里, 单测引擎加载不了, 只能靠肉眼。

计算逻辑越是"两行的 min/max", 越要用不变式扫描而非样例点验证:
样例点会恰好漏掉出事的那一格。
