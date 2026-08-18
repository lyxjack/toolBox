---
id: PAT-042
type: pattern
title: "静态站增量部署三步法: 硬链克隆 + rsync 增量 + 原子换装"
status: active
created: "2026-08-04"
tags:
  - pattern/deploy
  - ki/pattern
  - domain/webbuild
trigger_condition: "user_explicit"
complements:
  - "[[ERR-100__npx-resolves-squatter-package-fake-tool|ERR-100]]"
related:
  - Internal_KI/patterns/PAT-009__archive-first-outmigration-with-sha256-manifest.md
aliases:
  - PAT-042
  - 静态站增量换装部署
mem_ref: b459b6b2-5df9-472a-92db-172861710d49
mem_status: linked
---

# 静态站增量部署三步法: 硬链克隆 + rsync 增量 + 原子换装

## 适用场景

- 部署物 = 一个静态文件目录(web 构建包), 由 nginx/express 直接按文件服务, **换文件即生效、无须重启进程**;
- 管道慢(家宽单流几十 KB/s)、但两版之间大部分文件不变(美术资产复用, 仅脚本 bundle 改动);
- 实测: 78MB Cocos web-mobile 包, 真实传输 ~150KB, rsync speedup 45×, 全程 90 秒(此前同管道 8 路并行 scp 要 20 分钟)。

## 步骤

1. **发包前指纹验证**(在本地构建产物上): `grep` 新逻辑的特征串(如 `episodeOver&&this.buildSettlePanel`),
   确认要发的包真含本次改动 —— 防「发了个旧包」;
2. **服务器侧硬链克隆**: `cp -al public public.new`(秒级、几乎零磁盘; rsync 更新走 tempfile+rename,
   不会写穿硬链污染现役目录);
3. **本地增量同步**: `rsync -rlptz --delete --stats -e "sshpass -e ssh -p <port>" build/web-mobile/ host:.../public.new/`
   —— 构建器即使全量重写 mtime, delta 算法仍按内容匹配, 只传真实差异;
4. **原子换装 + 留档**: `mv public public.bak-<MMDD-HHMM> && mv public.new public` —— 秒级切换, 备份即回滚点;
5. **三方哈希校验**: 同一文件(主 bundle)在 本地 / 服务器磁盘 / 公网出口 URL 三处 sha256 一致才算发完。

## 反模式

| 错误做法 | 正确做法 | 关联错误 |
|---------|---------|---------|
| 全量 tar/scp 重传(慢管道下几十分钟) | 硬链克隆 + rsync 增量 | — |
| rsync 直写现役目录(传输窗口内新旧混服) | 写克隆目录, 传完原子 mv | — |
| 发完只看 HTTP 200 | 三方 sha256 + 发前 grep 指纹 | [[ERR-100__npx-resolves-squatter-package-fake-tool|ERR-100]](工具面假信号同族) |
| 忘记提醒强刷 | 入口 js 无内容哈希时, 亲验必 Cmd+Shift+R / 无痕窗 | [[ERR-065__external-file-edit-no-recompile-stale-preview-chunk|ERR-065]] |
| 克隆与 rsync 串在同一条命令里 `&&` 不严 | **克隆是 rsync 的前置条件, 必须独立成步并核结果**(见下) | [[ERR-114__measured-the-mechanism-not-the-outcome\|ERR-114]] 同族: 前置没成而后续照跑 |

## 陷阱备忘

- macOS 自带老 rsync 不认 `--info=stats2`, 用 `--stats`;
- sshpass 走 `SSHPASS` 环境变量 + `-e`, 密码不进 argv;
- `--delete` 必须有, 否则被删资源在新版里还魂。
- **硬链克隆失败 ⇒ rsync 静默退化为全量上传, 不报错只是变慢**(2026-08-08 实测: 家宽下 74MB 全量跑满 600s 超时未完; 克隆到位后同一批文件 speedup **42.67**、实传 1.7MB、几十秒收工)。
  两条纪律: ① **克隆独立成步**, 核 `du -sh` 与文件数对得上再发 rsync —— 别把 `ssh 克隆` 与 `rsync` 塞进同一条命令靠 `&&` 兜底(克隆那条 ssh 失败时 rsync 仍会跑起来);
  ② rsync 结束后**必看 `speedup`** —— 数值接近 1 就是没吃到增量, 说明基线目录不对或没建成, 别把"传完了"当"传对了"。
- **密码认证会瞬时被拒**(sshd 对密集连接限流): 部署脚本里的每一步都要能独立重试, 不要设计成"一条长命令跑到底";
  `public` 因原子换装始终完好, 中断只脏 `public.new`, 重来即可 —— 这正是克隆+换装模式的价值所在。

## 关联错误

- [[ERR-065__external-file-edit-no-recompile-stale-preview-chunk|ERR-065]] — 缓存吃旧产物族: 部署侧的对应物就是「无哈希文件名 + 浏览器缓存」;
- 溯源: [[PAT-009__archive-first-outmigration-with-sha256-manifest|PAT-009]] 的 sha256 清单纪律在本模式里收敛为「三方校验」一步。