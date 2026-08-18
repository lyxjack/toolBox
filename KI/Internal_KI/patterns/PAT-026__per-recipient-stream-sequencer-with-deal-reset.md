---
id: PAT-026
type: pattern
title: "按接收位流定序器：从协议约定到实测口径的四轮演进（v1→v4）"
status: active
created: "2026-07-14"
trigger_condition: user_explicit
tags:
  - ki/internal
  - pattern
  - trigger/user_explicit
  - domain/protocol
  - language/python
mem_ref: cbdc9a4e-5ecf-4249-b3c1-4751fd1f432b
mem_status: linked
related:
  - "Internal_KI/patterns/PAT-025__notready-parking-replaces-blocking-wait.md"
  - "Error_Book/entries/ERR-055__arrival-order-alarm-and-last-rewind-paired-false-gaps.md"
aliases:
  - "PAT-026"
  - "event-sequencer-evolution"
---

# 按接收位流定序器：协议实测驱动的四轮演进

## 适用场景

服务端为推送消息加了序号（eventId 类），客户端要把"猜谜式条件等待"升级为"按号定序处理"——乱序消息入队前重排，前置天然先于依赖被处理，谓词等待降级为真丢包安全网。

## 核心结构（gunzi_pro `RoomEventSequencer`，v4 定稿）

暂扣队列 + 期望号推进：`eid==expected` 放行并排空连续段；`eid>expected` 暂扣（洞超时 3 秒兜底放行+精确告警缺号区间）；`eid<expected` 旧号透传交内容级防线。**四条实测驱动的修正规则**：

1. **流按 (房间, 接收位) 建键**——协议约定说"(juCount,eventId) 房间内联合唯一"，实测同一广播 recv=lord_up 是 110、recv=lord 是 112：每个接收位一条独立自增流。**协议口径以实测日志为准，约定文本只是假设**。
2. **局初重置识别（v3）**——每局编号从 1 重编且多数消息不带 juCount：收到 `eid≤6 且落后期望≥30` 判定新局，期望重置为 1——抢跑到 GameStart(1 号) 前面的报主 Turn(2/3 号) 被暂扣等它。juCount 彻底退出定序（靠它判边界既漏又误：ju 有/无交替会误触发重置）。
3. **局头幻影段跳过（v4）**——实测每局 2-3 号是服务端编号但从不转发的占位推送（600/600 恒缺、零回填）：期望停在 2/3 且无暂扣时，4/5 号直接放行，不为幻影白等 3 秒（恰在开局关键路径，同步开局潮下 3 秒×百流是雪上加霜）。
4. **洞超时盖过实测乱序深度**——初版 1 秒被实测 1.2-2.5 秒的 init/step 交错击穿（提前放行照样踩坑）；3 秒仍远小于服务器 ~20 秒代打耐心。

## 关键教训

每一轮演进都由压测日志的具体指纹驱动（110/112 同刻异号 → per-recv；WAIT TIMEOUT 全是 turn=1 → 局初缺口；EVENT_HOLE 600 次全是 1-3/2-3 → 幻影段）。**定序器的正确形态不可能设计出来，只能实测出来**。配套：泊车机制 [[PAT-025__notready-parking-replaces-blocking-wait|PAT-025]]，检测器降噪 [[ERR-055__arrival-order-alarm-and-last-rewind-paired-false-gaps|ERR-055]]。
