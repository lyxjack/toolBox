---
id: PAT-021
type: pattern
title: "国内 GFW 后 Docker 构建镜像源 build-args 固化(默认官方源 + .env 覆盖)"
status: active
created: "2026-07-07"
trigger_condition: user_explicit
tags:
  - ki/internal
  - pattern
  - trigger/user_explicit
  - topic/docker
  - topic/china-deployment
  - topic/ci
related:
  - "Error_Book/entries/ERR-046__migrate-image-stale-after-manual-migration.md"
  - "Error_Book/entries/ERR-047__docker-credential-helper-not-in-noninteractive-ssh-path.md"
  - "Error_Book/entries/ERR-035__heavy-mcp-repo-vendoring-into-tool-layer.md"
aliases:
  - PAT-021
mem_ref: "a98db73c-c056-43f2-a011-01f1abb37bcd"
mem_status: linked
---

# 国内 GFW 后 Docker 构建镜像源 build-args 固化

## 适用场景

交付包/compose 项目要在**国内(GFW 后)** 与**海外**都能构建,又不想每次在目标机手工 `sed` 改 Dockerfile。首例:KEEP 平台在国内 Mac Mini M4 上部署(2026-07)。

## 核心:三层镜像源,各有其法,默认官方源、国内经 `.env` 覆盖

| 层 | 覆盖对象 | 做法 |
|----|---------|------|
| **宿主 daemon** | docker.io 基础镜像(node/pgvector/otel/squid/curl) | `~/.docker/daemon.json` 加 `"registry-mirrors": ["https://docker.m.daocloud.io"]`,重启 Docker Desktop。**只作用于 docker.io,不管 ghcr.io** |
| **build ARG** | ghcr.io 基础镜像 + PyPI + npm | Dockerfile 用 `ARG BASE_IMAGE=<官方默认>` + `FROM ${BASE_IMAGE}`、`ARG NPM_REGISTRY=<官方>`+`ENV npm_config_registry=${NPM_REGISTRY}`、`ARG UV_DEFAULT_INDEX`;compose `build.args` 透传 `${KEEP_BUILD_*:-<官方默认>}`;国内只在 `.env` 取消注释三个 `KEEP_BUILD_*`(daocloud ghcr / 清华 PyPI / npmmirror) |
| **镜像站没有的** | 特定 ghcr 镜像(如 `ghcr.io/berriai/litellm`,daocloud ghcr 镜像站**没有**) | 从可出网机器 `docker save <img> \| ssh <目标机> 'docker load'`(架构需一致,如 arm64→arm64) |

## 步骤

1. Dockerfile:镜像源做成 `ARG`,**默认值填官方源**(`ghcr.io/...`、`https://pypi.org/simple`、`https://registry.npmjs.org`);镜像站域名**决不硬编码进指令行**(注释可提及)。
2. compose:`build.args` 用 `${KEEP_BUILD_XXX:-<官方默认>}` 透传;不设 = 官方源、海外零影响。
3. `.env.example` 加 CN 段(注释掉的 `KEEP_BUILD_*` 覆盖值 + 宿主 daemon.json/save-load 的说明)。
4. 契约测试守护:断言 Dockerfile **ARG 存在 + 默认官方源 + 指令行不硬编码镜像站**、compose 各服务透传了 build arg、`.env.example` 文档化。防止有人又把镜像站写死回去。
5. litellm 这类镜像站没有的,`save|ssh|load` 传入。

## 反模式

- 在目标机手工 `sed` 改 Dockerfile 的 `FROM`/registry(每次 rsync/更新被覆盖,反复丢失;本模式即为替代它)。
- 把镜像站域名硬编码进 Dockerfile 指令行(海外构建被拖上国内镜像站;违反"默认官方源")。
- 以为 `daemon.json` 的 `registry-mirrors` 能覆盖 ghcr.io(**只作用 docker.io**,ghcr 必须走 ARG 换 base image 或 save/load)。

## 实证

KEEP 2026-07-07 固化后,Mini 真机重建 migrate 镜像验证通过(daocloud ghcr uv 基础镜像可拉);海外本地构建走官方源不受影响;+3 契约测试守护。litellm(1.55GB)经 save/load 传入(daocloud ghcr 无此镜像)。

## 关联

- [[ERR-046__migrate-image-stale-after-manual-migration]] — 迁移镜像重建的连带坑
- [[ERR-047__docker-credential-helper-not-in-noninteractive-ssh-path]] — 远程构建的另一个 PATH 坑
- [[ERR-035__heavy-mcp-repo-vendoring-into-tool-layer]] — 同属"跨机同步/vendoring 的体量与源治理"
