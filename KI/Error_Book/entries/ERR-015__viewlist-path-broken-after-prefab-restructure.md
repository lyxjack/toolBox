---
id: ERR-015
type: error
errorCode: BHV-001
severity: medium
status: resolved
recurrence: 1
firstSeen: 2026-05-10
lastSeen: 2026-05-10
tags:
  - error/medium
  - engine/cocos
  - project/kingDianPuzzle
  - errorCode/BHV-001
  - architecture/prefab-coupling
  - ki/error-book
prevention: "BaseViewCmpt.viewList.get() 不要用深层硬编码路径访问 prefab 节点。改成：取一个稳定的祖先节点（如 top/life），然后在子树里按 name 递归搜目标。否则用户在编辑器给目标外面套一层 wrapper（无 name 或加 anim 容器）就会让 viewList 路径失配，UI 静默失效（updateLabelText 对 null 是 no-op，不报错，bug 极难察觉）。"
aliases:
  - ERR-015
---

# kingDianPuzzle homeView lbLife/lbCountdown viewList 硬编码路径在用户改 prefab 后失效

## 错误现象

V2.0 体力 UI 微调任务（REQ-20260510-193447）：用户在 Cocos 编辑器里把 lbCountdown 上移到 lbLife 旁边，做的具体动作是**给 lbLife 外层套了一个无名 wrapper 节点（实际是把 lbLife 挪到了 "life > <空名> > lbLife" 的位置）**。

Agent 之前的代码用硬编码路径：

```ts
this.lbLife = this.viewList.get("page/view/content/home/top/life/lbLife");
this.lbCountdown = this.viewList.get("page/view/content/home/top/life/lbCountdown");
```

用户预览：lbLife **不显示体力数字**（白色不白色、有没有数字都看不到）。但**没有任何报错** —— `CocosHelper.updateLabelText(undefined, value)` 对 null/undefined node 是静默 no-op。

## 根因

`BaseViewCmpt.selectChild` 按 prefab 树构建 viewList：路径是用每个节点的 `_name` 串接而成。

```ts
const childPath = curPath ? `${curPath}/${childNode.name}` : childNode.name;
this.viewList.set(curPath, curNode);
```

当用户在编辑器里给 lbLife 外面套一层 wrapper（即使 wrapper 是无名字符串 ""），lbLife 的 viewList key 就变成 `page/view/content/home/top/life//lbLife`（中间多了一段空 segment）。原来的 `top/life/lbLife` 自然取不到，返回 undefined。

Cocos 项目里 prefab 是设计师 / 美术 / 程序共同编辑的对象，prefab 内部包裹层数 / 命名是非稳定的，**程序代码不应该和深层路径强耦合**。

## 错误传播为什么这么隐蔽

| 链节 | 行为 |
|------|------|
| `viewList.get("...top/life/lbLife")` | 返回 undefined |
| `this.lbLife = undefined` | 字段赋值，无运行时错误 |
| `CocosHelper.updateLabelText(this.lbLife, value)` | 内部 `if (!node) return;` 静默退出 |
| `this.lbLife?.getComponent(Label)` | 可选链 → undefined |
| TS 编译 | 字段声明是 `Node = null`，无 strict 模式抓不到 |

结果：**完全没有警报**。Bug 只有靠人眼视觉发现。

## 正确做法

在一个**稳定的祖先节点**（用户极少会动的容器）下，按 name 递归搜目标：

```ts
// 1. 稳定锚点：top/life 这一层一直在
const lifeRoot = this.viewList.get("page/view/content/home/top/life");

// 2. 子树里按 name DFS 找
this.lbLife = this.findDescendantByName(lifeRoot, 'lbLife');
this.lbCountdown = this.findDescendantByName(lifeRoot, 'lbCountdown');

// 工具方法
private findDescendantByName(root: Node, name: string): Node {
    if (!root) return null;
    const stack: Node[] = [root];
    while (stack.length > 0) {
        const cur = stack.pop();
        if (cur.name === name) return cur;
        for (const c of cur.children) stack.push(c);
    }
    return null;
}
```

要点：
- **锚点要稳**：选一个语义稳定的祖先（如 `top/life` 一定是"体力 UI 容器"），不会被 prefab 改动拆解
- **目标 name 要唯一**：lbLife / lbCountdown 在这个子树里全局唯一
- **回 null 不崩**：找不到时返回 null，下游用 `if (this.lbLife)` 兜住

## 预防规则

1. **写新 UI 视图组件时，避免 `viewList.get("a/b/c/d/e/f")` 这种 5 层以上的硬编码路径** —— 每多一层都是一个会被人在编辑器里折腾的关节
2. **关键字段在 onLoad 末尾做 null check + console.warn** —— 即使打算静默，也要在开发期能看到：
   ```ts
   if (!this.lbLife) console.warn('[homeViewCmpt] lbLife not found in life subtree');
   ```
3. **CocosHelper.updateLabelText / updateUserHeadSpriteAsync 这类"对 null 安静"的工具函数是双刃剑** —— 它们让代码不崩，但也让 UI 静默失效。Code review 时看到 `updateLabelText(this.foo, ...)` 应主动追问"this.foo 怎么确保非空"
4. **测试不抓这类问题** —— viewList 测试跑不到真实 prefab 树。**必须靠用户视觉验收**，所以 PR 描述里要明示"这个改动会影响 X 视图的 Y/Z 字段，请手测"
5. **错题本召回触发条件**：任何时候要写 `viewList.get` 深路径，先查本条 ERR-015；任何时候用户报告 "XX 不显示 / 不更新"，先怀疑路径失配

## 相关位置

- `assets/script/game/ui/homeViewCmpt.ts:46-65` (onLoad)
- `assets/script/game/ui/homeViewCmpt.ts:278-289` (findDescendantByName)
- `assets/script/components/baseViewCmpt.ts:208-229` (selectChild 路径构建)
- `assets/script/utils/cocosHelper.ts` updateLabelText / updateUserHeadSpriteAsync (静默 no-op 的源头)

## 修复 commit

待 commit（与 REQ-20260510-193447 改动合并）
