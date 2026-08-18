---
id: EXEC-2026-07-14-plan001-hardening
type: execution_log
req_ref: PLAN-001
status: pass
created: "2026-07-14"
tags:
  - ki/internal
  - execution_log
  - req-tracking
mem_ref: cbdc9a4e-5ecf-4249-b3c1-4751fd1f432b
mem_status: linked
related:
  - "Internal_KI/execution_logs/2026-07-12_PLAN-001_gunzi-disconnect-resilience.md"
  - "Error_Book/entries/ERR-054__non-idempotent-boundary-broadcast-copies-under-load.md"
aliases:
  - "EXEC-2026-07-14-plan001-hardening"
---

# gunzi_pro 大修加固战役：从 124762 卡死到 240 桌超载零瑕疵（2026-07-12～07-14）

续 [[2026-07-12_PLAN-001_gunzi-disconnect-resilience|PLAN-001 主战役]]。本篇覆盖收官后的三天实战加固：五轮压测、六个根因、十次提交（`5119163`→`a2d9b4b`）。

## 战役时间线

| 轮次 | 现象 | 根因 | 修复 |
|---|---|---|---|
| 124762 出牌卡死 | GameStart/报主被 stale_epoch 丢弃 | epoch 门禁跨时刻比较纯误伤（[[ERR-051__enqueue-stamp-vs-process-bump-cross-time-gate-false-kill\|ERR-051]]） | 门禁降级纯观测 `5119163` |
| EVENT_GAP 刷屏 1.3 万条 | 检测器回退+到达即报+房间单流建模（[[ERR-055__arrival-order-alarm-and-last-rewind-paired-false-gaps\|ERR-055]]） | eventId 实测=按接收位独立流 | per-recv 建键+延迟确认 `67d199b` |
| 150 桌 8 逃跑（一期） | Errno24 句柄耗尽+开关实际全关（[[ERR-052__entrypoint-argparse-defaults-clobber-config-file-edits\|ERR-052]]/[[ERR-053__fd-exhaustion-accept-refusal-cumulative-collapse\|ERR-053]]） | ulimit 默认档+run.py 覆盖配置 | 防呆三件套+心跳 `016a175`/`0c8d4db` |
| 80/100 桌第二锅系统性逃跑 | 边界广播副本不幂等三重奏（[[ERR-054__non-idempotent-boundary-broadcast-copies-under-load\|ERR-054]]） | GameStart 删 env/RoundEnd 拆 worker/泊车 O(N×M) | 四重加固 `168b467` |
| 100 桌残余单波掉线 | 局初乱序+幻影 2-3 号+泊车窗不足 | 定序器覆盖缺口（[[PAT-026__per-recipient-stream-sequencer-with-deal-reset\|PAT-026]]） | v3 局初重置+v4 幻影跳过+15s 泊车窗 `063b309`/`a2d9b4b` |

## 终局数据

最后一轮（实际并发 240 桌=名义 100 桌 × 测试调度叠加注入）：B 服务全指标零瑕疵；A 服务两小时仅一个 2 分钟波次（板子在平台批量开局的推送延迟>15s）。GS_Error 126→0、response_timeout 104→0、EVENT_GAP 万级→个位数/分钟、异常 0。判定完工，剩余优化空间归测试调度/服务端推送管线。

## 关键工作方法

- 用户的排除法推理两次扭转归因（"同时开局不崩、错峰反而崩⇒累积不是冲击"；"红线是谁定的"逼出数据依据）；
- 同事 AI 的无记录质疑逐条代码核实后基本全部属实——**对第三方结论既不轻信也不轻弃，一律代码对照**；
- 每轮修复三板斧：确定性复现脚本 → 修复 → 新旧回放逐位一致（业务零变化红线，[[PAT-023__old-new-replay-equivalence-verification|PAT-023]]）。
