---
id: ERR-007
type: error
errorCode: BHV-001
severity: high
status: resolved
recurrence: 1
firstSeen: 2026-04-08
tags:
  - error/high
  - tool/MCP
  - tool/obsidian
  - errorCode/BHV-001
  - ki/error-book
prevention: "Claude Code MCP 注册必须用 `claude mcp add --scope user`，不能手写 ~/.claude/.mcp.json"
aliases:
  - ERR-007
---

# Obsidian MCP 配置写入错误路径导致工具不加载

## 错误现象
Obsidian REST API 正常运行（curl 返回 200），但 Claude Code 会话中找不到任何 obsidian 相关工具。反复重启会话无效。

## 根因分析
MCP server 配置被手动写入 `~/.claude/.mcp.json`（带点前缀的隐藏文件）。**Claude Code 不读取这个文件。** Claude Code 的 MCP 注册机制是通过 `claude mcp add` 命令将配置写入 `~/.claude.json`（注意：不是 `~/.claude/` 目录下的文件，而是用户 home 目录下的 `~/.claude.json`）。

项目级 `.mcp.json` 是 Claude Code 支持的，但全局级必须通过 CLI 命令注册。

## 解决方案
使用 `claude mcp add --scope user` 注册全局 MCP server：

```bash
claude mcp add obsidian-ki --scope user \
  -e OBSIDIAN_API_KEY=<key> \
  -e OBSIDIAN_BASE_URL=https://127.0.0.1:27124 \
  -e OBSIDIAN_VERIFY_SSL=false \
  -e OBSIDIAN_ENABLE_CACHE=true \
  -- npx -y obsidian-mcp-server
```

旧的 `~/.claude/.mcp.json` 文件可以删除（已无用）。

## 预防规则
**所有全局 MCP server 必须通过 `claude mcp add --scope user` 注册。不要手动创建或编辑 `~/.claude/.mcp.json`。** 项目级 MCP 可以用 `.mcp.json`，但全局级不行。

## 关联
- [[ERR-008__mcp-port-conflict-not-persisted|ERR-008]] — MCP 端口配置问题
- Memory: reference_mcp_port.md
