"""Tests: .gitignore contains all required exclusions."""

import pytest

from conftest import run_init, GITIGNORE_REQUIRED


class TestGitignoreContent:
    @pytest.fixture(autouse=True)
    def _setup(self, tmp_path):
        run_init(tmp_path, project_name="gi-test")
        self.content = (tmp_path / ".gitignore").read_text(encoding="utf-8")

    @pytest.mark.parametrize("entry", GITIGNORE_REQUIRED)
    def test_required_exclusion(self, entry):
        assert entry in self.content, f"Missing .gitignore entry: {entry}"


class TestGitignoreAppend:
    def test_preserves_existing_content(self, tmp_path):
        gi = tmp_path / ".gitignore"
        gi.write_text("node_modules/\n.env\n", encoding="utf-8")

        run_init(tmp_path, project_name="append-test")

        content = gi.read_text(encoding="utf-8")
        assert "node_modules/" in content
        assert ".env" in content
        assert ".in-process/active/" in content
