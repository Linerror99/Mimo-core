#!/usr/bin/env bash
# =============================================================================
# MIMO FINANCE - Hub interactif des outils et scripts (100 % Bash)
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

clear 2>/dev/null || true

while true; do
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║            ${BOLD}MIMO CORE - CENTRE DE CONTRÔLE${NC}${BLUE}                ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e " ${BOLD}Gestion de l'application (Docker) :${NC}"
    echo -e "   ${CYAN}1)${NC}  Démarrer l'application                 (./scripts/dev.sh)"
    echo -e "   ${CYAN}2)${NC}  Démarrer avec Rebuild complet          ($COMPOSE_CMD up -d --build)"
    echo -e "   ${CYAN}3)${NC}  Arrêter l'application                  ($COMPOSE_CMD down)"
    echo -e "   ${CYAN}4)${NC}  Redémarrer l'application               ($COMPOSE_CMD restart)"
    echo -e "   ${CYAN}5)${NC}  Voir les logs en direct                ($COMPOSE_CMD logs -f)"
    echo ""
    echo -e " ${BOLD}Tests TDD, Sécurité & Diagnostic :${NC}"
    echo -e "   ${CYAN}6)${NC}  Tests TDD Frontend (Vitest + TSC)      (./scripts/test.sh frontend)"
    echo -e "   ${CYAN}7)${NC}  Tests TDD Backend (Pytest)             (./scripts/test.sh backend)"
    echo -e "   ${CYAN}8)${NC}  Tests de sécurité                      (./scripts/test-security.sh)"
    echo -e "   ${CYAN}9)${NC}  Vérifier la santé des services         (./scripts/health-check.sh)"
    echo ""
    echo -e " ${BOLD}Données de Test & Base de données :${NC}"
    echo -e "   ${CYAN}10)${NC} Générer données de test (SQL)          (python3 scripts/generate_test_data.py)"
    echo -e "   ${CYAN}11)${NC} Charger données de test en Local       (test_data.sql -> Postgres)"
    echo -e "   ${CYAN}12)${NC} Sauvegarder la base de données         (./scripts/backup-db.sh)"
    echo -e "   ${CYAN}13)${NC} Restaurer une sauvegarde               (./scripts/restore-db.sh)"
    echo -e "   ${CYAN}14)${NC} Appliquer les migrations Alembic       (./scripts/run-migrations.sh)"
    echo ""
    echo -e " ${BOLD}Déploiement GCP (Cloud Run) :${NC}"
    echo -e "   ${CYAN}15)${NC} Déployer TOUT (Backend + Frontend)     (./deploy.sh all)"
    echo -e "   ${CYAN}16)${NC} Déployer uniquement le Backend         (./deploy.sh backend)"
    echo -e "   ${CYAN}17)${NC} Déployer uniquement le Frontend        (./deploy.sh frontend)"
    echo ""
    echo -e "   ${RED}q)${NC}  Quitter"
    echo ""
    read -r -p "Sélectionnez une option [1-17 ou q] : " choice

    echo ""
    case $choice in
        1)
            ./scripts/dev.sh
            ;;
        2)
            echo -e "${YELLOW}>>> Rebuild et démarrage de l'application...${NC}"
            $COMPOSE_CMD up -d --build
            echo -e "${GREEN}>>> Application reconstruite et démarrée !${NC}"
            echo -e "    Frontend : ${CYAN}http://localhost:3000${NC}"
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
            echo -e "${YELLOW}>>> Affichage des logs (Ctrl+C pour quitter)...${NC}"
            $COMPOSE_CMD logs -f
            ;;
        6)
            ./scripts/test.sh frontend
            ;;
        7)
            ./scripts/test.sh backend
            ;;
        8)
            ./scripts/test-security.sh
            ;;
        9)
            ./scripts/health-check.sh
            ;;
        10)
            echo -e "${YELLOW}>>> Génération de test_data.sql...${NC}"
            python3 scripts/generate_test_data.py || echo -e "${RED}Erreur lors de la génération.${NC}"
            ;;
        11)
            if [ -f "test_data.sql" ]; then
                docker exec -i mimo-postgres psql -U duoflow -d duoflow < test_data.sql
                echo -e "${GREEN}>>> Données chargées en Local avec succès !${NC}"
                echo -e "    Comptes de test (mot de passe: ${YELLOW}password123${NC}) :"
                echo -e "      1. ${CYAN}alexandre@test.com${NC}"
                echo -e "      2. ${CYAN}sophie@test.com${NC}"
                echo -e "      3. ${CYAN}lucas@test.com${NC}"
            else
                echo -e "${RED}Erreur : test_data.sql introuvable.${NC}"
            fi
            ;;
        12)
            ./scripts/backup-db.sh
            ;;
        13)
            ./scripts/restore-db.sh
            ;;
        14)
            ./scripts/run-migrations.sh
            ;;
        15)
            ./deploy.sh all
            ;;
        16)
            ./deploy.sh backend
            ;;
        17)
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
    read -r -p "Appuyez sur Entrée pour revenir au menu..." _
    clear 2>/dev/null || true
done
