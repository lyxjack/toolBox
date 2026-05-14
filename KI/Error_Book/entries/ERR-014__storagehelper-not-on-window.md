---
id: ERR-014
type: error
errorCode: BHV-002
severity: medium
status: resolved
recurrence: 2
firstSeen: 2026-05-04
lastSeen: 2026-05-10
tags:
  - error/medium
  - engine/cocos
  - project/kingDianPuzzle
  - errorCode/BHV-002
  - testing/coverage-blind-spot
  - ki/error-book
prevention: "Cocos Creator 项目里任何 `export let X = new ...()` 单例若需要在浏览器 console 调试，必须显式 `if (typeof window !== 'undefined') (window as any).X = X;` 同文件挂载。**单测 / CI 验证不到这一点**——它们在 module scope 跑，永远看不到 console 用户的 global scope 视角。新增 console 调试入口必须做 boot-time smoke check 或文档明示。"
aliases:
  - ERR-014
---

# kingDianPuzzle 控制台跳关误用 StorageHelper.setData —— 它没挂在 window 上

## 错误现象

用户问"想回到第一关，告诉我代码"，Agent 直接照搬 CLAUDE.md 里那句 `StorageHelper.setData('Level', targetLevel)`，让用户在浏览器 console 执行：

```js
StorageHelper.setData('Level', 1)
```

用户反馈"这个代码不对"。

## 根因

`assets/script/utils/storageHelper.ts:219` 是 `export let StorageHelper = new Helper();` —— 模块内导出，并未挂到 `window`。Cocos Creator 预览构建对模块作用域是封闭的，控制台拿不到这个符号，执行直接 ReferenceError。

CLAUDE.md "How to Test" 段写的 `StorageHelper.setData('Level', targetLevel)` 是给开发者看的"语义示意"，不是可粘贴执行的 console 命令。Agent 把语义当成了可执行代码。

## 正确做法

控制台跳关必须直接操作 `localStorage`（这就是 `StorageHelper` 内部最终落地的存储）：

```js
localStorage.setItem('Level', '1'); location.reload();
```

值要用字符串（`StorageHelper.getData` 走 `JSON.parse`，纯数字字符串能 parse 回 number）。

## 预防规则

1. **CLAUDE.md 里的"语义示意"不能直接当 console 命令贴给用户** —— 先 grep 确认这个符号是否真的挂在 window 上（`window.X = ...` 或 `globalThis.X = ...`）；不挂就给底层 API（localStorage / sys.localStorage）的等价写法。
2. **被指出"代码不对"时第一反应是核对 export 形式与挂载点**，而不是换语法糖。
3. **该错题本身的存在就是预防** —— 后续 kingDianPuzzle 跳关、改金币、清存档之类的 console 一行流，全部直接给 localStorage 调用。

## 相关位置

- `assets/script/utils/storageHelper.ts:9` `StorageKey` 类（key 字面量定义）
- `assets/script/utils/storageHelper.ts:219` `export let StorageHelper`
- 项目 CLAUDE.md "How to Test" 段的 `StorageHelper.setData('Level', targetLevel)` 是示意，非命令

---

## 复发案例 (2026-05-10) — V2.0 体力系统

### 现象

V2.0 体力 ship 后，做完整 5 套 console 测试（StaminaTests / StaminaIntegrationTests / StaminaBuyHeartTests / ServerTimeTests / PersistenceTests），全部 362/362 ✅。然后想验证真实游戏流程，让用户在 console 跑：

```js
GlobalFuncHelper.getHeart()
GlobalFuncHelper.getNextRegenInMs()
```

→ `Uncaught ReferenceError: GlobalFuncHelper is not defined`

### 根因（同 ERR-014 主案例 + 新角度）

V2.0 期间新增/重构了多个 utility singletons：
- `GlobalFuncHelper`（globalFuncHelper.ts）— 体力核心 API，**没挂 window**
- `StorageHelper` / `StorageHelperKey`（storageHelper.ts）— **没挂 window**
- 只有 `ServerTimeManager`（新建 utility）正确挂了 `(window as any).ServerTimeManager = ...`

### **测试为什么没抓到**（这次的新教训）

| 测试层 | 跑在哪 | 看得到 GlobalFuncHelper 吗？ |
|---|---|---|
| StaminaTests（纯函数对照）| module scope | 不需要（影子代码独立） |
| StaminaIntegrationTests | module scope `import { GlobalFuncHelper }` | ✅ 通过 import 拿到 |
| 服务端 vitest（56 个） | Node module scope | 不涉及客户端 |
| 服务端 e2e CI（46 个） | Node module scope + 真实 HTTP | 不涉及客户端 |

**没有任何一层模拟"用户打开 DevTools 在 global scope 跑命令"的场景**。所有测试都通过 `import` 拿到符号，永远看不到 console 用户视角。

### 系统性预防规则（升级版）

1. **Cocos Creator 项目里的可调试单例必须在文件末尾挂 window**（同 .ts 文件，不要散在另一个 bootstrap 模块）：
   ```ts
   export let GlobalFuncHelper = new Helper();
   if (typeof window !== 'undefined') {
       (window as any).GlobalFuncHelper = GlobalFuncHelper;
   }
   ```
2. **新建 utility 类时必须问自己：用户会在 console 调它吗？** 如果 yes 就立刻挂 window；不挂的话别在 CLAUDE.md / 测试 instruction 写"在 console 跑 X.method()"。
3. **CI/单测覆盖范围有边界**——module scope 测试 ≠ console 用户场景。新增 console 调试入口必须人工做 1 次"开 DevTools 输 X" 的 smoke 验证，或加一行 boot-time `console.assert((window as any).X)`。
4. **错题本检索要前置**——本案如果在 V2.0 设计阶段查过 ERR-014（关键字 "window" / "console" / "ReferenceError"），就不会复发。Error Book 召回必须在新建 utility 单例时触发，而不是事后被用户提醒。

### V2.0 复发后修复

```ts
// globalFuncHelper.ts 末尾
if (typeof window !== 'undefined') {
    (window as any).GlobalFuncHelper = GlobalFuncHelper;
}
// storageHelper.ts 末尾
if (typeof window !== 'undefined') {
    (window as any).StorageHelper = StorageHelper;
    (window as any).StorageHelperKey = StorageHelperKey;
}
```

修复后用户重 preview + 刷新 → console 直接可用。
