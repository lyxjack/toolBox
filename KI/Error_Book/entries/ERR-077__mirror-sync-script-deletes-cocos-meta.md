---
id: ERR-077
type: error
errorCode: ERR-077
severity: medium
status: recurring
recurrence: "1"
firstSeen: 2026-07-28
tags:
  - ki/error-book
  - error
  - severity/medium
  - engine/cocos
  - domain/tooling
  - project/guandan
prevention:
  - "**`tools/sync-rules.mjs` 每跑一次会删掉镜像目录下全部 `.meta`(本案 24 个)**。它按『重写文件』的方式同步
    gd-monorepo → ccc-newkds-gd 镜像, 连带清掉 Cocos 的 UUID 元数据。**跑完必须紧跟一次编辑器
    `refresh` 让 Cocos 重建**, 否则 prefab/组件上的引用会在下次导入时挂到新 UUID 上"
  - "**重建要走编辑器, 不要手写 `.meta`**。cocos-mcp `cocos_asset {action:'refresh',
    url:'db://assets/...'}` 会让编辑器按内存里保留的原 UUID 写回 —— 本案 `arrange.meta` 恢复出的 UUID
    与编辑器 `query_uuid` 返回的原值**完全一致**, 零漂移。手写 `.meta` 只能瞎编 UUID, 且违反 ERR-002
    的资产治理"
  - "**已跟踪的 `.meta` 可用 `git checkout` 救回, 未跟踪的救不回**。本案 24 个已提交的 meta 一条命令复原;
    但两个上一轮新增、尚未 commit 的(`arrange.meta` / `arrange/index.ts.meta`)git 里没有副本,
    只能靠编辑器重建。**推论: 新增镜像文件后应尽快 commit, 否则同步脚本一跑就没有回滚点**"
  - "**没改源码时根本不该跑同步脚本**。本案第一次跑纯属多余 —— 当时只往 gd-monorepo 加了测试文件, 一行 `src/` 都没动,
    镜像内容零变化, 唯一效果就是删了 24 个 meta。**先 `git status` 确认 `packages/*/src/` 有改动,
    再决定要不要同步**"
  - "**验证收口: 跑完同步 + refresh 后, 用两条命令确认零残留** —— `git status --porcelain <mirror>
    | grep '^ D' | wc -l` 应为 0, 且遍历 `find <mirror> -name '*.ts' -o -type d` 逐个查
    `${f}.meta` 是否存在"
ci_rules: []
mem_ref: 019faae3-1c68-76a2-9517-c8208c9479f0
mem_status: linked
related:
  - Error_Book/entries/ERR-069__cocos-mcp-tool-quirks-collection.md
  - Error_Book/entries/ERR-046__migrate-image-stale-after-manual-migration.md
  - Error_Book/entries/ERR-028__compressed-uuid-deadcode-misjudge.md
aliases:
  - ERR-077
  - sync-rules-deletes-meta
  - 镜像同步脚本删 Cocos meta
---

# 跑一次镜像同步, 24 个 Cocos `.meta` 没了

## 错误现象

`gd-monorepo` 的规则/客户端内核经 `tools/sync-rules.mjs` 单向镜像到
Cocos 工程 `ccc-newkds-gd/assets/scripts/WM_GD/mirror/`。跑完之后:

```
$ git status --porcelain assets/scripts/WM_GD/mirror | grep '^ D' | wc -l
24
```

24 个 `.meta` 被删。`.meta` 是 Cocos 存 UUID 的地方 —— 丢了之后编辑器会重新生成
**新 UUID**, prefab 上按 UUID 挂的脚本引用就会断。

## 根因

同步脚本按"重写目标文件"的方式工作(加镜像头注释 + 去 `.ts` 后缀 + 改相对路径),
重写时把目录里的 `.meta` 一并清掉。这是脚本的既有行为, 不是本次引入的。

**加重情节**: 第一次跑它纯属多余 —— 当时只往 gd-monorepo 加了**测试文件**,
`packages/*/src/` 一行没动, 镜像内容零变化, 唯一效果就是删了 24 个 meta。

## 修复与恢复

```bash
# 1) 已跟踪的 meta: git 直接救回
git status --porcelain <mirror> | grep '^ D' | sed 's/^ D //' \
  | tr '\n' '\0' | xargs -0 git checkout --

# 2) 未跟踪的(上一轮新增、尚未 commit): git 无副本, 走编辑器重建
#    cocos_asset { action: 'refresh', url: 'db://assets/scripts/WM_GD/mirror' }
```

编辑器重建是**无损**的: `arrange.meta` 恢复出的 UUID
`ea8513c6-0897-42e8-9670-0a29f8c0cb62` 与重建前 `cocos_asset query_uuid`
返回的原值完全一致 —— 编辑器内存里保留着记录。

## 固化流程

此后每次同步一律三步连做:

1. `node tools/sync-rules.mjs`
2. `cocos_asset { action: 'refresh', url: 'db://assets/scripts/WM_GD/mirror' }`
3. 验零残留: `git status --porcelain <mirror> | grep -c '^ D'` 应为 0,
   且遍历 `.ts`/目录逐个确认 `${f}.meta` 存在

且**跑之前先确认真有源码改动** —— `git status` 看 `packages/*/src/` 是否变化。

## 泛化

**任何"重写目标文件"的同步/生成脚本, 在 Cocos 工程里都要当作会毁 `.meta` 处理。**

- 跑完必须让编辑器 refresh, 不能手写 `.meta`(违反 ERR-002 资产治理, 且 UUID 只能瞎编)
- **新增的镜像文件要尽快 commit** —— 未跟踪的 `.meta` 没有 git 回滚点
- 无源码改动时不要跑同步脚本, 它不是幂等的无副作用操作

其他 Cocos 工具链怪癖见 [[ERR-069__cocos-mcp-tool-quirks-collection|ERR-069]]。

## 复发记录

- **R1 · 2026-07-30（REQ-20260729-232009）**：为 F3 记牌器同步 gd-client-core 新文件时复发——sync 删 9 个 `.meta`。按本条处方 3 分钟收口：`git checkout` 复原已跟踪 meta + 编辑器 `cocos_asset refresh` 为新文件 `cardCounter.ts` 生成 meta，`--check` 一致零漂移。根治仍未做（脚本本身该保留 `.meta`），在此之前每次同步后按「验证收口」两条命令走一遍。
