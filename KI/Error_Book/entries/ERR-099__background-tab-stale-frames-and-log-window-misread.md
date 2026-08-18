---
id: ERR-099
type: error
errorCode: OBS-CHAN-001
severity: medium
status: resolved
recurrence: 0
firstSeen: "2026-08-04"
tags:
  - ki/error-book
  - error
  - severity/medium
  - tool/claude-in-chrome
  - domain/observability
prevention:
  - "**后台标签页的截图不是现场, 是遗照**: Chrome 对 `visibilityState=hidden` 的页只停渲染(rAF),
    WebSocket 与游戏逻辑照常跑 —— 连拍三张『画面没动』只能证明渲染冻结, 证明不了逻辑卡死。
    判定运行态一律改用 javascript_tool 状态探针: 读场景节点 activeInHierarchy、devStatus Label、
    模型字段, 而不是看像素"
  - "**过滤+分页的日志读窗里『没有 X』≠『X 没发生』**: read_console_messages 带 pattern/limit
    时返回的是一个窗口, 同窗口在两次调用间可实证性漏条目。据『日志缺席』下否定性结论
    (事件未发/消息未达)之前, 必须换一条独立通道复核(状态探针/落盘产物/当事人)"
  - "**排查中途列一张『我的观测通道各自能证明什么』的清单**: 截图证渲染、console 窗证有不证无、
    探针证状态。用错通道得出的结论, 比没有结论更贵 —— 本例差点把已正常弹出的终局面板判成缺陷"
ci_rules: []
mem_ref: b459b6b2-5df9-472a-92db-172861710d49
mem_status: linked
related:
  - Error_Book/entries/ERR-066__hidden-tab-raf-freeze-engine-boot-blackscreen.md
  - Error_Book/entries/ERR-096__assertion-pinned-to-the-wrong-quantity.md
aliases:
  - ERR-099
  - 后台页观测假象双连
  - background-tab-observation-artifacts
---

# 后台标签页观测假象双连 —— 旧帧截图误判卡死, 日志读窗漏条误判事件未发

## 错误现象

用 claude-in-chrome 驱动 Cocos preview 验证结算闸门时, 连续两次误判:

1. 相隔 3 分钟的两张截图逐像素相同(同一手牌/同一墩/倒计时定格 03) → 判「游戏卡死」;
   实际 console 里出牌消息每 3 秒一条流水般推进, 我方托管照常出牌 —— **只有渲染冻着**。
2. 按 `renderSettle|renderEpisodeOver` 过滤轮询 console, 8 条小局 settle 全在、
   `renderEpisodeOver` 一条不见 → 推断「终局 episodeOver 从未下发」并当疑点上报;
   用户随后亲证: **终局面板如期弹出, 是他本人点掉的**。同一读法还实证漏过
   2:46 时段的两条 settle(后一次调用读到了前一次没给的更早消息)。

## 根因分析

- 现象 1: MCP 标签页非前台, Chrome 冻结 rAF 渲染管线, 但 WS/定时器/游戏逻辑不冻。
  截图工具拿到的是合成器缓存的最后一帧 —— 与 [[ERR-066__hidden-tab-raf-freeze-engine-boot-blackscreen|ERR-066]]
  (引导期整机冻结、全黑)互补: 那条是逻辑也停, 本条是**逻辑活着只有画面停**, 更具欺骗性。
- 现象 2: 过滤 + limit + 内部分页让每次读取只是缓冲区的一个窗口; 窗口边界不稳定,
  「查询结果里没有」被误当成「缓冲区里没有」, 再被放大成「事件没发生」。
  与 [[ERR-096__assertion-pinned-to-the-wrong-quantity|ERR-096]] 变体二同构:
  观测面选错了基准, 还会反过来诬告无辜(那条差点冤枉改 prefab 的用户, 本条差点冤枉服务端)。

## 解决方案

当场改用 javascript_tool 注入探针: `find(scene,'rootSettle').activeInHierarchy` +
契约 Label 字符串 + `lblDevStatus`, 一次调用拿到真状态; 「逻辑是否活着」用
「新日志是否还在产生」判定而非画面。否定性结论(未下发/未触发)一律再走一条独立通道复核。

## 预防规则

浏览器自动化验证 Cocos/游戏页时: 画面性结论 → 先确认 `document.visibilityState`;
状态性结论 → 探针直读节点/模型; 否定性结论 → 双通道; 过滤日志只可证有, 不可证无。