---
id: PAT-006
type: pattern
title: "Swarm 3-Phase Governance REQ"
status: active
created: 2026-05-17
trigger_condition: "user_explicit"
tags:
  - pattern/swarm
  - pattern/governance
  - workflow/major-req
  - ki/pattern
complements:
  - "[[2026-05-17_REQ-20260517-043739_p2-distill|EXEC-2026-05-17-p2-distill]]"
  - "[[2026-05-17-karpathy-elevation-to-principle|DEC-Karpathy-Elevation]]"
related:
  - Internal_KI/execution_logs/2026-05-17_REQ-20260517-043739_p2-distill.md
  - Internal_KI/decisions/2026-05-17-karpathy-elevation-to-principle.md
aliases:
  - PAT-006
  - swarm-3-phase
---

# Swarm 3-Phase Governance REQ

## 适用场景

major-complexity 治理类 REQ(改 5+ 文件,跨 skill/workflow/hook/test 多类工件),且任务间**只存在写后读依赖,无文件重叠**。典型例子:

- 新增 Constitution Principle + 多 workflow 挂载 + 模板 + 测试 *(注:REQ-20260517-032402 P9/P10/P11 实际走的是 hybrid 模式 G1 Serial + G2 Parallel + G3/4 Serial,与本 pattern 的 G1 Parallel + G2 Parallel + G3 Serial 有差异,但抽象层"先内容后验证后集成"是相同的)*
- 新增 skill 命令 + 工作流文档 + hook 串入 + 单元/集成测试 *(REQ-20260517-043739 P2 /distill — **本 pattern 的诞生案例**,严格的 swarm 3-phase 实现)*
- KI 分层目录骨架 + 模板 + contract + 上层引用 *(P0 plan-driven Obsidian 7 大类,**本 pattern 的第一次实战**)*

**模式光谱**(实际项目应根据依赖图位置选择):

```
纯 Serial  ←─────────────────────────────────────→  纯 Parallel
   ↑                                                       ↑
   核心架构变更                                     文档/审计/独立索引
   强写后读依赖                                     0 数据依赖
   单文件深改                                       多文件独立改

   Hybrid (G1 Ser → G2 Par → G3+ Ser)
        ↑
        REQ-032402 P9/P10/P11(强依赖前置常量,后续才能 fan-out)

   Swarm 3-Phase (G1 Par → G2 Par → G3 Ser)  ← 本 pattern
        ↑
        P2 /distill / P0 Obsidian(内容独立,验证依赖输出,集成 atomic)
```

**不适用**:有真实文件冲突(多 worker 改同一文件)、需多方案探索对比(用蜂群 evaluator-optimizer)、纯单文件改动(直接做)。

## 步骤(3 phase × 5 worker)

```
Phase 1 (Swarm Parallel, 2 worker)
  Worker A: 内容文件 1(独立)
  Worker B: 内容文件 2(独立)
  ── 0 文件重叠,真并行 ──

Phase 2 (Swarm Parallel, 2 worker, depends G1)
  Worker C: 上层引用/挂接点(读 G1 输出路径)
  Worker D: 静态结构测试(grep G1 输出)
  ── 0 文件重叠,但都依赖 G1 done ──

Phase 3 (Serial, 1 worker, depends G2)
  Worker E: 集成测试(spawnSync 调改后的 hook)
  ── 必须等 G2 hook 改完才能验证链路 ──
```

## 关键设计

1. **Group 内 0 文件重叠** — Phase 1/2 内 worker 互不写同一文件;Phase 3 单 worker。
2. **Group 间写后读** — Phase 2 worker 读 Phase 1 写完的 path 字符串(常量) + grep 文件内容;Phase 3 spawnSync 跑改后的 hook。
3. **蜂群自主区** — 每 worker prompt 显式划"自主区"(措辞 / 章节分块 / describe 拆分),不死板按图施工。
4. **元一致性检查** — 引入新规则的 REQ,自身工件就必须遵守新规则(见 [[2026-05-17-karpathy-elevation-to-principle|DEC-Karpathy-Elevation]] 的 P9/P10/P11 引入教训)。

## 反模式

| 错误做法 | 正确做法 | 关联 |
|---|---|---|
| Phase 内多 worker 改同一文件 → 冲突 | 切分到不同文件,真 0 重叠 | [[ERR-027__integration-test-concurrency-collision|ERR-027]] |
| 用 swarm 跑只有 1 个 task 的工作 | 单 task 直接做,swarm 是 overhead | — |
| 蜂群 worker prompt 不给"自主区"边界 | 显式划自主区 + 强制 schema(frontmatter / 关键字 / 字数) | — |
| Phase 3 用 swarm parallel | Phase 3 是依赖累加的终态测试,必须 serial | — |

## 验证(本 pattern 的元应用)

REQ-20260517-043739 (P2 /distill) 全程套用本 pattern:
- 5 worker / 3 phase / 0 文件重叠
- 蜂群产出 684 行(40+261+28+178+177)
- 全套 8 测试 160/160 PASS,无 amend / REWORK
- 见 [[2026-05-17_REQ-20260517-043739_p2-distill|EXEC P2]] 完整闭环

## 关联

- [[2026-05-17_REQ-20260517-043739_p2-distill|EXEC P2 /distill 闭环]] — 本 pattern 的诞生案例
- [[2026-05-17-karpathy-elevation-to-principle|DEC Karpathy 提升]] — P9/P10/P11 引入,本 pattern 隐含遵守 P10 Simplicity + P11 Surgical Scope
- [[PAT-005__async-error-handling|PAT-005]] — 同样是 workflow/methodology pattern
