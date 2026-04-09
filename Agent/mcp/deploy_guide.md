# MCP 游戏引擎自动部署指南

## 概述
当 SessionStart hook 检测到游戏项目时，Claude 应读取本文件并引导用户完成 MCP server 部署。

## 检测标识

| 标识 | 含义 |
|------|------|
| `COCOS_PROJECT_DETECTED` | 当前目录为 Cocos Creator 项目 |
| `UNITY_PROJECT_DETECTED` | 当前目录为 Unity 项目 |

---

## Cocos Creator 部署步骤

**前提**: Cocos Creator 编辑器已安装并可打开当前项目。

### 1. 安装 MCP 插件（Claude 执行）
```bash
# 复制插件到项目 extensions 目录
cp -r /Users/jackliu/toolBox/Tool/cocos-mcp-server extensions/cocos-mcp-server

# 安装依赖并构建
cd extensions/cocos-mcp-server
npm install
npm run build
```

### 2. 生成 .mcp.json（Claude 执行）
将 `/Users/jackliu/toolBox/Agent/mcp/profiles/cocos-creator.mcp.json` 复制到项目根目录的 `.mcp.json`。

### 3. 用户需手动操作
提醒用户完成以下步骤：
- [ ] 重启 Cocos Creator 编辑器（或在编辑器内刷新扩展）
- [ ] 在编辑器菜单 `扩展` 中确认 `Cocos MCP Server` 已启用
- [ ] 确认编辑器控制台显示 MCP server 已在端口 3000 启动
- [ ] 回到 Claude Code，确认 MCP 连接正常

### 安全约束
- **禁止**脚本修改 `.prefab`、`.scene`、`.anim` 等 Cocos 资产文件（参照 ERR-002）
- 插件源码来自 `Tool/cocos-mcp-server/`（只读），不修改源仓库

---

## Unity 部署步骤

**前提**: Unity 编辑器（2021.3 LTS 或更高）已安装并可打开当前项目。

### 1. 安装 MCP 包（用户在 Unity 中操作）
提醒用户完成以下步骤：
- [ ] 打开 Unity 编辑器
- [ ] 导航到 `Window > Package Manager`
- [ ] 点击 `+` → `Add package from git URL`
- [ ] 输入：`https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main`
- [ ] 等待安装完成

### 2. 生成 .mcp.json（Claude 执行）
将 `/Users/jackliu/toolBox/Agent/mcp/profiles/unity.mcp.json` 复制到项目根目录的 `.mcp.json`。

### 3. 用户需手动操作
提醒用户完成以下步骤：
- [ ] 在 Unity 编辑器中打开 `Window > MCP for Unity`
- [ ] 点击 `Start Server`（默认端口 8080）
- [ ] 确认连接状态显示 `Connected`
- [ ] 回到 Claude Code，确认 MCP 连接正常

### 前置依赖
- Python 3.10+
- uv 包管理器（如使用 stdio 传输模式）

---

## Obsidian MCP（全局知识库，所有项目共享）

**前提**: Obsidian 已安装，KI Vault（`/Users/jackliu/toolBox/KI/`）已打开，Local REST API 插件已启用（端口 27124）。

### 注册方式（Claude 执行，一次性）
```bash
claude mcp add obsidian-ki --scope user \
  -e OBSIDIAN_API_KEY=<key> \
  -e OBSIDIAN_BASE_URL=https://127.0.0.1:27124 \
  -e OBSIDIAN_VERIFY_SSL=false \
  -e OBSIDIAN_ENABLE_CACHE=true \
  -- npx -y obsidian-mcp-server
```

### 重要：全局 MCP 注册规则
- **必须**使用 `claude mcp add --scope user` 注册（写入 `~/.claude.json`）
- **不能**手动创建 `~/.claude/.mcp.json`（Claude Code 不读取该文件，参见 ERR-009）
- 项目级 MCP（如 cocos-creator）可以用项目根目录的 `.mcp.json`
- 全局级 MCP（如 obsidian-ki）必须通过 CLI 命令注册

### 验证
```bash
# 检查注册状态
claude mcp list

# 检查 Obsidian REST API
curl -k https://127.0.0.1:27124
```

---

## 部署后验证

部署完成后，Claude 应尝试调用一个 MCP tool 来验证连接：
- Cocos: 尝试获取当前场景信息
- Unity: 尝试获取当前场景信息

如果连接失败，引导用户检查：
1. 编辑器是否已启动并打开当前项目
2. MCP server 是否已在编辑器内启动
3. 端口是否被其他进程占用（`lsof -i :3000` 或 `lsof -i :8080`）

---

## MCP 配置模板路径

| 引擎 | 模板路径 |
|------|---------|
| Cocos Creator | `/Users/jackliu/toolBox/Agent/mcp/profiles/cocos-creator.mcp.json` |
| Unity | `/Users/jackliu/toolBox/Agent/mcp/profiles/unity.mcp.json` |
