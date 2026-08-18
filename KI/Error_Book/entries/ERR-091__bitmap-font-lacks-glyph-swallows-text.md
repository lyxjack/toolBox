---
id: ERR-091
type: error
errorCode: ERR-091
severity: medium
status: resolved
recurrence: 0
firstSeen: 2026-08-04
tags:
  - ki/error-book
  - error
  - severity/medium
  - domain/cocos
  - domain/art-swap
  - domain/font
  - project/guandan
prevention:
  - "**位图字(BMFont/.fnt)换装前必须先读 char 表, 再定文案口径**。`.fnt` 是逐字形烘焙的图集,
    刻了哪些码位就只有哪些码位。数字字库(记牌器/倒计时/金币这类)通常**只刻 `0-9` 与空格**,
    一个汉字都没有。把带汉字的旧文案原样喂进去, 位图字渲染既不报错也不回落系统字, 而是**静默吞字/留空洞**"
  - "**判据(一行命令)**: `grep -c '^char id=' x.fnt` 看总数, `grep '^char id=' x.fnt | grep letter=` 看实际码位。
    12 条 ≈ 只有 0-9 + 空格 + tab; 想要汉字至少几十上百条"
  - "**换装是三件套, 不是一件**: ① Sprite 底图换新;② Label 字体换位图字;③ **写字那行代码的文案口径同步改**。
    只做前两件, 界面上就是一块新底图配一个残缺数字"
  - "**tint 也要一并复位**。旧占位底板常是白色九宫被 `_color` 染成深色; 换上自带配色的美术图后
    若不把 `_color` 复位 `(255,255,255,255)`, 整块发黑 —— 与 [[ERR-084__placeholder-decorations-survive-real-asset-swap|ERR-084]] 同源"
  - "**字号由原设计图反推, 不要拍脑袋**。量原图里该数字的像素高与两位数宽, 按字库原生 size 反算:
    `fontSize = 原生size × 目标字高 / 字形高`。本例 48 × 22.5/40 ≈ 27, 落地字高 22.5 / 两位宽 32.6, 底板 42 宽, 留白与原设计一致"
ci_rules: []
mem_ref: 019fcaa4-290b-7e40-a608-c637f1b1bc39
mem_status: linked
related:
  - Error_Book/entries/ERR-084__placeholder-decorations-survive-real-asset-swap.md
  - Error_Book/entries/ERR-079__png-import-texture-type-spriteframe-missing.md
  - Internal_KI/patterns/PAT-036__art-asset-intake-to-onscreen.md
aliases:
  - ERR-091
  - bitmap-font-missing-glyph
  - 位图字吞汉字
---

# 位图字库只刻了数字, 文案里的汉字被静默吞掉

## 场景

掼蛋横版四席「剩余牌数」角标换装: 底板换成美术件 `剩余牌.png`(蓝牌背),
数字改用平台记牌器的白数字位图字 `fnt/jpqNumberL.fnt`。

## 差一点犯的错

原口径是 `ui.lblCount.string = "剩 " + n` —— 界面上显示「剩 7」。
换字体时若只改 prefab(Sprite + Label.font)不动这行代码, 结果是:

`jpqNumberL.fnt` 的 char 表:

```
chars count=11
char id=32 ... letter=" "
char id=48..57 ... letter="0".."9"
```

**只有空格与 0-9, 没有任何汉字码位。** 「剩」字无字形 →
位图字渲染**不报错、不回落系统字**, 直接吞掉那个字符。
界面上就是一块崭新的蓝牌背, 上面挂着一个来路不明的数字, 前面还空着一格。

## 根因

`.fnt` 是**逐字形烘焙**的图集: `page` 指向一张 png, 每个 `char id` 记录该码位在图集里的
矩形与偏移。渲染时按码位查表, **查不到就当作零宽字符跳过**。
这与系统字(TTF, 缺字有 fallback 链)的行为完全不同 —— 后者最差也是显示豆腐块,
至少肉眼可见"这里出问题了"; 位图字是**无声失败**。

## 修复

三件套一起做:

| # | 位置 | 改动 |
|---|---|---|
| ① | prefab `sprCountBg` | spriteFrame 换 `剩余牌.png`;type SLICED→SIMPLE;**`_color` 由 `(30,36,48,255)` 复位白**;size 118×53 → 42×47 |
| ② | prefab `lblCount` | 系统字 → `db://assets/fnt/jpqNumberL.fnt`;fontSize 22→**27**;lineHeight 26→30;居中;pos (0,2)→(0,0) |
| ③ | 代码 `refreshSeatCounts()` | `"剩 " + n` → **`String(n)`** |

并在代码注释里把这条钉死, 防止后人"为了更清楚"把前缀加回来:

> ⚠️ 该字库只刻了 0-9 与空格, 写进任何汉字都无字形 → 位图字渲染直接吞字。
> 文案只能是纯数字, 要前缀请另起一个系统字 Label。

## 字号怎么定(顺带记一笔)

不要拍脑袋。把美术原设计图(本例 `8.3补充/示意图1.png`, 恰好就是 1280×720 设计分辨率)
里那枚角标裁出来放大逐像素量:

```
底板 ≈ 41px 宽    数字「10」≈ 29px 宽 / 22.5px 高
```

按字库原生 `size=48`、字形高 40px 反算: `48 × 22.5 / 40 ≈ 27`。
落地实测字高 22.5 / 两位宽 32.6, 底板 42 宽 —— 与原设计留白一致。
先取的 30 明显偏大(字高 25 / 两位宽 36.2, 几乎顶到边框), 靠离线合成预览一眼看出来的。

## 泛化

**凡把系统字 Label 换成位图字, 先读 `.fnt` 的 char 表, 再决定文案口径。**

典型信号: 字库名里带 `number` / `num` / `sz`(数字) / `nz`, 或 `chars count` ≤ 15 —— 基本可断定纯数字库。
需要汉字就得让美术补烘焙, 或者**数字用位图字、文字另起系统字 Label**, 不要混在一条 string 里。

同批次的换装类教训见 [[ERR-084__placeholder-decorations-survive-real-asset-swap|ERR-084]](占位装饰没随真图退场)
与 [[ERR-079__png-import-texture-type-spriteframe-missing|ERR-079]](PNG 导入类型不对导致拖不上)。
