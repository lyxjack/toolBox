---
id: ERR-006
type: error
errorCode: BHV-001
severity: medium
status: resolved
recurrence: 3
firstSeen: 2026-04-07
tags:
  - error/medium
  - tool/MCP
  - errorCode/BHV-001
  - ki/error-book
prevention: "端口分配确定后不再更改，MCP=3001 游戏后端=3000，冲突时一次性解决"
aliases:
  - ERR-006
---

# MCP 端口配置反复变更导致混乱

## 错误现象
MCP Server 端口在 3000 和 3001 之间反复切换，导致：
- 编辑器重启后 MCP 连不上
- 用户被要求多次手动重启插件
- .mcp.json 和 settings/mcp-server.json 不一致

## 根因分析
游戏后端 server 默认占用 3000 端口。MCP 也默认 3000。两者冲突时应一次性确定端口分配，而不是来回修改。

## 解决方案
**固定分配：MCP = 3001，游戏后端 = 3000。不再变动。**
- `settings/mcp-server.json`: port=3001, autoStart=true
- `.mcp.json`: url=http://127.0.0.1:3001/mcp

## 预防规则
**端口分配确定后不再更改。如果遇到端口冲突，先确认各服务的固定端口，一次性解决。**

## 关联
- Memory: reference_mcp_port.md
- [[PAT-003__mcp-port-allocation|PAT-003]] — MCP 端口分配规范
