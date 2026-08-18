---
id: ERR-075
type: error
errorCode: ERR-075
severity: high
status: resolved
recurrence: 1
firstSeen: 2026-07-28
tags:
  - ki/error-book
  - error
  - severity/high
  - domain/protocol
  - domain/reconnect
  - project/guandan
prevention:
  - "**同一份语义有『增量』与『快照』两条下行通道时, 修了增量必须回头查快照**。掼蛋 D22 万能牌歧义(同一组牌既可解成三带二又可解成炸弹)早在
    BL-004 就让增量出牌广播带上服务端权威牌型 `cardType`; 但重连快照 `tGdGameSync` 只带牌面不带牌型, 客户端重跑
    `classify` 恒取**最强解** —— 对家声明的「三带二」被读成「炸弹」"
  - "**这类漏洞的伤害面比第一眼看到的大**。最初只以为影响『自动过牌判据』, 加了道『快照回合不自动过』的防护就以为完事; 实则桌面牌一旦被读成炸弹,
    `Selection` 会判定玩家选的牌 `canPlay=false` —— **出牌钮直接置灰、提示为空,
    玩家手动也打不出去**。防护只挡住了『替玩家过牌』, 没挡住『玩家自己也出不了牌』。**治标的防护会掩盖根因, 让人误以为已修**"
  - "**判据(一眼可查)**: grep 协议定义里增量消息独有、快照消息没有的字段。凡是『服务端算出来的解释性结果』(牌型/判定/归类),
    只要客户端拿原始数据重算可能得出不同答案, 就必须两条通道都带"
  - "**重建时优先从合法解释集里选, 而不是硬造对象**。修复照抄增量路径的既有范式 `classifyAllPossible(cards,
    level).find(c => c.type === t.type && key 匹配)` —— 这样重建出的对象必然是规则引擎认可的; 若直接
    `{type, key, cards}` 拼一个, 类型对了但内部字段可能与引擎口径不符"
  - "**测试要带对照组证明洞真实存在**。新增回归用例除了验『带权威牌型 → 重建为三带二』, 还刻意抽掉该字段验『退化成炸弹且候选归零』。没有对照组,
    只能证明新代码没崩, 证明不了它修掉了什么"
ci_rules: []
mem_ref: 019faae3-1c68-76a2-9517-c8208c9479f0
mem_status: linked
related:
  - Error_Book/entries/ERR-074__client-side-irreversible-action-races-server-deadline.md
  - Error_Book/entries/ERR-068__fault-tolerance-path-untested-happy-path-only.md
  - Internal_KI/patterns/PAT-034__server-authoritative-clock-with-local-fast-path.md
  - Internal_KI/patterns/PAT-032__gameid-view-slot-vs-protocol-id.md
aliases:
  - ERR-075
  - snapshot-missing-authoritative-type
  - 重连快照漏权威牌型
---

# 增量路径修了权威牌型, 重连快照忘了 —— 玩家的牌打不出去

## 错误现象

掼蛋重连后回到自己的出牌回合, 手里明明有能压过桌面牌的组合,
但**出牌按钮置灰、点提示显示「无提示」** —— 只能过牌。

## 根因

D22(万能牌歧义): 级牌为 2 时 `H2` 是逢人配, 于是 `H2,H2,S9,H9,C9`
**既可解成三带二, 也可解成炸弹**。玩家出牌时会声明选哪种。

服务端有权威解释, 两条下行通道却只有一条带它:

| 通道 | 消息 | 带权威牌型? |
|---|---|---|
| 增量出牌 | `Game_OutCard` → `tGdOutCardNT.cardType` | ✅ BL-004 已修 |
| 重连快照 | `GS_Sync` → `tGdGameSync` | ❌ **只带 `tableCards`** |

客户端在快照路径只能拿牌面重跑 `classify`, 而 `classify` 恒取**最强解** →
对家声明的「三带二」被重建成「炸弹」→ 玩家手里更大的三带二被判成压不过。

## 一次治标的弯路

最初只从"自动过牌会误伤"这个角度看, 加了道防护:
`startTurnTimer(fromSync)` 在快照回合禁用自动过牌。

**这是治标**, 而且掩盖了根因 —— 桌面牌被读成炸弹后:

- `Selection.setTable(误读的炸弹)` → `view.canPlay = false`
- `actionBar_.setPlayEnabled(selfTurn && view.canPlay && …)` → **出牌钮置灰**
- `followCandidates` 返回空 → **提示为空**

玩家不是"被替他过牌", 而是**自己也出不了牌**。防护只堵了前者。

## 修复

三处联动补齐协议:

1. `tGdGameSync` 新增可选字段 `tableCardType?: {type, key?}`(与 `tGdOutCardNT.cardType` 同口径)
2. 服务端 `sendSync` 从 `view.tableCombo` 填充
3. 客户端 `decodeSync` 照增量路径既有范式重建:
   `classifyAllPossible(cs, level).find(c => c.type === t.type && (t.key === undefined || c.key === t.key)) ?? classify(...)`
   —— 从**合法解释集**里选, 而不是硬拼对象; 失配有回落兜底

并把"这一手牌型是权威的还是猜的"作为一等公民透传:
`TableModelSnapshot.tableComboAuthoritative`。客户端只在它为真时才敢做
不可逆决定(自动过牌), 详见 [[PAT-034__server-authoritative-clock-with-local-fast-path|PAT-034]]。

## 回归测试(带对照组)

```
① 带 tableCardType   → tableCombo.type === 'ThreeWithTwo', 候选非空, authoritative === true
② 抽掉 tableCardType → tableCombo.type === 'Bomb',         候选归零, authoritative === false
```

②就是洞本身的存在性证明。只有①的话, 无法证明这次改动修掉了什么。

## 泛化

**凡是服务端算出来的"解释性结果", 客户端拿原始数据重算可能得出不同答案的, 
增量与快照两条通道必须都带。**

典型信号: 同一份状态存在「事件流重放」与「整体快照」两种同步方式, 而某个字段
是服务端消歧/判定的产物(牌型、命中判定、归类结果、优先级裁决)。

同批次的另一条时序类教训见 [[ERR-074__client-side-irreversible-action-races-server-deadline|ERR-074]]。

**正向应用实录（2026-07-30, REQ-20260729-232009 记牌器）**：设计新特性时在源头套用本条——记牌器的已出牌计数增量靠 play 事件累加，若快照不带同源字段，断线错过的出牌永久失真（与 tableCardType 同构）。故一步到位做了 `tGdGameSync.playedRanks`（服务端从事件日志现折，事件溯源恒等背书两路必同源），并以「同一牌序：增量累加 == 快照恢复」对拍单测钉死。**本条的正确用法不是修 bug 时想起，而是每加一条增量广播就自问：快照里它的同源字段在哪。**

---

## ⚠️ 复犯 #1（2026-07-31, REQ-20260731-053000 名次徽章）— 变体：字段在，但**取值域**不同

本条 firstSeen 三天后即复犯，且**恰恰发生在一个自认为"已吃透这条教训"的场景里**。

**缺陷**：四席名次徽章 `refreshRankBadges` 判末游的分支写作

```ts
if (idx >= 0 && idx < 3) rank = idx + 1                      // 头/二/三游
else if (m && idx < 0 && m.finished.length >= 3) rank = 4    // 末游：自己不在 finished 里
```

增量路径下这是对的：三人走出时第四席**不入** `finished`，故 `idx = -1`。
但重连快照路径下，裁判核 `fillRemaining` 会把第四席**写进** `finished`（`fsm.ts:145`），
服务端原样下发、客户端原样复制 → 末席 `idx = 3` → 两个分支都不命中 → **`rank = 0`，末游徽章消失**。

**为什么本条原有的预防规则没能拦住它**：原规则的表述是「增量带的字段，快照要不要也带」——
是**字段有无**维度。本例两条路径**都带** `finished` 这个字段，差别在于同一字段的**取值域**
（增量下长度 ≤3 且自己必不在内；快照下长度可为 4 且自己可能在内）。
按原规则自查，会得出"字段两边都有，通过"的错误结论。

**规则升级（本次补入）**：

> 增量 vs 快照的一致性自查，要从「**字段在不在**」推进到「**同一字段在两条路径下的取值域/形状是否相同**」。
> 三问：① 数组长度上界一样吗？② 元素的成员资格判据一样吗（"自己会不会出现在里面"）？
> ③ 消费端的分支穷举了两条路径取值域的**并集**吗？

**为什么 typecheck 拦不住**：该文件（`WMGDGameLayer_l.ts`）不在 `kds-game-gd` 的 tsconfig 覆盖范围内；
且这是**逻辑穷举遗漏**而非类型错误，即便覆盖也不报。本类缺陷只能靠人工审读或运行期检出 ——
本次是 Codex 交叉验证**从服务端 `fillRemaining` 反向推导出可达输入**才抓到的。

**检出方式的启示**：让外部审计员**从数据的生产端反推消费端的分支覆盖**，
比让它读消费端代码找 bug 有效得多。派活时可以直接这样写要求。

---

## 家族变体 #3（2026-08-04）— 字段本就不该进快照，错在**丢掉了本可补救的权威消息**

见独立条目 [[ERR-093__authoritative-broadcast-discarded-as-redundant|ERR-093]]。

前两种变体都是"快照这一侧缺了东西"：

| 变体 | 缺口形态 |
|---|---|
| 原发 | 字段在增量里有、快照里**没有**（`tableCardType`） |
| 复犯 #1 | 字段两边**都有**，但**取值域不同**（`finished` 的长度与成员资格） |
| **#3** | 字段是**纯本地累计量**（`passesSincePlay`），本就不该进公开快照 —— 缺口在别处 |

第三种的机理不同：`applySync` 把 `passesSincePlay` 归零是**合理的**（服务端会从 `current` 重新驱动），
`tableCombo`/`tableOwner` 从快照恢复也是**必须的**。两个决定单看都对，
错在 adapter 把服务端权威的 `G_GD_JieFeng` 当"冗余"扔了 —— 那条广播本来正是这条裂缝的补救。

**自查口径因此再扩一档**：除了问「快照有没有这个字段 / 取值域一不一样」，还要问

> **本地重建依赖的中间累计量，重连后能不能自愈？不能的话，我是不是把能救它的权威消息也扔了？**

**三种变体的终局症状完全相同 —— 出牌钮该亮不亮。**
这个症状已经出现三次（2026-07-28 / 07-31 / 08-04）。
往后见到"合法的牌打不出去、提示为空"，第一反应就该是：**桌面牌状态脏了**，
去查两条同步通道，而不是先怀疑 UI。
