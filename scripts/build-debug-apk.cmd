@echo off
setlocal

set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmdline-tools\latest\bin;%PATH%"

call npm.cmd run cap:sync
if errorlevel 1 exit /b %errorlevel%

call android\gradlew.bat -p android assembleDebug
if errorlevel 1 exit /b %errorlevel%

copy /Y android\app\build\outputs\apk\debug\app-debug.apk cuotiben-debug.apk >nul
echo APK created: %CD%\cuotiben-debug.apk
