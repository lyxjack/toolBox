---
id: ERR-084
type: error
errorCode: EVD-003
severity: medium
status: resolved
recurrence: 0
firstSeen: "2026-07-31"
tags:
  - ki/error-book
  - error
  - severity/medium
  - engine/cocos
  - asset/texture
  - domain/ui
prevention:
  - "**换图三件套，缺一不可**：① 换 `_spriteFrame` ② **复位 `_color` 为白** ③ **查同级/父级是否有占位期配套装饰需要一并退场**。占位期为了模拟外观，Sprite 通常是「内置图 + 深色 tint」；换图**不会重置 tint**，真图被乘上深色 → 上屏发暗发灰，肉眼像"图没换成功""
  - "**占位期的『配套件』是隐形地雷**：占位时代表某语义的兄弟节点（灰色头像框 81×81 盖在 70×70 头像上），真件到货后就成了纯遮挡物。换图前先看一眼**该节点的兄弟列表**，问「哪些是为占位而生的」"
  - "**纯 JSON 落盘断言对本类缺陷零检出**。断言查的是 spriteFrame uuid / contentSize / active —— `_color` 与「兄弟节点遮挡」都不在断言面上。占位改真件的验收**必须含视觉断言**（截图肉眼比对），这是 [[ERR-079__png-import-texture-type-spriteframe-missing|ERR-079]]「验收清单里没这一项就零检出」母题在渲染面的复现"
  - "**反向扫描清单**（换装批次收尾时跑一遍）：grep 本批次挂点及其兄弟节点，凡 `_color` 非 `255,255,255,255`、或 `_spriteFrame` 仍指向引擎内置 uuid（`default_btn_normal` / `splash`）的，都是占位期残留，逐个判定去留"
  - "**别把『断言全绿』当成『做完了』**。本案 29 处换装落盘断言 100% 通过、Codex 交叉验证 A–D 项零反例，缺陷仍然存在——因为它只在像素上可见。**能被 JSON 证明的和用户能看见的，是两个集合**"
  - "**文案改名批次里，注释也是文案面**（2026-08-04 复现）。断言只扫 `_string` / toast / `Label.string` 三个用户可见面并报「旧名清零」，方法文档注释里的旧文案照样活着，与已改的常量说明互相打架。改名断言必须分三层：① 用户可见文案（必须清零）② 代码注释与文档（必须同步）③ 常量名与内部术语（通常保留，但要在定义处补新旧对照）"
ci_rules: []
mem_ref: f2fc0920-e60f-4b21-b000-6797dd42b4ae
mem_status: linked
req_ref: REQ-20260731-053000
related:
  - "Error_Book/entries/ERR-079__png-import-texture-type-spriteframe-missing.md"
  - "Internal_KI/patterns/PAT-036__art-asset-intake-to-onscreen.md"
  - "Error_Book/entries/ERR-073__lazy-init-leaves-prefab-clone-template-visible.md"
  - "Error_Book/entries/ERR-107__mocked-preview-misrepresents-live-ui-in-user-choice.md"
  - "Internal_KI/patterns/PAT-044__slot-content-swap-instead-of-node-relocation.md"
aliases:
  - ERR-084
  - placeholder-tint-residue
  - 换图不复位tint
---

# 占位换真件只换了图，占位期的 tint 与配套框把新素材压暗、盖死

## 错误现象

掼蛋美术第二批 29 处 prefab 换装，逐项落盘断言全绿（spriteFrame uuid 正确、contentSize 正确、library 产物在盘）。
截图一看：

- 四席**头像发暗发灰**，像蒙了层脏
- 头像被一个**灰色方框盖住**大半
- 金币底、等级面板底同样偏暗

即"资产层面 100% 正确，视觉层面明显不对"。

## 根因分析

两条独立成因叠加，都源于「占位期的临时手段没有随真件到货而退场」：

| # | 成因 | 具体 |
|---|---|---|
| ① | **tint 残留** | 占位期用引擎内置图（`splash` 纯白 / `default_btn_normal`）+ 深色 `_color` 模拟外观：头像 `#55607A`、金币底 `#1E2430`、面板底 `#2C3442`。换 `_spriteFrame` **不触碰 `_color`** → 真图被乘上深色 tint |
| ② | **配套装饰变遮挡** | 占位期 `sprHeadFrame`（81×81 灰色九宫框）表示"头像框"。真头像（90×86 小黄鸡）到货后，这枚灰框成了盖在上面的纯遮挡物 |

**为什么断言全绿却没抓到**：验收断言查的是 `_spriteFrame.__uuid__`、`_contentSize`、`_active`。
`_color` 不在断言面上；"兄弟节点在 z 序上盖住了我"更是任何单节点断言都表达不了的关系型属性。

这与 [[ERR-079__png-import-texture-type-spriteframe-missing|ERR-079]] 同母题——**验收清单里没有的项，检出率恒为零**——
只是那次的盲区是「导入类型」，这次的盲区是「渲染态」。

## 解决方案

**当轮修复**（编辑器轨，两步）：
1. 9 个换图挂点（头像 ×4、金币底 ×4、面板底 ×1）`_color` 全部复位 `#FFFFFF`
2. `sprHeadFrame` ×4 置 `_active=false`（保留节点可逆，候美术出真框图；不删是因为它仍是契约节点）

**落盘复验**：解析 `.prefab` 断言这批 Sprite 的 `_color` 全为 `255,255,255,255`、`sprHeadFrame` 四席 `_active=false`，
再复截图肉眼比对。

## 预防规则

见 frontmatter。一句话：**换图不是换一个字段，是让整套占位手段退场；而占位手段是否退干净，只有像素能作证。**

ci_rules 评估：可做「本批次挂点 `_color` 非白」的批处理扫描（换装收尾时跑），
但需要"本批次挂点清单"作输入，属一次性任务脚本而非常驻 CI；故留空，改以 prevention 第 4 条的反向扫描清单落地。

## 关联

- [[ERR-079__png-import-texture-type-spriteframe-missing|ERR-079]] — 同母题「验收清单缺项 = 零检出」，那次盲区是导入类型，本次是渲染态
- [[PAT-036__art-asset-intake-to-onscreen|PAT-036]] — 美术上屏六步法；本条应作为其 §6「上屏」环节的新增闸门
- [[ERR-073__lazy-init-leaves-prefab-clone-template-visible|ERR-073]] — 同族：prefab 里为开发期存在的东西没在正式态退场
- [[ERR-069__cocos-mcp-tool-quirks-collection|ERR-069]] — 母题「success≠生效」的渲染面实例：工具报 `changeVerified:true`，用户看到的仍是错的
- [[ERR-107__mocked-preview-misrepresents-live-ui-in-user-choice|ERR-107]] — 同母题**前移到决策阶段**：提问时没验的事实照样会污染用户的选择，且不可逆
- [[PAT-044__slot-content-swap-instead-of-node-relocation|PAT-044]] — 换图三件套在 UI 重排场景的落地位置（其第 3 步）

---

## 续记（2026-08-04, REQ-20260804-195048 大厅入口重排）— 母题第三次复现，这次盲区在**文档态**

本条母题「验收清单里没有的项，检出率恒为零」再次命中。前两次分别是**导入类型**（[[ERR-079__png-import-texture-type-spriteframe-missing|ERR-079]]）与**渲染态**（本条正文），这次是**文档态**：

一批玩法改名（「快速模式」→「经典模式」、「经典模式」→「连打过A」）收尾时，断言扫了三个"用户可见文案面" —— prefab 的 `_string`、`TipFunc.push` toast、`Label.string` 赋值 —— 全部清零，据此出具了"旧名已清"的结论。
Codex 交叉验证揪出：同一个文件的**方法文档注释**里还写着旧标题「掼蛋 · 金币场」，与已改的常量说明和 prefab 实际文字互相冲突。**注释面从来不在断言里。**

**文案改名批次的断言面应当分三层**（缺一层就会留下互相打架的说法）：

| 层 | 内容 | 处置 |
|---|---|---|
| ① 用户可见文案 | prefab `_string` / toast / `Label.string` 赋值 | **必须清零** |
| ② 代码注释与文档 | 方法注释、文件头、nodes.md、契约文档里引用的文案 | **必须同步**，否则后人按注释改回旧名 |
| ③ 常量名与内部术语 | `TITLE_QUICK`、房规位名 `quickMode` 等 | **通常应保留**（它标的是内部语义不是对外叫法），但要在定义处补一行新旧对照 |

一句话：**改名批次里，注释也是文案面。**
