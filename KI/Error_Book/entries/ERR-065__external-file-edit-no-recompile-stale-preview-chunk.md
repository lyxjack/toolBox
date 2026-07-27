---
id: ERR-065
type: error
errorCode: ERR-065
severity: high
status: resolved
recurrence: 0
firstSeen: 2026-07-25
tags:
  - ki/error-book
  - error
  - severity/high
  - engine/cocos
  - domain/build-freshness
prevention:
  - 外部工具（Edit/Write/git checkout）改 Cocos 工程 .ts 后, 编辑器不侦测该改动、不重编译——preview 会一直吃旧
    chunk。必须 `cocos_asset refresh` 触发重编译, 或在编辑器内触发一次资产扫描
  - "验证任何客户端修复前, 先验产物新鲜度: import-map 定位该文件 chunk → `curl <chunk> | grep
    <新代码特征串>` 命中才有资格下修复结论——否则连做两轮『修复无效』全是幻象"
  - "页面加载时刻 vs 代码落盘时刻要对表: 修复落盘晚于页面加载 = 该页面必然跑旧码, 刷新前任何行为都不构成对修复的证伪"
  - "适用面是**一切运行期取证**(冒烟矩阵/缺陷复现/视觉审查截图/性能观测), 不止『验证修复』: 只要结论要落进 QA 报告,
    先跑三步门禁(refresh → chunk 时间晚于源码落盘 → grep 新特征串命中)"
  - "实测量级: 通宵新写的全部脚本, 不 refresh 时 preview 供的仍是 **6 天前**的 chunk。跳过门禁开冒烟 = 整轮 QA
    作废, 每条 PASS 与每条缺陷都是幻象"
ci_rules: []
mem_ref: 2b771c42-2d14-4883-8ff4-1afb0c0c3f12
mem_status: linked
related:
  - Error_Book/entries/ERR-019__cosmetic-change-to-loadbearing-module-unverified.md
  - Error_Book/entries/ERR-064__at-sign-asset-db-url-resolution-truncated.md
aliases:
  - ERR-065
  - stale-preview-chunk
---

# 外部改 .ts 编辑器不重编译 → preview 吃旧 chunk, 修复被误判无效

## 错误现象

D-6 修复（结算退出本地导航）落盘、tsc 零报错、git 提交后, 浏览器复测两轮点「退出」依旧不导航。第一轮归因「页面早于修复加载」并刷新重测, 第二轮刷新后仍无效——几乎把正确修复误判为方案错误。

## 根因

Cocos Creator 只侦测编辑器内触发的资产变动。臣用 Edit 工具外部写 .ts, 编辑器毫无感知, preview 服务器持续供给旧编译 chunk。铁证: `curl <import-map 定位的 chunk> | grep repushBoard` = 0 次命中——刷新页面拿到的仍是修复前产物。

## 修复

`cocos_asset refresh`（MCP HTTP 直连亦可）触发重编译, 6 秒后同一 grep = 1 次命中; 复测退出一击即回选场页。见 verification_log 修复轮记录。

## 预防规则

见 frontmatter。核心一句: **修复无效的第一嫌疑人是「跑的不是新代码」, 不是修复本身**。ci_rules: 无机械 lint 面, 留空。

## 关联

- [[ERR-019__cosmetic-change-to-loadbearing-module-unverified|ERR-019]] — 同族: 改动未经真实生效验证就下结论
- [[ERR-064__at-sign-asset-db-url-resolution-truncated|ERR-064]] — 同一 REQ 修复轮相邻发现, 同属「编辑器期表面成功≠运行期真实生效」家族

---

## 补遗 — 不 refresh 的复测**全是幻象**(REQ-20260726-030631 实测)

本条首版是「修复被误判无效」。本轮把它升格为**冒烟/复测的 0 号前置门禁**, 并拿到一个刺眼的量级数据。

### 实测: refresh 前, preview 供的 chunk 是 **6 天前**的产物

掼蛋横版化全链冒烟开跑前先跑 ERR-065 门禁, 结果:

| 项 | 值 |
|---|---|
| 最新源码改动 | `WMGDCreateGameLayer_l.ts` @ 当日 11:43 |
| **refresh 前** preview chunk 时间戳 | **6 天前**(整轮通宵新写的脚本一个字都没进产物) |
| `cocos_asset refresh` | success |
| refresh 后 chunk 重编译时间 | 当日 11:45(晚于最后一次源码改动 2 分钟) ✅ |
| chunk 内新类名 `WMGDGroupLayer_l` 命中 | 16 处 ✅ |

也就是说: **若不 refresh 就开冒烟, 七站矩阵测的是 6 天前的旧客户端** —— 每一条 PASS 与每一条缺陷都是幻象, 整轮 QA 作废。

### 定型为门禁的三步(每次运行期验收前无条件跑)

1. `cocos_asset refresh` —— 外部工具(Edit/Write/git checkout)改过的 `.ts`, 编辑器毫无感知
2. **对表**: chunk 编译时间必须**晚于**最后一次源码落盘时间
3. **验特征串**: import-map 定位该文件 chunk → `curl <chunk> | grep <本轮新增的类名/函数名>`, 命中才放行

三步齐过才有资格开始测。跳过任何一步得到的运行期结论, 既不能证实修复, 也不能证伪修复。

### 适用面扩大

首版只写「验证修复前」。实测表明凡是**运行期取证**都要过这道门: 冒烟矩阵、缺陷复现、位置/视觉审查截图、性能观测 —— 只要结论要落进 QA 报告, 就先对表产物新鲜度。

与 [[ERR-066__hidden-tab-raf-freeze-engine-boot-blackscreen|ERR-066]] 构成 preview 验收的**两道门**: ERR-065 管「跑的是不是新码」, ERR-066 管「页面是不是真的在跑」。
