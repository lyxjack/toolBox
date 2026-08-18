---
id: ERR-081
type: error
errorCode: EVD-003
severity: high
status: resolved
recurrence: 0
firstSeen: "2026-07-29"
tags:
  - ki/error-book
  - error
  - severity/high
  - engine/cocos
  - tool/MCP
  - asset/prefab
  - asset/texture
  - errorCode/EVD-003
prevention:
  - "cocos-mcp `cocos_component set_property(propertyType='spriteFrame')` 的 value 一律传**裸 UUID** `<image-uuid>@f9941`，**禁止**传 `db://...png@f9941` 路径串。路径串会被原样序列化进 `_spriteFrame.__uuid__`，运行期 assetManager 按 uuid 查表查不到 → 静默丢图"
  - "image UUID 只能取自权威源：`.png.meta` 顶层 `uuid` 字段，或 `cocos_asset details` 的 subAssets。**不要**用 `query_uuid` 的返回当唯一依据（它按约定拼串，见 [[ERR-079__png-import-texture-type-spriteframe-missing|ERR-079]]）"
  - "spriteFrame 赋值后**必须磁盘复验**：python/node 解析 .prefab JSON，断言 `_spriteFrame.__uuid__` 匹配 `^[0-9a-f-]{36}(@[0-9a-f]+)?$`。工具返回的 `success:true` / `changeVerified:true` 与编辑器内视觉正常**三者全都不作数** —— 本案三个绿灯同时亮，落盘仍是错的"
  - "`changeVerified` 只证明编辑器内存里那个字段被改动过，**不证明序列化形态正确**。凡是 MCP 写资产引用（spriteFrame / prefab / material / 任何 `__uuid__` 槽），验收面必须落到磁盘文件，不能停在工具返回值"
  - "复验的判据是「与同 prefab 内**存量引用的形态**一致」，不是「值看着对」。本案存量引用全是 `842c3457-96d4-4ddc-88f6-43dbc3f6c61b@f9941`，新写入的 `db://...@f9941` 尾巴一样、前半截完全不同——只比后缀会漏"
ci_rules:
  - type: "code-pattern-ban"
    file_pattern: "\\.(prefab|scene)$"
    pattern: "__uuid__\\x22:\\s*\\x22db://"
    message: "ERR-081: prefab/scene 的 __uuid__ 槽存成了 db:// 路径串而非真 UUID，运行期资产解析必失败（静默丢图）。spriteFrame 赋值一律传裸 UUID <image-uuid>@f9941"
mem_ref: 019fb180-7b30-78b3-9512-d2423a053218
mem_status: linked
related:
  - Error_Book/entries/ERR-069__cocos-mcp-tool-quirks-collection.md
  - Error_Book/entries/ERR-064__at-sign-asset-db-url-resolution-truncated.md
  - Error_Book/entries/ERR-079__png-import-texture-type-spriteframe-missing.md
  - Internal_KI/patterns/PAT-036__art-asset-intake-to-onscreen.md
aliases:
  - ERR-081
  - spriteframe-db-url-fake-uuid
  - changeVerified-false-positive
---

# cocos-mcp 给 spriteFrame 传 `db://` 路径 → 工具报 changeVerified 真，落盘却是假 UUID

## 错误现象

2026-07-29 同花顺指示器编辑器轨，给花色图标的 Sprite 挂牌面图，走 cocos-mcp：

```
cocos_component set_property(
  property     = "spriteFrame",
  propertyType = "spriteFrame",
  value        = "db://assets/game/DLGD_L/bundles/game-gd_l/cards_l/SA.png@f9941"
)
```

工具返回 `success: true`、`changeVerified: true`，编辑器场景里图也**正常显示出来了**。三个绿灯齐亮。

保存后打开 `WMGDGameLayer_l.prefab` 一看：

```jsonc
// 本次写进去的（错）
"_spriteFrame": { "__uuid__": "db://assets/game/DLGD_L/bundles/game-gd_l/cards_l/SA.png@f9941" }

// 同一个 prefab 里存量引用的形态（对）
"_spriteFrame": { "__uuid__": "842c3457-96d4-4ddc-88f6-43dbc3f6c61b@f9941" }
```

`__uuid__` 槽里躺的是 **db:// 路径字符串原样**，不是 UUID。`842c3457-96d4-4ddc-88f6-43dbc3f6c61b` 正是 `SA.png.meta` 顶层 `uuid` 字段的值 —— 也就是说工具**有能力**解析这个路径（否则编辑器里图不会显示），但序列化时把入参原样落盘了。运行期 `assetManager` 按 uuid 查表必查不到 → 静默丢图（asset missing），画面上就是个空 Sprite。

## 根因分析

**编辑器内解析路径 ≠ 序列化写真 UUID，是两条独立的代码路径，MCP 只走通了第一条。**

| 面 | 表现 | 为什么骗过验收 |
|---|---|---|
| 工具返回 | `success: true` | 属性写入没抛异常即报成功 —— [[ERR-069__cocos-mcp-tool-quirks-collection\|ERR-069]] 的母题 |
| 工具自检 | `changeVerified: true` | 它只回读**编辑器内存里那个字段被改动过**，不校验序列化形态 |
| 编辑器视觉 | 图正常显示 | Inspector 侧临时把 db:// 解析成了资产对象来渲染，落盘走的却是另一条路 |
| 运行期 | 静默丢图 | 只有 preview console / 实际画面能暴露 |

三个绿灯彼此**不独立** —— 它们全都在"编辑器进程内"这一侧，而缺陷在"进程内 → 磁盘"这一步。用同侧的三个信号互相印证，无论几个都不构成证据。这是 [[ERR-064__at-sign-asset-db-url-resolution-truncated|ERR-064]]（db:// 路径解析截断）的孪生：同样是 db:// 形态的入参在资产引用链上被错误处理，同样只有落盘/运行期能定案。

## 解决方案

**赋值一律传裸 UUID。**

```
# 1. 取 image UUID（权威源：.png.meta 顶层 uuid 字段）
grep -m1 '"uuid"' <asset>.png.meta        # → 842c3457-96d4-4ddc-88f6-43dbc3f6c61b
#    或 cocos_asset details 读 subAssets

# 2. 拼 spriteFrame 子资产地址
value = "842c3457-96d4-4ddc-88f6-43dbc3f6c61b@f9941"

# 3. 赋值
cocos_component set_property(property="spriteFrame", propertyType="spriteFrame", value=<裸 UUID>)
```

**赋值后必须磁盘复验**（唯一算数的验收面）：

```python
import json, re, sys
d = json.load(open(prefab_path))
UUID_RE = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(@[0-9a-f]+)?$')
for node in d:
    sf = isinstance(node, dict) and node.get('_spriteFrame')
    if isinstance(sf, dict) and '__uuid__' in sf:
        assert UUID_RE.match(sf['__uuid__']), f"假 UUID: {sf['__uuid__']}"
```

断言口径是**「匹配真 UUID 形态」**，不是「值非空」也不是「后缀是 @f9941」—— 错值的 `@f9941` 后缀与正确值一模一样，只比后缀必漏。

本案修复后 `WMGDGameLayer_l.prefab` 全量 grep `db://` 已归零。

## 预防规则

见 frontmatter。一句话：**spriteFrame 只喂裸 UUID；`changeVerified` 不是落盘证据，磁盘 JSON 才是。**

ci_rules：已加 `code-pattern-ban`，扫 `.prefab`/`.scene` 里 `"__uuid__": "db://` 形态。这条误报率近零（真 UUID 永远不以 `db://` 开头），是本类缺陷唯一的静态检出点。已用一次性 git 仓做正反例实测：`bad.prefab` 命中并阻断、`good.prefab` 不误报。

注意两条适用边界：

1. linter 依赖**调用方 cwd 是 git 仓库且有 staged changes**。`ccc-newkds-gd` 当前非 git 仓库，该规则在此工程内不会触发 —— 那里仍须靠上面的磁盘复验脚本兜底。
2. **写 ci_rules 正则时不能出现字面双引号**。`error-book-linter.mjs` 用的是简易 YAML 解析器，嵌套对象字段走 `/^\s+(\w[\w_]*):\s*"?([^"]*)"?\s*$/` —— `[^"]*` 容不下任何 `"`，正则里写 `\"` 会让整个 `pattern` 字段被**静默丢弃**，而 `lint:validate` 依旧报 `✓ has ci_rules`（它只查数组在不在，不查字段内容）。要匹配双引号必须写 `\\x22`。本条的 pattern 因此是 `__uuid__\x22:\s*\x22db://`。


**实证 +1（2026-07-31, REQ-20260731-053000）**：本条的失效面比「传 `db://` 路径」更宽——
**传一个格式合法但压根不存在的裸 UUID，工具同样报 `success:true` + `changeVerified:true` + 回显 `actualValue`**。

当轮实况：手打 `fc62afce-a5ae-48b8-a2e8-4307fef2449a`（把真 uuid 的第三段 `8dc1` 误敲成 `a2e8`），
工具回显 `{"uuid":"fc62afce-a5ae-48b8-a2e8-4307fef2449a@f9941"}` 并断言 `changeVerified: true` —— 全绿。
只有拿 `.meta` 里的真 uuid 逐字比对才发现是空引用。

**规则收紧**：spriteFrame 赋值的 uuid **不许手打、不许凭记忆、不许从对话上文复制**，
一律从入库时落盘的 `uuid_map.json` 程序化取（见 [[PAT-040__meta-inheriting-asset-import-bypass|PAT-040]] 的批量流程）。
落盘复验也要升级：不只断言"是 UUID 形态"，而要断言**该 uuid ∈ 本批次真实 uuid 白名单**。
本轮 Codex 交叉验证正是按白名单核对 53 处引用，才给出"零 bogus"的可信结论。

## 关联

- [[ERR-069__cocos-mcp-tool-quirks-collection|ERR-069]] — 母题「MCP success ≠ 生效」；本条把它推进一层：**连 `changeVerified` 这个自检字段也会假阳性**，因为它与被验对象同处编辑器进程内
- [[ERR-064__at-sign-asset-db-url-resolution-truncated|ERR-064]] — 孪生：同样是 db:// 形态入参在资产引用链上出错、同样只有运行期定案
- [[ERR-079__png-import-texture-type-spriteframe-missing|ERR-079]] — 同一批 `cards_l` 素材上的前一坑（导入类型 texture），且同样以「`@f9941` 地址能拼出来」为假阳性验收面。两条合起来的教训：**关于 spriteFrame，编辑器侧任何信号都不作数**
- [[PAT-036__art-asset-intake-to-onscreen|PAT-036]] — 美术资源入库六步法；本条是其 §6「上屏」环节新增的落盘复验闸
