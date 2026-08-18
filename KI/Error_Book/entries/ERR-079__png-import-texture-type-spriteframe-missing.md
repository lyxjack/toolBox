---
id: ERR-079
type: error
errorCode: EVD-002
severity: high
status: resolved
recurrence: 0
firstSeen: "2026-07-28"
tags:
  - ki/error-book
  - error
  - severity/high
  - engine/cocos
  - tool/MCP
  - asset/texture
  - errorCode/EVD-002
prevention:
  - "MCP `import_folder`/`import` 导入的 png 一律落 `userData.type: texture`（无 spriteFrame 子资产）。png 入库后**第一件事**就是验类型并改成 sprite-frame：`grep '\"type\"' <f>.png.meta` 必须是 sprite-frame，批量导入全量扫不抽样。用户 2026-07-28 明令"
  - "`cocos_asset query_uuid('<f>.png/spriteFrame')` 返回 `<uuid>@f9941` **不能**作为 spriteFrame 子资产存在的证据——它只按约定拼串，子资产不存在也照样返回 success。拿它当验收依据 = 假阳性"
  - "texture 类型的后果是**双向静默**：代码侧 `bundle.loadDir(dir, SpriteFrame)` 返回 0 张且**不报错**（调用方走回退，画面显示旧皮肤，肉眼难辨）；编辑器侧 Sprite 组件拖不上图（prefab 换装直接卡住）"
  - "资产入库验收清单必须把「导入类型」列为**独立断言项**，与文件数/字节一致性并列。只验『文件在不在、字节对不对、uuid 拼不拼得出』的清单对本类缺陷零检出——本案 codex 交叉验证六项全 PASS 仍漏判，因为清单里没这一项"
  - "真实可用性的唯一裁判是运行期：`bundle.getDirWithPath(dir, SpriteFrame).length` 或 preview console，不看工具返回值"
  - "`loadDir` 回来的 ImageAsset **name 恒为空串**（createWithImage 造出的 SpriteFrame 同样无名）。索引键必须取 `bundle.getDirWithPath(dir, Ctor)` 的 `path` 末段，用 `asset.name` 建索引会得到空表且不报任何错"
ci_rules: []
mem_ref: 019fabca-96bf-7980-8352-ae25d87e91bd
mem_status: linked
related:
  - Error_Book/entries/ERR-034__cocos-mcp-server-161-property-whitelist-and-tool-gaps.md
  - Error_Book/entries/ERR-064__at-sign-asset-db-url-resolution-truncated.md
  - Error_Book/entries/ERR-069__cocos-mcp-tool-quirks-collection.md
aliases:
  - ERR-079
  - png-texture-not-spriteframe
  - spriteframe-false-positive
---

# MCP 导入 png 落 texture 类型 → spriteFrame 缺失，且 `query_uuid` 构成假阳性验收

## 错误现象

掼蛋美工切图入库（54 张手牌牌面 + 7 张按钮）经 `cocos_asset import_folder` 落库。入库验收做了三项：文件数 61/61、逐张 `cmp` 字节一致、抽验 `query_uuid('HA.png/spriteFrame')` 返回 `35ce92b6-…@f9941`。臣与 codex 交叉验证**六项全 PASS**，出具"入库完成"结论。

当晚接线手牌皮肤后，preview 里手牌**看起来换了新牌面**，实则 console 在报：

```
[GdHandCardSkin] 牌面目录加载失败, 手牌回退合成式牌面: cards_l
[WMGDGameLayer_l] 牌面皮肤就绪(手牌=false 出牌区=true)
```

—— 手牌用的仍是旧的打滚子合成式牌面。因两套牌面美术风格接近，肉眼几乎分辨不出，臣一度据截图误判"新牌面已上屏"，直到读 console 才发现。

## 根因分析

61 张 png 的 `userData.type` 全是 `texture`（`subMetas` 只有一个 texture 子资产），项目里其余图则都是 `sprite-frame`。这是 [[ERR-034__cocos-mcp-server-161-property-whitelist-and-tool-gaps|ERR-034]] 第 5 条早已记录的坑（"MCP 导入 png 默认 texture 类型"）的**复犯**。

三层放大了它的隐蔽性：

| 层 | 现象 | 为何骗过验收 |
|---|---|---|
| 验收面 | `query_uuid('X.png/spriteFrame')` → `<uuid>@f9941` success | **按约定拼串**，子资产不存在也返回。把"能拼出地址"当成了"东西在那儿" |
| 运行期 | `loadDir(dir, SpriteFrame)` → **0 张 + err=null** | 不报错，调用方静默走回退链 |
| 视觉 | 回退到的旧牌面与新素材风格接近 | 截图看不出差别，须读 console 才能定案 |

实测数据：`getDirWithPath('cards_l')` = 108 条（54 ImageAsset + 54 Texture2D），`getDirWithPath('cards_l', SpriteFrame)` = **0**，`getInfoWithPath('cards_l/HA', SpriteFrame)` = **false**。

## 解决方案

**正解（治本）**：编辑器 Inspector 选中该批图 → Type 改 `sprite-frame` → Apply。当前 cocos-mcp 工具面（`cocos_asset` 的 17 个 action）**无改导入类型的能力**，`reimport` 也不改类型；铁律禁止手写 `.meta`，故这是**编辑器手工步**，必须显式告知用户，不能默默跳过（能力缺口的停手纪律见 [[ERR-069__cocos-mcp-tool-quirks-collection|ERR-069]] #14）。

**代码侧兜底（治标，本案已落地）**：两路兼容，日后类型改对可自动走优路径、代码不必再动。

```ts
// 键源必须是目录清单的 path —— loadDir 回来的 ImageAsset name 恒为空串
const nameByUuid = buildNameMap(bundle)   // getDirWithPath(dir, Ctor) → uuid → path 末段
bundle.loadDir(dir, SpriteFrame, (e, frames) => {
  if (!e && frames && frames.length > 0) { /* 正统路径 */ return }
  bundle.loadDir(dir, ImageAsset, (e2, imgs) => {     // texture 类型走这里
    const sf = SpriteFrame.createWithImage(img)       // 运行期现造
    sf.name = nameByUuid.get(uuidOf(img))             // 补名，否则索引全空
  })
})
```

另一条与本坑成对的落位纪律：**要按名运行期动态取图的素材必须放进 bundle 目录内**（`assets/game/DLGD_L/bundles/game-gd_l/cards_l/`）。放在主包 `textures/` 下只能被 prefab 静态引用，`assetManager` 取不到。仅供 prefab 拖引用的素材（如按钮）留主包即可。

## 预防规则

见 frontmatter。一句话：**png 进 Cocos 第一件事就是建 spriteFrame；`@f9941` 不是证据，运行期才是。**

ci_rules 评估：可做 `*.png.meta` 的 `type: texture` 扫描，但 gz 母版存量资产极多且多数不参与 UI，误报率高；防护面在入库工作法（见 [[PAT-036__art-asset-intake-to-onscreen|PAT-036]]），不在 linter，故留空。

## 关联

- [[ERR-034__cocos-mcp-server-161-property-whitelist-and-tool-gaps|ERR-034]] — **本条是其第 5 条的复犯 + 升格**：ERR-034 只记了"类型是 texture 需改"，本条补上「静默失效链 + 假阳性验收面」两层，并给出运行期兜底
- [[ERR-064__at-sign-asset-db-url-resolution-truncated|ERR-064]] — 同族孪生：同样是「db:// 路径 / uuid 拼串看着成功，运行期才暴露引用无效」，同样只有 preview console 能定案
- [[ERR-069__cocos-mcp-tool-quirks-collection|ERR-069]] — 母题「success≠生效」；本条是它在**资产导入**面的实例，兼撞其 #14 的能力缺口停手纪律
- [[ERR-080__error-book-recall-keyword-mismatch|ERR-080]] — 本条为何会复犯：召回时检索词与条目关键词不匹配
- [[PAT-036__art-asset-intake-to-onscreen|PAT-036]] — 本条催生的正向工作法
