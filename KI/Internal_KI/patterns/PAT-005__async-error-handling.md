---
id: PAT-005
type: pattern
title: "Async 错误处理模式"
status: active
created: 2026-04-08
tags:
  - pattern/async
  - pattern/error-handling
  - pattern/typescript
  - ki/pattern
complements:
  - "[[ERR-001__unhandled-rejection|ERR-001]]"
aliases:
  - PAT-005
---

# Async 错误处理模式

## 适用场景

编写或审查任何包含异步操作（async/await、Promise、回调）的 TypeScript/JavaScript 代码时，必须遵循此模式。目标：确保所有异步错误路径都有明确的处理逻辑，杜绝 UnhandledPromiseRejection。

## 步骤

### 1. 所有 async 函数使用 try-catch 包裹

```typescript
async function fetchData(): Promise<Data> {
  try {
    const response = await api.get('/data');
    return response.data;
  } catch (error) {
    logger.error('fetchData failed', { error });
    throw new AppError('FETCH_DATA_FAILED', error);
  }
}
```

**规则**：async 函数内的 await 调用必须在 try-catch 中，或由调用者明确处理。不允许"裸 await"（无任何错误处理的 await）。

### 2. 优先使用 Result 类型模式

对于业务逻辑层，推荐 Result 包装而非直接 throw：

```typescript
type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };

async function fetchUser(id: string): Promise<Result<User>> {
  try {
    const user = await db.findUser(id);
    if (!user) {
      return { ok: false, error: new AppError('USER_NOT_FOUND') };
    }
    return { ok: true, data: user };
  } catch (error) {
    return { ok: false, error: new AppError('DB_ERROR', error) };
  }
}

// 调用方
const result = await fetchUser('123');
if (!result.ok) {
  // 明确的错误处理路径
  handleError(result.error);
  return;
}
const user = result.data;
```

**优势**：编译器强制调用方处理错误分支，不会遗漏。

### 3. API 层使用统一错误处理中间件

```typescript
// Express 示例
app.use(async (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ code: err.code, message: err.message });
  } else {
    logger.error('Unhandled error', { error: err, path: req.path });
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

// 路由处理器包装
function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await userService.getUser(req.params.id);
  res.json(user);
}));
```

### 4. Promise 链不留未处理的 rejection

```typescript
// 错误 — 未处理的 rejection
someAsyncOperation(); // 返回 Promise 但没有 await 也没有 .catch

// 正确 — 方式 A: await + try-catch
try {
  await someAsyncOperation();
} catch (e) {
  handleError(e);
}

// 正确 — 方式 B: .catch
someAsyncOperation().catch(handleError);

// 正确 — 方式 C: 明确忽略（极少数场景）
void someAsyncOperation().catch(() => { /* intentionally ignored */ });
```

### 5. 全局兜底（最后防线）

```typescript
// Node.js 进程级兜底 — 仅作为最后防线，不替代局部处理
process.on('unhandledRejection', (reason, promise) => {
  logger.fatal('Unhandled Promise Rejection', { reason });
  // 上报监控系统
  monitor.report('UNHANDLED_REJECTION', { reason });
});
```

## 审查清单

在 Code Review 或 AI Agent 审查代码时，检查以下项：

```
□ 每个 async 函数是否有 try-catch 或 Result 返回
□ 每个 await 调用是否在错误处理范围内
□ 是否存在未 await 的 Promise（fire-and-forget 需显式标注）
□ API 路由是否使用了 asyncHandler 包装
□ 全局 unhandledRejection 处理器是否已注册
```

## 反模式

| 错误做法 | 后果 | 对应错误 |
|----------|------|---------|
| async 函数不加 try-catch | UnhandledPromiseRejection 导致进程崩溃 | ERR-001 |
| 只依赖全局 unhandledRejection | 错误信息丢失上下文，难以定位 | ERR-001 |
| `.catch` 中只 `console.log` | 错误被吞，下游逻辑在错误状态下继续执行 | — |
| Promise.all 不处理部分失败 | 一个失败导致全部丢失 | — |

## 关联错误

- [[ERR-001__unhandled-rejection|ERR-001]] — 未处理的 Promise rejection 导致服务崩溃
