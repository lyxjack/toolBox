---
id: ERR-025
type: error
errorCode: SAVE-001
severity: critical
status: resolved
recurrence: 1
firstSeen: 2026-05-16
tags:
  - error/critical
  - tool/zod
  - tool/typescript
  - errorCode/SAVE-001
  - ki/error-book
prevention: "client 加新存档字段必须 4 同步：client storage key + server zod 白名单 + server unit test + _buildSnapshot 出口 coerce"
aliases:
  - ERR-025
---

# 客户端新增存档字段未同步到服务端 schema，导致 save 全量 400 数天玩家数据丢失

## 错误现象

测试人员反馈："玩过后每次开都是第 1 关，数据保存不上。"

实际链条：
1. **v6.2 客户端**新增 `progress.starRoadClaimed` 字段（星星之路里程碑领取状态）
2. **服务端** `server/src/schemas/puzzle.ts` 的 `gameSaveSnapshotSchema.progress` 用 `z.object({...}).strict()` 白名单**没有加** `starRoadClaimed`
3. 所有 `/api/puzzle/save` 请求被 server zod 拒收 → 400 `VALIDATION_ERROR: Unrecognized key(s) in object: 'starRoadClaimed'`
4. Mongo 始终保留旧数据，每次 init load 拿到 stale 数据 → 玩家进度回退
5. 修了 starRoadClaimed 后**又**陆续暴露 2 个衍生 bug（见"根因分析"），共 3 层 schema 契约违规

整个故障窗口：数天玩家进度无法存盘。

## 根因分析

**主线根因（critical）：前后端 schema 契约失同步**

新增 client 存档字段时，开发者只动了 client 端 3 处（storageHelper / playerSchema / 写入逻辑），**忘了同步改 server zod 白名单**。zod 用 `.strict()` 是好做法（拒绝 unknown field 防止脏数据），但意味着 client 加字段必须**同步**注册到 server。

**衍生根因 1（high）：client snapshot 全量 unconditional upsert → stale overwrite**

修完字段不同步后，发现 mongo 手动 update `heart=10` 被 client autoSync 在分钟级覆盖回 `3`。
- 根因：`MongoDBAdapter.sync()` 用 in-memory `_doc` 全量 POST，server `gameSaveRepository.upsert` 无条件 upsert
- 任何外部写入（mongo 手动 / 跨设备 / 平台 API）都会被下个 autoSync 周期擦除

**衍生根因 2（medium）：storage 往返污染类型 → strict schema 400**

修完 CAS 后又看到 `Expected boolean, received string` 400。
- 根因：`mongoDBAdapter.set(key, value)` 走 `JSON.parse(value)` 路径，`'1'` 变 number `1`、`'true'` 变 boolean `true`、其他字符串原样保留
- 结果：内存里 `_doc.settings.musicStatus` 可能是 string `'1'` 而非 boolean → server `.strict()` schema 拒收

**为什么 3 个 bug 串成连环**：fix 第一个后才能看到第二个的 error log（之前都被第一个 400 掩盖）。这种"错题盲区"在严格 schema + 早期失败模式下很常见。

## 解决方案

### 1. Schema 同步（主线修复）
`server/src/schemas/puzzle.ts`:
```ts
const gameSaveSnapshotSchema = z.object({
  progress: z.object({
    currentLevel: z.number().int().min(1),
    starScore: z.number().int().min(0),
    stars: z.record(z.string(), z.number().int().min(0).max(3)),
    starRewards: z.record(z.string(), z.number().int().min(0).max(1)),
    // V6.2 新字段：必须加白名单
    starRoadClaimed: z.record(z.string(), z.boolean()).optional(),
  }).strict(),
  // ...
}).strict();
```

### 2. Revision-based optimistic locking（防衍生根因 1）
- Server: `gameSaveRepository.upsert` 加 `expectedRevision` 参数，CAS 不匹配返回 conflict
- Client: `_doc.revision` 从 server load 取，sync/checkpoint/finish 带 `clientRevision`，409 自动 `_reloadAndMerge` 重试

### 3. Boundary type coercion（防衍生根因 2）
`mongoDBAdapter._buildSnapshot()` 出口对所有 schema 强类型字段强制 coerce：
```ts
// boolean
if (s.musicStatus != null) settings.musicStatus =
    s.musicStatus === true || s.musicStatus === 1 ||
    s.musicStatus === '1' || s.musicStatus === 'true';
// number
if (r.heart != null) boosters.heart = +r.heart;
```

### 4. 单元测试锁定契约
新增 server schema unit test `puzzleSchemaRevision.test.ts` 验证新字段被接受；新增 client `testBuildSnapshot_CoercesSettingsAndBoostersAndProgress` 验证出口类型。

### 5. 部署顺序
**Server 先（兼容老 client）→ Client 后**。新字段在 server schema 设为 `.optional()` 才能让在线老 client 不被 400 误伤。

## 预防规则

**Agent 触发时机**：用户要求"加新存档字段 / 加新 storage key / 改 player schema / 改 snapshot 结构 / 加 server zod schema"时强制召回。

**写代码前必须执行 4 步同步清单**：

1. **client 端** 3 处（已有 [[project_bug_tracker]] 提醒，再次强调）：
   - `assets/script/persistence/storageHelper.ts` — 加 StorageHelperKey 枚举
   - `assets/script/persistence/playerSchema.ts` — 加 PlayerDocument 字段
   - `assets/script/persistence/storage.md` — 文档同步

2. **server 端 zod 白名单**：
   - `server/src/schemas/{module}.ts` — `.strict()` 的 z.object 加新字段
   - 默认用 `.optional()`，让老 client 不带字段也能通过（向后兼容）

3. **server unit test**：
   - `server/src/__tests__/unit/{schemaName}.test.ts` — 至少 2 个 case：(a) 接受新字段 (b) 缺失字段不报错（back-compat）

4. **client 出口 coerce**：
   - `_buildSnapshot()` 对该字段做类型强制（boolean: 多形态匹配；number: `+x`），**不要信任内存里的 TS 类型符合 interface**

**部署铁律**：
- Server 必须先部署且新字段必须 `.optional()`
- Client 后部署
- 任何顺序颠倒 → 在线老 client 收到 400

**遇到 `Validation failed: ... Unrecognized key(s) in object: 'XXX'` 错误**：
- 直接定位到第 1 步漏掉的字段
- 不要先怀疑客户端，先看 server zod schema 是否注册了该字段
- 不要禁用 `.strict()` 当 workaround（会让脏数据进库）

**修保存 bug 时的"盲区"经验**：
- 一次 fix 一个 400 后，**立即**再跑完整端到端，因为前一个 400 可能掩盖了下一个
- 不要 fix 完一个就庆祝，要把整条 save → server → mongo → load 链路跑通

## 关联

- [[project_revision_cas_lessons]] — REQ-20260516-215448 项目级教训
- `assets/script/persistence/storage.md` — client storage key 注册表（项目内）
- `server/src/__tests__/unit/puzzleSchemaRevision.test.ts` — server schema contract test 范本
- `server/src/__tests__/integration/puzzleSaveRevision.test.ts` — AC-1 实战还原（mongo 外部 update 不被覆盖）
