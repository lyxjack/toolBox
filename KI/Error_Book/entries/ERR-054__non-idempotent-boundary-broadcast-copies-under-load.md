---
id: ERR-054
type: error
errorCode: ERR-054
severity: critical
status: resolved
recurrence: 0
firstSeen: "2026-07-13"
tags:
  - ki/error-book
  - error
  - severity/critical
  - domain/concurrency
  - language/python
prevention:
  - "广播协议下每个生命周期边界处理器（开局/收局/拆房）必须按 (实体, 代际键) 幂等：副本各做一遍破坏性操作（删状态/清缓存/拆 worker）在低载时窗口极小看似无害，负载把副本到达时间拉开后必然互踩"
  - "收摊/清理路径禁止无差别丢弃队列存量：排在边界消息后面的可能是下一代的开局消息，应移交继任者，真垃圾由内容级防线在新处理域照旧丢弃"
  - "重评估/重试类机制要算放大系数：每消息全量重跑所有等待项 = O(消息×等待项) 任务风暴，波峰下超线性恶化（50 单元稳、80 崩的指纹）；节流+补偿哨兵保语义"
  - "破坏性操作若顺带清掉'防重复劳动'的去重指纹，等于在最危险的时刻关闭去重——审查每个清理项的连带效应"
mem_ref: cbdc9a4e-5ecf-4249-b3c1-4751fd1f432b
mem_status: linked
related:
  - "Error_Book/entries/ERR-051__enqueue-stamp-vs-process-bump-cross-time-gate-false-kill.md"
  - "Internal_KI/patterns/PAT-008__mongo-duplicate-key-driven-idempotency.md"
aliases:
  - "ERR-054"
  - "boundary-copies-stampede"
---

# 锅/局边界广播副本不幂等：50 桌稳定、80/100 桌第二锅系统性崩溃

## 错误现象

gunzi_pro 压测：50 桌稳定 2 小时；80/100 桌从第二锅起系统性大规模逃跑（日志全关、ulimit 已提，排除资源上限）。服务整体不冻（全程 500-900 行/秒处理中），但十几个房间各自饿死 60-90 秒。

## 根因

同时开局 → 打牌节奏相近 → 边界成波次到达，三种"重复劳动"在波峰叠加拖垮 32 线程 INIT 池：① GameStart 每份广播副本都执行破坏性前奏（bump epoch/删 env/清重建指纹）——晚到副本删掉刚建好的新局 env，指纹一清使 env 重建去重失效，同房间反复整建（日志实录 `EPOCH_LAG stamp=12 now=14` 副本互踩）；② RoundEnd 每份副本都拆一次 worker，夹在副本间的新锅开局消息被收摊无差别 101 清掉 → 前置缺失 → 泊车超时僵尸座位；③ 泊车重评估每条消息全量重跑所有泊车项，O(消息×泊车) 任务风暴。同事 AI 的五条边界质疑经代码逐条核实基本全部属实（含被用户质疑的部分——测试平台房间复用使"拆房后"竞态真实存在）。

## 修复

commit `168b467` 四重加固：GameStart 破坏性前奏按 (房间, juCount) 只做一次；RoundEnd 收摊 10 秒幂等窗；收摊时队列/定序暂扣中的非边界消息移交新 worker（`[ROUND_END_HANDOFF]`）；泊车重评估 0.1s 节流+经邮箱回串行域的补偿哨兵。复测 GS_Error 126→0、response_timeout 104→0。幂等设计同族 [[PAT-008__mongo-duplicate-key-driven-idempotency|PAT-008]]；上游门禁教训 [[ERR-051__enqueue-stamp-vs-process-bump-cross-time-gate-false-kill|ERR-051]]。
