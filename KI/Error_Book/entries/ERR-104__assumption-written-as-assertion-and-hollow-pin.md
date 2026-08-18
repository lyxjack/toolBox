---
id: ERR-104
type: error
errorCode: "EVD-005"
severity: "high"
status: "resolved"
recurrence: 0
firstSeen: "2026-08-04"
tags:
  - "error/high"
  - "testing/assertion"
  - "domain/rules"
  - "project/guandan"
  - "errorCode/EVD-005"
  - ki/error-book
prevention: "断言注释里写「必然 / 不可能 / 恒」就是**把假设当断言**——单一样本恰好不踩边界，它就永远绿。回归钉必须自带**有效性自检**：先断言「本样本确实踩中了该缺陷场景」，不成立就报红提示换样本，否则防线会静默退化成恒真"
leading_word: "hollow"
aliases:
  - "ERR-104"
  - "assumption-written-as-assertion-and-hollow-pin"
mem_ref: "019fcf3c-5330-7da3-98d7-3bc8bd4a2146"
mem_status: "linked"
related:
  - "Error_Book/entries/ERR-096__assertion-pinned-to-the-wrong-quantity.md"
  - "Error_Book/entries/ERR-102__source-edited-but-editor-never-recompiled.md"
---

# 「单局赢方必升级，不可能平」——把假设写进断言，于是它永远是绿的

## 错误现象

掼蛋快速模式（单局制）冒烟里有这么一条，长期全绿：

```ts
check("Settle 带 matchWinnerTeam(0/1; 单局赢方必升级, 不可能平)",
    st != null && (st.matchWinnerTeam === 0 || st.matchWinnerTeam === 1))
```

对抗审计实测：**约 1.9% 的局会判平局**，而且判平的同时**金币照按本副胜方发** —— 玩家赢了、钱进了、面板却告诉他"整场平局"，战绩记 Draw。

## 根因

**注释里那句"不可能平"是假设，不是结论，而且假设本身是错的。**

单局制下胜方至多升 3 档，级差看似恒 > 0 —— 除非**本局起打级牌就是 A**（方案C 翻牌翻到 A，概率 1/13）：此时两队起始级牌同为 A，而 D11 规定 1-4 收局不通关 A，胜方升不上去 → 终局两队仍同为 A → 按级差 tie-break 返 -1（平局）。

而冒烟只跑单一 seed（`SEED = 20260803`），**那个 seed 恰好没翻到 A**。于是这条断言从落地起就没验过它自称在验的那件事。

## 为什么自查没抓到

1. **断言写成了它自己的注释**：先有"应该不会平"的直觉，再把直觉写成断言，中间没有任何一步去证伪。
2. **单样本 × 概率性分支** = 结构性盲区。1/13 的分支在单 seed 下有 92% 的概率不出现，"绿"因此毫无信息量。
3. 另一处扫描（200 seed）只覆盖建核算法，**从没跑到收场**，看似有覆盖实则不相干。

## 解决方案

修法（服务端）：单局制的整场胜方 ≡ 本副胜方，绕开级差 tie-break（那是给"打满 N 副"设计的）。

回归钉的写法 —— **关键在第一条**：

```ts
for (const s of [19, 33, 37, 249]) {          // 实证过会翻到 A 的 seed
    const A = await runQuickMatch(s, {...})
    // ① 有效性自检：样本必须真的踩中缺陷场景, 否则本组断言恒真 = 空钉
    check(`seed ${s}: 样本确实翻到 A(钉子有效性自检)`,
        rankChar(A.d.quickFlip.card) === "A")
    // ② 真正要钉的性质
    check(`★ seed ${s} 翻到 A: 整场胜方仍是 0/1, **绝不判平**`, ...)
    check(`★ seed ${s} 翻到 A: 整场胜方 ≡ 本副胜方(金币与面板同口径)`, ...)
}
```

同一手法也用在另一条上：先取当前 seed 的**真级牌**，断言它 ≠ 占位值，再去断言"下发的是占位值" —— 万一哪天真级牌恰好等于占位值，**这条自检会先红并提示换 seed**，而不是让防线静默失效。

## 预防规则

1. **断言注释里出现「必然 / 不可能 / 恒 / 一定」= 危险信号**。这些词是在陈述假设。要么去证伪它并把反例写成用例，要么把话改成可验证的口径。
2. **回归钉必须自带有效性自检**：一条钉子要能回答"我此刻真的处在我要防的那个场景里吗"。答不上来的钉子，在样本漂移后会静默退化成恒真 —— **绿得毫无意义，比没有更坏**（它让人以为守住了）。
3. **概率性分支不能用单样本验**。1/13 的边界要么挑实证过的样本集合跑，要么扫描 + 断言分布，别指望一个 seed 替你走遍所有分支。
4. 补钉时**先让它红**（在修复前跑一遍确认能抓到），再去修 —— 没红过的钉子不知道自己钉没钉住。

## 关联

- [[ERR-096__assertion-pinned-to-the-wrong-quantity|ERR-096]] —— **同族**：那次是断言钉在自己不掌控的量上（自适应尺寸），本条是断言钉在自己没验证过的假设上。两者都表现为"断言在场但不起作用"。
- [[ERR-102__source-edited-but-editor-never-recompiled|ERR-102]] —— 同一批次的另一条：验证取错观测面。三条合起来是一句话：**绿灯必须有信息量**。
