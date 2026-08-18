---
id: PAT-028
type: pattern
title: "运行时自证观测三件套：生效横幅 + 资源心跳 + 事件标记分级"
status: active
created: "2026-07-14"
trigger_condition: user_explicit
tags:
  - ki/internal
  - pattern
  - trigger/user_explicit
  - domain/observability
  - domain/operations
mem_ref: cbdc9a4e-5ecf-4249-b3c1-4751fd1f432b
mem_status: linked
related:
  - "Error_Book/entries/ERR-052__entrypoint-argparse-defaults-clobber-config-file-edits.md"
  - "Error_Book/entries/ERR-053__fd-exhaustion-accept-refusal-cumulative-collapse.md"
aliases:
  - "PAT-028"
  - "health-banner-heartbeat"
---

# 运行时自证观测三件套

## 适用场景

多开关特性系统 + 远程部署 + 非本人操作运维（团队直改文件/命令行混用）。目标：任何"开了没有/什么在累积/出没出事"都能从日志直读，不靠推断和口供。

## 三件套（gunzi_pro 定稿实现）

1. **生效横幅**（启动即打，WARNING 级必落盘）：`EFFECTIVE FLAGS | room_actor=True ... event_sequencer=True(active=True) | verbose=False ...` —— 打**运行时生效值**而非配置文件内容；派生开关附 `active=` 显示"自己开了但依赖未满足"状态；同行披露 `RLIMIT_NOFILE` 等环境上限。部署验收第一步 = grep 这一行。
2. **资源心跳**（30 秒一行 WARNING）：`[HEALTH] fds=.. rooms=.. envs=.. aio_tasks=.. pending=.. parked=.. init_q=.. bot_q=..` —— fd 曲线形状直接判定累积泄漏/瞬时挤压/上限过低；执行器队列深度直读饱和度；活跃单元数暴露"名义负载≠实际负载"（本例揭穿 100 桌名义下实际 240 并发）。
3. **事件标记分级纪律**：低频高价值的事故信号（分叉/降级/移交/回收/真丢包）一律 WARNING（静默生产模式必落盘）；高频细节流水（逐消息/逐步）一律 verbose-INFO（默认关）。判据：一小时产出超过千行的不配 WARNING。

## 实战回报

三次定案全靠它：横幅揭穿"以为开了实际全关"（[[ERR-052__entrypoint-argparse-defaults-clobber-config-file-edits|ERR-052]]）；RLIMIT 披露+fd 心跳定案句柄耗尽并在复测中自证痊愈（[[ERR-053__fd-exhaustion-accept-refusal-cumulative-collapse|ERR-053]]）；rooms 曲线揭穿测试调度器的叠加注入（名义 100 桌实为 240+）。
