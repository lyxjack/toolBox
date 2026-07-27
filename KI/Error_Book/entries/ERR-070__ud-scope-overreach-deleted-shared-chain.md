---
id: ERR-070
type: error
errorCode: ERR-070
severity: high
status: resolved
recurrence: 0
firstSeen: "2026-07-26"
tags:
  - ki/error-book
  - error
  - severity/high
  - domain/requirements
  - domain/protocol
  - project/guandan
prevention:
  - "用户决策(UD)必须先钉死**适用域**再执行: 一句『效仿 X: 点场次自动配桌, 无需准备』只覆盖**场次/匹配链**, 不自动覆盖同一份代码里的好友房链。把 UD 落进 requirement_package 时要显式写出『适用链路 = A, 不适用链路 = B』, 不写就是把泛化风险留给执行者"
  - "删除跨链路共用的流程代码前, 强制枚举全部调用链并逐链回答『这条链没有它还能跑通吗』。本案 `wantReadyButton/trySitdown` 被判定为『横版无好友房语义』而整删, 而横版建房链恰恰就是好友房 —— 前提句一旦写进审计报告就再没人复核"
  - "服务端对同一玩法的两条链路可能用完全不同的入座/开局语义(好友房 userEnter 无 chairNo → 站席 10000+, 等客户端 GS_Sitdown + 全员 GS_Ready 才 RoundStart; 匹配场 seatMatch 直接入座 0..3 并 startEpisode)。判定客户端某段流程可否删除, 依据是**服务端是否还需要该上行**, 不是 UI 上还看不看得见"
  - "需求语义边界类改动的修复形状是**按房型闸门分流(isFriendRoom / groupID)**, 不是全删也不是全留 —— 全删则好友房挂死, 全留则违背 UD。闸门写在流程入口第一行, 并在两条链上各实拍验证一次"
ci_rules: []
mem_ref: 019fa14f-5b91-7a30-a5da-57b912f338cf
mem_status: linked
req_ref: REQ-20260726-030631
related:
  - "Error_Book/entries/ERR-010__blindly-copy-without-analysis.md"
  - "Error_Book/entries/ERR-031__cross-system-total-value-scope-mismatch.md"
  - "Internal_KI/patterns/PAT-032__gameid-view-slot-vs-protocol-id.md"
aliases:
  - "ERR-070"
  - "ud-scope-overreach"
---

# UD 适用域未限定 → 删掉跨链路共用的落座/准备流, 好友房恒空桌不发牌

## 错误现象

用户决策 **UD-D**:「一切逻辑效仿打滚子；点场次自动配桌（玩家/机器人），无准备/对手信息页」。

执行侧把它翻译成「**删光全部准备 + 落座代码**」: 复用审计报告 R2 §2 列出 19 处废弃面并逐条执行 ——
`readyBtn_` / `selfReady_` 字段、`wantReadyButton()` / `ensureReadyButton()` / `refreshReadyButton()` / `onReadyClicked()` / `onReady()` 全删,
`sitReqChair_` / `isSelfStanding()` / `firstFreePlayingChair()` / `trySitdown()` / `handleSitdown()` 覆写全删,
prefab 侧 `nodeQuickBtns/btnReady` 不再建。

冒烟七站全 PASS(场次链形态完全正确, UD-D 成立), 但**好友房链**在用户亲验时炸开:

- 四人恒挂**站席**(chairNo ≥ 10000), 对局座 0..3 全空
- 房间 `status` 恒 `Waiting`, 永不 `RoundStart`
- 不发牌, 桌面四席无昵称无金币
- 现象是「空桌卡死」, 没有任何异常抛出 —— 客户端只是**不再上行** `GS_Sitdown` / `GS_Ready`, 服务端就一直等

## 根因分析

**UD 的语义域被无声放大: 场次链的形态被当成了整个游戏的形态。**

服务端对同一个玩法的两条链路, 入座与开局语义**完全不同**(T4a 侦查逐行落盘):

| 环节 | 好友房链 | 场次 / 匹配链 |
|---|---|---|
| 落座 | `userEnter(loginData, userInfo)` **无 chairNo** → 落站席 10000+, **等客户端自发 `GS_Sitdown`** | `seatMatch` `userEnter(..., chairNo)` **直接入座 0..3** |
| 开局 | 满 4 人 **且全员 `GS_Ready`** → 平台 `step_Waiting` 才 `setStatus(RoundStart)` | `startEpisode` 直接 `setStatus(RoundStart)` |
| 客户端参与 | 必须走「站席 → 落座 → ready」三步 | 三步根本不存在, 代发反被 `isNewChairNoValid` / `step_Waiting` 拒绝 |

UD-D 描述的是**右列**。删除动作落在**两列共用的主层代码**上, 于是左列被连坐。

放大器有二:

1. **审计报告把错误前提写成了结论。** R2 §2 给 `wantReadyButton()` 的删除理由是「第一道闸即 `isFriendRoom`, **横版无好友房语义**」—— 而横版建房链 `WMGDCreateGameLayer_l` 建的**恰恰就是好友房**。这句前提一旦落进审计文档, 后续所有执行者都以它为地面真相, 再无人复核。
2. **冒烟矩阵与 UD 同构, 盖不住被误伤的那条链。** 七站矩阵按 UD-D 的场次链设计, 好友房链只验到「能建能进桌」, 没验「四席是否入座、是否发牌」, 于是全 PASS 掩盖了 F-4。

## 解决方案

**按房型闸门分流, 而非全删。** 回迁落座流与准备流, 在流程入口第一行加 `isFriendRoom` / `groupID` 判定:

- 好友房链 → 走「站席 → `GS_Sitdown` → 准备钮 → `GS_Ready`」完整三步(平台要求)
- 场次 / 匹配链 → 闸门直接 return, 准备钮不出现, 保持 UD-D 的「点场次即上桌」形态

两条链各实拍验证一次(好友房四席入座 + 发牌; 场次链无准备页), 才算修完。

## 预防规则

见 frontmatter。一句话: **UD 是对某条链路的判决, 不是对某段代码的判决 —— 落地前先把「适用链路 / 不适用链路」写出来, 再枚举这段代码的全部调用链。**

> CI: Tier 2 only —— 「需求语义域是否被放大」需要对照 requirement_package 与调用链拓扑做语义判断, 三种静态规则型(file-pattern-ban / code-pattern-ban / code-pattern-require)均无法表达。防护面在 PM 层的 UD 标注规范与 QA 的分链路冒烟矩阵。

## 关联

- [[ERR-010__blindly-copy-without-analysis|ERR-010]] — 同族: 把一处结论不加分析地推广到全域
- [[ERR-031__cross-system-total-value-scope-mismatch|ERR-031]] — 同族: 两个子系统的作用域被误当成同一个
- [[PAT-032__gameid-view-slot-vs-protocol-id|PAT-032]] — 同案姊妹条: 那条是「同名字段在客户端/服务端是两套命名空间」, 本条是「同段代码服务两条链路」; 共同教训 = **动手前先确认自己站在哪个域里**
- [[ERR-069__cocos-mcp-tool-quirks-collection|ERR-069]] — 同 REQ 蒸馏, 同一「表面成功掩盖真实状态」家族
