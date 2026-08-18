---
id: ERR-102
type: error
errorCode: EVD-004
severity: high
status: recurring
recurrence: 1
firstSeen: 2026-08-04
tags:
  - error/high
  - engine/cocos
  - tool/file-edit
  - asset/script
  - errorCode/EVD-004
  - ki/error-book
prevention: "改完代码，**在让任何人测试之前先证明「跑着的就是它」**。两条运行时各有各的证据：客户端核对编译产物时间戳晚于源码（Cocos 不因文件工具改盘而自动重编译）；服务端核对**进程启动时间晚于源码 mtime**（长驻 dev 壳不会自己重启，本案实测壳比源码旧 17 小时）。源码搜索、tsc 全绿、MCP 回执都只证明「文件改对了」，不证明运行期加载了它"
  全绿都只证明「文件改对了」，**不证明跑着的是它** —— 用 stale 的产物做验证，等于没验证
leading_word: stale
aliases:
  - ERR-102
  - source-edited-but-editor-never-recompiled
mem_ref: 019fcf3c-5330-7da3-98d7-3bc8bd4a2146
mem_status: linked
related:
  - Error_Book/entries/ERR-099__background-tab-stale-frames-and-log-window-misread.md
  - Error_Book/entries/ERR-096__assertion-pinned-to-the-wrong-quantity.md
  - Error_Book/entries/ERR-064__at-sign-asset-db-url-resolution-truncated.md
---

# 改了源码却没重编译 —— preview 跑的是两小时前的旧码，而我拿源码当"已生效"的证据

## 错误现象

掼蛋「快速模式」客户端改造：入口已由代码改成直接进场次页，壳层「敬请期待」按契约保留但**不再有任何代码能到达它**。

用户在 preview 里点「快速模式」，弹出来的**正是那个壳**。

用户直接问：「难道不是那句 toast 你没删吗？」
我据「源码搜索 + tsc 全绿」回答：**入口已改、全仓无一处能 push 那个壳、有实证**。

**我错了，用户是对的。**

## 根因

**编译产物停在 14:33，而我改的源码是 16:17 / 16:26。**

```
产物 temp/programming/packer-driver/targets/preview/chunks/…js   14:33:20
源码 assets/scripts/DLMJ/WMGZLobbyLayer_l.ts                     16:17:26
源码 assets/scripts/WM_GD/UI/WMGDGroupLayer_l.ts                 16:26:27
```

用 Write/Edit 直接改磁盘上的 `.ts`，**Cocos 的 asset-db watcher 没有捕捉到**（编辑器当时在忙 / watcher 未触发），近两小时的改动一行都没进编译产物。preview 加载的是旧 chunk，旧码里入口本来就指着那个壳 —— 现象与"壳没删"一模一样。

**真正的病灶不是那次漏编译，是我选错了观测面**：

| 我看的 | 它证明什么 | 它不证明什么 |
|---|---|---|
| `grep` 源码 | 文件里的字改对了 | 跑着的是这份文件 |
| `tsc --noEmit` 全绿 | 这份源码类型上自洽 | 编辑器把它编译进产物了 |
| MCP 回执 success | 工具调用被受理 | 结果落到了运行期 |

三样都是**上游**证据，而用户看的是**下游**产物。同一件事的两个面，我拿了对自己有利的那个面下断言，还用它去反驳用户。

## 为什么自查没抓到

先前每一轮"客户端已落地"的验收，走的都是 `tsc 零新增 + 源码 grep`。这套验收在**编译这一环从不失手**的隐含前提下成立 —— 而这个前提从没被断言过，一旦破了，整套验收静默失效，且失效时**全绿**。

## 解决方案

```bash
# 1. 强制重编译（asset-db 刷新会带动 packer-driver）
#    MCP: cocos_asset { action: "refresh", url: "db://assets/scripts" }
# 2. 核对产物比源码新 —— 这一步是硬门禁，不是可选项
stat -f '源码 %Sm %N' -t '%H:%M:%S' assets/scripts/…/X.ts
ls -t temp/programming/packer-driver/targets/preview/chunks/*/*.js | head -1 | xargs stat -f '产物 %Sm %N' -t '%H:%M:%S'
# 3. 更硬的证据：在产物里 grep 本次新增的特征串（新号段/新协议名/新文案）
grep -rl "68000011" temp/programming/packer-driver/targets/preview/chunks/
```

上服后同理：现网包也要 grep 特征串（本案在服务器上验了 `68000011` / `G_GD_DoubleStart` / 「快速模式」三项才敢说上线了）。

## 预防规则

1. **凡 agent/文件工具改过 Cocos 项目的 `.ts`，交付前必须核对编译产物时间戳晚于源码**；不满足则先 `cocos_asset refresh` 再核对。此前的一切 preview 验证**不作数**。
2. **报告"已生效"时，证据必须取自运行期那一侧**：产物里的特征串、运行期探针读到的值、现网包里的 grep 命中。源码与类型检查只能说"已改对文件"。
3. **用户报的现象优先于我的静态证据**。用户看的是产物，我看的是源码；两者冲突时，默认我的观测面选错了，先去补运行期证据，而不是用上游证据去驳。

## 关联

- [[ERR-099__background-tab-stale-frames-and-log-window-misread|ERR-099]] —— **同族**：那次是截图取到陈旧帧（层栈已切、画面还停在旧页），本条是编译产物陈旧。两次都是"看到的东西比真实状态旧"，且都让我差点得出相反结论。凡"观测到的"与"真实的"之间隔着一层缓存/构建，就要问一句这层刷新了没有。
- [[ERR-096__assertion-pinned-to-the-wrong-quantity|ERR-096]] —— 同属"基准选错"家族：那次是断言钉在自己不掌控的量上，本条是验证钉在自己不掌控的构建环节上。
- [[ERR-064__at-sign-asset-db-url-resolution-truncated|ERR-064]] —— preview 首跑必查 console，editor 侧的静态检查验不出这类"跑起来才现形"的问题。

---

## 复犯 #1 —— 2026-08-08（掼蛋局末残牌公示）

同一天内**两条运行时各栽一次**，都让用户白测了一轮：

| # | 运行时 | 实况 | 用户看到的假象 |
|---|---|---|---|
| a | **服务端 dev 壳** | 壳进程起于 **8-07 21:55**，而 `gdRoom.ts` 改于 **8-08 15:11** —— 跑的是 **17 小时前**的旧码，`remainCards` 字段那时还不存在 | Settle 报文里一个 `remainCards` 都没有 ⇒ 误判成「客户端没渲染」，一路查到 prefab、镜像、解码器全无所获 |
| b | **Cocos 编译产物** | 用命令行改 `.ts`，editor 未察觉、未重编译；而 prefab 改动走 MCP（editor 知道）已生效 | **「旧 .ts + 新 prefab」的错配** —— 代码在找一个刚被删掉的节点，日志明写 `contract missing: rootHandReveal/handReveal_0` |

**b 尤其阴**：同一份工作里，走 MCP 的改动生效、走文件工具的改动没生效，两边**各对一半**，凑出一个真实世界里不存在的中间态。

### 由此加固的规则

1. **服务端也要核对**：`ps -p <pid> -o lstart` 的启动时间必须晚于源码 `mtime`。长驻 dev 壳（devPlatformShell 之类）不会自己重启，改完服务端代码**先重启再让用户测**，并在交付话术里主动说明这一步。
2. **混用工具链时，逐条列出「这条改动经哪条路生效」**。MCP 改 prefab → editor 立即知道；文件工具改 `.ts` → editor 可能不知道。同一批改动跨两条路时，慢的那条必须显式驱动（`cocos_asset reimport`）并核对产物。
3. **给运行期留一个版本指纹**。本案靠新版才有的日志串（「（出牌位，与出牌同尺寸）」）一眼判定新旧；比时间戳更直观，建议改动带上可 grep 的特征串。

### 归属

三次现象各异（漏编译 / 壳未重启 / MCP 与文件工具错配），根因同一句：**把「我改了」当成了「它在跑」**。这不是手滑，是**验证面选错**的惯性 —— 与 [[ERR-111__node-box-used-as-visual-evidence|ERR-111]]（拿节点框冒充视觉证据）同族：都是拿自己能算的上游量，去替代用户能看的下游事实。
