---
id: ERR-012
type: error
errorCode: BHV-001
severity: high
status: resolved
recurrence: 1
firstSeen: 2026-04-10
tags:
  - error/high
  - engine/cocos
  - asset/image
  - errorCode/BHV-001
  - ki/error-book
prevention: "导入美工资源时第一步重命名为英文，禁止中文/空格文件名进入 assets/"
aliases:
  - ERR-012
---

# 美工资源使用中文文件名导入到项目

## 错误现象
将美工提供的切图（如 "领取.png"、"累计奖励进度条底.png"、"组 12.png"）直接复制到 assets/ 目录，中文文件名在 Cocos Creator 中可能导致路径解析问题、跨平台兼容性问题，且代码中引用不便。

## 根因分析
美工交付的文件默认是中文命名。Agent 没有在导入第一步做文件名规范化，直接 cp 进了项目。

## 解决方案
导入美工资源的标准流程：
1. 在项目外整理文件，全部重命名为英文（snake_case）
2. 再复制到 `assets/res/` 目标目录
3. 刷新编辑器资源库

命名对照表示例：
- 领取.png → item_claimable.png
- 未获得遮罩.png → item_locked.png
- 累计奖励进度条底.png → reward_progress_bg.png

## 预防规则
**美工资源进入 assets/ 目录前，必须先重命名为英文 snake_case。禁止中文、空格、特殊字符出现在资源文件名中。**
