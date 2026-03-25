@echo off
setx PATH "C:\Program Files\nodejs;%PATH%" /M 2>nul
set PATH=C:\Program Files\nodejs;%PATH%
cd /d C:\Users\Alperen\Desktop\deneme\frontend
where node
"C:\Program Files\nodejs\npm.cmd" install 2>&1
echo DONE %ERRORLEVEL%
pause
