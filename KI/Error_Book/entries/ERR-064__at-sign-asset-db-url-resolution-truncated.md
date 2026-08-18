---
id: ERR-064
type: error
errorCode: ERR-064
severity: medium
status: resolved
recurrence: 0
firstSeen: "2026-07-25"
tags:
  - ki/error-book
  - error
  - severity/medium
  - engine/cocos
  - tool/cocos-mcp
prevention:
  - "文件名含 @ 的资产（pic_gold@2x.png 等）禁止用 db:// 路径给 builder/set_property 自动解析 spriteFrame——@ 是 Cocos 资产库子资产分隔符, 路径会被截断, 编辑器期不报错、preview 运行期才呈 missing（品红块）"
  - "此类资产一律 `<纹理uuid>@f9941` 直引（uuid 从 .meta 反查）; set_property 返回的 sizeBefore/After 尺寸校验可当场确认引用有效"
  - "MCP 批量建 UI 后, preview 首跑必查 console 'asset ... is missing'——editor 侧 grep prefab 验不出这类解析失败"
ci_rules: []
mem_ref: 2b771c42-2d14-4883-8ff4-1afb0c0c3f12
mem_status: linked
related:
  - "Error_Book/entries/ERR-034__cocos-mcp-server-161-property-whitelist-and-tool-gaps.md"
  - "Internal_KI/patterns/PAT-001__mcp-prefab-workflow.md"
aliases:
  - "ERR-064"
  - "at-sign-asset-db-url"
---

# 含 @ 文件名资产经 builder db:// 路径解析被截断 → 运行期 spriteFrame missing

## 错误现象

掼蛋 REQ-20260724-161843 T6/T8 用 cocos_builder 以 `db://.../pic_gold@2x.png/spriteFrame`、`db://.../bgjs@2x.png/spriteFrame` 批量建 UI。builder 返回零错误、prefab grep 验证通过——但 preview 运行期四家金币图标与结算板底图全部显示品红块, console 连刷 `The asset db://... is missing!`。

## 根因

`@` 是 Cocos 资产库子资产分隔符（`uuid@f9941` 式）。文件名自带 `@2x` 时, db:// 路径的自动解析在 `@` 处被截断, 序列化进 prefab 的引用无效。编辑器期不校验该引用可达性, 只有运行期加载才暴露。同目录不含 `@` 的资产（head.png、DJS_headkuang.png 等）同法引用全部正常——精确指纹。

## 修复

改用 uuid 直引: 从 `.meta` 反查纹理 uuid, `set_property` 传 `<uuid>@f9941`。修复后 `sizeBefore/After` 尺寸校验值与素材实际尺寸一致（37×44 / 471×473）, 运行期渲染恢复。见 ccc-newkds-gd commit 3245217。

## 预防规则

见 frontmatter。ci_rules 评估: 资产命名扫描可做但收益低（gz 母版存量 @2x 资产极多且只在被 MCP 引用时才踩雷）, 留空。

## 关联

- [[ERR-034__cocos-mcp-server-161-property-whitelist-and-tool-gaps|ERR-034]] — 同族: MCP 工具面能力缺口, 表面成功≠真实生效
- [[PAT-001__mcp-prefab-workflow|PAT-001]] — 本条补充其盲区: grep 验证防字符串化, 防不了解析截断, 需 preview console 补一道
