"""Root conftest — shared fixtures for all toolBox init tests."""

import json
import os
import shutil
import tempfile
from datetime import date
from pathlib import Path

import pytest

# ── Valid constants from contracts ──

VALID_CATEGORIES = ("frontend", "backend", "data-logic", "code-design")

IN_PROCESS_SUBDIRS = ("active", "archive", "audit", "index", "scratch")

GITIGNORE_REQUIRED = (
    ".claude/sanitize.map",
    ".claude/.backup-pre-push/",
    ".in-process/active/",
    ".in-process/scratch/",
)


# ── Fixtures ──


@pytest.fixture()
def tmp_project(tmp_path):
    """Yield a fresh temporary directory as a mock project root."""
    yield tmp_path
    # cleanup is automatic via tmp_path


@pytest.fixture()
def inited_project(tmp_path):
    """Yield a project that has already been fully initialised."""
    run_init(
        tmp_path,
        project_name="test-project",
        categories=["frontend", "backend", "code-design"],
    )
    yield tmp_path


# ── Init implementation (system-under-test) ──


def run_init(
    project_dir: Path,
    *,
    project_name: str = "test-project",
    project_path: str | None = None,
    categories: list[str] | None = None,
    tech_stack: dict | None = None,
    git_repo: str = "",
):
    """Reproduce the init protocol from architecture_overview.md §5."""

    if categories is None:
        categories = ["code-design"]
    if tech_stack is None:
        tech_stack = {"language": "TypeScript", "framework": "Next.js", "test": "vitest"}
    if project_path is None:
        project_path = str(project_dir)

    today = date.today().isoformat()

    # ── Step 1: CLAUDE.md ──
    enabled = ", ".join(categories)
    git_section = f"\n## Git\n- **项目 Repo**: {git_repo}\n" if git_repo else ""
    claude_md = f"""# {project_name} — Test Project

## 技术栈
- Language: {tech_stack["language"]}
- Framework: {tech_stack["framework"]}
- Test: {tech_stack["test"]}

## Project-Level Content

### Internal KI（项目知识库）
- **接口契约**: `{{TOOLBOX_ROOT}}/KI/Internal_KI/contract.md`
- **路径**: `.claude/Internal_KI/`
- **索引**: `.claude/Internal_KI/index.json`
- **启用 Category**: {enabled}

开发前必须查询 Internal KI 中与当前任务相关的知识条目。

### In-Process（运行期过程文件）
- **接口契约**: `{{TOOLBOX_ROOT}}/In-Process/contract.md`
- **路径**: `.in-process/`
- **索引**: `.in-process/index/archive_manifest.json`
{git_section}
## 文件治理
本项目遵循 `{{TOOLBOX_ROOT}}/Agent/rules/file_governance.md` 规范。
"""
    (project_dir / "CLAUDE.md").write_text(claude_md, encoding="utf-8")

    # ── Step 2: Internal KI ──
    ki_dir = project_dir / ".claude" / "Internal_KI"
    ki_dir.mkdir(parents=True, exist_ok=True)

    for cat in categories:
        (ki_dir / cat).mkdir(exist_ok=True)

    index_data = {
        "_meta": {
            "projectName": project_name,
            "projectPath": project_path,
            "version": "1.0",
            "lastUpdated": today,
            "categories": categories,
        },
        "entries": [],
    }
    (ki_dir / "index.json").write_text(json.dumps(index_data, indent=4, ensure_ascii=False), encoding="utf-8")

    # ── Step 3: In-Process ──
    ip_dir = project_dir / ".in-process"
    for sub in IN_PROCESS_SUBDIRS:
        (ip_dir / sub).mkdir(parents=True, exist_ok=True)

    manifest = {
        "_meta": {
            "projectName": project_name,
            "projectPath": project_path,
            "description": "Archive index — all completed run records",
            "version": "1.0",
            "lastUpdated": today,
        },
        "entries": [],
        "lifecycle": {
            "activeRetention": "until completion or cancellation",
            "archiveRetention": "90 days",
            "auditRetention": "permanent",
            "scratchRetention": "session-scoped, cleared at session end",
        },
    }
    (ip_dir / "index" / "archive_manifest.json").write_text(
        json.dumps(manifest, indent=4, ensure_ascii=False), encoding="utf-8"
    )

    # ── Step 4: .gitignore ──
    gitignore_block = "\n".join([
        "# Agent Skills — sensitive files",
        ".claude/sanitize.map",
        ".claude/.backup-pre-push/",
        "",
        "# In-Process runtime files",
        ".in-process/active/",
        ".in-process/scratch/",
        "",
    ])
    gi_path = project_dir / ".gitignore"
    existing = gi_path.read_text(encoding="utf-8") if gi_path.exists() else ""
    gi_path.write_text(existing + gitignore_block, encoding="utf-8")


# ── KI Entry helper ──


def add_ki_entry(
    project_dir: Path,
    *,
    entry_id: str,
    category: str,
    title: str,
    summary: str,
    slug: str,
    tags: list[str] | None = None,
):
    """Add a KI entry .md + sync index.json."""
    if tags is None:
        tags = []

    today = date.today().isoformat()
    ki_dir = project_dir / ".claude" / "Internal_KI"

    # Write .md
    md = f"""# {title}

## Metadata
- **ID**: {entry_id}
- **Category**: {category}
- **Tags**: [{", ".join(tags)}]
- **Created**: {today}
- **Last Verified**: {today}

## 适用场景
Test scenario.

## 规则/模式
Test rule content.

## 关联
- None
"""
    cat_dir = ki_dir / category
    cat_dir.mkdir(exist_ok=True)
    (cat_dir / f"{slug}.md").write_text(md, encoding="utf-8")

    # Sync index.json
    idx_path = ki_dir / "index.json"
    idx = json.loads(idx_path.read_text(encoding="utf-8"))
    idx["entries"].append({
        "id": entry_id,
        "category": category,
        "title": title,
        "summary": summary,
        "file": f"{category}/{slug}.md",
        "tags": tags,
        "created": today,
        "lastVerified": today,
        "status": "active",
    })
    idx["_meta"]["lastUpdated"] = today
    idx_path.write_text(json.dumps(idx, indent=4, ensure_ascii=False), encoding="utf-8")


# ── Run helper ──


def create_run(project_dir: Path, run_id: str) -> Path:
    """Create a mock run in .in-process/active/."""
    run_dir = project_dir / ".in-process" / "active" / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    state = {
        "runId": run_id,
        "currentPhase": "EXECUTION",
        "transitions": [{"from": "INTAKE", "to": "PM_ANALYSIS", "timestamp": "2026-03-11T14:30:00Z"}],
    }
    (run_dir / "state.json").write_text(json.dumps(state, indent=4), encoding="utf-8")
    (run_dir / "requirement_package.md").write_text("# Requirement\nTest.", encoding="utf-8")
    (run_dir / "execution_plan.md").write_text("# Plan\nTest.", encoding="utf-8")

    return run_dir
