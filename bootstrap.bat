@echo off
REM bootstrap.bat — toolBox init & update entry point for Windows
REM Usage: bootstrap.bat [--skip-obsidian] [--non-interactive]

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js ^>= 18 first.
    echo   Download: https://nodejs.org/
    pause
    exit /b 1
)

node "%~dp0bootstrap.mjs" %*
