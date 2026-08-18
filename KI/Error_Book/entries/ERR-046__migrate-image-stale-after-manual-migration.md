---
id: ERR-046
type: error
errorCode: BUILD-003
severity: high
status: resolved
recurrence: 0
firstSeen: "2026-07-07"
tags:
  - ki/error-book
  - error
  - severity/high
  - tool/docker
  - tool/alembic
  - topic/migration
prevention: "手动 mount 更新后的 migrations 跑 alembic upgrade 后,必须同步重建 migrate 镜像;否则下次 compose up 时旧镜像(只烘到旧 revision)认不出 DB 的新 revision,alembic 报 Can't locate revision、exit 255,depends_on 卡住全栈。"
aliases:
  - ERR-046
mem_ref: "a98db73c-c056-43f2-a011-01f1abb37bcd"
mem_status: linked
---

# 手动应用迁移后未重建 migrate 镜像 → 下次 compose up 卡死全栈

## 错误现象

给已部署的库补一个新 alembic 迁移时,用**现有 migrate 镜像挂载更新后的 migrations 目录**跑了一次性 `alembic upgrade head`(绕开 GFW 不重建镜像),DB 到了新 revision(如 `mr2_reasoning_uniq`)。**但没重建 migrate 镜像**。下次 `docker compose up` 时 migrate 服务用旧镜像(baked 的迁移文件只到旧 revision `mr1`),`alembic upgrade head` 报:

```
ERROR [alembic.util.messaging] Can't locate revision identified by 'mr2_reasoning_uniq'
FAILED: Can't locate revision ...
```

migrate 容器 exit 255;其余服务 `depends_on: migrate: service_completed_successfully` → **卡住,全栈起不来**。

## 根因分析

migrate 镜像(Dockerfile `COPY migrations/ ...`)把迁移脚本**烘进镜像**。手动 mount 方式应用迁移只改了 DB 的 `alembic_version` 和挂载目录,**没进镜像**。于是出现「DB revision 领先于镜像已知 revision」:alembic `upgrade head` 先要定位 DB 当前 revision,在镜像的脚本集里找不到 → 报错退出。green health 时看不出(migrate 是一次性容器,平时 Exited),直到某次 `up` 才炸。

## 解决方案

1. 立即修:用**固化的 build args**(见 [[PAT-021__cn-gfw-docker-build-mirror-args|PAT-021]])重建 migrate 镜像(migrations 目录已含新脚本),重建后 `upgrade head` 变 no-op、exit 0,`up` 恢复。
2. 根治规则:任何"手动 mount 应用迁移"之后,**同一收尾步骤里重建 migrate 镜像**,别留到下次 up 才发现。

## 预防规则

**手动 mount 跑迁移 = 只改了 DB 与挂载,没进镜像。** 手动应用任何迁移后,必须同步 `docker compose build migrate`(或等价重建),使镜像 baked 的迁移集 ⊇ DB 当前 revision。判据:`docker run --rm <migrate-img> sh -c 'ls /repo/migrations | grep <新revision>'` 应命中。

## 关联

- [[ERR-037__deploy-topology-wiring-gap-silent-under-green-health]] — 同属"green health 掩盖部署缺陷"(本条是 exit-255 卡死型,ERR-037 是静默型)
- [[ERR-030__test-fixture-collides-real-migration]] — 同属 alembic 迁移与镜像/环境错配
- [[PAT-021__cn-gfw-docker-build-mirror-args]] — 重建 migrate 镜像用到的镜像源固化
