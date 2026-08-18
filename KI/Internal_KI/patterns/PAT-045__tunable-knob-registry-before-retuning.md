---
id: PAT-045
type: pattern
title: 可调参数注册表 —— 调参前先读表，不再全仓考古
status: active
created: "2026-08-04"
trigger_condition: user_explicit
tags:
  - ki/internal
  - pattern
  - trigger/user_explicit
  - domain/config
  - domain/testing
  - project/guandan
aliases:
  - "PAT-045"
  - "tunable-knob-registry"
  - "调参注册表"
mem_ref: "602273bc-d8ca-44b0-9337-984dfdeb2b9b"
mem_status: linked
related:
  - "Error_Book/entries/ERR-108__assertions-hardcode-a-tunable-value.md"
  - "Error_Book/entries/ERR-078__edited-one-asset-variant-assertion-covered-only-that-one.md"
  - "Internal_KI/patterns/PAT-034__server-authoritative-clock-with-local-fast-path.md"
complements:
  - "Internal_KI/patterns/PAT-035__negative-control-before-trusting-a-new-assertion.md"
---

# 可调参数注册表 —— 调参前先读表，不再全仓考古

## 问题

用户要改一个**运营口径的数字**（掼蛋出牌 20 秒改 180 秒）。数字本身一行就改完，实际却花了 20 分钟——时间全花在**找齐承载点**上：同一个语义值散落在服务端常量、客户端镜像表、prefab 静态文案、测试字面钉、契约文档五个面，漏一处就是「所见非所得」（[[ERR-078__edited-one-asset-variant-assertion-covered-only-that-one]]）。

每次调参都重新考古一遍，是这类需求的固定税。

## 做法

**给每个可调参数留一份注册表条目**，条目回答三个问题：真源在哪、还有谁镜像它、改完跑什么。

**表按需增长，不预先补全**（2026-08-04 用户定）：改到哪个参数才核那个参数、核完当场补行。理由是预先补全的成本落在「可能永远不会改的参数」上，而**没被改过的参数其承载点也无从验证**——只能靠猜，猜出来的清单是负资产。真正会被反复调的那几个，自然会在履历里浮出来。

再配一个**可 grep 的临时标记**：临时调参（测试档、灰度值）在每个承载点留同一个标记串，恢复时 `grep -rn "<标记>"` 一次列全，不必再读注册表。掼蛋 2026-08-04 用 `TEST-180S`，原值逐条写在真源文件头的恢复表里。

### 掼蛋参数注册表

仓根 `/Users/jackliu/dev/kingDian/guanDan`。「已核」= 2026-08-04 实际改动时逐一走过；「未逐一核」= 只确认了真源，镜像面未穷举，动它之前先按末尾的 grep 补齐。

| 参数 | 真源 | 其余承载点 | 复跑 |
|---|---|---|---|
| **出牌时限**（金币场/比赛场恒值） | `kds-game-gd/src/gdRule.ts` `TurnSec` | 与下一行合用同一张表 | 见下 |
| **出牌时限**（好友房三档） | `kds-game-gd/src/gdRule.ts` `PlayTimeLimitSeconds` | **已核 8 处**：① 客户端镜像表 `ccc-newkds-gd/…/WM_GD/ServerDefines/gdDefine.ts` `GDRoomSet.TimeLimits`（秒数 **+ label 文案**）② 建房 prefab `DLGZ_L/bundles/lobby_l/WMGDCreateGameLayer_l.prefab` 三枚 `tglTime{0,1,2}/lblContent` + `lblRuleSummary` ③ 对局 prefab `DLGD_L/bundles/game-gd_l/WMGDGameLayer_l.prefab` `lblRoomRule` ④ `test/roomConfig.smoke.ts` ⑤ `test/clientLogic.smoke.ts` ⑥ `test/robotFill.smoke.ts` ⑦ `test/bridge.smoke.ts` ⑧ `INTEGRATION_DIFF.md` + `WMGDCreateGameLayer_l.nodes.md` | `npm run test:all`（`kds-game-gd`）+ 客户端 tsc |
| 机器人思考延迟 | `gdRule.ts` `RobotDelayMinSec` / `MaxSec` / `StepSec` | 未逐一核。硬约束：`Max < TurnSec`、`Min > 1`、区间不含 0 | `robotfill:smoke` |
| 真人托管每手 | `gdRoom.ts:1621` 裸字面量 `return 2` | 未逐一核 | `roomconfig:smoke` |
| 「只能过」快过 | 客户端 `WMGDGameLayer_l.ts:181` `ONLY_PASS_SEC` | 未逐一核。gd-oracle `onlyPass.test.ts` 有同值 `P` | oracle 套件 |
| 快速模式盲选窗 | `gdRoom.ts:308` `QuickDoubleWindowSec`（env `GD_QUICK_DOUBLE_SEC` 可覆写） | 未逐一核 | `quick:smoke` |
| 亮级牌静默 | `gdRoom.ts:315` `QuickFlipShowSec`（env `GD_QUICK_FLIP_SEC`） | 客户端约 2.2s 自动收面板，须留冗余 | `quick:smoke` |
| 托管逃跑门禁 | `gdRoom.ts:1573` `getUserOfflineEscapeTimeout()` = 120 | 动它之前先读 [[ERR-109__base-class-gate-early-return-starves-subclass-update]] | — |
| 房间 / 全掉线超时 | `gdRoom.ts:1569-1570` `getRoomTimeout()` / `getAllOfflineTimeout()` | 未逐一核 | — |
| 结束条件档 | `gdRule.ts:132` `JuCountOptions` | 客户端 `GDRoomSet.EndConditions` + 建房 prefab `tglEnd{juCount}` 档名 | `clientlogic:smoke`、`panelnodes:assert` |
| **终局面板宽限** | `gdRoom.ts` `GDGameRoom.SettlePanelGraceSec`<br>env **`GD_SETTLE_PANEL_GRACE_SEC`**，兜底 **1.5** | 终局窗 = `SettleRevealSec + SettlePanelGraceSec`（`step_Playing` 一处）。**只保证「客户端那枚延后弹面板的定时器来得及触发」，不是观赏时长**——玩家看面板多久由 `autoLeave=false` 决定（结算同帧发的 `Game_RoundResult` 已置 false）。取值只需覆盖定时器抖动+一个 RTT；断言钉死它落在 (0,3]，调大即报红 | `settlerevealpause:assert` |
| **局末残牌公示窗** | `gdRoom.ts:336` `GDGameRoom.SettleRevealSec`<br>env **`GD_SETTLE_REVEAL_SEC`**，兜底 **5** | **已核 4 类 / 2026-08-08 逐一走过**：① 服务端**两处**按住点（`:841` 小局按住下一副发牌 / `:637` 终局按住收场）—— 断言钉「恰 2 处、且都直读同一常量」② 客户端 `WMGDGameLayer_l.ts` `HAND_REVEAL_SEC` —— **它既是配对声明，也是客户端「终局延后弹结算面板」的真实延时量**（`scheduleOnce(settlePanelPendingCb_, HAND_REVEAL_SEC)`）。⚠ 2026-08-08 第三轮起客户端**又开始自己计时了**，这与 [[ERR-112__waiting-placed-on-the-side-that-dies-first\|ERR-112]] 的禁令并不矛盾：那条禁令只在「面板与残牌同帧上屏」的前提下成立，而同帧就是把残牌盖死（经典模式实证 0 帧可见）。延后之所以安全，靠的是服务端多按 `SettlePanelGraceSec` + 客户端 `autoLeave=false`。断言强制它与服务端兜底值相等，只改一边报红③ `package.json` **11 个**驱动整场对局的脚本带 `GD_SETTLE_REVEAL_SEC=0`（**闭包判据已落盘**，不是人工名单，见 [[ERR-113__roster-assertions-fail-on-the-one-not-listed\|ERR-113]]）④ 断言期望值**从源码现读**，改参数不必改断言 | `settlerevealpause:assert`（29）+ `settlerevealpause:e2e`（16，量墙钟真间隔） |

**补齐未核参数的承载点**：`grep -rn "<常量名>" gunZi_Resource ccc-newkds-gd --include=*.ts --include=*.mjs --include=*.md`，再单独扫 prefab 的**文案面**（`grep -n "<旧值>秒" **/*.prefab`）——文案不出现在常量搜索里，恰恰最常漏。

## 判据

调参后自问：**面板显示的数字、服务端真下发的数字、断言期望的数字，三者同源吗？** 任何一个是独立写死的字面量，就是下一次 20 分钟的种子。

## 反模式

- **只改常量不改文案**：prefab 档名是另一份真源，落盘断言守着它（掼蛋 `panelnodes:assert`）。改常量不改文案 = 断言红；两边都改但不同值 = 玩家所见非所得。
- **把注册表写成「我猜有这些地方」**：未逐一核过的行必须标出来。假的完整清单比没有清单更贵——它让人跳过 grep。
- **临时调参不留标记**：恢复时只能重新考古，这次的功夫白做。

## 改动履历（改一次补一行）

履历的用处不是审计，是**数频次**：一个参数被反复调，说明它的取值本就不该焊死在代码里。

| 日期 | 参数 | 值 | 由来 |
|---|---|---|---|
| 2026-07-28 | 出牌时限 | 金币场 20s／好友房 30-20-15（取消不限时） | 用户定案 |
| 2026-07-31 | `ONLY_PASS_SEC` | 5 → 3 | 「要不起」钮定案 |
| 2026-08-04 | 出牌时限 | 全模式 → 180s（`TEST-180S` 临时档） | 测试人员边打边记录 |
| 2026-08-08 | 局末残牌公示窗 | 新增，3s | 用户：「秒开下一局，根本没时间看末家的牌」 |
| 2026-08-08 | 局末残牌公示窗 | 3 → **5s** | 用户实机：「3 秒有点短」。**同日第 2 次调**，故建表当天即按下节升级为 env |

### 第 2 次改同一个参数 = 该升级成运行期可调

再改一次就不该继续「改码 → 重编译 → 重出包 → 重部署」。升级为 env / 配置读取，运维改一次就生效，也不必再动断言。

**仓内已有先例**（照抄形状即可）：

```ts
static QuickDoubleWindowSec: number = (function () {
    let raw = Number(process.env.GD_QUICK_DOUBLE_SEC)
    return (isFinite(raw) && raw > 0) ? raw : 5
})()
```

`QuickFlipShowSec`（`GD_QUICK_FLIP_SEC`）、`RobotFillGraceMs` 同款。**`SettleRevealSec`（`GD_SETTLE_REVEAL_SEC`）是最新一例，也是唯一一个建表当天就到位的** —— 它同日被调了两次（新增 3s、用户实机后改 5s），第二次调用时旋钮已在，全程没有二次全仓考古。**改它的正确姿势：设环境变量即可，不必动代码、不必改断言、不必重出包**；只有要改「兜底默认值」时才动 `gdRoom.ts:336`，且必须同步客户端 `HAND_REVEAL_SEC`（断言强制两者相等，只改一边会报红——这条红是设计出来的，不是噪音）。要点：**兜底值仍写在代码里**，env 缺失/非法一律回落——单测能把窗口缩到毫秒级，运维能微调而不出包，两头都不牺牲。

升级后注册表那一行改记 **env 变量名 + 兜底值**，承载点随之收敛：断言不再需要跟着改。

出牌时限已达第 3 次，**下次再动它，先提议升级为 env**，别再默认走改码路径。
