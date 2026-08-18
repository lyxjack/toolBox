---
id: "SEC-002"
type: security_config
topic: "dlp-third-party-llm-exfil"
scope: "project"
risk_level: "high"
status: "active"
created: "2026-07-07"
last_audited: "2026-07-07"
anchor_ref: "KI/External_KI/skills/security/security.md"
tags:
  - security
  - config
  - "risk/high"
  - "topic/dlp"
  - "topic/third-party-llm"
  - ki/internal
related:
  - "[[ERR-032__bulk-data-through-llm-context-token-bomb|ERR-032]]"
  - "[[PAT-012__mcp-out-of-process-json-pipeline|PAT-012]]"
aliases:
  - "SEC-002"
  - "dlp-secret-exfil-third-party-llm"
mem_ref: "a98db73c-c056-43f2-a011-01f1abb37bcd"
mem_status: linked
---

# DLP → 第三方 LLM 数据外泄边界(模式匹配是硬安全边界,漏检=真外泄)

## 信任边界

系统把员工代码/会话内容送 LLM 前先 DLP 脱敏。当 LLM 是**第三方**(如 MiniMax,数据出境第三方)时,**DLP 漏检 = 真密钥直接外泄给第三方**——这是不可回收的高危面,不是"尽力而为的锦上添花"。KEEP 有两条数据出口都靠同一个 `@keep/guards.redactText`:
1. **采集落盘**:`raw-archive.ts` 明文文件(`redactSecrets(sanitizeForStore(t))`)。
2. **发前**:reasoning 蒸馏 `gateway-distiller.redactSecrets(t)=redactText(t).text`,每次 fetch 前必跑,之后内容才出境到 MiniMax。

## 红队方法:canary,绝不用真密钥

测"密钥是否外泄"**绝不能拿真密钥测**(那本身即外泄)。用 **canary**:格式合法、能触发 DLP 模式、但是编造的假值(`AKIAIOSFODNN7EXAMPLE`、`sk-ant-` 假串、假 PEM 块…),每条内嵌唯一哨兵子串便于全库/全文 grep 是否漏出。对**每条出口** × **每种密钥格式**建命中/漏检矩阵。发前那条优先**探测部署的 redactText 函数**(esbuild 打同源 src 成 probe,零第三方暴露),而非真发 MiniMax。

## F-B2-1(实测漏洞):URL 豁免过宽 → query/fragment 高熵凭证漏检

- **现象**:裸 `http(s)://host/path?sig=<高熵串>` 里的**不透明高熵凭证**(session/opaque bearer/签名 URL token)被 DLP 放行 → 落 raw-archive 明文 + 原文发 MiniMax。命名格式密钥(sk-/ghp_/AKIA/PEM/password/JWT)嵌 URL 仍红act,不受影响。
- **根因**:URL 豁免(本意:不把正常无凭证链接整段误红)判"整 token 是 `^https?://\S+$` 且**只** HIGH_ENTROPY 命中 → 跳过",把 query/fragment 里的高熵值一起豁免了。
- **修法(关键)**:URL 无 `?`/`#` 才直接豁免;有 query/fragment 时按结构分隔符 `[?#&=;]` 切段、**任一段高熵→不豁免整 token 红act**。分隔符**刻意不含 base64 字母 `+-_/`**,防止把凭证切碎成 <24 位子段而漏检。
- **反直觉点(值得记)**:高熵检测扫的是**整个 token**,连 `github.com/acme/web/issues/482` 都命中 HIGH_ENTROPY(今天不被误红全靠这个豁免)。所以"含 `?/#` 就不豁免"的简单版会**误伤合法带 query 的链接**;必须切段逐段判——良性 query 各段(`page`/`2`)短且低熵不触发,`?sig=<blob>` 值段必触发。

## 泛化预防规则

1. 任何"脱敏后发第三方 LLM"的链路,DLP 是**硬安全边界**,须 canary 红队(两侧出口 × 多格式矩阵);上线前必做。
2. **安全豁免启发式要精确到"哪一段"**,别对复合结构(URL/JSON/日志行)整体豁免——豁免范围越宽,漏检面越大。
3. 高熵/结构启发式是 best-effort:命名格式密钥有专门模式(强),不透明高熵靠兜底(弱,极低熵变体理论可滑过)——文档化这个残余,别当"全覆盖"。
4. 第三方 LLM 集成的**成本护栏**(订阅 key 配额、MIN_AGE 触发频率)是另一面,见 [[ERR-032__bulk-data-through-llm-context-token-bomb|ERR-032]]。

## 关联

- [[ERR-032__bulk-data-through-llm-context-token-bomb|ERR-032]] — 第三方数据流的另一面(token/成本爆炸)
- [[PAT-012__mcp-out-of-process-json-pipeline|PAT-012]] — 取数侧 token 经济,与本条同属"数据经过第三方/LLM 的边界治理"
