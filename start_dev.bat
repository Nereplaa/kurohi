@echo off
echo ==> Anime Platformu baslatiliyor...
docker compose up -d
echo.
echo Servisler:
echo   Frontend : http://localhost:3000
echo   Backend  : http://localhost:8000
echo   API Docs : http://localhost:8000/docs
echo.
echo Durdurmak icin: docker compose down
