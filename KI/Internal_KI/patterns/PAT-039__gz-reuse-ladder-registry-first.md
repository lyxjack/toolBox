---
id: PAT-039
type: pattern
title: "滚子复用三级阶梯：注册表直用 > 整件复用 > 资产复制"
status: active
created: "2026-07-30"
tags:
  - "pattern/reuse"
  - "engine/cocos"
  - ki/pattern
complements:
  - "[[ERR-069__cocos-mcp-tool-quirks-collection|ERR-069]]"
trigger_condition: "user_explicit"
aliases:
  - "PAT-039"
mem_ref: "019fb1a7-a5fd-75c3-9dff-f142f13e5bea"
mem_status: "linked"
---

# 滚子复用三级阶梯：注册表直用 > 整件复用 > 资产复制

## 适用场景
掼蛋（或任何 kds 平台新游戏）要补一块滚子已有的能力（音效/聊天/面板/资产）时，按成本从低到高走三级判据，**先探平台注册表，别上来就复制文件**。用户令「能在滚子里找到复用的优先复用」的工程化落地。

## 步骤
1. **L1 注册表直用（零复制）**：查平台级注册表是否已全局注册该能力——典型如 `WM_YWDLGZ_Live` 场景 AudioManager.audioDefines（逻辑名→bundleAssetName）、bundle_map.json（资产名→bundle）。已注册 → 新游戏直接引用逻辑名/资产名即可（例：gdAudio.ts 一张 SFX 映射表接通 8 音效，零资产复制零场景手术）。副产品：对未注册名静默的注册表（AudioManager.getClip 返 null）天然支持**探测式挂点**——挂点先上、资产后到即插即响（gdVoice 语音报牌）。
2. **L2 整件复用（零新建）**：独立 UI 件若与游戏语义解耦（聊天面板、记牌器骨架），直接 UIManager 按名 push 滚子 prefab（例：WMGZChatLayer_l）；数据目录（文案/表情帧）经组件静态表在运行期换成本游戏内容。先查克隆遗产——GD 牌桌 prefab 由滚子克隆而来，chatDefine/btn_chat2 等旧节点可能已在场。
3. **L3 资产复制入本游戏 bundle（最后手段）**：语义强绑定或需改造的资产才复制（牌面皮肤先例）；复制必附三步入库契约（文件落 bundle + bundle_map assetNames 注册 + 场景/组件绑定），并遵守 sprite-frame/audio-clip 导入即验。
4. 每级决策记档：复用了什么、没搬什么（滚子专属语境资产列清单）、耦合风险（如 L1 耦合平台 bundle 存续期）。

## 反模式
| 错误做法 | 正确做法 | 关联错误 |
|---|---|---|
| 上来就复制 mp3/png 进新 bundle 再想注册 | 先查注册表，已注册则零复制 | [[ERR-079__png-import-texture-type-spriteframe-missing|ERR-079]] |
| 为改滚子组件数据而换掉整个组件（cid 手术） | 数据换血：新增小组件在 start() 原地改写静态目录，帧绑定留在原组件 | （MCP 改 prefab 脚本组件 classId 的教训；对应错题本条目尚未建档，勿按 ERR-016 引用——该号已属 cocos-ttf-bundle 主题） |
| 用 MCP 硬写自定义类数组属性 | @property 默认值 + 卸载重挂令其序列化入 prefab | [[ERR-069__cocos-mcp-tool-quirks-collection|ERR-069]] |
