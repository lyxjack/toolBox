---
type: run_log
project: KEEP
subsystem: reasoning-flywheel
date: 2026-07-06
mem_ref: adb24532-cf1a-4a71-8e20-2fb49d5a2c08
mem_status: linked
---

# Reasoning 飞轮审计回合 + 压力测试(2026-07-06)

对 M-R1~M-R4 + RF-1 + /reasoning 治理页做复审计,并以 `sandbox/src/reasoning-stress.ts` 压测五个靶点(keep_stress 隔离库,10k promoted + 10k discarded + 1M metric + 300 race)。报告:`sandbox/out/reasoning-stress-report.json`。

## 发现(按严重度)

### F-R1 [HIGH] 双副本重复蒸馏竞态 — 压测实锤
`workers/reasoning-distill/src/runner.ts` `tick()` 的 `for update skip locked` 是**裸 SELECT**——PG autocommit 下锁随语句结束立即释放,不像 knowledge-compiler 的 `claimAndStart` 包在 `sql.begin` 里锁到事务完成。两副本轮询相位错开(真实部署常态)时,后到的 SELECT 重新拿到同一批 pending 行。
- 压测:错开 25ms 起跑 → **295/300 会话被双份蒸馏**(reasoning_memory、reasoning_metric 各多 295 行);只有两条 SELECT 在途重叠时 skip locked 才生效(0/300)。
- 影响:metric 双记 → 干预率/自主率失真;接真智谱后 GLM 调用双倍计费。
- 现状:compose 单副本,**latent**;扩副本即触发。
- 修法:认领包进事务(仿 knowledge-compiler),或 `update outbox set status='processing' ... returning` 原子认领;外加 `reasoning_memory(source_session_id)` 唯一索引兜底(现幂等 count 检查是 TOCTOU)。

### F-R2 [MED] daemon idle 每 2s 全量 reconcile(节流条件缺陷)
`daemon.ts` `if ((n === 0 && lastReconcile > 0) || now - lastReconcile >= RECONCILE_MS)`——idle 时首条件恒真,reconcile 每个 POLL_MS(2s)跑一次,而非注释声称的"一波落幕跑一次或每 RECONCILE_MS(10s)"。应记录 busy→idle 边沿(如 lastTickHadWork)。

### F-R3 [MED] buildReasoningIndex O(N) 每行一查,规模线性劣化
steady-state(无变化)reconcile 全表扫 promoted+discarded 且每行一次 chunk SELECT,单事务:
- 10k promoted:~600ms;+10k discarded:~964ms(discarded 永久陪扫,每行白付一次 SELECT)
- 斜率 ~59ms/1k promoted,外推 100k → **~5.9s/次**;叠加 F-R2 的 2s 节奏 → worker+PG 空转饱和(RF-1 的续集)
- 修法:SQL 侧按 updated_at/版本水位增量;discarded 清完 chunk 后立即出扫描集;修 F-R2 后压力减半以上。

### F-R4 [LOW] /reasoning 页 1M metric 行 = ~400ms(4 个 seq scan)
overview 190ms + trend 99ms + byProject/byPtype 各 54ms;EXPLAIN 证实 trend 走 Parallel Seq Scan(现组合索引 (project,problem_type,occurred_at) 前导列不匹配)。治理页低频可容忍;规模再涨加 occurred_at btree/BRIN,或日汇总表。dashboard 的 AI autonomy 卡同样付 overview 全扫。

### F-R5 [LOW] createGatewayDistiller fetch 无超时
真智谱/网关挂起 → worker 串行 tick 永久卡死(无 AbortController)。接真 GLM 前应加超时(如 30s)+ 退避。

### F-R6 [已修] reasoning 新测试文件 7 个 biome error + 2 文件未 format
会挂 CI lint 门。本回合已修(format + useTemplate + 去非空断言),`biome check` 恢复只剩既有 1 warning。

## 通过项
- 结果闸 @10k 候选 + 2k knowledge 关联:194ms,promoted/discarded 精确 1000/1000 ✔
- 检索 P50 25ms / P95 136ms @44k chunks(4.4k 时 2~5ms;随语料涨但可容忍)✔
- chunk 不变式:恰 4×promoted,discarded 零 chunk ✔
- 迁移索引面(GIN tsv/trgm/scope)、检索工具契约上界(query≤4096/max_results≤50/strict)、scope default-deny、注入围栏、/reasoning 页渲染转义 ✔
- 基线:517 TS + 116 Py 全绿(注意:vitest 与 pytest **不可并行**打同一 dev PG,会互相干扰出假 500)

## 复现
```bash
pnpm exec tsx sandbox/src/reasoning-stress.ts [nPromoted] [nDiscarded] [nMetric] [nRace]
```


## 修复回合(同日,F-R1→F-R2→F-R5→F-R3)

| 发现 | 修法 | 压测复验 |
|------|------|---------|
| F-R1 竞态 | tick 改**原子租约认领**(单条 UPDATE 内 select+前移 available_at 60s,崩溃后租约自动回收;不加新 outbox status,复用 ix_outbox_claim)+ 迁移 `mr2_reasoning_uniq`(去重后 source_session_id 唯一索引替换冗余 ix_reasoning_session;metric 同步去重)+ processOne 插入改 `on conflict do nothing`,metric 只在真插入时写 | 错开 25ms 双副本:**295/300 dup → 0/300**,认领干净均分 150/150 |
| F-R2 idle 每 2s reconcile | daemon 记 busy→idle **边沿**(lastTickHadWork),边沿或每 RECONCILE_MS 才跑 | 代码级;叠加 F-R3 后 10k 规模 idle 负载 964ms/2s(≈48% 占空)→ 58ms/10s(≈0.6%) |
| F-R5 fetch 无超时 | createGatewayDistiller 加 timeoutMs(默认 30s):AbortController 掐真连接 + Promise.race 兜底(fetchImpl 无视 signal 也不挂死);新测试盖 | 挂起 fetch 50ms 超时抛错 ✔ |
| F-R3 全量扫每行一查 | buildReasoningIndex 增量化:残留清理=单条集合 DELETE(discarded 清一次即退出扫描集);逐行 diff 只跑"缺 chunk 或版本落后"增量集 | steady @10k+10k:**964ms → 58ms**(~17×);+10k discarded 只 +8ms(原 +367ms);斜率 58.6 → 5.1ms/1k;外推 100k:5.9s → 513ms |

- 新增测试:租约不可见 + metric 不双记(worker)、distiller 超时(reasoning 包)→ **519 TS + 116 Py 全绿**,tsc/biome 清洁。
- 迁移链新单头 `mr2_reasoning_uniq`(head 断言测试同步上移);本机 dev keep 已升级。
- **待办**:Mini 部署需重建镜像 + `alembic upgrade head` 才吃到修复(尤其唯一索引,否则 on conflict 语句报错)。
