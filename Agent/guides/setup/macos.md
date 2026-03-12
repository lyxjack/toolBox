# macOS Setup

## 前置依赖

```bash
# Git (通常已预装，或通过 Xcode Command Line Tools)
xcode-select --install

# Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Node.js (可选，用于 npx skills find)
brew install node
```

## 安装步骤

### 1. Clone 仓库

推荐路径：`~/toolBox`

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

如果你需要在其他项目中引用 toolBox 规则：

```bash
# 复制模板
cp ~/toolBox/Agent/templates/global_claude_md.md ~/.claude/CLAUDE.md

# 替换占位符
sed -i '' 's|{TOOLBOX_ROOT}|/Users/'"$USER"'/toolBox|g' ~/.claude/CLAUDE.md
```

## 注意事项

- macOS 文件系统默认大小写不敏感（APFS），目录名避免仅靠大小写区分
- `.DS_Store` 已在 `.gitignore` 中排除
