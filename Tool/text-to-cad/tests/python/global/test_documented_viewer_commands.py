"""Guard the skill-docs-to-bundled-runtime contract for CAD Viewer startup.

`skills/**` is published to consumers who only ever get the *generated* runtime,
so an npm script or CLI flag that exists in `viewer/` but never reaches the
bundle makes the documented startup command fail on every install. These tests
compare what the Markdown tells agents to run against what the bundler actually
generates.
"""

from __future__ import annotations

import json
import re
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
SKILLS_ROOT = REPO_ROOT / "skills"
AGENTS_DOC = REPO_ROOT / "AGENTS.md"
VIEWER_RUNTIME_DIR = REPO_ROOT / "skills" / "cad-viewer" / "scripts" / "viewer"
VIEWER_BUNDLER = REPO_ROOT / "scripts" / "bundle" / "skills" / "bundle-cad-viewer.sh"
SERVER_ARGS_SOURCE = REPO_ROOT / "viewer" / "src" / "server" / "serverArgs.mjs"

# `npm --prefix <dir> run <script>`, the form every skill doc uses.
NPM_PREFIX_RUN_RE = re.compile(
    r"npm\s+--prefix\s+(?P<prefix>[^\s]+)\s+run\s+(?P<script>[A-Za-z0-9:_-]+)"
)
RUNTIME_PACKAGE_HEREDOC_RE = re.compile(
    r'cat > "\$target_dir/package\.json" <<EOF\n(?P<body>.*?)\nEOF\n',
    re.DOTALL,
)
SERVER_FLAG_RE = re.compile(r'arg(?:\s*===\s*|\.startsWith\()\s*"(?P<flag>--[a-z0-9-]+)=?"')
DOCUMENTED_FLAG_RE = re.compile(r"(?<![A-Za-z0-9-])(--[a-z0-9-]+)")


def markdown_files() -> list[Path]:
    files = sorted(
        path
        for path in SKILLS_ROOT.rglob("*.md")
        if "node_modules" not in path.parts
    )
    files.append(AGENTS_DOC)
    return files


def shell_command_lines(text: str) -> list[str]:
    """Every line inside a ```bash / ```console fenced block."""
    lines: list[str] = []
    in_shell_block = False
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("```"):
            language = stripped[3:].strip().lower()
            in_shell_block = not in_shell_block and language in {"bash", "sh", "shell", "console"}
            continue
        if in_shell_block:
            lines.append(line)
    return lines


def generated_runtime_scripts() -> set[str]:
    """Script names the installed CAD Viewer runtime actually defines.

    On a publish branch the generated `package.json` is a real file. In the
    `develop` symlink layout it points back at `viewer/`, which defines scripts
    that are never bundled, so fall back to the bundler's own heredoc.
    """
    runtime_package = VIEWER_RUNTIME_DIR / "package.json"
    if runtime_package.is_file() and not VIEWER_RUNTIME_DIR.is_symlink():
        return set(json.loads(runtime_package.read_text(encoding="utf-8")).get("scripts", {}))

    match = RUNTIME_PACKAGE_HEREDOC_RE.search(VIEWER_BUNDLER.read_text(encoding="utf-8"))
    if match is None:
        raise AssertionError(
            f"Could not find the generated package.json heredoc in {VIEWER_BUNDLER}"
        )
    body = match.group("body").replace("$RELEASE_VERSION", "0.0.0")
    return set(json.loads(body).get("scripts", {}))


def server_accepted_flags() -> set[str]:
    return set(SERVER_FLAG_RE.findall(SERVER_ARGS_SOURCE.read_text(encoding="utf-8")))


def targets_viewer_runtime(doc: Path, prefix: str) -> bool:
    """Does `--prefix <prefix>` in `doc` point at the bundled CAD Viewer runtime?

    Skill docs are run from their own skill directory, and `AGENTS.md` says to
    run from `skills/cad-viewer`, so try both bases.
    """
    runtime = VIEWER_RUNTIME_DIR.resolve()
    bases = (doc.parent, SKILLS_ROOT / "cad-viewer")
    return any((base / prefix).resolve() == runtime for base in bases)


class DocumentedViewerCommandTests(unittest.TestCase):
    def test_documented_npm_scripts_exist_in_the_bundled_runtime(self) -> None:
        available = generated_runtime_scripts()
        self.assertIn("serve", available, "the bundled runtime must define a startup script")

        failures: list[str] = []
        for doc in markdown_files():
            for line in shell_command_lines(doc.read_text(encoding="utf-8")):
                for match in NPM_PREFIX_RUN_RE.finditer(line):
                    prefix = match.group("prefix")
                    script = match.group("script")
                    if not targets_viewer_runtime(doc, prefix):
                        continue
                    if script not in available:
                        failures.append(
                            f"{doc.relative_to(REPO_ROOT)}: `npm --prefix {prefix} run {script}` "
                            f"is not defined by the generated CAD Viewer runtime "
                            f"(defined: {', '.join(sorted(available))})"
                        )

        self.assertEqual(
            failures,
            [],
            "Documented npm scripts must exist in the runtime the bundler generates:\n"
            + "\n".join(failures),
        )

    def test_documented_serve_flags_are_accepted_by_the_server(self) -> None:
        accepted = server_accepted_flags()
        self.assertIn("--dir", accepted, "sanity check on the serverArgs.mjs flag scrape")

        failures: list[str] = []
        for doc in markdown_files():
            for line in shell_command_lines(doc.read_text(encoding="utf-8")):
                match = NPM_PREFIX_RUN_RE.search(line)
                if match is None or match.group("script") != "serve":
                    continue
                if not targets_viewer_runtime(doc, match.group("prefix")):
                    continue
                for flag in DOCUMENTED_FLAG_RE.findall(line[match.end():]):
                    if flag not in accepted:
                        failures.append(
                            f"{doc.relative_to(REPO_ROOT)}: `{flag}` is documented for "
                            f"`run serve` but the server rejects it "
                            f"(accepted: {', '.join(sorted(accepted))})"
                        )

        self.assertEqual(
            failures,
            [],
            "Documented CAD Viewer server flags must be accepted by viewer/src/server/serverArgs.mjs:\n"
            + "\n".join(failures),
        )

    def test_skill_docs_do_not_reference_source_only_launchers(self) -> None:
        """`agent:start` lives in viewer/scripts/, which the bundler never syncs."""
        offenders = [
            str(doc.relative_to(REPO_ROOT))
            for doc in sorted(SKILLS_ROOT.rglob("*.md"))
            if "node_modules" not in doc.parts and "agent:start" in doc.read_text(encoding="utf-8")
        ]
        self.assertEqual(
            offenders,
            [],
            "skills/ docs must not reference agent:start; it is a source-checkout-only launcher "
            f"that is not bundled into {VIEWER_RUNTIME_DIR.relative_to(REPO_ROOT)}: {offenders}",
        )


if __name__ == "__main__":
    unittest.main()
