"""Tests: In-Process init, archive_manifest schema, run lifecycle, scratch, audit."""

import json
import re
import shutil

import pytest

from conftest import run_init, create_run, IN_PROCESS_SUBDIRS


# ── Naming patterns ──

RUN_ID_RE = re.compile(r"^\d{8}-\d{6}$")
AUDIT_FILE_RE = re.compile(
    r"^\d{8}__[a-z0-9-]+__(plan|audit|run|report|analysis)__\d{3}__[a-z0-9-]+\.md$"
)
SCRATCH_FILE_RE = re.compile(r"^_")


# ── archive_manifest.json schema ──


class TestArchiveManifestSchema:
    @pytest.fixture(autouse=True)
    def _setup(self, tmp_path):
        run_init(tmp_path, project_name="ip-schema", project_path="/test/ip-schema")
        self.manifest = json.loads(
            (tmp_path / ".in-process" / "index" / "archive_manifest.json").read_text()
        )

    def test_has_meta(self):
        assert "_meta" in self.manifest

    def test_meta_project_name(self):
        assert isinstance(self.manifest["_meta"]["projectName"], str)
        assert len(self.manifest["_meta"]["projectName"]) > 0

    def test_meta_project_path(self):
        assert isinstance(self.manifest["_meta"]["projectPath"], str)

    def test_meta_description(self):
        assert isinstance(self.manifest["_meta"]["description"], str)

    def test_meta_version(self):
        assert isinstance(self.manifest["_meta"]["version"], str)

    def test_meta_last_updated_format(self):
        assert re.match(r"^\d{4}-\d{2}-\d{2}$", self.manifest["_meta"]["lastUpdated"])

    def test_entries_empty_on_init(self):
        assert isinstance(self.manifest["entries"], list)
        assert len(self.manifest["entries"]) == 0

    def test_lifecycle_has_all_policies(self):
        lc = self.manifest["lifecycle"]
        for key in ("activeRetention", "archiveRetention", "auditRetention", "scratchRetention"):
            assert key in lc

    def test_lifecycle_values(self):
        lc = self.manifest["lifecycle"]
        assert lc["activeRetention"] == "until completion or cancellation"
        assert lc["archiveRetention"] == "90 days"
        assert lc["auditRetention"] == "permanent"
        assert lc["scratchRetention"] == "session-scoped, cleared at session end"


# ── Run lifecycle ──


class TestRunLifecycle:
    @pytest.fixture(autouse=True)
    def _setup(self, tmp_path):
        self.project = tmp_path
        run_init(tmp_path, project_name="lifecycle-test")

    def test_create_run_creates_directory(self):
        run_dir = create_run(self.project, "20260311-143000")
        assert run_dir.is_dir()

    def test_run_id_format(self):
        assert RUN_ID_RE.match("20260311-143000")

    def test_run_contains_state_json(self):
        create_run(self.project, "20260311-143000")
        state_file = self.project / ".in-process" / "active" / "20260311-143000" / "state.json"
        assert state_file.is_file()
        state = json.loads(state_file.read_text())
        assert state["runId"] == "20260311-143000"
        assert "currentPhase" in state

    def test_run_contains_core_artifacts(self):
        run_dir = create_run(self.project, "20260311-143000")
        assert (run_dir / "requirement_package.md").is_file()
        assert (run_dir / "execution_plan.md").is_file()

    def test_archive_run(self):
        """active/{id} → archive/{id}"""
        run_id = "20260311-143000"
        create_run(self.project, run_id)

        active = self.project / ".in-process" / "active" / run_id
        archive = self.project / ".in-process" / "archive" / run_id
        shutil.move(str(active), str(archive))

        assert not active.exists()
        assert archive.is_dir()
        assert (archive / "state.json").is_file()

    def test_update_manifest_after_archive(self):
        run_id = "20260311-150000"
        create_run(self.project, run_id)

        active = self.project / ".in-process" / "active" / run_id
        archive = self.project / ".in-process" / "archive" / run_id
        shutil.move(str(active), str(archive))

        manifest_path = self.project / ".in-process" / "index" / "archive_manifest.json"
        manifest = json.loads(manifest_path.read_text())
        manifest["entries"].append({
            "runId": run_id,
            "taskId": "TASK-001",
            "description": "Test run",
            "status": "archived",
            "archivedDate": "2026-03-11",
            "artifacts": ["requirement_package.md", "execution_plan.md"],
            "kiRefback": {"decisionsExtracted": [], "lessonsExtracted": [], "errorsRecorded": []},
            "tags": ["test"],
        })
        manifest["_meta"]["lastUpdated"] = "2026-03-11"
        manifest_path.write_text(json.dumps(manifest, indent=4))

        updated = json.loads(manifest_path.read_text())
        assert len(updated["entries"]) == 1
        assert updated["entries"][0]["runId"] == run_id
        assert updated["entries"][0]["status"] == "archived"


# ── Scratch lifecycle ──


class TestScratchLifecycle:
    @pytest.fixture(autouse=True)
    def _setup(self, tmp_path):
        self.project = tmp_path
        run_init(tmp_path, project_name="scratch-test")
        self.scratch = tmp_path / ".in-process" / "scratch"

    def test_scratch_file_naming(self):
        name = "_20260311_analysis.md"
        assert SCRATCH_FILE_RE.match(name)
        (self.scratch / name).write_text("# Temp")
        assert (self.scratch / name).is_file()

    def test_scratch_cleanup(self):
        (self.scratch / "_temp1.md").write_text("a")
        (self.scratch / "_temp2.md").write_text("b")

        for f in self.scratch.iterdir():
            f.unlink()

        assert list(self.scratch.iterdir()) == []


# ── Audit file naming ──


class TestAuditNaming:
    @pytest.mark.parametrize("name,valid", [
        ("20260311__myapp__audit__001__skill-dedup-review.md", True),
        ("20260311__app__plan__002__init-plan.md", True),
        ("20260311__app__report__003__qa-result.md", True),
        ("20260311__app__run__004__exec-run.md", True),
        ("20260311__app__analysis__005__perf.md", True),
        ("audit_file.md", False),
        ("20260311__myapp__invalid__001__test.md", False),
        ("20260311__MyApp__audit__001__test.md", False),
    ])
    def test_audit_file_pattern(self, name, valid):
        assert bool(AUDIT_FILE_RE.match(name)) is valid

    def test_create_audit_file(self, tmp_path):
        run_init(tmp_path, project_name="audit-test")
        audit_dir = tmp_path / ".in-process" / "audit"
        fname = "20260311__audit-test__audit__001__init-verification.md"
        (audit_dir / fname).write_text("# Audit\nVerification.")
        assert (audit_dir / fname).is_file()


# ── Run ID validation ──


class TestRunIdValidation:
    @pytest.mark.parametrize("rid,valid", [
        ("20260311-143000", True),
        ("20251231-235959", True),
        ("2026-03-11", False),
        ("20260311_143000", False),
        ("20260311", False),
        ("run-001", False),
    ])
    def test_run_id_format(self, rid, valid):
        assert bool(RUN_ID_RE.match(rid)) is valid
