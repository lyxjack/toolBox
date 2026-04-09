---
id: PAT-004
type: pattern
title: "UI 交互 Bug 排查流程"
status: active
created: 2026-04-08
tags:
  - pattern/UI
  - pattern/debug
  - engine/cocos
  - ki/pattern
complements:
  - "[[ERR-003__buyview-mask-debug-failure|ERR-003]]"
aliases:
  - PAT-004
---

# UI 交互 Bug 排查流程

## 适用场景

Cocos Creator 项目中遇到 UI 交互类 bug 时（按钮无法点击、弹窗不显示、触摸穿透、节点不可见等），使用此排查流程。核心思想：**排除法优先，深入分析在后**。

## 步骤

### Phase 1: 快速排除（目标 5 分钟内定位）

#### Step 1: 检查节点可见性基础条件

```
□ node.active === true
□ node.layer === 33554432 (UI_2D)
□ 节点在 Canvas 节点树下
□ UITransform 尺寸 > 0
□ opacity > 0
```

如果节点"存在但不可见"，90% 的原因是 `node.layer` 不是 `UI_2D (33554432)`。

#### Step 2: 逐一切换 BaseViewCmpt 布尔属性

对于使用 BaseViewCmpt（或类似弹窗基类）的视图，逐一切换以下属性并测试：

| 属性 | 默认值 | 切换后测试 |
|------|--------|-----------|
| `isMask` | true/false | 切换 → 测试交互 |
| `isTouchSpaceClose` | true/false | 切换 → 测试交互 |
| `isPlayOpenAnim` | true/false | 切换 → 测试交互 |
| `isAddFullWidget` | true/false | 切换 → 测试交互 |

**每次只改一个属性**，测试后记录结果。这样可以精确定位是哪个属性导致问题。

#### Step 3: 检查节点层级遮挡

```
□ 检查 siblingIndex（节点在父节点中的排序）
□ 检查是否有全屏遮罩挡在上层
□ 检查 BlockInputEvents 组件是否误加
```

### Phase 2: 深入分析（排除法完成后）

只有在 Phase 1 未能定位问题时，才进入深入分析：

1. 检查事件监听注册/注销逻辑
2. 检查触摸事件传播链
3. 检查 `setSiblingIndex` 动态调用
4. 检查引擎层 BlockInputEvents 行为

### Phase 3: 验证修复

1. 修复后测试目标交互
2. 测试相邻功能是否受影响（回归测试）
3. 确认修改已正确保存（参考 PAT-001 保存流程）

## 关键原则

| 原则 | 说明 |
|------|------|
| **排除法优先** | 不要一开始就深入引擎源码，先用最简单的方法缩小范围 |
| **每个弹窗独立配置** | 不要假设其他弹窗的配置可以直接套用到新弹窗 |
| **一次改一个变量** | 同时改多个属性无法定位具体原因 |
| **5 分钟规则** | 排除法应在 5 分钟内完成，超时说明问题不在常见范围 |

## 反模式

| 错误做法 | 后果 | 对应错误 |
|----------|------|---------|
| 直接深入引擎内部调试 | 浪费大量时间，问题可能只是一个布尔值 | ERR-003 |
| 复制其他弹窗配置 | 每个弹窗需求不同，盲目复制引入新问题 | ERR-003 |
| 同时修改多个属性 | 无法定位真正原因，修复不可靠 | — |

## 关联错误

- [[ERR-003__buyview-mask-debug-failure|ERR-003]] — 弹窗遮罩调试失败，应使用排除法而非深入引擎内部
