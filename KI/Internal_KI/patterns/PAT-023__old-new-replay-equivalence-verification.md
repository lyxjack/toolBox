---
id: PAT-023
type: pattern
title: "行为零变化改造的新旧回放等价验证法（固定seed / 自一致对照 / 时序冻结 / 单变量二分）"
status: active
created: "2026-07-11"
trigger_condition: user_explicit
tags:
  - ki/internal
  - pattern
  - trigger/user_explicit
  - pattern/verification
  - language/python
related:
  - "Error_Book/entries/ERR-048__cache-fingerprint-order-and-alias-identity.md"
  - "Internal_KI/patterns/PAT-019__soft-scoring-select-only-with-intuition-calibration.md"
  - "Internal_KI/patterns/PAT-008__mongo-duplicate-key-driven-idempotency.md"
mem_ref: cbdc9a4e-5ecf-4249-b3c1-4751fd1f432b
mem_status: linked
aliases:
  - "PAT-023"
  - "replay-equivalence"
---

# 新旧回放等价验证法

## 适用场景

对生产系统做"业务行为零变化"的性能/结构优化后，需要证明新旧代码行为等价；系统有真实流量日志可回放（HTTP 请求日志、消息日志）。首战案例：gunzi_pro service/processor 解堵塞优化（8 房间 855 条响应逐位对齐）。

## 步骤

1. **同源双跑**：同一份线上日志分别喂给旧代码（备份副本）与新代码，逐条 diff 响应序列。**禁止**拿回放直接对生产日志——回放压缩时间轴，任何版本都与生产有时序性差异。
2. **固定 `PYTHONHASHSEED`**：等价候选选择可能依赖 set/dict 迭代顺序（字符串哈希随进程种子变化）。不固定 seed，同代码不同进程都可能不同（本案例旧代码 seed 7/42 vs seed 1 自身即产生差异）。
3. **内部状态探针**：响应一致 ≠ 状态一致（如 openType=101 既表示"已处理"也表示"已丢弃"）。每步之后记录关键内部状态（当前回合位、动作序列长度）一起 diff，才能发现"响应相同但状态分叉"的隐形通道。
4. **自一致对照（判伪影的金标准）**：出现差异先跑"旧 vs 旧"两遍——同版本自身都翻转的差异点是环境非确定性（伪影），不是代码差异。
5. **时序冻结**：怀疑墙钟竞态（TTL、超时边界在压缩时间轴上踩线）时，把 TTL/timeout 冻结成极大值（**两侧同样施加**）再比。冻结后一致 → 伪影确认；仍分叉 → 真语义差异。
6. **单变量二分**：多项改动叠加时，在沙箱副本里逐个禁用（`sed` 打 BISECT 补丁），锁定引入差异的具体改动。注意随机 seed 会混淆二分结论——二分必须在固定 seed 下做。

## 反模式

- 只对比响应不探针内部状态（漏掉"同响应异状态"通道）
- 不固定 seed 就下"代码引入了差异"的结论（可能是哈希序伪影）
- 差异出现就改代码，不先做旧-vs-旧自一致对照（可能在修一个不存在的 bug）
- 把"文档里写明的时序行为"（轮询间隔、超时窗口）当成可自由优化的实现细节——它们是业务契约的一部分，改了就是行为变化（本案例 E4 因此回滚）

## 关联

- [[ERR-048__cache-fingerprint-order-and-alias-identity|ERR-048]] — 本方法抓出的典型缺陷
- [[PAT-019__soft-scoring-select-only-with-intuition-calibration|PAT-019]] — 同为"确定性可复算"原则的应用
- [[PAT-008__mongo-duplicate-key-driven-idempotency|PAT-008]] — 幂等三路径的测试思路同源
