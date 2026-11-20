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
echo  Donnees de Test :
echo    [8]  Generer donnees de test (SQL)        (python scripts/generate_test_data.py)
echo    [9]  Charger donnees de test en Local
echo    [10] Charger donnees de test (Cloud GCP)
echo.
echo  Base de donnees :
echo    [11] Sauvegarder la base de donnees       (bash scripts/backup-db.sh)
echo    [12] Restaurer une sauvegarde             (bash scripts/restore-db.sh)
echo    [13] Appliquer les migrations Alembic     (bash scripts/run-migrations.sh)
echo.
echo  Deploiement GCP (Cloud Run) :
echo    [14] Deployer TOUT (Backend + Frontend)   (bash deploy.sh all)
echo    [15] Deployer uniquement le Backend       (bash deploy.sh backend)
echo    [16] Deployer uniquement le Frontend      (bash deploy.sh frontend)
echo.
echo    [Q]  Quitter
echo.
set /p choice="Selectionnez une option [1-16 ou Q] : "

if /i "%choice%"=="1" goto start_app
if /i "%choice%"=="2" goto rebuild_app
if /i "%choice%"=="3" goto stop_app
if /i "%choice%"=="4" goto restart_app
if /i "%choice%"=="5" goto logs_app
if /i "%choice%"=="6" goto sec_tests
if /i "%choice%"=="7" goto health_check
if /i "%choice%"=="8" goto generate_test_data
if /i "%choice%"=="9" goto load_test_local
if /i "%choice%"=="10" goto load_test_cloud
if /i "%choice%"=="11" goto backup_db
if /i "%choice%"=="12" goto restore_db
if /i "%choice%"=="13" goto migrations
if /i "%choice%"=="14" goto deploy_all
if /i "%choice%"=="15" goto deploy_backend
if /i "%choice%"=="16" goto deploy_frontend
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

:generate_test_data
echo.
echo ^>^>^> Generation du script de donnees de test (test_data.sql)...
python scripts\generate_test_data.py
echo ^>^>^> Fichier test_data.sql genere avec succes !
pause
goto menu

:load_test_local
echo.
echo ^>^>^> Chargement des donnees de test en Local...
if exist test_data.sql (
    docker exec -i mimo-postgres psql -U duoflow -d duoflow < test_data.sql
    echo ^>^>^> Donnees chargees en Local avec succes !
    echo.
    echo  Comptes de test disponibles (Mot de passe: password123) :
    echo    1. alexandre@test.com - Salarie CDI (2600 EUR/m)
    echo    2. sophie@test.com    - Freelance Tech (3400 EUR/m)
    echo    3. lucas@test.com     - Etudiant / Alternant (950 EUR/m)
    echo.
) else (
    echo Erreur : test_data.sql introuvable. Veuillez generer d'abord.
)
pause
goto menu

:load_test_cloud
echo.
echo ^>^>^> Chargement des donnees de test sur Cloud SQL...
bash scripts/load-test-data-cloud.sh
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
