---
id: SEC-003
type: security_config
topic: dev-plaintext-data-plane-loopback-default
scope: kds-game-gd 生产进程内的 dev 回放查询面（gdReplayHttp, 默认端口 7815）
risk_level: high
status: active
created: "2026-08-02"
anchor_ref: "KI/External_KI/skills/security/security.md"
tags:
  - ki/internal
  - security
  - config
  - risk/high
mem_ref: b36d3553-ef1f-4e33-9c49-65f1bab40f34
mem_status: linked
related:
  - "Internal_KI/security/SEC-001__trust-proxy-and-ipv4-whitelist-combo.md"
  - "Internal_KI/patterns/PAT-041__event-sourced-replay-record-retrieve-review-pipeline.md"
aliases:
  - SEC-003
  - 明牌面回环默认
---

# dev 明牌数据面：默认回环绑定 + 显式开放边界

## 风险场景

游戏服进程内置的回放查询 HTTP 面无鉴权、CORS `*`，其中 `/api/gd/replay/getfull` 返回**含牌局种子与四家手牌原文**的完整档。首版默认 `0.0.0.0:7815`——部署即把明牌数据裸铺到所有网卡（Codex 增量审计判高危：「只读不等于无数据泄露风险」，且与存储层「生产不存在此 HTTP 面」的注释自相矛盾）。

## 配置定案

| 项 | 值 | 理由 |
|---|---|---|
| 监听地址默认 | `127.0.0.1`（`GD_REPLAY_HTTP_HOST` 显式改 `0.0.0.0` 才开放） | 敏感数据面的开放必须是**显式决策**，不是部署副作用 |
| 端口 | `GD_REPLAY_HTTP_PORT`（默认 7815；`0`=彻底禁用；非法值只记日志跳过启动） | 非法端口曾会同步抛穿带崩游戏服（`listen` 的 ERR_SOCKET_BAD_PORT 是同步异常，`srv.on("error")` 接不住）——先整数范围校验再 listen+try |
| 远程访问推荐路径 | SSH 端口转发（`ssh -N -L 7815:127.0.0.1:7815 user@host`） | 不改服务器任何配置即可用，交接文档默认方案 |
| 确要开放时 | 防火墙/安全组来源限定办公网段；绝不对公网 | 面上无鉴权，网络层是唯一防线 |
| 请求防线 | 只读三路由；请求体 64KB 硬闸（destroy 后 end 回调仍会执行，须标志位在 end 首行拦——实测事件序 data→destroy→aborted→end）；文件 ID 整串白名单正则挡穿越 | |

## 通用规则

1. **含敏感原文的 dev 数据面，默认作用域 = 最小（回环）**；「方便同事」永远通过显式配置+网络防线达成。
2. **进程内嵌 dev 设施的失败模式必须与宿主解耦**：一切启动/运行异常只记日志——dev 面缺席可以接受，拖垮生产进程不可接受。
3. 开放边界写进交接文档（⚠️ 标注需人类确认），不让下一个部署者靠猜。

## 关联

- [[SEC-001__trust-proxy-and-ipv4-whitelist-combo|SEC-001]] — 同为「网络边界即安全边界」：那条是入站信任链配置，本条是数据面暴露面
- [[PAT-041__event-sourced-replay-record-retrieve-review-pipeline|PAT-041]] — 本配置所属的完整管线
