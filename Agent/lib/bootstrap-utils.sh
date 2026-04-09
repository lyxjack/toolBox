#!/usr/bin/env bash
# bootstrap-utils.sh — Shared shell functions for bootstrap.sh and migration scripts
# Source this file: source "$(dirname "$0")/Agent/lib/bootstrap-utils.sh"

set -euo pipefail

# --- Path Resolution ---
# TOOLBOX_ROOT can be set externally; otherwise resolve from this script's location
if [[ -z "${TOOLBOX_ROOT:-}" ]]; then
  TOOLBOX_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fi
export TOOLBOX_ROOT

# --- Local State Files ---
TOOLBOX_VERSION_FILE="$TOOLBOX_ROOT/.toolbox_version"
TOOLBOX_CONFIG_FILE="$TOOLBOX_ROOT/.toolbox_config"

# --- Logging ---
log_info()  { printf "\033[0;34m[INFO]\033[0m  %s\n" "$1"; }
log_ok()    { printf "\033[0;32m[OK]\033[0m    %s\n" "$1"; }
log_warn()  { printf "\033[0;33m[WARN]\033[0m  %s\n" "$1"; }
log_error() { printf "\033[0;31m[ERROR]\033[0m %s\n" "$1"; }
log_step()  { printf "\n\033[1;36m==> %s\033[0m\n" "$1"; }

# --- OS Detection ---
detect_os() {
  case "$(uname -s)" in
    Darwin) echo "macos" ;;
    Linux)
      if grep -qi microsoft /proc/version 2>/dev/null; then
        echo "wsl"
      else
        echo "linux"
      fi
      ;;
    MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
    *) echo "unknown" ;;
  esac
}

# --- Command Check ---
check_command() {
  command -v "$1" >/dev/null 2>&1
}

# --- Version Helpers ---
get_repo_version() {
  local version_file="$TOOLBOX_ROOT/VERSION"
  if [[ -f "$version_file" ]]; then
    cat "$version_file" | tr -d '[:space:]'
  else
    echo "0.0.0"
  fi
}

get_local_version() {
  if [[ -f "$TOOLBOX_VERSION_FILE" ]]; then
    cat "$TOOLBOX_VERSION_FILE" | tr -d '[:space:]'
  else
    echo ""
  fi
}

set_local_version() {
  echo "$1" > "$TOOLBOX_VERSION_FILE"
}

# --- Semver Comparison ---
# Returns 0 if $1 > $2 (by semver)
version_gt() {
  [[ "$1" != "$2" ]] && [[ "$(printf '%s\n' "$1" "$2" | sort -V | head -n1)" == "$2" ]]
}

# Returns 0 if $1 == $2
version_eq() {
  [[ "$1" == "$2" ]]
}

# --- Config Helpers ---
get_config() {
  local key="$1"
  if [[ -f "$TOOLBOX_CONFIG_FILE" ]]; then
    grep "^${key}=" "$TOOLBOX_CONFIG_FILE" 2>/dev/null | cut -d'=' -f2- || echo ""
  else
    echo ""
  fi
}

set_config() {
  local key="$1"
  local value="$2"
  if [[ -f "$TOOLBOX_CONFIG_FILE" ]]; then
    # Remove existing key if present
    grep -v "^${key}=" "$TOOLBOX_CONFIG_FILE" > "${TOOLBOX_CONFIG_FILE}.tmp" 2>/dev/null || true
    mv "${TOOLBOX_CONFIG_FILE}.tmp" "$TOOLBOX_CONFIG_FILE"
  fi
  echo "${key}=${value}" >> "$TOOLBOX_CONFIG_FILE"
}

# --- Structure Validation ---
validate_structure() {
  local errors=0

  # Five-layer directories
  for dir in Agent In-Process KI PM Tool; do
    if [[ ! -d "$TOOLBOX_ROOT/$dir" ]]; then
      log_error "Missing directory: $dir/"
      errors=$((errors + 1))
    fi
  done

  # Key files
  for file in CLAUDE.md README.md VERSION; do
    if [[ ! -f "$TOOLBOX_ROOT/$file" ]]; then
      log_error "Missing file: $file"
      errors=$((errors + 1))
    fi
  done

  # Agent layer key files
  for file in Agent/rules/iron_laws.md Agent/rules/constitution.md Agent/rules/file_governance.md; do
    if [[ ! -f "$TOOLBOX_ROOT/$file" ]]; then
      log_error "Missing file: $file"
      errors=$((errors + 1))
    fi
  done

  if [[ $errors -eq 0 ]]; then
    log_ok "Five-layer directory structure is valid"
    return 0
  else
    log_error "$errors structural issue(s) found"
    return 1
  fi
}

# --- Migration Discovery ---
# Lists migration scripts that need to run (from_version, to_version]
find_pending_migrations() {
  local from_version="$1"
  local to_version="$2"
  local migrations_dir="$TOOLBOX_ROOT/Agent/migrations"

  if [[ ! -d "$migrations_dir" ]]; then
    return 0
  fi

  # List all migration scripts, sorted by version
  for script in $(ls "$migrations_dir"/v*.sh 2>/dev/null | sort -V); do
    local filename
    filename="$(basename "$script")"
    # Extract version from filename: v1.2.3.sh -> 1.2.3
    local script_version="${filename#v}"
    script_version="${script_version%.sh}"

    if version_gt "$script_version" "$from_version" && ! version_gt "$script_version" "$to_version"; then
      echo "$script"
    fi
  done
}

# --- Run Migrations ---
run_migrations() {
  local from_version="$1"
  local to_version="$2"
  local scripts
  scripts="$(find_pending_migrations "$from_version" "$to_version")"

  if [[ -z "$scripts" ]]; then
    log_info "No migration scripts to run"
    return 0
  fi

  local count
  count="$(echo "$scripts" | wc -l | tr -d '[:space:]')"
  log_info "Found $count migration(s) to run"

  while IFS= read -r script; do
    local filename
    filename="$(basename "$script")"
    local script_version="${filename#v}"
    script_version="${script_version%.sh}"

    log_step "Migrating to v${script_version}..."
    if bash "$script" "$TOOLBOX_ROOT"; then
      log_ok "Migration v${script_version} completed"
    else
      log_error "Migration v${script_version} failed! Aborting."
      return 1
    fi
  done <<< "$scripts"

  return 0
}

# --- Node.js Version Check ---
check_node_version() {
  local required_major=18
  if ! check_command node; then
    return 1
  fi
  local node_version
  node_version="$(node --version | sed 's/^v//')"
  local node_major="${node_version%%.*}"
  [[ "$node_major" -ge "$required_major" ]]
}
