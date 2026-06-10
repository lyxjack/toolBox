---
id: ERR-019
type: error
errorCode: "BHV-001"
severity: "critical"
status: "resolved"
recurrence: 1
firstSeen: "2026-06-10"
tags:
  - "error/critical"
  - "engine/cocos"
  - "process/verification"
  - "errorCode/BHV-001"
  - "ki/error-book"
prevention: "承重模块（入口 import 的 shim/全局补丁/启动链）任何改动必须运行期验证后才算完成；化妆性改动默认不碰承重文件；prototype 增补先查 descriptor 防 non-configurable 抛错"
aliases:
  - "ERR-019"
mem_ref: null
mem_status: "unavailable"  # 创建于双向关联机制落地前(同日 2026-06-10),无可靠 session 归属(contract § 3.8 降级形态)
---

# 化妆性修改承重模块且未运行验证 → 全工程黑屏回归

## 错误现象
迁移已全链路跑通（生产服打牌）之后，为消除 console 里两条无害的 `Node.width is deprecated` 警告，把承重兼容层 `Compat2x.ts` 的 `def()` 从"防御性 `hasOwnProperty` 守卫"改成"强制 `Object.defineProperty` 覆盖"。**改完只跑了静态检查（Babel/tsc 双绿）就宣布完成**。用户数轮对话后 reload 编辑器 → `TypeError: Cannot redefine property: width` → Compat2x 模块顶层执行中断 → **所有 import 它的脚本全部失败 → Live 场景黑屏**，已正常工作的产品出现回归。更糟：当时还把这个错误做法写进了 ERR-018 #14，污染了知识库。

## 根因分析
**技术层**：
1. 引擎 3.8 的废弃警告适配器（`Node.width/height`）是 **non-configurable** 属性，`defineProperty` 强行覆盖必抛 TypeError。
2. 抛错发生在**模块顶层** → 整个模块执行失败 → 承重模块的爆炸半径 = 全工程（它在入口被 import，所有业务脚本直接或间接依赖）。
3. 静态检查（tsc/Babel）**原理上不可能**发现运行期 descriptor 锁定，再次落入"静态绿 = 完成"的陷阱（ERR-018 总则的复犯变体）。

**流程层（更严重）**：
1. **收益/风险不对称未评估**：收益是消掉 2 条一次性无害警告（纯化妆），风险面是全工程启动链——这种比值本不该动手。
2. **被移除的防御性代码是有原因的**（Chesterton's Fence）：原 `hasOwnProperty` 守卫"碰巧"挡住了 non-configurable 引爆点；没弄清它防什么就当冗余删了。
3. **延迟引爆**：改完没有立即请用户 reload 验证，破坏潜伏数轮对话后才爆，排查时距离改动点已很远。
4. **未验证的方案写入错题本**：ERR-018 #14 首版直接记了"强制覆盖"这个错误建议，若未纠正，未来召回会照方抓药再翻车。

## 解决方案
1. `def()` 改为三段式：`Object.getOwnPropertyDescriptor` 检查 → `configurable === false` 直接跳过（保留引擎适配器：功能正常，仅一次性警告）→ 可覆盖才 `defineProperty`，外包 `try/catch` 跨版本兜底。**功能优先于消警告**。
2. ERR-018 #14 重写为"二次踩坑修订"版，条目标记 recurring。

## 预防规则
任何项目、任何引擎，命中以下情形时强制回忆本条：
1. **承重文件改动 = 高风险变更**：入口 import 的兼容层/全局 prototype 补丁/启动链文件，任何改动（哪怕一行）完成的定义是"**运行期验证通过**"，不是"静态检查通过"。改完立即请用户 reload/重跑验证，禁止"顺手改完就走"让破坏延迟引爆。
2. **化妆性改动默认不碰承重文件**：消警告、清日志、格式化这类零功能收益的改动，碰承重文件前必须先回答"值得吗"——答案通常是否。
3. **删防御性代码前先考古**：守卫/try-catch/看似多余的判断存在即有原因，弄清它防什么再动（Chesterton's Fence）。
4. **prototype 增补三件套**：查 descriptor → non-configurable 跳过 → try/catch 兜底；模块顶层代码绝不允许可预见地 throw。
5. **错题本写入纪律**：记入的"修复方式"必须是运行验证过的；未验证方案必须标注"待验证"，防止知识库污染。

## 关联
- [[ERR-018__cocos-2x-to-3x-migration-pitfalls|ERR-018]] — #14 即本错误的技术现场（已修订）；其总则"静态检查≠完成"被本错误以新形态复犯。
