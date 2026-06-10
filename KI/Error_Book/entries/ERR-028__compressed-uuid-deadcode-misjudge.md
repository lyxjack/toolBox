---
id: ERR-028
type: error
errorCode: "BHV-001"
severity: "high"
status: resolved
recurrence: 1
firstSeen: 2026-05-18
tags:
  - error/high
  - tool/grep
  - workflow/dead-code-audit
  - engine/cocos-creator
  - errorCode/BHV-001
  - ki/error-book
prevention: "判断 Cocos @ccclass 是不是死代码不能只看 ts import 链或类名字符串 grep。必须用 ts.meta UUID 的前 5 hex 字符（compressed UUID prefix）反查 prefab/scene 内 \"__type__\" 字符串。任一 prefab/scene 命中即活组件，禁止删除。"
related:
  - "[[ERR-002__python-modify-cocos-prefab|ERR-002]]"
aliases:
  - ERR-028
ci_rules:
  - type: "manual-process"
    pattern: "dead-code-audit"
    message: "审计 Cocos @ccclass 死代码前，必须按此条目的扫描方法做 compressed UUID 反查"
---

# Compressed UUID 死代码误判 — rankCmpt 假阴性 (REQ-20260518-212812)

## 错误现象

PM 阶段审计 kingDianPuzzle 项目的死代码时，把 `rankCmpt` 误判为"半壳死代码"——即代码存在但实际从未被实例化。证据链当时给的：

1. `grep -rn "rankCmpt"` 在 prefab/scene 内**零命中**
2. `grep -rln "from.*rankCmpt"` 全 ts 文件**零命中**（无人 import）
3. `homeView.prefab` 内有 rank/rankScroll 等 cc.Node，但没看到 `RankCmpt` 字样
4. → 结论："rank UI 入口存在但内容是空壳"

**实际**：rankCmpt 是上线后玩家每天点排行榜要用的活功能。git log 印证 commit `0f8e187 feat: 排行榜真实化重构 (REQ-20260511-182234)` 把它从硬编码 mock 改成调真后端 `/api/puzzle/leaderboard`。

如果按误判结论执行删除，会破坏排行榜全链路。

## 根因分析

Cocos Creator 序列化 prefab/scene 时，组件 `__type__` 字段**不存类名也不存完整 UUID**，而是用 **compressed UUID 格式**：

- 取 ts.meta 内 `"uuid": "xxxxxxxx-xxxx-..."` 的**前 5 hex 字符**
- 后面追加 18 字符的 base64 编码（来自 UUID 剩余字节）
- 总长 23 字符

举例：
- `rankCmpt.ts.meta` UUID = `98c9448f-7a63-433c-8e9f-c5030897e4d7` → 前 5 字符 = `98c94`
- `homeView.prefab` 内出现 `"__type__": "98c94SPemNDPI6fxQMIl+TX"` ← **就是这个**

所以只用类名 grep（找 `rankCmpt`）和 import grep（找 `from ...rankCmpt`）都**找不到任何 prefab 引用**——但运行时 Cocos 引擎反序列化时根据 UUID prefix 查找已注册的 @ccclass，正常实例化。

同时 Cocos build pipeline **自动 import 所有 assets/script/ 下的 @ccclass 文件**到 chunks bundle，无需 ts 之间互相 import。所以"无 import 链"也**不能**证明死代码。

**双重盲点**：
1. 只 grep 类名 → 错过 compressed UUID 引用
2. 只 grep ts import → 错过 Cocos build 自动收编

## 正确的扫描方法

### 步骤

```bash
# 对每个候选 @ccclass 文件 X.ts:
META="X.ts.meta"
UUID=$(grep -oE '"uuid": "[a-f0-9-]{36}"' "$META" | head -1 | cut -d'"' -f4)
PREFIX=$(echo $UUID | cut -c1-5)

# 关键步骤 — prefab/scene 内 __type__ compressed UUID 反查
PREFAB_HITS=$(grep -rln "\"__type__\": \"${PREFIX}" assets/resources/prefab assets/scene)

# 任一命中 → 活组件，禁止删除
# 0 命中 → 候选 dead，但还要再过 2 道闸：
#   (a) 是不是被 ts 间 extends 的抽象基类？grep "extends ClassName"
#   (b) 是不是被 addComponent('xxx') 字符串动态挂载？grep "addComponent\(['\"]"
# 都 0 才能定 dead
```

### 三重过滤

| 闸 | 检查 | 命中即活 |
|---|------|---------|
| 1 | prefab/scene 内 `"__type__": "<prefix>..."` | ✓ 真实组件挂载点 |
| 2 | 任何 .ts 内 `extends <ClassName>` | ✓ 抽象基类被子类用 |
| 3 | 任何 .ts 内 `addComponent\(['\"]<name>['\"]\)` | ✓ 代码动态挂载 |

三闸全 0 命中 + 全文件名 grep 也无外部引用 = 真死代码。

---

## 同源盲点扩展 — Asset (PNG/Audio/Prefab) 引用扫描

UUID 反查在**资产文件**上也有同类盲点。Cocos 提供多种 path-based 动态加载 API，**不写入 UUID 引用**：

```typescript
// Pattern 1: Bundle.load(path, AssetType, cb)
bundle.load('ui/Sprite/starRoad/dragon/spriteFrame', SpriteFrame, ...);

// Pattern 2: resources.load / loadDir
resources.load('config/level/1', JsonAsset, ...);

// Pattern 3: 项目自定义 helper（如 ResLoadHelper.loadCommonAssetSync）
await ResLoadHelper.loadCommonAssetSync('ui/Sprite/cardProps/duck', SpriteFrame);

// Pattern 4: CocosHelper.updateUserHeadSpriteAsync(node, iconId)
// 内部展开为 ResLoadHelper.loadCommonAssetSync(`head/head${iconId}`, SpriteFrame)
// 所以 head1-head11 都可能是 path-based 活资源
```

**资产死代码审计正确做法（双闸）**：

```bash
# 闸 1: UUID 反查
UUID=$(grep -oE '"uuid": "[a-f0-9-]{36}"' "${png}.meta" | head -1 | cut -d'"' -f4)
PREFIX=$(echo $UUID | cut -c1-5)
grep -rln "\"__type__\": \"${PREFIX}" assets/resources/prefab assets/scene assets/script

# 闸 2: path-based 反查
# cocos 资产 path 约定（去 res/ 或 resources/ + 去扩展名 + 文件夹/文件名）
COCOS_PATH=$(echo "${png#assets/res/}" | sed 's/\.png$//')   # e.g. "ui/Sprite/cardProps/duck"
grep -rln "$COCOS_PATH" assets/script --include="*.ts"
```

**真实事故案例（REQ-20260518-212812 Phase 4）**：
- v1: 仅 UUID 反查 prefab/scene/ts → 71 孤儿
- v2: + path-based 二次复扫 → **救回 10 活资源**（cardProps 7 starRoadViewCmpt dict 加载 + starRoad 3 bundle.load）→ 61 孤儿
- v3: 用户挑战 "怎么还会有误删的呢" → 发现 **.anim 文件未进 corpus** → **救回 7 张** effect_exchange_scroll2-8（exchange.anim 8 帧动画 sprite frame UUID 引用）→ 54 真孤儿
- 同时确认 .plist 粒子文件用 `<textureFileName>` filename 而非 UUID，需要 filename 反查（本案中 .plist 引用的 PNG 都已在 active list，未误判）

**教训三连**：每次以为扫干净了，都还有新盲点。Cocos 资产引用渠道**不止**（compressed UUID / full UUID / path / filename）—— Corpus **不止 prefab+scene+ts**（还有 .anim/.plist/scene 内嵌组件）。

如果只信 v1 直接外迁，会误删 **17 张**活资源（10 cardProps+starRoad + 7 effect_scroll），破坏星星之路 UI + exchange 道具动画。

## 经典对比

| 候选 | UUID prefix | prefab 命中 | 结论 |
|------|------------|------------|------|
| rankCmpt | 98c94 | homeView.prefab 内 `"98c94SPemNDPI6fxQMIl+TX"` ✓ | **活组件**，禁删 |
| rankItemCmpt | 0ef0d | homeView.prefab 内 `"0ef0ds8tatAG79n1BOwTcbF"` ✓ | **活组件**，禁删 |
| cameraCmpt | a392f | 0 prefab 命中 + 0 extends + 0 addComponent | **真死**，可删 |
| roleCmpt | 1b014 | 0 prefab 命中（mainCmpt WASD 段是 event 链，与 UUID 无关）| **真死**，可删 |

## 复发预防

- 任何死代码审计**起手先做 compressed UUID 反查**，不能跳过
- 项目记忆已写入 `feedback_compressed_uuid_dead_code_scan`
- PM Hidden Assumption 里如果出现"X 是死代码"假设，CTO 必须要求 PM 附上 compressed UUID 反查证据

## 关联

- 任务：REQ-20260518-212812 Phase 5
- 工件：`.in-process/active/20260518-212812/dead_code_traceback.md` + `dead_code_audit_v2.md`
- ERR-002（Cocos prefab 序列化禁止脚本写）— 本条与 ERR-002 互补：ERR-002 防止"写坏 prefab"，本条防止"读错 prefab"
