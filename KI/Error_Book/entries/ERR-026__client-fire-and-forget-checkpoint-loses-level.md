---
id: ERR-026
type: error
errorCode: SAVE-002
severity: critical
status: resolved
recurrence: 1
firstSeen: 2026-05-17
tags:
  - error/critical
  - tool/typescript
  - tool/fetch
  - tool/cocos
  - tool/mongodb
  - tool/express
  - errorCode/SAVE-002
  - ki/error-book
  - domain/server-progress
  - domain/persistence
  - domain/save-system
keywords:
  - 服务器进度
  - 进度同步
  - 关卡解锁
  - 通关持久化
  - server progress
  - progress sync
  - level unlock
  - checkpoint
  - save system
  - fire-and-forget
  - fetch keepalive
  - revision
  - CAS
  - optimistic locking
  - 409 SAVE_CONFLICT
  - stale snapshot
  - lastCheckpoint null
  - monotonic clamp
  - mongo $set undefined
  - conditional spread
prevention: "5 条铁律（搭建服务器进度系统必读）：(1) 关键持久化点 await，禁止 fire-and-forget；(2) fetch keepalive 必须 .then 读响应回写 revision/id 等 server state；(3) visibility:hidden 走 async sync 不走 unload beacon；(4) server 全量覆盖接口（save/finish）对单调字段加 max(client, server) 防御；(5) mongo $set 字段可能 undefined 时用 conditional spread 防抹"
aliases:
  - ERR-026
---

# 服务器进度系统五条铁律 — 通关后下一关解锁失败 RCA

> **召回触发**：任何"搭建/修改服务器端进度系统"任务（关卡解锁 / 存档 / checkpoint / 同步 / CAS / revision）开工前必读本条。

## TL;DR — 五条铁律（搭服务器进度系统必读）

| # | 铁律 | 反例（本次踩过的坑） |
|---|------|----------------------|
| **1** | **关键持久化点必须 `await`，禁止 fire-and-forget** | `PersistenceManager.checkpoint(lv, stars).catch(...)` 不 await → 玩家关页时 checkpoint 还没发出去 |
| **2** | **fetch keepalive 必须 `.then(r => r.json())` 读响应** | `finishViaBeacon` 不读响应 → server `revision++` client 不知 → 下次操作 stale revision → 409 风暴 |
| **3** | **`visibility:hidden` 走 async sync，不走 unload-specific beacon** | page 仍活着不需要 keepalive，async XHR 自然读响应、自然更新 _doc.revision |
| **4** | **server 全量覆盖接口（save/finish）对"业务单调字段"必须加 `max(client, server)` 防御** | `finish` 缺 advance 逻辑 → stale snapshot.currentLevel 把 server 拽回；`checkpoint` 已有 `if (level >= currentLevel) currentLevel = level+1` 必须**对称**到 save/finish |
| **5** | **mongo `$set: { field: undefined }` 会抹掉字段** → 用 conditional spread | `setBlock.lastCheckpoint = save.lastCheckpoint` 当 undefined 时 mongo 写 null → checkpoint 写入的 lastCheckpoint 被下次 save/finish 抹 |
| **6** (加) | **业务"完成事件"与代码"按钮事件"必须解耦** | `LevelConfig.nextLevel()` 只在 `nextBtn / guanbiBtn` 触发 → 玩家不点按钮直接关页就丢解锁 → 提前到 `result.loadExtraData(isWin=true)` |

## 一句话 bug 概括

**Client 通关后没把 "已解锁下一关" 这件事可靠地推到 server，server 端最终偶尔靠 checkpoint 自动 advance 路径"碰运气"才升上去，期间用户多次刷新看到的都是旧关卡 + server log 409 风暴。**

---

# 通关后下一关解锁失败 — fire-and-forget 持久化 + fetch keepalive 不读响应 + server 缺单调约束 + lastCheckpoint 被 null 抹

## 错误现象

REQ-20260516-215448 交付（revision CAS + finishViaBeacon + boolean coercion）后，回归测试发现：

- 玩家通关 lv5 → 主界面 home 仍显示 lv5，lv6 未解锁
- 玩家**多次重试**（关页 / 重开 / 再通关）后，server 才"慢慢"把 currentLevel 推到 6
- server 日志同一秒内 3-4 次 `409 SAVE_CONFLICT client=55 server=56` 风暴，最后才 `checkpoint ok currentLevel=6 revision=57`
- mongo `lastCheckpoint` 字段始终为 `null`（即使 checkpoint 路径明确写入了 `{level, stars, timestamp}`）

5 条 root cause（按贡献度）：

| Pri | 根因 | 表现 |
|-----|------|------|
| P0 | `finishViaBeacon` 用 fetch keepalive 但**不读响应** | server 处理 finish 后 `revision++`，client `_doc.revision` 留在旧值；下次同会话内 sync/checkpoint/finish 都带 stale revision → CAS 409 |
| P1 | `result.loadExtraData` 的 `PersistenceManager.checkpoint(...)` 是 fire-and-forget (`.catch()` 不 await) | 用户在结算弹窗直接关浏览器是常见行为 → checkpoint 可能未完成；finish 不带 advance 逻辑，用 stale snapshot.currentLevel 覆盖 |
| P2 | `LevelConfig.nextLevel()` 只在 `result.onClick_nextBtn` / `onClick_guanbiBtn` 触发 | 用户在弹窗不点按钮就关页 → nextLevel 永不执行 → `_doc.progress.level` 不更新 |
| P3 | `nextLevel()` 后无 explicit sync | 仅靠 10s autoSync 周期或关页 beacon — 都不可靠（< 10s 刷新就丢） |
| P4 | server `puzzleSaveService.finish` 没有 currentLevel advance / max 逻辑 | `checkpoint` 有 `if (level >= currentLevel) currentLevel = level + 1` 兜底，但 `finish` 没有 → stale snapshot.currentLevel 把 server 拽回 |
| P5 | `gameSaveRepository.upsert` 的 setBlock 直接 `lastCheckpoint: save.lastCheckpoint` 即使 undefined | mongo `$set: { lastCheckpoint: undefined }` 写成 null → checkpoint 写入的 lastCheckpoint 立即被下一次 save/finish 抹掉 |

故障窗口：从 finishViaBeacon (REQ-20260516-215448) 上线起。

## 根因分析

### P0：fetch keepalive 不读响应的设计陷阱

`finishViaBeacon` 设计意图是关页时把最后状态推上去（beforeunload / pagehide 真卸载场景）。fetch keepalive 是为此设计的 — 允许请求在 page unload 后继续完成。

但**实现方误以为 "keepalive 不需要读响应"**：

```ts
// 出问题的写法
fetch(url, {keepalive: true, body: payload})
    .catch(e => console.warn(e));  // 只 catch，不 .then
// → server 处理后返回新 revision，client 永远不知道
```

后果：
- **beforeunload / pagehide** 真卸载场景：.then 不会执行（page 已死），但**这不是问题**（下次 init load 会拿到新 revision）
- **visibilitychange:hidden** 切 tab 场景：page 仍活着，但 client 仍用旧 _doc.revision 调下一次操作 → CAS 409 → reload + retry → 但**多个并发 fire-and-forget 调用**都用同一个旧 revision → 多次 409 风暴

修复：
```ts
fetch(url, {keepalive: true, body: payload})
    .then(r => r.ok ? r.json() : null)
    .then(body => {
        if (body?.data?.revision != null && this._doc) {
            this._doc.revision = body.data.revision;  // ← 读响应回写
        }
    })
    .catch(e => console.warn(e));
```

更进一步：**把 visibilitychange:hidden 从 beacon 路径移出**，改走正常 `await sync()`（XHR），因为页面仍活着不需要 keepalive 兜底，async 路径自然读响应。

### P1：fire-and-forget 在关键 UI 路径

```ts
// 出问题的写法
async loadExtraData(lv, isWin, ...) {
    if (isWin) {
        // ...
        PersistenceManager.checkpoint(lv, starCount).catch(e => console.warn(e));
        // ↑ 不 await！用户可能在 checkpoint 完成前就关了页面
        this.handleWin(coutArr);
    }
}
```

修复：改成 `await`，同时把 UI 动画提前（`handleWin()` 放在 await 之前不阻塞）：
```ts
this.handleWin(coutArr);  // 动画先起
try { await PersistenceManager.checkpoint(lv, starCount); }
catch (e) { console.warn(...); }
```

### P2/P3：业务语义"通关即解锁"未与代码对齐

`LevelConfig.nextLevel()` 只在 nextBtn / guanbiBtn 触发是历史代码（pre-mongodb 时代靠 localStorage 保证不丢）。改到 server 端持久化后，按钮触发不再可靠。

修复：把 `nextLevel()` 提前到 `result.loadExtraData(isWin=true)` 阶段：

```ts
if (isWin) {
    // ...
    if (lv == LevelConfig.getCurLevel()) {
        LevelConfig.nextLevel();  // ← 通关即同步升级 _doc.progress.level
    }
    this.handleWin(coutArr);
    await PersistenceManager.checkpoint(lv, starCount);  // ← 立即写 server
}
```

`onClick_nextBtn` / `onClick_guanbiBtn` 内的 `nextLevel` 调用保留（变 no-op，因为 `lv == getCurLevel()` 不再成立），作为防御冗余。

### P4：server finish 缺单调约束

`puzzleSaveService.checkpoint` 已有正确逻辑：
```ts
if (checkpointInput.level >= extracted.progress.currentLevel) {
    extracted.progress.currentLevel = checkpointInput.level + 1;
}
```

但 `save` / `finish` 完全没有这个保护。后果：autoSync 偶尔用 stale snapshot.currentLevel 把 server 已升级的 currentLevel 拽回。

修复（对称防御）：
```ts
// puzzleSaveService.finish / save
const currentDoc = await this.saveRepo.findByUserAndGame(...);
if (currentDoc && extracted.progress.currentLevel < currentDoc.progress.currentLevel) {
    logger.warn('monotonic clamp', {client: ..., server: ...});
    extracted.progress.currentLevel = currentDoc.progress.currentLevel;
}
```

### P5：`$set: { field: undefined }` 把 mongo 字段写 null

```ts
// 出问题的写法
const setBlock = {
    progress: save.progress,
    lastCheckpoint: save.lastCheckpoint,  // ← 如果 client 不传，这里是 undefined
    // ...
};
// findOneAndUpdate({ $set: setBlock })
// → mongo 把 lastCheckpoint 字段写成 null（mongodb driver 处理 undefined 的实际行为）
```

修复（conditional spread）：
```ts
const setBlock = {
    progress: save.progress,
    schemaVersion: save.schemaVersion,
    updatedAt: now,
    ...(save.lastCheckpoint !== undefined && { lastCheckpoint: save.lastCheckpoint }),
    ...(save.boosters !== undefined && { boosters: save.boosters }),
    ...(save.settings !== undefined && { settings: save.settings }),
};
```

## 预防措施（同步加入工程铁律）

1. **关键持久化点必须 await** — 结算 / 通关 / 支付 / 登录这类一次写完不可补救的路径，**禁止** `.catch()` fire-and-forget。如果担心 UI 动画延迟，把动画放在 await 之前同步起。

2. **fetch keepalive 必须 `.then(r => r.json())`** — 任何需要从响应回写 client state 的 HTTP 调用，即便是 keepalive 也必须读响应。unload 时 .then 不执行无害（下次 init 修正），但 visibility 边界场景里 .then 能执行就一定要执行。

3. **visibility:hidden 走 async sync 不走 unload beacon** — beacon 是为真正 unload 设计的；page 仍活着的话用 await XHR 更可靠。

4. **mongo `$set` 字段可能 undefined 时用 conditional spread** — `...(value !== undefined && { field: value })` 取代直接写。否则 mongo driver 处理 `undefined` 的实际行为（写 null / 报错 / 忽略）跨版本不一致，且会**抹掉**已有字段。

5. **server 全量覆盖接口加单调约束** — save/finish 这类"client 提交完整 snapshot 覆盖"路径，对**业务上单调递增**的字段（如 currentLevel）必须加 `max(client, server)` 防御。和 checkpoint 的 advance 逻辑对称。

6. **业务"完成事件"与代码"按钮事件"必须解耦** — "通关即解锁"是业务事实，不能依赖玩家点了哪个按钮才生效。代码层面在事件发生瞬间（result 弹窗弹出 = 通关确认）就完成所有持久化副作用。

## 相关任务

- `REQ-20260517-013613` — 本次修复（5 根因 + 1 附加 storageHelper 降噪）
- `REQ-20260516-215448` — 上一轮 revision CAS / finishViaBeacon / coercion 交付（本次修复的前置）
- `REQ-20260516-202351` — 全字段仲裁 `_mergeLocalBackupIntoSave`（本次没动，但是兼容前提）

## 关联文件

```
client:
  assets/script/game/ui/resultViewCmpt.ts        - T2 提前 nextLevel + await checkpoint
  assets/script/game/mainCmpt.ts                 - T3 visibility→sync
  assets/script/persistence/mongoDBAdapter.ts    - T3 .then revision；T6 localLevelChanged log
  assets/script/persistence/persistenceTests.ts  - T7 回归 case
  assets/script/utils/storageHelper.ts           - 附加 PrintError 降噪

server:
  server/src/services/puzzleSaveService.ts       - T4 save+finish 单调约束
  server/src/repositories/gameSaveRepository.ts  - T5 conditional spread
```

## 检测信号（下次重现时）

- mongo 实查 `t_game_saves.progress.currentLevel` 落后于玩家肉眼通关数
- mongo `lastCheckpoint: null` 反复出现
- server log 短时间内 ≥3 次 `revision conflict` 同 expectedRevision
- client console 缺 `checkpoint ok level=N+1` 但有 `auto nextLevel on win`

## 关联铁律

- IL 03 REUSE BEFORE BUILD — 复用 server 端 checkpoint 已有的 advance 逻辑，不重写
- 部署铁律（[[project_revision_cas_lessons]]）：server 先 client 后 + rsync chmod 644
- `[[feedback_snapshot_before_new_change]]`：动改前先 snapshot commit 旧 working tree
