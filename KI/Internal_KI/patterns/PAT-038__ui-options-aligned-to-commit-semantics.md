---
id: PAT-038
type: pattern
title: "跨层派生 UI 选项必须按「提交层实效语义」计算序与去重"
status: active
created: "2026-07-29"
trigger_condition: both
tags:
  - ki/internal
  - pattern
  - trigger/user_explicit
  - trigger/quality_audit
  - domain/guandan
  - domain/ui-data-source
complements:
  - "[[ERR-082__sf-strongest-contradicts-canbeat-on-ace|ERR-082]]"
  - "[[PAT-033__derive-on-frozen-kernel-for-free-invariants|PAT-033]]"
related:
  - Error_Book/entries/ERR-082__sf-strongest-contradicts-canbeat-on-ace.md
  - Internal_KI/patterns/PAT-033__derive-on-frozen-kernel-for-free-invariants.md
  - Internal_KI/patterns/PAT-035__negative-control-before-trusting-a-new-assertion.md
aliases:
  - PAT-038
  - commit-effective-semantics
  - ui-options-effective-key
  - 实效语义对齐
mem_ref: 019fb180-7b30-78b3-9512-d2423a053218
mem_status: linked
---

# 跨层派生 UI 选项必须按「提交层实效语义」计算序与去重

## 适用场景

UI 把一份**可选项列表**喂给玩家（点击循环、下拉、备选列表），而玩家选中后这份选项**还要经过一层会二次解释的提交层**（`classify` / `Selection` / 服务端归一化 / ORM 序列化 / 后端去重）才真正生效。

典型信号：

- 选项由某个 `generate()` / `enumerate()` / `listAll()` 的**原始枚举**直接裁剪而来
- 枚举里同一个"实体"会以**多个变体**反复出现（同一副牌的多种读法、同一记录的多个别名、同一路径的多种写法）
- 提交层对这些变体有自己的**归一化规则**（取强 / 取首个 / 去重 / 规范化）

源自 2026-07-29 掼蛋同花顺指示器（底栏四枚花色图标的点击循环数据源）。

## 核心命题

> **列表的「序」与「去重」必须按提交后的实效结果计算，不能按生成层的原始枚举直排。**
> 否则枚举变体会退化成噪声：肉眼看到 N 个选项，实际只有 M < N 种结果，中间那些点了等于没点。

生成层枚举的是**可能性**，提交层认的是**结果**。UI 站在两者中间，它的契约面是后者 —— 玩家点一下，期待的是"换一个结果"，不是"换一个内部表示"。

## 反面案例（本役实证）

同花顺指示器初版：按 `generate()` 吐出的原始 `(花色, key)` 裁剪 + 排序做点击循环。

codex 对抗向量 `level=4`，手握 `H4 S3 S4 S5 S6 S7`（`H4` 是逢人配万能牌）。`generate()` 的原始枚举：

```
key=2  {H4,S3,S4,S5,S6}   → Selection 提交后 declared key = 3
key=3  {S3,S4,S5,S6,S7}   → Selection 提交后 declared key = 3
key=3  {H4,S3,S4,S5,S6}   → Selection 提交后 declared key = 3
key=3  {H4,S3,S4,S5,S7}   → Selection 提交后 declared key = 3
key=3  {H4,S3,S4,S6,S7}   → Selection 提交后 declared key = 3
key=3  {H4,S3,S5,S6,S7}   → Selection 提交后 declared key = 3
key=3  {H4,S4,S5,S6,S7}   → Selection 提交后 declared key = 4
key=4  {H4,S4,S5,S6,S7}   → Selection 提交后 declared key = 4
```

按 key 直排去重 → 循环 `[2, 3, 4]`，看着是三档强度。但**实际提交后是 `[3, 3, 4]`**：

- **冗余组混入**：第一档 key `2` 那副牌面 `{H4,S3,S4,S5,S6}` 同时也能读成 key `3`，而 `Selection` 对同型歧义一律取强 —— 玩家点第一下和第二下，打出去的是**同一个强度**。连点两下看似换了牌，实战强度没变。
- **白扔万能牌**：这两档里 `{H4,S3,S4,S5,S6}` 用掉 1 张逢人配，`{S3,S4,S5,S6,S7}` 是 0 配的自然顺。同强度下前者纯亏一张万能牌。

## 正确姿势（已实装 `gd-rules/src/hint/straightFlush.ts`）

三步收敛，缺一不可：

### ① 按**牌面多重集**聚合，实效 key 取全部读数中最强者

同一副牌在 `generate` 里会以多个 key 反复出现（万能牌能顶哪一位，窗口就能怎么滑）。既然提交层取强，实效强度就必须取**该多重集全部读数里最强的那一个**（`effKey` / `effValue`）。

```ts
const byFaces = new Map<string, SfEntry>();          // 键 = 牌面多重集
for (const combo of generate(hand, level)) {
  if (combo.type !== 'StraightFlush') continue;
  const value = NATURAL_SEQ_VALUE[combo.key]!;       // ← 权威值表，见下方「值表分流」
  const faces = multisetKey(combo.cards);
  const prev = byFaces.get(faces);
  if (prev === undefined) byFaces.set(faces, { suit, combo, effValue: value, wild });
  else if (value > prev.effValue) { prev.combo = combo; prev.effValue = value; }
}
```

聚合即得，**不必另调 `classifyAllPossible`** —— `generate` 的全量枚举里已经含了全部读数。

### ② 同 (分组键, 实效强度) 只留**代价最小**的那个实体

同实效强度下省资源的严格占优。本例的代价维度是万能牌张数：

```ts
const slot = `${entry.suit}|${entry.effValue}`;
if (prev === undefined || entry.wild < prev.wild) best.set(slot, entry);
```

`level=4 / H4 S3S4S5S6S7` 于是收敛成 S 花色恰 2 组：`S3-S7`（eff `3`，0 配）→ `S4S5S6S7+H4`（eff `4`，1 配）。

⚠️ 此裁剪**必须按实效强度分槽分别做**，不能"同花色里存在自然组就把所有带配的都砍掉" —— 真正需要配补位的更高 key（如 `C9 CT CJ CQ + 配` 拼 9-K）会被误杀。

### ③ 按实效强度升序

排序键用 `effValue`（实效强度），不是原始 `key`。

### 附：值表分流（本例的"实效语义"具体所指）

同花顺比大小走 `NATURAL_SEQ_VALUE`（D5 序列自然序：A-2-3-4-5 最小、T-J-Q-K-A 最大、级牌在序列里不升值），**不是** `makeCardValues`。后者把 `'A'` 记 14、级牌记 15，会把最弱的 A2345 排成最强，与 `canBeat` 的实际强弱相反 —— 详见 [[ERR-082__sf-strongest-contradicts-canbeat-on-ace|ERR-082]]。

## 验证配套：把「一致性」写成全局不变量

单点用例挡不住这类缺陷 —— 它只在特定 level + 特定牌面组合下浮现。要把"UI 列表序 == 提交层实效强度"写成**每个用例都跑**的不变量断言：

```ts
// gd-oracle/test/straight-flush-indicator.test.ts — assertWellFormed
// 弱→强且严格：后一组压得过前一组，前一组压不过后一组
for (let i = 1; i < map[suit].length; i++) {
  expect(canBeat(map[suit][i]!, map[suit][i - 1]!, level)).toBe(true);
  expect(canBeat(map[suit][i - 1]!, map[suit][i]!, level)).toBe(false);
}
```

关键在**双向断言**：只断 `canBeat(后, 前) === true` 挡不住"同强度并存"（同强度时它是 false，会被抓；但若换成非严格比较就漏）；补上 `canBeat(前, 后) === false` 才真正锁死"严格递增、同强度不得并存"。**断言的裁判必须是提交层的权威函数本身**（这里是 `canBeat`），不能是 UI 层自己那份排序键 —— 用自己的尺量自己恒过。

## 反模式

| 错误做法 | 正确做法 | 关联 |
|---------|---------|------|
| UI 选项直接用 `generate()` 原始枚举裁剪 + 排序 | 先按实体（多重集）聚合出**实效结果**，再排序去重 | 本模式 ①③ |
| 按原始 `key` 去重 | 按 `effKey`（提交层归一化后的键）去重 | 本模式 ① |
| 同实效结果保留多个变体 | 只留代价最小的一个（省资源者严格占优） | 本模式 ② |
| 裁剪时不分槽，"存在更优的就砍全部" | 按实效强度分槽，槽内比代价 | 本模式 ② 的 ⚠️ |
| UI 层自造一份强弱值表 | 委托提交层的权威函数（`canBeat`） | [[PAT-033__derive-on-frozen-kernel-for-free-invariants\|PAT-033]] / [[ERR-082__sf-strongest-contradicts-canbeat-on-ace\|ERR-082]] |
| 用几个手写用例验收 | 写成全局不变量，每个用例都跑；断言的裁判用权威函数 | 本模式「验证配套」 |
| 只测一两个参数取值（level/租户/区服） | 全参数域扫 —— 本役 13 个 level 里恰有 1 个会掩盖缺陷 | [[ERR-082__sf-strongest-contradicts-canbeat-on-ace\|ERR-082]] |

## 关联

- [[ERR-082__sf-strongest-contradicts-canbeat-on-ace|ERR-082]] — 本模式所防御的下游语义：`Selection.strongest` 的取强口径与 `canBeat` 在 A 上相反（已拍板暂不修）。指示器把实效强度算在自己这一侧，因而不受害
- [[PAT-033__derive-on-frozen-kernel-for-free-invariants|PAT-033]] — 上位原则：派生模块不复刻内核判定，只对内核输出做聚合/裁剪/排序，口径天然同源永不漂移。本模式是它在「UI 选项列表」这一面的具体展开
- [[PAT-035__negative-control-before-trusting-a-new-assertion|PAT-035]] — 「验证配套」的同侧纪律：新断言上线前先确认它真能挂（本役的 `assertWellFormed` 正是被 codex 对抗向量挂过才可信）
