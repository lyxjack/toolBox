# Windows Setup

## 前置依赖

```powershell
# Git for Windows
winget install Git.Git

# Node.js (含 npx)
winget install OpenJS.NodeJS.LTS

# Claude Code CLI
npm install -g @anthropic-ai/claude-code
```

## 安装步骤

### 1. Clone 仓库

推荐路径：`C:\Users\<username>\toolBox`

```powershell
cd ~
git clone <repo-url> toolBox
```

### 2. 启动 Claude Code

```powershell
cd toolBox
claude
```

项目级命令 (`/pm`, `/find`, `/init`) 自动可用。

### 3. (可选) 配置全局 CLAUDE.md

如果你需要在其他项目中引用 toolBox 规则：

```powershell
# 复制模板
Copy-Item .\Agent\templates\global_claude_md.md $env:USERPROFILE\.claude\CLAUDE.md

# 用编辑器打开，将 {TOOLBOX_ROOT} 替换为实际路径
# 例如：C:\Users\YourName\toolBox
notepad $env:USERPROFILE\.claude\CLAUDE.md
```

## 注意事项

- Windows 路径使用反斜杠 `\`，但 toolBox 内部配置兼容正斜杠 `/`
- 推荐使用 Windows Terminal + PowerShell 或 WSL2
- 如使用 WSL2，参考 [Linux 指南](./linux.md)
- `Thumbs.db` 已在 `.gitignore` 中排除
- 确保 Git 配置 `core.autocrlf=true` 以正确处理换行符
