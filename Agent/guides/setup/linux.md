# Linux Setup

## 前置依赖

```bash
# Git (Debian/Ubuntu)
sudo apt install git

# Git (Fedora/RHEL)
sudo dnf install git

# Node.js (推荐通过 nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install --lts

# Claude Code CLI
npm install -g @anthropic-ai/claude-code
```

## 安装步骤

### 1. Clone 仓库

推荐路径:`~/toolBox`

```bash
cd ~
git clone <repo-url> toolBox
```

### 2. 启动 Claude Code

```bash
cd ~/toolBox
claude
```

项目级命令 (`/pm`, `/find`, `/init`) 自动可用。

### 3. (可选) 配置全局 CLAUDE.md

如果你需要在其他项目中引用 toolBox 规则:

```bash
# 确保目录存在
mkdir -p ~/.claude

# 复制模板
cp ~/toolBox/Agent/templates/global_claude_md.md ~/.claude/CLAUDE.md

# 替换占位符
sed -i 's|{TOOLBOX_ROOT}|/home/'"$USER"'/toolBox|g' ~/.claude/CLAUDE.md
```

## 注意事项

- Linux 文件系统大小写敏感,确保目录名准确
- 文件权限:clone 后文件默认权限即可,无需特殊调整
- 如使用 WSL2,路径为 `/home/<username>/toolBox`,与原生 Linux 一致
