---
id: PAT-031
type: pattern
title: "外部配额自治闸门：到阈值暂停，刷新后自动续跑"
status: active
created: "2026-07-25"
tags:
  - "pattern/governance"
  - "domain/rate-limit"
  - "tool/claude-code-hooks"
  - ki/pattern
complements:
  - "[[ERR-062__degraded-fallback-data-treated-as-success-defeats-fail-close|ERR-062]]"
  - "[[ERR-058__same-event-parallel-repair-race-partial-success-fail-open|ERR-058]]"
  - "[[ERR-057__env-dependent-state-root-write-a-read-b-fail-open|ERR-057]]"
trigger_condition: "both"
aliases:
  - "PAT-031"
  - "quota-autonomous-gate"
mem_ref: "e39e2fb2-d982-4129-aa64-19d5a18db0c9"
mem_status: "linked"
---

# 外部配额自治闸门

## 适用场景

外部服务有周期性配额、耗尽即硬失败、且刷新时刻可查 —— 需要在撞墙前停手、刷新后自动接着干。本例：Claude Code 五小时 token 额度（`REQ-20260725-005843`）。

## 结构：一个文件，四个子命令

```
limit-guard.mjs  block   → PreToolUse 全工具：暂停中就拦（读不到状态也拦）
                 mark    → UserPromptSubmit：记 session；≥闸值当场暂停；否则确保盯梢进程在跑
                 wait    → 后台常驻：每 30s 查一次用量，≥闸值就暂停；
                           到「刷新时刻+60s」解除暂停，替你说「继续」
                 status / resume  → 人工看状态 / 提前解除
```

四个角色靠三个状态文件碰头：`paused.json`（存在=暂停中）、`session.json`（续跑锚点）、`waiter.pid`。

## 关键点

1. **数据源要找准。** UI 面板背后必有可直查的端点（本例 `GET /api/oauth/usage`，返回 `five_hour.{utilization, resets_at}`，零 LLM 成本）。**不要读本地缓存** —— 实测 `~/.claude.json.cachedUsageUtilization` 陈旧 2.77 小时、报 100% 而真实 8%。
2. **阻塞路径要小且不联网。** 挂全 matcher 的 hook 是全局单点：所有会话每次工具调用都过它。它只该做一件事 —— 读一个本地文件。联网会让网络抖动变成交互卡顿。采集只发生在低频事件与后台进程。
3. **判「没暂停」必须先确认状态目录健康。** `statSync(锁文件)` 在目录被删/不可读时同样报 `ENOENT`，只判文件就会把「状态目录消失」误读成「没暂停」而全放行。先 `statSync(目录)`，只把文件的 `ENOENT` 当作「真没暂停」。
4. **解锁时刻 = 刷新时刻 + 缓冲。** 全程 epoch 毫秒比较（`resets_at` 带 UTC 偏移，字符串比较会被时区坑）。缓冲 60s 天然满足「00:00 刷新就 00:01 再动」。
5. **到点还要复核一次。** 刷新时刻可能来自旧数据；续跑前重新采集确认用量真降了，否则刚续跑就再撞墙。
6. **续跑指令走 stdin，不走 argv。** `argv` 对 `ps` 全局可见，会把请求原文泄露给同机任何进程。
7. **盯梢进程要常驻，且不设「布防线」。** 只在「用量 ≥90%」才启动，等于放过所有从 90% 以下起步的长回合 ——
   它同样能在两条 prompt 之间冲过闸值。**每条 prompt 都确保它在跑**，而且这个存活检查必须排在
   任何节流之前，否则盯梢进程崩掉而探测缓存还新鲜时，就会全程无人监控。
8. **盯梢周期不要分快慢档。** 睡多久就等于给越线开多大的窗口；这个查询是免费的 HTTP GET，
   没有省的必要。恒定一个短周期，比「离得远就睡 5 分钟」既简单又安全。

## 更重要的一课：什么时候该停手

本模式第一版写了 **699 行**：原子租约、断点分片、配置 schema 校验、fail-close 分型、损坏锁自愈、漂移自检……起因是拿对抗式审计（Codex）跑了一轮，它吐回 17 条，逐条修完就成了这个样子。

**对抗式审计天生会一直找出东西来。** 它给的每条单看都成立，但「值不值得修」不在审计的职责里，在你自己。最终砍回**单文件、约 200 行**，功能一条没少。

| 保留 | 砍掉 |
|---|---|
| 查用量、到阈值暂停、准点解除、自动续跑 | 原子租约、断点分片、配置 schema 校验 |
| 一条 fail-closed：**读不到状态就拦** | fail-close 分型、损坏锁自愈、双计数器、mock 注入体系 |

判断线：**这条缺陷会不会真的发生在这台机器上，发生了后果有多大，修它要付多少复杂度。** 三问之后再动手。

## 反模式

| 错误做法 | 正确做法 | 关联 |
|---|---|---|
| 门禁发现状态异常 → 尝试修复 → 放行 | 门禁只负责拦，修复是别人的事 | [[ERR-058__same-event-parallel-repair-race-partial-success-fail-open\|ERR-058]] |
| 状态根从环境变量拼 | 字面量绝对路径 | [[ERR-057__env-dependent-state-root-write-a-read-b-fail-open\|ERR-057]] |
| 降级兜底的读数当成成功采集 | 要么不做降级，要么让调用方能区分来源 | [[ERR-062__degraded-fallback-data-treated-as-success-defeats-fail-close\|ERR-062]] |
| 阻塞路径里查网络 | 只读一个本地文件 | — |
| 把对抗式审计的每一条都修掉 | 三问过滤后再修 | 见上节 |

## 落地位置

- 脚本：`~/.claude/hooks/limit-guard/limit-guard.mjs`（单文件，约 200 行）
- 状态：`~/.claude/limit-guard-state/{paused,session,waiter.pid}.json` + `limit-guard.log`
- 注册：`~/.claude/settings.json` 的 `PreToolUse`（无 matcher = 全工具）+ `UserPromptSubmit`
- 需求与验证：`REQ-20260725-005843`
