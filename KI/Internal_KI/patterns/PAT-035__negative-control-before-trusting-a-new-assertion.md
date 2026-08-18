---
id: PAT-035
type: pattern
title: 新断言先做反证再采信(negative control)
status: active
created: "2026-07-28"
trigger_condition: quality_audit
tags:
  - ki/internal
  - pattern
  - trigger/quality_audit
  - domain/test-design
  - project/guandan
mem_ref: 019fab4f-e4df-7c73-a412-9a6eb27617dc
mem_status: linked
related:
  - "Error_Book/entries/ERR-078__edited-one-asset-variant-assertion-covered-only-that-one.md"
  - "Error_Book/entries/ERR-076__copied-sibling-predicate-without-verifying-local-marker.md"
  - "Error_Book/entries/ERR-075__incremental-path-fixed-snapshot-path-forgotten.md"
complements:
  - "Internal_KI/patterns/PAT-034__server-authoritative-clock-with-local-fast-path.md"
aliases:
  - "PAT-035"
  - "negative-control-for-assertions"
  - "断言反证"
---

# 新断言先做反证再采信

## 问题

绿灯有两种, 肉眼分不出:

1. **断言跑了, 且真的通过** ← 想要的
2. **断言压根没跑到 / 恒真 / 扫错了目标** ← 假绿

第 2 种比没有断言更糟: 没断言时人还会手工验, 有假绿时所有人都以为已经守住了。

真实代价(同批次的三个例子):

| 假绿形态 | 后果 |
|---|---|
| 断言只扫了竖版 prefab, 横版没扫 | 277 条全绿, 玩家在主链看到旧档名([[ERR-078__edited-one-asset-variant-assertion-covered-only-that-one\|ERR-078]]) |
| 测试用错误的标记造机器人, 与实现共享同一错误前提 | 判据在真机恒 false, 测试却自洽全绿([[ERR-076__copied-sibling-predicate-without-verifying-local-marker\|ERR-076]]) |
| `followCandidates` 与 `legalResponses` 互证, 而前者本就是后者的过滤 | 断言接近恒真, 证明不了任何东西 |

## 做法

**每写一条新断言, 立刻构造一次它必须报红的输入, 确认红了再还原。**

三种常用反证手法:

### ① 篡改真源, 看断言是否报红

```
临时把档表里的「20秒」改成「20秒X」
→ 期望: 横竖两版档名断言同时报红
→ 确认后立即还原
```

这一步同时验了两件事: 断言跑到了, 且**扫的目标数量正确**(两版都红 = 两版都扫了)。

### ② 抽掉被测字段, 看是否退化(对照组)

修复"重连快照漏权威牌型"时, 除了验「带字段 → 重建为三带二」,
还刻意抽掉字段验「退化成炸弹且候选归零」。

**没有对照组, 只能证明新代码没崩, 证明不了它修掉了什么。**
对照组本身就是缺陷存在性的证明, 留在测试里还能防回归。

### ③ 全域扫描代替样例点

时序/边界类的不等式, 不要只验几个样例值:

```ts
// ✗ 漏掉 sec=1 那一格 —— 而那正是出事的格子
if (sec > 1) expect(got).toBeLessThan(sec)

// ✓ 定义域全扫
for (let sec = 1; sec <= 60; sec++) expect(onlyPassCountdownSec(sec, P)).toBeLessThan(sec)
```

## 反空转哨兵(写进断言本身)

随机采样类的断言, 要在末尾加一条"样本里确实出现过目标情形"的哨兵,
否则采样恰好没抽中时它会**静默恒真**:

```ts
let onlyPassHits = 0
for (...) { ...; if (onlyPass) onlyPassHits++ }
expect(onlyPassHits).toBeGreaterThan(0)   // ← 哨兵: 没抽中过就是空转
```

同理, 带 `continue` 跳过的循环要计数已实际检查的轮次并断言 `> 0`。

## 什么时候必须做

- 新增任何"守门人"型断言(契约一致性、双源对齐、落盘校验)
- 断言里出现**写死的目标路径**或**默认值 + 可选覆写**的形态
- 被测函数与断言引用了**同一份实现**(自证风险)
- 修完缺陷补的回归测试 —— 必须能证明它在修复前会红

## 什么时候可以省

- 断言目标是纯常量比较(`TurnSec === 20` 这类字面钉), 一眼可见不会恒真
- 已有失败记录做背书: 该断言在本次改动过程中真的红过又绿(那次红就是天然的反证)

---

## 正向应用实录 #2（2026-08-04, 接风标几何断言）

手法①（篡改真源看是否报红）的一次教科书式应用，且这次**先有缺陷、后有断言**，
所以负控同时充当了「缺陷存在性证明」。

**背景**：Codex 对抗审计指出掼蛋横版新加的接风标落在 `out_{v}` 槽心，
而同位分区制令『出牌槽 ≡ 该席闹钟位 ≡ 自家操作条位』——每次接风必撞
（详见 [[ERR-092__new-overlay-at-co-located-slot-collides-by-construction|ERR-092]]）。

**做法**：

1. 改完落点（别家外推 80 / 自家上抬 63），在 `layoutSafeBand.assert.mjs` 新增 ⑥：
   四席接风标与「可同现的可见件」逐一求 AABB 交
2. 断言绿了 **先不采信**，造 tamper 样本：把 prefab 复制一份到 scratchpad，
   脚本把四个 `jieFeng` 的 `_lpos` 全改回 `(0,0)`
3. 用 `GD_GAMELAYER_PREFAB=<tamper 路径>` 跑同一份断言

**结果**：报红 **5 项** —— 自家 `btnHint`、自家 `btnYaoBuQi`、三席表盘。
数量和身份都与审计报告指认的撞车面**逐一对上**，断言确实扫到了该扫的东西。

**这次多学到的一条**：

> 断言脚本若支持用**环境变量指定被测文件**（本例 `GD_GAMELAYER_PREFAB`），
> 负控就不必动工作区真文件 —— 复制一份改坏了跑，跑完删掉，
> **零污染、零"忘了还原"风险**。设计守门人断言时值得预留这个入口。

对比手法①原文那个"临时改档表再还原"的做法：那条依赖人记得还原，
本条把还原变成"删临时文件"，更难出错。

---

## 应用记录 #3（2026-08-04，掼蛋结算卡 / 记牌器 / 复盘查看器三批断言）

本轮一天之内写了四份落盘断言，**每一份都配了负控**，累计钉住 5 类变异：

| 断言 | 条数 | 负控做法 | 报红 |
|---|---|---|---|
| `settleCards.assert.mjs` | 46 → **52** | 角标挪回左上角 / 金标互换 / 换算表改回 `[0,1,2,3]` | **12 条** |
| 同上（Codex 追加的那一发） | — | **常量原样留着**，只把取卡改回 `settleCards_[v]` | **3 条**（原 46 条版本对此**全绿** —— 假绿实证） |
| `cardCounter.assert.mjs` | 178 → **217** | 高亮条挪末位 / 改错列 x / 改错表头色 / 删让位调用 / 让位里偷写 localStorage | 5 + 1 + 1 条 |
| `replayViewer.assert.mjs` | 179 → **274** | 折行判据退回绝对座号 / 折牌退回对半劈 | **44 条 / 16 条** |

### 本轮学到的三件新东西

1. **负控要造在"最容易蒙对"的那个点上，不是随便改一处。**
   折牌那条：27 张时「对半劈」与「填满优先」**恰好重合**（`ceil(27/2)=14`）——
   只用满手牌做负控会全绿。必须枚举 13/14/15/18/25 这几档才抓得住。

2. **负控要整目录复制，不能只拷被改的那个文件。**
   `replayViewer.assert.mjs` 的 CSS 段要读同目录 `styles.css`，
   只把 `main.js` 指过去会让那 14 条**假红**——假红和假绿一样有害，它会训练人忽略红灯。

3. **"正控绿"与"负控红"是两个独立结论，都要跑。**
   本轮有一份断言正控 46 条全绿、却守不住它本该守的缺陷（见
   [[ERR-096__assertion-pinned-to-the-wrong-quantity|ERR-096]]）。
   **绿只证明没写反，红才证明拦得住。**

相关：[[ERR-095__presentation-slot-vs-data-index-conflated|ERR-095]]（本轮两个负控针对的缺陷本体）
