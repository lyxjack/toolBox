---
id: PAT-040
type: pattern
title: "绕过 MCP 能力缺口：copy 模板继承 meta → 字节覆写 → reimport"
status: active
created: "2026-07-31"
trigger_condition: user_explicit
tags:
  - ki/internal
  - pattern
  - trigger/user_explicit
  - engine/cocos
  - asset/texture
  - tool/MCP
complements:
  - "[[ERR-079__png-import-texture-type-spriteframe-missing|ERR-079]]"
  - "[[PAT-036__art-asset-intake-to-onscreen|PAT-036]]"
related:
  - "Error_Book/entries/ERR-079__png-import-texture-type-spriteframe-missing.md"
  - "Internal_KI/patterns/PAT-036__art-asset-intake-to-onscreen.md"
  - "Error_Book/entries/ERR-083__mcp-write-param-triggers-modal-deadlock.md"
mem_ref: f2fc0920-e60f-4b21-b000-6797dd42b4ae
mem_status: linked
aliases:
  - PAT-040
  - meta-inheriting-import
  - 免手工-spriteframe-管线
---

# 绕过 MCP 能力缺口：copy 模板继承 meta → 字节覆写 → reimport

## 适用场景

工具面缺少某个能力（此处：改 png 导入类型 texture→sprite-frame），而铁律又禁止手写该能力对应的配置文件（`.meta`）。
既往结论是「这是编辑器手工步，必须人工介入」（[[PAT-036__art-asset-intake-to-onscreen|PAT-036]] §4 与
[[ERR-079__png-import-texture-type-spriteframe-missing|ERR-079]]）。**本模式把它自动化了。**

2026-07-31 掼蛋美术第二批 30 张切图入库实证：30/30 一次成型，零人工介入。

## 核心洞察

把「我不能创建 X」换成「谁已经有 X，我能不能继承它」：

| 事实 | 推论 |
|---|---|
| 导入类型存于 `.meta` 的 `userData.type` | 不能手写 —— 铁律禁改 `.meta` |
| `cocos_asset copy` 走编辑器管线，**新资产继承源资产的 meta**（含 type，换新 uuid） | 已是 sprite-frame 的图 = 现成的「类型模板」 |
| 铁律禁改清单是 `.scene/.prefab/.anim/.meta` —— **png 本体不在其中** | 覆写 png 字节合法，等价于「美工在外部改了图」 |
| `reimport` 按当前字节重算子资产，**保留 uuid 与 type** | 覆写后 reimport = 内容换新、类型不变 |

## 步骤

```bash
# 前提：目标目录里已有至少一张 type=sprite-frame 的图当模板（没有就人工做第一张，一次性）
# 1. copy 模板为目标名（继承 sprite-frame，得新 uuid —— 记下来，后续 prefab 赋值要用）
cocos_asset copy(source="db://.../suo.png", target="db://.../pic_suit_s.png")
# 2. 文件系统覆写字节（png 本体不在禁改清单）
cp <stage>/pic_suit_s.png <project>/assets/.../pic_suit_s.png
# 3. 触发重导（批量可先 refresh 再逐个 reimport）
cocos_asset reimport(url="db://.../pic_suit_s.png")
```

批量时先 `copy` ×N 收集 uuid 落盘成 `uuid_map.json`，再统一覆写 + refresh —— uuid 表是后续 prefab 赋值的唯一可信源
（**禁止手打 uuid**，工具对假 uuid 照报 `changeVerified:true`，见 [[ERR-081__mcp-spriteframe-dburl-persists-fake-uuid|ERR-081]]）。

## 验收四断言（缺一不可）

| 断言 | 方法 | 防的是什么 |
|---|---|---|
| 字节一致 | `cmp` 源图 vs 入库图 | 覆写串图/漏覆写（**漏覆写时其余三项全绿，只有这项能抓**——文件还是模板内容） |
| 导入类型 | `.meta` `userData.type == "sprite-frame"` | 模板选错（拿了张 texture 图当模板） |
| **rect 已重算** | spriteFrame 子资产 `rawWidth/rawHeight == 新图真实尺寸` | **reimport 没生效** —— 若仍是模板尺寸，说明只换了字节没重导，运行期按错误尺寸裁切 |
| library 真产物 | `library/<xx>/<uuid>@f9941.json` 存在 | `@f9941` 拼串不是证据（ERR-079 母题） |

全量扫，不抽样。

## 反模式

| 错误做法 | 后果 | 正解 |
|---|---|---|
| `import`/`import_folder` 直接导入 | 落 `texture` 类型，双向静默失效 | 本模式 |
| `import(overwrite=true)` 覆盖已存在资产 | **弹原生模态框锁死整个 MCP 通道**，只能重启编辑器 | [[ERR-083__mcp-write-param-triggers-modal-deadlock\|ERR-083]] |
| 手写 `.meta` 改 type | 违反铁律，且 library 产物不同步 | 本模式 |
| 只验字节+类型，不验 rect | reimport 漏跑时静默用模板尺寸 | 四断言全做 |

## 泛化

**工具面缺能力时，先问「这个属性是从哪继承来的」，而不是「怎么直接写它」。**
凡是「配置随 copy 继承 + 内容可独立替换 + 有 reimport/reload 通道」的资产系统，都适用这个三步式。
下游衔接（拿到 uuid 后的 prefab 换装）走 [[PAT-001__mcp-prefab-workflow|PAT-001]]，
整批美术从交付到上屏的全流程走 [[PAT-036__art-asset-intake-to-onscreen|PAT-036]]。
