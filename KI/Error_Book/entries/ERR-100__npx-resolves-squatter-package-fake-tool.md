---
id: ERR-100
type: error
errorCode: BUILD-TOOL-001
severity: medium
status: resolved
recurrence: 0
firstSeen: "2026-08-04"
tags:
  - ki/error-book
  - error
  - severity/medium
  - tool/npm
  - domain/toolchain
prevention:
  - "**npx 一个『常识性命令名』前, 先确认该名字真是目标工具的发布包名**: tsc 的真包名是
    typescript, `npx tsc` 在没装 typescript 的工程里会去 npm registry 解析同名占位包
    (`This is not the tsc command you are looking for`)。本例占位包是善意的, 恶意抢注包
    就是供应链事故"
  - "**跑类型检查/构建一律用工程内真实二进制**: `<repo>/node_modules/.bin/tsc`(monorepo 借邻仓亦可),
    或 `npx --no-install tsc` 让缺依赖显式失败, 禁止裸 npx 兜底静默下载"
  - "**工具输出先验身份再信结论**: 一条 `tsc --version` / 首行 banner 就能识破冒牌货;
    冒牌工具的『全绿』比报错更危险"
ci_rules: []
mem_ref: b459b6b2-5df9-472a-92db-172861710d49
mem_status: linked
related:
  - Error_Book/entries/ERR-065__external-file-edit-no-recompile-stale-preview-chunk.md
aliases:
  - ERR-100
  - npx假包冒充tsc
  - npx-squatter-fake-tsc
---

# npx 裸调常识命令名, 解析到 registry 占位包冒充真工具

## 错误现象

在 ccc-newkds-gd(Cocos 客户端工程, devDependencies 无 typescript)跑 `npx tsc --noEmit` 验证改动,
返回一屏红底横幅 `This is not the tsc command you are looking for` —— npx 从 registry
下载了名为 `tsc` 的占位包并执行了它。此雷 07-31 已在项目记忆里挂号(「ccc 假 tsc」), 本次复触才蒸馏。

## 根因分析

npx 的解析顺序: 本地 node_modules/.bin → **没有就去 registry 找同名包**。
TypeScript 编译器的包名是 `typescript`, 命令名 `tsc` 在 npm 上是另一个(善意的)占位包。
凡「命令名 ≠ 包名」的常识工具(tsc/node-sass 类), 裸 npx 都可能落到抢注者手里 ——
善意占位只是浪费一次排查, 恶意抢注则是任意代码执行。

## 解决方案

用邻仓真实二进制跑通: `gd-monorepo/node_modules/.bin/tsc --noEmit`(5.9.3), 目标文件零错。
工程本身该不该补 devDependency 另议, 但验证链路不再依赖 npx 网络解析。

## 预防规则

- 想跑的工具不在当前工程里 → 显式指路径, 不裸 npx;
- 必须 npx 时加 `--no-install`, 让缺依赖以失败暴露而非静默下载;
- 同族『工具面假信号』: [[ERR-065__external-file-edit-no-recompile-stale-preview-chunk|ERR-065]]
  是真编译器吃旧产物, 本条是假编译器根本不编译 —— 两者都以「工具跑完了」的姿态掩护结论失真。