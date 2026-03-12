"""Tests: Internal KI index.json schema, entry CRUD, naming validation."""

import json
import re

import pytest

from conftest import run_init, add_ki_entry, VALID_CATEGORIES


# ── Naming patterns ──

SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$")
KI_ID_RE = re.compile(r"^KI-\d{3}$")


# ── index.json schema ──


class TestIndexJsonSchema:
    @pytest.fixture(autouse=True)
    def _setup(self, tmp_path):
        run_init(tmp_path, project_name="ki-schema", project_path="/test/ki-schema",
                 categories=["frontend", "backend"])
        self.index = json.loads(
            (tmp_path / ".claude" / "Internal_KI" / "index.json").read_text()
        )

    def test_has_meta(self):
        assert "_meta" in self.index

    def test_meta_project_name(self):
        assert isinstance(self.index["_meta"]["projectName"], str)
        assert len(self.index["_meta"]["projectName"]) > 0

    def test_meta_project_path(self):
        assert isinstance(self.index["_meta"]["projectPath"], str)
        assert len(self.index["_meta"]["projectPath"]) > 0

    def test_meta_version(self):
        assert isinstance(self.index["_meta"]["version"], str)

    def test_meta_last_updated_format(self):
        assert re.match(r"^\d{4}-\d{2}-\d{2}$", self.index["_meta"]["lastUpdated"])

    def test_meta_categories_are_valid(self):
        assert isinstance(self.index["_meta"]["categories"], list)
        for cat in self.index["_meta"]["categories"]:
            assert cat in VALID_CATEGORIES

    def test_meta_categories_match_init(self):
        assert self.index["_meta"]["categories"] == ["frontend", "backend"]

    def test_entries_empty_on_init(self):
        assert isinstance(self.index["entries"], list)
        assert len(self.index["entries"]) == 0


# ── Entry CRUD & Index Sync ──


class TestKiEntryCrud:
    @pytest.fixture(autouse=True)
    def _setup(self, tmp_path):
        self.project = tmp_path
        run_init(tmp_path, project_name="ki-crud",
                 categories=["frontend", "backend", "code-design"])

    def _read_index(self):
        return json.loads(
            (self.project / ".claude" / "Internal_KI" / "index.json").read_text()
        )

    def test_add_entry_creates_md_file(self):
        add_ki_entry(self.project, entry_id="KI-001", category="frontend",
                     title="Component Naming", summary="PascalCase components",
                     slug="component-naming", tags=["naming", "react"])
        assert (self.project / ".claude" / "Internal_KI" / "frontend" / "component-naming.md").is_file()

    def test_add_entry_syncs_index(self):
        add_ki_entry(self.project, entry_id="KI-001", category="frontend",
                     title="Component Naming", summary="PascalCase components",
                     slug="component-naming")
        idx = self._read_index()
        assert len(idx["entries"]) == 1
        assert idx["entries"][0]["id"] == "KI-001"
        assert idx["entries"][0]["category"] == "frontend"
        assert idx["entries"][0]["file"] == "frontend/component-naming.md"
        assert idx["entries"][0]["status"] == "active"

    def test_entry_md_has_required_sections(self):
        add_ki_entry(self.project, entry_id="KI-001", category="frontend",
                     title="Component Naming", summary="s", slug="component-naming")
        content = (self.project / ".claude" / "Internal_KI" / "frontend" / "component-naming.md").read_text()
        for section in ("# Component Naming", "## Metadata", "**ID**: KI-001",
                        "**Category**: frontend", "## 适用场景", "## 规则/模式", "## 关联"):
            assert section in content, f"Missing section: {section}"

    def test_multiple_entries_across_categories(self):
        add_ki_entry(self.project, entry_id="KI-001", category="frontend",
                     title="A", summary="a", slug="entry-a")
        add_ki_entry(self.project, entry_id="KI-002", category="backend",
                     title="B", summary="b", slug="entry-b")
        add_ki_entry(self.project, entry_id="KI-003", category="code-design",
                     title="C", summary="c", slug="entry-c")

        idx = self._read_index()
        assert len(idx["entries"]) == 3
        cats = {e["category"] for e in idx["entries"]}
        assert cats == {"frontend", "backend", "code-design"}

    def test_index_entries_point_to_existing_files(self):
        add_ki_entry(self.project, entry_id="KI-001", category="frontend",
                     title="A", summary="a", slug="entry-a")
        add_ki_entry(self.project, entry_id="KI-002", category="backend",
                     title="B", summary="b", slug="entry-b")

        ki_dir = self.project / ".claude" / "Internal_KI"
        idx = self._read_index()
        for entry in idx["entries"]:
            assert (ki_dir / entry["file"]).is_file(), f"Missing file: {entry['file']}"

    def test_entry_ids_match_pattern(self):
        add_ki_entry(self.project, entry_id="KI-001", category="frontend",
                     title="A", summary="a", slug="entry-a")
        idx = self._read_index()
        for entry in idx["entries"]:
            assert KI_ID_RE.match(entry["id"]), f"Invalid ID: {entry['id']}"

    def test_entry_slugs_match_pattern(self):
        add_ki_entry(self.project, entry_id="KI-001", category="frontend",
                     title="A", summary="a", slug="valid-slug-name")
        idx = self._read_index()
        for entry in idx["entries"]:
            slug = entry["file"].split("/")[-1].replace(".md", "")
            assert SLUG_RE.match(slug), f"Invalid slug: {slug}"


# ── Naming validation (pure, no I/O) ──


class TestNamingRules:
    @pytest.mark.parametrize("slug", [
        "api-error-format",
        "result-type-pattern",
        "a1-b2-c3",
        "ab",
    ])
    def test_valid_slugs(self, slug):
        assert SLUG_RE.match(slug)

    @pytest.mark.parametrize("slug,reason", [
        ("MyComponent", "uppercase"),
        ("my component", "space"),
        ("my_component", "underscore"),
        ("a" * 41, ">40 chars"),
        ("-leading-dash", "leading dash"),
        ("trailing-dash-", "trailing dash"),
        ("a", "single char"),
    ])
    def test_invalid_slugs(self, slug, reason):
        assert not SLUG_RE.match(slug), f"Should reject ({reason}): {slug}"

    def test_slug_max_40_chars(self):
        slug_40 = "a" + "b" * 38 + "c"
        assert len(slug_40) == 40
        assert SLUG_RE.match(slug_40)

    @pytest.mark.parametrize("cat", VALID_CATEGORIES)
    def test_valid_categories(self, cat):
        assert cat in VALID_CATEGORIES

    @pytest.mark.parametrize("cat", ["utils", "misc", "devops", "Frontend", "BACKEND"])
    def test_invalid_categories(self, cat):
        assert cat not in VALID_CATEGORIES
