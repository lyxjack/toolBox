---
id: ERR-027
type: error
errorCode: "BHV-002"
severity: "medium"
status: resolved
recurrence: 0
firstSeen: 2026-05-17
tags:
  - error/medium
  - tool/node-test
  - workflow/ci-hook
  - errorCode/BHV-002
  - ki/error-book
prevention: "多个 integration test 共享同一 hook 文件时,必须用 --test-concurrency=1 串行跑,否则各自的 corrupt 反例(改/恢复同一 hook 或被测文件)会互撞"
related:
  - "[[PAT-006__swarm-3-phase-governance|PAT-006]]"
aliases:
  - ERR-027
ci_rules:
  - type: "code-pattern-require"
    pattern: "--test-concurrency=1"
    message: "Agent/tests/test_*_integration.mjs 同时跑 ≥ 2 个时必须加 --test-concurrency=1,否则各自的 corrupt 反例会互撞"
---

# Integration Test 并发互撞(corrupt 反例之间互相覆盖)

## 错误现象

`node --test Agent/tests/*.mjs` 不加 `--test-concurrency=1` 时,4 个 integration test 中**至少 1 个**断言失败,典型错信息:

```
expected: /Governance|P9/      (test_p9_p11_governance_integration I3)
actual: "Complexity Gate 测试拦截:..."  ← 撞到了 complexity_gate 的 corrupt
```

或反过来 — governance test 改坏 constitution.md 期间,complexity / obsidian / distill 的 hook 调用读到了被改坏的 constitution,触发 governance test 的 block,reason 串错。

## 根因分析

4 个 integration test 都用同样的"反例验证 corrupt"模式:
- test_complexity_gate_integration: 改坏 `test_complexity_gate.mjs` 一个 fixture
- test_p9_p11_governance_integration: 改坏 `Agent/rules/constitution.md` 的 § P9 标题
- test_obsidian_structure_integration: 改坏 `KI/Internal_KI/contract.md` 的 § 3.5 标题
- test_distill_integration: 改坏 `.claude/skills/distill/SKILL.md` 的 `name: distill`

每个 I3 都用 `withXxxCorrupted(() => { runHook(...); })` 同步 corrupt + restore。但当 Node test runner 并发跑 4 个文件时,**worker 1 在 corrupt 中尚未 restore**,**worker 2 已经跑 hook** → hook 先撞 worker 1 的 corrupt 触发 worker 1 的 block reason → worker 2 断言失败。

并发时序示意:
```
T0  W1 corrupt constitution
T1  W2 spawn hook for I3 (它想改坏 SKILL.md, 但 hook 串行先跑 governance test,撞 W1 的 constitution corrupt)
T2  W2 hook 返回 reason: "Governance 测试拦截..."
T3  W2 期望 reason 含 "Distill"  → FAIL
T4  W1 restore constitution
```

## 解决方案

**强制 `--test-concurrency=1`** 跑 integration test 套件,例如:

```bash
node --test --test-concurrency=1 Agent/tests/*.mjs
```

文档层 — 每个 integration test 文件**顶部 jsdoc 必须含并发警告**:

```js
/**
 * **并发陷阱**: 与其他 *_integration.mjs 一起跑时必须 --test-concurrency=1。
 * 各自 I3 反例会改写文件,并发时 hook 先碰到对方 corruption 触发对方 reason,断言失败。
 */
```

`test_complexity_gate_integration` / `test_p9_p11_governance_integration` / `test_obsidian_structure_integration` / `test_distill_integration` 都已加此警告。

## 预防规则

- Agent 在创建新的 integration test 文件(`test_*_integration.mjs`)时,文件顶部必须含 `--test-concurrency=1` 警告
- 跑 integration 套件命令必须含 `--test-concurrency=1` flag
- 单元测试(`test_*_structure.mjs`)无此约束,可并发(它们只读不改文件)

## 关联

- [[PAT-006__swarm-3-phase-governance|PAT-006]] — swarm 3-phase pattern 的 Phase 3 (Serial integration test) 设计源于此 ERR
- [[2026-05-17_REQ-20260517-043739_p2-distill|EXEC P2]] — 第一次新增第 4 个 integration test 时实际命中过此陷阱,通过 --test-concurrency=1 解决
