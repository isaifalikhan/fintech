@echo off
REM Double-click this file to run fix-git-zip-history.ps1
REM (Windows won't execute a .ps1 directly from Explorer, so this .bat launches it properly.)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0fix-git-zip-history.ps1"
pause
