---
id: PAT-025
type: pattern
title: "NotReady 泊车替代阻塞等待：把 cond.wait 轮询迁入 actor 而不复制谓词"
status: active
created: "2026-07-12"
trigger_condition: user_explicit
tags:
  - ki/internal
  - pattern
  - trigger/user_explicit
  - pattern/concurrency
  - language/python
related:
  - "Internal_KI/patterns/PAT-024__sandbox-proxy-transactionalization.md"
  - "Internal_KI/patterns/PAT-023__old-new-replay-equivalence-verification.md"
mem_ref: cbdc9a4e-5ecf-4249-b3c1-4751fd1f432b
mem_status: linked
aliases:
  - "PAT-025"
  - "notready-parking"
---

# NotReady 泊车替代阻塞等待

## 适用场景

遗留同步代码里散布 `cond.wait(timeout)` 轮询等待（前置条件未就绪时占住线程），要迁移到事件循环 actor 模型，但等待谓词逻辑复杂、复制易错。

## 核心手法：不复制谓词

给遗留函数传一个**替身 cond**，其 `wait()` 直接抛 `NotReadyError`：

```python
class ActorCond:
    def wait(self, timeout=None):
        raise NotReadyError()
```

actor 捕获 NotReady → 把请求泊车（req+future+deadline）→ 每处理完一条消息统一重评估泊车项：**从头重跑遗留函数**。谓词逻辑留在原地一行不动。

## 成立前提（必须逐个核实，不能假设）

**每个 wait 调用点都位于其分支的副作用之前**——从头重跑才与"原地续等"严格等价。gunzi_pro 案例中 4 个等待点逐一核实后才动手（整理报告 §14 精读）。若某个 wait 前已有写操作，该分支必须先重构或排除。

## 细节清单

- deadline 从首次泊车起算（对齐原 8 秒语义），loop 定时器兜底到期（防静默房间挂死 future）；
- 超时响应体与原路径逐字节一致；
- 重评估用 while-progress 循环（一项就绪的副作用可能满足另一项的前置）；
- 遗留异常路径对齐：原来异常向上抛 → actor 里 `future.set_exception(e)` 保持 HTTP 语义。

## 收益

等待不再占用任何线程（原实现每个 waiter 占一个请求线程最长 8 秒，是线程池饥饿放大链的源头——瓶颈报告 #3 的结构性解）。

## 关联

- [[PAT-024__sandbox-proxy-transactionalization|PAT-024]] — 同一场大修中的姊妹手法：都以"遗留代码零改动"为约束
- [[PAT-023__old-new-replay-equivalence-verification|PAT-023]] — 等价性验证方法
- 实现参考：gunzi_pro `service.py::ActorCond / _handle_init / _reeval_parked`（commit d012993）
