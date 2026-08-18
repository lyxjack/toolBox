---
id: ERR-117
type: error
errorCode: ERR-117
severity: high
status: resolved
recurrence: 1
firstSeen: "2026-07-16"
tags:
  - ki/error-book
  - error
  - severity/high
  - domain/testing
  - domain/security
prevention:
  - "合成替身(fake server/stub)必须建模**现行服务端代码的语义**,不是你以为的语义:写替身前先通读真服务对应端点的全部校验分支(本例漏了 B2(b) session 属主绑定,只建了 D12),并显式列出'替身与真服务的行为差异清单'"
  - "真服务能低成本进程内起(fastify inject / buildServer)时,优先打真服务,不写替身——sec1.test.ts 真栈形态早已存在,沙盒却另造了阉割版合成端"
  - "端到端'全绿'结论必须标注验证对象:打的是替身还是真栈;替身绿≠真栈绿(ERR-041 的服务端语义版)"
mem_ref: null
mem_status: "unavailable"  # 归属 REQ-20260716-040939,claude-mem observation 待回填
related:
  - "Error_Book/entries/ERR-041__idealized-synthetic-test-data-masks-model-blindspot.md"
  - "Error_Book/entries/ERR-116__payload-embedded-identity-desyncs-from-credential.md"
aliases:
  - "ERR-117"
  - "stub-imagined-semantics"
---

# 合成替身建模想象语义而非现行语义:沙盒全绿掩盖真栈必炸

## 错误现象

REQ-20260716-032433 的沙盒自验(合成 ingestion)723 次续期 0 错配全绿;但同样的流量打真 ingestion 必然 403——真服务还有 B2(b):已存在 session 的事件必须匹配 session 首采时绑定的 task_context_id。合成端只建模了 D12(逐请求比对),漏了这个 session 级校验。员工A 真机随即以 80×session_owner_mismatch 暴露。

## 根因

写合成端时按"我理解的服务端语义"(D12)建模,没有通读真 server.ts 的全部拒收分支。替身与真服务的行为差集(B2(b))恰好是缺陷所在维度。[[ERR-041__idealized-synthetic-test-data-masks-model-blindspot|ERR-041]] 讲的是**数据**缺脏因素,本条是它的**语义**版:替身缺校验分支。

## 修复

REQ-20260716-040939:①服务端 B2(b) 属主等式收窄为 employee_id(缺陷本体);②验证形态改为真栈(真 TCS + 真 ingestion buildServer + 真 dev PG,fastify inject),不再使用自建合成端。
