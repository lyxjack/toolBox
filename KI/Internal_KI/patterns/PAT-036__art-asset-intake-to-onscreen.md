---
id: PAT-036
type: pattern
title: "美术资源从交付到上屏的六步工作法（Cocos 3.8 + cocos-mcp）"
status: active
created: "2026-07-28"
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
  - "[[ERR-064__at-sign-asset-db-url-resolution-truncated|ERR-064]]"
aliases:
  - PAT-036
  - art-asset-intake
  - 美术资源入库
mem_ref: 019fabca-96bf-7980-8352-ae25d87e91bd
mem_status: linked
---

# 美术资源从交付到上屏的六步工作法（Cocos 3.8 + cocos-mcp）

## 适用场景

美工交付一批切图（png），要放进 Cocos 工程并真正用起来。覆盖两类消费方：

- **代码动态取图**（按名索引的可变数量集合：手牌、列表行、头像）
- **prefab 静态引用**（数量固定的 UI：按钮、面板、图标）

两类的落位与验收要求不同，混做必踩坑。源自 2026-07-28 掼蛋美工切图入库（54 牌面 + 7 按钮），当轮踩了 [[ERR-079__png-import-texture-type-spriteframe-missing|ERR-079]]。

## 步骤

### 1. 定位：先问清"这批图给谁用"

决定后续每一步。**动手前必须问清**，不能自行假设：

| 消费方 | 落位 | 命名要求 | 验收重点 |
|---|---|---|---|
| 代码动态取图 | **bundle 目录内** | 文件名 = 代码里的键（如 CardStr） | 运行期 `loadDir` 拿得到 |
| prefab 静态引用 | 主包 `textures/` 即可 | 沿用美工原名（全 ASCII） | 编辑器里拖得上 Sprite |

掼蛋本例：新牌面给**本家手牌**用（动态），旧 poker_l 合成式牌面继续供**打出去的牌**用（不动）。这个分工是用户拍板的产品口径，必须先确认再动手。

### 2. 改名：中文名 → 代码契约名（仅动态取图需要）

代码按名索引，所以**文件名就是契约**。掼蛋映射：花色 黑桃→S / 红桃→H / 方片→D / 草花→C；点数 10→T，其余原样；小王→`SB.png`、大王→`HR.png`（与 `gd-rules` 的 `SMALL_JOKER`/`BIG_JOKER` 常量对齐，**读代码定，不靠记忆**）。

在**暂存目录**里改名，不要直接在工程内改（工程内改名会牵动 .meta 与引用）：

```bash
STAGE=<scratchpad>/stage/cards_l; mkdir -p "$STAGE"
# 按映射表 cp 到 STAGE，同时打印未匹配项（宁可报错也不要静默漏牌）
```

**命名雷区**：文件名不得含 `@`（Cocos 子资产分隔符，会截断 db:// 解析 → 运行期 missing，见 [[ERR-064__at-sign-asset-db-url-resolution-truncated|ERR-064]]）；避开中文与空格。

### 3. 导入：cocos-mcp `import_folder`，不要手工 cp

必须走编辑器管线才会生成 .meta（手工 cp + 手写 .meta 违反铁律且必错）：

```
cocos_asset import_folder(sourcePath=<STAGE>, targetFolder="db://assets/game/DLGD_L/bundles/game-gd_l/cards_l")
```

⚠️ **`import_folder` 把源目录里的文件平铺到 targetFolder**，不会自动建同名子目录——要落进 `cards_l/` 就得把它写进 `targetFolder` 末段。写错了用 `cocos_asset delete` 整个目录删掉重导，别留残留。

### 4. ⭐ 建 spriteFrame（**导入后第一件事，不可延后**）

MCP 导入的 png 一律落 `userData.type: texture`，**没有 spriteFrame 子资产**。后果双向静默：代码侧 `loadDir(dir, SpriteFrame)` 返回 0 张**且不报错**；编辑器侧 Sprite 组件拖不上图。

```bash
# 全量扫，不抽样
grep -L '"type": "sprite-frame"' <dir>/*.png.meta
```

> **⚡ 2026-07-31 更新：本步已可全自动，不再是编辑器手工步。**
> 用 [[PAT-040__meta-inheriting-asset-import-bypass|PAT-040]] 的三步管线替换上面的 §3 导入 + §4 建帧：
> **`copy` 一张已是 sprite-frame 的图当模板（meta 随 copy 继承）→ 文件系统覆写 png 字节 → `reimport`**。
> 掼蛋美术第二批 30 张实测一次成型、零人工介入。验收在原三断言上**加一条 rect 断言**
> （spriteFrame 的 `rawWidth/rawHeight` 必须等于新图真实尺寸——若仍是模板尺寸，说明 reimport 没生效）。
>
> ⚠️ 切勿用 `import(overwrite=true)` 覆盖已存在资产：会弹原生模态框**锁死整条 MCP 通道**，
> 只能重启编辑器，见 [[ERR-083__mcp-write-param-triggers-modal-deadlock|ERR-083]]。

**兜底路径（PAT-040 不适用时）**：不是 sprite-frame 就**当场改**：编辑器 Inspector 多选该批图 → Type 改 `sprite-frame` → Apply。

> **这是编辑器手工步**：cocos-mcp 当前工具面无改导入类型的能力，`reimport` 不改类型，而铁律禁止手写 `.meta`。必须显式告知用户并等其完成，**不能默默跳过、也不能拿代码兜底当作已解决**（兜底只救代码侧，救不了 prefab 侧）。

### 5. 验收：三项断言，缺一不可

| 断言 | 方法 | 说明 |
|---|---|---|
| 完整性 | 按映射规则生成期望文件名集合，与实际目录对比 | 缺失/多余/错映射都要点名 |
| 字节一致 | 逐张 `cmp` 源文件与目标文件 | 防改名过程串图 |
| **导入类型** | `grep '"type"' *.png.meta` 全为 sprite-frame | ⭐ 最易漏，[[ERR-079__png-import-texture-type-spriteframe-missing\|ERR-079]] 的唯一检出点 |

**`query_uuid('X.png/spriteFrame')` 返回 `<uuid>@f9941` 不算证据** —— 它只按约定拼串，子资产不存在照样 success。派 codex 交叉验证时，**必须把"导入类型"写进核验清单**，否则它只验你让它验的东西（本案六项全 PASS 仍漏判）。

### 6. 上屏：运行期实证，不看工具返回值

代码接线后必须在 preview 里拿到运行期证据，且先过两道前置门：

1. **产物新鲜度**（[[ERR-065__external-file-edit-no-recompile-stale-preview-chunk|ERR-065]]）：外部改 .ts 编辑器可能不重编译。`cocos_asset refresh`；仍不动就 `cocos_asset reimport <该 .ts>`（本轮实测 refresh 不够、reimport 才触发）。验证：`grep -rl <新符号> temp/programming/`
2. **页面真的在跑**（[[ERR-066__hidden-tab-raf-freeze-engine-boot-blackscreen|ERR-066]]）：标签页隐藏时 Chrome 冻结帧驱动，加载队列卡死、全黑屏、所有回调不触发。必须让目标 tab 处于**前台活动标签**（`osascript` 只 activate 应用不够，要设 `active tab index`）

两道门过了再看 console 的皮肤就绪日志与放大截图，与美工原图逐项比对。**注意视觉近似陷阱**：若新旧素材风格接近，光看截图会误判，必须以 console 日志为准。

## 反模式

| 错误做法 | 正确做法 | 关联 |
|---------|---------|------|
| 导入后不验类型，等用的时候才发现是 texture | 导入后**第一件事**验/改 sprite-frame | [[ERR-079__png-import-texture-type-spriteframe-missing\|ERR-079]] |
| 拿 `query_uuid` 返回 `@f9941` 当 spriteFrame 存在的证据 | 验 `.meta` 的 type + 运行期 `getDirWithPath(dir, SpriteFrame).length` | [[ERR-079__png-import-texture-type-spriteframe-missing\|ERR-079]] |
| 动态取图的素材放主包 `textures/` | 放 bundle 目录内，否则 `assetManager` 取不到 | 本模式 §1 |
| 用 `asset.name` 给 loadDir 结果建索引 | 用 `getDirWithPath` 的 `path` 末段（ImageAsset 的 name 恒为空串） | [[ERR-079__png-import-texture-type-spriteframe-missing\|ERR-079]] |
| 文件名带 `@` / 中文 / 空格 | 全 ASCII，键名与代码常量对齐 | [[ERR-064__at-sign-asset-db-url-resolution-truncated\|ERR-064]] |
| 手工 cp 文件 + 手写 .meta | 一律走 `cocos_asset import_folder` 编辑器管线 | IL13 / ERR-002 |
| 看截图像新素材就判定上屏 | 以 preview console 日志为准（风格近似会骗过肉眼） | [[ERR-079__png-import-texture-type-spriteframe-missing\|ERR-079]] |

## 关联

- [[ERR-079__png-import-texture-type-spriteframe-missing|ERR-079]] — 本模式的催生错误，§4/§5 是它的正向表达
- [[ERR-064__at-sign-asset-db-url-resolution-truncated|ERR-064]] — §2 命名雷区的来源
- [[ERR-065__external-file-edit-no-recompile-stale-preview-chunk|ERR-065]] — §6 第一道门
- [[ERR-066__hidden-tab-raf-freeze-engine-boot-blackscreen|ERR-066]] — §6 第二道门
- [[PAT-001__mcp-prefab-workflow|PAT-001]] — 下游衔接：素材就绪后做 prefab 换装走它
- [[ERR-081__mcp-spriteframe-dburl-persists-fake-uuid|ERR-081]] — §6「上屏」环节新增的落盘复验闸: prefab 换装给 spriteFrame 赋值一律传裸 UUID，赋值后必须解析落盘 .prefab 断言 `__uuid__` 是真 UUID 形态
