---
id: ERR-076
type: error
errorCode: ERR-076
severity: medium
status: resolved
recurrence: 0
firstSeen: "2026-07-28"
tags:
  - ki/error-book
  - error
  - severity/medium
  - domain/platform-convention
  - project/guandan
prevention:
  - "**家法要求『模仿兄弟项目』时, 判据类代码不能照抄, 必须先验本项目实际用的标记**。掼蛋家法是「平台仓内一切模仿 gz(打滚子)」, 于是 `isRobot` 直接照抄 `GZGameRoom.isRobot` 的 `user.loginData.areaID == \"ROBOT\"`; 而掼蛋自己的机器人用的是**平台标准** `accountType == UserDefine.AccountType.Robot`(见 `test/devPlatformShell.ts` 的 `botLoginData`) —— 抄来的判据在本项目里**恒返回 false**, 那条分支从未对真机器人生效过"
  - "**兄弟项目的土办法 ≠ 平台标准**。gz 用 `areaID` 字符串打标是它自己的历史做法; 平台在 `kds-base-define/src/UserDefine.ts` 里有正经的 `AccountType.Robot = 100` 枚举。照抄时要分辨: 抄的是**平台契约**(可信)还是**兄弟项目的私货**(需验)"
  - "**验证方法(成本极低)**: 在本项目里 grep 该标记的**写入方** —— 谁在构造这个字段? 本案 `grep -rn 'areaID' test/ src/` 一眼就能看到仿真壳写的是 `areaID: \"1\"` + `accountType: Robot`, 与抄来的判据对不上"
  - "**这类缺陷不会被测试抓到, 因为测试也照着错判据造数据**。第一版测试用 `areaID: \"ROBOT\"` 造机器人座位 —— 断言自洽地全绿, 但造出来的是本项目里根本不存在的『假机器人』。修复后测试改为造平台标准标记, 并额外钉一条『两种标记都能被认出』"
ci_rules: []
mem_ref: 019faae3-1c68-76a2-9517-c8208c9479f0
mem_status: linked
related:
  - "Error_Book/entries/ERR-074__client-side-irreversible-action-races-server-deadline.md"
  - "Error_Book/entries/ERR-068__fault-tolerance-path-untested-happy-path-only.md"
  - "Internal_KI/patterns/PAT-032__gameid-view-slot-vs-protocol-id.md"
aliases:
  - "ERR-076"
  - "copied-predicate-wrong-marker"
  - "照抄兄弟项目判据认不出本项目机器人"
---

# 照抄滚子的 isRobot, 结果认不出掼蛋自己的机器人

## 背景

掼蛋(kds-game-gd)的家法是「平台仓内一切模仿 gz(打滚子, kds-game-gz)」。
需要判断某座位是不是机器人时, 顺手照抄了兄弟项目的实现。

## 错误现象

```ts
// 抄自 gzRoom.ts:51
isRobot(chairNo: number) {
    let user = this.getUser(chairNo)
    if (user) return user.loginData.areaID == "ROBOT"
    return false
}
```

在掼蛋里**恒返回 false**。依赖它的分支(当时的 `turnTimeout` 机器人分流)
从未对真正的机器人生效过 —— 而且没有任何报错, 只是静默地走了另一条路。

## 根因

两个项目给机器人打标的方式不同:

| 项目 | 标记 | 性质 |
|---|---|---|
| gz(打滚子) | `loginData.areaID == "ROBOT"` | 该项目自己的土办法 |
| **掼蛋** | `loginData.accountType == UserDefine.AccountType.Robot` | **平台标准枚举**(`kds-base-define/src/UserDefine.ts`, `Robot = 100`) |

掼蛋仿真壳 `test/devPlatformShell.ts` 的 `botLoginData` 写的是
`{ areaID: "1", accountType: UserDefine.AccountType.Robot }` —— `areaID` 是 `"1"`, 不是 `"ROBOT"`。

**"模仿 gz"这条家法, 指的是骨架/命名/组织方式, 不包括它的历史私货。**

## 测试也一起错了

第一版测试为了造机器人座位, 用的是 `areaID: "ROBOT"` ——
断言自洽地全绿, 但造出来的是**本项目里根本不存在的假机器人**。
测试与实现共享同一个错误前提时, 绿灯毫无意义。

## 修复

判据取两条并集, 并在测试里各造一种:

```ts
isRobot(chairNo: number) {
    let user = this.getUser(chairNo)
    if (!user || !user.loginData) return false
    if (user.loginData.accountType == UserDefine.AccountType.Robot) return true  // 平台标准
    return user.loginData.areaID == "ROBOT"                                       // gz 兼容
}
```

测试新增三条前置断言(放在依赖它的断言**之前**, 否则那些断言是空转):
认平台标准标记 / 兼容 gz 土标记 / 不误判真人且空座位不抛异常。

## 泛化

**照抄兄弟项目的"判据类"代码前, 先 grep 本项目里该标记的写入方。**

判据(predicate)与骨架(skeleton)的风险不对称:
- 抄骨架错了会**编译不过或跑不起来**, 立刻暴露
- 抄判据错了只会**静默走错分支**, 且测试若照同一错误前提造数据就永远发现不了

高风险信号: 判据读的是**字符串常量约定**(`areaID == "ROBOT"`)而非**类型/枚举**。
字符串约定天然是项目局部的。

家法与验证的边界, 参见 [[ERR-074__client-side-irreversible-action-races-server-deadline|ERR-074]]
同批次的其他教训。
