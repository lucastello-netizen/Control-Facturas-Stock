@echo off
title Iniciando Control de Stock y CMV...
setlocal

set "HTML_FILE=%~dp0index.html"

:: Buscar Microsoft Edge (estándar en Windows 10 y 11)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="file:///%HTML_FILE:\=/%"
    goto :EOF
)

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="file:///%HTML_FILE:\=/%"
    goto :EOF
)

:: Buscar Google Chrome si Edge no estuviera
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="file:///%HTML_FILE:\=/%"
    goto :EOF
)

if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app="file:///%HTML_FILE:\=/%"
    goto :EOF
)

:: Abrir en el navegador predeterminado del sistema
start "" "%HTML_FILE%"

endlocal
exit /b 0
