---
id: ERR-067
type: error
errorCode: ERR-067
severity: medium
status: resolved
recurrence: 0
firstSeen: "2026-07-25"
tags:
  - ki/error-book
  - error
  - severity/medium
  - domain/protocol
  - project/guandan
prevention:
  - "导航/退出类动作不得单独依赖服务端回包驱动——回包消费端可能被运行态门禁静默拦截（本例 Game_RoundResult 把基类 autoLeave 置 false, handleExitRoom 的 self 分支整块跳过）。照母版家法: 发包后本地直接导航（gz CoinGame 结算层 onClickBack 同式）"
  - "复用平台基类消息处理时, 通读该 handler 的全部前置门禁（isBoss/状态阈值/autoLeave 类标志位）并对照本游戏的状态时序——掼蛋一局多副, 房间永远到不了 RoundEnd, gz 按『局末』设计的门禁在掼蛋语义下恒拦截"
  - "仿真壳最小面每加一条链路, 以客户端实际解析代码为唯一契约（消息名/字段/判定条件三件套逐条对照）, 不臆造字段"
ci_rules: []
mem_ref: 2b771c42-2d14-4883-8ff4-1afb0c0c3f12
mem_status: linked
related:
  - "Error_Book/entries/ERR-117__synthetic-double-models-imagined-not-actual-semantics.md"
  - "Error_Book/entries/ERR-065__external-file-edit-no-recompile-stale-preview-chunk.md"
aliases:
  - "ERR-067"
  - "exit-echo-blocked-by-gates"
---

# 结算退出依赖服务端回包被状态门禁双重拦截 → 点退出永不回大厅

## 错误现象

掼蛋结算板「退出」正确发出 GS_Exit（日志实证两次发包）, 但永不回大厅。仿真壳侧补了应答后, 客户端收到回包仍不导航。

## 根因

三层门禁叠杀:
1. **壳侧**: roomBase.onMessage 的 ExitRoom 分支两道 return——真人恒为壳房 boss（isBoss 拦）; 即便绕过, 掼蛋一局多副 status 永远够不到 RoundEnd（金币场局末阈值拦）→ 回包根本发不出, 需壳在桥接前拦截应答（{chairNo} 单字段, 契约=roomBase.onUserExit 实发形态）。
2. **客户端**: gdRoom 每副 deal-settled 广播 Game_RoundResult, 基类 handleRoundResult 将 `autoLeave=false`; 而结算板正是同一事件弹出——点退出时 self 分支必被跳过, 回包路径结构性死亡。
3. gz 母版早知此坑: 其金币场结算层 onClickBack = 发包后**本地直接** `if(!repushBoard()) lobby()`, 从不等回包。

## 修复

双端: 壳拦截应答（kds-game-gd 4460255, smoke 17/17 含退房/复入队用例）; 客户端结算退出照 gz 家法本地导航（ccc-newkds-gd 0852560）。复测: 点退出 → GS_Exit 往返 → repushBoard 回选场页 ✓。

## 预防规则

见 frontmatter。ci_rules: 设计审查类, 留空。

## 关联

- [[ERR-117__synthetic-double-models-imagined-not-actual-semantics|ERR-117]] — 同族: 按想象语义（回包会来且会被消费）而非实际代码语义行事
- [[ERR-065__external-file-edit-no-recompile-stale-preview-chunk|ERR-065]] — 本条排查被其叠加干扰（修复正确但跑旧码）, 双坑叠加时先固定单变量
