---
id: ERR-037
type: error
errorCode: "DEP-001"
severity: "high"
status: "resolved"
recurrence: 0
firstSeen: "2026-07-06"
tags:
  - "error/high"
  - "tool/docker-compose"
  - "domain/deployment"
  - "errorCode/DEP-001"
  - "ki/error-book"
prevention: "部署拓扑的接线缺口(未挂卷 / 未注入依赖 / 未接后续步)会让核心功能静默失效,而 healthcheck 与 workflow『completed』全绿——单测/e2e 若在 in-process 注入依赖或手动补调后续步,会正好盖住这类缺口。铁律:凡『worker/服务运行期需要某挂载卷或注入依赖(store/index/后续 pipeline 步)』,必须有一条端到端断言证明**部署形态下**该功能真产出(如 compile→chunk→retrieval 真通、二道防线真读盘复扫);daemon 装配处打印依赖开关状态(store=on/OFF)便于一眼核实;绝不以『测试绿 + healthcheck 绿』当作部署功能正常的证据。"
aliases:
  - "ERR-037"
mem_ref: "mini-1m-realmachine-findings"
mem_status: "linked"
---

# 部署拓扑接线缺口:核心功能静默失效,healthcheck 却全绿

## 错误现象

2026-07-06 对 Mac Mini 上*已部署容器栈*首次跑 1M 采集压测,一次性暴露 3 个同源缺陷(F-4/F-5/F-6),全被"绿色健康信号"掩盖:

1. **F-4**:knowledge-compiler 部署容器未挂 `raw-archive` 卷、daemon 只把 `{vault}` 传进 tick → `deps.store` 恒 `undefined` → 读不到 raw payload → 蒸馏**零知识**(125 incident / 0 changeset / 0 knowledge),而 626 个 workflow_run **全 completed**、所有 healthcheck **全 healthy**。
2. **F-5**:session-ingestion 同样不接 store → 二道防线 DLP 复扫 + raw-archive `content_hash` 完整性校验**静默降级为放行**(代码里是设计好的 graceful degrade,部署层永不给 store = 这条安全线在生产里恒关)。
3. **F-6**:`buildChunkIndex` 只在 rollback 与测试里被显式调用,正向 compile 的 STEP_ORDER 无 chunk 步 → 发布的 active 知识**从不建索引** → retrieval 读 `knowledge_chunk` 恒空、新知识全查不到。

## 根因分析

1. **sandbox / 单测 in-process 共享依赖**:压测 harness 与 e2e 在同进程里把 store 直接注入、或手动补调 `buildChunkIndex`,于是"依赖恒可用""索引已建"是测试环境的假象——**部署形态(独立容器 + 卷挂载 + 依赖注入接线)从没被断言过**。
2. **健康信号与功能正确性脱耦**:healthcheck 只证进程活着、workflow『completed』只证状态机跑完,都**不证核心业务产出**。缺口落在"跑完了但什么也没产出"的盲区。
3. **可选依赖的降级语义**:store 是可选参数(缺省则降级),部署层忘了提供 → 降级路径成了永久路径,且不报错。

## 解决方案

- **接线单一事实源**:新增只读、含 root 包容校验的 `ReadonlyFsObjectStore` + `makeRawArchiveStore()`,两 worker daemon 共用;从 `RAW_ARCHIVE_DIR` 构 store 传入 tick;compose 给两 worker 都挂 `raw-archive:/data/raw-archive:ro` + 该 env。
- **正向补索引**:compiler daemon 在排空落幕(idle)或到 lag 上限时**合并**调一次 `buildChunkIndex`(避免每 tick 全量 reconcile 的 O(N²))。
- **装配可观测**:daemon 启动打印 `store=on/OFF`,一眼核实接线。
- 真机复验:知识 0→250、chunk 0→1500(6×)、二道防线 0 密钥落盘 / 212 redacted。

## 预防规则

1. 凡"运行期需要某挂载卷 / 注入依赖 / 后续 pipeline 步"的功能,必须有一条**部署形态**下的端到端断言证明它真产出(compile→chunk→retrieval 真通、DLP 真读盘复扫),而非在测试里 in-process 注入或手动补调。
2. **healthcheck 绿 + workflow completed 绿 ≠ 功能正常**;核心产出要有独立的"非零产出"断言。
3. 可选依赖的降级路径要么在生产配置里被强制提供,要么在缺失时**显式告警**,绝不让降级悄悄变永久。
4. daemon/装配层打印关键依赖开关状态,便于运维一眼核实。

## 关联

- 本次 1M 真机压测的完整发现与修复(F-1..F-6)：Obsidian `Internal_KI/runs/2026-07-06_mini-1m-ingestion.md`（runs/ 不在 wiki-link 审计域，用路径引用）
- [[ERR-025__server-save-fails-schema-field-out-of-sync|ERR-025]] — 同属"部署/契约面与代码面不一致"的一类
- 运行日志:Obsidian `Internal_KI/runs/2026-07-06_mini-1m-ingestion.md`
