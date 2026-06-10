---
id: PAT-008
type: pattern
title: "Mongo 唯一索引 + 11000 duplicate-key 驱动的幂等服务（first-call / replay / race-lost 三路径）"
status: active
created: "2026-05-17"
tags:
  - "pattern/backend"
  - "pattern/data-logic"
  - "engine/mongodb"
  - "language/typescript"
  - ki/pattern
related:
  - "[[PAT-007__ip-sk-dual-factor-server-to-server-auth|PAT-007]]"
trigger_condition: "user_explicit"
aliases:
  - "PAT-008"
  - "mongo-idempotency"
---

# Mongo Duplicate-Key 驱动的幂等服务

## 适用场景

任何 **POST grant** 类副作用接口（发金币 / 发体力 / 发道具）的幂等保护：
- 客户端传 `idempotencyKey`
- 同 key 重放 → 必须返回首次结果，**不允许重复发**
- 并发同 key（race） → 只一次副作用，所有 caller 看到同一 result
- 持久层用 Mongo，**不引入 Redis / external cache**

**典型业务**：reward grant、prop grant、parent-platform server-to-server grant。

## 步骤

1. **新建 collection** `t_xxx_idempotency`（独立或合并到现有 ledger，**不要**混入业务文档）：
   - 唯一索引 `{idempotencyKey: 1}` —— 制造 duplicate key 11000 错误
   - TTL 索引 `{createdAt: 1}` `expireAfterSeconds: 7d` —— 自动清理老 key

2. **文档结构**：
   ```ts
   { idempotencyKey: string, result: unknown, createdAt: Date }
   ```
   `result` 是首次执行的 **serialized response payload**（任意 JSON）。

3. **Service 高阶函数包装** `withIdempotency<T>(key, compute)`：
   ```ts
   async withIdempotency<T>(key: string, compute: () => Promise<T>): Promise<T> {
     // Path A — Replay hit
     const cached = await repo.findByKey(key);
     if (cached !== null) return cached as T;     // 命中 → 直接返回，不跑 compute

     // Path B — First call
     const result = await compute();
     try {
       await repo.insertResult(key, result);
       return result;
     } catch (err) {
       // Path C — Race lost: another caller raced and inserted first
       if (err.code === 11000) {
         const winner = await repo.findByKey(key);
         if (winner !== null) return winner as T; // 返回赢家结果
       }
       throw err;   // 其他错误透传
     }
   }
   ```

4. **Controller 接入**：
   ```ts
   const result = await this.idem.withIdempotency(body.idempotencyKey, () =>
     this.grant.grantStamina(body.userId, body.amount),
   );
   res.json(success(result));
   ```

5. **idempotencyKey 格式校验**（共享 regex）：
   ```ts
   IDEMPOTENCY_KEY_REGEX = /^[a-zA-Z0-9_\-:.]{10,200}$/
   ```
   太短/含空格/含特殊字符 → 400 `IDEMPOTENCY_KEY_INVALID` —— 拦在 Zod schema 即可。

## 三路径覆盖

| 路径 | 触发 | compute 调用次数 | repo.insert 调用 | 返回 |
|------|------|------------------|------------------|------|
| **A: Replay** | 同 key 二次调用 | 0 | 0 | 缓存的首次 result |
| **B: First call** | 新 key 首次 | 1 | 1（成功） | compute 结果 |
| **C: Race lost** | 并发同 key，本调用慢一拍 | 1（白跑） | 1（11000 失败） | 赢家的 result（**非本次 compute 结果**） |

**注意**：Path C 中本次 `compute()` 会执行一次但副作用必须**幂等于 compute 本身**或**业务级可吸收**（如金币发放：赢家已发，本次 compute 内 platformAdapter call 也会发一次 → 业务级双发）。如不能容忍，需 compute 内做二次幂等校验（如先查 ledger）。本 pattern 适合 grant-stamina（boosters 计算性写入）、grant-weekly-pack（$inc 累加），不适合不可逆外部调用。

## 反模式

| 错误做法 | 正确做法 | 关联错误 |
|---------|---------|---------|
| 用 `findOneAndUpdate(upsert:true)` 包裹整个 compute | compute 先跑、insert 后写：解耦 compute 与持久化 | upsert 后 compute 失败 → 持久化了不该写的 record |
| 用 in-memory Map 做幂等表 | Mongo 唯一索引 + TTL | 单实例只能保护单进程；集群挂了即重复 |
| 把 `result` 字段放业务表 | 独立 collection | 业务表写入路径与幂等校验耦合 |
| TTL `expireAfterSeconds: 0` | 7 天（业务可调） | 0 = 立刻过期，幂等失效 |
| race 时再跑一次 compute 拿值 | race 时**只读** repo.findByKey 拿赢家的 result | 多次 compute 业务级双发 |

## 关联错误

- 无（本 pattern 在 kingDianPuzzle 落地无新增 ERR）
- 但与 [[ERR-027__integration-test-concurrency-collision|ERR-027]] 思路相关（测试期 concurrency 隔离）

## 实现参考

- `server/src/repositories/parentIdempotencyRepository.ts` + `server/src/services/parentIdempotencyService.ts`（kingDianPuzzle, commit `d95b73c`）
- 5 个 unit cases 覆盖三路径：`server/src/__tests__/unit/parentIdempotencyService.test.ts`
- 集成测试验证「同 key 重放 → newHeart 一致 + Mongo 仅 1 条 idempotency record」：`integration/parentApi.test.ts` Idempotency suite
- 同型实现参考：`server/src/repositories/rewardLedgerRepository.ts:57-92`（已存在的 reward ledger 用相同 11000 模式）
