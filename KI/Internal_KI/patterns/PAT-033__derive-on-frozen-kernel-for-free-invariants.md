---
id: PAT-033
type: pattern
title: "派生功能架在冻结内核之上, 白嫖正确性不变量"
status: active
created: 2026-07-28
trigger_condition: user_explicit
tags:
  - pattern
  - trigger/user_explicit
  - ki/pattern
  - domain/architecture
  - domain/verification
  - project/guandan
complements:
  - "[[PAT-023__old-new-replay-equivalence-verification|PAT-023]]"
  - "[[ERR-071__hit-rect-not-following-selection-lift|ERR-071]]"
mem_ref: 019fa7b1-dd43-7361-8bf9-de0826a56d46
mem_status: linked
req_ref: REQ-20260727-234602
related:
  - "Internal_KI/patterns/PAT-023__old-new-replay-equivalence-verification.md"
  - "Error_Book/entries/ERR-071__hit-rect-not-following-selection-lift.md"
  - "Error_Book/entries/ERR-068__fault-tolerance-path-untested-happy-path-only.md"
aliases:
  - "PAT-033"
  - "derive-on-frozen-kernel"
---

# 派生功能架在冻结内核之上, 白嫖正确性不变量

## 适用场景

要在一个已有**冻结且被测试向量覆盖**的核心之上, 加一个派生功能, 而该功能的正确性**取决于核心的语义**。

典型信号:
- 新功能要输出一组「按核心规则合法」的结果(拆解、推荐、提示、预览、校验)
- 手写一套并行实现是可行的, 但要重新处理核心已经处理过的所有边界

本案: 掼蛋「一键理牌」要把 27 张手牌拆成若干组, **每一组都必须是真能打出去的合法牌型** ——
否则理牌就是骗人的。

## 反模式(先说不该怎么做)

另起一套拆牌搜索。看起来直接, 但要**重新**处理核心早就处理过的一切:
逢人配代入、A 高低两读、同花顺归属、双副牌重复牌、天王炸、炸弹张数上限……
每一条都是新的 bug 面, 而且**没有任何机制保证产出的组是合法的** —— 只能靠再写一层校验去追。

## 模式

**不重写规则, 只做挑与拆**: 反复调用冻结内核的枚举函数, 从它的产物里选。

```ts
// 内核(冻结, 已被 96 条 Oracle 向量覆盖): 枚举该手牌所有可领出的合法牌型
generate(hand, level): Combo[]

// 派生功能: 只负责"挑哪个、拆几轮"
while (rest.length) {
    const combos = generate(rest, level)     // ← 合法性由内核负责
    const pick = pickByPriority(combos, P)   // ← 本模块只做这一件事
    out.push(pick)
    rest = removeCards(rest, pick.cards)
}
```

由此得到一条**免证明的强不变量**:

> 产出的每一组 ⊆ `generate` 的产物 ⇒ **每一组恒为合法牌型**。

不需要单独证明, 不需要额外校验层 —— 它是构造方式的直接推论。

## 关键决策点

| 决策 | 取舍 |
|---|---|
| **先量成本再定路线** | 动手前实测: 27 张手牌 `generate` 最多 2458 个组合、耗时 <2ms。**是这个数字决定了路线可行**, 不是感觉。若它是 25 万个 / 200ms, 这条路就不成立 |
| **贪心的局部最优用"多变体取优"兜** | 单趟优先级贪心会被局部最优坑。跑 12 个优先级变体各一趟, 按 (非炸弹组数 ↑, 炸弹数 ↓, 总组数 ↑) 择优。确定、无随机 ⇒ **幂等**, 重排不跳动 |
| **保留一条自检兜底** | `isValidArrangement(hand, groups)` 断言分组是原手牌的划分; 不通过就退回默认排布。宁可功能降级, 不可让玩家的牌凭空多一张少一张 |
| **语言中立** | 内核包保持零文案。中文标签(四炸/三带二…)留在客户端映射, 不污染规则层 |

## 验证方式

四条不变量, 随机 60~200 手 × 4 种级牌:

1. **划分性** —— 分组恒为原手牌的划分, 不吞牌不造牌
2. **合法性** —— 每组过 `classify`(**这条是模式的直接推论, 测试只是复核**)
3. **幂等性** —— 同手牌重复调用全等; 打乱入参顺序结果不变
4. **收益** —— 非炸弹组数 ≤ 朴素基线, 且 120 手中 >100 手严格更优; 同时 ≥ 理论下界

## 边界 / 不适用

- **只在核心真的冻结且被覆盖时成立**。核心自己有 bug 时, 这个模式会把 bug 原样放大到派生功能
- **只买到「每个结果合法」, 买不到「选得好」**。挑选策略的质量(本案的贪心)仍要独立评估
- **UI 层没有这种便宜可占** —— 同一 REQ 里手牌交互层就没有可依附的内核, 只能靠穷举探针自己造不变量, 见 [[ERR-071__hit-rect-not-following-selection-lift|ERR-071]]

## 关联

- [[PAT-023__old-new-replay-equivalence-verification|PAT-023]] —— 同族思路: 用一个已验证的参照物换取正确性。那条是**事后对拍**(新旧回放等价), 本条是**事前架构**(直接长在参照物上, 连对拍都省了)
- [[ERR-068__fault-tolerance-path-untested-happy-path-only|ERR-068]] —— 互补提醒: 本模式把「合法性」从**测试面**移到了**构造面**, 于是真正要测的只剩两样 —— 挑选策略的质量, 与**降级路径本身**。本案 `isValidArrangement` 不通过时退回默认排布这条兜底路径目前**无自动化覆盖**, 正是该条错题指出的同一种盲区(记档)
- [[ERR-071__hit-rect-not-following-selection-lift|ERR-071]] —— 同一 REQ 的反面教材: 没有内核可依附的那一层, 正是出真缺陷的那一层
