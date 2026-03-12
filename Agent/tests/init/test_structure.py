"""Tests: Init creates correct directory structure per architecture_overview.md §5."""

import json

import pytest

from conftest import run_init, VALID_CATEGORIES, IN_PROCESS_SUBDIRS


class TestClaudeMdCreation:
    def test_claude_md_exists(self, inited_project):
        assert (inited_project / "CLAUDE.md").is_file()


class TestInternalKiStructure:
    def test_Internal_KI_dir_exists(self, inited_project):
        assert (inited_project / ".claude" / "Internal_KI").is_dir()

    def test_index_json_exists(self, inited_project):
        assert (inited_project / ".claude" / "Internal_KI" / "index.json").is_file()

    def test_enabled_category_dirs_created(self, inited_project):
        ki = inited_project / ".claude" / "Internal_KI"
        for cat in ("frontend", "backend", "code-design"):
            assert (ki / cat).is_dir(), f"Expected category dir: {cat}"

    def test_disabled_category_dirs_not_created(self, inited_project):
        ki = inited_project / ".claude" / "Internal_KI"
        assert not (ki / "data-logic").exists()

    def test_no_extra_category_dirs(self, inited_project):
        ki = inited_project / ".claude" / "Internal_KI"
        for item in ki.iterdir():
            if item.name == "index.json":
                continue
            assert item.name in VALID_CATEGORIES, f"Unexpected item: {item.name}"

    def test_all_four_categories(self, tmp_path):
        run_init(tmp_path, categories=list(VALID_CATEGORIES))
        ki = tmp_path / ".claude" / "Internal_KI"
        for cat in VALID_CATEGORIES:
            assert (ki / cat).is_dir()

    def test_single_category_minimum(self, tmp_path):
        run_init(tmp_path, categories=["code-design"])
        ki = tmp_path / ".claude" / "Internal_KI"
        assert (ki / "code-design").is_dir()
        assert not (ki / "frontend").exists()
        assert not (ki / "backend").exists()
        assert not (ki / "data-logic").exists()

    def test_empty_categories(self, tmp_path):
        run_init(tmp_path, categories=[])
        ki = tmp_path / ".claude" / "Internal_KI"
        assert (ki / "index.json").is_file()
        dirs = [p for p in ki.iterdir() if p.is_dir()]
        assert dirs == []


class TestInProcessStructure:
    def test_in_process_dir_exists(self, inited_project):
        assert (inited_project / ".in-process").is_dir()

    @pytest.mark.parametrize("subdir", IN_PROCESS_SUBDIRS)
    def test_required_subdirectory(self, inited_project, subdir):
        assert (inited_project / ".in-process" / subdir).is_dir()

    def test_archive_manifest_exists(self, inited_project):
        assert (inited_project / ".in-process" / "index" / "archive_manifest.json").is_file()


class TestGitignore:
    def test_gitignore_exists(self, inited_project):
        assert (inited_project / ".gitignore").is_file()
