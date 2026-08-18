---
id: ERR-052
type: error
errorCode: ERR-052
severity: high
status: resolved
recurrence: 0
firstSeen: "2026-07-12"
tags:
  - ki/error-book
  - error
  - severity/high
  - domain/configuration
  - language/python
prevention:
  - "入口脚本禁止用 argparse 默认值无条件调用配置 setter：参数 default=None + 显式传参才覆盖，否则'改配置文件'的团队成员被静默覆盖回默认"
  - "任何开关系统必须有运行时自证：启动横幅打印生效值（WARNING 级必落盘），部署后第一件事查横幅，不靠'谁改了哪个文件'推断"
  - "开关是否生效以日志痕迹为准：某开关独有的日志标记全量为零 = 该开关运行时为关，与任何人的'我确定改了'无关"
  - "配置口径顺应团队习惯：团队习惯直改文件就让文件成为唯一真相（file-is-config），命令行仅作临时覆盖且优先"
mem_ref: cbdc9a4e-5ecf-4249-b3c1-4751fd1f432b
mem_status: linked
related:
  - "Error_Book/entries/ERR-045__slash-command-dual-scope-definition-drift.md"
aliases:
  - "ERR-052"
  - "flags-clobbered-by-entrypoint"
---

# 入口脚本 argparse 默认值静默覆盖配置文件改动（"以为开了实际全关"）

## 错误现象

gunzi_pro 逃跑压测排查：技术团队确信已把四个大修开关在 py 文件里改为 True，但 608MB 运行日志中开关独有标记（RECEIPT_CONFIRMED/REPLAY/actor parked）全量为零——运行时四开关全关，8 例逃跑实际发生在无保护的基线形态上，误导了整轮归因。

## 根因

run.py 启动时无条件用 argparse 值调用全部 setter，而参数默认值全为 False：`set_room_actor_enabled(args.room_actor)`。团队改的是 `runtime_flags.py` 模块默认值 → 启动瞬间被覆盖回 False。改文件等于白改，且无任何提示。

## 修复

commit `016a175` / `df342a9` 三层防呆：① 参数 default=None，显式传参才调 setter（两种开启方式并存，命令行优先）；② 启动横幅 `EFFECTIVE FLAGS`（WARNING 级）打印运行时生效值+派生开关状态；③ 顺应团队习惯把业务开关默认值定稿在配置文件里（默认全开=交付形态）。同类"双处定义漂移"见 [[ERR-045__slash-command-dual-scope-definition-drift|ERR-045]]。
