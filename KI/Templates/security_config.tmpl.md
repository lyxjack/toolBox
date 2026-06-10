---
id: "SEC-{NNN}"
type: security_config
topic: "{env-variables | ssh-hosts | db-permissions | api-keys | yml-secrets | ...}"
scope: "{project | environment | global}"
risk_level: "{critical | high | medium | low}"
status: "{active | rotated | deprecated}"
created: "{YYYY-MM-DD}"
last_audited: "{YYYY-MM-DD}"
anchor_ref: "KI/External_KI/skills/security/security.md"
tags:
  - security
  - config
  - ki/internal
related: []  # wiki link 数组，可空；冷启动时允许 0 引用（加 bootstrap: true）
aliases:
  - "SEC-{NNN}"
mem_ref: "{content_session_id | null}"  # claude-mem 双向关联：产出本条的 session（sdk_sessions.content_session_id）；降级时 null
mem_status: "{linked | unavailable}"    # linked=写入时已验证存在；unavailable=claude-mem 不可用（降级，不阻塞）
---

# {安全配置标题：覆盖哪类敏感配置}

## 主题 / Topic
{配置类别简述：是 ENV 变量、SSH host 别名、DB 角色权限、API Key、还是 YAML secrets？}

## Scope
- 影响 service：{service-A, service-B}
- 影响环境：{dev | staging | prod}
- 影响人员/角色：{developer | ops | external partner}

## 风险等级理由
{为何标 critical/high/medium/low：泄露后影响面、可逆性、合规约束}

## Mitigations
1. **密钥轮转策略**：{周期、触发条件、责任人}
2. **最小权限**：{具体角色 → 资源的精确授权清单}
3. **审计与告警**：{日志接入、异常访问检测、报警渠道}
4. **存储与传输**：{加密算法、KMS / Vault 路径、传输 TLS 要求}

## 安全约束（⚠️ Reminder）
> **本文件不存储实际密钥值，只存储语义、流程、依赖关系。**
> - 严禁粘贴明文密钥、token、私钥、连接串密码
> - 引用 secret 时只写 vault path / env var name（如 `$DB_PASSWORD` 或 `vault://prod/db/main`）
> - 发现误提交立即按 [[ERR-{NNN}__slug|ERR-{NNN}]] 流程处置

## 关联 Anchor
- [[security|External_KI security Anchor]] — 跨项目通用安全 skill 索引

## Cross-References
- [[SEC-{NNN}]] — 相关配置
- [[ERR-{NNN}__slug|ERR-{NNN}]] — 历史泄露事故
- [[PAT-{NNN}__slug|PAT-{NNN}]] — 推荐安全模式
