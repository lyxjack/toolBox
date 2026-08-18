---
id: ERR-078
type: error
errorCode: ERR-078
severity: high
status: resolved
recurrence: 0
firstSeen: "2026-07-28"
tags:
  - ki/error-book
  - error
  - severity/high
  - engine/cocos
  - domain/asset-variants
  - domain/test-coverage
  - project/guandan
prevention:
  - "**同一份 UI 存在横/竖两版资产时, 改了一版必须立刻问『还有几版』**。掼蛋建房面板有 `WMGDCreateGameLayer_p.prefab`(竖) 与 `_l.prefab`(横)两份, 横版才是主链(2026-07-26 已弃竖版)。本案只改了竖版档名, 横版留着旧文案 —— 玩家在横版选「15秒」实得 20 秒、选「不限时」实得 15 秒, **所见非所得**"
  - "**断言只覆盖一个变体, 绿灯就是假的**。`createPanelNodes.assert.mjs` 默认只读竖版 prefab, 于是 277 条断言全绿而横版漂移完全无感。**判据: 凡是断言里出现写死的单个资产路径(或可被环境变量覆写的默认路径), 就要问它有没有同族兄弟没被扫到**"
  - "**修法是让断言恒扫全部变体, 而不是靠人记得传参**。本案新增一节独立于 `GD_CREATE_PREFAB` 环境变量、恒遍历横竖两份的档名扫描; 只查文案不查结构(两版结构性契约有差异, 不在该节管辖), 这样既覆盖全又不会因无关差异误红"
  - "**新加的断言必须先证明它会红**(反证 / negative control)。本案改完后把表里的『20秒』临时改成『20秒X』, 确认横竖两版**同时报红**再还原 —— 否则无法区分『断言通过』与『断言根本没跑到』。详见 [[PAT-035__negative-control-before-trusting-a-new-assertion|PAT-035]]"
  - "**一个『档位表』会散落到八处, 改一处必漏七处**。本案清单: 服务端枚举 + 秒表(gdRule) / 建房参数校验白名单(gdVerify) / 客户端档表(gdDefine.GDRoomSet) / prefab 文案 ×2(横+竖) / 位备案文档(INTEGRATION_DIFF.md) / 节点契约(nodes.md) / 测试标题与断言。**改产品档位前先 grep 出全部承载点列成清单, 逐项打勾**"
ci_rules: []
mem_ref: 019fab4f-e4df-7c73-a412-9a6eb27617dc
mem_status: linked
related:
  - "Error_Book/entries/ERR-074__client-side-irreversible-action-races-server-deadline.md"
  - "Error_Book/entries/ERR-069__cocos-mcp-tool-quirks-collection.md"
  - "Error_Book/entries/ERR-070__ud-scope-overreach-deleted-shared-chain.md"
  - "Internal_KI/patterns/PAT-035__negative-control-before-trusting-a-new-assertion.md"
aliases:
  - "ERR-078"
  - "edited-one-variant-only"
  - "只改竖版漏了横版"
---

# 只改了竖版 prefab, 横版留着旧档名 —— 277 条断言全绿

## 错误现象

用户把出牌时限档位从「30秒 / 15秒 / 不限时」改成「30秒 / 20秒 / 15秒」。
代码侧全部改完、测试 277 条全绿, 但**玩家在横版建房面板看到的仍是旧档名**:

| 面板显示 | 实际建出的房 |
|---|---|
| 「15秒」 | **20 秒** |
| 「不限时」 | **15 秒** |

所见非所得。而且这是**主链** —— 项目 2026-07-26 已转横版, 竖版两案 SUPERSEDED。

## 根因(两层)

### 一层: 同一 UI 有两份资产, 只改了不用的那份

```
assets/game/DLGZ_P/bundles/lobby_p/WMGDCreateGameLayer_p.prefab   ← 竖版, 已弃用, 改了
assets/game/DLGZ_L/bundles/lobby_l/WMGDCreateGameLayer_l.prefab   ← 横版, 主链,   漏了
```

脚本按节点名后缀(`tglTime{code}`)写档位码, **不会**从 `GDRoomSet.TimeLimits` 动态覆盖 Label
—— 文案是 prefab 里的死文本(IL13 要求实体节点), 所以漂移不会被运行期纠正。

### 二层: 断言只盯着其中一份, 所以绿灯是假的

`createPanelNodes.assert.mjs` 的默认路径写死指向竖版:

```js
const PREFAB = process.env.GD_CREATE_PREFAB ? resolvePath(...) : fileURLToPath(new URL(
    "../../../ccc-newkds-gd/assets/game/DLGZ_P/bundles/lobby_p/WMGDCreateGameLayer_p.prefab", ...))
```

于是 `npm run test:all` 277 条全绿, 对横版漂移**完全无感**。
这道断言当初正是为「prefab 文案 ↔ 代码档表双源漂移」而建的守门人 —— 它守住了一半, 漏了另一半。

## 修复

1. 用 cocos-mcp 改横版 prefab 的 `tglTime1/tglTime2` 文案(**不手改 .prefab 文件**, 见 ERR-002),
   改完按 ERR-069 的规矩**只读复核落盘 JSON**, 不信 MCP 返回体
2. 断言新增一节, **独立于环境变量、恒遍历横竖两份**:
   - 逐档对齐 `GDRoomSet.TimeLimits` 的 label
   - 外加「已删档位不得残留」(取消不限时后, prefab 里不能还留着 `tglTime3` 之类表外档)
   - **只查文案不查结构** —— 两版的结构性契约有差异(横版缺 `btnJoin`, 属编辑器轨既有待办),
     全量对齐会因无关差异误红
3. **反证**: 临时把表里的「20秒」改成「20秒X」, 确认横竖两版同时报红再还原

## 泛化

**改任何有变体的资产前, 先列全变体清单; 改完检查断言是否扫到了每一个。**

高危信号:
- 资产路径里带方向/尺寸/语言后缀(`_l` / `_p` / `_zh` / `@2x`)
- 断言里出现写死的单个资产路径, 或"默认路径 + 可选环境变量覆写"的形态
  —— 后者尤其阴险: 它**看起来**支持多目标, 实际 CI 只跑默认那一个

同理适用于: 一份文案散落在多处承载点。本案那张"档位表"实际有**八个**承载点
(服务端枚举/秒表、建房校验白名单、客户端档表、横竖两份 prefab、位备案文档、
节点契约 md、测试标题)。改产品定义前先 grep 出全部承载点列清单逐项打勾, 否则必漏。

新断言的可信度问题见 [[PAT-035__negative-control-before-trusting-a-new-assertion|PAT-035]];
同批次的时序类教训见 [[ERR-074__client-side-irreversible-action-races-server-deadline|ERR-074]]。
