@echo off
echo ========================================
echo Android Emulator Otomatik Duzeltme
echo ========================================
echo.
echo Bu script yonetici yetkisiyle calisacak...
echo.

powershell -ExecutionPolicy Bypass -Command "Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -File \"%~dp0emulator-auto-fix.ps1\"' -Verb RunAs"

pause

