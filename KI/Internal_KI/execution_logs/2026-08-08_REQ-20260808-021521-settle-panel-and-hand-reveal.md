---
id: EXEC-2026-08-08-settle-panel-and-hand-reveal
type: execution_log
req_ref: "REQ-20260808-021521"
status: pass
created: "2026-08-08"
tags:
  - ki/internal
  - execution_log
  - req-tracking
  - project/guandan
  - domain/ui
  - domain/timing
aliases:
  - "EXEC-2026-08-08-settle"
  - "结算面重做与局末残牌公示"
mem_ref: "6ddbd2ab-80cb-4bd8-95d8-fb6e764bbae9"
mem_status: linked
related:
  - "Error_Book/entries/ERR-110__identical-coords-are-not-pixel-alignment.md"
  - "Error_Book/entries/ERR-111__node-box-used-as-visual-evidence.md"
  - "Error_Book/entries/ERR-112__waiting-placed-on-the-side-that-dies-first.md"
  - "Error_Book/entries/ERR-113__roster-assertions-fail-on-the-one-not-listed.md"
  - "Error_Book/entries/ERR-102__source-edited-but-editor-never-recompiled.md"
  - "Internal_KI/patterns/PAT-046__guard-what-the-test-switch-turns-off.md"
  - "Error_Book/entries/ERR-114__measured-the-mechanism-not-the-outcome.md"
  - "Error_Book/entries/ERR-115__prohibition-lost-its-precondition.md"
  - "Internal_KI/patterns/PAT-042__static-site-incremental-deploy-hardlink-rsync-swap.md"
---

# 结算面按 8.7 定稿重做 + 局末残牌公示（REQ-20260807-222221 / REQ-20260808-021521）

## 交付了什么

**一、局末残牌公示**（REQ-20260807-222221）
一小局分出胜负时，把**所有未出完玩家**的完整剩余手牌公开 5 秒。

- 服务端 `gdRoom.foldRemainHands(settleIdx)` 从 `core.log` **现折本副**残牌，随既有 `G_GD_Settle` 的可选字段 `remainCards` 下发（不新开协议、不改规则内核、不改回放 schema）
- 客户端把残牌铺进**各家出牌位**，复用 `showCenterPlay` ⇒ 与出牌同尺寸同布局
- 5 秒由**服务端**按住：常规小局按住下一副发牌（`pumpEvents`）、整场末副按住收场（`step_Playing`）

**二、结算面按 8.7 定稿重做**（REQ-20260808-021521）
四卡 240×350、中心 y=33.5；遮罩改纯黑 50%；每卡新增头像 / 昵称 / 金币 / 倍数；单钮居中；标题栏五件全熄；头像走真实 `iconUrl`；金币三闸（`isCoinGame` + `coinBaseReady_` + `sawScoreChange_`）+ 无数据时回落升级数字模。

## 口径澄清（PM 阶段实证修正用户措辞）

用户说「显示双下和**末游**的手牌」。规则实证（`fsm.ts:135-152`）：双下时终局条件是 `fin.length===2` 立即触发，此刻**有 2 人**捏牌且必为输家整队；那两席的「三游/末游」是 `fillRemaining` 按**座位号升序**硬分的，与牌、与先后无关 ⇒ **「末游」在双下语境下是空词**。正确口径 = 所有未出完者（双下 2 人，其余 1 人）。

## 决策轨迹（三次推翻，全部由实机证伪）

| # | 决策 | 后来为何被推翻 |
|---|---|---|
| D1 | **丙案**：不造窗口，残牌与新一副叠加展示 | 实机「秒开下一局，根本没时间看」—— 服务端 `pumpEvents` 是同步 for，Settle 与 DealCards 同一 WS tick 到达 |
| D2 | **C 落点**：另起 `rootHandReveal` 独立容器 | 有了真暂停后障碍消失；用户要求「放到出牌位、和出牌一样大」⇒ 改回复用 `showCenterPlay`，整棵删除 |
| D3 | 经典模式由**客户端**把结算面板延后 5 秒 | 实机证伪：单局收场紧随结算，游戏层 <1s 就 `onDestroy`，定时器等不到 ⇒ 见 [[ERR-112__waiting-placed-on-the-side-that-dies-first\|ERR-112]] |

**共同教训**：三次都是「设计在纸面成立、在运行期不成立」，且三次都靠用户实机才发现。

## 最终测试面

| 套件 | 结果 |
|---|---|
| `settleremain:smoke` | 33（含独立 oracle = 裁判核自己的 reducer） |
| `settlecards:assert` | 52 → **222** |
| `handreveal:assert` | **98**（落点改出牌位后整体重写） |
| `artswap:assert` | **626** |
| `layoutband:assert` | 93 → 181 → **96**（⑧/⑧b 随 `rootHandReveal` 删除而作废） |
| `settlerevealpause:assert` | **29**（新增，含终局窗 ②b 段） |
| `settlerevealpause:e2e` | **16**（新增，真壳真 WS，实测静默段 5.03s / 5.02s） |
| 负控 | **89 条全部生效、0 失效**（subject 变异：副本 + 环境变量，生产文件只读 + sha256 证明） |

## Codex 交叉审计（一轮，5 条全修）

`needs-attention`。**主动交出去的最大疑点被证伪**：确定性顺序 `Settle → ScoreChange →（仅非终局）Deal`，终局无下一副冲基准 ⇒ 主路径无金币差分竞态。
真发现：①冷重连基准为零（会把整个钱包余额当本副输赢）②非金币房误把 `score` 当金币 ③`lblSettleMatch` 漏出熄灯组 ④空 url 头像陈图复用 ⑤断言空钉（`getUserInfo(chair)`→`getUserInfo(0)` 照样过）。

## ⚠ 未完成 / 待裁

1. ~~终局那一副残牌被结算面板盖住~~ —— **已修**，见下「第三轮」。（原文保留作轨迹：作者当时把它列为「待裁」，实为**必修的功能缺陷**；用户随后实测打回。把自己造成的缺陷挂成「待用户裁决」是逃避，[[ERR-114__measured-the-mechanism-not-the-outcome|ERR-114]] 记此。）
2. ~~三仓未提交、未上服~~ —— **已提交并已上测试服**，见下「第三轮·部署侧」。
3. 行为级夹具三项未做：金币三闸的语义正确性（好友房 `isCoinGame` 实证）、冷重连真机现象、`setWebTexture` 作废令牌语义。建议单立 `settleBehavior.smoke.ts`，不要继续往源码子串断言里加谓词（会退化成空钉）。
4. **四席 `sprHeadPic` 至今无任何加载代码** —— 牌桌四家显示同一张占位图，不是美术没换是没接线，与结算头像同病根同数据源，另案。

## 第三轮（08-08 晚 上服后返工）—— 陛下实测打回

**上服**：服务端 `24fc36c`、客户端 `099ccb6`+`dac0f44` 发上测试服，现网七次「公示窗→下一副发牌」实测全 5.00s，两条实现路径都跑过，`remainCards` 报文实抓。作者据此报「功能已生效」。

**陛下打两把（经典模式 68000013）：「都没有五秒间隔」。**

**真因**：那 5 秒一秒不少地过了，**全花在结算面板底下** —— 面板与残牌同帧上屏（`renderSettle` 里 `showHandReveal` 之后紧接着就是 `if (vm.episodeOver) buildSettlePanel(vm)`），面板是 1280×720 遮罩 + 四张 240×350 卡，四个出牌槽逐一落在卡盒内，`rootSettle` 绘制序 32 > `nodeOut` 24。连打过A 小局不弹面板故看着对；**经典模式每局都是终局**，残牌 0 帧可见。
⇒ 作者从未实现「5 秒后才弹结算」这一步，只实现了「服务端按住 5 秒不收场」。已立 [[ERR-114__measured-the-mechanism-not-the-outcome|ERR-114]]（量了机制没量结果）。

**「本地好用」查不出机制、未编造**：本地壳经典模式配置（`iSets[0]=16`）与平台等价，`iSets[5]` 是被明令忽略的位；构建产物与源码逐字一致。能确认的只是**这两件事从未在经典模式下合在一局里验过**。

### 修法
- 客户端：`buildSettlePanel` 延后 `HAND_REVEAL_SEC`(5s)；无残牌可亮时不空等；挂起面板可取消，取消放在 `closeSettlePanel` 的 `!root.active` 早退**之前**（延后期间 root 尚未 active）；`unschedule` 用固定成员引用 `settlePanelPendingCb_`（现造箭头函数取消不掉）。
- 服务端：终局窗 = `SettleRevealSec + SettlePanelGraceSec`(5 + 1.5)，新常量 env `GD_SETTLE_PANEL_GRACE_SEC`，已登记进 [[PAT-045__tunable-knob-registry-before-retuning|PAT-045]]。宽限只保证「面板来得及上屏」，不是观赏时长。

### 推翻了自己立的两条断言
`handreveal:assert` A9.3/A9.4 曾依 ERR-112 写「不许把面板延后」，修复时如实报红、拦住正解。未删，改写为正向约束并留推翻理由/证据/「再遇原症状的正解」⇒ [[ERR-115__prohibition-lost-its-precondition|ERR-115]]。

### 验证
`settlerevealpause:assert` 29→**45** 全绿；`handreveal:assert` 全绿；服务端 test:all 全绿（仅 `shell:smoke` 因 7810 被亲验壳占用未跑）；客户端 typecheck **40 = 基线**。
**九条变异负控条条报红**（退回同帧／延时写死字面量／取消挪到早退后／unschedule 现造引用／去掉宽限／宽限改 0 …），生产文件 sha 前后一致。
⚠ 途中踩到**假负控**：首轮用了 `GD_GAMELAYER_TS`，而 `handReveal.assert.mjs` 读的是 `GD_GAMELAYER_SRC`，变异根本没注入却返回 0 红 —— 靠「预期该红却没红」发现，已用正确变量名重跑。

### 现网确证（陛下亲验那一局）
`RoomID=125162`：日志 `终局残牌公示窗 5s + 面板宽限 1.5s = 按住收场 6.5s`；`G_GD_Settle 10:44:28.837 → GS_GameEnd 10:44:35.346` = **6.51s**。陛下反馈「没问题了」。
⚠ 作者的 `probe-fullgame` 探针这次**没能进房**（`68000013` 门槛 50000 金币，新游客号只有 20000）—— 探针无输出，不构成证据；真证据是陛下那一局的服务端日志。

### 部署侧
服务端两次换装（`build.bak-0808-1830` / `build.bak-0808-1925`），客户端两次（`public.bak-0808-1835` / `public.bak-0809-1030`）。
⚠ 第二次客户端发包时 SSH 口令认证瞬时被拒 ⇒ 硬链克隆没跑成 ⇒ rsync 失去增量基线、退化为全量上传并超时；`public` 因原子换装完好无损，重做后 speedup 42.67。教训已并入 [[PAT-042__static-site-incremental-deploy-hardlink-rsync-swap|PAT-042]]。

## 可调参数（已注册进 [[PAT-045__tunable-knob-registry-before-retuning|PAT-045]] 登记表）

用户明令：**「这个 3 秒以后十分可能改，以后我要你改的时候，你不必重新扫描所有东西。」** 兑现方式 = 登记表里那一行 + env 旋钮。

| 参数 | 真源 | 默认 | 改法 |
|---|---|---|---|
| 局末残牌公示窗 | `gdRoom.ts:336` `SettleRevealSec` | **5s** | **设 `GD_SETTLE_REVEAL_SEC=<秒>` 即可** —— 不动代码、不改断言、不重出包。只有改兜底默认值才需同步客户端 `HAND_REVEAL_SEC`（断言强制相等，只改一边报红） |

承载点全清单（服务端两处按住点 / 客户端配对声明 / 11 个需关掉它的重脚本 / 断言现读期望值）见登记表该行，**已 2026-08-08 逐一实扫核过**，不是猜的。

## 方法论侧的四条已入错题本

[[ERR-110__identical-coords-are-not-pixel-alignment|ERR-110]] 坐标相同 ≠ 像素对齐 ·
[[ERR-111__node-box-used-as-visual-evidence|ERR-111]] 拿节点框冒充视觉证据（用户被迫用眼睛做整场验收，P0 过程灾难）·
[[ERR-112__waiting-placed-on-the-side-that-dies-first|ERR-112]] 延迟放在先死的那一侧 ·
[[ERR-113__roster-assertions-fail-on-the-one-not-listed|ERR-113]] 名单型断言漏项（同日四次）·
[[PAT-046__guard-what-the-test-switch-turns-off|PAT-046]] 为跑测试关掉的功能须另立守门人 ·
[[ERR-102__source-edited-but-editor-never-recompiled|ERR-102]] 记复犯 #1（壳比源码旧 17 小时 / 旧 .ts + 新 prefab）
