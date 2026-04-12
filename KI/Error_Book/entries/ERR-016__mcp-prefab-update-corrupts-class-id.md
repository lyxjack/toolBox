---
id: ERR-016
type: error
errorCode: BHV-001
severity: critical
status: recurring
recurrence: 3
firstSeen: 2026-04-07
tags:
  - error/critical
  - engine/cocos
  - tool/MCP
  - asset/prefab
  - errorCode/BHV-001
  - ki/error-book
prevention: "MCP prefab_update 后必须检查脚本 __type__ 是否被替换为字符串；如果是，必须在编辑器中删除 MissingScript 重新挂载脚本"
aliases:
  - ERR-016
---

# MCP prefab_update_prefab 会把脚本组件的压缩 class ID 替换为字符串类名

## 错误现象
每次通过 MCP `prefab_update_prefab` 保存 prefab 后，自定义脚本组件的 `__type__` 从压缩 ID（如 `a1d6bag89hEIJwURCIjwKlo`）被替换为字符串类名（如 `starRoadViewCmpt`）。运行时引擎报 `Can not find class 'starRoadViewCmpt'`，组件变为 MissingScript。

## 根因分析
MCP 插件的 prefab_update_prefab 实现在序列化时使用了类名字符串而非 Cocos 引擎的压缩 class ID。这是 MCP 插件的 bug，不是使用方式问题。

## 解决方案
MCP prefab_update 后的必做检查：
```bash
grep -c '"starRoadViewCmpt"\|"starRoadItemCmpt"' prefab_file
```
如果 > 0，说明被替换了。修复步骤：
1. 在编辑器中打开 prefab
2. 找到 MissingScript 组件（红色警告），删除
3. 重新添加脚本组件（搜索正确的脚本名）
4. 设置 BaseViewCmpt 属性
5. 保存 prefab

## 预防规则
**每次 MCP prefab_update 后必须 grep 检查脚本引用。如果字符串类名出现，立即在编辑器中修复。长期方案：向 MCP 插件作者反馈此 bug。**

## 关联
- [[ERR-004__mcp-prefab-layer-ui2d|ERR-004]]: MCP 创建节点 layer 问题
- [[ERR-005__mcp-prefab-save-two-steps|ERR-005]]: MCP 保存两步规则
