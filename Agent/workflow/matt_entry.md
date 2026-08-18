# /matt — Matt 流开发入口（权威正文）

> 本文件是全局 `/matt` skill 的**唯一权威正文**（遵 ERR-045：用户级 `~/.claude/skills/matt/SKILL.md` 只是绝对路径薄指针）。
> `{TOOLBOX}` = toolBox 根目录绝对路径（薄指针中给出）。

你是**路由器**，自身不干活：判断用户处境，指出该走的 skill 与顺序，然后交棒。所辖 skill 以平名全局安装（源: `{TOOLBOX}/Tool/mattpocock-skills`，软链只读）。

## 首次在一个项目使用

1. 跑 `/setup-matt-pocock-skills` 配置该项目。
2. tracker 选择: 有 GitHub remote → GitHub；本地项目 → 选 Local markdown，并把生成的配置文件里所有 `.scratch/<feature>/` 路径改写为 `.in-process/tickets/<feature>/`（Wayfinding 段同改；目录契约见 `{TOOLBOX}/In-Process/contract.md` §3）。
3. **配置优先**: Matt 各 skill 正文中的 `.scratch/` 示例是缺省值；与项目 `docs/agents/issue-tracker.md` 配置冲突时，一律以项目配置为准。

## 主流线: idea → ship

1. `/grill-with-docs` — 把想法磨利（有代码库时；无代码库用 `/grill-me`）。
   **开 grill 前**: Obsidian 检索 `Internal_KI/decisions/` 中 `decision_type: rejection` 条目（规范: `{TOOLBOX}/KI/Internal_KI/contract.md` §10.3.1）；命中 → 呈报既往否决与理由，用户裁决后再继续。
2. 问题需要可运行的答案（状态模型 / UI 长相）→ 绕道 `/prototype`，用 `/handoff` 双向摆渡。
3. 多 session 的活 → `/to-spec` → `/to-tickets`；单 session 能装下 → 直接 `/implement`。
4. `/implement` 内驱 `/tdd`，收尾跑 `/code-review`，提交到当前分支。

步骤 1–3 保持**同一个不清空的上下文窗口**；每个 `/implement` 从新窗口凭 ticket 冷启动。

## 匝道

- 外来 bug / 需求堆积 → `/triage`
- 有东西坏了 → `/diagnosing-bugs`
- 大而迷雾、一个 session 装不下 → `/wayfinder`（清图后交 `/to-spec`，不直接开工）

## 词汇层与随手工具

- `/domain-modeling`（领域语言） · `/codebase-design`（deep module 词汇）
- `/improve-codebase-architecture` — 隔几天一次的架构体检
- `/research` — 后台读一手资料 · `/handoff` — 跨 session 摆渡
- 迷路时 → `/ask-matt`（Matt 原生全图）

## PM 辅助位（与 /pm 的分工）

出现以下任一情况 → 改走 `/pm` 全闭环（/pm、/distill 是 toolBox 治理入口，不属上述平名 skill 集）:

- 金币 / 支付 / 登录 / 存档 / 分享等安全敏感域（已 ship 系统）
- 需要完整审计轨迹与 QA 五层验证的正式交付
- 同类工程做 /matt vs /pm 对比实验时，指定走 /pm 的那一半

Error_Book 强制召回、Iron Laws、/distill 沉淀由全局规则管辖——本入口不重复，也不豁免。
