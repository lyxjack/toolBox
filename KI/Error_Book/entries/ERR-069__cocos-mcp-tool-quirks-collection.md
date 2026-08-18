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


**2026-07-30 增补（REQ-20260729-232009 P0 五件套实证）：**

- **#15 component.set_property 吃不下数组**：自定义类数组（如 ccFastTextData_l[]）与字符串数组均写不进——单值模式报 `StringArray value must be an array`（value 途中被字符串化），batch 模式报 `Cannot use 'in' operator to search for 'value' in <元素>`；dotted 路径（`fastTextDefines.0.text`）被扁平校验拒绝。**绕行**：文案/清单类数据改走脚本 `@property` 默认值路线——先改 TS 默认值 → remove_script → asset refresh → mount_script，挂载瞬间默认值序列化入 prefab（Inspector 可见可改）。⚠ 已挂过的旧组件实例持有旧值（含空数组），必须卸载重挂，改默认值不会自动生效。
- **#16 batch_modify 的 name 改名生效但不上报**：results.applied 只列 `transform`/`size`，name 实际已改——按 uuid 复查确认，勿因 applied 缺项而重复改名。
- **#17 duplicate 命名规律两态**：源名带数字后缀（lblCol_0）→ 自动递增（lblCol_1，可连环复制成序列）；不带数字后缀（btnZhanjiEntry）→ 加 `-001`。连环建列表时利用前者可省全部改名调用。


### 第二批实证（2026-07-31, REQ-20260731-053000 美术切图上屏, cocos-mcp v1.7.9）

| # | 怪癖 | 现象 | 规避 |
|---|---|---|---|
| 15 | **`cocos_component set_property` 对象值传 JSON 字符串 → 静默写成 `100×100`** | `value:"{\"width\":686,...}"` 报 `success:true`，实际 contentSize 被写成默认 100×100。**唯一线索是返回里的 `changeVerified:false`**（不是 error，极易略过） | 对象类值必须传**真 JSON 对象**；改尺寸一律走 `cocos_node batch_modify` 的 `size` 字段（实测可靠，且返回 `applied:["size"]` 可验） |
| 16 | **`cocos_node reorder` 把节点甩到 Scene 根** | 对同父下的节点调 reorder 调兄弟序，报错 `Reparent verification failed... actual: <Scene uuid>`——**但节点已经被挪到 Scene 根了**（错误发生在验证阶段，副作用已落） | 别用 reorder 调兄弟序。需要"垫底"时改用**父节点自挂 Sprite**（父恒先于子渲染），需要层级调整时用 `move` 并**逐次 tree 复验** |
| 17 | **`cocos_node move` 只验父不验序，`siblingIndex` 静默不生效** | `move(targetParent=原父, siblingIndex=0)` 报 `✅ moved to index 0` 且 `verified:true`，`tree` 一查节点仍在末位 | 把 `verified:true` 理解为"父对了"而已；兄弟序须 `tree` 实查，连调两次也不会生效（实测） |
| 18 | **prefab edit 会话间节点 uuid 全部换代** | `edit_exit` 后再 `edit_enter`，同一节点的运行时 uuid 变了；沿用上一会话记的 uuid 一律 `Cannot resolve node` | **uuid 只在单次 edit 会话内有效**。跨会话必须重新 `find`；长任务应把"按名 find → 立即用"作为固定节律，不要预先囤积 uuid |
| 19 | **`batch_modify` 的 `active` 字段不出现在 `applied` 列表里，但确实生效** | 传 `{node, size, active:false}` 返回 `applied:["transform","size"]`，看不到 active —— 易误判为"又一个静默吞参" | 以**落盘 `.prefab` 的 `_active`** 为准（本轮实测 16/16 正确写入）。返回值的 `applied` 列表不完整，不是失败证据 |

> 本批最贵的一条不在上表：`import(overwrite=true)` 会弹原生模态框**锁死整条 MCP 通道**，
> 已单列为 [[ERR-083__mcp-write-param-triggers-modal-deadlock|ERR-083]]（故障面从"这步没成"升级为"这个 session 做不下去"）。

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
- [[ERR-081__mcp-spriteframe-dburl-persists-fake-uuid|ERR-081]] — 本条母题的最新实例，且把它推进一层: **连 `changeVerified` 这个自检字段也会假阳性**（它与被验对象同处编辑器进程内）。spriteFrame 收 `db://` 路径时三绿灯齐亮、落盘仍是假 UUID

---

## 续记（2026-08-04, 接风标 + 剩牌角标换装）

**#20 `cocos_label batch_set_style` 静默吞掉 `lineHeight`（落盘实证）**

一次调用同时传 `fontSize` / `lineHeight` / `horizontalAlign` / `verticalAlign`，
返回 `✅ Style updated on 4/4 Label nodes`、`updated: 4, total: 4` —— 看起来全中。

落盘复核（python 只读解析 .prefab）：

| 字段 | 传入 | 落盘 | |
|---|---|---|---|
| `fontSize` | 27 | **27** | ✅ 生效 |
| `horizontalAlign` / `verticalAlign` | CENTER | CENTER | ✅ 生效 |
| `lineHeight` | 30 | **32**（改前旧值） | ❌ **静默丢弃** |

改用单节点 `cocos_label set_style`（一次只传 `lineHeight`）逐个下，四个全部落盘成功。

> **口径**：`batch_set_style` 对 `lineHeight` 不可信，其余字段可信。
> 与本条已记的 `batch_create_label 不吃 lineHeight` 是同一类边界 ——
> **凡 batch 系列碰 `lineHeight` 一律走单点调用**。

**再次印证本条的核心规则**：`success: true` + `updated: 4/4` 都不等于生效，
唯一可信的是**落盘后用 python 只读解析 .prefab 复核**。本轮所有 prefab 改动
（剩牌角标 10 项 ×4 席、接风标 6 项 ×4 席）都是这样逐项断言过的，
`lineHeight` 这一处正是靠复核抓出来的 —— 若只看返回体就会带着旧值上线。

相关的换装类教训见 [[ERR-091__bitmap-font-lacks-glyph-swallows-text|ERR-091]]。

---

## 续记（2026-08-04 下午, 记牌器换装 · **#20 口径被证伪并收紧**）

REQ 记牌器换装重建 `nodeCardCounter`（33 节点：底板 + 16 表头 + 16 计数 + 高亮条），
把 #20 的适用面从「只有 `lineHeight` 不可信」**扩大到四个字段**，且推翻了「其余字段可信」这句。

**#20-R（修订版）：`cocos_label batch_set_style` 只有 `fontSize` 与两个 align 真落盘**

| 字段 | 传入 | 落盘 | |
|---|---|---|---|
| `fontSize` | 21 / 26 | 21 / 26 | ✅ |
| `horizontalAlign` / `verticalAlign` | CENTER | CENTER | ✅ |
| `lineHeight` | 24 / 28 / 30 / 25 | 旧值原封不动 | ❌ |
| `color` | 米黄 / 白 | 255,255,255（默认） | ❌ |
| `enableWrapText` | false | true（默认） | ❌ |
| `overflow` | NONE | 旧值 SHRINK | ❌ |

**关键新证据**：`lineHeight` **单独传（整个调用只有这一个字段）照样空转** —— 返回
`✅ Style updated on 16/16 Label nodes`，盘上 16 个 Label 的 `_lineHeight` 一个没变。
故旧口径里「与 batch_create_label 同一类边界」的解释不成立：这不是「多字段互相挤掉」，
是 **`batch_set_style` 的字段分发表本身只覆盖 fontSize + 两个 align**。

**单点 `set_style` 也救不了 `color`**：对单个节点只传 `color`，返回
`✅ Style updated: color`，盘上 `_color` 仍是 255,255,255。故 #20 原文给的
「改用单节点 set_style 逐个下」这条出路**只对 `lineHeight` 成立，对 `color` 不成立**。

### 正解（本轮 31 个 Label 全靠它收口）

`cocos_component set_property` 的 **`properties` 批量形式**，一次把一个节点的多个字段全设完：

```jsonc
{ action:"set_property", node:"<uuid>", componentType:"cc.Label",
  properties:{
    "lineHeight":     {"type":"number",  "value":30},
    "overflow":       {"type":"number",  "value":0},
    "enableWrapText": {"type":"boolean", "value":false},
    "color":          {"type":"color",   "value":"#FAFCE1FF"}   // 只收 hex, 见本条 #10
  }}
```
返回逐字段列出 `success`，且**盘上逐项复核全中**。31 个 Label × 3~4 字段，零遗漏。

> **收紧后的口径**：`cocos_label` 这一整个工具族，**只在「设文案」(`set_text`) 与
> 「设字号/对齐」时可用**；任何涉及 `lineHeight` / `color` / `overflow` /
> `enableWrapText` 的样式改动，一律走 `cocos_component set_property`。

### 顺带第三次印证 `reorder` / `move`

- `cocos_node reorder(siblingIndex:0)` —— 再次把节点**甩出 prefab**，
  `parent` 变成场景根（错误文案 `Reparent verification failed ... actual: <Scene uuid>`，
  **副作用已落**）。本条 #1 / #16 已记，这是**第 3 次复现**，可判定为稳定行为而非偶发。
- `cocos_node move(targetParent:<原父>, siblingIndex:0)` —— 返回
  `✅ Node moved to index 0`、`verified: true`，盘上兄弟序**纹丝未动**（仍是末位）。
  比 reorder 温和（不扯出 prefab）但同样不可信。

**唯一可靠的兄弟序手法仍是「按渲染次序建节点」**；已经建错的，
`delete` 掉再 `create`（新节点恒进末位）。本轮 `sprLevelHL` 需要垫在级牌列两个 Label 之下，
就是靠「删掉 `lblCnt_3` 再重建到末位」把 z 序掰正的 —— 比挪高亮条稳。

### 为什么这次能抓出来

本轮**每一次 `edit_save` 之后都用 python 只读解析 .prefab 全量复核**，
四个字段的静默失效全是这样现形的。若只看返回体：16 列的行高、
全部表头的配色、级牌列被琥珀条盖死的 z 序 —— 三处缺陷会一起带上线，
且其中 z 序那处**在其余 15 列全对的情况下只瞎一列**，人眼过一遍很可能漏掉。


## 2026-08-10 追记（8.10 美术批实证，两条）

- **`cocos_node batch_modify` 的 `active` 字段被静默吞**：入参带 `active:false`，回执 `applied` 只报 `["transform","size"]`，active 未落。必须逐节点用 `cocos_node modify` 单发 `active`（其回执 `updatedProperties:["active"]` 才可信）。同族老账：create 的 position 被吞、composite 的 color 被吞。
- **`cocos_asset import_folder`/`import` 落库类型恒为 `texture`**（无 f9941 spriteFrame 子资产），与 ERR-079 手工拖入同病。PAT-040 三步（copy 既有 sprite-frame 模板继承 meta → 覆写 png 字节 → reimport）当场救回，九张全绿。导入后第一件事仍是全量断言 meta `userData.type == "sprite-frame"`。
