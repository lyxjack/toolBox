---
id: ERR-047
type: error
errorCode: BUILD-004
severity: medium
status: resolved
recurrence: 0
firstSeen: "2026-07-07"
tags:
  - ki/error-book
  - error
  - severity/medium
  - tool/docker
  - tool/ssh
  - topic/remote-build
prevention: "经非交互 SSH 远程跑 docker build 前先 `export PATH=/usr/local/bin:$PATH`(或凭证助手所在目录);非交互 SSH 的 PATH 只有 /usr/bin:/bin:/usr/sbin:/sbin,不含 /usr/local/bin,buildkit 内部 shell 出去找 docker-credential-* 靠 PATH,找不到即 build 失败。"
aliases:
  - ERR-047
mem_ref: "a98db73c-c056-43f2-a011-01f1abb37bcd"
mem_status: linked
---

# docker-credential-desktop 不在非交互 SSH 的 PATH → 远程 build 失败

## 错误现象

经 `ssh -o BatchMode=yes <host> 'docker compose build ...'` 远程构建,报:

```
error getting credentials - err: exec: "docker-credential-desktop": executable file not found in $PATH
target <svc>: failed to solve: ...
```

诡异点:同一台机器手动(交互式)构建能成、`docker save`/`docker images` 等命令也正常——唯独远程非交互 build 失败。

## 根因分析

- 非交互 SSH shell 的 PATH 极简:`/usr/bin:/bin:/usr/sbin:/sbin`,**不含 `/usr/local/bin`**(Docker Desktop 的 `docker` 和 `docker-credential-desktop` 装在这里)。
- 平时调 `docker` 用全路径 `/usr/local/bin/docker` 能跑;但 **buildkit 内部** shell 出去调 `docker-credential-desktop`(解析 `~/.docker/config.json` 的 `credsStore: desktop`)时靠 **PATH** 找,找不到 → 拉基础镜像的 auth 解析失败 → build 挂。
- 与镜像是否公有无关:只要 config 有 `credsStore`,每次 registry auth 解析都会触发调用凭证助手。

## 解决方案

远程 build 命令前 `export PATH=/usr/local/bin:$PATH`(把凭证助手所在目录加进 PATH)。示例:
```bash
ssh -i <key> <host> 'export PATH=/usr/local/bin:$PATH; cd <proj>; docker compose build <svc>'
```
备选:清掉 `~/.docker/config.json` 的 `credsStore`(公有镜像无需 auth),但改用户全局配置面更大,优先加 PATH。

## 预防规则

**非交互 SSH 跑任何依赖凭证助手的 docker/build 命令前,先把凭证助手所在目录(macOS 通常 `/usr/local/bin`)加进 PATH。** 症状"手动能构建、远程构建报 credential helper not found"即本条。

## 关联

- [[PAT-021__cn-gfw-docker-build-mirror-args]] — 同属国内 Mac Mini 远程 docker 构建工作流的坑
- [[ERR-046__migrate-image-stale-after-manual-migration]] — 同一部署轮次的另一构建坑
