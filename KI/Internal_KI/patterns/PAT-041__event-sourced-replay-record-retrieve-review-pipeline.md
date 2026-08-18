---
id: PAT-041
type: pattern
title: "对局回放三段式管线：事件溯源录制 → 屏显号归档检索 → 零依赖网页复盘"
status: active
created: "2026-08-02"
trigger_condition: user_explicit
tags:
  - ki/internal
  - pattern
  - trigger/user_explicit
  - domain/guandan
  - domain/game-server
mem_ref: b36d3553-ef1f-4e33-9c49-65f1bab40f34
mem_status: linked
related:
  - "Internal_KI/patterns/PAT-023__old-new-replay-equivalence-verification.md"
  - "Internal_KI/patterns/PAT-033__derive-on-frozen-kernel-for-free-invariants.md"
  - "Error_Book/entries/ERR-089__archive-keyed-by-internal-id-user-sees-another.md"
  - "Error_Book/entries/ERR-090__sentinel-collapse-null-vs-draw-at-every-layer.md"
complements: []
aliases:
  - PAT-041
  - replay-pipeline
  - 回放管线
---

# 对局回放三段式管线（掼蛋实装，REQ-20260801-205151）

## 适用场景

回合制对局类系统需要「打完就有档、拿号就能查、双击就能看」的开发测试复盘链；服务端有确定性规则引擎、事件日志天然存在。

## 核心结构

### ① 录制（游戏服进程内，被动副作用）

- **格式选型先实测再拍板**：同 seed 同一场 1:1 对比，事件溯源 serializeFull（含 seed+四家手牌，gzip 6.7KB）胜滚子式全量消息流（16.5KB）2.45×，且直接接既有 ReplayCursor 重建链。参考实现（滚子 web_replay）只取其「列表→选取→载入」交互形态与按号取档接口形状。
- **逐局滚动覆写同一档**：deal-settled 即存（tmp+rename 原子写），崩溃/强退至多丢当前局；forceEnd 也存；**永不删除**（一场 ~10KB，万场 ~100MB，测试证据链价值 >> 磁盘）。
- **终局裁尾**：固定把数收场时引擎已自动发出未开打的下一副（引擎不知宿主把数规则），终局档裁掉末条 deal-settled 之后的尾巴 + 宿主胜方覆写——否则多存一副且胜方误报。
- 红线：存档是结算前的被动副作用，**永不抛**（try 全包，失败静默降级），主链零扰动。

### ② 归档与检索（键 = 用户可见标识）

- 归档键取**屏显号**（boxCode，[[ERR-089__archive-keyed-by-internal-id-user-sees-another|ERR-089]] 教训）；文件名 `{时间}_{号}_{唯一后缀}.json.gz`，字典序=时间序（列表免解压排序）。
- 配套「一场一号」：整场结束平台销房、续场新号 → 屏显号↔一场↔一档三者恒等；跨重启防撞（启动扫描已归档号避让+时间籽起点）。
- 查询面 = 进程内只读 HTTP 三路由（list/get公有/getfull明牌），摘要缓存（键=文件名+mtime+size）防同步解压阻塞游戏主循环；**默认绑 127.0.0.1**（见 [[dev-plaintext-data-plane-loopback-default|SEC-003]]）。
- winnerTeam 三态全链保真：null=未完/-1=平/0,1=胜（[[ERR-090__sentinel-collapse-null-vs-draw-at-every-layer|ERR-090]]）。

### ③ 复盘（零依赖静态网页）

- 纯静态四件套 + 牌图资产，**双击 index.html 即用**（file:// 兼容，经典脚本无模块无外链）；折叠核心与 DOM 严格分层（顶层纯函数 + typeof document 闸门），node vm 可直接沙箱验证折叠不变量。
- 三种数据源：按房号导入（开页零联网）/ 本地 .json.gz 拖拽（DecompressionStream）/ 分享包 `gd_replay_data.js` 自动载入（file:// 可加载同目录 script，缺失静默）——「复制整个文件夹给别人双击即看」由此成立。
- 明牌复盘用 full 档：四家手牌逐张消减、贡牌在两家间真实流转，折叠器对 14 类事件重放（正确性以引擎权威折叠器对拍，[[PAT-023__old-new-replay-equivalence-verification|PAT-023]] 方法）。

## 为什么长在这个形状上

- 录制进游戏服本体（非 dev 壳）→ 部署测试服零额外动作；查询面失败安全（端口冲突/非法配置只记日志）→ dev 设施永不拖垮生产进程；查看器零依赖 → 跨 Windows/macOS 分发成本为零。
- 与 [[PAT-033__derive-on-frozen-kernel-for-free-invariants|PAT-033]] 同源：一切状态由冻结的引擎日志推导，复盘正确性白拿引擎的确定性。

## 反模式

- 照搬参考实现的消息流录制（放弃引擎重建能力、体积大、手牌缺失）
- 归档键取代码里顺手的内部 ID（ERR-089）
- 查询接口默认 0.0.0.0（SEC-003）
- 复盘工具做成客户端内嵌功能（用户明令：非上线功能不进客户端工程）
