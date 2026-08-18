"""Policy checks for what may be committed under `models/`.

`models/README.md` states the policy for humans; this module is the enforced
version of the same list. The two are kept in step by
`test_readme_documents_every_allowed_file_type`, so widening the policy means
editing both.
"""

from __future__ import annotations

import subprocess
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
MODELS_DIR = "models"
README_PATH = REPO_ROOT / MODELS_DIR / "README.md"

# Sources and docs that stay readable in normal Git.
TEXT_SUFFIXES = (
    ".py",
    ".md",
    ".implicit.js",
    ".implicit.mjs",
    ".step.js",
    ".urdf",
    ".srdf",
    ".sdf",
)

# Generated CAD, mesh, and fabrication outputs kept in Git LFS. These are the
# model formats CAD Viewer catalogs plus the hidden `.<stem>.step.glb` sidecar.
BINARY_SUFFIXES = (
    ".step",
    ".stp",
    ".stl",
    ".3mf",
    ".glb",
    ".dxf",
    ".gcode",
)

ALLOWED_SUFFIXES = TEXT_SUFFIXES + BINARY_SUFFIXES

# Hidden files under `models/` are CAD Viewer sidecars paired with a STEP file.
HIDDEN_SIDECAR_SUFFIXES = (".step.glb", ".step.js")
STEP_SUFFIXES = (".step", ".stp")

DISALLOWED_KINDS = (
    (
        "review media",
        (
            ".png",
            ".jpg",
            ".jpeg",
            ".gif",
            ".webp",
            ".avif",
            ".bmp",
            ".tif",
            ".tiff",
            ".svg",
            ".mp4",
            ".mov",
            ".webm",
            ".mkv",
        ),
        "render snapshots and orbit animations under /tmp and attach them to the "
        "conversation or pull request",
    ),
    (
        "data and metadata dumps",
        (
            ".json",
            ".yaml",
            ".yml",
            ".csv",
            ".tsv",
            ".txt",
            ".toml",
            ".ini",
            ".xml",
        ),
        "keep model parameters and metadata in the generator source, or "
        "regenerate the sidecar locally as a transient artifact",
    ),
    (
        "archives and foreign CAD sources",
        (
            ".zip",
            ".7z",
            ".tar",
            ".tgz",
            ".gz",
            ".rar",
            ".f3d",
            ".ipt",
            ".iam",
            ".sldprt",
            ".sldasm",
            ".prt",
            ".blend",
            ".scad",
        ),
        "commit the generator and its exported STEP instead of the upstream bundle",
    ),
    (
        "runtime debris",
        (".log", ".lock", ".tmp", ".pyc", ".swp"),
        "keep local runtime output under ignored paths",
    ),
)

DISALLOWED_NAMES = (".DS_Store", "Thumbs.db", "desktop.ini")
DISALLOWED_DIR_NAMES = ("__pycache__", ".cache", ".vite", "node_modules", "dist", "tmp")

README_REFERENCE = (
    "See the File Policy section of models/README.md for the full list and for "
    "how to widen it."
)


def _run_git(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=True,
    )


def _tracked_model_paths() -> list[str]:
    completed = _run_git("ls-files", "-z", "--", MODELS_DIR)
    return sorted(entry for entry in completed.stdout.split("\0") if entry)


def _matched_suffix(name: str, suffixes: tuple[str, ...]) -> str | None:
    """Return the longest allowed suffix `name` ends with, if any.

    A file whose whole name is the suffix (``.py``) is not a source file, so the
    match must leave at least one character of stem behind.
    """
    lowered = name.lower()
    matches = [
        suffix
        for suffix in suffixes
        if lowered.endswith(suffix) and len(lowered) > len(suffix)
    ]
    return max(matches, key=len) if matches else None


def _format_paths(paths: list[str], limit: int = 20) -> str:
    shown = "\n".join(f"  {path}" for path in paths[:limit])
    if len(paths) > limit:
        shown += f"\n  ... and {len(paths) - limit} more"
    return shown


class ModelsDirectoryPolicyTest(unittest.TestCase):
    tracked_paths: list[str]

    @classmethod
    def setUpClass(cls) -> None:
        try:
            cls.tracked_paths = _tracked_model_paths()
        except (OSError, subprocess.CalledProcessError) as error:  # pragma: no cover
            raise unittest.SkipTest(f"git is unavailable: {error}") from error
        if not cls.tracked_paths:
            raise unittest.SkipTest("no tracked files under models/")

    def test_tracked_files_use_allowed_file_types(self) -> None:
        offenders = [
            path
            for path in self.tracked_paths
            if _matched_suffix(Path(path).name, ALLOWED_SUFFIXES) is None
        ]
        self.assertEqual(
            offenders,
            [],
            "models/ accepts CAD/robot sources, generated 3D and fabrication "
            "outputs, and docs only. These tracked files match no allowed type:\n"
            f"{_format_paths(offenders)}\n{README_REFERENCE}",
        )

    def test_tracked_files_exclude_media_and_other_denied_kinds(self) -> None:
        failures: list[str] = []
        for kind, suffixes, remedy in DISALLOWED_KINDS:
            offenders = [
                path
                for path in self.tracked_paths
                if _matched_suffix(Path(path).name, suffixes) is not None
            ]
            if offenders:
                failures.append(
                    f"{kind} must not be committed under models/ "
                    f"({remedy}):\n{_format_paths(offenders)}"
                )

        named_offenders = [
            path for path in self.tracked_paths if Path(path).name in DISALLOWED_NAMES
        ]
        if named_offenders:
            failures.append(
                "runtime debris must not be committed under models/:\n"
                f"{_format_paths(named_offenders)}"
            )

        dir_offenders = [
            path
            for path in self.tracked_paths
            if set(Path(path).parts[:-1]) & set(DISALLOWED_DIR_NAMES)
        ]
        if dir_offenders:
            failures.append(
                "generated or cache directories must not be committed under "
                f"models/:\n{_format_paths(dir_offenders)}"
            )

        self.assertEqual(
            failures, [], "\n\n".join([*failures, README_REFERENCE])
        )

    def test_hidden_files_are_cad_viewer_step_sidecars(self) -> None:
        offenders: list[str] = []
        orphans: list[str] = []
        tracked = set(self.tracked_paths)

        for path in self.tracked_paths:
            name = Path(path).name
            if not name.startswith("."):
                continue
            suffix = _matched_suffix(name, HIDDEN_SIDECAR_SUFFIXES)
            if suffix is None:
                offenders.append(path)
                continue
            stem = name[1 : -len(suffix)]
            parent = Path(path).parent
            if not any(
                str(parent / f"{stem}{step_suffix}") in tracked
                for step_suffix in STEP_SUFFIXES
            ):
                orphans.append(path)

        self.assertEqual(
            offenders,
            [],
            "the only hidden files allowed under models/ are the CAD Viewer "
            "sidecars .<stem>.step.glb and .<stem>.step.js:\n"
            f"{_format_paths(offenders)}\n{README_REFERENCE}",
        )
        self.assertEqual(
            orphans,
            [],
            "these CAD Viewer sidecars have no STEP file beside them; remove "
            "the sidecar or commit the .step/.stp it belongs to:\n"
            f"{_format_paths(orphans)}",
        )

    def test_generated_outputs_are_lfs_tracked(self) -> None:
        binaries = [
            path
            for path in self.tracked_paths
            if _matched_suffix(Path(path).name, BINARY_SUFFIXES) is not None
        ]
        self.assertTrue(binaries, "expected generated model outputs under models/")

        completed = subprocess.run(
            ["git", "check-attr", "filter", "--stdin"],
            cwd=REPO_ROOT,
            input="\n".join(binaries),
            capture_output=True,
            text=True,
            check=True,
        )

        offenders = []
        for line in completed.stdout.splitlines():
            path, _, value = line.rpartition(": filter: ")
            if path and value.strip() != "lfs":
                offenders.append(f"{path} (filter={value.strip()})")

        self.assertEqual(
            offenders,
            [],
            "generated model outputs must be stored in Git LFS; add the missing "
            f"filter rule to .gitattributes:\n{_format_paths(offenders)}",
        )

    def test_readme_documents_every_allowed_file_type(self) -> None:
        readme = README_PATH.read_text(encoding="utf-8")
        undocumented = [suffix for suffix in ALLOWED_SUFFIXES if suffix not in readme]
        self.assertEqual(
            undocumented,
            [],
            "models/README.md must document every file type this policy allows; "
            f"missing: {undocumented}",
        )

        lowered = readme.lower()
        undocumented_kinds = [
            kind for kind, _, _ in DISALLOWED_KINDS if kind.lower() not in lowered
        ]
        self.assertEqual(
            undocumented_kinds,
            [],
            "models/README.md must name every disallowed category this policy "
            f"rejects; missing: {undocumented_kinds}",
        )


if __name__ == "__main__":
    unittest.main()
