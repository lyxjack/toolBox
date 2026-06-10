---
id: "DATA-{NNN}"
type: data_analysis
data_source: "{log-files | db-table | metrics | stream | ...}"
analysis_type: "{cleanup | archive | rollup | dedup | gdpr-deletion | summary}"
status: "{active | sunset}"
created: "{YYYY-MM-DD}"
last_verified: "{YYYY-MM-DD}"
retention_days: "{N | null}"
tags:
  - data-analysis
  - pipeline
  - ki/internal
related: []  # wiki link 数组，可空；冷启动时允许 0 引用（加 bootstrap: true）
aliases:
  - "DATA-{NNN}"
mem_ref: "{content_session_id | null}"  # claude-mem 双向关联：产出本条的 session（sdk_sessions.content_session_id）；降级时 null
mem_status: "{linked | unavailable}"    # linked=写入时已验证存在；unavailable=claude-mem 不可用（降级，不阻塞）
---

# {数据分析/归档 pipeline 标题}

## 数据源 / Data Source
- 类型：{log-files | db-table | metrics | stream}
- 位置：{文件路径 / 表名 / topic 名}
- Schema 简要：
  ```
  field_a: {type}  -- {含义}
  field_b: {type}  -- {含义}
  ```
- 日增量：{约 N rows/day 或 N MB/day}

## 分析类型 / Pipeline
```
[源数据] → [清洗 clean] → [转换 transform] → [汇总 rollup] → [归档 archive]
              ↓               ↓                  ↓
           丢弃脏数据      字段映射           按天/月聚合
```
- 触发频率：{cron 表达式 / 实时}
- 执行入口：{脚本路径 / job 名}

## 清理规则 / Cleanup Rule
- 何时删除：{条件，如 created < now - 90d}
- 保留时长：{retention_days = N}
- 合规依据：{GDPR Art.17 | 公司数据保留政策 vX | 业务约定}
- 删除方式：{硬删 | 软删 | 加密销毁}

## 归档目标 / Archive Target
- 冷存储路径：{s3://bucket/path | gs://... | 本地路径}
- 文件格式：{parquet | jsonl.gz | csv.zst}
- 压缩比：{N:1 预期}
- 索引/分区策略：{按日期分区 / hive-style}

## 验证脚本 / Validation Query
```sql
-- 验证 pipeline 健康度：源-归档行数一致性
SELECT
  (SELECT count(*) FROM source_table WHERE dt = '{YYYY-MM-DD}') AS src_rows,
  (SELECT count(*) FROM archive_table WHERE dt = '{YYYY-MM-DD}') AS arc_rows;
```
- 预期：`src_rows == arc_rows`，偏差 > 0.1% 触发告警

## Cross-References
- [[DATA-{NNN}]] — 上游/下游 pipeline
- [[SEC-{NNN}]] — 涉及敏感字段的安全约束
- [[ERR-{NNN}__slug|ERR-{NNN}]] — 历史 pipeline 故障
