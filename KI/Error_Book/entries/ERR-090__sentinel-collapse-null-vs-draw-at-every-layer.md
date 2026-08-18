---
id: ERR-090
type: error
errorCode: STATE-3VAL-001
severity: medium
status: resolved
recurrence: 1
firstSeen: "2026-08-02"
tags:
  - ki/error-book
  - error
  - severity/medium
  - domain/data-design
  - domain/guandan
prevention:
  - "**『还没有结果』(null) 与『结果是平/零』(-1/0) 是两个语义，任何一层都不许压成一个值**。本案 winnerTeam: null(未终局滚存档) 被 `== null ? -1` 压成平局——用户看到自己打了一半的对局显示『平』，agent 还照着这误报向用户报过一次『平局档』"
  - "**修 sentinel collapse 必须全链 grep 归一化点**：第一轮只修了存储层(listReplaySummaries)，网页两个入口(makeServerEntry/makeLocalEntry) 各自还有一份同样的 `?? -1`——同一压缩逻辑在层间会复制粘贴繁殖，修一处必查全部 `== null ?` / `?? ` 归一化位点（本案即为 recurrence=1 的由来：同一 session 内二犯）"
  - "**弱类型下用类型注释顶住**：`winnerTeam: number | null` 写进接口类型（strict:false 抓不住，但给下个读代码的人立牌）；三态语义在字段注释里写死：null=未完 / -1=平 / 0,1=胜方"
ci_rules: []
mem_ref: b36d3553-ef1f-4e33-9c49-65f1bab40f34
mem_status: linked
req_ref: REQ-20260801-205151
related:
  - "Error_Book/entries/ERR-089__archive-keyed-by-internal-id-user-sees-another.md"
  - "Error_Book/entries/ERR-068__fault-tolerance-path-untested-happy-path-only.md"
aliases:
  - ERR-090
  - sentinel-collapse
  - 未终局误报平局
---

# 三态压二态：null(未完) 被折叠进 -1(平局)，且修一层复发一层

## 错误现象

滚存中的回放档 `result.winnerTeam=null`（整场还没打完）。列表链路把它压成 `-1` 后与真平局共用「平」文案——用户打到一半的对局在清单里显示「平局」。Codex 终审(BHV-001)首次揪出、修了存储层；**增量审计又发现网页两个清单入口各有一份同样的压缩**，同 session 内二犯（recurrence=1）。

## 根因分析

写 `winnerTeam == null ? -1 : ...` 时把「缺值」当「默认平」处理——因为 UI 恰有「平」文案可复用，语义就被顺手合并了。且这类归一化代码在层间复制传播（server 摘要、网页 server 入口、网页本地入口三处），修复没有 grep 全链。

## 解决方案

三层全部保真传递 null；`winShort` 四态：0=红胜/1=蓝胜/-1=平/null=「未完」；整场横幅在档末按 result 补发（固定把数模式事件流无 episode-over），-1 出灰色平局横幅。实证：滚存中档显「未完」，类型改 `number | null`。

## 预防规则

见 frontmatter。一句话：**null 是第三态不是默认值；修折叠必 grep 全链归一化点。**

## 关联

- [[ERR-089__archive-keyed-by-internal-id-user-sees-another|ERR-089]] — 同一 REQ 的姊妹案：那条是标识符选错，本条是状态语义压错，母题都是「数据语义在层间保真」
- [[ERR-068__fault-tolerance-path-untested-happy-path-only|ERR-068]] — 为什么活到现在：未终局档只在「打到一半去看列表」才出现，快乐路径测试永远遇不到
