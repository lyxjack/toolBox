---
id: RUN-2026-07-06-mini-1m
type: run-log
status: done-all-green
started: 2026-07-06
tags:
  - ki/run-log
  - domain/keep
  - env/mac-mini
  - test/stress-1m
---

# KEEP 1M 真机压测运行日志 — Mac Mini M4

> 实时记录。目标:通过 SSH 在 Mac Mini(kingdian@100.87.9.30)上对**已部署的真实容器栈**跑 1,000,000 事件采集压测,边跑边纠错,把发现写进本 KI,修到无问题为止。

## 环境快照(测前)

- 机器:Mac Mini M4,16 GB RAM(17179869184 B),10 核,macOS,arm64。磁盘 228Gi 用 6%。
- 部署:`~/Documents/KEEP-platform-20260705`,`docker compose` 全栈 9 容器全 healthy(up ~2h)。
  - `keep-ingestion-mcp-1` 127.0.0.1:8081 · `keep-task-context-service-1` 127.0.0.1:8083 · `keep-retrieval-mcp-1` 8082 · `keep-governance-web-1` 8090 · `keep-ai-gateway-wrapper-1` 0.0.0.0:8080 · `keep-postgres-1` 127.0.0.1:5434 · 2 workers · otel-collector。
- `keep` 库测前**全空**(event/session/employee/audit/knowledge_object/outbox 均 0)。
- 宿主机工具链:node v25.8.2 有;**pnpm/tsx/psql/uv 均无**;交付包**无 node_modules**。
  → sandbox 里的 `ingest-1m.ts`(靠 app.inject + tsx + psql + uv)在宿主机跑不了。

## 方案决策

**驱动真实部署栈(HTTP),而非 sandbox app.inject。** 这是 memory 反复标注的"未真机端到端验收"的真正前沿。
用**仅依赖 Node 内建**(`node:crypto` 做 P-256/ES256/SHA-256、`node:http`)的自包含负载客户端,在宿主机 node v25 上跑,打 `127.0.0.1:8081/v1/events` 真实 HTTP:
1. 生成 P-256 DPoP 密钥 + RFC7638 jkt;
2. 向 task-context-service 签发 TCT(需先播种 employee=jackliu + task-config 已有 assignee acme/web#482);
3. 每请求造 DPoP proof(htu=http://127.0.0.1:8081/v1/events, ath=sha256(token));
4. POST 事件,ingestion 走真 SEC-1 验签(HTTP 委托 task-context /verify)。

这条路会真实考验:SEC-1 每请求验签开销、DPoP 重放缓存增长、真 PG I/O、审计哈希链全局锁吞吐天花板、worker 排空、16GB 硬件极限。

## 发现(实时追加)

<!-- findings appended below as they surface -->


### F-0 SEC-1 全链在真机 HTTP 上跑通(基线确认,非缺陷)

自包含 Node 客户端(仅 node:crypto/http)完成真实 SEC-1 握手:P-256 → 签发 TCT(真 assignee 授权 + risk catalog)→ 每请求 DPoP proof → POST 8081 → ingestion 经 HTTP 委托 task-context /verify → 202。5 事件全 202,DB 落 5 event + 6 outbox(5 EVENT + 1 SESSION_COMPILE),workers 2s 轮询排空:6 workflow_run completed(5 session_ingestion + 1 knowledge_compile)、audit 哈希链 6 行。**这是 memory 反复标注"未真机端到端验收"的首次真机打通。**

### F-1 [HIGH] 部署栈无 session 供给路径 —— 真实客户端无法自助采集

`event.session_id` 是 `NOT NULL` 且 FK → `session.session_id`。但**已部署系统里没有任何 HTTP 端点或 worker 会创建 session 行**:
- ingestion `/v1/events` 只 INSERT `event`,从不 upsert `session`;
- session-ingestion worker 是 event 落库的**下游**(消费 outbox),更不会前置建 session;
- provider 会发 `session.started` 事件类型,但它也只是又一条 event,同样撞 FK。

后果:真实客户端为一个**新** session POST 事件时,event 的 FK 必然失败。冒烟能过,只因我用 `psql` 手工 `INSERT session`。sandbox/e2e 测试也都是直接 seed session 行来绕过——所以这个缺口从没在测试里暴露。**这是真机运营的硬缺口**,不是测试瑕疵。待验证 FK 违约时 ingestion 的响应码(预计 500 internal_error,即错误未被优雅处理)。


### F-1 已确认:无 session 直接 POST → HTTP 500 internal_error

负测:签发 TCT 后为一个未 seed 的 session POST 事件 → `HTTP 500 {"error":"internal_error"}`,DB 零落行。即 FK 违约(`event.session_id → session`)被 ingestion 的通用 `setErrorHandler` 兜成不透明 500。两层问题:(1) 架构层无 session 供给路径(见上);(2) 健壮性层:客户端可预期的输入错误(未知/竞态 session)返回 5xx 而非 4xx,污染错误率/告警、且不给客户端可行动反馈。

### F-2 [HIGH] 排空吞吐(~50/s)被 POLL_MS 卡死,与写入(1386/s)差 27×

**写入实测(真机 HTTP + 每请求 SEC-1 验签):10136 事件 7.3s = 1386/s**,p50=31ms p95=58ms p99=75ms,全 202 零错。远超预期(memory 记 sandbox app.inject ~2900/s,真机 HTTP+验签仍有 1386/s,SEC-1 开销可接受)。
**但排空只有 ~50/s**:实测 12s 内 dispatched +600 = 50/s。根因:worker daemon `KEEP_WORKER_POLL_MS=2000` + 每 tick batch=100 = 100 事件/2s = **50/s 硬顶**。且实测每 tick 处理时间 << 2s(6 tick/12s,周期被 2s sleep 主导)→ **瓶颈是轮询间隔而非审计锁**(至少在此量级)。
后果:ingest 1386/s vs drain 50/s → outbox backlog 无界膨胀;1M 事件光排空要 ~5.5 小时。这是真实产线隐患:低量默认值 2000ms 在真实写入速率下彻底跟不上。
**拟修**:降 POLL_MS(或做自适应轮询:有积压时不 sleep)。先用 compose override 把两个 worker 的 POLL_MS 降到 100ms 验证提速。

### F-3 [MED] 迁移测试跑在**部署真库**上会瞬时打断在线 worker(已在本机确认)

session-ingestion 与 knowledge-compiler 两 worker 各有 ~103/102 条 `relation "outbox" does not exist`(42P01),**时间戳 08:57–09:00**(部署后约 70 分钟,非我的压测)。migrate 容器 07:47 exit 0、worker 07:47 之后才启——启动顺序正常。唯一能让 `outbox` 在运行 70 分钟后"暂时不存在"的是**有人对 live `keep` 库跑了 Alembic 迁移测试(downgrade/upgrade 循环短暂 DROP 表)**,正是 `china-deployment`(KEEP 项目级文档,未入本 vault) 记录的已知风险("测试打部署真库…生产化后要挑时间窗或换独立 PG")。本次真机复现了该风险的实际后果:在线 worker 报错 3.4 分钟。**结论:迁移/降级测试必须换独立库,绝不打 live 部署库。** 我的压测未产生任何新错(近 5 分钟 0 条)。


### F-4 [HIGH · 最严重] 部署的 knowledge-compiler 未接 raw-archive store → 知识蒸馏静默全废

10k 压测(含 125 个 evidence-complete 会话)后:**incident=125,但 changeset=0、knowledge_object=0**,而 626 个 knowledge_compile workflow_run **全 completed、零报错**。健康检查全绿,却一条知识都没产出。

根因(两层,双确认):
1. **代码**:`workers/knowledge-compiler/src/daemon.ts` 调 `tick(sql, { vault })`——**只传 vault,不传 store**。runner.ts:190 `if (deps.store && r.payload_ref)` 因 `deps.store===undefined` 整块跳过,每个 event 的 `payload` 恒为 `null`。
2. **部署**:compose 里 `worker-knowledge-compiler` 只挂 `canonical-vault`,**不挂 `raw-archive` 卷、无 `RAW_ARCHIVE_DIR`**;raw payload 只有 ingestion 那个卷有。

后果:编译器读不到 raw payload → 拿不到 evidence 的 subject/text/resolution → 无法形成 resolved Error 簇 → 只落 Incident,永不蒸馏 Error 知识。**M2→M3→M4 的核心价值链在部署拓扑里是死的**,且被 "workflow completed / 全 healthy" 完全掩盖。sandbox 之所以从没暴露:它 in-process 共享同一个 store,compiler 天然读得到。**这是真机拓扑独有的接线缺陷。**

拟修:①daemon.ts 从 `RAW_ARCHIVE_DIR` 构一个只读(含 root 包容校验)ObjectStore 传进 `tick(sql,{vault,store})`;②compose 给 compiler 挂 `raw-archive:/data/raw-archive:ro` + `RAW_ARCHIVE_DIR`。修完重建镜像 + 真机复验:evidence 负载应产出 changeset/knowledge。


### F-5 [HIGH/CRIT] session-ingestion worker 同病:未接 store → 二道防线 DLP + raw-archive 完整性校验静默失效

同 F-4 的根因,另一 worker:`workers/session-ingestion/src/daemon.ts` 也是 `tick(sql, {})` 不传 store,且 compose 同样不给它挂 raw-archive。后果(steps.ts):
- `dlp` 步(:71 `if (deps.store && …)`):**二道防线 strict 复核**——重新扫描已落盘 payload、拦截采集时 DLP 漏网的密钥——被跳过(降级为放行)。
- `raw_archive` 步(:93):**content_hash 完整性校验**(核对落盘文件哈希)——被跳过(放行)。

memory 记载曾有一轮审计把"session-ingestion 二道防线 DLP 死代码"定为 **CRITICAL 并在代码里修复**;如今**部署层不接 store,等于把这条二道防线在生产里又关掉了**——只是这次死在拓扑接线而非代码。sandbox in-process 共享 store,故从没暴露。

**统一修复**(F-4+F-5 同源):两个 worker 的 daemon 都从 `RAW_ARCHIVE_DIR` 构只读(root 包容校验)ObjectStore 传入 tick;compose 给两个 worker 都挂 `raw-archive:/data/raw-archive:ro` + `RAW_ARCHIVE_DIR`。session-ingestion 只读校验用 ro 挂载即可。


---


### F-1 修复(代码完成 + 本机验证;部署待 1M 写入阶段结束)

- `apps/ingestion-mcp/src/server.ts`:在写 event 的同一事务里,先用**已与令牌逐字段核验一致**的身份 `INSERT session … ON CONFLICT (session_id) DO NOTHING`——真实客户端首个事件即自供给 session,`event.session_id` 的 NOT NULL FK 恒满足。
- 同时把事务外层包 try/catch:PG FK 违约(23503,如 employee 未开户)归为 `422 unknown_reference`,不再逐字兜成不透明 500。
- 本机:tsc 净、ingestion 39 测试全过、full TS 483 全绿、lint 净。**部署方式**:改的是 ingestion 容器,1M 正在打它 → 必须等写入阶段结束再 rebuild+redeploy,再真机复验(全新 session 直接 POST → 202 且落 session 行;employee 缺失 → 422)。

### F-3 修复(代码完成 + 本机三向验证;纯测试套件守卫,无需重部署)

- 新增 `python/tests/conftest.py`:`pytest_collection_modifyitems` 在**收集期**(任何 fixture 连库前)对模块名含 `migration` 的用例判定目标库是否可安全清场,不安全就 skip。放行条件:override env `KEEP_ALLOW_DESTRUCTIVE_MIGRATION_TEST=1` / dbname 含 test·stress·ci·scratch / 指向 dev PG(127.0.0.1:5433)。部署库(容器 postgres:5432、宿主 5434)三者皆不满足 → skip,**结构性杜绝迁移测试误清 live 库**(F-3 复现的根因)。
- 本机三向验证:(A)dev 5433 → 8 tests **run**(基线不破);(B)伪部署 URL 5434 → 8 **skipped**(干净跳过、根本不连库);(C)override → 8 **run**(逃生舱有效)。full Py 116 全绿。


### 1M 写入完成 + F-1 真机复验通过

**1M 写入:posted=1,001,753,in 1775.3s = 564/s,100% 202,零 400/401/403/500/503**;延迟 p50=49ms p95=81ms p99=99ms max=250ms。真机 HTTP + 每请求 SEC-1 验签 + 并发 worker 排空下,百万级写入零失败。

**F-1 已修 + 真机复验**:重建并重部署 ingestion 后,`probe-noseed`(为未预建的 session 直接 POST 事件)→ **HTTP 202** `{"accepted":1,"deduped":0}`,事件成功落库(event.session_id 的 FK 满足即证 session 已自供给)。修复前同操作是 **500**。(probe 脚本里"expect 0 = rejected"是旧行为的提示文案,现已作废:新正确行为=202 + 自动建 session。)


### 排空阶段观察(写入完成后)

- **compile 通道已排空**:session_compile pending=0,knowledge_compile 全 61151 run completed。**knowledge=1250 是正确去重**——负载生成器 10 个 epoch 复用同一批 1250 个 error signature(`e2e_0..e2e_1249`),编译器按 canonicalizeSignature+normalizedContentHash 正确 MERGE_EVIDENCE 合并为 1250 个唯一知识对象(正是"407× 重复爆炸"防线在起作用)。chunks=7500=6×1250,**F-6 在 1M 规模正确**。
- **F-6 无 churn bug**:compile burst 期间编译器每 ~5-8s 做一次 bounded-lag reconcile(`~100 updated`=MERGE_EVIDENCE 更新知识 markdown→chunk 合法更新);compile 一结束(non-terminal runs=0)编译器即**转静默**(近 60s 0 次 reconcile)。设计如预期。
- **event 通道仍在排空**:~678k pending @ ~220/s(audit 哈希链全局锁 = 架构天花板,memory 明确"动哈希链=安全敏感,需负责人确认,本轮不动")。较 20k 时的 320/s 略慢:audit 表增长 + **F-5 二道防线现在真的会读盘复扫 ~2% 带 raw 的事件**(安全换速度,正确)。ETA ~50min 至 pending=0,随后跑 final-check 全量不变式。


---


### F-7 修复 + 真机复验(SEC 矩阵升到 18/18)

- 源码:`apps/task-context-service/src/server.ts` 给 `/revoke` 加鉴权门——`revokeAdminToken`(缺省取 env `KEEP_TASK_ADMIN_TOKEN`),`sha256+timingSafeEqual` 常量时间比较,**fail-closed**(未配置或不符 → 401,不做撤销)。index.ts 自动经 env 注入;新增负测(无 auth→401 且不撤销、错令牌→401)。本机 **484 TS 全绿**、typecheck/lint 净。
- compose:task-context 加 `KEEP_TASK_ADMIN_TOKEN`(fail-closed 占位),.env 生成随机 24B token,rebuild+recreate task-context。
- 真机复验(matrix **18/18**):revoke 无 auth→**401**(修前 200)、错令牌→401、正确管理员令牌→200、撤销后令牌→401;其余 15 项安全保证回归全绿;event=0/knowledge=0 无泄漏。

**本轮总结:SEC-1/SEC-2 对抗矩阵在真机部署上 18/18 全过,并顺带发现+修复+复验 F-7(revoke 无鉴权)。** KEEP 从"功能可用"进一步证到"攻击可拒"。


---


---


---

## 真实员工 session 端到端(第五轮:非合成,模拟真实编码场景)

模拟员工 jackliu 造 3 段**真实**编码 session(后端支付幂等 / Cocos 预制体 uuid / 集成测试并发,报错→修复),POST 进部署真实管线走完全程。

**全流程跑通**:采集(21 事件全 202,**session 自供给** = F-1 修复起效,未手工建 session)→ 编译/抽取(3 incident→3 knowledge)→ SEC-3 门 → vault 提交(3 changeset)→ 切片(18 chunk)→ 检索(3 自然语言查询 **3/3 命中**,capsule 带最小披露 + `<<<UNTRUSTED_RETRIEVED_CONTEXT>>>` 注入围栏)。**顺带端到端复验了本 session 所有修复**:F-1/F-4/F-5/F-6 + SEC-1 全程。

**中途关键发现 —— SEC-3 evidence gating 正确工作**:第一次**不走 AI 网关**(只发 session 事件、无 `ai_request` 证据)→ 知识全卡在 `candidate` 不转 active。因为 SEC-3 要求"可信区证据"(gateway_log/ci_result,员工不可伪造),光凭员工自己 session 的 `test.completed` 不够。补上网关 `ai_request` 证据后立刻放行到 active。**这是安全模型(Evidence-over-Assertion)正确把关,非缺陷。**

**知识蒸馏是"薄的" signature→fix 模型(产品定位刻画)**:vault canonical markdown 6 节里**只有 2 节是真内容**——`## Symptoms`=真实报错(canonicalizeSignature 后的签名)、`## Resolution`=真实修复方案;其余 4 节全模板(`## Root Cause`=占位符 "Derived deterministically…(no LLM inference)"、Trigger/Verification/Prevention 是套 subject/签名的模板)。这是 **DG-01"不抄原文"安全铁律 + 无 LLM 根因推断**的必然结果。**结论:KEEP 本质是"报错签名 → 修复方案"的精准召回系统(agent 再撞同错即得当初修法),不是富文档知识库;不会复现 Obsidian 那种根因分析/表格/推理深度。安全+确定性 换 丰富度。**

**纠正前一轮 Obsidian 切片实验的取巧**:那个实验**绕过了编译器**、直接把原文写进 vault 再切片,测的是"切片器是不是通用文档索引器"(不是),但那**不是真实入口路径**。真实路径下内容先经编译器规范化成 canonical 6 节,切片/检索都正常(本轮 3/3 已证)。KEEP 没有"文档摄入"入口,只有"事件蒸馏"——想纳入手写 KI 需另建一条文档规范化摄入路径。

**测后**:DB 已清零(0 event),sim 客户端已删。

## 运维遏制:SEC-0 出口 + Kill Switch 实拉演练(真机)

**Kill-Switch 演练(5 个有强制点的 scope 全过):**
| scope | 强制点 | engage→ | release→ |
|---|---|---|---|
| KILL_CAPTURE | ingestion /v1/events(kill 在 zod/creds 前) | **503** | 恢复 400 ✅ |
| KILL_KNOWLEDGE_RETRIEVAL | retrieval /v1/tools/:tool [0](auth 前) | **503** | 恢复 ✅ |
| KILL_MCP_TOOL | 同上(工具面总闸) | **503** | 恢复 ✅ |
| KILL_EXTERNAL_AI | gateway /v1/messages(SEC-1 前) | **503** | 恢复 401 ✅ |
| KILL_AUTO_PUBLISH | compiler route_status(代码已验,本轮未跑 compile 循环live验) | (代码) | — |
- 2s TTL 缓存语义正确(engage/release 后 ~2.5s 生效)。**未接强制点的 2 个 scope**:KILL_EMPLOYEE_WORKSPACE / KILL_PROJECT_ACCESS——engage 后子系统无反应(employee-workspace / project-access 子系统在试点未建),**属已知空挡**(engage 即返回,无 UI/侧信道误导即可;建议治理 UI 对无强制点 scope 标注"未接线")。演练后 0 个未释放 kill 行。

### F-8 [MED] 部署上 SEC-0 出口 allowlist 层未生效;knowledge-net 后端可任意出网

真机 TCP 出网探针(→ 1.1.1.1 被 GFW 干扰,故改用域内 host 消歧):
- **内网隔离成立**:governance-net(workers)/development-net(员工)= `internal:true` → 连 registry.npmmirror.com/baidu 均 **ENETUNREACH / EAI_AGAIN**(无路由、DNS 也不通)。核心"员工/worker 容器不能直接出网"**真机成立**。
- **knowledge-net 后端开放出网**:ingestion-mcp 直达 npmmirror **REACHABLE**、baidu REACHABLE、DNS 正常。因 knowledge-net 是普通 bridge(非 internal)。
- **SEC-0 出口 allowlist 层未部署**:egress-proxy(squid)/litellm/employee-sim **均未运行**(profile 门控);nftables VM 级规则是 Linux-VM 专属,**未在 Mac Mini(Docker Desktop)施加**。

后果:knowledge-net 上的后端服务(ingestion/retrieval/task-context/gateway/pg/otel)**可直连任意外网**——正常运行不出网,但一旦某后端被供应链/依赖攻陷即可无约束外泄。**符合 `keep-project`(KEEP 项目级文档,未入本 vault) 既定"SE守护/nftables 推到正式 Linux 服务器、试点软件降级"的取舍**,本次真机坐实。缓解不属简单代码修复:①试点若要收紧→激活 egress-proxy profile + 宿主/VM 防火墙约束 knowledge-net(注意别掐断 Mini 自身构建用的 npmmirror 出网);②正式 Linux 机必须启 nftables+egress-proxy(SEC-0 原设计);③或**显式接受并文档化**试点降级出口姿态(内网隔离仍护住 worker/员工侧)。

## 韧性 / 混沌测试(真机部署,SIGKILL 级故障注入)—— 全过,零发现

**Test A:session-ingestion worker SIGKILL ×3 mid-drain**(非优雅重启,是硬杀)。写 20,507 事件,排空途中 SIGKILL+start 三次(pending 在两次杀之间可见下降 20057→16257→13007=证明确实在循环重启)。全排空后:**events=20507 == si_done=20507**(精确守恒,每事件恰 1 completed run),dead=0 / pend=0 / dup_event=0 / dup_run=0,**audit 断链=0**。→ durable outbox + workflow_run 状态机 + 幂等(input_hash/step idempotency)在硬崩溃下真的做到「至少一次投递 + 幂等 = 有效一次」。

**Test B:Postgres SIGKILL mid-drain(强制 WAL 崩溃恢复),叠加在既有数据上**。已有 20507 事件,再写 20627,排空 4s 后 SIGKILL postgres → **~4s WAL 崩溃恢复回来**,workers 自动重连(全程仅 **1** 次 tick 报错,被 daemon try/catch 兜住、下一 tick 重连续跑)。全排空后:**events=41134 == si_done=41134**(跨两测 + 一次 DB 硬崩溃仍精确守恒),dead=0 / pend=0 / dup=0,**audit 断链=0(哈希链扛过 PG 硬崩溃、零缺口零重复)**。→ 事务原子性 + PG WAL 持久性 = 无部分/丢失数据;append-only 审计哈希链(advisory lock + chain_seq + prev_hash)崩溃一致。

**结论:crash-recovery / durability 三大保证(有效一次、无丢失、审计链崩溃一致)在真机 SIGKILL 级故障下全部成立。本轮零发现——韧性是实的,不是纸面声明。**

## SEC-1/SEC-2 对抗矩阵(真机部署,负责人指定的下一测试)

**15/15 全 PASS —— 安全保证在部署上真的会拒绝:**

| 层 | 用例 | 结果 |
|---|---|---|
| SEC-1 ingestion | 无凭证 / 伪造(攻击者签)/ 篡改 payload / 缺 DPoP / 错密钥 proof(pop_mismatch)/ 错 container | 全 **401** ✅ |
| SEC-1 交叉核对 | 信封身份≠已验证身份 | **403** identity_mismatch ✅ |
| SEC-1 撤销 | 撤销后使用令牌 | **401** ✅(撤销机制本身有效) |
| SEC-1 per-hop | ingestion 的 DPoP proof 重放去打 retrieval | **403** htu_mismatch ✅(证明 proof 真绑定目标) |
| SEC-2 retrieval | 无凭证 | **403** DENIED ✅ |
| SEC-2 无 oracle | 禁用工具 export_all / 未知工具 list_everything | 均 **404** 同形 ✅(不泄漏枚举侧信道) |
| SEC-2 重放 | 同一 DPoP proof 二次检索 | **403** ✅ |
| SEC-2 预算 | >60/60s 速率 | 59 ok → 403(限额生效)✅ |
| 泄漏断言 | 所有恶意请求后 | event=0 / knowledge=0 ✅(无恶意数据落库) |

### F-7 [MED] task-context `/revoke` 端点**完全无鉴权**

`POST /v1/task-context/:id/revoke` 无任何 auth 头即返回 **200** 并成功撤销。任何能触达 8083(内网绑定)且知道某 task_context_id 的调用方都能撤销它 —— 对合法用户在跑的会话做**撤销 DoS/骚扰**。缓解面:8083 只绑 127.0.0.1(非外发)、tctxId 是高熵 ULID(不可猜)。但撤销是安全敏感的**变更**操作,必须鉴权。修法建议:revoke 需管理员令牌(sha256+timingSafeEqual 常量时间比较,fail-closed:未配置 env → 一律拒),对齐"撤销=治理动作"。**注**:撤销机制本身正确(撤销后令牌确被拒 401),漏洞仅在端点的授权缺失。

## 修复与复验(重建 worker 镜像 + 重置 keep 库后)

**修法(源码 + compose,本机 483 TS 全绿 / typecheck / lint 净后重建镜像上真机):**
- F-4/F-5:新增 `workers/session-ingestion/src/object-store.ts`(只读、root 包容校验的 `ReadonlyFsObjectStore` + `makeRawArchiveStore()`,经 index.ts 导出);两个 worker 的 daemon 从 `RAW_ARCHIVE_DIR` 构 store 传入 `tick`;compose 给两个 worker 挂 `raw-archive:/data/raw-archive:ro` + 该 env。
- F-2:两个 daemon 改自适应轮询——`tick` 返回活动量,有活干退避 `KEEP_WORKER_BUSY_MS`(默认 25ms),空闲才 `POLL_MS`。
- F-6:compiler daemon 在一波排空落幕(idle)或到 `KEEP_INDEX_LAG_MS`(默认 5s)时**合并调一次 `buildChunkIndex`**(避免每 tick 全量 reconcile 的 O(N²))。

**真机复验(20,704 事件,含 250 evidence 会话):**
- **F-4/F-5 已修**:incident=250 → **changeset=250、knowledge_object=250(全 active)**。修复前同规模是 125/0/0。编译器现能读 raw payload 蒸馏知识。
- **F-2 已修**:排空 **50/s → ~320/s**(6.4×);现瓶颈转为 audit 哈希链全局 advisory lock(memory 记的 ~222/s 架构天花板,属"动哈希链=安全敏感大改需负责人确认",本轮不动)。1M 排空从 ~5.5h 降到 ~50min。
- 写入吞吐仍 1280–1386/s,全 202、零 4xx/5xx。

### F-6 [HIGH] 前向发布的知识从不建 chunk-index → retrieval 恒空

复验中发现:250 个 active 知识,**knowledge_chunk=0**。根因:`buildChunkIndex` 只在 `rollback.ts`(回滚时)和 e2e/单测里被显式调用;**compile 正向流程的 STEP_ORDER = [compile, vault_commit, route_status, trace_audit, ack] 没有 chunk-index 步**。`route_status` 把知识置 active、还记了 `index_build_ref`(该建索引的 vault_commit),但**没有任何东西消费它去真正建索引**。既无 reindex CLI 也无调度器。后果:所有正向蒸馏出的 active 知识**检索侧(读 knowledge_chunk)一条都查不到**——M3 检索对新知识全盲。e2e 测试"通过"是因为它手动补调了 buildChunkIndex,恰好把这个接线缺口盖住了。**已修**(见上 F-6 合并 reconcile)。

## 结论

**1M 真机压测收官 — 全量不变式在完整 1,000,000 规模下全绿,6 个真机缺陷全部修复并复验。**

排空完毕后 final-check(1,001,754 events = 1M + 1 个 F-1 复验事件):

| 不变式 | 结果 | 判定 |
|---|---|---|
| 守恒 outbox(event)== events | 1001754 == 1001754 | ✅ |
| session_compile == session.closed | 61151 == 61151 | ✅ |
| session_ingestion completed == events | 1001754 == 1001754 | ✅ |
| knowledge_compile completed == closed | 61151 == 61151 | ✅ |
| dead_letters | 0 | ✅ |
| outbox pending / 非终态 | 0 / 0 | ✅ 全排空 |
| UNIQUE(session,seq) 违例 | 0 | ✅ 幂等 |
| 知识 & chunk | 12230 incident / 12230 changeset committed / **1250 唯一 knowledge(去重)** / 7500 chunk = **6.00/知识** | ✅ F-6 规模正确 |
| audit 哈希链断链 | 0 | ✅ 完整性 |
| audit null entry_hash | 0 | ✅ |
| audit 总行 | 1,075,135(append-only 链完好) | ✅ |
| worker tick 报错(全程) | **0** | ✅ 我的压测零打断 worker |
| 客户端写入 | c202=1,001,753,其余状态全 0 | ✅ 100% 成功 |

**六个发现的最终状态(全部已修 + 复验):**
- F-1 session 自供给 + FK→422 —— 真机 probe-noseed → 202 ✅
- F-2 自适应轮询 —— 50→320/s(1M 稳态 ~220/s = audit 锁架构天花板)✅
- F-3 迁移测试守卫 —— dev 跑 / 部署库 skip / override 三向验证 ✅
- F-4 compiler 接 store —— 0→1250 知识 ✅
- F-5 session-ingestion 接 store —— 二道防线真读盘复扫,0 密钥落盘 / 212 redacted ✅
- F-6 chunk-index 合并 reconcile —— 6.00 chunk/知识,compile 结束即静默 ✅

改动全部在源码(本机 483 TS + 116 Py 全绿)+ 同步 Mini 交付副本 + rebuild/redeploy 两 worker & ingestion。诚实边界:①retrieval-mcp 端到端查询未打(chunk 已在,强证 F-6 但未走 retrieval 出参);②audit 全局锁天花板未动(安全敏感,需负责人确认);③知识风险等级 R2 却全 active(编译器风险自算 R0/R1,非 task risk,待与设计对齐);④部署库现存 1M 测试数据,待决定保留/清场。

**沉淀**:memory `mini-1m-realmachine-findings` + Error_Book `ERR-037`(部署拓扑接线缺口:核心功能静默失效 healthcheck 却全绿)。


### 补:Gap A 已闭合 —— retrieval-mcp 端到端真检索通过(F-6 彻底闭环)

播种 24 知识/144 chunk 后,自包含客户端对部署的 retrieval-mcp 真打 `POST /v1/tools/search_known_errors`(retrieval 版 SEC-1:aud=retrieval-mcp、htu 归一化到该端点):
- 无 scope 查询 → 200 但 capsules=0 —— 经诊断是 **scope 空 = default-deny 的正确策略行为**(非 F-6 缺陷:chunk 的 search_tsv 确实命中 tsquery、知识 active)。
- 带匹配 scope(product_family=unassigned)查询 → **200,capsules=5,watermark 签发,more=true**;每个 capsule 为最小披露形态(knowledge_id/capsule_profile/confidence/content/token_cost,无身份字段)。

**全链在部署拓扑下真通**:采集→编译→知识→chunk-index(F-6 修复)→SearchAdapter→SEC-1 门控 retrieval-mcp→Capsule+水印。同时顺带验证了 M3 检索栈(SEC-1/policy/scope 默认最窄/速率/虹吸预算/水印/最小披露)在真机部署下全部工作。**F-6 从"chunk 存在"升级为"检索真能返回知识"。**
