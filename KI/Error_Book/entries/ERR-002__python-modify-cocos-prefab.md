---
id: ERR-002
type: error
errorCode: ISO-003
severity: critical
status: recurring
recurrence: 2
firstSeen: 2026-04-06
tags:
  - error/critical
  - engine/cocos
  - asset/prefab
  - tool/python
  - errorCode/ISO-003
  - ki/error-book
prevention: "绝对禁止用任何脚本直接修改 .prefab/.scene/.anim 文件"
aliases:
  - ERR-002
---

# 用 Python 直接修改 Cocos Creator prefab 文件导致游戏崩溃

## 错误现象

为了修改 buyView.prefab 的 `isTouchSpaceClose` 属性，Agent 用 Python `json.load` + `json.dump` 直接读写了 prefab 文件。修改后游戏完全崩溃：所有点击无反应，控制台报 `TypeError: Cannot read properties of undefined (reading 'getChildByName')` 在 `BuyViewCmpt.updateItemStatus`。

## 根因分析

1. **浮点数精度污染**: Python `json.dump` 将 `54.4` 序列化为 `54.400000000000006`，将精确小数变成了浮点噪声
2. **连锁崩溃**: buyView.prefab 格式异常 → homeView.prefab 内嵌的 buyViewCmpt 在启动时加载失败 → 整个游戏崩溃
3. **不可 git 回滚**: buyView.prefab 是新建文件（untracked），无法 `git checkout` 恢复
4. **编辑器 Ctrl+S 不能立即修复**: 可能需要在 prefab 编辑模式中做实际改动才能触发完整重写

## 解决方案

最终由用户在 Cocos Creator 编辑器中打开 buyView.prefab → Ctrl+S 保存，编辑器用原生格式重写文件后恢复。

## 预防规则

**绝对禁止用任何脚本（Python/Node.js/sed/awk 等）直接修改以下 Cocos Creator 文件：**
- `.prefab` 文件
- `.scene` 文件
- `.anim` / `.animation` 文件
- 任何 Cocos Creator 编辑器生成的 JSON 资产文件

**正确做法：**
- 所有 prefab/scene 属性修改 → 告诉用户在 Cocos 编辑器中操作
- 只读审计可以用脚本（`json.load` 读取分析），但绝不写回
- 代码文件（.ts/.js）可以用脚本修改，资产文件不行

## 关联
- 项目: kingDianPuzzle
- Session: 20260406-213536
- [[PAT-002__cocos-asset-operation|PAT-002]] — Cocos 资产文件操作原则
