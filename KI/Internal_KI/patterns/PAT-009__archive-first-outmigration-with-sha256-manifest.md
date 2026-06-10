---
id: PAT-009
type: pattern
title: "Archive-First 资产/代码外迁 + sha256 JSONL Manifest（可逆瘦身模式）"
status: active
created: "2026-05-19"
tags:
  - "pattern/workflow"
  - "pattern/cleanup"
  - "pattern/asset-management"
  - language/bash
  - language/python
  - ki/pattern
related:
  - "[[ERR-028__compressed-uuid-deadcode-misjudge|ERR-028]]"
  - "[[PAT-006__swarm-3-phase-governance|PAT-006]]"
trigger_condition: "user_explicit"
aliases:
  - "PAT-009"
  - "archive-first-outmigration"
  - "sha256-manifest"
---

# Archive-First 外迁 + sha256 Manifest

## 适用场景

任何 "瘦身但要可逆" 的批量清理任务：
- 上线前删冗余 / 旧版资源 / dev-only 文件
- 不能简单 `git rm` 因为**未来可能要回填**（备用头像、未上线道具图、早期方案代码）
- 需要 audit trail：每个文件啥时候/为什么/从哪移走的
- 跨多个文件类型（png / ts / json / 整个目录树）

**反场景**：临时清理（用 `git rm` 就够）/ 真死代码无回填可能（直接删）。

## 步骤

### 1. 建项目外 archive 根（与 repo 平级）

```bash
ARCHIVE=$(dirname $(pwd))/$(basename $(pwd))_archive
mkdir -p "$ARCHIVE"
```

放在 repo **外部**而非内部子目录，理由：
- 不污染 git status / 不被 build 工具扫到
- 不被 `.gitignore` 复杂规则缠绕
- 用户可独立备份 / 移动 / 跨项目共享

### 2. 初始化 JSONL Manifest

JSONL 而非 JSON 数组的理由：**append-only**（每次外迁新增一行），无需 parse 整个文件，jq 友好。

```bash
cat > "$ARCHIVE/relocation_manifest.jsonl" <<'EOF'
# Schema: { source, dest, sha256, size, moved_at, reason, category }
# 反向回填: cat manifest | jq 'select(.category=="orphan_assets") | .source'
EOF
```

### 3. 安全文件枚举（zsh/macOS 兼容）

```bash
# 关键: find -print0 + while read -d '' 避免 shell 字符串切分
# 错误示范: for src in $(ls ...) — zsh 会把整个输出当单文件名（带空格/中文路径必踩）
while IFS= read -r -d '' src; do
  rel="${src#./}"
  dest="$ARCHIVE/$rel"
  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"

  # sha256 双向校验
  s_sha=$(shasum -a 256 "$src" | awk '{print $1}')
  d_sha=$(shasum -a 256 "$dest" | awk '{print $1}')
  [ "$s_sha" = "$d_sha" ] || { echo "SHA MISMATCH: $src"; exit 1; }

  size=$(stat -f%z "$src")
  # Python JSON 编码避免 bash 字符串转义陷阱（中文路径 + 引号）
  python3 -c "
import json,sys
print(json.dumps({'source':sys.argv[1],'dest':sys.argv[2],'sha256':sys.argv[3],
                  'size':int(sys.argv[4]),'moved_at':sys.argv[5],
                  'reason':'<batch_reason>','category':'<group>'}))" \
    "$src" "$dest" "$s_sha" "$size" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$ARCHIVE/manifest.jsonl"

  rm "$src"   # 校验通过才删
done < <(find <path> -type f -print0)
```

### 4. 空目录清理（可选）

```bash
# rmdir 安全，目录非空时无操作
if [ -z "$(ls -A <dir> 2>/dev/null)" ]; then
  rmdir "<dir>"
  # Cocos 项目: 同时删 <dir>.meta
  [ -e "<dir>.meta" ] && rm "<dir>.meta"
fi
```

### 5. git status 验证

```bash
# tracked files 显示 " D"（前面 1 空格 + D = working tree deleted）
# untracked files 删了 git 看不见 → 不出现
git status --porcelain | grep -c "^ D"
```

**坑：**`git status --porcelain <path>` 只显示该路径下**有 git status** 的文件（modified/staged/untracked），**不显示** tracked + unchanged 的文件。判定 ai/ 是否全 untracked 应该用 `git ls-files <path>` 直查 tracked 列表，**不是** `git status`。本会话 PM 阶段 A1 假设错就栽在这。

### 6. Commit 风格

```bash
git add -A <path>/   # 路径限定，避免 -A 撞到其它改动
git commit -m "$(cat <<'EOF'
chore: <类别> 外迁 N 文件到 archive (REQ-xxx-PhaseN)

外迁 N 文件 (M KB), sha256 全校验通过
manifest: ARCHIVE/manifest.jsonl 累计 K 行
回填命令: rsync -av $ARCHIVE/<group>/ <project>/

Co-Authored-By: ...
EOF
)"
```

### 7. 索引 / README 写入 archive

每个 category 在 archive 内单独写 README：
- 来源说明（哪个 REQ 外迁的）
- 文件清单
- 一键回填脚本（rsync 命令 + 任何代码层 patch 步骤）

## 三个反模式

| 错误做法 | 正确做法 | 后果 |
|---------|---------|------|
| 直接 `rm` 不留 manifest | sha256 manifest + 平级 archive | 未来想回填找不到原始路径 |
| `git rm` 后靠 `git revert` 回填 | archive 外迁 + manifest 索引 | git revert 是 commit 级，不是文件级；多个 REQ 后回退牵连其他改动 |
| `for src in $(ls ...)` 枚举（zsh 字符串切分坑） | `find -print0 + while read -d ''` | 中文/空格文件名整列表被当单文件，rm 报 "File name too long" |
| 把 archive 放 repo 内子目录（如 `.archive/`） | repo 外**平级** | gitignore 复杂、build 工具误扫、git 历史污染 |
| bash heredoc 拼 JSON | Python `json.dumps` | 中文路径 + 嵌套引号必翻车 |

## 复用证据（kingDianPuzzle REQ-20260518-212812）

本 REQ 内**同一模式复用 4 次**，301 manifest 行全 sha256 校验通过零错：

| 类别 | 文件数 | manifest reason | 备注 |
|------|-------|----------------|------|
| ai_workspace | 167 | `ai_folder_outmigration` | 110M 历史素材 + 策划书 |
| dev_tests | 24 | `phase3_test_outmigration` | 12 test .ts + .meta，含完整 rsync 回填 README |
| ccclass-orphan | 6 | `phase5_dead_code_outmigration` | 3 个有逻辑死代码 .ts + .meta |
| orphan_assets | 104 | `phase4_orphan_png_outmigration` | 52 png + 52 .meta（v3 三闸扫描后真孤儿） |

每次都遵循上面 7 步，第二第三次起完全照搬第一次的脚本骨架。模式稳定。

## 与其它模式的边界

- **vs `git rm`**：`git rm` 删 tracked + 同步 stage；本模式是先 archive 外迁、再 `rm`、最后 `git add -A` stage 删除。**优势**：archive 是物理保留可独立访问，不依赖 git 历史
- **vs LFS / external storage**：LFS 是版本控制，archive 是**版本之外的归档**。LFS 还在 git；archive 完全脱离 repo
- **vs `[[PAT-006__swarm-3-phase-governance|PAT-006]]`**：PAT-006 是多 agent 协作模式，本模式是**单 agent 内的批量瘦身**。可在 PAT-006 中作为子 task 调用

## 关联

- [[ERR-028__compressed-uuid-deadcode-misjudge|ERR-028]] — 死代码识别错误三轮演化（哪些是真死可外迁）
- 实现脚本骨架: `kingDianPuzzle/.in-process/archive/20260518-212812-project-cleanup-audit/phase_4/orphan_png_*.json` + state.json history
- Manifest 实例: `/Users/jackliu/dev/kingDian/kingDianPuzzle_archive/relocation_manifest.jsonl`（301 行）
