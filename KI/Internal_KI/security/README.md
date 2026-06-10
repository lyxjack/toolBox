# security/ — 安全权限类知识(Cat 4)

> **用户分类**: Cat 4 — 安全权限类(网络安全 / 用户权限 / 数据库安全 / ENV / YML / SSH)
> **契约**: 见 `KI/Internal_KI/contract.md` § Cat 4 章节

## 用途

存放**项目级具体安全配置笔记**,与 `KI/External_KI/categories/security.json` 的安全 Anchor metadata 形成互补:

- **External_KI/security Anchor** = 跨项目通用的安全 skill 索引(OWASP review / scanning / framework-specific security)
- **Internal_KI/security/** = 项目级具体配置(ENV 变量含义、YML 字段语义、SSH 主机信息、密钥旋转记录、权限矩阵)

两者通过 wiki link 交叉引用:Internal_KI/security 条目 frontmatter 加 `anchor_ref: KI/External_KI/skills/security/security.md`。

## 安全约束

⚠️ **本目录条目可能含敏感信息**(SSH 主机名、ENV key 名等)。
- **不写入**:实际密钥值、密码、API token、生产数据库连接串
- **可写入**:配置键名、键的语义、所在文件路径、轮转策略
- **示例**:`SECRET_AUTH_KEY=<在 .env 中,长度 64 字符,每季度轮转,所在文件 server/config/.env.production>`

## 文件命名

`{topic}.md`,topic 用 kebab-case,例如 `env-variables.md` / `ssh-hosts.md` / `db-permissions.md`。

## 模板

`KI/Templates/security_config.tmpl.md`

## 状态

P0 占位目录(2026-05-17 创建)。项目级填充为主(toolBox 自身无生产配置)。
