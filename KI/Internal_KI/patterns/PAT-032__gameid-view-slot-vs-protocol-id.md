---
id: PAT-032
type: pattern
title: "gameID 双命名空间: 客户端视图槽位 vs 服务端玩法主 ID"
status: active
created: 2026-07-26
trigger_condition: user_explicit
tags:
  - pattern
  - trigger/user_explicit
  - ki/pattern
  - domain/protocol
  - engine/cocos
  - project/guandan
complements:
  - "[[ERR-070__ud-scope-overreach-deleted-shared-chain|ERR-070]]"
  - "[[ERR-002__python-modify-cocos-prefab|ERR-002]]"
mem_ref: 019fa14f-5b91-7a30-a5da-57b912f338cf
mem_status: linked
req_ref: REQ-20260726-030631
related:
  - "Error_Book/entries/ERR-070__ud-scope-overreach-deleted-shared-chain.md"
  - "Error_Book/entries/ERR-002__python-modify-cocos-prefab.md"
aliases:
  - "PAT-032"
  - "gameid-view-slot"
---

# gameID 双命名空间: 客户端视图槽位 vs 服务端玩法主 ID

## 适用场景

给一个已有玩法**加横版(或任何第二视图)**、或被问到「这个新视图要不要申请新 gameID」时。
症状化的触发词: 「横版要不要用 6」「注册表里已经有 2 了」「服务端是不是也要改号」。

## 规则 / 模式

### 判例(本平台先例, 逐行取证)

同一游戏的横版与竖版, 在**客户端**是两个「视图槽位」ID(滚子 `1`/`2`, 掼蛋 `5`/`6`);
但**上行永远只用主 ID** —— 横版滚子发出的每一个包, gameID 都是 `1`, 从来不是 `2`。

三条铁证:

1. **横版建房写死主 ID。** 横版 `CreateGameLayer_l.ts` 的 `onClickCreate` 另起 `new GameSet()` 并硬写 `gameID = 1`(甚至丢弃面板当前选中的 `curGameID_`), 与竖版 `WMGZCreateGameLayer_p.ts` 逐字相同。
2. **服务端号段另有含义。** `kds-base-define/src/GameTables.ts` 的 `gameIDS = [1,2,4,5]` 映射 `1→dlgz / 2→dlmj / 3→dlmj / 4→sysc / 5→dlgd` —— **`2` 是大连麻将**。横版若真发 2, 房间会被路由去麻将服、DB 落 `dlmj` 表。
3. **方向走独立字段。** 横竖屏靠 `toward` 告诉平台(`LogicSrsService.ts` 的 `Req.lobbyLogin({ toward })`), gameID 从不承担方向语义。

### 客户端存在三条互不相干的 gameID 通道

| 通道 | 载体 | 取值 | 谁消费 | 上不上网 |
|---|---|---|---|---|
| **A. app 级** | HTTP body 顶层 `gameID`, 由 `WebReqBase` 强塞 | `Config.gameID` 模块级 const, **无横竖屏分支** | 大厅 / 登录服(「你是哪个 app」) | ✅ |
| **B. 玩法级** | `gameData.gameID` / `GameSet.gameID` | 建房面板写入 | 大厅 → 游戏服路由 + 建房校验 | ✅ |
| **C. 视图槽位** | 场景 `ccGameDefine.gameID` | 1 / 2 / 5 / 6 | 只给 `GameDefineComponent.getGame()` 选 prefab | ❌ **纯本地** |

平台自己的仿真壳把 A/B 的区别写成了显式契约注释(`devPlatformShell.ts`):
> `★ 两个 gameID 语义不同: body.gameID = app 级 Config.gameID(reqAK 强塞), body.gameData.gameID = 本次建房的玩法 ID`

### 判定方法(唯一可靠)

> **查发包处, 不查注册表。**

注册表(场景 `GameDefine` 表 / `GameConfigDefines`)是**通道 C**, 里面的号码天然与线上无关 —— 滚子在 `GameConfigDefines` 里注册的 key 甚至是 `0`。
要判定「某个号会不会上行」, 必须落到两处:

1. **`GameSet` / `gameData` 的构造点** —— 建房面板里 `gameSet_.gameID = ?` 那一行
2. **`WebReqBase` 的三个包装器**(`req` / `reqAK` / `reqStand`) —— 它们无条件 `data.gameID = Config.gameID`

两处都不出现的号码, 就是纯本地视图槽位。

### 落地形状

- 服务端主 ID **一个字节都不动**(本案掼蛋恒 `5`: `gdVerify.ts` / `local-config.template.js` / `GameTables.ts` 全部保持)
- 客户端注册表**新增视图槽位条目**, `getGame()` 加一条与既有 `1↔2` 同构的方向分支(`5` → 横屏取 `6`)
- 常量命名与注释把「6 = 视图槽位、不是玩法 ID、禁上行」**写死在符号名里**(如 `GD_VIEW_GAME_ID_L`), 防后人误传
- 加一条防漂移断言进测试: `GD_VIEW_ID_L === 6 && GD_GAME_ID === 5`
- 回归口径: **grep 全仓确认新号无上行泄漏**(本案 Codex 交叉认证逐路径审 `gameSet` 构造 + `WebReqBase` 强塞, 背书「6 全路径无上行」)

### 反模式

| 做法 | 后果 |
|---|---|
| 「注册表里有 2, 所以横版发 2」 | 房间路由到大连麻将服, DB 落错表 |
| 「新视图=新玩法, 全线换号」 | 要改跨玩法共享的 `GameTables.ts`, 作废全部绿基线, **零收益** |
| 用 gameID 表达横竖屏 | 与 `toward` 字段职责重叠; 平台侧已有单一真相源 |
| 脚本直接改 `.scene` 补注册条目 | 违反 [[ERR-002__python-modify-cocos-prefab\|ERR-002]]; 注册表条目必须编辑器内加, 或走代码运行期幂等注册 |

## 关联

- [[ERR-070__ud-scope-overreach-deleted-shared-chain|ERR-070]] — 同案姊妹条: 那条是「同段代码服务两条链路」, 本条是「同名字段属两套命名空间」; 共同教训 = 动手前先确认自己站在哪个域里
- [[ERR-002__python-modify-cocos-prefab|ERR-002]] — 视图槽位条目落地时的硬约束: 场景注册表只能编辑器内改
- [[ERR-069__cocos-mcp-tool-quirks-collection|ERR-069]] — 本案注册表条目撞上 MCP 对象数组能力缺口(怪癖 #14), 最终走代码侧幂等注册兜底
