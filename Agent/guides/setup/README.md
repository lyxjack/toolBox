# toolBox Setup Guide

## Quick Start (所有平台通用)

1. **Clone 仓库**
   ```bash
   git clone <repo-url> toolBox
   cd toolBox
   ```

2. **用 Claude Code 打开 toolBox 目录**
   ```bash
   claude
   ```

3. **项目级命令自动可用**
   - `/pm` — 提交开发需求,触发完整工作流
   - `/find` — 搜索、学习、入库外部 Skill
   - `/init` — 为目标项目初始化 Agent Skills 目录结构

无需任何额外配置。`CLAUDE.md` 和 `.claude/commands/` 已包含所有必要指令。

## (可选) 全局配置

如果你希望在 **其他项目目录** 中也能使用 toolBox 的治理规则:

1. 复制模板:`Agent/templates/global_claude_md.md`
2. 将 `{TOOLBOX_ROOT}` 替换为你的 toolBox 实际绝对路径
3. 保存到 `~/.claude/CLAUDE.md`

详见各平台指南:

- [macOS](./macos.md)
- [Windows](./windows.md)
- [Linux](./linux.md)

## 目录结构

```
toolBox/
├── PM/           ← 需求入口层
├── Agent/        ← 治理与编排层
├── KI/           ← 核心知识资产层
├── Tool/         ← 外部 Skill 源仓库(只读)
├── In-Process/   ← 运行期接口契约
├── CLAUDE.md     ← 项目配置入口
└── .claude/
    └── commands/ ← 项目级命令 (/pm, /find, /init)
```

## 前置依赖

- **Git** — 用于 clone 仓库和管理 Skill 源
- **Claude Code CLI** — 用于运行 AI Agent 工作流
- **Node.js** (可选) — 部分 Skill 搜索功能需要 `npx`
