---
id: ERR-094
type: error
errorCode: ERR-094
severity: medium
status: resolved
recurrence: 0
firstSeen: 2026-08-04
tags:
  - ki/error-book
  - error
  - severity/medium
  - domain/tooling
  - domain/codex
  - domain/process-mgmt
prevention:
  - "**派发长跑的后台作业, 必须用 Bash 工具的 `run_in_background: true`, 不能只靠命令自带的 `--background`**。
    前台 Bash 有 2 分钟默认超时, 超时是给**整个进程组**发 SIGTERM(exit 143) ——
    命令自己 fork 出来的『后台』子进程同在这个进程组里, 一并被打死。
    `--background` 只让命令**早点返回**, 挡不住进程组信号"
  - "**判据**: 前台调用返回 `Exit code 143` + `Command timed out after 2m`, 随后作业 json 停在
    `status: running` 但 `ps -p <pid>` 查无此进程、日志文件的 mtime 停在超时那一刻 —— 这就是被误杀, 不是作业自己崩的"
  - "**看门狗报 ERROR/SUSPECT 不等于作业死了**。CLI 的作业索引查不到 id(`No job found`)
    只说明索引没同步; **先查活体**(`ps -p <pid>` + 日志 mtime + 作业 json), 再决定动不动它。
    盲目 cancel/重发会让 `--write` 类作业跑两遍"
  - "**索引查不到但进程活着时, 改用盯进程的守候**: `until ! ps -p <pid> >/dev/null 2>&1; do sleep 15; done`
    配 `run_in_background: true` —— 这条不依赖 CLI 索引, 比基于 status 查询的看门狗稳"
ci_rules: []
mem_ref: 019fcaa4-290b-7e40-a608-c637f1b1bc39
mem_status: linked
related:
  - Error_Book/entries/ERR-063__adversarial-review-scope-spiral-no-stopping-rule.md
  - Error_Book/entries/ERR-069__cocos-mcp-tool-quirks-collection.md
aliases:
  - ERR-094
  - foreground-timeout-kills-detached-job
  - 前台超时误杀后台作业
---

# 前台 Bash 超时的 SIGTERM 打死了同进程组的后台 Codex 作业

## 现象

派发一次 Codex 对抗审计:

```
node "$COMPANION" adversarial-review --background --scope working-tree "<长 brief>"
```

前台跑到 2 分钟被工具超时掐断(`Exit code 143`)。随后:

- 作业 json 停在 `"status": "running"`, `"phase": "verifying"`
- `ps -p 5779` —— **查无此进程**
- 日志文件 mtime 停在被掐断那一刻(1 分 23 秒处)
- CLI `status --all --json` 里 `running: []`, 连 `latestFinished` 都没有
- `result <job-id>` 报 `No job found`

**一次完整的审计白跑了**, 而且现场看起来像"作业自己神秘消失"。

## 根因

超时是给**整个进程组**发 SIGTERM。命令自带的 `--background` 只是让父命令
**早点把控制权还回来**, fork 出来的实际运行器仍在同一个进程组里 —— 一起被收走。

**`--background` 解决的是"要不要等它", 不是"它归谁管"。** 两回事。

## 修复

派发时把整条命令交给 Bash 工具的 `run_in_background: true`, 让工具自己托管:

```
Bash(command="node \"$COMPANION\" adversarial-review --background ...",
     run_in_background=true)
```

重发后同一份 brief 跑满 10 分钟正常出结论(verdict + 2 条 finding)。

## 连带的第二个坑: 看门狗报 ERROR ≠ 作业死了

重发之后, 官方看门狗连续两次 `status` 查询都报 `No job found`, 退出码 3(`WATCHDOG_ERROR`)。
但按协议先查活体:

```
ps -p 14613  → node ... adversarial-review (etime 05:41)   ← 活得好好的
日志 mtime    → 15 秒前还在写, 正在跑断言脚本
```

**是 CLI 的作业索引查不到 id, 不是作业死了。** 此时若照 `WATCHDOG_STALL` 的处置去
cancel + 重发, 就会把一个正在跑的作业杀掉再跑一遍。

改用不依赖索引的守候:

```bash
until ! ps -p 14613 >/dev/null 2>&1; do sleep 15; done
echo "作业结束"; tail -120 "$LOG"
```

配 `run_in_background: true` 挂着, 进程一退就被唤醒。

## 泛化

**"后台"有两层含义, 别混:**

| 层 | 谁说了算 | 管不管进程组信号 |
|---|---|---|
| 命令的 `--background` / `&` | 被调命令自己 | ❌ 不管, 同组同生死 |
| 工具的 `run_in_background` | 调用方(harness) | ✅ 独立托管, 不受前台超时波及 |

凡是**预计超过 2 分钟**的派发(审计、构建、上传、长测), 一律走工具级后台。

审计本身的停机规则见 [[ERR-063__adversarial-review-scope-spiral-no-stopping-rule|ERR-063]]。
