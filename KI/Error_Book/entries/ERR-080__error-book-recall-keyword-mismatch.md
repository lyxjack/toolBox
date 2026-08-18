---
id: ERR-080
type: error
errorCode: BHV-011
severity: critical
status: open
recurrence: 0
firstSeen: "2026-07-28"
tags:
  - ki/error-book
  - error
  - severity/critical
  - domain/agent-discipline
  - domain/knowledge-recall
  - errorCode/BHV-011
prevention:
  - "召回检索词必须按**故障现象 / 工具动作**取，不能按**任务名词**取。错题本条目标题写的是根因术语（`png-texture`/`stale-preview-chunk`/`hidden-tab-blackscreen`），用『素材』『资源』这类任务名词检索恒不命中——本案三条已记录错误因此全部漏召回"
  - "召回不是只在动手前做一次。**排查故障时同样必须召回**：黑屏/加载不出/修复无效/工具报成功但没生效，这些现象本身就是检索词。本案排查黑屏耗时逾半小时，而 ERR-066 早已把结论与修法写全"
  - "单次检索无命中 ≠ 库里没有。至少换三组词再判定：①故障现象（黑屏/不回调/返回 0）②工具动作（import/loadDir/refresh/preview）③领域名词（png/bundle/spriteFrame/chunk）"
  - "同一作业内复犯 ≥1 条已记录错误 = 召回环节失效的硬信号，必须当场复盘检索词，不能只修这次的 bug 就过"
ci_rules: []
mem_ref: 019fabca-96bf-7980-8352-ae25d87e91bd
mem_status: linked
related:
  - Error_Book/entries/ERR-079__png-import-texture-type-spriteframe-missing.md
  - Error_Book/entries/ERR-065__external-file-edit-no-recompile-stale-preview-chunk.md
  - Error_Book/entries/ERR-066__hidden-tab-raf-freeze-engine-boot-blackscreen.md
  - Error_Book/entries/ERR-034__cocos-mcp-server-161-property-whitelist-and-tool-gaps.md
aliases:
  - ERR-080
  - recall-keyword-mismatch
  - 召回失效
---

# 错题本召回按"任务名词"检索 → 一轮作业连犯三条已记录错误

## 错误现象

2026-07-28 美工切图入库 + 手牌接线一轮作业内，**复犯三条早已在库的错误**，每条都独立耗掉可观排查时间：

| 复犯条目 | 已记录内容 | 本轮实际付出 |
|---|---|---|
| [[ERR-034__cocos-mcp-server-161-property-whitelist-and-tool-gaps\|ERR-034]] #5 | MCP 导入 png 默认 texture 类型，需改 sprite-frame | 入库验收出具"全 PASS"假结论；用户追问"没看到新样式"才暴露；见 [[ERR-079__png-import-texture-type-spriteframe-missing\|ERR-079]] |
| [[ERR-066__hidden-tab-raf-freeze-engine-boot-blackscreen\|ERR-066]] | 隐藏标签冻结帧驱动 → 引擎挂死纯黑屏，窗口置前即自愈 | 黑屏排查逾半小时，逐层试过重开场景、重导入资源、改 URL、清缓存、换 origin，最后才测出 `visibilityState: hidden` |
| [[ERR-065__external-file-edit-no-recompile-stale-preview-chunk\|ERR-065]] | 外部工具改 .ts 编辑器不重编译，preview 吃旧 chunk | 一度以为代码没生效，反复刷新验证 |

用户当场质问："这个不是在错题本里吗？为什么还会再犯？"

## 根因分析

**知识在库，检索不到。** 三条全部漏召回，根因是**检索词的取词维度错了**：

| | 臣用的检索词 | 条目实际关键词 | 是否命中 |
|---|---|---|---|
| 取词维度 | **任务名词**（我在做什么） | **根因术语**（错在哪儿） | ✗ |
| 实例 | `素材`、`资源` | `png-texture`、`sprite-frame`、`MCP 工具白名单` | ✗ |
| 实例 | （排查黑屏时**根本没检索**） | `hidden-tab`、`blackscreen`、`rAF` | ✗ |

两条具体病灶：

1. **取词维度错**。臣按"我在做的任务"取词（入库素材 → 搜"素材"），而错题本条目的标题与 tag 按"错误的根因"命名（`png-import-texture-type`）。两个词空间几乎不相交，检索必然落空。ERR-064 能命中纯属侥幸——它正文里恰好出现了"素材"二字。

2. **召回时机窄**。臣把召回理解成"动手前的一道前置门禁"，做完入库前那次召回就以为尽到义务。**排查阶段完全没有再召回**——而黑屏、加载不回调、修复无效这些现象，恰恰是错题本最擅长回答的问题。ERR-066 里连"osascript 抬窗"的修法都写了，臣却从零重推了一遍。

元层面看，这与 [[ERR-069__cocos-mcp-tool-quirks-collection|ERR-069]] 的"success≠生效"同构：**执行了召回动作 ≠ 完成了召回**。单次检索无命中就判定"库里没有"，是把动作当成了结果。

## 解决方案

**取词三组，缺一不可。** 任何一次召回都按三个维度各取一组词，全部无命中才判定"库里没有"：

| 维度 | 取词方式 | 本案正确示例 |
|---|---|---|
| ① 故障现象 | 用户/日志看到的表象 | `黑屏`、`不回调`、`返回 0`、`加载失败` |
| ② 工具动作 | 正在调用的工具与 API | `import`、`loadDir`、`refresh`、`preview`、`spriteFrame` |
| ③ 领域名词 | 涉及的资产/模块类型 | `png`、`bundle`、`chunk`、`meta` |

**召回时机扩到两处**：
- 动手前（已有规则，保持）
- **排查中**（新增）：一旦出现"看不懂的现象"就先检索，把现象词直接当检索词。判据很简单——如果臣正在"从零推断一个环境类故障的原因"，那就该先查库。

**复犯即复盘**：同一作业内复犯 ≥1 条已记录错误，当场停下来复盘检索词，把"本该命中却没命中"的词对补进该条目的 `aliases`，而不是只修完 bug 就过。本轮据此给 ERR-079 补了 `png-texture-not-spriteframe` 等别名。

## 预防规则

见 frontmatter。一句话：**按错误的样子检索，不按任务的名字检索；排查时也要查库，不只动手前。**

ci_rules 评估：本条约束的是 Agent 作业流程（检索词选取与召回时机），无代码/文件载体可供静态规则表达，留空。防护面在 CLAUDE.md 的知识召回章节与本条 prevention。

status 置 `open`（非 resolved）：改进措施是行为约束，须经后续作业验证确实不再复犯，才可转 resolved。

## 关联

- [[ERR-079__png-import-texture-type-spriteframe-missing|ERR-079]] — 本条导致的三起复犯之一，且是后果最重的一起（出具了假 PASS 结论）
- [[ERR-066__hidden-tab-raf-freeze-engine-boot-blackscreen|ERR-066]] — 复犯之二：条目已写全结论与修法，因排查阶段未召回而从零重推
- [[ERR-065__external-file-edit-no-recompile-stale-preview-chunk|ERR-065]] — 复犯之三：同属 preview 验收两道门，本轮两道门都重新踩了一遍
- [[ERR-034__cocos-mcp-server-161-property-whitelist-and-tool-gaps|ERR-034]] — 被漏召回的源条目；其"MCP 工具边界合集"式命名正是检索词不匹配的典型
- [[ERR-069__cocos-mcp-tool-quirks-collection|ERR-069]] — 同构母题「执行了动作≠拿到了结果」，本条是它在**知识召回**面的镜像
