---
id: ERR-003
type: error
errorCode: BHV-001
severity: high
status: resolved
recurrence: 0
firstSeen: 2026-04-06
tags:
  - error/high
  - engine/cocos
  - asset/prefab
  - errorCode/BHV-001
  - ki/error-book
prevention: "Cocos UI 交互 bug 先用排除法逐个关闭 BaseViewCmpt 布尔属性"
aliases:
  - ERR-003
---

# buyView 弹窗 bug 排查路径错误——简单问题复杂化

## 错误现象

buyView 弹窗弹出后，内容被遮罩盖住无法点击。排查过程中：
1. 错误地设置了 `isTouchSpaceClose=true`（其他弹窗都是 false）
2. 发现问题后，用 Python json.dump 修改 prefab 文件 → 游戏崩溃（已记入 ERR-002）
3. 崩溃修复后，花大量时间分析 sibling index、node layer 等复杂原因
4. 最终修复只需要一步：**`isMask=false`**

## 根因分析

### 表面原因
BaseViewCmpt 的 `addMask()` 在运行时创建全屏遮罩节点并加 `BlockInputEvents`，该遮罩挡住了 buyView 内部的按钮点击。

### 深层原因（排查路径错误）
1. **没有先做最简单的排除法**：应该先逐个关闭 buyViewCmpt 的布尔属性（isMask、isTouchSpaceClose、isPlayOpenAnim 等），5 秒就能定位问题
2. **过早深入底层分析**：花时间分析 Cocos 引擎的 setSiblingIndex 行为、BlockInputEvents 传播机制、node layer 差异，这些都是不必要的
3. **用脚本修改 prefab 试图快速修复**：违反了 Cocos 资产文件只能编辑器操作的原则，导致更严重的崩溃

### 附带发现（有效）
排查过程中发现 buyView 多个节点 Layer 为 DEFAULT 而非 UI_2D，导致 bg 背景板不可见。这是一个真实的 bug，修复有效。

## 解决方案

1. `isMask = false`（在编辑器中取消勾选"是否遮罩"）
2. 多个节点 Layer 从 DEFAULT 改为 UI_2D

## 预防规则

### 规则 1：排除法优先
遇到 Cocos Creator UI 交互 bug 时，**先让用户逐个关闭 BaseViewCmpt 的布尔属性**（isMask、isTouchSpaceClose、isPlayOpenAnim、isAddFullWidget），每改一个就测试，5 分钟内定位根因。

### 规则 2：不要猜测引擎内部行为
不要花时间分析 Cocos 引擎的 setSiblingIndex、BlockInputEvents 等底层机制。先用排除法定位到具体属性，再决定是否需要深入。

### 规则 3：新建 prefab 的属性不要照搬
不能假设其他弹窗的属性配置适用于新弹窗。buyView 作为游戏内浮窗，不需要 isMask（遮罩会干扰已有的游戏界面），和 challengeView 等从主页弹出的弹窗场景不同。

## 关联
- [[ERR-002__python-modify-cocos-prefab|ERR-002]]: Python 修改 prefab 导致崩溃（本次排查过程中的连锁错误）
- Session: 20260406-221209, 20260406-213536
- [[PAT-004__ui-bug-elimination|PAT-004]] — UI 交互 Bug 排查流程
