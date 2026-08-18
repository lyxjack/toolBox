---
id: ERR-103
type: error
errorCode: "BHV-012"
severity: "critical"
status: "resolved"
recurrence: 0
firstSeen: "2026-08-05"
tags:
  - "error/critical"
  - "platform/kds"
  - "ops/deploy"
  - "rpc"
  - "errorCode/BHV-012"
  - ki/error-book
prevention: "平台服务注册表里可能存在**注册了却从无进程**的 phantom 条目（本案 s-dbp-2：配置在、目录无、端口无人监听）。它平时被路由绕过，**任何一次服务重启都可能让 RPC 路由撞上它**，症状是全站功能超时报「内部错误」。应急=重启那个发起调用的服务令其重建连接；根治=让技术方摘掉或补起该条目"
leading_word: "phantom"
aliases:
  - "ERR-103"
  - "phantom-service-registered-without-process"
mem_ref: "019fcf3c-5330-7da3-98d7-3bc8bd4a2146"
mem_status: "linked"
related:
  - "Error_Book/entries/ERR-102__source-edited-but-editor-never-recompiled.md"
  - "Error_Book/entries/ERR-067__exit-nav-relies-on-echo-blocked-by-state-gates.md"
---

# 幽灵服务：注册表里有、进程从来没有 —— 一次重启把全站登录打成「内部错误」

## 错误现象

掼蛋快速模式上测试服后，用户报**游戏打不开**：登录页点下去弹「提示 / 内部错误」。

链路表现极具迷惑性：

- nginx access log 里 `/login/login/channel` 一律 **HTTP 200**（传输层毫无异常）
- 业务返回 `{"errCode":1,"errMsg":"内部错误"}`
- 登录服 `app_error.txt` 只有一条无时间戳的 `unhandledRejection`：
  `Error: rpc call failed method = kds.dbp.kv.delt code = Timeout`
- 数据库代理 `kds-dbp` 进程 **online、CPU 1%、无任何 error 日志**

## 根因

平台服务注册表（`kds-config.js`）里注册了 **两个** 数据库代理：`s-dbp`(45702) 与 `s-dbp-2`(45712)。

```
curl 127.0.0.1:45702/  → HTTP 404   （活着，只是没这个路由）
curl 127.0.0.1:45712/  → HTTP 000   （连接直接失败）
ss -ltnp | grep 45712  → 无人监听
ls -d /data/prod_env/apps/*dbp*  → 只有 kds-dbp，**没有 kds-dbp-2 这个目录**
pm2 list | grep dbp    → 只有一个 kds-dbp
```

**`s-dbp-2` 是个只存在于配置里的幽灵**：没有目录、没有进程、没有监听。它不是这次部署弄坏的，是长期如此。

登录流程要调 `kds.dbp.kv.delt` 删旧令牌。这一调用一旦被路由到幽灵节点，必然超时 → 登录服抛未捕获 rejection → 前端「内部错误」。

**我的责任**：我在部署中重启了游戏服与匹配服。重启会触发 RPC 路由重建，八成正是这一下把 dbp 类调用固定到了死节点上。幽灵是平台既有的，**点燃它的是我的重启**。

## 为什么排查绕了远路

1. **HTTP 200 骗过了第一眼** —— 传输层正常，注意力全被引去业务逻辑。
2. **进程 online 骗过了第二眼** —— `pm2 list` 显示 dbp 健康，于是"dbp 没问题"被当成前提。真相是**同名服务有两个注册项，活的那个健康掩盖了死的那个**。
3. **错误日志无时间戳** —— 无法判断那条 rejection 是刚产生的还是历史遗留，我一度据此判定"与部署无关"（判错了一次）。
4. 我先按"最可能是自己改的东西"回滚了新增配置，登录仍失败 —— **这一步是对的**：它把嫌疑从我的改动上摘了下来，逼我去看平台侧。

## 解决方案

```bash
# 应急（当场恢复，10 秒）：让发起调用的服务重建 RPC 连接、重新选活节点
pm2 restart kds-login --update-env
# 验证：直接打内网登录口，看是否拿到 accessToken
curl -s -X POST http://127.0.0.1:47002/login/channel -H 'Content-Type: application/json' \
  -d '{"apiID":"t_testguest_id_probe","areaID":"1","nickName":"probe","accountType":4,"deviceType":1}'
```

根治须技术方二选一：把 `s-dbp-2` 从 `kds-config.js` 摘掉，或真把它部署起来。

## 预防规则

1. **动平台服务（重启/部署）之前，先点名注册表里每个服务的存活性**，而不只看 `pm2 list`：
   `逐个 curl serviceHost` + `ss -ltnp` 对端口，找出"注册了但没人监听"的幽灵。这类条目是重启的定时炸弹。
2. **`pm2 list` 全绿 ≠ 注册表里的服务都活着** —— 同名服务的多副本（`x` / `x-2`）要分别验，活的那个会掩盖死的那个。
3. **业务返回「内部错误」而 HTTP 200 时，第一站是发起方的 error 日志找超时的 RPC 方法名**，第二站是那个方法的**目标服务端口是否有人监听**，别一头扎进业务代码。
4. **回滚要按"最可能是自己"的顺序做，且每步都验**：本案先撤了新增的场次配置（未恢复）→ 立刻把嫌疑指向平台侧，省下大量时间。回滚不只是止损手段，**也是二分定位手段**。

## 关联

- [[ERR-102__source-edited-but-editor-never-recompiled|ERR-102]] —— 同一次上服里的另一条教训。两条都是"证据取自错误的层"：那条取上游源码当运行期证据，本条取 `pm2 list` 当全链存活证据。
- [[ERR-067__exit-nav-relies-on-echo-blocked-by-state-gates|ERR-067]] —— 同属"平台侧行为把我方链路挡住"，且都要求应急路径不依赖回包。
