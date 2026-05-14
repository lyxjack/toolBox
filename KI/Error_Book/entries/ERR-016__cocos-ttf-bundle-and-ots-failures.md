---
id: ERR-016
type: error
errorCode: BHV-001
severity: high
status: resolved
recurrence: 1
firstSeen: 2026-05-10
lastSeen: 2026-05-10
tags:
  - error/high
  - engine/cocos
  - project/kingDianPuzzle
  - errorCode/BHV-001
  - asset/font
  - asset/bundle
  - browser/chrome-ots
  - ki/error-book
prevention: "Cocos Creator 项目引入新 TTF 字体到 web 端必须同时满足两个条件：(1) 通过正确的 Bundle 加载——`assets/res/` 下的资源属 `res` Bundle，要用 `assetManager.getBundle('res').load(url, TTFFont, cb)` 而不是默认走 `resources` Bundle 的 `ResLoadHelper.loadCommonAssetSync`；(2) TTF 文件本身必须通过 Chrome OTS sanitizer——OS/2 fsSelection bits 8/9 在 version 3 必须清零、vhea 表 version 必须是 OTS 已知版本（0x10001 不被接受）。常见做法：导入前用 fontTools 清理 (`del font['vhea']; del font['vmtx']; os2.fsSelection &= ~(1<<8|1<<9)`)。不修这两层任何一层都会静默 fallback 到 Arial，**用户看到的是 Arial 但开发者不知道字体没生效**。"
aliases:
  - ERR-016
---

# Cocos Creator 引入中文 TTF 字体到 Web 端：Bundle 错位 + Chrome OTS 拒收 双重坑

## 错误现象（两层叠在一起，按发生顺序排）

REQ-20260510-193447 给 homeView "已满" 标签换中文字体（ALIBABA-PUHUITI-HEAVY），共触发两个独立 bug 都导致 fallback Arial：

### 第 1 层：Bundle 错位

代码用：

```ts
ResLoadHelper.loadCommonAssetSync('font/ALIBABA-PUHUITI-HEAVY', TTFFont)
```

报错：

```
Error: Bundle resources doesn't contain font/ALIBABA-PUHUITI-HEAVY
```

### 第 2 层（修了第 1 层之后）：Chrome OTS 拒收

代码改成显式拿 `res` Bundle 加载后，加载本身成功（asset 进了内存），但**浏览器渲染时拒收 TTF**：

```
(index):1 Failed to decode downloaded font: http://localhost:7456/assets/res/native/ce/ce05.../ALIBABA-PUHUITI-HEAVY.ttf
(index):1 OTS parsing error: OS/2: fsSelection bits 8 and 9 must be unset for table version 3
                              gasp: Changed the version number to 1
                              vhea: Unsupported table version: 0x10001
                              vhea: Failed to parse table
debug.ts:79 Download Font [ALIBABA-PUHUITI-HEAVY_LABEL] failed, using Arial or system default font instead
```

视觉上：用户在浏览器看到的"已满"是 **Arial 渲染中文**（系统 fallback），还以为字体生效了，实际没生效。

## 根因

### 第 1 层根因 — Bundle 概念

kingDianPuzzle 项目结构有两个 asset bundle：

| 物理路径 | Cocos Bundle 名 | 用途 |
|---------|-----------------|------|
| `assets/resources/` | `resources`（默认） | 通过 `resources.load()` 或 `loadCommonAssetSync` 默认访问 |
| `assets/res/` | `res`（自定义，priority=1） | 需要 `assetManager.getBundle('res').load(...)` |

`ResLoadHelper.loadCommonAssetSync` 内部：

```ts
let bundle = this.resBundle;  // 默认指向 resources（除非别处显式 setBundle 切换）
bundle.load(url, type, cb);
```

字体放在 `assets/res/font/ALIBABA-PUHUITI-HEAVY.TTF`（属 `res` Bundle），但 ResLoadHelper 用的是 `resources` Bundle → 找不到。

而项目里**已经能工作的同类调用**：`updateUserHeadSpriteAsync` 调 `loadCommonAssetSync('head/head6', SpriteFrame)` 加载头像——成功，因为头像在 `assets/resources/head/`（默认 Bundle）。

**反例陷阱**：看到"项目已有的 loadCommonAssetSync 加载 sprite 能工作"，会下意识假设同样的 API 加载 font 也能工作。错——路径前缀的 Bundle 归属不同。

### 第 2 层根因 — Chrome OTS Sanitizer

Chrome 引擎用 OTS (OpenType Sanitizer) 对所有下载的字体做合规性检查。检查不过 → 直接拒绝整个字体，回退系统字体。

ALIBABA-PUHUITI-HEAVY.TTF 原文件 fontTools 看到：

```
tables: ['GPOS', 'GSUB', 'GlyphOrder', 'OS/2', 'cmap', 'gasp', 'glyf', 'head', 'hhea', 'hmtx', 'loca', 'maxp', 'name', 'post', 'vhea', 'vmtx']
OS/2 version: 3   fsSelection: 0b101000000   # bit 6 (REGULAR) + bit 8 set
vhea: version 0x10001
```

两个具体违规：
1. **OS/2 fsSelection bit 8** (`USE_TYPO_METRICS`) 在 OS/2 v3 不允许置位。bit 9 (`WWS`) 同理。OTS spec 严格执行。
2. **vhea table version 0x10001** OTS 不识别（合规版本是 0x00011000）。vhea/vmtx 是**垂直布局**的表，横排中文/英文渲染完全不需要——直接删表就好。

### 静默失败为何这么隐蔽

| 链节 | 行为 |
|------|------|
| `Label.font = ttfAsset` | 不报错，asset 引用合法 |
| 浏览器下载字体 .ttf | 200 OK |
| OTS sanitize | 失败，返回"Failed to decode" warning |
| Label 渲染 | 静默使用 Arial fallback，UI 看起来"中文显示正常" |
| Cocos 内 console | 一条 `Download Font [X] failed, using Arial or system default font instead` warning（不是 error） |
| TS 编译 / 测试 | 全过，运行时无 throw |

如果开发者没盯着浏览器 console（或者忽略 warning），会以为字体生效了——其实玩家看到的全是 Arial。

## 正确做法

### Bundle 加载

```ts
import { assetManager, TTFFont } from 'cc';

// 显式从 res Bundle 加载（assets/res/ 下的资源）
const resBundle = assetManager.getBundle('res');
if (resBundle) {
    resBundle.load('font/ALIBABA-PUHUITI-HEAVY', TTFFont, (err, font) => {
        if (!err && font) {
            this.lbCountdownFullFont = font;
        } else {
            console.warn('[homeViewCmpt] 加载中文字体失败:', err);
        }
    });
}
```

判断属于哪个 Bundle 的简单方法：看物理路径：
- `assets/resources/X` → 默认 Bundle，用 `loadCommonAssetSync('X', T)` 或 `resources.load('X', T, cb)`
- `assets/res/X` → `res` Bundle，用 `assetManager.getBundle('res').load('X', T, cb)`
- 其它自定义 Bundle 同理

### Font Sanitizer 清理

引入新 TTF 字体前**强制做一次 fontTools 清理**（macOS 自带 Python，pip install fonttools）：

```python
from fontTools import ttLib

font = ttLib.TTFont('/path/to/font.ttf')

# 1. OS/2 v3+ fsSelection bits 8/9 必须清零
if 'OS/2' in font and font['OS/2'].version >= 3:
    font['OS/2'].fsSelection &= ~(1 << 8)  # 清 USE_TYPO_METRICS
    font['OS/2'].fsSelection &= ~(1 << 9)  # 清 WWS

# 2. 横排字体直接删除垂直布局表（不影响渲染）
for t in ('vhea', 'vmtx'):
    if t in font:
        del font[t]

# 3. 其它可疑：cmap subtable encoding、loca 索引格式等——视情况
font.save('/path/to/font.ttf')
```

清理完必须验证：
- 浏览器 console 没有 `OTS parsing error` / `Download Font ... failed` warning
- UI 视觉上中文笔画粗细 / 字形风格与字体设计一致（不是 Arial 通用衬线）

### 不要做的事

- ❌ 不要把字体放进 `assets/resources/` 仅为了避开 Bundle 问题——`res` Bundle 设计是有意义的（独立打包、priority 控制），破坏架构换图省事是反模式
- ❌ 不要忽略 `Failed to decode downloaded font` warning。Cocos 把它降级为 warning，但实际是字体没生效的硬故障
- ❌ 不要试图改 Chrome 的 OTS 行为（不能改）；必须修字体文件

## 预防规则

1. **引入新 TTF 字体三步硬性流程**（写到项目 onboarding / claude.md）：
   - Step 1：fontTools 清 OS/2 bits 8/9 + 删 vhea/vmtx
   - Step 2：导入 Cocos（确认 .meta 里 importer=ttf-font）
   - Step 3：代码加载时确认 Bundle 归属（res / resources）
   - 三步缺一会 fallback Arial，**用户看不出来**

2. **任何 `loadCommonAssetSync` / `resources.load` 失败立刻验证 Bundle 归属**：
   - 看物理路径：`assets/resources/` 还是 `assets/res/` 还是别的
   - 看 main 启动流程里 `assetManager.loadBundle('xxx')` 加载了哪些 Bundle
   - 不要假设"项目里别处的 loadCommonAssetSync 能工作所以这里也能"

3. **静默 fallback 是双刃剑铁律的延伸**（与 ERR-015 一脉相承）：
   - Cocos `Label.font = X` 对加载失败的字体 / 浏览器拒收的字体都不抛错
   - 引入新字体必须做"用户视角视觉验收"，不能仅看 TS / 单测过
   - 在 PR 描述里明示"切换了字体 X，请在浏览器 console 检查无 OTS warning + 视觉确认笔画风格"

4. **错题本召回触发条件**：任何时候要引入新 TTF / 改 Label.font / 看到 `Failed to decode downloaded font` 或 `Bundle ... doesn't contain` 报错，先查本条 ERR-016

## 修复 commit

`8cd5f99` — `feat: 主页体力 UI 调整 — lbLife 白色 + lbCountdown "已满" 中文字体`

包含：
- `homeViewCmpt.ts` 用 `assetManager.getBundle('res')` 显式加载
- `assets/res/font/ALIBABA-PUHUITI-HEAVY.TTF` fontTools 清理过的版本

## 相关位置

- `assets/script/utils/resLoadHelper.ts:9-10` — `this.resBundle = bundle || resources` 默认 Bundle 解释
- `assets/script/game/mainCmpt.ts:40` — `assetManager.loadBundle('res', ...)` 加载入口
- `assets/script/game/ui/homeViewCmpt.ts` — 显式 getBundle 写法范本
- 项目 CLAUDE.md "How to Run" 段提到 `assets/res Bundle priority = 1`——印证 res 是独立 Bundle

## 相关错题

- ERR-015：`viewList.get` 深路径在 prefab restructure 后静默失效——同样是"工具函数对失败不抛错"的静默故障模式
- ERR-018（旧 index 引用，等价于本条主题的"png 导入"分支）：MCP 导 png 必走 refresh→reimport→save_asset_meta——同属"资源导入流程不完整 → 运行时静默失效"
