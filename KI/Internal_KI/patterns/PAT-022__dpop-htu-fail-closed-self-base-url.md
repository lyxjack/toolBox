---
id: PAT-022
type: pattern
title: "DPoP htu 绑定 fail-closed:强制自身 base URL,决不回退客户端 Host 头"
status: active
created: "2026-07-07"
trigger_condition: user_explicit
tags:
  - ki/internal
  - pattern
  - trigger/user_explicit
  - topic/auth
  - topic/dpop
  - security
related:
  - "[[SEC-002__dlp-secret-exfil-to-third-party-llm|SEC-002]]"
  - "[[PAT-007__ip-sk-dual-factor-server-to-server-auth|PAT-007]]"
aliases:
  - PAT-022
mem_ref: "a98db73c-c056-43f2-a011-01f1abb37bcd"
mem_status: linked
---

# DPoP htu 绑定 fail-closed:强制自身 base URL,决不回退客户端 Host 头

## 适用场景

服务用 DPoP(或任何"proof 绑定到目标 URL/htu"的机制)做 SEC-1 验签时,服务端要构造"期望的 htu"来和客户端 proof 里的 htu 比对。**这个期望 htu 决不能用客户端可控的输入构造**——否则绑定形同虚设。首例:KEEP 的 ingestion/retrieval/gateway 三个 SEC-1 服务(B7/B9)。

## 反模式(漏洞)

```ts
const base = deps.selfBaseUrl ?? `http://${req.headers.host}`  // ❌ 回退到客户端 Host 头
const htu = `${base}${route.endpoint}`
```
未配 `selfBaseUrl` 时回退 `req.headers.host` → 攻击者对**自己控制的 htu** 签一个合法 DPoP proof、再发**配对的 Host 头** → 服务端用 Host 头构造出同样的 htu → 比对通过 → 绕过绑定。

## 正确模式

1. **`selfBaseUrl` 必填**(来自 env `KEEP_SELF_BASE_URL`)。缺失 = 部署配置错误 → **拒绝启动**(fail-closed),决不回退 Host 头。
2. compose 给每个此类服务显式接线 `KEEP_SELF_BASE_URL`,默认值 = **集群内服务 URL**(能干净启动、集群内调用正确)。外部客户端(经反代/外部入口)绑定的是外部可达 URL → 运维在 `.env` 覆盖为客户端实际使用的 base URL,否则外部请求 htu 不匹配全拒(这是正确的 fail-closed,不是 bug)。
3. **契约测试守护**:断言每个 SEC-1 服务在 compose 里都接了 `KEEP_SELF_BASE_URL` 且默认值是合法 URL——防止部署重建后漏配导致服务拒启动。
4. **测试**:red→green——不配 selfBaseUrl 时 buildServer 抛错(拒启动);配了之后,攻击者对自控 htu 签 proof + 配对 Host 头 → 仍 401、零副作用(证明 Host 操纵无效)。

## 反直觉点

fail-closed 的代价:外部客户端的 htu 基址是**拓扑相关**的(反代/外部入口 URL),集群内默认值对外部客户端是错的 → 真接入外部采集/员工前必须覆盖对应 `KEEP_*_SELF_BASE_URL`,否则"部署健康但外部 SEC-1 请求全 401"。这是有意的安全姿态,不是缺陷;须在上线清单里显式配。

## 关联

- [[SEC-002__dlp-secret-exfil-to-third-party-llm|SEC-002]] — 同属"信任边界:不信客户端可控输入"
- [[PAT-007__ip-sk-dual-factor-server-to-server-auth|PAT-007]] — 服务间认证的另一模式
