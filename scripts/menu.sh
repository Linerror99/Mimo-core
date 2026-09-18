#!/bin/bash
# =============================================================================
# MIMO FINANCE - Hub interactif des outils et scripts
# =============================================================================

# Se positionner à la racine du projet
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

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
    echo -e " ${BOLD}Sécurité & Diagnostic :${NC}"
    echo -e "   ${CYAN}1)${NC} Lancer les tests de sécurité en direct  (scripts/test-security.sh)"
    echo -e "   ${CYAN}2)${NC} Vérifier la santé des services locaux   (scripts/health-check.sh)"
    echo ""
    echo -e " ${BOLD}Base de données :${NC}"
    echo -e "   ${CYAN}3)${NC} Sauvegarder la base de données          (scripts/backup-db.sh)"
    echo -e "   ${CYAN}4)${NC} Restaurer une sauvegarde                (scripts/restore-db.sh)"
    echo -e "   ${CYAN}5)${NC} Appliquer les migrations Alembic        (scripts/run-migrations.sh)"
    echo ""
    echo -e " ${BOLD}Déploiement GCP (Cloud Run) :${NC}"
    echo -e "   ${CYAN}6)${NC} Déployer TOUT (Backend + Frontend)      (./deploy.sh all)"
    echo -e "   ${CYAN}7)${NC} Déployer uniquement le Backend          (./deploy.sh backend)"
    echo -e "   ${CYAN}8)${NC} Déployer uniquement le Frontend         (./deploy.sh frontend)"
    echo ""
    echo -e "   ${RED}q)${NC} Quitter"
    echo ""
    read -p "Sélectionnez une option [1-8 ou q] : " choice

    echo ""
    case $choice in
        1)
            echo -e "${YELLOW}>>> Lancement des tests de sécurité...${NC}"
            ./scripts/test-security.sh
            ;;
        2)
            echo -e "${YELLOW}>>> Vérification de la santé des services...${NC}"
            ./scripts/health-check.sh
            ;;
        3)
            echo -e "${YELLOW}>>> Sauvegarde de la base de données...${NC}"
            ./scripts/backup-db.sh
            ;;
        4)
            echo -e "${YELLOW}>>> Restauration de la base de données...${NC}"
            ./scripts/restore-db.sh
            ;;
        5)
            echo -e "${YELLOW}>>> Exécution des migrations...${NC}"
            ./scripts/run-migrations.sh
            ;;
        6)
            echo -e "${YELLOW}>>> Déploiement complet en cours...${NC}"
            ./deploy.sh all
            ;;
        7)
            echo -e "${YELLOW}>>> Déploiement du Backend...${NC}"
            ./deploy.sh backend
            ;;
        8)
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
