---
id: ERR-024
type: error
errorCode: ISO-004
severity: medium
status: open
recurrence: 1
firstSeen: 2026-05-15
tags:
  - error/medium
  - engine/cocos
  - typescript
  - babel
  - syntax
  - errorCode/ISO-004
  - ki/error-book
prevention: "Cocos 3.8 内置的 Babel TS parser 对两类写法报"Missing semicolon"/"Unexpected token" 错误，会让整个 .ts 文件不可加载（Preview 直接拒绝运行场景）：(1) 箭头函数 body 直接跟 as any 类型断言：`(args) => {body} as any` 必须改成 `((args) => {body}) as any`。(2) 单引号字符串里嵌字面单引号：`'文字 '1' 文字'` 会在第一个内 ' 处提前闭合。改双引号 / 反引号外层即可。两条都要在 Cocos Preview 报错前 grep 体检。"
ci_rules:
  - type: code-pattern-ban
    pattern: "=>\\s*\\{[^}]*\\}\\s+as\\s+any\\b"
    file_pattern: "\\.ts$"
    message: "ERR-024: 箭头函数 body 后直接跟 'as any' Cocos Babel 解析失败。必须 ((args) => {body}) as any 包一层括号"
aliases:
  - ERR-024
---

# Cocos Babel TS 解析两类陷阱 — 整个文件直接拒绝加载

## 错误现象

写 .ts 测试或脚本，编辑器 Console / Preview 报：

```
SyntaxError: /file:/.../X.ts: Missing semicolon. (97:65)

   95 |         if (App.audio && typeof App.audio.play === 'function') {
   96 |             this.originals['audioPlay'] = App.audio.play.bind(App.audio);
>  97 |             App.audio.play = (..._args: any[]) => { /* no-op */ } as any;
      |                                                                  ^
   98 |         }
```

或：

```
SyntaxError: /file:/.../X.ts: Unexpected token, expected "," (138:42)

  136 |     // ============ B. onCloseWrites 幂等 ============
  137 |     private testOnCloseWrites(): void {
> 138 |         this.section('B. onClose 写入语义（幂等 '1'）');
      |                                          ^
```

整个 .ts 文件加载失败 → 引用它的场景 / 模块也炸 → Preview 拒绝启动。

## 根因分析

### 陷阱 1：箭头函数体直接跟 `as any`

```ts
fn = (args) => { body } as any;   // ❌ Babel 解析失败
```

Babel TS plugin 把 `{ body }` 解析成 statement block，然后看到 `} as any`，期望 `;` 结束语句但拿到 `as`，报"Missing semicolon"。

**正版 TypeScript Compiler (tsc) 接受这种写法**，但 Cocos 3.8 内置的是 Babel TS plugin，比 tsc 严格。

修复（包一层括号让箭头函数变成 expression）：

```ts
fn = ((args) => { body }) as any;   // ✅
```

或者干脆别用 arrow + cast，改成 function：

```ts
fn = function (args) { body } as any;  // ✅ Babel 也接受
```

### 陷阱 2：单引号字符串内嵌字面单引号（特别在中文括号附近）

```ts
this.section('B. onClose 写入语义（幂等 '1'）');   // ❌
```

外层是 `'...'`。Babel parser 顺着扫到第一个内层 `'`（在 `'1'` 之前那个）就闭合外层字符串。剩下的 `1'）'` 等就乱了，报"Unexpected token, expected ',' "因为它认为字符串提前结束后函数参数没收尾。

修复（外层换双引号或反引号）：

```ts
this.section("B. onClose 写入语义（幂等 '1'）");   // ✅
this.section(`B. onClose 写入语义（幂等 '1'）`);   // ✅
```

中文括号 `（` 和 `）` 不会触发问题（它们不是 ASCII '），但**单引号字面量是高发陷阱** —— 测试里常引用 storage key 字面量 `'1'` / `'0'` 等。

## 解决方案

### 提交前自动 grep 体检

```bash
# 检测陷阱 1：箭头函数体后直接 as any
grep -nE '=> \{[^}]*\} as any[^)]' assets/script/**/*.ts

# 检测陷阱 2：单引号字符串内嵌单引号（启发式 — 不一定 100% 准但能 flag 高风险行）
python3 -c "
import re, glob
for f in glob.glob('assets/script/**/*.ts', recursive=True):
    for ln, line in enumerate(open(f), 1):
        # strip line comment
        code = line.split('//')[0]
        # find 'xxx'xxx'xxx' triple-quote pattern (excluding escaped \\')
        for m in re.finditer(r\"'([^'\\\\]*'[^'\\\\]*)'\", code):
            print(f'{f}:{ln} candidate nested-quote: {line.rstrip()[:100]}')
"
```

### 修复模板

| 错误 | 正确 |
|------|------|
| `f = (a) => { ... } as any;` | `f = ((a) => { ... }) as any;` |
| `'幂等 '1'）'` | `"幂等 '1'）"` 或 反引号 |
| `'don\'t do that'` | 仍 OK（转义） |
| `"He said \"hi\""` | 仍 OK（转义） |

## 预防规则

**写 .ts 文件时**：

1. **避免**箭头函数体后直接 `as any` —— 永远包括一层 `(...)`
2. **避免**单引号字符串内嵌 `'`（含 `'1'`、`'0'`、`'true'` 等常用字面量）—— 外层用 `"..."` 或 \`...\`
3. 写完 .ts 后**先看 Cocos 编辑器 Console**有没有 SyntaxError 再切 Preview。不要直接点 Preview —— 一旦报 SyntaxError，Preview 就完全起不来，反而不容易看到错误来源（在 Cocos 编辑器 Console 看更直接）
4. 编辑测试文件特别注意 — 测试经常用单引号字面量做 assert message。

**Agent 写 .ts 文件后强制自检步骤**：

```bash
# 1. 看是否有 } as any 跟 ;
grep -nE '} as any' <file>.ts | grep -v ')'

# 2. 看是否有嫌疑 '...''...'... 嵌套
python3 -c "<上面体检脚本>"

# 3. 跑 project_refresh_assets 后等 ~2s，再查 temp/logs/project.log 看 SyntaxError
```

> CI: 陷阱 1（`} as any` 缺括号）已通过 frontmatter `ci_rules` 自动拦截；陷阱 2（单引号嵌套）属 Tier 2 only — 区分合法 `'\''` 转义、模板字符串内嵌、JSDoc 示例等需要词法分析，简单 regex 误伤率高。Tier 2 召回 = 写测试断言 message 含字面 `'1'` / `'0'` 等字符串字面量时优先加载本条。

## 关联

- ERR-002: 严禁 sed/python 改 .prefab/.scene（同属"工具不能假设语法兼容"家族）
- ERR-014: storageHelper-not-on-window（同 .ts 加载失败导致功能失效）
- 实例 session: `.in-process/active/20260514-123313_tutorial/` 写 tutorialIntegrationTests.ts + tutorialUnitTests.ts 期间踩到两类
- Cocos 3.8 内置 Babel TS plugin（不是 tsc）— 比 tsc 严格，部分 TS 标准写法不支持
