---
id: ERR-062
type: error
title: 降级兜底数据被当作成功采集 → fail-close 计数器永不触达，闸门形同虚设
severity: high
status: resolved
recurrence: 0
firstSeen: 2026-07-25
tags:
  - error/high
  - domain/fail-safe
  - tool/claude-code-hooks
  - errorCode/BHV-001
  - ki/error-book
prevention: 任何『主源失败 →
  降级兜底源』的采集函数，返回值必须让调用方能区分『实时』与『降级』；凡是用于**放行/解锁/撤防**的判定，只接受实时数据，降级数据一律计入失败计数并走
  fail-close。把降级结果标成 ok:true 而不带来源标记，等于让 fail-close 阈值永远归零。
ci_rules:
  - type: code-pattern-require
    pattern: source\s*[:=]\s*['"](live|cache|mock|degraded)['"]
    message: "[ERR-062]
      带降级兜底的采集函数必须在返回值里标注数据来源（live/cache/...），否则调用方无法区分实时与降级，fail-close
      会被降级数据永久压制。"
related:
  - Internal_KI/patterns/PAT-031__external-quota-autonomous-gate.md
  - Error_Book/entries/ERR-058__same-event-parallel-repair-race-partial-success-fail-open.md
mem_ref: e39e2fb2-d982-4129-aa64-19d5a18db0c9
mem_status: linked
errorCode: ERR-062
aliases:
  - ERR-062
  - degraded-data-defeats-fail-close
---

# 降级兜底数据被当作成功采集，fail-close 形同虚设

## 错误现象

五小时额度自治闸门（[[PAT-031__external-quota-autonomous-gate|PAT-031]]）的守护进程写着「连续 N 次采集失败就 fail-close 闸住」，看上去很稳。实际上**网络永久断掉时闸门永远不会触发**。

盘上实锤（本次定向测试）：强制实时端点失败后，采集函数返回
```
ok=True  source=cache  utilization=100  staleSec=12689
```
—— 一份 **3.5 小时前**的快照，报 100%，而真实用量当时约 40%。守护进程主循环只判 `if (!r.ok)`，于是把它当成一次成功采集，`probeFails` 归零。三条后果同时成立：

1. fail-close 阈值**永远达不到** —— 网络断多久都不闸。
2. 陈旧的低用量读数会被拿去**撤防 / 解锁**（放行决策用了过期信息）。
3. 陈旧的高用量读数会造成**误闸**，且因为没标来源，排查时看不出数据是隔夜的。

## 根因

降级路径把「我拿到了一个值」等同于「我拿到了一个**可信**的值」。

```js
// 错误：ok:true 抹平了实时与降级的区别
try   { return await probeLive(); }              // → { ok:true, source:'live'  }
catch { return probeCached(); }                  // → { ok:true, source:'cache' }  ← 调用方分不出来

// 调用方
if (!r.ok) { probeFails++; ... }                 // 降级永远走不到这里
probeFails = 0;                                  // ← 被降级数据无声归零
```

与 [[ERR-058__same-event-parallel-repair-race-partial-success-fail-open|ERR-058]] 同族但不同维：ERR-058 是「修好即放行」，本条是「**降级即放行**」。两者共同的病根是 —— 门禁把「没有明确的坏消息」误当成「好消息」。

## 修复

**一、采集函数必须自报来源**，并让调用方据此分级：

```js
const live = r.ok && (r.source === 'live' || r.source === 'mock');
if (!live) {
  probeFails += 1;
  audit('probe_not_live', { n: probeFails, source: r.source, staleSec: r.staleSec });
  if (probeFails >= cfg.probeFailCloseAfter && readLock().state === 'none') {
    writeLock(r, `连续 ${probeFails} 次未取得实时用量`, 'probe-fail');
  }
  await sleep(...);
  continue;                    // 非实时数据不参与任何放行判断
}
probeFails = 0;
```

**二、fail-close 闸门要分类型、可自愈。** 采集失败型闸门（`kind: 'probe-fail'`）的解锁 horizon 取短值（60s）而非一个完整配额周期 —— 采集一恢复正常就在一分钟内自动放行。若沿用「now + 一个完整周期」，一次 45 秒的网络抖动会把机器闸死五小时。

**三、降级值仍可用于展示，但必须带陈旧度**（`staleSec`），且展示层要标出来源。

## 预防规则

| 规则 | 说明 |
|---|---|
| 采集返回值必带 `source` | 只有 `ok` 布尔量的降级采集函数一律视为缺陷 |
| 放行/解锁/撤防只认实时数据 | 降级数据可用于**展示**与**告警**，不可用于**放行** |
| 降级即计入失败 | 降级不是成功，必须推进 fail-close 计数器 |
| fail-close 闸门要能自愈 | 按失败原因决定解锁 horizon，别用一刀切的长周期 |
| 定向测试失败路径 | 「主源不可用」必须有专门测试，不能只测 happy path |

## 关联

- [[PAT-031__external-quota-autonomous-gate|PAT-031]] — 本错误发现于该模式的实现，修复已回写模式的「致命细节」表
- [[ERR-058__same-event-parallel-repair-race-partial-success-fail-open|ERR-058]] — 同族：门禁把「没有坏消息」误当「好消息」
- [[ERR-057__env-dependent-state-root-write-a-read-b-fail-open|ERR-057]] — 同为 fail-open 家族：状态根写 A 读 B
