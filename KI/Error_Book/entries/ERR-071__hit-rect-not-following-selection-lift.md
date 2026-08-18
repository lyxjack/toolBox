---
id: ERR-071
type: error
errorCode: ERR-071
severity: high
status: resolved
recurrence: 0
firstSeen: "2026-07-28"
tags:
  - ki/error-book
  - error
  - severity/high
  - engine/cocos
  - domain/ui-interaction
  - project/guandan
prevention:
  - "**可点选元素只要有『选中位移』(上浮/放大/偏移), 命中盒就必须取当前渲染位置, 不能停在布局基准位**。判据: 命中函数里出现 `baseX/baseY/originalPos` 这类布局态字段, 而渲染函数里对同一元素做了 `setPosition(base + delta)`, 两者就已经脱钩 —— 这是**静默**脱钩, 不报错、不崩、只在特定区域点错"
  - "**层叠顺序一旦反转, 要重新评估所有依赖 z 序的判定**。同一个『命中盒不跟随位移』的偏差: 顶张在前时表现为点空(无害), 底张在前时升级为选错张(有害) —— 因为最前面那张同时是位移最大、玩家最常点的那张。翻转 z 序的改动必须把命中判定一起复核, 不能只看渲染对不对"
  - "**UI 交互不变量用穷举探针证明, 不靠肉眼扫几眼**。把命中判定抽成纯算术(去掉 cc 依赖)后穷举状态空间: 缩放档 × 列长 × 全部 2^L 选中组合 × 逐像素采样, 断言『玩家在 y 处看到的那张 == 命中函数返回的那张』。本案 450548 个采样点跑出修复前 96822 处(21%)错判 —— 而人工点几下只会偶尔碰到, 极易误判为『没问题』"
  - "外部审查(Codex)报的 UI 交互缺陷要**先复现再修**: 本条 Codex 给的复现例是两张列的边界情形, 亲验后发现真实影响面比它举的例子大一个数量级。审查意见的价值在于指出方向, 严重度必须自己量"
ci_rules: []
mem_ref: 019fa7b1-dd43-7361-8bf9-de0826a56d46
mem_status: linked
req_ref: REQ-20260727-234602
related:
  - "Error_Book/entries/ERR-063__adversarial-review-scope-spiral-no-stopping-rule.md"
  - "Error_Book/entries/ERR-068__fault-tolerance-path-untested-happy-path-only.md"
  - "Internal_KI/patterns/PAT-033__derive-on-frozen-kernel-for-free-invariants.md"
aliases:
  - "ERR-071"
  - "hit-rect-not-following-lift"
---

# 命中盒不跟随选中位移 → 点肉眼可见的那张, 选中的却是被它压住的邻张

## 错误现象

掼蛋横版手牌改造: 同点数的牌纵向堆成一列, 需求是**最下面一张压在最上面**(效仿成熟产品),
于是把列内 z 序从「顶张在前」翻成「底张在前」——

```ts
// 翻转前: z = column*1000 + (colLen-1-row)   顶张在前
// 翻转后: z = column*1000 + row              底张在前
```

渲染完全正确, 肉眼看不出毛病。但玩家**选中一张牌后**(选中会上浮 LIFT=18),
再点它刚上浮出来的那条顶边, 切换的不是它自己, 而是**被它压在下面的那张**。

## 排查过程

命中判定与渲染位置是两条路径:

```ts
// 渲染: 选中就上浮
private renderLift(preview: boolean) {
    s.node.setPosition(s.baseX, s.baseY + (lifted ? LIFT : 0), 0)
}
// 命中: 恒用布局基准位  ← 病灶
private hitRect(s: CardSlot): Rect {
    return new Rect(s.baseX - s.hw, s.baseY - s.hh, s.hw*2, s.hh*2)
}
```

两张同列、步进 46、半牌高 73 的具体反例:

| | 底张(选中, 在前) | 顶张(未选中, 在后) |
|---|---|---|
| 渲染区间 | `[-55, 91]` (含 +18 上浮) | `[-27, 119]` |
| 命中盒 | `[-73, 73]` ← 停在旧位 | `[-27, 119]` |

点 y=80: 玩家看到的是底张(它在前且覆盖 80), 但底张命中盒到 73 就结束了 → miss;
顶张命中盒覆盖 80 → 命中顶张。**看到 A 点到 B。**

## 根因

**两条独立真源**: 布局位(`baseY`)与渲染位(`baseY + lift`)在选中态下分叉, 而命中判定挂在前者上。

更要命的是**翻转把它的后果放大了**:
- 翻转前顶张在前 —— 最前面那张的上浮偏差落在列的**上方空白区**, 表现为「点空」, 玩家会再点一次, 无感;
- 翻转后底张在前 —— 最前面那张同时是**位移最大、面积最大、玩家最常点**的那张, 它上浮让出的那条带正好被后面一张的旧盒覆盖 → 直接选错。

同一行代码, 翻转前是无害的, 翻转后是有害的。**没有任何编译期/运行期信号提示这件事。**

## 解决方案

命中盒取当前渲染位置:

```ts
private hitRect(s: CardSlot): Rect {
    const y = s.baseY + (s.selected ? LIFT : 0)   // 与 renderLift 同一口径
    return new Rect(s.baseX - s.hw, y - s.hh, s.hw*2, s.hh*2)
}
```

## 验证方式

把命中判定抽成纯算术离线复刻(不依赖 cc), 穷举状态空间逐像素采样, 断言
「玩家在 y 处**看到**的那张 == 命中函数**返回**的那张」:

- 采样面: 3 档缩放 × 1~8 张列 × 全部 `2^L` 种选中组合 × 列纵向逐像素
- **修复前: 96822 / 450548 处错判(21%)**
- **修复后: 0 / 450548**

21% 这个数字说明肉眼验证在这里是不可靠的 —— 人工点几下大概率落在正确区, 会得出「没问题」的结论。

## 关联

- [[ERR-063__adversarial-review-scope-spiral-no-stopping-rule|ERR-063]] —— 本条由 Codex 对抗式审计提出, 走三问后判定为「破坏用户明确要的核心保证(点哪张选哪张)」, 属必修那一类
- [[ERR-068__fault-tolerance-path-untested-happy-path-only|ERR-068]] —— 同族: 只验了主路径(渲染对不对), 没验交叉态(选中 × 层叠)
- [[PAT-033__derive-on-frozen-kernel-for-free-invariants|PAT-033]] —— 同一 REQ 的另一面: 纯函数层靠架在冻结内核上白嫖不变量, 而 UI 层没有这种便宜可占, 只能靠穷举探针自己造不变量
