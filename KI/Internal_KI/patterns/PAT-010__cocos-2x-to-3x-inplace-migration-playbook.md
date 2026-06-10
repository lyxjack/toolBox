---
id: PAT-010
type: pattern
title: "Cocos 2.x → 3.x 原地最小修改迁移 Playbook（兼容层 + 双 oracle）"
status: active
created: "2026-06-10"
tags:
  - "pattern/migration"
  - "engine/cocos"
  - ki/pattern
complements:
  - "[[ERR-018__cocos-2x-to-3x-migration-pitfalls|ERR-018]]"
  - "[[PAT-002__cocos-asset-operation|PAT-002]]"
trigger_condition: "user_explicit"
aliases:
  - "PAT-010"
  - "cocos-migration-playbook"
mem_ref: null
mem_status: "unavailable"  # 创建于双向关联机制落地前(同日 2026-06-10),无可靠 session 归属(contract § 3.8 降级形态)
---

# Cocos 2.x → 3.x 原地最小修改迁移 Playbook

> 实战来源：滚子平台 `ccc-newkds-client`（CC 2.4.3，322 TS / 164 prefab / 14 分包 / 双横竖屏）→ `ccc-newkds-3.8`（CC 3.8.6），REQ-20260608-044453。从启动到**生产服务器打牌全链路跑通**约 2 个工作日（AI 主导），对比纯人工估算 3–5 人月。
> 负面清单（14 坑）见 [[ERR-018__cocos-2x-to-3x-migration-pitfalls|ERR-018]]，与本 playbook 互为正反两面。

## 适用场景
- Cocos Creator 2.x（已是 **TypeScript**）工程升级到 3.x，且要求**保持原框架/目录/逻辑结构、最小修改**（Path A）。
- 若项目是 JS、或允许换框架（同团队已有 3.x 基建可复用），考虑 Path C（框架置换），不适用本 playbook。
- 判定前提：项目已是 TS ⇒ 迁移本质是 **API 表面替换**（import/类声明/移除 API），逻辑可 100% 保留——这是工作量比官方"JS→TS 注释化重写"路径低一个数量级的根本原因。

## 核心策略（三句话）
1. **兼容层吃掉海量调用点**：在 `Node/Vec2/Vec3` prototype 上复原 2.x 成员（一个 `Compat2x.ts`，~300+ 调用点零改动），代码只改兼容层吃不掉的部分。
2. **双 oracle 驱动收敛**：`tsc`（对真实引擎 `cc.d.ts`）+ 自建 **Babel oracle**（Cocos 真实构建器口径），两者都 0 错误才算静态完成；运行期用"Preview → 读 `temp/logs/project.log` → 修"循环收敛。
3. **导入器只搬资产，代码 overlay**：官方 `File→Import 2.x project` 转 prefab/场景/资源（UUID 保留），随后用自己迁好的 `.ts` 覆盖其改坏的代码；导入器丢掉的配置（Bundle/PMA）用**只读扫描 + 运行时查表**恢复，绝不脚本改 prefab。

## 步骤

### Phase A — 准备（半天）
1. 锁定真实引擎类型：`/Applications/Cocos/Creator/{ver}/...../bin/.declarations/cc.d.ts`（`declare module "cc"`）→ 写 `tsconfig`（files 指向它 + `experimentalDecorators` + `esModuleInterop` + `skipLibCheck`）。
2. 搭 **Babel oracle**：`@babel/core + preset-typescript({allowNamespaces:true}) + plugin-proposal-decorators({legacy:true}) + plugin-proposal-class-properties({loose:true})`，逐文件 transform 收集报错（写 run.js 全量 / checkone.js 单文件，给修复 agent 自验用）。
3. 快照原始代码（tar）；统计 API 面（`cc.Class`/`cc.loader`/Action/audioEngine/分包 计数）定批次。
4. **写转换 ruleset**（agent 唯一规范）：铁律（禁碰 prefab/逻辑零改动/最小修改/拿不准标 `MIGRATION-TODO`）+ API 映射表 + shim 已覆盖成员"保持原样"清单。

### Phase B — 兼容层（关键资产，先建后迁）
`Compat2x.ts` 要点：
- `declare module 'cc'` 接口合并 + `Object.defineProperty` **强制覆盖**（引擎留有废弃警告适配器占位，防御性 hasOwnProperty 会让位 → 见 ERR-018 #14）。
- 成员实现**直算分量**，不转调引擎方法（`mag↔length` 互为废弃别名会无限递归 → #2）；`width/height/opacity` 等自动补 `UITransform/UIOpacity`。
- `CC_*` 全局宏从 `cc/env` 取真值（#6）；npm/Node 内置一律工程内 shim/vendor（momentShim/pako，#3）。
- 项目自有 prototype 扩展（如 `child/childCom`）运行时已存在的，只补**类型声明**。

### Phase C — 批量迁移（并发 agent fan-out）
- 按目录切互斥批次（~7 文件/批），每 agent：读 ruleset → 改 → 自检"文件内无残留 `cc.`"→ 返回 `{ccLeftover, todos}` 结构化结果。
- 先跑 1 个**含难点的试点批**验证 ruleset，再全量放开。

### Phase D — 双 oracle 收敛
- tsc 全量 → 按错误码归类 → **系统性错误进 shim**（一次修一类），长尾按文件 fan-out 修复 agent（带各自的精确错误清单 + checkone 自验）。
- Babel 全量 → 典型问题：namespace `export let`→`const`（内部裸赋值改限定名，#1）。
- 收敛参考：本案 tsc 518→0、Babel 222(oracle 配置不全的假阳性)→23(真)→0。

### Phase E — 编辑器导入 + 恢复（需用户操作 GUI）
1. `project.json` version 临时改回 2.4.x → 用户在 3.x 新建空工程执行 `File→Import 2.x project`。
2. **overlay**：rsync 仅 `*.ts` 覆盖导入产物（.meta 留导入器的，UUID 一致引用不断）。
3. 恢复导入器丢的配置（全部先只读验证再动）：
   - 分包：folder `.meta` 补 `userData:{isBundle,priority}`（沿用 2.x 值，#5）；
   - Spine PMA：扫 prefab 残留 2.x 键 → 按 skeletonData UUID 生成查表 → 运行时 hook `sp.Skeleton.onLoad` 恢复（#8）；
   - BMFont：`grep -rE '^page.*file="[A-Z]:' assets --include='*.fnt'` 修绝对路径（#12）。

### Phase F — 运行期收敛循环
- `Preview → 读 temp/logs/project.log + 浏览器 Console → 定位 → 修 → reload`，每轮只追**第一个**阻断性错误（后续错误常是级联）。
- 高频修复类：远程图 `loadRemote`（#9）、异步回调 `isValid` 守卫（#10）、触摸 `getUILocation`（#11）、外部拉取 null 守卫（#13，浏览器 CORS 属环境差异勿当 bug）。
- 出口标准：登录→大厅→核心玩法在**真实服务器**全链路跑通。

### Phase G — 交接
- 工程根写 `MIGRATION_STATUS.md`（现状证据矩阵 / 承重文件清单 / 剩余工作 / **假问题清单** / 自检命令 / 打包含排清单），随工程走。
- 教训入错题本（聚合单条 + 自包含「预防规则」速查段，召回 ≈1 次搜索 + 1 次 section 读）。

## 反模式
| 错误做法 | 正确做法 | 关联 |
|---------|---------|------|
| tsc 全绿即宣布完成 | Babel + 导入 + Preview 三道口径 | ERR-018 总则 |
| 逐调用点改 `node.width` 等 几百处 | Compat2x 一处复原 | 本 PAT §B |
| 在已迁移工程上再跑 2.x 导入器 | 导入器只搬资产，代码 overlay | #4 |
| 脚本改 prefab 恢复丢失配置 | 只读扫描 + folder meta/运行时查表 | [[ERR-002__python-modify-cocos-prefab\|ERR-002]] |
| npm 包塞 node_modules | 工程内 shim/vendor | #3 |
| 追浏览器 CORS / 编辑器场景黑屏 | 识别为环境差异/动态加载架构，不修 | #7 #13 |

## 关联
- [[ERR-018__cocos-2x-to-3x-migration-pitfalls|ERR-018]] — 本 playbook 的 14 条负面清单（必读）
- [[PAT-002__cocos-asset-operation|PAT-002]] — Cocos 资产操作通用守则（prefab 红线的正面流程）
- 实战工件：`/Users/jackliu/dev/kingDian/.in-process/active/20260608-044453/`（ruleset/批次/oracle 输出/QA 报告全留档）；交接文档范例 `ccc-newkds-3.8/MIGRATION_STATUS.md`
