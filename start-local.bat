@echo off
echo [card-vault] Lokaler Start...
copy /Y .env.local .env >/dev/null
docker compose up -d --build
echo.
echo Bereit! Erreichbar unter:
echo   Lokal:   http://localhost:7842
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /r "IPv4.*192\."') do (
    for /f "tokens=1 delims= " %%b in ("%%a") do echo   Netzwerk: http://%%b:7842
)
echo.
echo Login: admin@card-vault.local / CardVault2026!
