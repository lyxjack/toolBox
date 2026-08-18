---
id: ERR-119
type: error
errorCode: ERR-119
severity: high
status: resolved
recurrence: 1
firstSeen: "2026-07-17"
tags: [ki/error-book, error, severity/high, domain/security, domain/dlp, language/typescript]
prevention:
  - "DLP 高熵启发式(无格式兜底)必须先豁免'非密钥的结构化 token':自造 ID(prefix_ULID)、内容摘要(sha256/hex)、紧凑JSON片段——否则在结构化/代码 payload 上灾难性误报,把整条内容脱成占位符"
  - "'字母+数字即高熵'这类直判是误报之源:改为实测校准的判据(真随机密钥 H≥4.95/元音比≤0.11 vs 代码标识符 H≤4.25/元音比≥0.30,阈值取中间),数据说话不拍脑袋"
  - "脱敏是**破坏性**的:上线前必须用**真实形态数据**验'过度脱敏率'(本例 3811 事件 0 干净才发现),且被脱敏的原文一旦落盘不可逆——过度脱敏=数据静默销毁"
  - "改动 DLP 过滤器必须红队双向门禁:真密钥各类(含URL query/fragment凭证)仍100%脱敏 + 代码/ID/路径全放行,两侧都钉死才算收敛正确"
mem_ref: "reasoning-flywheel"
mem_status: "linked"
related:
  - "Error_Book/entries/ERR-041__idealized-synthetic-test-data-masks-model-blindspot.md"
  - "Error_Book/entries/ERR-037__deploy-topology-wiring-gap-silent-under-green-health.md"
aliases: ["ERR-119", "dlp-over-redaction"]
---

# DLP 高熵启发式过度脱敏结构化 payload:知识产出被静默掐死

## 现象
接真模型(MiniMax)蒸馏员工A会话,模型回"内容已脱敏,无法获取实际交互"。统计:员工A 3811 归档事件
**全脱光2221/部分1590/干净0**。归档脱敏把 Codex 的紧凑JSON/命令/文件名/我方ULID 全脱成 [REDACTED_SECRET]。

## 根因
@keep/guards looksLikeHighEntropyToken 的"字母+数字即真"直判(在字符集正则之前),对 24+ 字符混大小写数字
的无空白 token(ULID evt_/sess_、转义JSON、base64工具参数)全部命中。归档双层脱敏后 reasoning-distill/
compile 读到的是占位符汤 → 知识产出全线空转。是 [[ERR-041__idealized-synthetic-test-data-masks-model-blindspot|ERR-041]](合成数据盲区)的"真实数据版反向":真实数据
才暴露误报,合成小样本从不触发。

## 修复(REQ-20260717-181925)
收敛 looksLikeHighEntropyToken:①豁免结构化ID/摘要;②熵≥4.5前移为字符集无关强信号(保 F-B2-1 URL凭证
入口);③删"字母+数字即真"与冗余 caseAlternations;④元音比判据分离驼峰(0.30)vs密钥(≤0.11)。
红队18用例双向钉死;guards 73/73、全仓 771/771;部署 ingestion+worker,真机验证:命令归档可读、sk-/URL#blob
仍脱敏。**员工A已销毁的3811事件不可逆,需重采恢复。**
