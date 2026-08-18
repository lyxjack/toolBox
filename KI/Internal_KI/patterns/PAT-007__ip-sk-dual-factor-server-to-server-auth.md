---
id: PAT-007
type: pattern
title: "Server-to-Server 通道：IP 白名单 + sk 双因子鉴权（Express middleware factory）"
status: active
created: "2026-05-17"
tags:
  - "pattern/backend"
  - "pattern/security"
  - "engine/express"
  - "language/typescript"
  - ki/pattern
complements:
  - "[[SEC-001__trust-proxy-and-ipv4-whitelist-combo|SEC-001]]"
related:
  - "[[SEC-001__trust-proxy-and-ipv4-whitelist-combo|SEC-001]]"
  - "[[PAT-008__mongo-duplicate-key-driven-idempotency|PAT-008]]"
trigger_condition: "user_explicit"
aliases:
  - "PAT-007"
  - "IP-sk-dual-factor-auth"
---

# Server-to-Server 通道：IP 白名单 + sk 双因子鉴权

## 适用场景

合作方 B 的后端调用我方 API（**无用户 session**，纯 server-to-server）：
- 合作方提供他们的后端**出口 IP**（IPv4 / CIDR）
- 双方线下交换 **shared secret key (sk)**，不入 git / 聊天 / 日志
- 我方在两层鉴权（IP + sk）任一不过即 fail-closed，不放行
- 没有时间戳/签名层（IP + sk 双重已够强；若 sk 泄露风险高则后续再加 HMAC）

**典型业务**：滚子小程序后端调三消 `/api/parent/*`、CRM → ERP 直连、广告平台回调。

## 步骤

1. **env 校验 fail-fast**（Zod）：
   ```ts
   PARENT_API_SK: z.string().trim().min(16),
   PARENT_API_ALLOWED_IPS: z.string().min(1)
     .transform(csv => csv.split(',').map(s=>s.trim()).filter(Boolean))
     .pipe(z.array(z.string()).min(1)),
   ```
   缺失 / 长度不够 / 空白白名单 → 启动即 `process.exit(1)`。

2. **factory 中间件**（与现有 `createAuthMiddleware(sessionStore)` 同形）：
   ```ts
   export function createParentApiAuthMiddleware(
     allowedIps: readonly string[],
     sk: string,
   ): RequestHandler { /* ... */ }
   ```
   boot 时一次性解析白名单条目（CIDR 转 `{network, prefix}`），运行时只做 O(N) 匹配。**boot 阶段抛错 = fail-closed**。

3. **第一层 IP 白名单**：IP 层取值（trust proxy）与 Nginx 配套规则、CIDR/v4-mapped/纯 IPv6 处理见 [[SEC-001__trust-proxy-and-ipv4-whitelist-combo|SEC-001]]；本实现 normalize 后做 32-bit int 比较。

4. **第二层 sk 用 `crypto.timingSafeEqual`**：
   ```ts
   const headerBuf = Buffer.from(req.header('x-api-key') ?? '', 'utf8');
   const skBuf = Buffer.from(sk, 'utf8');
   const ok = headerBuf.length === skBuf.length && timingSafeEqual(headerBuf, skBuf);
   ```
   - 长度不一致 → 直接返回 false，**不要把短 buf 抛 RangeError 出去**（暴露长度信息）
   - 用 `try/catch RangeError` 兜底，统一返回 401 `AUTH_INVALID_KEY`

5. **失败日志卫生**：仅记 `req.ip` + path + 错误码；**永远不要 log header 中的 sk 值**（即使错误 sk 也别打）。

6. **可选挂载**：把 controller + middleware 做成 `RouteDependencies` 的 `optional`，
   conditional mount：
   ```ts
   if (parentApiController && parentApiAuthMiddleware) {
     app.use('/api/parent', createParentApiRoutes(...));
   }
   ```
   这样 legacy e2e harness 不传时不挂载，不会 crash on `Router.use(undefined)`。

## 反模式

| 错误做法 | 正确做法 | 关联错误 |
|---------|---------|---------|
| `sk === providedKey`（== 比较） | `crypto.timingSafeEqual` | 时序攻击 — 暴露 sk 字符匹配进度 |
| 把 sk 长度差异作为 401 子分类 | 长度不一致 → 直接同 401（同消息） | 长度 oracle |
| 信任 `req.ip` 不配 trust proxy | `app.set('trust proxy', true)` 在所有中间件之前 | 全部请求 IP = Nginx loopback，白名单失效 |
| middleware factory 内 try-throw 启动 | boot 阶段抛 = fail-closed 设计意图，正确 | 静默放行 fail-open |
| 把 sk 占位值（"changeme"）commit 进 .env.example | env.example 用 `<TO_BE_PROVIDED>` 占位，sk 实际值线下交付 | 弱 sk 默认值泄露 |

## 关联错误

- [[ERR-001__unhandled-rejection|ERR-001]] — middleware async 路径要 `try/catch` 透传到 `next(err)`，不要 promise 漏掉

## 实现参考

- `server/src/middleware/parentApiAuthMiddleware.ts`（kingDianPuzzle, commit `d95b73c`）
- 单测：`server/src/__tests__/unit/parentApiAuthMiddleware.test.ts` 16 cases 覆盖单 IP / CIDR / v4-mapped / 缺 sk / 错 sk / 长度差 / fail-closed 顺序
- 跨平台原始需求：`.in-process/active/20260512-212801/parent_platform_integration_brief_v2.md`
