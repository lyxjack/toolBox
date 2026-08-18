---
id: ERR-088
type: error
errorCode: TEST-FIX-001
severity: medium
status: resolved
recurrence: 0
firstSeen: "2026-08-02"
tags:
  - ki/error-book
  - error
  - severity/medium
  - domain/testing
  - workflow/qa
prevention:
  - "**活数据目录不能直接当测试夹具**。验证脚本若以真实运行目录（replays/、logs/）为输入，必须把隐含假设显式化并防御：本案一晚被打破三次——①『目录里全是同一房号』被跨房新档打破；②『按房号轮询等新档』被归档键改制打破；③『同房必有两档（竞态用例）』被一场一号新常态打破。每次都是业务演进让旧假设失效，断言假红"
  - "**取数规则要按业务语义收敛**：选『已终局档』(winnerTeam!=null) 而非『最新档』（用户实时在打，最新档永远是滚存中的半成品）；竞态用例选『档最多的房』而非 items[0] 的房"
  - "**改前端代码后浏览器缓存旧 main.js 会制造同族假象**（验证对象根本不是所改代码）：复验一律硬刷新或加 ?v= 缓存戳；同理，改服务端后旧进程未重启也是『验证对象错位』——先核『跑的是不是新码』再谈结论"
  - "**假红出现先『验证验证器』**：一晚三次假红没有一次是产品缺陷；把验证脚本的输入假设当第一嫌疑人可省大量误修"
ci_rules: []
mem_ref: b36d3553-ef1f-4e33-9c49-65f1bab40f34
mem_status: linked
req_ref: REQ-20260801-205151
related:
  - "Error_Book/entries/ERR-117__synthetic-double-models-imagined-not-actual-semantics.md"
  - "Error_Book/entries/ERR-085__state-machine-stamped-gates-without-evidence-artifacts.md"
aliases:
  - ERR-088
  - fixture-drift
  - 活目录夹具漂移
---

# 拿活数据目录当测试夹具，业务一演进断言就假红

## 错误现象

回放查看器的两套验证脚本以真实 `replays/` 目录为输入。一晚之内三次全绿转假红，每次都不是产品缺陷：

| 次 | 被打破的隐含假设 | 打破者 |
|---|---|---|
| 1 | 目录里所有档案同一房号 | 无头探针生成了 90001 新房档 |
| 2 | 按房号 `_90001_` 轮询能等到新档 | 归档键从 roomID 改为 boxCode（新档键 100001） |
| 3 | 同一房号至少两档（连点竞态用例取 s[0]/s[1]） | 一场一号后新房恒一档，s[1]=undefined 抛错 |

外加同族第四例：改 main.js 后浏览器缓存旧脚本，三态修复「验证失败」——实际跑的根本不是新代码。

## 根因分析

夹具的本质是**受控输入**。活目录同时被用户实打、探针、smoke、归档制度演进四方写入，脚本写下时为真的环境断言没有任何机制保证持续为真；且脚本从不声明这些假设，破了只能靠逐条排查猜。

## 解决方案

取数规则按业务语义收敛（已终局档/档最多的房），假设写进注释；复验一律绕缓存；验证脚本收编进 `.in-process/scratch/` 并附 EVIDENCE.txt（命令+结果+代码 sha256），使「验证对象是什么」可追溯。

## 预防规则

见 frontmatter。一句话：**夹具要么受控，要么把选取规则写成对业务演进免疫的语义查询；假红先审验证器。**

## 关联

- [[ERR-117__synthetic-double-models-imagined-not-actual-semantics|ERR-117]] — 对偶命题：那条是假环境骗过验证（stub 过真栈挂），本条是真环境骗过验证（活数据漂移假红）
- [[ERR-085__state-machine-stamped-gates-without-evidence-artifacts|ERR-085]] — 证据可追溯性的同链条：EVIDENCE.txt 落盘正是其预防规则的延伸
