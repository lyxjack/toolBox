---
id: ERR-001
type: error
errorCode: BHV-001
severity: high
status: resolved
recurrence: 3
firstSeen: 2026-03-09
tags:
  - error/high
  - tool/typescript
  - errorCode/BHV-001
  - ki/error-book
prevention: "使用 Result 类型模式包裹所有 async 返回值"
aliases:
  - ERR-001
---

# Agent 在 async 函数中忘记 try-catch

## 错误现象
Agent 生成的 async 函数缺少 try-catch 包裹,导致 Promise rejection 未被捕获,进程崩溃。

## 根因分析
Agent 在快速生成代码时倾向于写"happy path",忽略错误路径处理。

## 解决方案
1. 所有 async 函数必须使用 try-catch
2. 优先使用 Result 类型模式(见 KI-001)
3. API 层使用统一错误处理中间件

## 预防规则
当用户要求写 async 函数时,Agent 必须:
1. 先检查 KI-001 (Result Type Pattern)
2. 函数返回值包装为 Result<T>
3. 不使用裸 throw

## 关联
- KI-001 (Result Type Pattern)
- KI-002 (Async Error Fallback)
- [[PAT-005__async-error-handling|PAT-005]] — Async 错误处理模式
