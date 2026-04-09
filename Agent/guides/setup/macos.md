# macOS Setup

## 前置依赖

```bash
# Git (通常已预装,或通过 Xcode Command Line Tools)
xcode-select --install

# Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Node.js (可选,用于 npx skills find)
brew install node
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
# 复制模板
cp ~/toolBox/Agent/templates/global_claude_md.md ~/.claude/CLAUDE.md

# 替换占位符
sed -i '' 's|{TOOLBOX_ROOT}|/Users/'"$USER"'/toolBox|g' ~/.claude/CLAUDE.md
```

### 4. 配置 Obsidian + 知识召回

```bash
# 安装 Obsidian (或从 https://obsidian.md 下载)
brew install --cask obsidian
```

1. 启动 Obsidian → "Open folder as vault" → 选择 `~/toolBox/KI/`
2. Settings → Community plugins → 关闭 Restricted mode → 启用 **Local REST API** 插件
3. 进入 Local REST API 设置 → 复制 **API Key**
4. 注册全局 MCP：

```bash
claude mcp add obsidian-ki --scope user \
  -e OBSIDIAN_API_KEY=<YOUR_API_KEY> \
  -e OBSIDIAN_BASE_URL=https://127.0.0.1:27124 \
  -e OBSIDIAN_VERIFY_SSL=false \
  -e OBSIDIAN_ENABLE_CACHE=true \
  -- npx -y obsidian-mcp-server
```

5. 重启 Claude Code，验证 `claude mcp list` 包含 `obsidian-ki`

> 详细说明见 [Obsidian KI 设置指南](../obsidian-ki-setup.md)

## 注意事项

- macOS 文件系统默认大小写不敏感(APFS),目录名避免仅靠大小写区分
- `.DS_Store` 已在 `.gitignore` 中排除
- 全局 MCP 必须用 `claude mcp add --scope user` 注册，不能手写 `~/.claude/.mcp.json`（ERR-009）
