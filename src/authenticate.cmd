@echo off
setlocal DisableDelayedExpansion
title Windows User VS Code - password
if not defined UW_ACCOUNT goto failed
if not defined UW_LAUNCH_PAYLOAD goto failed
if "%UW_SAME_USER%"=="1" goto current
echo Open VS Code as %UW_ACCOUNT%
echo Type the WINDOWS ACCOUNT PASSWORD at the runas prompt. Characters are hidden.
echo Do not enter a PIN. This tool does not save passwords.
echo.
"%SystemRoot%\System32\runas.exe" /profile "/user:%UW_ACCOUNT%" "\"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe\" -NoLogo -NoProfile -EncodedCommand %UW_LAUNCH_PAYLOAD%"
if errorlevel 1 goto failed
exit
:current
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -EncodedCommand %UW_LAUNCH_PAYLOAD%
if errorlevel 1 goto failed
exit
:failed
echo.
echo Startup failed or was cancelled. Keep the error above for troubleshooting.
exit /b 1
