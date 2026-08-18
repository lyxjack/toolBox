---
id: ERR-053
type: error
errorCode: ERR-053
severity: critical
status: resolved
recurrence: 0
firstSeen: "2026-07-13"
tags:
  - ki/error-book
  - error
  - severity/critical
  - domain/capacity
  - platform/linux
prevention:
  - "网络服务压测/上线前必查 RLIMIT_NOFILE（默认 1024 对数百并发连接是自杀），ulimit -n 65535 起步，并在启动日志披露实际拿到的值"
  - "'启动正常、从某时间点开始系统性故障'的指纹 = 累积型资源耗尽，不是瞬时冲击：同步开局的最大瞬时压力都扛住而错峰阶段崩溃，即可排除突发论证成累积论（用户的排除法推理）"
  - "全量日志（每消息落盘）是单房间排障工具，规模压测下是自杀性负载放大器——生产/压测用 WARNING 级静默口径"
  - "给长跑服务装资源心跳（fd 数/队列深度/活跃单元数，WARNING 级定期落盘）：曲线形状直接判定泄漏 vs 突增 vs 上限过低，一场测试定案"
mem_ref: cbdc9a4e-5ecf-4249-b3c1-4751fd1f432b
mem_status: linked
related:
  - "Error_Book/entries/ERR-051__enqueue-stamp-vs-process-bump-cross-time-gate-false-kill.md"
  - "Internal_KI/patterns/PAT-028__self-certifying-runtime-observability.md"
aliases:
  - "ERR-053"
  - "errno24-accept-refusal"
---

# 文件描述符耗尽：accept() 拒收造成"从某时刻起系统性掉线"

## 错误现象

150 桌 600 机器人压测：前 16 分钟正常，16:17:00 起 `OSError: [Errno 24] Too many open files` 风暴（9106 次 `socket.accept()` 失败）——新连接成批被拒，游戏消息进不来，机器人系统性被判逃跑。用户关键质询推翻了初版"锅切换风暴"结论：同时开局（最大瞬时压力）安然无恙、错峰的第二锅期崩溃 ⇒ 机制必为单调累积。

## 根因

进程句柄上限为默认档位，测试服务还开着 http 全量日志（267MB/27min，应答变慢 → 在途连接堆积），叠加加桌调度使实际并发远超名义值。累积的在途 socket 爬到上限 → `accept()` 拒收 → 消息断粮 → 任何客户端逻辑都救不了收不到的牌。

## 修复

`ulimit -n 65535` + 压测关闭 http 日志 + 加装 `[HEALTH]` 资源心跳与 `RLIMIT_NOFILE` 启动披露（commit `0c8d4db`）。复测 fds 峰值 819 对上限 65535，问题消失。观测体系见 [[PAT-028__self-certifying-runtime-observability|PAT-028]]；误导排查的开关问题见 [[ERR-052__entrypoint-argparse-defaults-clobber-config-file-edits|ERR-052]]。
