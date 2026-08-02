@echo off
title NextGen Bot v2.5 - Installation
color 0B

echo.
echo ================================================
echo      NextGen Bot v2.5 - Installation
echo ================================================
echo.

echo [*] Nettoyage des anciennes installations...
if exist "node_modules" (
    rmdir /s /q node_modules 2>nul
)
if exist "package-lock.json" (
    del /f /q package-lock.json 2>nul
)

echo [*] Installation des dependances...
echo [*] Cela peut prendre 2-5 minutes...
echo.

npm install --legacy-peer-deps

if errorlevel 1 (
    echo.
    echo [!] ERREUR lors de l'installation!
    echo.
    echo [*] Solutions possibles:
    echo     1. Verifiez votre connexion internet
    echo     2. Essayez: npm cache clean --force
    echo     3. Essayez: npm install --force
    echo.
    pause
    exit
)

echo.
echo ================================================
echo      Installation terminee avec succes!
echo ================================================
echo.
echo [+] Toutes les dependances sont installees
echo [*] Vous pouvez maintenant lancer start.bat
echo.

pause
