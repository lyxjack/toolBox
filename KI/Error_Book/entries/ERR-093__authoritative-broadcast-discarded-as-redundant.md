---
id: ERR-093
type: error
errorCode: ERR-093
severity: high
status: resolved
recurrence: 0
firstSeen: 2026-08-04
tags:
  - ki/error-book
  - error
  - severity/high
  - domain/protocol
  - domain/reconnect
  - domain/client-model
  - project/guandan
prevention:
  - "**『客户端本地能重建, 所以这条权威广播是冗余的』—— 这个推理只在快照完备时成立**。
    本地重建往往依赖某个**中间累计量**(计数器/游标/累加状态), 而这类量通常不进公开快照。
    只要存在一条 `applySync` 会把它清零/重置的路径, 重建就永远够不到触发阈值, 而被丢弃的
    权威广播本可以救场 —— 结果是裂缝**永久化**, 不会自愈"
  - "**判据(grep 就能查)**: 在协议 adapter 里搜 `return []` 与『redundant / 冗余 / 本地可重建』这类注释。
    每命中一处, 反问三件事: ① 本地重建依赖哪些状态? ② 这些状态全在快照里吗?
    ③ 若不在, 重连正好卡在重建的中途会怎样?"
  - "**正确姿势是幂等归并, 不是二选一**。既不要『只信本地重建』(有裂缝), 也不要『只信广播』
    (会与本地级联重复发事件)。让权威消息走一个幂等函数: 常路上检测到本地已处理完 → 早退不发事件;
    裂缝路上以服务端为准补清状态并补发渲染事件, 顺序与常路一致, 渲染层无需特判"
  - "**回归测试必须先复现裂缝态再验修复**。测试里显式断言『重连+最后一次 pass 之后, 本地清墩**没有**触发、
    tableCombo **仍然**非空』—— 这一步就是缺陷的存在性证明; 再验权威消息把它补回来。
    只验修复后的绿, 证明不了修掉了什么(同 [[PAT-035__negative-control-before-trusting-a-new-assertion|PAT-035]])"
  - "**这类缺陷的症状会伪装成 UI bug**。本例表面是『新加的接风标不亮』, 实则桌面牌型残留 →
    `Selection` 按跟牌过滤 → **合法领出被本地判死、出牌钮恒灰** —— 与 [[ERR-075__incremental-path-fixed-snapshot-path-forgotten|ERR-075]]
    的终局症状一模一样。看到『出牌钮该亮不亮』, 先查桌面牌状态是不是脏的"
ci_rules:
  - "gd-monorepo: npx vitest run packages/gd-oracle/test/client-core.test.ts — applyJieFeng 两条回归"
mem_ref: 019fcaa4-290b-7e40-a608-c637f1b1bc39
mem_status: linked
related:
  - Error_Book/entries/ERR-075__incremental-path-fixed-snapshot-path-forgotten.md
  - Error_Book/entries/ERR-074__client-side-irreversible-action-races-server-deadline.md
  - Internal_KI/patterns/PAT-034__server-authoritative-clock-with-local-fast-path.md
  - Internal_KI/patterns/PAT-035__negative-control-before-trusting-a-new-assertion.md
aliases:
  - ERR-093
  - authoritative-broadcast-discarded
  - 权威广播被当冗余丢弃
---

# 把权威广播当"冗余"丢弃 —— 本地重建所依赖的计数不在快照里, 裂缝永不自愈

## 现象

墩中重连之后, 接风者(拿到自由领出权的那家)**出牌按钮恒灰**, 合法的领出打不出去,
一直挂到超时被托管接管。附带症状: 新做的接风艺术字标不亮。

## 根因链(四环)

```
① applySync: passesSincePlay = 0        ← 快照不带这个累计量, 只能重置
② applySync: tableCombo / tableOwner    ← 却是从快照如实恢复的(必须, 否则不知道要压什么)
③ 于是「走出者赢墩、余家依次过」这一墩若在中途重连,
   客户端只数得到重连之后那几次 pass → passesToClear 永远够不着 → 本地清墩级联不触发
④ 服务端此刻发的权威 G_GD_JieFeng 又被 adapter 直接扔掉(`return []`)
```

结果 `tableCombo` 就这么永久挂着。接风者本是**自由领出**, 客户端却当成**跟牌回合** ——
`Selection.playableCandidates()` 按 `canBeat(c.combo, table)` 过滤, 合法领出全被滤光, 出牌钮恒灰。

被丢弃的那行代码, 连注释都写得理直气壮:

```ts
case GDMsg.JieFeng:
  // 接风 is reconstructed inside applyPass' trick-clear cascade; the explicit
  // broadcast is redundant with the incremental model.
  return [];
```

**这句话在常路上完全正确 —— 错在它把"常路"当成了"所有路"。**

## 修复: 幂等归并

新增 `TableModel.applyJieFeng(winner, leader)`:

```ts
// 常路: 级联已清干净 → 幂等忽略(重复广播/乱序到达都安全)
if (this.tableOwner === null && this.tableCombo === null && this.current === leader) return [];
// 裂缝路: 以服务端为准补清
this.tableCombo = null; this.tableComboAuthoritative = false; this.tableOwner = null;
this.passesSincePlay = 0; this.current = leader;
return [{ kind: 'trick-clear', leader, jiefeng: true }, { kind: 'jiefeng', winner, leader }];
```

adapter 那一格改为调它。**渲染层零改动** —— 补发的事件顺序与常路一致。

## 回归测试(先复现裂缝, 再验修复)

```
① applySync(handSizes=[0,5,6,7], tableOwner=0, tableCombo=对K) → applyPass(3)
   断言: 没有 trick-clear、tableCombo 仍非空、current ≠ 2   ← 裂缝的存在性证明
② applyJieFeng(0, 2)
   断言: 事件 = [trick-clear, jiefeng]、tableCombo 清空、current === 2
③ 常路幂等: 正常级联清完墩之后再喂一次 applyJieFeng → 返回 []
```

全量 274 项通过, 含整局重建保真 11468 步 0 失配(证明常路未被扰动)。

## 泛化

**双源(服务端权威广播 + 客户端可本地重建)的取舍不是二选一, 是幂等归并。**

自查清单 —— 每处"这条消息是冗余的, 不处理"的判断, 都要过一遍:

| # | 问题 |
|---|---|
| ① | 本地重建依赖哪些**中间状态**?(计数器、游标、累加量、"已收到几次 X") |
| ② | 这些状态在**快照/重连**路径上会被保留还是重置? |
| ③ | 如果重置, 重连正好卡在重建的**中途**会怎样? 状态能自愈吗? |
| ④ | 能不能改成幂等归并 —— 常路早退、裂缝路补齐? |

本条与 [[ERR-075__incremental-path-fixed-snapshot-path-forgotten|ERR-075]] 是同一家族的**第三种变体**:

- ERR-075 原发: 字段在增量里有、快照里**没有**(tableCardType)
- ERR-075 复犯 #1: 字段两边**都有**, 但**取值域不同**(finished 的长度与成员资格)
- **本条**: 字段本就不该进快照(纯本地累计量), 错在**丢掉了本可补救的权威消息**

三者终局症状完全相同 —— **出牌钮该亮不亮**。这个症状已经出现三次, 见到它先查桌面牌状态。
