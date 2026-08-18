---
id: ERR-055
type: error
errorCode: ERR-055
severity: medium
status: resolved
recurrence: 0
firstSeen: "2026-07-12"
tags:
  - ki/error-book
  - error
  - severity/medium
  - domain/observability
  - language/python
prevention:
  - "序号连续性检测器的'最新号'禁止被晚到号回退：last 只取 max，否则每次真实乱序都会在下一条消息处凭空多报一条假缺口（指纹：N-N 与 N+1-N+1 成对出现）"
  - "乱序是传输常态时禁止'到达即报'：跳号先挂账，后续 K 条观测内被晚到号回填则静默销账，到期仍缺才告警——报出来的才是真丢包"
  - "验证降噪改动用双重手段：合成模糊测试（注入已知乱序+已知丢号，断言零误报全命中）+ 真实日志到达流回放（量化告警数变化）"
mem_ref: cbdc9a4e-5ecf-4249-b3c1-4751fd1f432b
mem_status: linked
related:
  - "Error_Book/entries/ERR-051__enqueue-stamp-vs-process-bump-cross-time-gate-false-kill.md"
  - "Internal_KI/patterns/PAT-027__deferred-confirmation-sequence-gap-detection.md"
aliases:
  - "ERR-055"
  - "paired-false-gap-alarms"
---

# 缺口检测双重噪音：晚到回退 last + 到达即报（12988 条告警 → 318 条）

## 错误现象

gunzi_pro eventId 上线后 `[EVENT_GAP]` 刷屏（单场 1.3 万条），几乎全部呈 `N-N` / `N+1-N+1` 成对指纹，把真丢包彻底淹没，还误导过"服务器过滤机制"方向的猜测。

## 根因

两层叠加：① 检测器把晚到号写回 last（回退），下一条正常消息即被误判跳号——每次真实乱序凭空多产一条假告警；② 相邻消息乱序到达是传输常态（实测位移深度 1、1 秒内回填），"到达即报"把定序器随手就修复的换位当丢包报出。另有建模层错误：eventId 实测按**接收位**独立自增（同一广播 recv 不同则号可同可异），按房间单流建模时三条流交错互踩全是假缺口。

## 修复

commit `67d199b` + `5119163`：流按 (房间, 接收位) 建键；last 只取 max；延迟确认（挂账 TTL=8 条观测，回填销账，到期才告警）。验证：合成模糊 3000 消息×500 换位×10 seeds 零误报、3 真丢全中；63.9 万条真实到达流回放 12988→318（-97.6%），并从降噪后残余中挖出真信号（局初 2-3 号系统性缺失=服务端占位推送）。方法沉淀见 [[PAT-027__deferred-confirmation-sequence-gap-detection|PAT-027]]。
