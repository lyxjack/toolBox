---
id: ERR-118
type: error
errorCode: ERR-118
severity: medium
status: resolved
recurrence: 1
firstSeen: "2026-07-17"
tags: [ki/error-book, error, severity/medium, domain/database, language/typescript]
prevention:
  - "凡文本列带 btree 索引(或唯一约束),其**生成端**必须有字节界(btree 行上限 2704B;中文 3B/字):派生键(签名/摘要/归一化文本)用『截断+全文短哈希后缀』既有界又保区分度"
  - "字段上界审计要覆盖『派生列』:schema 上界(zod max)只护直接字段,由函数生成的签名/键类列容易漏"
  - "真实数据体量测试(长中文粘贴日志)是暴露此类上界缺口的唯一可靠途径——合成小样本永远绿"
mem_ref: null
mem_status: "unavailable"
related:
  - "Error_Book/entries/ERR-116__payload-embedded-identity-desyncs-from-credential.md"
  - "Error_Book/entries/ERR-117__synthetic-double-models-imagined-not-actual-semantics.md"
aliases: ["ERR-118", "btree-unbounded-derived-key"]
---

# 被索引文本列无生成端字节界:btree 行上限 2704B 落库炸

## 现象
员工A 真实会话蒸馏落库:`index row size 4840/5328/4080 exceeds btree version 4 maximum 2704 for "ix_reasoning_signature"`,4 会话死信。problem_signature=框定文本 canonical 归一化,长中文框定 4-5KB 无界直入索引列。

## 修复
REQ-20260716-174932 T5:problemSignature 出口 1600B 界=前1576B(UTF-8 安全截断)+'#'+全文 sha256 前16hex。短签名逐字节不变;长签名有界且同前缀不同尾部可区分。

## 关联

"合成小样本永远绿、真实体量数据才暴露缺口"与 [[ERR-041__idealized-synthetic-test-data-masks-model-blindspot|ERR-041]] 同族；派生键生成端纪律的上游语义教训见 [[ERR-117__synthetic-double-models-imagined-not-actual-semantics|ERR-117]]。
