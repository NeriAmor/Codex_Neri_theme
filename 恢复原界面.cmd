@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0codex\restore.ps1"
if errorlevel 1 pause
