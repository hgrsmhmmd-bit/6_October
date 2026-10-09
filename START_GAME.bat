@echo off
setlocal
set "GAME=%~dp0index.html"
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set "CHROME86=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
set "EDGE64=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" --autoplay-policy=no-user-gesture-required --disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies "%GAME%"
  exit /b
)
if exist "%CHROME86%" (
  start "" "%CHROME86%" --autoplay-policy=no-user-gesture-required --disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies "%GAME%"
  exit /b
)
if exist "%EDGE64%" (
  start "" "%EDGE64%" --autoplay-policy=no-user-gesture-required "%GAME%"
  exit /b
)
if exist "%EDGE%" (
  start "" "%EDGE%" --autoplay-policy=no-user-gesture-required "%GAME%"
  exit /b
)
start "" "%GAME%"
endlocal
