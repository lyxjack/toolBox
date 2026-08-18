---
category: cad_hardware
anchor: cad-hardware
lastUpdated: 2026-07-29
confidence: 0.65
anchorBase: bambu-labs
anchorBaseConfidence: 0.74
merged_from:
  - { name: bambu-labs, confidence: 0.74, origin: earthtojake/text-to-cad, date: 2026-07-29 }
  - { name: gcode, confidence: 0.69, origin: earthtojake/text-to-cad, date: 2026-07-29 }
  - { name: dxf, confidence: 0.60, origin: earthtojake/text-to-cad, date: 2026-07-29 }
  - { name: sdf, confidence: 0.54, origin: earthtojake/text-to-cad, date: 2026-07-29 }
  - { name: cad-viewer, confidence: 0.54, origin: earthtojake/text-to-cad, date: 2026-07-29 }
  - { name: implicit-cad, confidence: 0.54, origin: earthtojake/text-to-cad, date: 2026-07-29 }
  - { name: step-parts, confidence: 0.52, origin: earthtojake/text-to-cad, date: 2026-07-29 }
  - { name: cad, confidence: 0.50, origin: earthtojake/text-to-cad, date: 2026-07-29 }
  - { name: sendcutsend, confidence: 0.46, origin: earthtojake/text-to-cad, date: 2026-07-29 }
  - { name: srdf, confidence: 0.45, origin: earthtojake/text-to-cad, date: 2026-07-29 }
  - { name: urdf, confidence: 0.44, origin: earthtojake/text-to-cad, date: 2026-07-29 }
anchorBaseNote: "anchorBase 按流程记为最高结构分 skill（bambu-labs 0.74），但本 Anchor 的骨架取自领域拓扑而非单一 skill——领域核心是 cad（STEP-first）。20 信号衡量文档形态（代码块数/行数/表格），不衡量领域中心性；本仓 SKILL.md 刻意精简、把细节推到 references/ 与 --help，故整体结构分偏低，不代表知识质量低。"
---

# CAD & Hardware Design

参数化 CAD、机器人描述文件、2D 下料、增材/减材制造的完整知识 Anchor。以 **STEP-first** 为中枢：先产出可校验的 STEP 几何，再派生 STL/3MF/GLB/DXF/G-code 等下游产物。

来源：`earthtojake/text-to-cad`（CAD Skills，见 `Agent/index/source_registry.json#earthtojake-text-to-cad`）。本地运行时部署事实见 `KI/Internal_KI/patterns/PAT-037__cross-project-cad-shared-runtime.md`。

## When to Use This Anchor

- 从自然语言、参考图、2D 工程图生成机械零件 / 装配体（支架、外壳、夹具、法兰、轴、齿轮）
- 产出或校验 STEP / STP / STL / 3MF / GLB / DXF 文件
- 编写机器人描述：URDF（结构）、SRDF（MoveIt2 规划语义）、SDF（仿真世界）
- 切片 FDM G-code、驱动 Bambu Lab 打印、SendCutSend 钣金/激光下料预检
- 查找现成采购件（螺丝、轴承、电机、舵机、连接器）而不是手搓占位几何
- 本地浏览器三维评审（CAD / 机器人 / G-code / DXF）
- 隐式 SDF / GLSL raymarching 建模（实验性）

**不适用**：渲染概念图、CAM 刀路、工程认证、FEA 结论、建筑 BIM、手绘插画。

---

## Skill Routing — 需求到技能

| 需求 | 技能 | 主产物 |
|---|---|---|
| 机械零件 / 装配体 / STEP | `cad` | `.step` + 隐藏 `.glb` 拓扑边车 |
| 三维评审链接 | `cad-viewer` | `http://127.0.0.1:4178/?dir=…&file=…` |
| 2D 下料图、垫片、展开图 | `dxf` | `.dxf` |
| 采购件（螺丝/轴承/电机/舵机） | `step-parts` | 下载的 `.step` + SHA-256 校验 |
| 机器人结构（link/joint/inertial） | `urdf` | `.urdf` |
| MoveIt2 规划组 / 末端执行器 / 碰撞矩阵 | `srdf` | `.srdf` |
| 仿真模型 / 世界 / 传感器 / 物理 | `sdf` | `.sdf` |
| FDM 切片 | `gcode` | 纯 `.gcode` |
| Bambu 打印机 LAN 投送 | `bambu-labs` | FTPS 上传 + MQTT 控制 |
| SendCutSend 上传预检 | `sendcutsend` | 带引用来源的预检报告 |
| GLSL 隐式曲面 / TPMS 晶格 | `implicit-cad` | `.implicit.js` |

## Format Ownership — 边界（最易搞错的部分）

| 内容 | 归属 | 绝不放进 |
|---|---|---|
| link / joint / 几何 / 惯量 / 关节限位 / transmission | **URDF** | SRDF、SDF |
| virtual joint / passive joint / 规划组 / group state / 末端执行器 / disabled_collisions | **SRDF** | URDF、SDF |
| 物理引擎 / 传感器 / 灯光 / plugin / world | **SDF** | URDF、SRDF |
| 3D 实体几何与 mesh 生成 | **cad** | dxf（只做 2D） |
| 2D 轮廓、图层、折弯线 | **dxf** | cad |

三条推论：

- **SRDF 修不了坏 URDF**。link 帧、joint 原点、限位、几何错了，回 URDF 改。
- **SDF 不吸收规划语义**，也不吸收 URDF 结构。
- `implicit-cad` 的 SDF 是 **signed-distance field**，`sdf` skill 的 SDF 是 **SDFormat**。同名不同物，这是本领域最容易误路由的一处。

---

# Part 1: STEP-First 参数化 CAD

## 1.1 两个入口，同一条工作流

| 入口 | 何时用 | 命令形态 |
|---|---|---|
| build123d Python 生成器（默认） | 从零设计，或修改已生成模型 | `step model.py` |
| 直接导入 STEP/STP | 无生成器（外部/下载件），或用户明确指向 STEP 文件 | `step --kind part\|assembly model.step` |

**已有生成器就永远跑 `.py`，不要跑它导出的 `.step`**——装配体走后者会丢失源级 joint 关系与原生标签。

生成器契约：顶层 `def gen_step(): return <shape>`。**返回值里不要写输出路径**，路径由 CLI 决定（`-o PATH`，或 `SOURCE.py=OUTPUT.step` 位置对）。STEP 与其生成器保持同目录同 basename。

## 1.2 默认建模假设（无指定时的硬数字）

| 项 | 默认值 |
|---|---|
| 单位 | 毫米 |
| 基准面 / 拉伸轴 | XY 平面 / +Z |
| 原点 | 按 `references/positioning.md` 的零件类型默认；否则主体/装配中心 |
| 小型塑料外壳壁厚 | **2.0–3.0 mm** |
| 装饰性圆角 | **1.0–3.0 mm**（局部几何安全时） |
| M3 / M4 / M5 普通间隙孔 | **3.4 / 4.5 / 5.5 mm** |
| 输出几何 | 闭合正体积实体（除非用户要曲面/构造几何） |
| STEP 结构 | 单实体、实体复合、或带标签的装配复合 |

只在信息缺失导致**模型无法建立、配合关键、安全关键或合规相关**时才提问，且只问一个聚焦问题；否则带着显式假设推进。

## 1.3 CLI 三件套与路径解析

```bash
python scripts/step ...      # STEP 生成、GLB/拓扑产物、mesh 边车
python scripts/inspect ...   # refs / measure / align / frame / diff
python scripts/snapshot ...  # PNG/GIF 评审包
```

- `--help` 是 flag 的唯一权威，参考文档只讲推荐工作流。
- **目标路径按命令 cwd 解析，不是 skill 目录**。在拥有产物的工作区里跑，传 cwd 相对路径，项目 CAD 文件才不会落进 skill 目录。
- 只跑显式目标，**禁止目录级批量生成**。
- 每次 `scripts/step` 都会写隐藏的相邻 GLB/拓扑产物，驱动 Viewer 与 `inspect` 的 selector ref——**不是可选产物**。

## 1.4 强制工作流（10 步）

1. 分类任务（新零件 / 新装配 / 改源 / 直接 STEP 检视 / 引用选择 / 测量对齐 / 快照评审 / 二级导出）
2. 只按触发条件加载需要的 reference，不要读全套
3. 写自然语言 CAD brief（尺寸、单位、坐标约定、特征意图、输出路径、假设、校验目标）
4. 装配含点名的采购件时，**先查 `step-parts`** 再造占位几何；查不到就记录 miss 再用有据可查的包络
5. 编码前定参数、意图标签、源路径、预期包围盒、配合基准
6. **改源不改产物**
7. 生成显式目标
8. 几何校验：基线 + 针对用户点名的每条尺寸关系
9. **快照校验强制**
10. 修最小责任段落，重跑失败的那一项

## 1.5 几何校验与 selector ref

基线命令：

```bash
python scripts/inspect refs <step-or-cad-target> --facts --planes --positioning
```

再按规格用 `measure`（两 selector 间带符号坐标距离）、`align`（只读对齐平移增量）、`frame`（occurrence 世界帧）、`diff`（两 STEP 的 selector 级变更）逐条验证。

selector ref 是目标局部的 `#...` token：`#o1.2` 指 occurrence，`#o1.2.f1` 指其面。CAD 文件作为独立 target 参数传入，不要拼进 ref。

`refs` 返回的可直接断言项：`summary.bounds`（min/max）、`shapeCount`（实体数）、`faceCount`、`entryFacts.size` / `.center`、以及按 `axis`+`coordinate` 分组的 `planes[]`（含 `totalArea` 与 `bbox`）。**平面面积可反推特征**——例如 100×60 板减 4 个 φ8 通孔，底面积应为 6000 − 4·π·4² ≈ 5798.9 mm²，与 `totalArea` 对得上即证实孔径孔数。

**禁止**用 `git status`、`git diff` 或文件大小 churn 比较大 STEP/GLB/STL/3MF 产物；比源码 diff、`inspect` 摘要、快照或生成的拓扑。只报告真正跑过的检查。

## 1.6 快照强制策略

确定性检查通过**不是**跳过快照的理由。只有四种记录在案的跳过情形：纯格式/导出请求且几何未变；改源但可见几何未变；纯检视任务无产物；Python/STEP 生成失败尚无有效产物。跳过要报原因 + 已跑的确定性证据。

- 静态评审用 PNG，运动/动画用 GIF。不要循环刷快照——只在修复改变了可见几何、或某条发现需要确认时重渲。
- **多视图评审包**（而非单张 PNG）用于：装配/多实体、多面或多轴向孔、壳体/型腔/镗孔/通道、筋/凸台/柱/槽/阵列、修复后、以及"像不像用户要的东西"本身是任务的一部分时。
- 输出文件名会**自动插入 UTC 秒级时间戳**在扩展名前，实际落盘名 ≠ `--output` 原值，须从 stdout 读回真实路径。
- 评审图渲到 `/tmp`，不要提交进仓库。

`--appearance` 收保存主题名 / 内联 JSON / JSON 文件路径；`--display` 收 `solid|rendered|transparent|hidden_edges|hidden_lines_removed|unshaded|wireframe` 或 JSON；投影、爆炸视图、边样式放 display JSON，如 `{"projection":"orthographic","exploded":{"enabled":true,"axis":"z","spacing":1.6}}`（`{"axis":"radial"}` 为径向散开）。`--camera` 收预设、`azimuth:elevation` 或含 `position/target/up/zoom` 的 JSON。`--focus` / `--hide` 收 selector ref。`--size-profile` 有 `simple|diagnostic|labeled|assembly|presentation|orbit|contact-sheet`。

## 1.7 装配

有功能性装配关系时用 `cadpy.assembly.AssemblyHelper` + 源级 build123d joint + 命名配合基准 + 详细原生标签：固定根零件、零件局部帧、显式生成的放置。`references/positioning.md` 是这块的权威。

装配定位**写在源里**，不要靠导出后的变换。

---

# Part 2: 机器人描述（URDF / SRDF / SDF）

## 2.1 生成器契约三者对比

| | `gen_urdf()` | `gen_srdf()` | `gen_sdf()` |
|---|---|---|---|
| 返回 | 根 `Element` / URDF 字符串 / 信封 `{xml}` | 信封 **必须恰好** `{xml, urdf}` | 优先根 `Element`（字符串/信封兼容） |
| 拒绝字段 | `urdf_output`、`validate`、`explorer_metadata` | 除 `xml`/`urdf` 外任何字段 | `sdf_output` 等输出路径字段 |
| 额外信封字段 | — | — | `assumptions[]`、`warnings[]`、`metadata{}` |
| 校验时机 | 生成路径内默认校验（**无独立 `validate` 子命令**） | 写盘前对照链接的 URDF 校验 | 写盘前 bundled 校验 + 可选 `gz sdf --check` |

三者共通：顶层零参函数；只跑显式目标，禁止目录级生成；`-o/--output` 仅限单个纯 Python 目标（与 `SOURCE=OUTPUT` 对互斥）；相对路径按 **CWD** 解析，生成器内部要用 `Path(__file__).resolve().parent` 派生资源路径；launcher 在进程内 import 生成器（顶层代码会执行）——只跑可信源。

`sdf` 独有 flag：`--gz-check {auto,required,never}`（默认 `auto`：`gz` 存在则跑，否则报 skipped）、`--strict`（把 bundled 警告与信封警告当失败）。

## 2.2 URDF 帧语义与单位（最高频错误源）

- joint `<origin xyz rpy>` 是 **父 link 帧 → joint 帧** 的变换；**子 link 帧与 joint 帧重合**；`<axis xyz>` 表达在 **joint 帧**（不是世界帧，不是 mesh 帧）。
- `<visual><origin>`、`<collision><origin>`、`<inertial><origin>` 各自表达在**所属 link 帧**且互相独立；inertial origin 是**质心**，绝不假定等于 visual origin。
- 单位：米 / 千克 / 弧度 / 秒，右手系。角度先转弧度。`continuous` 关节**不要**塞假的有限 `lower`/`upper`。
- mesh `scale` 把源单位换成米——毫米 STL 用 `scale="0.001 0.001 0.001"`。**STL 不携带可靠单位元数据，绝不假定是米。**
- 读法示例：`<origin xyz="0 0 0.24"/>` + `<axis xyz="0 0 1"/>` = 子帧位于 `base_link` 的 z=0.24 m，正向运动绕 joint/子帧的 +Z 旋转。

## 2.3 URDF 生成期校验清单

结构：根 `<robot>`；robot name 非空；link 与 joint 名唯一非空；parent/child 有效且存在；每个 child ≤1 个 parent；**恰好一个根 link**；连通且无环；`joints == links - 1`。

关节类型：`SUPPORTED_JOINT_TYPES = {fixed, continuous, revolute, prismatic}` —— **`floating` 与 `planar` 被这个 reader 拒绝**，尽管部分下游消费者支持。

几何：visual/collision 都允许 `mesh|box|cylinder|sphere`；每个 `<geometry>` 恰好一个子元素；基本体尺寸正且有限；mesh `scale` 为 3 个正有限值。

mesh 引用：任何非空文件名/URI 都接受；**本地路径按生成的 `.urdf` 所在目录解析并做存在性检查**；`package://` 与远程 URI 通过但告警（除非通过 `read_urdf_source()` 提供 package map）。

惯量：`mass` 正且有限；`inertia` 必须给全 `ixx ixy ixz iyy iyz izz`，全部有限，对角线为正。

**报告时把「项目策略问题」与「URDF 通用非法」分开列。**

碰撞几何优先序：基本体 `box`/`cylinder`/`sphere` → CAD 导出的粗略闭合碰撞 mesh → visual mesh（仅作临时加载/冒烟回退）。

## 2.4 SRDF 规划语义

- `<group>` 可以是 joint 列表、link 列表、`<chain base_link tip_link>` 或子组集合。chain 的 base link = 首 joint 的父 link，tip link = 末 joint 的子 link——**要验证 URDF 图里真的存在这条路径**。
- `<end_effector name parent_link group parent_group/>`：EEF 组**不得与父组共享 link**；`parent_link` 必须在父组内或在 URDF 图中与 EEF 组相邻。TCP/目标 link 是语义决策，**绝不推断**。
- `<group_state>` 用 URDF 原生单位：revolute/continuous 用**弧度**，prismatic 用**米**。运行期字段 `joint_values_by_name` / `jointValuesByName`（`*_rad` 变体已弃用）。group state 不得设置 fixed 或 mimic 关节，且会对照 URDF 限位做边界检查。
- CLI 注入 `<tcad:urdf path="..."/>`，命名空间 `https://text-to-cad.dev/srdf`（旧 `explorer:urdf` 仍可读）。`urdf` 字段必须非空、用 POSIX `/`、**相对路径**、以 `.urdf` 结尾、指向**存在的文件**（相对生成器源解析）。
- **SRDF robot name 必须与 URDF robot name 一致。**
- 未校验的部分要知道：URDF 图完整一致性、chain base/tip 连通性、子组环、`<virtual_joint>`/`<passive_joint>` 清点、采样自碰撞正确性、IK solver 可用性、真实规划成功率、控制器配置。这些靠 MoveIt Setup Assistant 与实机冒烟。

## 2.5 disabled_collisions 的证据纪律

```xml
<disable_collisions link1="base_link" link2="shoulder_link" reason="Adjacent"/>
```

运行期要求：两个 link 都在 URDF 中；名字**不同**；`reason` **非空**；无重复或反序重复对。

只有五种合法来源：URDF 图邻接、MoveIt Setup Assistant 自碰撞矩阵、已知 MoveIt config 的采样分析、用户显式提供的矩阵、经人工审阅并给出具体理由的单对。

reason 词表对应来源：`Adjacent`（图邻接）、`Never`/`Always`/`Default`（Setup Assistant 采样）、`Manual: <具体理由>`（人工审阅）。解析器归桶为 `adjacent | sampled | manual | setup_assistant | assumed`。

**避免落入 `assumed` 桶**，除非用户明确要临时 SRDF 且风险已报告。**手工对过多会触发校验警告**——该用 Setup Assistant 重新生成矩阵。几何、限位、组成员变更后要重审这些对——过期的 disable 会藏住真实碰撞。

## 2.6 SDF 位姿三概念与校验常量

根必须是 `<sdf version="major.minor">`，**新产物默认 `version="1.12"`**（除非消费者另有约束）。SI 单位：米/千克/秒/弧度。

三个**不同**的概念，别混：

| 属性 | 含义 |
|---|---|
| `relative_to` | 位姿数值表达在哪个帧里 |
| `attached_to` | 一个 `<frame>` 跟着谁动 |
| `expressed_in` | joint axis 表达在哪个帧里 |

`rotation_format="euler_rpy"`（默认）→ pose 是 **6** 个值 `x y z roll pitch yaw`（弧度）；`quat_xyzw` → **7** 个值。`degrees="true"` 合法但生成源里应避免。嵌套作用域用 `::`（`outer::inner::sensor_frame`）。joint `<parent>` 可以是 `world`，`<child>` **不可以**。

校验常量（`validation.py`）：`POSE_TOLERANCE = 1e-12`、`UNIT_TOLERANCE = 1e-6`（轴/四元数单位范数检查）、`PSD_TOLERANCE = 1e-9`（惯量正半定：对角项、2×2 主子式、行列式）。SDF 1.12 已知关节类型 `continuous, revolute, gearbox, revolute2, prismatic, ball, screw, universal, fixed`；`axis2` 只对 `{revolute2, universal}` 有效。

三级严重度：`error` 阻断写盘；`warning` 允许写盘（除非 `--strict`）；`info` 记录假设与跳过项。本地 mesh 相对生成的 `.sdf` 解析；`model://`、`package://`、`fuel://`、`http(s)://` 接受但不做文件系统解析。

**收尾报告四段强制**：`Generated:` / `Checks run:`（每项标 pass|skipped+原因）/ `Assumptions:` / `Risks:`。**绝不说「文件有效」**——要点名是哪个校验器或冒烟测试通过了。

## 2.7 Design Ledger 纪律（三格式共用）

写任何位姿/帧/轴/mesh 缩放/惯量之前，先立账本。URDF 六段：Robot Metadata、Link Ledger、Joint Ledger、Geometry Ledger、Inertial Ledger、Assumption Ledger。

- 每个可动关节都要有显式的**正向运动**约定；轴符号是模型的一部分，不是装饰。
- 常量按物理意义命名：`BASE_TO_SHOULDER_Z_M = 0.240`、`SHOULDER_PAN_AXIS = (0.0, 0.0, 1.0)`、`FOREARM_MESH_SCALE_FROM_MM = (0.001, 0.001, 0.001)`；猜测值加 `ASSUMED_*` 前缀。**不要**内联 `origin="0 0 0.24"`。
- 纯帧 link（`base_footprint`、光学帧、`tool0`）省略 inertial/visual/collision 时必须**显式标注为纯帧**。
- 空间数据缺失时，只能选五种正当出路：原样保留 / 带注释的纯帧占位 / 具名近似常量 / 索要 CAD 数据 / 报告"结构有效但空间暫定"。**绝不编造看起来精确的变换。**
- 绝不用「只偏移 visual mesh」来修运动学错误——改 link 与 joint 帧。绝不在无显式镜像变换与符号翻转的情况下静默镜像左右件。

---

# Part 3: 2D 与制造

## 3.1 DXF（`gen_dxf()`）

- 单位毫米且**必须显式设**：`doc.units = ezdxf.units.MM`。几何放 modelspace，1:1。
- 切割轮廓必须是**闭合** polyline 或闭合线/弧环；开放轮廓只用于雕刻或参考几何。
- 切割几何与折弯线**分图层**，且折弯图层名**必须含字符串 `bend`**，下游才会归类为折弯而非切割。
- DXF 图层编码图纸结构，**不是** STEP 的零件/装配结构。
- 两种源形态：独立绘图（只定义 `gen_dxf()`）、CAD 投影（在同时定义 `gen_step()` 的源里加 `gen_dxf()`）。投影优先做法：建 3D 实体 → 选取并投影真实平面 → 展开成平面坐标 → 从投影面 wire 输出闭合轮廓，而不是复制一遍尺寸公式。
- `scripts/dxf` **从不读**已有 `.dxf`。用 `ezdxf` 做实体/图层检查：`doc = ezdxf.readfile(p)`；闭合检查 `[e for e in msp.query("LWPOLYLINE") if e.closed]`；按层查询 `msp.query('CIRCLE[layer=="0"]')`。

## 3.2 step-parts（采购件）

- API 源 `https://api.step.parts`，站点/静态资源源 `https://www.step.parts`。**不要爬 HTML，不要读本地仓库文件。**
- 网络/DNS 失败是**不确定**结论：先带网络权限重试一次，再报 miss 或退回占位几何。只有 API 可达且返回无相关候选，才能说"不可得"。
- 别名策略：`STS3215` 也叫 `ST3215`、`3215`、`Waveshare Feetech ST3215`，或在 `family=feetech` 下。宣布 miss 前先试掉字母、厂商名、family facet。`q` 的 token 之间是 AND，同一 facet 内的值是 OR，不同 facet 之间是 AND。
- 端点：`/v1/parts`（筛选搜索，`page` 从 1 开始，`pageSize` 默认 100、上限 500）、`/v1/parts/{id}`、`/v1/catalog/parts.index.json`、`/v1/catalog/schema`、`/v1/openapi.json`。
- 下载走记录里的 `stepUrl`（生产记录会重定向到按 commit 锚定的 GitHub LFS 媒体，**不要手工拼 URL**），并在 `sha256` 非 null 时**校验 SHA-256**。保留 `.step` 扩展名与源 `id`。
- 内置下载器：`python scripts/download_step_part.py "M3 socket head 12" --download`，或 `--id iso4762_socket_head_cap_screw_m3x12 --download`。可重复的 `--tag/--category/--family/--standard`，加 `--out-dir`、`--all`、`--overwrite`。输出 JSON 到 stdout。

## 3.3 G-code 切片（`gcode`）

- 只产**纯 `.gcode`**，输入 `.stl/.obj/未切片 .3mf/.ply/.glb/.gltf`。打印机无关：不上传、不启动、不打包，**不产 `.gcode.3mf`**。
- 四个子命令 + 一道门禁：`discover`（探已装后端）→ `inspect --input X --json`（切片前分类 mesh）→ `slice --input X --output Y --profile Z --backend auto --dry-run` → **审阅 dry-run 命令与 profile 后**用同一条命令加 `--execute` → `validate --gcode X --profile Z --json`。
- 后端优先序 `orcaslicer > prusa-slicer > curaengine`。缺切片器不是用户级阻塞：macOS 上 `brew install --cask orcaslicer` 后重跑 `discover`。**Bambu Studio 会被报为可用但故意排除在默认选择外**——它的 CLI `.gcode.3mf` 导出在 macOS 上崩过。
- 包装 profile JSON 必填：`backend`、`native_config`（原生 profile 的**绝对路径**）、`machine.name`、`machine.bed_size_mm [w,d]`、`machine.z_height_mm`、`filament.type`、`filament.nozzle_temp_c`、`filament.bed_temp_c`。包装层只提供校验边界与后端选择，原生 profile 仍是工艺行为的权威。
- `machine.motion_bounds_mm` 可选（per-axis `[min,max]`），省略则为 `0..bed_size` / `0..z_height`。**只能依据真实打印机 profile（含安全的台外擦拭/清料位）放宽，绝不用它来消掉未知 G-code 的告警。**
- 拒收 `.step/.stp/.dxf/.svg/.urdf/.sdf`，并返回带 `skill`/`reason`/`next_step` 的 `remediation` 对象——**照它走，不要自创转换路径**。STEP 先用 `cad` 导 STL 边车；DXF/SVG 没有 2D→mesh 路径（去 `cad` 建实体，或该用 `sendcutsend`）；URDF/SDF 逐个切它引用的 per-link mesh。
- 含 `Metadata/plate_N.gcode` 的 Bambu `.3mf` **已是切好的作业，不要重切**。
- 静态校验 **FAIL** 条件：文件空；无 `G0/G1/G2/G3` 移动；无挤出移动；无喷嘴或热床温度指令；解析出的绝对 `X/Y/Z` 超出运动边界。**WARN**：未知指令、相对定位（相对模式期间跳过边界检查，`G90` 后恢复）。`ok: true` **只代表静态检查过了，不代表可以安全打印**。

## 3.4 Bambu Lab 打印（安全门禁 — 本领域唯一驱动物理硬件的技能）

- **dry-run 是默认**。任何真实打印机流量需要 `--execute`。**启动打印需要 `--execute --confirm-start-print`；取消需要 `--execute --confirm-cancel-print`。**
- 用户明确要求打印某个作业即构成实机启动授权——不要为了物理检查再问一次——但仍须：校验 G-code、检查 dry-run payload、读打印机状态、优先先 upload-only 再 upload-start、口述物理检查项、并在校验/状态/意图不安全或含糊时停下。
- 实机启动前口述物理检查：料盘清空、正确的板/料/喷嘴、周围安全、有人在旁。
- **MQTT publish 只是启动请求**，不是启动证明——要靠打印机状态/UI/肉眼确认。
- 投送模式：`--handoff template-project` 是 A1 Mini 已验证路径（复制同型号已知良好 `.gcode.3mf` 模板 → 替换 `Metadata/plate_N.gcode` 及其 `.md5` → 上传到 FTPS **根目录**而非 `cache/` → publish `print.project_file` 带 `url: ftp:///<name>.gcode.3mf`）。`--handoff plain` 在实测 A1 Mini 上传字节一致但 `gcode_file` 失败/被忽略，**只作诊断，不是 A1 Mini 实机启动路径**。`--handoff bambox-project` 仅对 `p1s-0.4` + `PLA/ASA/PETG-CF` 启用。
- 传输事实：FTPS 隐式 TLS 端口 **990**；MQTT TLS 端口 **8883**；用户名 `bblp`，密码=访问码；打印机自签证书故默认关闭 TLS 校验。MQTT topic：请求 `device/{serial}/request`，上报 `device/{serial}/report`。
- 访问码放 git-ignored 的 `bambu-printers.json`，**不要回显**。A1/A1 Mini 需在触摸屏显式开 **LAN Only** 与 **Developer Mode**，然后断电重启。
- 已知故障签名：项目上传到 `cache/` 会启动后失败并报 `print_error: 83935248` / `0500-C010`（改上传到 FTPS 根）；`file:///sdcard/cache/...` 与本地 HTTP URL 看似被接受但什么都不启动。

## 3.5 SendCutSend 预检

- 三个**每次评审前重新抓取**的实时源：ordering guide `.../sendcutsend-ordering-guide.md`、catalog `.../sendcutsend-catalog.json`、specs `.../sendcutsend-specs.json`（均在 `https://cdn.sendcutsend.com/specs/`）。当证据流而非稳定 API 对待。
- **缺失、不可解析、`N/A` 或互相冲突的源数据，绝不能变成 pass 或 fail** —— 标 `❓ need more info`。记录 provenance：源 URL、访问日期、`_meta.schema_version`。
- 源优先序：配置器/当前报价 > specs JSON 的精确 SKU > catalog JSON 的精确 SKU > ordering guide > 其他官方页面。
- 几何事实先用 `cad`，再补 SendCutSend 特有测量。只准 `build123d.import_step` / `build123d.ezdxf`——**禁止裸文本解析或替代几何后端**。检视**确切的上传文件**，不是生成器、不是 CAD 模型、不是控制台摘要。
- DXF 单位闸门：guide 期望的 `$INSUNITS` 只有 `1`（英寸）与 `4`（毫米）；缺失/不支持/超出即单位比例错误，**先重导或确认单位**，在此之前不做任何尺寸/翻边/材料相关比较。**绝不静默缩放几何。**
- 翻边分析要**沿每条折弯线做局部测量**（每个 span/采样点两侧最近的切割/自由边），与所选 SKU 的 `bending_specs.min_flange_length_before_bend` / `_after_bend` 比。**有局部切口、断续/分段折弯、让位槽、凸耳时不得用源级聚合值。**
- 只有三个状态标签：`✅ pass`（实测事实满足所引用的当前要求）、`❌ fail`（实测的上传风险/可制造性问题/直接违规）、`❓ need more info`。
- 发现表**必须**有 `Rule source` 列：源 URL 链接 + 具体 JSON 字段路径（如 `sendcutsend-specs.json materials[sku=ALU-063].cutting_specs.min_hole_size`）；纯文件检视得出的行写 `Direct file inspection`，**绝不留空**。
- 除非每一条必需的引用检查都通过或明确不在所选服务范围内，**绝不说「SendCutSend ready」**。

---

# Part 4: 隐式 CAD（实验性）

`.implicit.js` / `.implicit.mjs` 是浏览器原生 ES 模块，默认导出 `{schema: "implicit.js/0.1.0", name, glsl}`，`glsl` 模板串内含 `float sdf(vec3 p)`（可选 `vec3 color(vec3 p, vec3 normal)`）。**明确的门禁**：除非用户显式要隐式模型，永远优先 STEP-first CAD。

- param 类型 `number|boolean|enum/select|color|string|button`。number/boolean/color/button **自动成为同名 GLSL uniform ——绝不另写 `uniforms` 对象**，在 GLSL 里直接引用 param 名。
- number param 形如 `{type, label, min, max, default, unit}`；animation 形如 `{label, duration, update({progress, set})}`。
- `bounds` 可选、由 SDF 自动估计；只在估计过宽、过慢或漏掉异常场时显式给（动画、周期、平移、极薄模型）。**bounds 坏了会静默截断导出。**
- GLSL 内置助手在 `implicit_*` 命名空间（`implicit_sphere`、`implicit_box_centered`、`implicit_union_round(a,b,r)`）。颜色保持 0..1 RGB。**不要把内置助手文件拷出 skill。**
- 布尔/混合族：`unionSharp/Round/Chamfer/Exp/LpNorm/Rvachev` 与对应 `intersect*`、`difference`。TPMS 晶格：`tpmsGyroid/Schwarz/Diamond/Lidinoid/Neovius/SplitP/Iwp`。
- 快照 `node scripts/snapshot.mjs --input <m> --output <png>`；多视图**一次 CLI 调用**用 `--job -` heredoc（复用浏览器/模块/运行期模型），`"mode": "view"` + 多个 `outputs`（camera `iso/front/top/right`）。边缘贴合的模型 `render.frameMargin` 取 **~1.5**；仍被裁先查源 `bounds` 是否在截断 raymarch 本身，再动相机。
- 导出只支持 **glb / stl / 3mf**：`node scripts/export.mjs --input <m> --format glb`。省略 `--output` 时按同 stem 写在源旁。

---

# Part 5: CAD Viewer

## 5.1 单服务器模型与端口纪律

**一台机器一个 Viewer**，所有目录通过 `?dir=` 提供。Viewer 广告 `dynamic-root`，单服务器应答任意绝对目录——**永远不要为了换目录起第二个服务器**。

服务器绑定 **4178，占用则向后扫描**。**不要手工挑端口，也不要自己探空闲端口**——从 `--json` 那行读绑定端口。

```bash
npm --prefix scripts/viewer run serve -- --host 127.0.0.1 \
  --dir <absolute-model-root> --shutdown-after 12h --json
```

`--json` 那行在 listener 绑定**之后**才输出，形如 `{"url":"http://127.0.0.1:<port>/?dir=<root>","host":"127.0.0.1","port":<port>,"action":"start"}`；它是 stdout 里**最后一行以 `{` 开头的**（前面是人读行）。

沙箱 agent 环境里 bind/probe 出现 `EPERM`/`EACCES` 是正常的，带所需权限重跑同一条命令，不要换方案。

## 5.2 复用探针

```bash
curl -sS -m 2 http://127.0.0.1:4178/__cad/server
```

返回 JSON 满足 `"app": "cad-viewer"` **且** `"dynamicRoot": true` 才复用，取其 `url` 与 `port`。**当 `viewerVersion` 与 `scripts/viewer/package.json` 的 `version` 不一致时要自己起**——版本不同意味着那是另一个 checkout 的 Viewer。**除用户要求，绝不停掉已在跑的 Viewer。**

## 5.3 链接构造

`http://127.0.0.1:<port>/?dir=/abs/project/models&file=path/to/model.step`，`file=` **相对 `--dir`**。

- 返回任何 `file=` 链接前，先解析 `<dir>/<file>` 确认产物存在；不存在就**不要给链接**，报告问题并指向正确的产物路径。
- 给生成的产物（`.step`），**不要给生成器源**（`.py`）。
- 每个请求文件一个 URL；纯目录评审给不带 `file=` 的裸 URL。

## 5.4 各格式能力边界

`.step/.stp` 通过隐藏 GLB 边车渲染，带装配树、零件显隐、面/边/点/零件选择、可复制的 `#...` ref、剖切面，存在参数边车模块时还有参数/动画。`.dxf` 是只读展开图 + 厚度/折弯控件。`.gcode` 是**诊断用**刀路预览——明确**不重切片、不模拟固件、不替代 G-code 校验**。

---

# Part 6: 跨技能不可协商约束

1. **`cad-viewer` 交接强制**：任何 skill 创建或修改 `.step/.stp/.stl/.3mf/.glb/.dxf/.gcode/.urdf/.srdf/.sdf/.implicit.js` 后，必须把显式路径交给 `cad-viewer` 并把返回的实时链接放进最终回复；不可用或启动失败要**明说**，不能静默省略。
2. **改源不改产物**。生成的 `.step/.urdf/.srdf/.sdf/.dxf` 都是产物，手改产物不是修复。
3. **只跑显式目标**，禁止目录级批量生成，禁止顺手重生成无关产物。
4. **只报告真正跑过的检查**。不说"文件有效"，要点名哪个校验器/冒烟测试通过。
5. **绝不从视觉印象推断空间变换**，绝不把猜测值藏进 XML 字面量——作为显式 assumption 上报。
6. **绝不用二进制产物 churn（git diff / 文件大小）作为 CAD 比较手段。**
7. **物理动作要门禁**：打印启动/取消须显式 confirm flag；实机流量须 `--execute`。

# Part 7: 反模式总表

| 错误做法 | 正确做法 | 原因 |
|---|---|---|
| 在导出的 `.step` 上跑生成 | 跑 `.py` 生成器 | 装配丢失源级关系与标签 |
| 把输出路径写进 `gen_*()` 返回值 | 由 CLI 决定路径 | 契约拒绝该字段 |
| 确定性检查过了就不出快照 | 快照强制 | 数值对而形状错真实存在 |
| `git diff` 大 STEP/GLB 判断变化 | 比源码 diff / `inspect` 摘要 / 快照 | 二进制 churn 无意义 |
| 假定 STL 是米 | 显式给 mesh `scale`（毫米→`0.001`） | STL 无可靠单位元数据 |
| 只偏移 visual mesh 来"修正"运动学 | 改 link 与 joint 帧 | 掩盖真错，下游全错 |
| 编一批 `disable_collisions` 让规划跑通 | 用 Setup Assistant 生成矩阵 | 过期/编造的 disable 会藏住真碰撞 |
| 把 `motion_bounds_mm` 放宽以消告警 | 只依据真实打印机 profile 设 | 掩盖未知 G-code = 撞机风险 |
| MQTT publish 成功即认为开始打印 | 查状态/UI/肉眼确认 | publish 只是请求 |
| 源数据缺失/冲突时给 pass 或 fail | 标 `❓ need more info` | 保守是预检的全部价值 |
| 手工挑 Viewer 端口 | 读 `--json` 回报的端口 | 与自动扫描和复用逻辑打架 |
| 为换目录起第二个 Viewer | 单服务器 + `?dir=` | 服务器是 dynamic-root |
| 把 implicit-cad 的 SDF 当 SDFormat | 认清同名不同物 | 本领域最易误路由处 |
| API 不可达就报"件不存在" | 带网络权限重试一次 | 不可达是不确定，不是否定 |

# Part 8: 本地运行时

部署事实（路径、Python 版本、venv、符号链接、跨项目调用模板、维护命令）不放本 Anchor，见 `KI/Internal_KI/patterns/PAT-037__cross-project-cad-shared-runtime.md`。

一句话要点：**这些 skill 带运行时**，不是纯文档 skill——必须用共享 venv 的解释器（Python ≥3.12，含 build123d + cadquery-ocp），不能用系统或项目自己的 python。
