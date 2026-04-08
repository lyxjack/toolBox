#!/bin/bash
# Game engine detection script for Claude Code SessionStart hook.
# Prints engine type to stdout if detected; silent otherwise.
# Zero overhead for non-game projects.

# Already configured — skip
if [ -f ".mcp.json" ]; then
  exit 0
fi

# Unity: Assets/ + ProjectSettings/
if [ -d "Assets" ] && [ -d "ProjectSettings" ]; then
  echo "UNITY_PROJECT_DETECTED"
  exit 0
fi

# Cocos Creator 3.x: assets/ + settings/cc.* or settings/v2/
if [ -d "assets" ] && (ls settings/cc.* >/dev/null 2>&1 || [ -d "settings/v2" ]); then
  echo "COCOS_PROJECT_DETECTED"
  exit 0
fi

# Cocos Creator 3.x: assets/ + package.json with creator.version
if [ -d "assets" ] && [ -f "package.json" ] && grep -q '"creator"' package.json 2>/dev/null; then
  echo "COCOS_PROJECT_DETECTED"
  exit 0
fi

# Cocos Creator 2.x: assets/ + project.json (fallback)
if [ -d "assets" ] && [ -f "project.json" ]; then
  echo "COCOS_PROJECT_DETECTED"
  exit 0
fi
