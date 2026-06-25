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

## codebase-memory-mcp(代码结构记忆 · 按需触发,默认不装)

**定位**: 源码结构知识图谱引擎(tree-sitter + SQLite + Cypher),为"分析 / 重构 / 陌生项目 onboarding"提供调用图、影响半径、架构总览、死代码检测。第三类记忆(与 claude-mem 会话记忆、Obsidian 知识记忆并列)。

> ⚠️ **不是常驻全局 MCP**。使用模型 = "**每个合格代码项目索引一次,之后在该项目内长期辅助**"。**只在** CTO Planning `Agent/workflow/cto_planning.md` **Step 2.5 的 A 级项目画像(P1 真实源码 / P2 会反复探索 / P3 非一次性)三条全中**时,才在该项目安装并 `index_repository`。安装是**用户确认动作**,Claude 不得擅自 `curl|bash`。
> ⚠️ **去冗余**: 已索引项目内,结构化探索走 codebase-memory,与 claude-mem `smart-explore` **二选一**,禁止双开(见 Step 2.5)。
> ⚠️ **toolBox 治理层禁用**: 本仓库是纯 markdown,无代码可建图(上游明示文档类 *not first-class*),装了纯亏(P1 排除项)。

### 安装方式(命中 Step 2.5 A 级判定后,一次性,用户确认)

> 仓库已 clone 至 `Tool/codebase-memory-mcp-pro/`(仅 lean 参考面入 git;`internal/`+`vendored/` 共 ~1.1G 生成的 grammar 已 .gitignore)。**安装实际运行体有三条路**,按需选:

```bash
# 方式 A(首选)— npx 零本地构建,上游 codebase-memory-mcp 0.8.1,stdio
#   无 curl|bash 供应链暴露;新项目最省事。缺 win4r fork 的 explore 一击工具/blast-radius depth。
npx -y codebase-memory-mcp        # 或 uvx codebase-memory-mcp (pypi 同名)

# 方式 B(要 fork 增强)— 从 Tool/ 已 clone 的 win4r fork 构建(需 C 编译器 + zlib)
cd Tool/codebase-memory-mcp-pro && ./scripts/build.sh   # → build/c/codebase-memory-mcp

# 方式 C(上游一行装,第三方脚本)— 装前与用户确认信任(security skill 供应链告警)
curl -fsSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash
```

| 方式 | 运行体 | explore/fork 增强 | 供应链暴露 | 适用 |
|------|--------|------------------|-----------|------|
| A npx/uvx | 上游 0.8.1 | ✗ | 低(npm/pypi) | 默认,新项目即用 |
| B 本地构建 | win4r fork | ✓ | 低(已 clone 源码) | 需 explore/blast-radius depth |
| C curl\|bash | 上游 latest | ✗ | 中(裸脚本) | 不推荐,仅 A 不可用时 |

### 注册 MCP(Claude 执行)
- **项目级(推荐)**:复制 `Agent/mcp/profiles/codebase-memory.mcp.json`(已配 npx)到目标项目根 `.mcp.json`。
- **全局级**:`claude mcp add --scope user`(参照 ERR-009,**不能**手写 `~/.claude/.mcp.json`)。方式 B 构建则把 command 改成 `build/c/codebase-memory-mcp` 绝对路径。

### 首次使用(命中 Step 2.5 后,在目标代码项目内)
```text
1. index_repository      # 对当前代码项目建图(首次,Linux 内核级 28M LOC ~3min)
2. get_architecture      # 架构/语言/热点/死代码总览
3. explore / trace_path  # 影响半径 + 调用链
```
- 后台 watcher 会按 git 轮询增量重建索引;**离开该项目或任务结束后**,确认 watcher 不必要常驻则停用,避免资源空耗。
- 数据落 `~/.cache/codebase-memory-mcp/`,可选 `.codebase-memory/graph.db.zst` 快照随项目仓库共享(**该快照属目标项目,不入 toolBox**)。

### 安全 / 治理约束
- 第三方二进制经 `curl|bash` 安装 → 安装前向用户确认信任来源(security skill 供应链告警)。
- 索引产物只落目标代码项目与 `~/.cache/`,**禁止**在 toolBox 根目录或五层内散落任何 codebase-memory 文件(配置模板除外,已在 `Agent/mcp/profiles/`)。

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
| codebase-memory(按需) | `/Users/jackliu/toolBox/Agent/mcp/profiles/codebase-memory.mcp.json` |
