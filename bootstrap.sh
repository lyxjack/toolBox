#!/usr/bin/env bash
# bootstrap.sh — toolBox unified init & update entry point
# Usage:
#   New user:  git clone <repo> toolBox && cd toolBox && bash bootstrap.sh
#   Existing:  cd toolBox && git pull && bash bootstrap.sh
#
# Flags:
#   --skip-obsidian     Skip Obsidian setup (use traditional index mode)
#   --non-interactive   Skip all interactive prompts (CI environments)

set -euo pipefail

# --- Source shared utilities ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export TOOLBOX_ROOT="$SCRIPT_DIR"
source "$TOOLBOX_ROOT/Agent/lib/bootstrap-utils.sh"

# --- Parse flags ---
SKIP_OBSIDIAN=false
NON_INTERACTIVE=false

for arg in "$@"; do
  case "$arg" in
    --skip-obsidian)   SKIP_OBSIDIAN=true ;;
    --non-interactive) NON_INTERACTIVE=true; SKIP_OBSIDIAN=true ;;
    --help|-h)
      echo "Usage: bash bootstrap.sh [--skip-obsidian] [--non-interactive]"
      echo ""
      echo "  --skip-obsidian     Use traditional index mode instead of Obsidian"
      echo "  --non-interactive   Skip all interactive prompts (CI environments)"
      exit 0
      ;;
    *)
      log_error "Unknown flag: $arg"
      echo "Usage: bash bootstrap.sh [--skip-obsidian] [--non-interactive]"
      exit 1
      ;;
  esac
done

# --- Determine mode: new user vs existing user ---
LOCAL_VERSION="$(get_local_version)"
REPO_VERSION="$(get_repo_version)"

if [[ -z "$LOCAL_VERSION" ]]; then
  MODE="bootstrap"
  log_step "toolBox Bootstrap — First-Time Setup (v${REPO_VERSION})"
elif version_eq "$LOCAL_VERSION" "$REPO_VERSION"; then
  log_ok "Already up to date (v${REPO_VERSION})"
  exit 0
elif version_gt "$REPO_VERSION" "$LOCAL_VERSION"; then
  MODE="update"
  log_step "toolBox Update — v${LOCAL_VERSION} → v${REPO_VERSION}"
else
  log_warn "Local version (${LOCAL_VERSION}) is newer than repo version (${REPO_VERSION}). Nothing to do."
  exit 0
fi

# ============================================================
# UPDATE MODE — Run migrations and exit
# ============================================================
if [[ "$MODE" == "update" ]]; then
  run_migrations "$LOCAL_VERSION" "$REPO_VERSION"
  set_local_version "$REPO_VERSION"
  echo ""
  log_ok "Updated to v${REPO_VERSION}"
  echo ""
  echo "=== toolBox Update Summary ==="
  echo "  From:    v${LOCAL_VERSION}"
  echo "  To:      v${REPO_VERSION}"
  echo "  See CHANGELOG.md for details"
  echo ""
  exit 0
fi

# ============================================================
# BOOTSTRAP MODE — Full first-time setup
# ============================================================

OS="$(detect_os)"
REPORT_OS="$OS"
REPORT_NODE=""
REPORT_NPM=""
REPORT_CLAUDE=""
REPORT_OBSIDIAN=""
REPORT_MCP=""
REPORT_HOOKS=""
REPORT_STRUCTURE=""
REPORT_KI_MODE=""
REPORT_GLOBAL_CLAUDE=""

# --- Step 1: Detect OS ---
log_step "Step 1/8: Detecting OS"
case "$OS" in
  macos)  log_ok "macOS detected" ;;
  linux)  log_ok "Linux detected" ;;
  wsl)    log_ok "WSL (Windows Subsystem for Linux) detected" ;;
  windows)
    log_error "Native Windows is not supported. Please use WSL2."
    echo "  Install WSL2: https://learn.microsoft.com/en-us/windows/wsl/install"
    exit 1
    ;;
  *)
    log_warn "Unknown OS. Proceeding, but some features may not work."
    ;;
esac

# --- Step 2: Check prerequisites ---
log_step "Step 2/8: Checking prerequisites"

# git
if check_command git; then
  log_ok "git: $(git --version | head -1)"
else
  log_error "git is not installed"
  exit 1
fi

# Node.js
if check_node_version; then
  REPORT_NODE="$(node --version)"
  log_ok "Node.js: ${REPORT_NODE}"
else
  log_error "Node.js >= 18 is required"
  if [[ "$OS" == "macos" ]]; then
    echo "  Install: brew install node"
  else
    echo "  Install: https://nodejs.org/"
  fi
  exit 1
fi

# npm
if check_command npm; then
  REPORT_NPM="$(npm --version)"
  log_ok "npm: v${REPORT_NPM}"
else
  log_error "npm is not installed (should come with Node.js)"
  exit 1
fi

# Claude Code CLI
if check_command claude; then
  REPORT_CLAUDE="installed"
  log_ok "Claude Code CLI: installed"
else
  log_error "Claude Code CLI is not installed"
  echo "  Install: npm install -g @anthropic-ai/claude-code"
  exit 1
fi

# --- Step 3: Validate directory structure ---
log_step "Step 3/8: Validating directory structure"
if validate_structure; then
  REPORT_STRUCTURE="valid"
else
  log_error "Directory structure validation failed. Is this a complete toolBox clone?"
  exit 1
fi

# --- Step 4: Configure Claude Code hooks ---
log_step "Step 4/8: Configuring Claude Code hooks"

SETTINGS_LOCAL="$TOOLBOX_ROOT/.claude/settings.local.json"

# Check if hooks are already configured
if [[ -f "$SETTINGS_LOCAL" ]] && node -e "
  const s = JSON.parse(require('fs').readFileSync('$SETTINGS_LOCAL', 'utf8'));
  process.exit(s.hooks ? 0 : 1);
" 2>/dev/null; then
  log_ok "Claude Code hooks already configured"
  REPORT_HOOKS="configured"
else
  # Write hooks to settings.local.json (gitignored, machine-specific)
  node -e "
    const fs = require('fs');
    const path = '$SETTINGS_LOCAL';
    let s = {};
    try { s = JSON.parse(fs.readFileSync(path, 'utf8')); } catch(e) {}
    s.hooks = s.hooks || {};
    s.hooks.PreToolUse = s.hooks.PreToolUse || [];
    // Add error-book lint hook if not present
    const lintHook = 'node $TOOLBOX_ROOT/Agent/lint/pre-commit-hook.mjs';
    const hasLint = s.hooks.PreToolUse.some(h => h.hooks && h.hooks.includes(lintHook));
    if (!hasLint) {
      s.hooks.PreToolUse.push({
        matcher: 'Bash',
        hooks: [lintHook]
      });
    }
    fs.writeFileSync(path, JSON.stringify(s, null, 2) + '\n');
  "
  log_ok "Claude Code hooks configured in settings.local.json"
  REPORT_HOOKS="configured"
fi

# --- Step 5: Knowledge management mode ---
log_step "Step 5/8: Knowledge management setup"

if [[ "$SKIP_OBSIDIAN" == true ]]; then
  log_warn "Obsidian skipped — using traditional index mode"
  log_warn "Knowledge recall will use index.json + direct file reads (reduced capability)"
  set_config "ki_mode" "traditional"
  REPORT_KI_MODE="traditional (index.json)"
  REPORT_OBSIDIAN="skipped"
  REPORT_MCP="skipped"
elif [[ "$NON_INTERACTIVE" == true ]]; then
  set_config "ki_mode" "traditional"
  REPORT_KI_MODE="traditional (non-interactive)"
  REPORT_OBSIDIAN="skipped"
  REPORT_MCP="skipped"
else
  echo ""
  echo "  Knowledge management mode:"
  echo "    [1] Obsidian (recommended) — full knowledge recall with semantic search"
  echo "    [2] Traditional index     — basic recall via index.json + file reads"
  echo ""
  read -rp "  Choose [1/2] (default: 1): " ki_choice
  ki_choice="${ki_choice:-1}"

  if [[ "$ki_choice" == "2" ]]; then
    log_info "Using traditional index mode"
    set_config "ki_mode" "traditional"
    REPORT_KI_MODE="traditional (index.json)"
    REPORT_OBSIDIAN="skipped"
    REPORT_MCP="skipped"
  else
    # --- Obsidian setup ---
    set_config "ki_mode" "obsidian"
    REPORT_KI_MODE="obsidian (full)"

    # Check if Obsidian is installed
    OBSIDIAN_INSTALLED=false
    if [[ "$OS" == "macos" ]] && [[ -d "/Applications/Obsidian.app" ]]; then
      OBSIDIAN_INSTALLED=true
    elif check_command obsidian; then
      OBSIDIAN_INSTALLED=true
    fi

    if [[ "$OBSIDIAN_INSTALLED" == true ]]; then
      log_ok "Obsidian is installed"
      REPORT_OBSIDIAN="installed"
    else
      log_warn "Obsidian is not installed"
      if [[ "$OS" == "macos" ]]; then
        read -rp "  Install Obsidian via Homebrew? [Y/n]: " install_obs
        install_obs="${install_obs:-Y}"
        if [[ "$install_obs" =~ ^[Yy] ]]; then
          log_info "Installing Obsidian..."
          brew install --cask obsidian
          REPORT_OBSIDIAN="installed"
          log_ok "Obsidian installed"
        else
          echo "  Please install manually: https://obsidian.md"
          echo "  Then re-run this script."
          REPORT_OBSIDIAN="not installed"
        fi
      else
        echo "  Please install Obsidian manually: https://obsidian.md"
        echo "  Then re-run this script."
        REPORT_OBSIDIAN="not installed"
      fi
    fi

    # Guide user through Obsidian configuration
    if [[ "$REPORT_OBSIDIAN" == "installed" ]]; then
      echo ""
      echo "  ┌────────────────────────────────────────────────────┐"
      echo "  │ Obsidian Setup (manual steps required)             │"
      echo "  │                                                    │"
      echo "  │ 1. Open Obsidian                                   │"
      echo "  │ 2. Open folder as vault → select toolBox/KI/       │"
      echo "  │ 3. Settings → Community plugins                    │"
      echo "  │    → Turn OFF Restricted mode                      │"
      echo "  │    → Enable 'Local REST API' plugin                │"
      echo "  │ 4. Local REST API settings → copy the API Key      │"
      echo "  └────────────────────────────────────────────────────┘"
      echo ""

      # Loop until user provides API key or explicitly skips
      while true; do
        read -rp "  Paste your Obsidian API Key (or 'skip' to use traditional mode): " api_key
        if [[ "$api_key" == "skip" ]]; then
          log_warn "Obsidian MCP registration skipped. Falling back to traditional mode."
          set_config "ki_mode" "traditional"
          REPORT_KI_MODE="traditional (index.json)"
          REPORT_MCP="skipped"
          break
        elif [[ -n "$api_key" ]]; then
          # Register MCP server
          log_info "Registering Obsidian MCP server..."
          if claude mcp add obsidian-ki --scope user \
            -e OBSIDIAN_API_KEY="$api_key" \
            -e OBSIDIAN_BASE_URL=https://127.0.0.1:27124 \
            -e OBSIDIAN_VERIFY_SSL=false \
            -e OBSIDIAN_ENABLE_CACHE=true \
            -- npx -y obsidian-mcp-server 2>/dev/null; then
            log_ok "Obsidian MCP server registered globally"
            REPORT_MCP="registered"
          else
            log_error "Failed to register MCP server. You can retry later with:"
            echo "  claude mcp add obsidian-ki --scope user \\"
            echo "    -e OBSIDIAN_API_KEY=<your-key> \\"
            echo "    -e OBSIDIAN_BASE_URL=https://127.0.0.1:27124 \\"
            echo "    -e OBSIDIAN_VERIFY_SSL=false \\"
            echo "    -e OBSIDIAN_ENABLE_CACHE=true \\"
            echo "    -- npx -y obsidian-mcp-server"
            REPORT_MCP="failed"
          fi
          break
        else
          log_warn "API Key cannot be empty. Please paste the key or type 'skip'."
        fi
      done
    fi
  fi
fi

# --- Step 6: Global CLAUDE.md (optional) ---
log_step "Step 6/8: Global CLAUDE.md configuration"

GLOBAL_CLAUDE="$HOME/.claude/CLAUDE.md"
if [[ -f "$GLOBAL_CLAUDE" ]]; then
  log_ok "Global CLAUDE.md already exists at ~/.claude/CLAUDE.md"
  REPORT_GLOBAL_CLAUDE="exists"
elif [[ "$NON_INTERACTIVE" == true ]]; then
  log_info "Skipping global CLAUDE.md (non-interactive mode)"
  REPORT_GLOBAL_CLAUDE="skipped"
else
  echo ""
  echo "  Optional: Configure global CLAUDE.md so toolBox rules apply in ALL projects."
  echo "  (If you only use Claude Code inside the toolBox directory, this is not needed.)"
  echo ""
  read -rp "  Set up global CLAUDE.md? [y/N]: " setup_global
  setup_global="${setup_global:-N}"

  if [[ "$setup_global" =~ ^[Yy] ]]; then
    mkdir -p "$HOME/.claude"
    sed "s|{TOOLBOX_ROOT}|$TOOLBOX_ROOT|g" "$TOOLBOX_ROOT/Agent/templates/global_claude_md.md" > "$GLOBAL_CLAUDE"
    log_ok "Global CLAUDE.md created at ~/.claude/CLAUDE.md"
    REPORT_GLOBAL_CLAUDE="configured"
  else
    log_info "Skipped. You can set this up later — see Agent/guides/setup/README.md"
    REPORT_GLOBAL_CLAUDE="skipped"
  fi
fi

# --- Step 7: Run validation ---
log_step "Step 7/8: Running validation"

if check_command pytest && [[ -d "$TOOLBOX_ROOT/Agent/tests/init" ]]; then
  log_info "Running init test suite..."
  if (cd "$TOOLBOX_ROOT" && pytest Agent/tests/init/ -q 2>/dev/null); then
    log_ok "All init tests passed"
  else
    log_warn "Some init tests failed (non-blocking, toolBox is still usable)"
  fi
else
  # Fallback: basic shell validation
  local_errors=0
  for f in CLAUDE.md VERSION CHANGELOG.md Agent/rules/iron_laws.md Agent/rules/constitution.md; do
    if [[ ! -f "$TOOLBOX_ROOT/$f" ]]; then
      log_warn "Missing: $f"
      local_errors=$((local_errors + 1))
    fi
  done
  # Validate JSON files
  for j in Agent/index/skill_registry.json KI/External_KI/master_index.json; do
    if [[ -f "$TOOLBOX_ROOT/$j" ]]; then
      if node -e "JSON.parse(require('fs').readFileSync('$TOOLBOX_ROOT/$j','utf8'))" 2>/dev/null; then
        :
      else
        log_warn "Invalid JSON: $j"
        local_errors=$((local_errors + 1))
      fi
    fi
  done
  if [[ $local_errors -eq 0 ]]; then
    log_ok "Basic validation passed"
  else
    log_warn "$local_errors validation warning(s)"
  fi
fi

# --- Step 8: Write local version & print report ---
log_step "Step 8/8: Finalizing"
set_local_version "$REPO_VERSION"
log_ok "Local version set to ${REPO_VERSION}"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║        toolBox Bootstrap Report              ║"
echo "╠══════════════════════════════════════════════╣"
printf "║  %-14s %-28s ║\n" "OS:" "$REPORT_OS"
printf "║  %-14s %-28s ║\n" "Node.js:" "${REPORT_NODE:-N/A}"
printf "║  %-14s %-28s ║\n" "npm:" "v${REPORT_NPM:-N/A}"
printf "║  %-14s %-28s ║\n" "Claude Code:" "${REPORT_CLAUDE:-N/A}"
printf "║  %-14s %-28s ║\n" "Obsidian:" "${REPORT_OBSIDIAN:-N/A}"
printf "║  %-14s %-28s ║\n" "MCP:" "${REPORT_MCP:-N/A}"
printf "║  %-14s %-28s ║\n" "Hooks:" "${REPORT_HOOKS:-N/A}"
printf "║  %-14s %-28s ║\n" "Structure:" "${REPORT_STRUCTURE:-N/A}"
printf "║  %-14s %-28s ║\n" "KI Mode:" "${REPORT_KI_MODE:-N/A}"
printf "║  %-14s %-28s ║\n" "Global CLAUDE:" "${REPORT_GLOBAL_CLAUDE:-N/A}"
printf "║  %-14s %-28s ║\n" "Version:" "v${REPO_VERSION}"
echo "╠══════════════════════════════════════════════╣"
echo "║  toolBox is ready. Run 'claude' to start.   ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
