---
id: "SEC-001"
type: security_config
topic: "ip-whitelist"
scope: "project"
risk_level: "high"
status: "active"
created: "2026-05-17"
last_audited: "2026-05-17"
anchor_ref: "KI/External_KI/skills/security/security.md"
tags:
  - security
  - config
  - "risk/high"
  - "topic/ip-whitelist"
  - ki/internal
related:
  - "[[PAT-007__ip-sk-dual-factor-server-to-server-auth|PAT-007]]"
aliases:
  - "SEC-001"
  - "trust-proxy-ipv4-whitelist-combo"
---

# trust proxy + IPv4 白名单：Nginx 后端 server-to-server API 的 IP 校验配套

## 主题 / Topic

Express 应用部署在 Nginx 反代后面，需要在应用层做 IP 白名单（用于 server-to-server API 鉴权层之一）。**两个配置必须配套**，缺一即白名单失效。

## Scope

- 影响 service：所有用 `req.ip` 做权限决策的 Express 应用（不止本项目）
- 影响环境：production（dev 单机时无 Nginx，本配置不触发）
- 影响人员/角色：后端、运维（Nginx 配置需要协同）

## 风险等级理由

**high**：
- 若 `app.set('trust proxy', ...)` 未配置 → `req.ip` 永远是 Nginx 内网 loopback（`127.0.0.1`）→ IP 白名单**全部 caller 都看似来自本机**，白名单形同虚设
- 若 Nginx 未透传 `X-Forwarded-For` → 应用即使配了 `trust proxy` 也拿不到真实 IP
- 若 `trust proxy` 配置过宽（如 `'loose'`） → 攻击者伪造 `X-Forwarded-For` 头绕过白名单
- 单点失效，无 fail-safe（鉴权失效用户感知不到）

## Mitigations

### 1. Express 端：`app.set('trust proxy', true)` 在所有中间件之前

```ts
export function createApp(deps: AppDependencies): Express {
  const app = express();
  // ── 0. Trust proxy ───────────────────────────────────────────────
  // 必须在 CORS / body parser / 其他读 req.ip 的 middleware 之前
  app.set('trust proxy', true);

  // ── 1. CORS / 2. JSON / ... ─────────────────────────────────────
}
```

**为何 `true` 而不是 `1` 或 `'loose'`**：
- `true` = 信任**第一跳**的 X-Forwarded-For（Nginx 已在 ALB/CDN 后面就改 `1` 或具体 IP）
- 项目当前只有 1 层 Nginx，`true` 足够；后续加 CDN 需 review

### 2. Nginx 端：透传 X-Forwarded-For

```nginx
location /api/parent/ {
  proxy_pass http://127.0.0.1:3000;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header Host $host;
}
```

**两个 header 都要设**：`X-Real-IP`（兜底）+ `X-Forwarded-For`（链路追加）。

### 3. 应用层：白名单只接 IPv4

- 当前实现的 IP 校验只支持 IPv4（含 `::ffff:` 前缀的 v4-mapped IPv6 已 normalize）
- 纯 IPv6 来源 → fail-closed 403
- 合作方明确给 IPv4 出口 IP；不接受 IPv6 列表
- 详见 [[PAT-007__ip-sk-dual-factor-server-to-server-auth|PAT-007]]

### 4. CIDR 写法支持

白名单 CSV 支持 `1.2.3.4`（单 IP）和 `1.2.3.0/24`（CIDR）两种格式：

```bash
PARENT_API_ALLOWED_IPS=203.0.113.42,10.0.0.0/24
```

CIDR `/0` 等同允许全部 —— **绝不能在生产用**，仅 dev / 测试。

### 5. 审计与告警

- 启动日志输出 `Parent API auth middleware initialised { whitelistCount: N }` —— 运维 grep 验证
- 403 `AUTH_IP_FORBIDDEN` 在 stderr → 接入告警（频繁触发 = 攻击 OR 配置漂移）
- 不打印 sk 头部值（即使错误）—— 见 [[PAT-007__ip-sk-dual-factor-server-to-server-auth|PAT-007]] 步骤 5

### 6. 部署 checklist

- [ ] Nginx 配置含 `proxy_set_header X-Forwarded-For`
- [ ] Express `createApp` 第一行 `app.set('trust proxy', true)`
- [ ] env `PARENT_API_ALLOWED_IPS` 至少 1 项且非 `/0`
- [ ] 应用 boot 日志出现 `whitelistCount` 与预期一致
- [ ] 用合作方真实出口 IP 做一次端到端测试（curl 直击三消域名）

## 安全约束（⚠️ Reminder）

> **本文件不存储实际密钥值或具体出口 IP**，只存储语义、流程、配套关系。
> - sk 值通过线下安全渠道交付，不入 git / 聊天
> - 实际白名单 IP 列表写入运维 vault，不在文档中固化

## 关联 Anchor

- [[security|External_KI security Anchor]] —— 通用 IP 白名单 / timing-safe compare 知识

## Cross-References

- [[PAT-007__ip-sk-dual-factor-server-to-server-auth|PAT-007]] —— 实现 IP+sk 双因子鉴权的 middleware factory，本配置是其前置依赖
- [[PAT-008__mongo-duplicate-key-driven-idempotency|PAT-008]] —— 同一 server-to-server 通道的幂等保护

## 实现参考

- `server/src/app.ts:42-48` —— `app.set('trust proxy', true)` 落点（kingDianPuzzle, commit `d95b73c`）
- `server/src/config/env.ts` —— `PARENT_API_ALLOWED_IPS` 解析
- `server/src/middleware/parentApiAuthMiddleware.ts` —— `normalizeIp` + CIDR 解析
- 集成测试用 `X-Forwarded-For: 1.2.3.4` 触发 IP block 路径：`integration/parentApi.test.ts` Auth suite
