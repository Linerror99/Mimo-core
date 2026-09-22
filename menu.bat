@echo off
setlocal enabledelayedexpansion
title MIMO CORE - Centre de Contrôle

:menu
cls
echo ==========================================================
echo               MIMO CORE - CENTRE DE CONTROLE
echo ==========================================================
echo.
echo  Gestion de l'application (Docker) :
echo    [1]  Demarrer l'application               (docker compose up -d)
echo    [2]  Demarrer avec Rebuild complet        (docker compose up -d --build)
echo    [3]  Arreter l'application                (docker compose down)
echo    [4]  Redemarrer l'application             (docker compose restart)
echo    [5]  Voir les logs en direct              (docker compose logs -f)
echo.
echo  Securite ^& Diagnostic :
echo    [6]  Lancer les tests de securite         (bash scripts/test-security.sh)
echo    [7]  Verifier la sante des services       (bash scripts/health-check.sh)
echo.
echo  Base de donnees :
echo    [8]  Sauvegarder la base de donnees       (bash scripts/backup-db.sh)
echo    [9]  Restaurer une sauvegarde             (bash scripts/restore-db.sh)
echo    [10] Appliquer les migrations Alembic     (bash scripts/run-migrations.sh)
echo.
echo  Deploiement GCP (Cloud Run) :
echo    [11] Deployer TOUT (Backend + Frontend)   (bash deploy.sh all)
echo    [12] Deployer uniquement le Backend       (bash deploy.sh backend)
echo    [13] Deployer uniquement le Frontend      (bash deploy.sh frontend)
echo.
echo    [Q]  Quitter
echo.
set /p choice="Selectionnez une option [1-13 ou Q] : "

if /i "%choice%"=="1" goto start_app
if /i "%choice%"=="2" goto rebuild_app
if /i "%choice%"=="3" goto stop_app
if /i "%choice%"=="4" goto restart_app
if /i "%choice%"=="5" goto logs_app
if /i "%choice%"=="6" goto sec_tests
if /i "%choice%"=="7" goto health_check
if /i "%choice%"=="8" goto backup_db
if /i "%choice%"=="9" goto restore_db
if /i "%choice%"=="10" goto migrations
if /i "%choice%"=="11" goto deploy_all
if /i "%choice%"=="12" goto deploy_backend
if /i "%choice%"=="13" goto deploy_frontend
if /i "%choice%"=="q" goto quit

echo Choix invalide.
timeout /t 2 >nul
goto menu

:start_app
echo.
echo ^>^>^> Demarrage de l'application Mimo Finance...
docker compose up -d
if errorlevel 1 docker-compose up -d
echo.
echo ^>^>^> Application demarree !
echo     Frontend : http://localhost:5000
echo     Backend  : http://localhost:8000
echo     API Docs : http://localhost:8000/docs
echo.
pause
goto menu

:rebuild_app
echo.
echo ^>^>^> Rebuild et demarrage de l'application...
docker compose up -d --build
if errorlevel 1 docker-compose up -d --build
echo.
echo ^>^>^> Application reconstruite et demarree !
echo     Frontend : http://localhost:5000
echo     Backend  : http://localhost:8000
echo.
pause
goto menu

:stop_app
echo.
echo ^>^>^> Arret de l'application...
docker compose down
if errorlevel 1 docker-compose down
echo.
echo ^>^>^> Tous les conteneurs sont arretes.
echo.
pause
goto menu

:restart_app
echo.
echo ^>^>^> Redemarrage de l'application...
docker compose restart
if errorlevel 1 docker-compose restart
echo.
echo ^>^>^> Services redemarres.
echo.
pause
goto menu

:logs_app
echo.
echo ^>^>^> Affichage des logs (Ctrl+C pour quitter les logs)...
docker compose logs -f
if errorlevel 1 docker-compose logs -f
goto menu

:sec_tests
bash scripts/test-security.sh
pause
goto menu

:health_check
bash scripts/health-check.sh
pause
goto menu

:backup_db
bash scripts/backup-db.sh
pause
goto menu

:restore_db
bash scripts/restore-db.sh
pause
goto menu

:migrations
bash scripts/run-migrations.sh
pause
goto menu

:deploy_all
bash deploy.sh all
pause
goto menu

:deploy_backend
bash deploy.sh backend
pause
goto menu

:deploy_frontend
bash deploy.sh frontend
pause
goto menu

:quit
echo Au revoir !
exit /b 0
