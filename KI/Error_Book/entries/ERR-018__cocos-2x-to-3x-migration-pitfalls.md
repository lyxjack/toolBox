---
id: ERR-018
type: error
errorCode: "BUILD-001"
severity: "high"
status: "resolved"
recurrence: 1
firstSeen: "2026-06-08"
tags:
  - "error/high"
  - "engine/cocos"
  - "migration/2x-to-3x"
  - "tool/babel"
  - "errorCode/BUILD-001"
  - "ki/error-book"
prevention: "Cocos 2.x→3.x 迁移：用 Babel(非仅 tsc)当编译口径；prototype shim 直算不转调引擎废弃别名；npm/Node 内置模块本地 vendor；官方导入器只搬资产、代码用 overlay"
aliases:
  - "ERR-018"
---

# Cocos 2.x → 3.8 迁移：验证口径错位与兼容层陷阱

## 错误现象
一次 2.4.3→3.8.6 全量迁移中逐个浮现，造成多轮返工 + 首次运行黑屏：
1. **tsc 全绿后**，Cocos 编辑器导入仍报 SyntaxError：`Namespaces exporting non-const are not supported by Babel`、`Identifier '_decorator' has already been declared`。
2. 场景加载即 `Maximum call stack size exceeded`（黑屏），栈全是 `Vec3.length` 自递归。
3. 运行期 `找不到模块 "moment"` / `无法加载模块 node:path`（tsc 能过、运行炸）。
4. 官方 `Import 2.x project` 把**已迁移好的** TS 重新"辅助转换"并损坏（`ccclass`→`lass`、重复 import、`@ccclass('X')('X')`、逻辑被注释）。

## 根因分析
**核心：把"tsc 通过"当成了"迁移完成"。Cocos 3.x 真实的编译/运行口径是 Babel + 编辑器导入 + 运行期，三者都比 tsc 严格或不同。**
1. Cocos 用 **Babel（@babel/preset-typescript + legacy decorators）** 转译：禁止 `namespace` 内 `export let/var`、对重复声明更严；tsc 全允许 → 漏检。
2. 给 `Node/Vec` prototype 写兼容 shim 时，`Vec.mag()` 调 `this.length()`，而 3.x 引擎里 `mag`↔`length` 互为废弃别名 → 无限互调递归。
3. Cocos 3.x **不打包 node_modules 的 npm 包，也不提供 Node 内置模块**（path/zlib/fs/Buffer）；放进 node_modules 只骗过 tsc，运行期解析失败。
4. 导入器假设源码是未迁移的 2.x，对 .ts 做 JS→TS"辅助转换"，对已是 3.x 写法的代码反而破坏。

## 解决方案
1. **建 Babel oracle**（与 tsc 并列的强制门禁）：本地 `@babel/core + preset-typescript({allowNamespaces:true}) + plugin-proposal-decorators({legacy:true}) + class-properties({loose:true})`，对 `assets/**/*.ts` 逐文件 transform 收集报错。`namespace` 内 `export let/var` → `export const`（外部 `NS.x=` 仍可写，命名空间成员是可写对象属性；内部裸赋值改成 `NS.x=` 并同步裸读为 `NS.x`）。
2. **shim 方法直算，不转调引擎可能已废弃的别名**：`mag()=Math.sqrt(x*x+y*y(+z*z))`、`magSqr()=x*x+…`，不调 `this.length()/lengthSqr()`。写任何 prototype 增补前，先确认引擎是否已把目标方法做成"废弃转发"，否则会互调。
3. **npm/Node 内置一律本地化**：`moment`→工程内 `momentShim.ts`（只实现实际用到的 API）；gzip→工程内 vendored `pako.ts` + 自写 base64（不用 Buffer）；node 内置的死 import（`console/os/fs/assert/constants`，多为 IDE 自动 import 垃圾）直接删。
4. **导入器只用来搬资产**：`File→Import 2.x project` 转 prefab/场景/资源（UUID 会保留）；自己迁好的 .ts 在导入后 **overlay 覆盖**（同 .meta UUID → 引用不断）。导入前把 `project.json` 的 version 临时改回 `2.4.3` 让导入器识别。

## 追加（2026-06-08 第二轮，运行期暴露）
5. **导入器丢弃 2.x 文件夹的 Bundle 配置**：2.x folder meta 的 `isBundle:true/priority/isRemoteBundle` 导入后 `userData` 为空 → `assetManager.loadBundle('login')` 解析不到名字，按 URL 请求 `assets/login/index.js` → 404"资源加载失败"。**修复**：按 3.8 格式给 folder meta 补 `userData:{isBundle:true,priority:N}`（参照同团队 3.8 工程 res/resources.meta），优先级沿用 2.x 值；remote/微信配置留到构建期 builder profile。
6. **CC_\* 宏不能硬编码**：曾写死 `CC_BUILD=true/CC_DEV=false`，导致 Preview 走生产远程分包路径、跳过 2.x 的 dev 短路逻辑。**修复**：`import { DEV,PREVIEW,BUILD,... } from 'cc/env'` 赋给全局 CC_*。
7. **架构认知**：此类棋牌工程主场景(Live)只有 Canvas+管理器节点，UI 全部运行期动态加载 → **编辑器 Scene 视图打开是"黑的"属正常**，以 Preview 运行为准；Test 场景只是静态贴图陈列。

8. **导入器丢 sp.Skeleton 的 premultipliedAlpha**：2.x 序列化键 `premultipliedAlpha` vs 3.8 的 `_premultipliedAlpha`，导入不映射 → 全部回退默认 true → additive/alpha 光效（扫光/光点）渲染成**实心白块/白菱形**。**修复**（守 ERR-002 红线不改 prefab）：只读扫描 prefab/scene 里残留的 2.x 键，按 skeletonData UUID 生成查表（uuid 级先验证零冲突），运行时 hook `sp.Skeleton.prototype.onLoad` 恢复原值（SpinePmaFix.ts，在 Compat2x import）。

9. **远程图片必须 loadRemote**：`assetManager.loadAny(httpsUrl)` 会把 URL 当本地资源路径拼接（`assets/.../https://...` → 404）。**修复**：`assetManager.loadRemote<ImageAsset>(url, 无扩展名时{ext:'.png'}, cb)` + `SpriteFrame.createWithImage()`。微信头像 URL 常无扩展名。
10. **异步回调里给已销毁组件赋值会崩**：3.8 对销毁节点的 Sprite 赋 spriteFrame 报 `_uiProps null`。在统一入口（如 setupSprite）加 `isValid(sprite)&&isValid(sprite.node)` 守卫。
11. **触摸坐标语义**：2.x `touch.getLocation()` 直接可入 convertToNodeSpaceAR；3.8 UI 需 `touch.getUILocation()`（UI 世界坐标），否则分辨率缩放下坐标偏移。且节点坐标转换应走兼容层（自动补 UITransform），直接 `getComponent(UITransform)` 可能为 null。

12. **BMFont .fnt 烙绝对路径**：美术用 BMFont 工具导出的 .fnt 里 `page file="C:\Users\...\xxx.png"`（导出机绝对路径）。2.x 导入器按文件名同目录兜底解析（能用），3.8 严格按路径找 → 导入失败 → 运行期分包加载该字体 404、界面美术字不显示。**修复**：.fnt 是纯文本（不在 prefab 红线内），把 page 行改成相对文件名即可；同名 png 往往就在同目录。排查命令：`grep -rE '^page.*file="[A-Z]:' assets --include='*.fnt'`。


13. **浏览器 Preview 有 CORS、微信没有**：登录后拉 CDN 配置/头像在浏览器被 CORS 拦（`ERR_FAILED 200 (OK)` = 服务端正常、浏览器拒读），且原代码对拉取失败无空保护 → 大厅崩。**修复**：调用处加 null 守卫优雅降级；认知上微信小游戏走 `wx.request`+域名白名单**无 CORS**，此类报错属浏览器预览专有，别当迁移 bug 追。服务端加 `Access-Control-Allow-Origin` 头可让浏览器预览完整（可选）。
14. **引擎"废弃警告适配器"会占住 prototype，且部分是 non-configurable**（二次踩坑修订）：3.8 在 Node 上保留 `width/height` 等废弃访问器。第一坑：shim 用 `hasOwnProperty` 防御判断会让位给它们 → deprecated 警告刷屏；第二坑（首版修复反向翻车）：**盲目强制 defineProperty 覆盖会对 non-configurable 适配器抛 `Cannot redefine property` → 整个兼容层模块执行中断 → 全工程黑屏**。**正确做法**：先 `Object.getOwnPropertyDescriptor` 检查，`configurable===false` 的跳过（保留引擎适配器，功能正常、只有一次性警告），可覆盖的才 defineProperty，外面再包 try/catch 跨版本兜底。教训：prototype 增补必须假设引擎属性可能锁死。

## 预防规则
> 进入**任何 Cocos 2.x→3.x 迁移**任务时强制读本段（全量 14 条速查；详情见上文同号条目）。

**验证口径（最高原则）**：tsc 通过≠完成。完整口径 = **Babel oracle + 编辑器导入 + Preview 运行**；编辑器/真机只有用户能跑 → 尽早建 Babel oracle 把可静态发现的问题前移，剩余用"重载→读 temp/logs/project.log→修"循环收敛。

1. namespace 内 `export let/var` → Babel 拒绝，写 `export const`（外部 `NS.x=` 仍可写；内部裸赋值改限定名）。
2. prototype shim 直算组件分量，不转调引擎方法（`mag↔length` 互为废弃别名会无限递归）。
3. npm 包/Node 内置（moment/path/zlib/Buffer）运行期不可用 → 工程内 shim/vendor，死 import 直接删。
4. 官方 2.x 导入器只用来搬资产（UUID 保留）；已迁移代码导入后会被改坏 → overlay 覆盖回去；导入前 project.json version 临时改回 2.4.x。
5. 导入器丢 folder meta 的 `isBundle` → loadBundle 404 → 按 3.8 格式补 `userData:{isBundle,priority}`。
6. `CC_*` 宏从 `cc/env` 取（DEV/PREVIEW/BUILD/WECHAT…），禁止硬编码。
7. 棋牌类主场景只有管理器节点，编辑器 Scene 视图黑屏=正常，以 Preview 为准。
8. 导入器丢 `sp.Skeleton.premultipliedAlpha`（2.x 键名不映射）→ 光效实心白块 → 只读扫 prefab 残留键，按 skeletonData UUID 查表运行时恢复（勿改 prefab）。
9. 远程图片用 `assetManager.loadRemote`（loadAny 把 URL 当本地路径）；无扩展名 URL 传 `{ext:'.png'}`；用 `SpriteFrame.createWithImage`。
10. 异步回调操作组件前 `isValid(comp)&&isValid(comp.node)` 守卫（节点可能已销毁，3.8 直接崩）。
11. 触摸→节点坐标：`touch.getUILocation()` + 走兼容层 `node.convertToNodeSpaceAR`（自动补 UITransform）；别裸 `getComponent(UITransform).xxx`。
12. BMFont `.fnt` 可能烙导出机绝对路径（2.x 宽容/3.8 严格）→ 改相对文件名；排查 `grep -rE '^page.*file="[A-Z]:' assets --include='*.fnt'`。
13. 浏览器 Preview 的 CORS 报错是环境专有（微信无 CORS）；外部拉取失败要有 null 守卫降级，别当迁移 bug 追。
14. 引擎废弃适配器占 prototype：先查 descriptor，`configurable===false` 的**跳过**（强行 defineProperty 会抛错中断整个模块→黑屏），可覆盖的才覆盖 + try/catch 兜底。

**红线不变**：全程禁止脚本/程序化修改 `.prefab/.scene/.fire/.anim`（ERR-002）；folder `.meta` 的 Bundle 标记与 `.fnt` 纯文本配置除外（已验证安全）。

## 关联
- [[ERR-002__python-modify-cocos-prefab|ERR-002]] — 同域红线：禁止脚本改 prefab/场景，格式转换只走编辑器导入器。
- [[ERR-021__cocos-prefab-create-loses-subchildren-properties|ERR-021]] / [[ERR-004__mcp-prefab-layer-ui2d|ERR-004]] — prefab 程序化改动的破坏（子节点属性丢失 / layer 重置），与本条"导入器搬资产、代码 overlay"互补。
