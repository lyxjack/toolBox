---
id: EXEC-2026-07-11-gunzi-congestion-relief
type: execution_log
req_ref: PLAN-002
status: pass
created: "2026-07-11"
tags:
  - ki/internal
  - execution_log
  - req-tracking
related:
  - "Error_Book/entries/ERR-048__cache-fingerprint-order-and-alias-identity.md"
  - "Internal_KI/patterns/PAT-023__old-new-replay-equivalence-verification.md"
mem_ref: cbdc9a4e-5ecf-4249-b3c1-4751fd1f432b
mem_status: linked
aliases:
  - "EXEC-2026-07-11-gunzi-congestion-relief"
  - "gunzi-congestion-relief"
---

# gunzi_pro Service/Processor 解堵塞优化执行日志

## 需求锚点

- 项目：`/Users/jackliu/dev/kingDian/gunzi_pro`（滚子卡牌 AI 机器人服务，FastAPI）
- 任务书：项目根 `prompt.md`（业务零变化 + 必须 logs 回放验证 + 交付 12 节优化报告）
- Plan 工件：`.in-process/active/congestion-relief-001/`（PLAN-002）；后续大改动 PLAN-001（actor/事务/确认制时间线）挂起待启动
- 上游文档：整理报告.md（业务语义基准）、瓶颈报告.md（堵点排名）

## 执行摘要

| 项 | 结果 |
|---|---|
| 改动 | E1 /step 入队前网关（只读 peek 去重）；E2 game.http 日志开关化；E3 processor 日志治理；E5 同步线程池 40→64；E6 env 重建指纹去重（内容+顺序+对象身份三重守卫）；E7 executor 容量旋钮 |
| 主动回滚 | E4 Condition 轮询 0.2s→1.0s——文档化时序行为属业务契约，违反"超时策略不变"，实施后整体还原 |
| 验证 | 8 房间 855 条响应新旧回放逐位一致（方法见 [[PAT-023__old-new-replay-equivalence-verification|PAT-023]]）；单测 49 passed 与基线一致；沙盒真实启动 8 房间并发 863 请求 0 异常；用户测试服验证通过 |
| 关键缺陷修复 | 指纹初版两轮加固（sorted 丢顺序语义 + 可变别名重绑分叉），沉淀为 [[ERR-048__cache-fingerprint-order-and-alias-identity|ERR-048]] |
| 交付 | 性能优化报告.md、部署说明.md、gunzi_pro_20260711_optimized.zip（1.1MB，排除 484M 日志） |
| Git | `e7c04b4` 原始基线 → `c3952f9` 优化版（首次为项目建库，双 commit 保留可 diff 历史） |

## 既有非确定性记录（非本次引入，对照实验证明）

1. 规则管线等价候选选择依赖 `PYTHONHASHSEED`（旧代码 seed 7/42 vs seed 1 自身分歧）
2. 压缩回放下 2s 去重 TTL / stash 到期墙钟竞态（旧代码自跑两遍在同两处翻转）

## 后续

- 测试服 300/500 分档压测，观测 SLOW_TASK / STEP_TIMEOUT / WAIT_TIMEOUT 对比基线（2,622 / 148 / 58）
- 启动 PLAN-001（P0：房间 actor 统一、proposal/commit 事务、确认后推进 AI 时间线）
