# toolBox Setup Guide

## Quick Start (所有平台通用)

1. **Clone 仓库**
   ```bash
   git clone <repo-url> toolBox
   cd toolBox
   ```

2. **运行 Bootstrap**
   ```bash
   bash bootstrap.sh
   ```
   或在 Claude Code 内输入 `/init`。

   Bootstrap 会自动:
   - 检查前置依赖 (git, Node.js >= 18, Claude Code CLI)
   - 验证五层目录结构
   - 配置 Claude Code hooks
   - 引导 Obsidian 安装和 MCP 注册 (或选择传统索引模式)
   - 可选配置全局 CLAUDE.md

3. **启动 Claude Code**
   ```bash
   claude
   ```

4. **可用命令**
   - `/init` — Bootstrap 或增量更新 toolBox
   - `/pm` — 提交开发需求,触发完整工作流
   - `/find` — 搜索、学习、入库外部 Skill

## 更新 toolBox

```bash
cd toolBox
git pull
bash bootstrap.sh    # 自动检测版本差异,执行增量迁移
```

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
- **Node.js** — `npx` 用于 MCP server 和 Skill 搜索
- **Obsidian** — 知识管理（KI 层），需启用 Local REST API 插件（端口 27124）
