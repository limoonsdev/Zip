@echo off
title NextGen Bot v2.5 - Starting...
color 0A

echo.
echo ================================================
echo      NextGen Bot v2.5 - Ultra Edition
echo ================================================
echo.

REM Check if .env exists
if not exist ".env" (
    echo [!] ERREUR: Fichier .env manquant!
    echo [*] Veuillez copier .env.example vers .env
    echo [*] et configurer vos valeurs Discord
    echo.
    pause
    exit
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo [*] Installation des dependances...
    echo [*] Cela peut prendre quelques minutes...
    echo.
    npm install
    if errorlevel 1 (
        echo.
        echo [!] ERREUR lors de l'installation!
        echo [*] Essayez: npm install --force
        echo.
        pause
        exit
    )
    echo.
    echo [+] Dependances installees avec succes!
    echo.
)

echo [*] Demarrage du bot NextGen...
echo [*] Appuyez sur Ctrl+C pour arreter
echo.
echo ================================================
echo.

node src/index.js

if errorlevel 1 (
    echo.
    echo [!] Le bot s'est arrete avec une erreur!
    echo [*] Verifiez les logs ci-dessus
    echo.
)

pause
