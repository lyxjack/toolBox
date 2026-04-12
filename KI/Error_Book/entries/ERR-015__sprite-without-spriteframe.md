---
id: ERR-015
type: error
errorCode: BHV-001
severity: critical
status: resolved
recurrence: 1
firstSeen: 2026-04-10
tags:
  - error/critical
  - engine/cocos
  - asset/image
  - asset/prefab
  - errorCode/BHV-001
  - ki/error-book
prevention: "png 资源导入后必须确认 library 中有 @f9941.json（spriteFrame 编译产物），再绑定到 Sprite"
aliases:
  - ERR-015
---

# png 资源没有 spriteFrame 就直接绑定到 Sprite 组件导致 missing asset

## 错误现象
将 png 复制到 assets/ 后，直接用 UUID@f9941 引用绑定到 prefab 的 Sprite 组件。运行时所有 Sprite 显示 missing asset，因为 library 中实际没有 @f9941.json 编译产物。

## 根因分析
Cocos Creator 的资源导入管线：
1. png 进入 assets/ → 编辑器生成 .meta 文件
2. .meta 中声明 subMetas（6c48a=texture, f9941=spriteFrame）
3. 编辑器根据 .meta 编译资源到 library/（@6c48a.json + @f9941.json）
4. prefab 中的 Sprite 引用 @f9941 UUID

问题出在第 2-3 步：
- 手动写入的 .meta 文件格式不被编辑器认可，编辑器跳过 spriteFrame 编译
- MCP 的 refresh_assets / reimport_asset 不会触发完整的资源编译管线
- 只有**删除 .meta 文件后重新打开项目**或**在资源管理器中右键重新导入**才能让编辑器从零生成正确的编译产物

## 解决方案
导入新 png 资源的正确流程：
1. 将 png 复制到 assets/ 目标目录
2. **不要手写 .meta 文件**，让编辑器自动生成
3. 如果编辑器没有自动生成，**关闭项目再重新打开**
4. 验证 library/{uuid[:2]}/{uuid}@f9941.json 文件存在
5. 确认后再绑定到 prefab 的 Sprite 组件

## 预防规则
**新 png 绑定到 Sprite 之前，必须验证 library 中存在 @f9941.json 编译产物。如果不存在，删除 .meta 文件重新打开项目让编辑器从零生成。永远不要手写 .meta 文件。**

## 关联
- [[ERR-014__chinese-filename-in-assets|ERR-014]]: 中文文件名导入问题
- [[ERR-002__python-modify-cocos-prefab|ERR-002]]: 禁止脚本修改 Cocos 资产文件
