---
id: ERR-082
type: error
errorCode: BHV-002
severity: medium
status: open
recurrence: 0
firstSeen: "2026-07-29"
tags:
  - ki/error-book
  - error
  - severity/medium
  - domain/guandan
  - domain/game-rules
  - status/deferred
  - errorCode/BHV-002
prevention:
  - "同花顺（及一切 SEQUENCE_TYPES 序列牌型）的强弱比较，**唯一权威是 `NATURAL_SEQ_VALUE` / `beat.ts straightFlushBeats`**。任何新代码禁止用 `makeCardValues` 比同花顺 —— 那张表把 'A' 记 14、级牌记 15，而序列口径里 'A' 在 A-2-3-4-5 中记 1（最弱），两者在 A 上**方向相反**"
  - "写「取最强 / 排序 / 去重」这类比较逻辑时，先问：**这个牌型走哪张值表**？掼蛋有两张不可混用的值表 —— `makeCardValues`（D2 级牌升值，用于点数型）与 `NATURAL_SEQ_VALUE`（D5 序列自然序，级牌不升值，用于序列型）。`SEQUENCE_TYPES` 集合就是分界线，StraightFlush 走后者"
  - "⚠️ 本条缺陷 **2026-07-29 已拍板暂不修**（属 D22 出牌声明链冻结语义，改动面大）。看到 `Selection.strongest` 那段代码不要当成正确范本抄，也不要擅自\"顺手修掉\" —— 动它须先找用户拍板"
  - "验证同类「取强」逻辑必须**扫全 level**，不能只测一两个 level。本案在 level=2 下结果恰好正确（'2' 被升值成 15 反超 A 的 14），13 个 level 里唯独这一个把 bug 掩盖掉 —— 单点测试会得出「没问题」的结论"
ci_rules: []
mem_ref: 019fb180-7b30-78b3-9512-d2423a053218
mem_status: linked
related:
  - Internal_KI/patterns/PAT-038__ui-options-aligned-to-commit-semantics.md
  - Internal_KI/patterns/PAT-033__derive-on-frozen-kernel-for-free-invariants.md
  - Error_Book/entries/ERR-078__edited-one-asset-variant-assertion-covered-only-that-one.md
aliases:
  - ERR-082
  - sf-strongest-wrong-value-table
  - makeCardValues-vs-NATURAL_SEQ_VALUE
---

# `Selection.strongest()` 用 `makeCardValues` 排同花顺，与 `canBeat` 权威在 A 上完全相反（待拍板未修）

> **状态：`open` — 2026-07-29 拍板暂不修。** 属 D22 出牌声明链冻结语义，改动面大。本条记录用于**防止新代码沿用同一错误口径**，以及日后解冻时直接照单修复。

## 错误现象

同一副牌，两套代码给出**相反**的强弱判断：

| 位置 | 用的值表 | 'A' 的值 |
|---|---|---|
| `gd-client-core/src/selection.ts:169-178` `private strongest()` | `makeCardValues(level)` | **14**（仅次于级牌 15） |
| `gd-rules/src/beat.ts:49` `straightFlushBeats()` | `NATURAL_SEQ_VALUE` | **1**（最弱，D5 序列自然序：A-2-3-4-5 是最小的顺子） |

```ts
// selection.ts:169 —— 对 Bomb / StraightFlush 族取强
private strongest(cands: Candidate[]): Candidate {
  const values = makeCardValues(this.level);          // ← 级牌升值表，序列牌型不该用它
  const rank = (c: Candidate): number => {
    const fam = c.type === 'Bomb' || c.type === 'StraightFlush' ? 1000 : 0;
    return fam + (values[c.key] ?? 0);                // ← StraightFlush 也走了这条
  };
  ...
}
```

**实证复现**（跑真代码，非推演）：手牌 `D2 D3 D4 D5` + 万能牌 `H{level}`，逢人配既可顶 `DA` 读成 A-2-3-4-5（key `A`），也可顶 `D6` 读成 2-3-4-5-6（key `2`）。`Selection` 对同型歧义一律取强，故会挑一个 key 作为 `declared` 上行：

```
level=2   readings=A,2   Selection.primary=2   canBeat-truth=2   OK   ← 唯一被掩盖的 level
level=3   readings=A,2   Selection.primary=A   canBeat-truth=2   *** MISMATCH ***
level=4   readings=A,2   Selection.primary=A   canBeat-truth=2   *** MISMATCH ***
...
level=A   readings=A,2   Selection.primary=A   canBeat-truth=2   *** MISMATCH ***
```

**13 个 level 里 12 个错**：`Selection` 把实战**最弱**的 A-2-3-4-5 读数当成最强声明上行。

> ⚠️ **纠正一处口口相传的错误向量**：本缺陷最初被描述为 `level=2, {H2,D2,D3,D4,D5}`。实测该向量 **不复现** —— level=2 时 `makeCardValues` 把 key `'2'` 升值到 15，反超 `'A'` 的 14，结果**恰好正确**。这是全部 13 个 level 中唯一的掩盖点。有效向量须 **level ≠ 2**，例如 `level=7, {H7,D2,D3,D4,D5}`。

## 根因分析

掼蛋有**两张不可混用的值表**，`Selection.strongest` 挑错了：

| 值表 | 口径 | 适用牌型 |
|---|---|---|
| `makeCardValues(level)` | D2：2..A = 2..14，**级牌升到 15**，小王 16 大王 17 | 点数型（单张/对子/三张/炸弹…） |
| `NATURAL_SEQ_VALUE` | D5：按序列**最低位**记，`A: 1, '2': 2 … K: 13`，**级牌在序列里不升值** | 序列型（`SEQUENCE_TYPES` + StraightFlush） |

`strongest()` 把 `StraightFlush` 与 `Bomb` 合并进同一个 `fam = 1000` 分支，然后**共用 `makeCardValues`** —— 对 Bomb 这是对的，对 StraightFlush 是错的。炸弹与同花顺在"炸弹族"这一点上同类，在"用哪张值表"这一点上不同类，代码按前者归并就顺手错过了后者。

隐蔽性来源：**A 是唯一在两张表上排序方向相反的 rank**。不含 A 歧义的同花顺（绝大多数）两表结论一致，问题只在「同一副牌面既能读成 A-2-3-4-5、又能读成别的」时才浮现，而这必须有逢人配参与。

## 解决方案

**正解（解冻后照此修）**：`strongest()` 按牌型分流值表。

```ts
private strongest(cands: Candidate[]): Candidate {
  const values = makeCardValues(this.level);
  const rank = (c: Candidate): number => {
    const fam = c.type === 'Bomb' || c.type === 'StraightFlush' ? 1000 : 0;
    // 序列型（含同花顺）走自然序，与 beat.ts 同源
    const v = (c.type === 'StraightFlush' || SEQUENCE_TYPES.has(c.type))
      ? NATURAL_SEQ_VALUE[c.key] ?? 0
      : values[c.key] ?? 0;
    return fam + v;
  };
  ...
}
```

更彻底的做法是**不自己排**：把"谁更强"整个委托给 `canBeat`（唯一权威），`strongest` 退化成一次 `reduce((best, c) => canBeat(c, best, level) ? c : best)`。这样值表分流的知识只存在 `beat.ts` 一处，结构上杜绝再次漂移 —— 与 [[PAT-033__derive-on-frozen-kernel-for-free-invariants|PAT-033]]「派生模块不复刻内核判定」同构。

**本轮实际处置：不修。** 影响面仅限「含 A 歧义同花顺」的 `declared` 声明链，属 D22 出牌声明链冻结语义，改动面大，2026-07-29 拍板留待用户定夺。

**影响面边界（已确认不受害）**：同花顺指示器 `gd-rules/src/hint/straightFlush.ts` **已按 `NATURAL_SEQ_VALUE` 对齐**，其源码注释明确写了"不用 `makeCardValues` —— 那张表会把最弱的 A2345 排成最强"，且回归测试 `assertWellFormed` 用 `canBeat` 断言循环序严格递增，故指示器一侧无此缺陷。

## 预防规则

见 frontmatter。一句话：**同花顺比大小只认 `NATURAL_SEQ_VALUE`；这条 bug 已知未修，别抄它也别擅自动它。**

> CI: Tier 2 only —— 无法用静态规则覆盖。`makeCardValues` 在点数型牌型里是**正确且高频**的用法，全局 ban 必然海量误报；而窄化到"同文件同时出现 StraightFlush 与 makeCardValues"又恰好命中本条**已拍板不修**的存量代码，规则一上线就是永久红灯。防护面只能落在本条目的召回上。

发现源：codex 交叉测试（task-ms71n1qi-vy2jn0）+ opus 返修，双源独立指出。有效向量与 13-level 全扫结果为本次蒸馏时跑真代码实测所得。

## 关联

- [[PAT-038__ui-options-aligned-to-commit-semantics|PAT-038]] — 互链：同花顺指示器正是因为**知道** `Selection` 会二次解释、且知道它取强口径可能与 canBeat 不一致，才把实效强度算在自己这一侧。本条是那条模式所防御的下游语义
- [[PAT-033__derive-on-frozen-kernel-for-free-invariants|PAT-033]] — 结构性解法：比较逻辑委托给冻结内核（`canBeat`），而不是在派生层复刻一份值表
- [[ERR-078__edited-one-asset-variant-assertion-covered-only-that-one|ERR-078]] — 同族取样谬误：那条是"只改了一个变体、断言只覆盖那一个"，本条是"只测了一个 level、而那个 level 恰好是唯一掩盖 bug 的"
