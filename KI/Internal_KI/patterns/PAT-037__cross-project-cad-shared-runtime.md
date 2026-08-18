---
id: PAT-037
type: pattern
title: "跨项目 CAD 工作流（text-to-cad 共享运行时）"
status: active
created: "2026-07-29"
tags:
  - pattern/cad
  - pattern/skill-runtime
  - domain/hardware
  - ki/pattern
complements:
  - "[[PAT-014__external-mcp-server-find-ingestion-as-plugin|PAT-014]]"
  - "[[PAT-003__mcp-port-allocation|PAT-003]]"
related:
  - KI/Internal_KI/patterns/PAT-014__external-mcp-server-find-ingestion-as-plugin.md
  - KI/Internal_KI/patterns/PAT-003__mcp-port-allocation.md
  - KI/External_KI/skills/cad-hardware/cad-hardware.md
trigger_condition: "user_explicit"
aliases:
  - "PAT-037"
mem_ref: "9366f386-d559-4d52-b1a7-d6f2dd8e1d98"
mem_status: "linked"
---

# 跨项目 CAD 工作流（text-to-cad 共享运行时）

## 适用场景

在**任意项目**中需要产出 CAD / 机器人描述 / 加工文件时（STEP、STL、3MF、GLB、DXF、G-code、URDF、SRDF、SDF）。

`text-to-cad` 与仓库里常见的**纯文档型 skill 不同**：它带 Python + Node 运行时。因此不能只靠 `~/.claude/skills` 的符号链接就跑起来——必须指向共享 venv。本 Pattern 固化「一份运行时、多项目复用」的正确调用方式。

## 环境常量（单一事实来源）

| 变量 | 值 |
|---|---|
| Skill 源仓库 | `/Users/jackliu/toolBox/Tool/text-to-cad`（`main` 分支，只读源） |
| Python 解释器 | `$CADSK/.venv/bin/python`（**Python 3.12**，cadpy 要求 ≥3.12） |
| 已装 skill | cad, cad-viewer, dxf, step-parts, urdf, srdf, sdf, sendcutsend, gcode, bambu-labs, implicit-cad |
| Agent 注册 | `~/.claude/skills/*` 与 `~/.codex/skills/*` 符号链接 → 上述源目录 |
| Viewer 端口 | 4178（占用则自动向后扫描，**禁止手工挑端口**） |

```bash
CADSK=/Users/jackliu/toolBox/Tool/text-to-cad
CADPY=$CADSK/.venv/bin/python
```

## 步骤

### 1. cd 到目标项目（决定产物落点）

**关键机制**：launcher 用绝对路径调用，但**目标路径按命令 cwd 解析**。所以先 `cd` 到拥有产物的项目，再传 cwd 相对路径——产物就落在项目里，不会污染 skill 目录。

```bash
cd /path/to/my-project
```

### 2. 生成（编辑源，而非产物）

写 build123d 生成器 `cad/bracket.py`，内含 `def gen_step(): return <shape>`（不要在返回值里写输出路径，路径由 CLI 决定）：

```bash
$CADPY $CADSK/skills/cad/scripts/step cad/bracket.py
```

同时写出隐藏的 `.bracket.step.glb` 拓扑边车——它驱动 Viewer 与 `inspect` 的 selector ref，**不是可选产物**。

已有生成器时永远跑 `.py`，不要跑它导出的 `.step`；直接导入外部 STEP 才用 `--kind part|assembly`。禁止目录级批量生成。

### 3. 几何校验（基线 + 针对性）

```bash
$CADPY $CADSK/skills/cad/scripts/inspect refs cad/bracket.step --facts --planes --positioning
```

再按规格用 `measure` / `align` / `frame` / `diff` 逐条验证用户点名的尺寸与关系。

### 4. 快照（强制，不可跳过）

```bash
$CADPY $CADSK/skills/cad/scripts/snapshot --input cad/bracket.step --output /tmp/review/bracket.png --camera iso
```

确定性检查通过**不是**跳过快照的理由。输出文件名会自动插入 UTC 时间戳，实际落盘名≠`--output` 原值，须从 stdout 读回真实路径。评审图放 `/tmp`，不要提交进仓库。

### 5. Viewer 出链接（复用优先）

先探针复用，避免起第二个服务器：

```bash
curl -sS -m 2 http://127.0.0.1:4178/__cad/server
```

返回 JSON 满足 `"app":"cad-viewer"` 且 `"dynamicRoot":true` 即复用（一个服务器靠 `?dir=` 服务任意绝对目录）。否则启动：

```bash
cd $CADSK/skills/cad-viewer
npm --prefix scripts/viewer run serve -- --host 127.0.0.1 \
  --dir /path/to/my-project/cad --shutdown-after 12h --json
```

Viewer **无需 npm install**（`main` 分支自带预编译 `dist/`，后端只用 node 内置模块）。从 `--json` 那行读真实端口，再拼链接（`file=` 相对 `--dir`）：

```
http://127.0.0.1:<port>/?dir=/path/to/my-project/cad&file=bracket.step
```

## 反模式

| 错误做法 | 正确做法 | 原因 |
|---|---|---|
| 用系统 `python3` 或项目自己的 venv 跑 skill 脚本 | 用 `$CADSK/.venv/bin/python` | 系统 Python 3.11 < cadpy 要求的 3.12，且缺 build123d/OCP |
| 在 skill 目录内 `cd` 后生成 | `cd` 到目标项目再传相对路径 | 产物会落进只读源仓库，污染 `Tool/` |
| 每个项目各建一份 venv / 各起一个 Viewer | 共享 `Tool/` 那一份 runtime 与单一 Viewer | ~2GB 依赖重复；多 Viewer 端口互撞 |
| 跑 `scripts/step` 在已导出的 `.step` 上 | 跑在 `.py` 生成器上 | 装配会丢失 source-level 关系与标签 |
| 确定性检查过了就不出快照 | 快照强制 | 数值对但形状错的情况真实存在 |
| 手工挑 Viewer 端口 / 探到占用就换端口 | 读 `--json` 回报的绑定端口 | 服务器自己扫描，手工挑会和复用逻辑打架 |
| `git status` / 文件大小 diff 大 STEP/GLB | 比源码 diff、`inspect` 摘要、快照 | 二进制 CAD 产物 churn 无意义 |
| 直接 `git clone` 就以为能用 | 先确认 `git-lfs` 已装 | `assets/**`、`benchmarks/**` 走 LFS，缺 git-lfs 会 checkout 中途失败 |

## 维护

- 升级：`cd $CADSK && git pull`（`main` 是发布分支）。升级后若 `plugins/cad/VERSION` 变了，Viewer 版本号也变——旧 Viewer 进程须重启，否则 `viewerVersion` 不匹配会被判为「别的 checkout 的 Viewer」。
- 重建 venv：`$CADSK/.venv` 删掉后按 `requirements-dev.txt` 重装，再 `python -m playwright install chromium`（快照渲染必需）。
- 撤销 agent 注册：`$CADSK/scripts/install/uninstall-skills.sh`。
- **禁止**改 `Tool/text-to-cad` 里的源文件（Iron Law 04）。需要改行为就在项目侧包装。

## 关联

- [[PAT-014__external-mcp-server-find-ingestion-as-plugin|PAT-014]] — 外部库入库为插件的通用套路；本条是「带运行时的 skill 库」变体
- [[PAT-003__mcp-port-allocation|PAT-003]] — 端口分配纪律，与 Viewer 的 4178 自动扫描同源思路
- Anchor 知识：`KI/External_KI/skills/cad-hardware/cad-hardware.md`
