#!/bin/bash
# =============================================================================
# MIMO FINANCE - Hub interactif des outils et scripts
# =============================================================================

# Se positionner à la racine du projet
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# Détecter docker compose vs docker-compose
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear 2>/dev/null || true

while true; do
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║            ${BOLD}MIMO CORE - CENTRE DE CONTRÔLE${NC}${BLUE}                ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e " ${BOLD}Gestion de l'application (Docker) :${NC}"
    echo -e "   ${CYAN}1)${NC}  Démarrer l'application                 ($COMPOSE_CMD up -d)"
    echo -e "   ${CYAN}2)${NC}  Démarrer avec Rebuild complet          ($COMPOSE_CMD up -d --build)"
    echo -e "   ${CYAN}3)${NC}  Arrêter l'application                  ($COMPOSE_CMD down)"
    echo -e "   ${CYAN}4)${NC}  Redémarrer l'application               ($COMPOSE_CMD restart)"
    echo -e "   ${CYAN}5)${NC}  Voir les logs en direct                ($COMPOSE_CMD logs -f)"
    echo ""
    echo -e " ${BOLD}Sécurité & Diagnostic :${NC}"
    echo -e "   ${CYAN}6)${NC}  Lancer les tests de sécurité en direct (scripts/test-security.sh)"
    echo -e "   ${CYAN}7)${NC}  Vérifier la santé des services locaux  (scripts/health-check.sh)"
    echo " ${BOLD}Données de Test :${NC}"
    echo -e "   ${CYAN}8)${NC}  Générer les données de test (SQL)      (python scripts/generate_test_data.py)"
    echo -e "   ${CYAN}9)${NC}  Charger les données de test en Local"
    echo -e "   ${CYAN}10)${NC} Charger les données de test (Cloud GCP)"
    echo ""
    echo -e " ${BOLD}Base de données :${NC}"
    echo -e "   ${CYAN}11)${NC} Sauvegarder la base de données         (scripts/backup-db.sh)"
    echo -e "   ${CYAN}12)${NC} Restaurer une sauvegarde               (scripts/restore-db.sh)"
    echo -e "   ${CYAN}13)${NC} Appliquer les migrations Alembic       (scripts/run-migrations.sh)"
    echo ""
    echo -e " ${BOLD}Déploiement GCP (Cloud Run) :${NC}"
    echo -e "   ${CYAN}14)${NC} Déployer TOUT (Backend + Frontend)    (./deploy.sh all)"
    echo -e "   ${CYAN}15)${NC} Déployer uniquement le Backend        (./deploy.sh backend)"
    echo -e "   ${CYAN}16)${NC} Déployer uniquement le Frontend       (./deploy.sh frontend)"
    echo ""
    echo -e "   ${RED}q)${NC}  Quitter"
    echo ""
    read -p "Sélectionnez une option [1-16 ou q] : " choice

    echo ""
    case $choice in
        1)
            echo -e "${YELLOW}>>> Démarrage de l'application Mimo Finance...${NC}"
            $COMPOSE_CMD up -d
            echo -e "${GREEN}>>> Application démarrée !${NC}"
            echo -e "    Frontend : ${CYAN}http://localhost:5000${NC}"
            echo -e "    Backend  : ${CYAN}http://localhost:8000${NC}"
            echo -e "    API Docs : ${CYAN}http://localhost:8000/docs${NC}"
            ;;
        2)
            echo -e "${YELLOW}>>> Rebuild et démarrage de l'application...${NC}"
            $COMPOSE_CMD up -d --build
            echo -e "${GREEN}>>> Application reconstruite et démarrée !${NC}"
            echo -e "    Frontend : ${CYAN}http://localhost:5000${NC}"
            echo -e "    Backend  : ${CYAN}http://localhost:8000${NC}"
            ;;
        3)
            echo -e "${YELLOW}>>> Arrêt de l'application...${NC}"
            $COMPOSE_CMD down
            echo -e "${GREEN}>>> Tous les conteneurs sont arrêtés.${NC}"
            ;;
        4)
            echo -e "${YELLOW}>>> Redémarrage de l'application...${NC}"
            $COMPOSE_CMD restart
            echo -e "${GREEN}>>> Services redémarrés.${NC}"
            ;;
        5)
            echo -e "${YELLOW}>>> Affichage des logs (Ctrl+C pour quitter les logs)...${NC}"
            $COMPOSE_CMD logs -f
            ;;
        6)
            echo -e "${YELLOW}>>> Lancement des tests de sécurité...${NC}"
            ./scripts/test-security.sh
            ;;
        7)
            echo -e "${YELLOW}>>> Vérification de la santé des services...${NC}"
            ./scripts/health-check.sh
            ;;
        8)
            echo -e "${YELLOW}>>> Génération du script de données de test (test_data.sql)...${NC}"
            if command -v python &> /dev/null; then
                python scripts/generate_test_data.py || echo -e "${RED}Erreur lors de l'exécution du script Python.${NC}"
            elif command -v python3 &> /dev/null; then
                python3 scripts/generate_test_data.py || echo -e "${RED}Erreur lors de l'exécution du script Python.${NC}"
            else
                echo -e "${RED}Python n'est pas installé ou n'est pas dans le PATH.${NC}"
            fi
            ;;
        9)
            echo -e "${YELLOW}>>> Chargement des données de test en Local...${NC}"
            if [ -f "test_data.sql" ]; then
                docker exec -i mimo-postgres psql -U duoflow -d duoflow < test_data.sql
                echo -e "${GREEN}>>> Données chargées en Local avec succès !${NC}"
                echo ""
                echo -e " ${BOLD}Comptes de test disponibles (Mot de passe: ${YELLOW}password123${NC}) :${NC}"
                echo -e "   1. ${CYAN}alexandre@test.com${NC} - Salarié CDI (2600 €/m)"
                echo -e "   2. ${CYAN}sophie@test.com${NC}    - Freelance Tech (3400 €/m)"
                echo -e "   3. ${CYAN}lucas@test.com${NC}     - Étudiant / Alternant (950 €/m)"
            else
                echo -e "${RED}Erreur : test_data.sql introuvable. Veuillez générer d'abord.${NC}"
            fi
            ;;
        10)
            echo -e "${YELLOW}>>> Chargement des données de test sur le Cloud...${NC}"
            ./scripts/load-test-data-cloud.sh
            ;;
        11)
            echo -e "${YELLOW}>>> Sauvegarde de la base de données...${NC}"
            ./scripts/backup-db.sh
            ;;
        12)
            echo -e "${YELLOW}>>> Restauration de la base de données...${NC}"
            ./scripts/restore-db.sh
            ;;
        13)
            echo -e "${YELLOW}>>> Exécution des migrations...${NC}"
            ./scripts/run-migrations.sh
            ;;
        14)
            echo -e "${YELLOW}>>> Déploiement complet en cours...${NC}"
            ./deploy.sh all
            ;;
        15)
            echo -e "${YELLOW}>>> Déploiement du Backend...${NC}"
            ./deploy.sh backend
            ;;
        16)
            echo -e "${YELLOW}>>> Déploiement du Frontend...${NC}"
            ./deploy.sh frontend
            ;;
        q|Q)
            echo -e "${GREEN}Au revoir !${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Option invalide.${NC}"
            ;;
    esac

    echo ""
    read -p "Appuyez sur Entrée pour revenir au menu..." dummy
    clear 2>/dev/null || true
done
