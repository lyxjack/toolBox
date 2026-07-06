---
id: ERR-033
type: error
errorCode: "BHV-008"
severity: "high"
status: "resolved"
recurrence: 0
firstSeen: "2026-06-12"
tags:
  - "error/high"
  - "engine/cocos"
  - "lifecycle/onDestroy"
  - "listener-leak"
  - "errorCode/BHV-008"
  - ki/error-book
prevention: "清理钩子'从不触发/监听泄漏'时,先核方法名是否真是引擎生命周期回调(onDestroy/onLoad/onEnable…);自造名(如 onCompDestroy)永不被调用=死代码。根治承重墙级 dead-code cleanup 前,必须对抗审查扫全部受影响 rcDestroy 回调的 identity-guard + 重入安全。"
aliases:
  - "ERR-033"
mem_ref: "705b1054-82b9-409a-bce1-6cb8fcfde2f1"
mem_status: "linked"
---

# DestroyOb.onCompDestroy 死钩子 → 节点级监听从不解绑 → 已销毁层僵尸回调崩溃

## 错误现象

滚子 3.8.6 工程,解散自建房 / 切换 UI 层后,debug 构建 console 反复:

```
TypeError: Cannot set properties of null (setting 'string')
  at WMGZLobbyLayer_p.ts:149   (lblMoney)
  at WMGZCreateGameLayer_p.ts:59 (lblLastDiamond)
  at rcEventDispatcher.dispatch → rcData.set → LogicSrsService.handleNotify(NT_Changed userInfo)
```

已销毁的大厅 / 建房层仍在收 `NT_Changed userInfo` / `Event_UserInfo` 推送,对已置 null 的 Label 写 `.string` 抛错(被 dispatch 的 try/catch 吞掉记日志,不影响功能)。**release 构建静默无报错**(引擎不置空已销毁对象属性,僵尸写入静默发生),与 2.x 线上行为完全一致。曾被 `MIGRATION_STATUS.md §5-e` 标记为"假问题"暂缓。

## 根因分析

`kdCore/UI/DestroyOb.ts` 的清理钩子方法名是 **`onCompDestroy()`** —— **它不是 Cocos 生命周期回调**(引擎只认 `onLoad/onEnable/onDestroy/onDisable…`),全工程**零调用方**,自 2.x 起就是死代码。后果:

- `DestroyOb.onCompDestroy` 从不执行 → `disp_.dispatch("_onDestroy_")` + `disp_.clear()` 从不发生
- 所有经 `rcDestroy(node, fn)` 注册的清理回调从不触发;`rcData.listenget` / `WebCenter.gnet(node)` / `Utils.lifeFunc` 全部经 `rcEventDispatcher.addNode → disp.link(node) → rcDestroy(node, ()=>disp.clear())` 绑定 → **节点级监听从不随节点销毁解绑**(僵尸监听)

**连带既有泄漏(激活清理后才暴露)**:`EventDispatcher.refresh()` 的 `if(isDirty_==false) return` 早退,在 dispatch 之外(销毁时)误提前返回 → 被 disable 的墓碑 `childInfo` 永不从 `childs_` splice → 会话级单例 dispatcher(`datadisp`/`gDisp`)retain 已销毁层闭包(捕获 Node/Label),长会话内存只涨。`isDirty_` 仅在 dispatch 中被置位,销毁时的 `removeChild` 没置位 → prune 不发生。

## 解决方案

**两处 1 行级修复**:

1. `DestroyOb.ts`:`onCompDestroy()` → `protected onDestroy()`,激活标准生命周期清理。
2. `EventDispatcher.ts`:5 个 `remove*` 方法(`removeChild`/`removeFunc`/`removeEventFuncs`/`removeAllChildren`/`removeAll`)在禁用条目后、调 `refresh()` 前补 `this.isDirty_ = true`,使销毁时真正 splice;保留"dispatch 后无脏数据跳过全扫"的热路径优化(别删 refresh 的 isDirty 早退)。

**隔离铁律**:工程内另有 **6 处**同名 `onCompDestroy` 方法(`WechatRecorderComponent`/`PrefabStack`/`WMGZGameLayer_p`/`WMGZSimpleLayer_p`/`WMGZUserLobbyItem_p` + 注释的 `UserUtils`),是各自类的死代码,**与本钩子无关,勿顺手改**。

**激活后浮现的 latent 风险(对抗审查判定既有/非本次引入,但需知悉)**:① modal 字段(`jiesanLayer_`/`resultLayer_`)的 rcDestroy 回调**无条件** null,同帧旧弹窗销毁回调可 clobber 新弹窗引用 → 卡死弹窗(需 identity-guard);② `LogicSrsService` 的 share-link warm-resume 监听在登录时随节点销毁被正确移除 → 登录态点分享链跳转的 roomID 丢失;③ `Display.loadWebTexture` promise 在节点销毁中途永不 settle(但消费方 fire-and-forget + isValid 守卫,无运行期破裂)。

## 预防规则

- **死钩子识别**:任何"清理代码从不跑 / 监听泄漏"现象,第一步核对方法名是否引擎承认的生命周期回调;自定义名(`onCompDestroy` 等)= 死代码,改名到 `onDestroy` 激活前要评估"激活一段从未运行过的清理路径"的回归面。
- **承重墙 dead-code cleanup 根治三件套**:① 对抗审查扫全部受影响 `rcDestroy`/监听回调的 identity-guard(无条件 null 字段是高危)与重入安全;② `EventDispatcher` 类 prune 逻辑改动须保 dispatch 用 slice 拷贝迭代 + enabled 标志 + 延迟 refresh 不变式;③ debug 暴露 / release 静默的差异要在两种构建分别验。
- 触发场景:看到 `Cannot set properties of null (setting 'string')` + 已销毁层收推送 + 该现象 release 不复现时,优先加载本条。

## 关联
- [[ERR-019__cosmetic-change-to-loadbearing-module-unverified|ERR-019]] — 同族:对承重墙模块的改动须验证,本条是"承重墙级 dead-code 激活"的根治案例
- [[ERR-028__compressed-uuid-deadcode-misjudge|ERR-028]] — 同"死代码判定"族:onCompDestroy 是真死代码(零调用),与 ERR-028 的"误判死代码"互为正反
- [[ERR-018__cocos-2x-to-3x-migration-pitfalls|ERR-018]] — 2.x→3.8 迁移负面清单,本 bug 是 2.x 固有、迁移期暴露于 debug
- [[PAT-010__cocos-2x-to-3x-inplace-migration-playbook|PAT-010]] — 原地迁移 playbook,承重墙识别与最小修改原则
