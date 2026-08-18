---
id: ERR-116
type: error
errorCode: ERR-116
severity: high
status: resolved
recurrence: 1
firstSeen: "2026-07-16"
tags:
  - ki/error-book
  - error
  - severity/high
  - domain/security
  - domain/distributed
  - language/python
prevention:
  - "凡请求负载内嵌'由凭证派生的身份副本'(如信封 task_context_id 镜像 Bearer 内 tctx),该副本必须与**本次请求所用凭证**由同一次快照派生——投递时刻取一次令牌,头与负载都从它派生;禁止在任务开始时预取身份再长期复用"
  - "凭证会续期的客户端,长任务/大批量必然跨过续期点:设计评审时问一句'这个凭证 TTL 内跑得完吗?跑不完时负载里的身份副本跟得上吗?'"
  - "同根因的两个形态都要测:双实例二次获取(空间维,T7)与单实例跨时间重签(时间维,本条)——修了一维不等于修了另一维;回归测试用'每次取令牌都铸新身份'的极限合成服务端,一次覆盖两维"
mem_ref: null
mem_status: "unavailable"  # 会话属 Claude Code REQ-20260716-032433,claude-mem observation id 待 session 归档后回填(contract § 3.8 降级形态)
related:
  - "Error_Book/entries/ERR-037__deploy-topology-wiring-gap-silent-under-green-health.md"
aliases:
  - "ERR-116"
  - "tctx-renewal-desync"
---

# 负载内嵌身份副本与验签凭证跨续期脱节:403 identity_mismatch

## 错误现象

员工A 首次大回填真实 Codex 会话(2026-07-16,Mini 真机):1343+ 事件 accepted 后,尾部整批被拒,客户端日志 `sec1.auth_failed status=403 body={'error': 'identity_mismatch'}`。服务端 task_context 表显示采集中途(10:07→10:15)铸出了新 task_context_id。

## 根因

事件信封的 `task_context_id` 在 `run_from_env` 开跑时经 ctx_factory **一次性固定**;而认证头的 TCT 令牌按剩余寿命自动重签(TTL 900s/margin 60s),重签会铸**新的** task_context_id。长采集跨过续期点后:信封=旧 tctx,Bearer=新 tctx → ingestion D12 逐字段交叉核对必拒。

**与 T7(同项目 2026-07 早些时候)同根因不同维**:T7 是两个 TctTokenSource 各换发一次(空间维);本条是同一个 source 跨时间重签(时间维)。修了空间维不自动覆盖时间维。

## 修复

pin-per-request(REQ-20260716-032433):每次投递只取一次令牌快照,Bearer 头与信封 tctx 都从同一次 `source.token()` 派生(`_TctxSyncedPoster` + `pinned_auth_header_provider`)。客户端单线程,post 内无第二次取令牌 → 恒等无竞态。服务端 D12 语义不动。

## 验证

- 回归:合成服务端 ttl=0(每次取令牌都铸新 tctx)——修复前 8/8 403(与真机同款),修复后 0 错配全收(tests/test_tctx_renewal_sync.py)。
- 沙盒部署形态:zip→3.9 venv→install --probe→cron 同形 run-collector.sh,**723 次续期/723 个全新 tctx/720 事件 0 错配全收**,重跑幂等。

## 关联

同 REQ 族的语义保真教训见 [[ERR-117__synthetic-double-models-imagined-not-actual-semantics|ERR-117]]（合成端建模必须对齐真实服务分支——本条的回归用合成端 ttl=0 极限恰是其正确用法示范）。
