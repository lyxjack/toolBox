---
id: ERR-069
type: error
errorCode: ERR-069
severity: high
status: open
recurrence: 0
firstSeen: "2026-07-26"
tags:
  - ki/error-book
  - error
  - severity/high
  - engine/cocos
  - tool/MCP
  - asset/prefab
prevention:
  - "cocos-mcp 的 `success:true` 不等于生效: reorder/move/create-position/batch_modify 的部分入参会被静默吞掉。任何结构性改动落盘后必须用 python 只读解析 .prefab 复核, 不得以工具返回体为准"
  - "节点层级顺序靠创建顺序定, 不靠 reorder/move: `cocos_node reorder` 实测报 Reparent verification failed 并把节点甩到场景根; `move` 到同一父节点不改兄弟序且返回成功。要谁在上就后建谁, 顺序错了 delete 重建"
  - "`cocos_component add` 返回 success:false 可能是假阴性: 它按类名比对, 而 prefab 里存的是 23 位压缩 cid。判定组件是否挂上必须算 cid(前 5 字符原样 + 其余每 2 个 base64 字符还原 3 位 hex, 补 8-4-4-4-12 后到 .meta 反查) 或直接 grep 落盘 prefab, 不能凭返回值重复挂载"
  - "向 MCP 传中文一律写字面字符, 禁用 `\\uXXXX` 拼数字后缀 —— JSON `\\u` 严格取 4 位十六进制, `座`+`0` 会被吃成 `堧`(堧)+`0`, 落盘即错字"
  - "batch 系列的能力边界要先记住再动手: batch_modify 只吃 transform/size/anchor(name/active 静默忽略); batch_create_* 忽略 color 与 Sprite type; batch_create_label 不吃 lineHeight 且空串会被替换成 'label'; label set_style 禁 batch(会命中全部 label)。缺的属性一律建完再逐节点补设"
  - "`cocos_component set_property` 没有『自定义 @ccclass 对象数组』类型分发, 场景/预制体里的 `@property([ccXxx])` 数组写不进去。遇到即停手(禁手改 .scene, ERR-002), 出路只有两条: 编辑器 Inspector 手工补, 或代码侧运行期幂等注册兜底"
ci_rules: []
mem_ref: 019fa14f-5b91-7a30-a5da-57b912f338cf
mem_status: linked
req_ref: REQ-20260726-030631
related:
  - "Internal_KI/patterns/PAT-001__mcp-prefab-workflow.md"
  - "Error_Book/entries/ERR-034__cocos-mcp-server-161-property-whitelist-and-tool-gaps.md"
  - "Error_Book/entries/ERR-043__mcp-prefab-edit-root-uuid-mismatch.md"
  - "Error_Book/entries/ERR-002__python-modify-cocos-prefab.md"
aliases:
  - "ERR-069"
  - "cocos-mcp-quirks"
---

# cocos-mcp 工具怪癖合集 —— success≠生效, 静默吞参与假阴性

## 错误现象

REQ-20260726-030631「掼蛋弃竖版改横版」用 cocos-mcp 在编辑器轨新建三个 prefab(牌桌 340 节点 / 建房 91 节点 / 场次 46 节点), 单次作业内撞上 13 类工具行为偏差。全部特征相同: **工具回报成功或回报失败, 都与磁盘真相不一致**, 只有 python 只读解析落盘 .prefab 才能定案。其中 `reorder` 一条属**破坏性**(节点被移出 prefab 树), `set_property` 对象数组一条属**能力缺口**(直接卡住场景注册表任务)。

## 根因分析

MCP wrapper 是编辑器消息的薄封装, 三处结构性失配:

1. **回报口径失配** —— wrapper 回报的是「消息发出成功」, 不是「编辑器执行后序列化结果符合预期」。被忽略的入参不产生任何错误信号。
2. **命名空间失配** —— wrapper 用**类名**比对组件, prefab 序列化里存的是 23 位**压缩 cid**。两个空间不互查即产生假阴性(add 说没挂上, 实际挂上了)。
3. **类型分发器覆盖面失配** —— `set_property` 的分发表只有基础类型 + 若干引擎数组类型, 没有自定义 `@ccclass` 对象数组这一档。

## 怪癖清单(本案实证)

| # | 工具 / 入参 | 现象 | 正确姿势 |
|---|---|---|---|
| 1 | `cocos_node reorder` | ⚠️ **破坏性**。对目标节点调 `reorder(siblingIndex)` 报 `Reparent verification failed`, 且节点被甩到**场景根** `Scene/<name>` | 别用。已被甩出的用 `move(targetParent, siblingIndex)` 捞回原父 |
| 2 | `cocos_node move` 同父重排 | 连调两次想把节点顶到末尾, 落盘兄弟序纹丝不动, **返回成功**(谎报) | 兄弟序靠**创建顺序**: 新节点恒追加末尾, 要谁在上就后建谁; 顺序错了 delete 重建 |
| 3 | `cocos_node create` 的 `position` | 入参被忽略, 返回体 position 恒 (0,0) | 建完再 `batch_modify` 补坐标(batch 对 position/size/anchor 可靠) |
| 4 | `cocos_composite batch_modify` | 只吃 transform / size / anchor; `name`、`active` **静默忽略** | 改名走 `cocos_node modify`, 显隐走单点调用 |
| 5 | `cocos_composite batch_create_image/label/button` | `color` 与 Sprite `type` 被忽略 | 补一次 `cocos_component set_property`, `properties:{type:{number,1}, color:{color,"#RRGGBB"}}` 可一次设两项 |
| 6 | `batch_create_button` | 子文本节点默认命名 **`Label`**(契约多要求 `lbl`) | 逐个 `cocos_node modify` 改名; 落盘复扫 stray `Label` 归零 |
| 7 | `batch_create_label` 的 `lineHeight` | 不吃 | 逐节点 `cocos_label set_style` 补齐 |
| 8 | `batch_create_label` 传空串 `""` | 被替换成占位文案 `'label'` | 建时就给真实文字(IL13 要求实体节点带真实文案), 落盘扫 `label\|-` 占位断言 |
| 9 | `cocos_label set_style` 批量模式 | 会**命中全部 label** | 禁 batch, 逐节点调 |
| 10 | `cocos_component set_property` 颜色 | 只收 hex 字符串 | `{color:"#RRGGBB"}`, 不传数组/对象 |
| 11 | `cocos_prefab edit_save` | 不带 `prefabPath` 不落盘 | 每次存盘显式带 `prefabPath` |
| 12 | `cocos_component add` | 返回 `success:false` **假阴性**(按类名比对, prefab 存压缩 cid) | 算 cid 或 grep 落盘 prefab 判定; **别按返回值重挂**(重挂即产生重复组件) |
| 13 | `cocos_component list` | 单节点输出可达 **68KB**, 撑爆上下文 | 属性核查改 python 只读解析落盘 .prefab |
| 14 | `cocos_component set_property` 自定义 `@ccclass` 对象数组 | **能力缺口**。三种写法全被 wrapper 自身拒绝(非编辑器报错, 零写入): 数组 value → `Unsupported property type: array`; `type:"ccXxx"` → `Unsupported property type: ccXxx`; 点号路径 `games.length` → `Property not found`(只按顶层属性名校验) | 停手。① 编辑器 Inspector 手工补(30 秒) 或 ② 代码侧运行期幂等注册兜底。**禁手改 .scene**([[ERR-002__python-modify-cocos-prefab\|ERR-002]]) |
| 15 | 向 MCP 传中文用 `\uXXXX` | JSON `\u` 严格取 4 位十六进制, 想写 `座0` 的 `座0` 被解析成 `堧`(堧)+`"0"` —— 本案 5 处文案落盘即错字, 复扫才发现 | **一律写字面中文字符**, 不拼数字后缀 |
| 16 | Sprite 灰底图 tint | 灰底图 × 目标色得不到目标色(本案 `pic_btn_di.png`(灰) × `#EE9243` → 暗棕) | 纯色板用引擎内置白图 `db://internal/default_ui/default_sprite_splash.png/spriteFrame`, 再 tint |
| 17 | `cocos_node duplicate`(**可利用**, 非缺陷) | 尾数字自增实测生效(`seatView_0→1→2→3`), 复制含完整子树 + 组件属性 | 批量同构节点优先 duplicate; 本案省下约 120 次调用 |

### 压缩 cid 还原算法(判定组件是否真的挂上)

prefab 里组件的 `__type__` 是 23 位压缩 uuid: **前 5 个字符原样保留**, 其后**每 2 个 base64 字符**(标准表 `A-Za-z0-9+/`)还原为 **3 位 hex**, 再按 `8-4-4-4-12` 补分隔符, 最后到 `*.meta` 的 `uuid` 字段反查脚本文件。有了它才能把「MCP 说没挂上」与「磁盘上确实没挂上」区分开。

## 解决方案

**唯一可靠的验收面是磁盘。** 本案的定型工作法(与 [[PAT-001__mcp-prefab-workflow|PAT-001]] 叠加使用):

1. 用 MCP 建/改 → `cocos_prefab edit_save`(带 `prefabPath`)
2. python **只读**解析落盘 `.prefab`, 逐项打勾: 契约节点全表 / 坐标 / 尺寸 / 默认 active 态 / 命名无残留 / 悬空 ClickEvent = 0 / layer 与宿主一致 / 无占位文案
3. 断言不过就回编辑器补, 不在 MCP 返回体上做判断

本案三个 prefab 靠这套断言拿到 166/166、101/101、36/36 全过, 并在 P5 阶段**捞出 2 类已落盘缺陷**(中文错字 5 处、占位文案 8 处)—— 这两类在 MCP 返回体上全是 success。

## 预防规则

见 frontmatter。一句话: **cocos-mcp 的返回值是「消息已送达」, 不是「结果符合预期」; 结构性改动的唯一裁判是落盘 .prefab 的只读解析。**

> CI: Tier 2 only —— 本条记录的是 MCP 工具调用期行为, 不落在仓库源码里, 无 `file-pattern-ban` / `code-pattern-ban` / `code-pattern-require` 三型静态规则可表达的载体。防护面在 Agent 作业流程(落盘只读断言), 不在 linter。

## 关联

- [[PAT-001__mcp-prefab-workflow|PAT-001]] — MCP Prefab 修改流程主干; 本条是当代 `cocos_*` 工具族的怪癖补丁, 与 PAT-001 的「两步保存 + 落盘验证」同向加固
- [[ERR-034__cocos-mcp-server-161-property-whitelist-and-tool-gaps|ERR-034]] — 上一代 cocos-mcp-server 1.6.1 的属性白名单与工具失效清单; 工具名已换代(`component_set_component_property` → `cocos_component set_property`), 但「wrapper 覆盖面 < 序列化字段全集」这一根因完全一致
- [[ERR-043__mcp-prefab-edit-root-uuid-mismatch|ERR-043]] — 同名兄弟节点让 MCP 路径寻址有歧义; 本案 T2b 据此把 `group ×3` 唯一化为 `group0/1/2` 再动手
- [[ERR-002__python-modify-cocos-prefab|ERR-002]] — 怪癖 #14 撞墙时的停手依据: 能力缺口不构成手改 .scene 的授权
- [[ERR-021__cocos-prefab-create-loses-subchildren-properties|ERR-021]] — 同族: create 类工具丢属性, 必须 edit-mode 往返复核
