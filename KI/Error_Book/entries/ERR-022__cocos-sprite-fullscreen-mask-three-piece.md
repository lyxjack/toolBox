---
id: ERR-022
type: error
errorCode: BHV-006
severity: medium
status: open
recurrence: 1
firstSeen: 2026-05-15
tags:
  - error/medium
  - engine/cocos
  - asset/prefab
  - ui/mask
  - sprite-size-mode
  - errorCode/BHV-006
  - ki/error-book
prevention: "Cocos 全屏 dim mask 必须三件套：cc.Sprite.type=SLICED + sizeMode=CUSTOM + UITransform.contentSize=view.getVisibleSize()。直接拿 popbg/common 这类小尺寸 sprite（50x50）放上去，默认 type=SIMPLE + sizeMode=TRIMMED 会让它渲染成 50x50 小方块 = 屏幕中央一个小黑块，不是全屏。MCP 限制：cc.Sprite.sizeMode/type 不允许通过 set_component_property 写（allowlist 拒绝），必须在 ts 代码里 runtime 改。"
aliases:
  - ERR-022
---

# Cocos 全屏 dim mask 三件套缺一不可 — 否则只是个小方块

## 错误现象

写新弹窗 prefab 时给 maskPanel：
- 加 `cc.Sprite` 组件
- 设 `spriteFrame = popbg/common`（项目通用 dim mask 图片）
- 设 `color = (0, 0, 0, 180)`（黑色 70% alpha）
- 设 `UITransform.contentSize = 720 × 1334`

预期：全屏黑色 70% 半透明 dim 层。
实际：**屏幕中央一个 ~50×50 的黑色小方块**，弹窗其余部分背后的界面完全不被遮挡。

视觉表现：popup 显示正确，但 popup 周围的 homeView / settingView / gameView 等不受 dim 影响 → 弹窗"漂浮"在亮的背景上，没有聚焦感。

## 根因分析

cc.Sprite 渲染大小由三个属性共同决定：

| 属性 | 默认值 | 行为 |
|------|--------|------|
| `Sprite.type` | `SIMPLE`(0) | 整张图按 1:1 像素渲染（除非配合下面字段拉伸） |
| `Sprite.sizeMode` | `TRIMMED`(1) | **强制 UITransform.contentSize 跟随 spriteFrame 的 trimmed 自然尺寸** — 即使你设了 contentSize 也会被覆盖回 sprite 的尺寸 |
| `UITransform.contentSize` | (sprite 自然尺寸) | 仅在 sizeMode=CUSTOM 时才被尊重 |

`popbg/common.png` 自然尺寸 50×50，是项目预置的"种子图"，配合 SLICED 9-slice 拉伸成任意大小用。

如果只设 `contentSize = 720×1334`：
- sizeMode=TRIMMED 触发"contentSize 跟 sprite 走" → contentSize 被覆盖回 50×50
- 整个 maskPanel 节点实际只占 50×50 屏幕区域
- 渲染：屏幕中央一个小黑方块

## 解决方案

### 全屏 dim mask 三件套

```ts
import { Sprite, UITransform, view } from 'cc';

const maskSprite = maskNode.getComponent(Sprite);
const maskUT = maskNode.getComponent(UITransform);
if (maskSprite) {
    maskSprite.type = Sprite.Type.SLICED;           // 9-slice 支持拉伸
    maskSprite.sizeMode = Sprite.SizeMode.CUSTOM;   // 解放 contentSize 控制权
}
if (maskUT) {
    const vs = view.getVisibleSize();
    maskUT.setContentSize(vs.width, vs.height);     // 用全屏尺寸（适配不同 aspect）
}
// 颜色（如果还没设）：
// maskSprite.color = new Color(0, 0, 0, 180);
```

### 为什么不能在 prefab 编辑器里直接设 sizeMode

MCP `component_set_component_property` 对 cc.Sprite 的允许字段：
```
__scriptAsset, node, __prefab, sharedMaterials, customMaterial, color,
spriteAtlas, spriteFrame, fillCenter
```

`sizeMode` 和 `type` 不在 allowlist（虽然 `type` 通过 batch_set_properties 能写）。所以唯一可靠路径：**ts 代码 runtime 改**。

或者：编辑器手动点属性面板下拉框（Image → Type=SLICED, Size Mode=CUSTOM），然后另存。

### 参考标杆：BaseViewCmpt.addMask

`assets/script/components/baseViewCmpt.ts` 的 `addMask()` 方法是项目里的标准模式：

```ts
addMask() {
    let maskNode = new Node();
    maskNode.layer = Layers.Enum.UI_2D;
    maskNode.addComponent(UITransform);
    let maskSprite = maskNode.addComponent(Sprite);
    maskSprite.type = Sprite.Type.SLICED;            // ← 三件套之一
    maskSprite.sizeMode = Sprite.SizeMode.CUSTOM;    // ← 之二
    let trans = maskNode.getComponent(UITransform);
    trans.setContentSize(view.getVisibleSize());     // ← 之三
    maskSprite.color = new Color(0, 0, 0, 180);
    this.node.addChild(maskNode);
    maskNode.setSiblingIndex(-2);
    CocosHelper.updateCommonSpriteSync(maskNode, 'popbg/common');
    maskNode.addComponent(BlockInputEvents);
}
```

可以直接 `this.isMask = true`（在 prefab 设或在 onLoad 前设）让 BaseViewCmpt 自动 addMask。

### 重要：避免 double-mask

如果手动建了 maskPanel 子节点 + 又 `isMask=true` 触发 addMask()，两个 mask 叠加 → dim 双倍变非常黑。要么二选一：
- 用基类 auto-mask（`isMask=true`）+ 不要手动 maskPanel
- 用手动 maskPanel + 在 onLoad 第一行 `this.isMask = false;`（在 super.onLoad 之前）

## 预防规则

**做任何全屏 dim / overlay / 半透明背景时**：

1. **第一反应查 spriteFrame 自然尺寸** — 项目的 popbg/common 是 50×50。任何 < 100px 的小图都必须走"三件套"才能全屏。
2. 三件套一句话：`type=SLICED + sizeMode=CUSTOM + contentSize=visibleSize`。
3. 优先用基类 `addMask` —— `isMask=true` 让 BaseViewCmpt 自动处理。手动只用于特殊场景。
4. 改完后**必须用 Preview 实测看到全屏 dim**，不能只看 prefab JSON 里 contentSize 设了 720×1334 就以为生效（sizeMode=TRIMMED 会把它吃回去）。
5. 双 mask 必查 — `isMask=true` + 手动 mask 共存等于 dim 双倍。

> CI: Tier 2 only — 三件套缺失只在 runtime 渲染时表现为视觉问题（小方块），源码里 `setContentSize(720, 1334)` 和 `sizeMode=CUSTOM` 分两处写也是合法。静态 regex 难以可靠绑定"使用 popbg/common"和"必须改 sizeMode"两步逻辑。Tier 2 召回 = 用户说"dim 没遮住"、"mask 不全屏"、"popup 周围还看得见"时优先加载本条。

## 关联

- ERR-021: prefab_create_prefab 丢 sub-children 属性 — 同 session 一起踩。设了 spriteFrame 后被 create_prefab 丢，再补设的时候要补全三件套。
- ERR-013: partial-prefab-copy 断 layout — 同属"prefab 子节点属性丢失"家族
- `assets/script/components/baseViewCmpt.ts` 的 addMask() 方法是项目内标杆实现
- `assets/resources/popbg/common.png` 是项目通用 dim mask 种子图（50×50）
