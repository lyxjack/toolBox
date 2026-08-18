---
id: run-2026-07-06-reasoning-flywheel-scale
type: run-log
status: passing
started: 2026-07-06
tags: [keep, reasoning-flywheel, scale-test, mini, mr1]
---

# KEEP 推理飞轮 规模化压测 — Mac Mini M4

> 独立于错题脊梁流(见 `2026-07-06_mini-1m-ingestion.md`)。
> 本流:采集 session → `SESSION_REASONING` outbox → reasoning-distill worker(蒸馏"人纠偏" delta)→ 结果闸 → Runtime Index → retrieval。恒 `ai_derived`,独立信任层/生命周期。mock GLM 打通管道。

## 环境快照
- Mini `kingdian@100.87.9.30`,Docker Compose(10 服务),`keep` 库 head=`mr1_reasoning`。
- distiller=mock(真智谱 GLM 待接入,DLP 脱敏为不可协商底线)。

## 发现(实时追加)

### RF-1 [HIGH · 规模瓶颈] 每会话一次 git commit,排空封顶 84/s + git tree O(N²) 膨胀
- **现象**(5000 会话首测):reasoning 排空仅 **84/s**,worker CPU **110%**,git vault **120MB / 2797 commits** 持续膨胀,pending 持续积压——摄取(240/s)远快于蒸馏,飞轮追不上。
- **根因**:reasoning canonical markdown 原设计落 **git vault(每会话一次 commit)**。git object/tree 随提交数二次增长,commit fork/spawn + fsync 成为 CPU 与吞吐瓶颈。
- **判断**:reasoning 是 `ai_derived`、低信任、**可从 event 重建**,不需要 git 溯源(git 溯源是错题脊梁 canonical-vault 的语义,不适用这里)。
- **修复(RF-1)**:markdown body 直接存 DB `reasoning_memory.body` 列,**彻底移除 git vault**。迁移 `mr1_reasoning` 用 `body sa.Text` 替换 `vault_path`;worker `runner/reasoning-index/daemon` 去 vault 依赖;compose 去 `reasoning-vault` 卷。
- **本机基线**:TS 506 全绿 / Py 迁移 8 全绿 / biome 干净。
- **真机复验(部署 body 版镜像 + downgrade→upgrade 重建 body 列)**:

  | 指标 | 旧版(git vault) | 新版(body 入库) |
  |---|---|---|
  | Drain 速率 | 84/s | **~275/s(3.3×)** |
  | Worker CPU | 110% | ~50%(空闲→0) |
  | 5000 会话排空 | 持续积压 | ~15s 无积压(与摄取同速) |
  | git vault | 120MB / 2797 commits O(N²) | **已移除** |

- **数据完整性(5000 会话)**:`reasoning_memory` 5000 条 body 全非空;`reasoning_metric` 5000 条全 `ai_solo=false`(人有干预);intervention_count 全=1(每会话 1 处纠正,detectCandidates 命中"不对/应该"信号);body 四节结构(Framing/Interventions/Approach/Anti-Approach)完整,人的纠正原文被保留。
- **收尾**:孤儿卷 `keep_reasoning-vault` 已删;worker 仅挂 `/data/raw-archive`,无 vault 挂载;日志无报错。
- **结论**:git-commit-per-session 瓶颈**已消除**,飞轮排空与摄取同速,pending 稳定近零。RF-1 关闭。

## 待办(下一步)
1. 接真智谱 GLM(需 API key + LiteLLM provider + `KEEP_REASONING_GLM_ENDPOINT`;发前 DLP 脱敏)。
2. governance-web 干预率趋势页(`reasoning_metric` 已填充)。
3. reasoning 代码 git 提交。
