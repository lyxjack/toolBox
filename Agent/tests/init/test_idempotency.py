"""Tests: Init idempotency and edge cases."""

import json

import pytest

from conftest import run_init, add_ki_entry, VALID_CATEGORIES


class TestIdempotency:
    def test_double_init_preserves_structure(self, tmp_path):
        run_init(tmp_path, project_name="idem", categories=["frontend", "backend"])
        run_init(tmp_path, project_name="idem", categories=["frontend", "backend"])

        assert (tmp_path / "CLAUDE.md").is_file()
        assert (tmp_path / ".claude" / "Internal_KI" / "index.json").is_file()
        assert (tmp_path / ".in-process" / "index" / "archive_manifest.json").is_file()

    def test_ki_entry_file_survives_reinit(self, tmp_path):
        run_init(tmp_path, project_name="survive", categories=["code-design"])
        add_ki_entry(tmp_path, entry_id="KI-001", category="code-design",
                     title="Survivor", summary="s", slug="survivor-entry")

        # Re-init overwrites index.json but .md file should remain
        run_init(tmp_path, project_name="survive", categories=["code-design"])

        assert (tmp_path / ".claude" / "Internal_KI" / "code-design" / "survivor-entry.md").is_file()

    def test_reinit_resets_index(self, tmp_path):
        """Re-init overwrites index.json — entries are lost (documented behavior)."""
        run_init(tmp_path, project_name="reset", categories=["code-design"])
        add_ki_entry(tmp_path, entry_id="KI-001", category="code-design",
                     title="A", summary="a", slug="entry-a")

        run_init(tmp_path, project_name="reset", categories=["code-design"])

        idx = json.loads(
            (tmp_path / ".claude" / "Internal_KI" / "index.json").read_text()
        )
        assert len(idx["entries"]) == 0  # index reset, but file still exists


class TestEdgeCases:
    def test_special_chars_in_project_name(self, tmp_path):
        run_init(tmp_path, project_name="my-app (v2.0)", categories=["code-design"])
        content = (tmp_path / "CLAUDE.md").read_text(encoding="utf-8")
        assert "my-app (v2.0)" in content

    def test_unicode_in_project_name(self, tmp_path):
        run_init(tmp_path, project_name="我的项目", categories=["code-design"])
        content = (tmp_path / "CLAUDE.md").read_text(encoding="utf-8")
        assert "我的项目" in content

    def test_long_project_path(self, tmp_path):
        deep = tmp_path / "a" / "very" / "deeply" / "nested" / "project"
        deep.mkdir(parents=True)
        run_init(deep, project_name="deep", categories=["code-design"])
        assert (deep / "CLAUDE.md").is_file()
        assert (deep / ".claude" / "Internal_KI" / "index.json").is_file()
        assert (deep / ".in-process" / "index" / "archive_manifest.json").is_file()

    def test_all_in_process_subdirs_are_empty_on_init(self, tmp_path):
        run_init(tmp_path, project_name="empty-check")
        ip = tmp_path / ".in-process"
        for sub in ("active", "archive", "audit", "scratch"):
            assert list((ip / sub).iterdir()) == [], f"{sub}/ should be empty"
