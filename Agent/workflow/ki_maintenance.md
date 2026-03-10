# KI Maintenance Workflow

## 概述
KI 维护流程，负责 KI 资产的增删改操作。

## 触发条件
- 归档反哺发现可沉淀内容
- Error Book 积累到需要提炼模式
- Tool 层有新外部资源需要提炼
- 用户显式要求记录/删除/更新知识
- QA 发现重复错误模式

## 流程

### Step 1: KI 操作分类
识别操作类型：
- **CREATE**: 新增 KI 条目
- **UPDATE**: 更新已有 KI（置信度、内容、适用范围）
- **DELETE**: 废弃 KI（标记 deprecated，不物理删除）
- **PROMOTE**: 从 Internal_KI 提升到 External_KI 级别
- **EXTRACT**: 从 Tool 层原始资源提炼进入 KI

### Step 2: 冲突检查
对于 CREATE 和 UPDATE：
1. 搜索 KI/External_KI/ 和 KI/Internal_KI/ 中的现有条目
2. 检查是否存在重复或冲突
3. 如存在冲突，标记不确定性，上报 CTO 决策

### Step 3: 质量门控
新增/更新 KI 必须满足：
- [ ] 有明确来源（Tool 路径 / 任务编号 / 用户指令）
- [ ] 无重复（已检查 cross_references）
- [ ] 有适用场景说明
- [ ] 有置信度评估

### Step 4: 执行操作
- CREATE: 使用 KI/Templates/ki_entry.tmpl.md 创建条目（Error Book 条目使用 KI/Templates/error_book_entry.tmpl.md）
- UPDATE: 对照 Tool 中原始内容，更新最优部分
- DELETE: 在条目中标记 `deprecated: true`，记录原因
- PROMOTE: 从 Internal_KI/ 复制到 External_KI/，更新索引
- EXTRACT: 从 Tool/ 原始 SKILL.md 提取，经分类/去重/对比后写入

### Step 5: 索引同步
更新相关索引文件：
- KI/External_KI/master_index.json
- KI/Internal_KI/index.json
- KI/Error_Book/index.json（如涉及错误模式）

### Step 6: 变更记录
在 .in-process/active/{run_id}/ 中记录 change_manifest，
记录 KI 操作类型、受影响文件、变更前后对照。
