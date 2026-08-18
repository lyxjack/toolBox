---
id: EXEC-2026-07-12-gunzi-disconnect-resilience
type: execution_log
req_ref: PLAN-001
status: pass
created: "2026-07-12"
tags:
  - ki/internal
  - execution_log
  - req-tracking
related:
  - "Internal_KI/execution_logs/2026-07-11_PLAN-002_gunzi-congestion-relief.md"
  - "Internal_KI/patterns/PAT-024__sandbox-proxy-transactionalization.md"
  - "Internal_KI/patterns/PAT-025__notready-parking-replaces-blocking-wait.md"
  - "Error_Book/entries/ERR-049__resend-detection-missing-server-intent-dimension.md"
  - "Error_Book/entries/ERR-050__recovery-path-swallowed-by-drop-path.md"
mem_ref: cbdc9a4e-5ecf-4249-b3c1-4751fd1f432b
mem_status: linked
aliases:
  - "EXEC-2026-07-12-gunzi-disconnect-resilience"
  - "gunzi-plan001-final"
---

# gunzi_pro 断线容灾大修（PLAN-001）执行日志——收官

## 目标与结果

业务目标：机器人出牌后链路断开不再挂死被踢（"出 H4 断链不死"），断线后可恢复。
**结果：完成并通过测试服联合测试（2026-07-12）。**

## 五阶段交付（三特性开关，默认全关=已验证基线）

| Phase | 内容 | 开关 |
|---|---|---|
| 0 | eventId 解析 + TableState state_version（纯附加） | — |
| 1 | 房间 actor 统一（[[PAT-025__notready-parking-replaces-blocking-wait\|PAT-025]] 泊车替代 Condition）+ epoch 门禁 + 局/锅终清理 | --room-actor |
| 2 | 五类初始化事务（[[PAT-024__sandbox-proxy-transactionalization\|PAT-024]] 沙箱代理，策略零改动）+ 确认矩阵 | --proposal-commit |
| 3 | 出牌重放缓存 + OutCard 回执消费 + 分叉检测 + eventId 缺口传感器 | --confirmed-timeline |
| 4 | 降级自愈：分叉 → 本局静默 → 下局自动恢复（服务端确认无重连快照，降级为主路径） | 同上 |

## 联合测试实录（测试服 /gunai/jack/gunzi_pro_deploy）

- 阶段1 基线（全关）三局正常；阶段2 全开真实对局（含扣底/扣王/进贡）零告警；
- 阶段3 断链 25 秒（SIGSTOP）：服务器代打 [5,'H']，本地 proposal 为 [8,'H']×2 →
  `[DIVERGENT]` 精确检测 → `[DEGRADED]` 本局静默 → **下局恢复正常出牌（游戏内确认）**。
- 4 秒短冻结无任何影响（TCP 缓冲，消息延迟非丢失——SIGSTOP 实验设计须超过对端耐心阈值）。

## 关键协议知识（实测归档）

1. **服务器对超时机器人会代打**——短断链走重问/重放路径，长断链走代打/分叉/降级路径；
2. OutCard 广播=出牌回执（现有协议零改动）；单机器人房间回执也会推送；
3. 无重连快照 → 局中恢复不可行，降级自愈是正确上限；
4. eventId 定稿：按局重置、每推送 +1、(juCount, eventId) 联合唯一，机器人侧已就位待服务端上线。

## 过程缺陷（均被验证体系拦截后修复）

[[ERR-049__resend-detection-missing-server-intent-dimension|ERR-049]] 赢墩连出误判重发；[[ERR-050__recovery-path-swallowed-by-drop-path|ERR-050]] 网关去重吞重放；另有 proposal key 版本漂移与 cards_out 键名不一致（单测拦截，见 commit 记录）。

## 资产

19 commits（`a316dea`..`f73d4ed`）；83 单测；端到端桩测 20 项；《大修交付文档.md》；
上游：[[2026-07-11_PLAN-002_gunzi-congestion-relief|解堵塞执行日志]]。
余项：生产 300/500 灰度压测；eventId 上线自动激活缺口检测。
