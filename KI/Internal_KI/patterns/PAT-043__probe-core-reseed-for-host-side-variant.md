---
id: PAT-043
type: pattern
title: "探针核 + 同种子重建 —— 在宿主层实现新玩法而规则核零改动"
status: active
created: "2026-08-04"
trigger_condition: user_explicit
tags:
  - ki/internal
  - pattern
  - trigger/user_explicit
  - domain/game-rules
  - architecture/purity
aliases:
  - "PAT-043"
  - "probe-core-reseed"
mem_ref: "019fcf3c-5330-7da3-98d7-3bc8bd4a2146"
mem_status: "linked"
related:
  - "Error_Book/entries/ERR-104__assumption-written-as-assertion-and-hollow-pin.md"
  - "Error_Book/entries/ERR-106__same-fact-derived-in-multiple-places-forks.md"
complements:
  - "Internal_KI/patterns/PAT-041__settlement-side-effects-never-throw.md"
---

# 探针核 + 同种子重建：让宿主层实现新玩法，而纯规则核一行不改

## 适用场景

规则核是**纯函数 + 事件溯源**的（零 IO、零随机源、seed 由宿主注入），现在要加一个**依赖开局结果才能决定开局配置**的玩法变体。

本案（掼蛋「快速模式」方案C "翻牌合一"）：翻出一张明牌，**牌点即本局级牌，该牌在谁手谁先出**。矛盾在于——要先发牌才知道谁是首出、他手里有什么牌，可级牌又必须在建核时就写进配置。

## 做法

```
① 探针核: 用原 config + seed 建一个核, start() 一次
     → 取 DealEvent(hands, rngState) 与 FirstOutEvent(seat)
     → 探针核用完即弃, 不入回放存档
② 依结果决策: 从首出者手牌里滤掉大小王, 用 DealEvent.rngState 起一次
     nextInt 抽一张 → 牌点 = 本局级牌
③ 正式核: config.startLevelIndex 改成该点数, 用【同一个 seed】重新 new
```

**为什么两个核的手牌与首出必然相同**（构造保证，非巧合）：

- `initialState()` 里 `rngState = seedState(seed)`，**config 完全不进 PRNG 链**，只被存下来
- `start()` 只吃 `rngState`：先 `dealFromState` 洗牌发牌，再 `nextInt` 定首出
- 牌堆 `makeDeck()` 与级牌无关（108 张固定）

⇒ 同 seed、不同 `startLevelIndex` ⇒ **同手牌、同首出**。

## 关键约束

1. **必须先核实 config 真的不进 PRNG 链**（读 `initialState` / `deal` / `prng` 三处），而不是假设。这一条错了，整个模式垮掉。
2. **`DealEvent.rngState` 必须是"抽完首出之后"的状态**。若它记的是抽首出**之前**的状态，第 ② 步的 `nextInt` 会与定首出那次吃同一个 uint32，翻牌下标的奇偶就被首出座位锁死，级牌分布当场歪掉。这一点要去源码确认，且值得写进断言。
3. **异常全包 + 降级不掀场**：任一步失败就回落"按原 config 建核 + 无翻牌"，房间照常开局。展示件绝不允许掀掉整场对局。降级路径要与主路径**共享出口**（本案：首出座位统一从事件日志现折，主路与降级路同源 —— 否则会像 [[ERR-106__same-fact-derived-in-multiple-places-forks|ERR-106]] 那样漏改一半）。
4. **概率口径要说实话**。本案的联合分布是"先均匀选首出席(1/4)，再从该席非王牌均匀抽"，**并不等价于**"从全桌 104 张非王牌均匀翻一张"（后者会让首出席概率变成 `nSeat/104`，抓王多的席位先手概率被压低）。取舍写进代码注释：**守住首出席严格 1/4**（先手是真金白银的优势），牌点分布让位于它。别把"约等于"写成"等价"。

## 验证要点

- 大样本扫描（本案 20000 seed）：降级 0 / 翻王 0 / 越界 0；首出座位 χ² 检验均匀；级牌分布近均匀；座位×级牌独立
- 逐张断言"探针核与正式核同手牌同首出"（构造保证也要有钉子防回归）
- **边界样本单独钉**：本案翻到 A 的局（1/13）会触发一条通关规则的边界，必须挑实证过的 seed 单独跑，并带 [[ERR-104__assumption-written-as-assertion-and-hollow-pin|有效性自检]]

## 收益

规则核（`gd-rules` / `RefereeCore`）**一行未改**，新玩法完全落在宿主层。规则核的冻结纪律、事件溯源不变性、既有 2190 条一致性用例全部原样有效。
