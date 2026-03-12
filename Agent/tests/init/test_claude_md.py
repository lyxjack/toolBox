"""Tests: CLAUDE.md content conforms to contract."""

import pytest

from conftest import run_init


@pytest.fixture()
def claude_md_content(tmp_path):
    run_init(
        tmp_path,
        project_name="content-test",
        categories=["frontend", "backend", "code-design"],
        tech_stack={"language": "Go", "framework": "Gin", "test": "go test"},
        git_repo="https://github.com/example/repo",
    )
    return (tmp_path / "CLAUDE.md").read_text(encoding="utf-8")


class TestClaudeMdContent:
    def test_contains_project_name(self, claude_md_content):
        assert "# content-test" in claude_md_content

    def test_contains_tech_stack_section(self, claude_md_content):
        assert "## 技术栈" in claude_md_content
        assert "Language: Go" in claude_md_content
        assert "Framework: Gin" in claude_md_content
        assert "Test: go test" in claude_md_content

    def test_declares_Internal_KI_contract(self, claude_md_content):
        assert "{TOOLBOX_ROOT}/KI/Internal_KI/contract.md" in claude_md_content

    def test_declares_Internal_KI_path(self, claude_md_content):
        assert "`.claude/Internal_KI/`" in claude_md_content

    def test_declares_Internal_KI_index(self, claude_md_content):
        assert "`.claude/Internal_KI/index.json`" in claude_md_content

    def test_lists_enabled_categories(self, claude_md_content):
        assert "frontend, backend, code-design" in claude_md_content

    def test_declares_in_process_contract(self, claude_md_content):
        assert "{TOOLBOX_ROOT}/In-Process/contract.md" in claude_md_content

    def test_declares_in_process_path(self, claude_md_content):
        assert "`.in-process/`" in claude_md_content

    def test_declares_archive_manifest_path(self, claude_md_content):
        assert "`.in-process/index/archive_manifest.json`" in claude_md_content

    def test_declares_file_governance(self, claude_md_content):
        assert "{TOOLBOX_ROOT}/Agent/rules/file_governance.md" in claude_md_content

    def test_contains_git_repo(self, claude_md_content):
        assert "https://github.com/example/repo" in claude_md_content

    def test_no_hardcoded_paths(self, claude_md_content):
        import re
        assert not re.search(r"/Users/[a-zA-Z]+/", claude_md_content)
        assert not re.search(r"[A-Z]:\\Users\\", claude_md_content)

    def test_omits_git_section_when_no_repo(self, tmp_path):
        run_init(tmp_path, project_name="no-git", categories=["code-design"])
        content = (tmp_path / "CLAUDE.md").read_text(encoding="utf-8")
        assert "## Git" not in content
