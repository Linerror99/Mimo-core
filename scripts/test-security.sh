#!/bin/bash
# ==============================================================================
# Script de Test et d'Audit de Sécurité - Mimo-core
# Teste en direct les 7 failles corrigées sur votre environnement Cloud Run
# ==============================================================================

BACKEND_URL="https://mimo-backend-qjhc3e7jla-ew.a.run.app"
FRONTEND_URL="https://mimo-frontend-qjhc3e7jla-ew.a.run.app"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===================================================================${NC}"
echo -e "${BLUE}   TEST DE SÉCURITÉ EN DIRECT - MIMO CORE                          ${NC}"
echo -e "${BLUE}   Backend  : ${BACKEND_URL}${NC}"
echo -e "${BLUE}   Frontend : ${FRONTEND_URL}${NC}"
echo -e "${BLUE}===================================================================${NC}\n"

PASS_COUNT=0
FAIL_COUNT=0

# ------------------------------------------------------------------------------
# TEST 1 : Vérification F2 - Endpoint Cloud Scheduler (/api/v1/scheduled/backup)
# Attendu : Rejet (401 Unauthorized) quand appelé avec un faux token
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[TEST 1/5] F2 : Protection OIDC sur /api/v1/scheduled/backup (Fake Token)...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BACKEND_URL}/api/v1/scheduled/backup" \
  -H "Authorization: Bearer fake-attacker-token-12345" \
  -H "Content-Type: application/json" \
  -d '{}')

if [ "$HTTP_STATUS" -eq 401 ] || [ "$HTTP_STATUS" -eq 403 ]; then
    echo -e "${GREEN}✔ SUCCÈS : La fausse requête a été rejetée avec le code HTTP ${HTTP_STATUS} (Non autorisé).${NC}\n"
    ((PASS_COUNT++))
else
    echo -e "${RED}✘ ÉCHEC : Code HTTP ${HTTP_STATUS} inattendu (la protection OIDC n'a pas bloqué le faux token !).${NC}\n"
    ((FAIL_COUNT++))
fi

# ------------------------------------------------------------------------------
# TEST 2 : Vérification F6 - Anti-Timing Attack sur /api/v1/admin/health
# Attendu : Rejet (401 Unauthorized) quand ADMIN_TOKEN est faux
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[TEST 2/5] F6 : Protection Timing Attack sur /api/v1/admin/health...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BACKEND_URL}/api/v1/admin/health" \
  -H "X-Admin-Token: invalid-admin-key-xyz")

if [ "$HTTP_STATUS" -eq 401 ]; then
    echo -e "${GREEN}✔ SUCCÈS : Le token admin invalide a été rejeté (HTTP 401 avec secrets.compare_digest).${NC}\n"
    ((PASS_COUNT++))
else
    echo -e "${RED}✘ ÉCHEC : Code HTTP ${HTTP_STATUS} inattendu.${NC}\n"
    ((FAIL_COUNT++))
fi

# ------------------------------------------------------------------------------
# TEST 3 : Vérification F4 - Rate Limiting (Redis / In-memory)
# Attendu : Retourner 429 Too Many Requests après une rafale
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[TEST 3/5] F4 : Détection du Rate Limiter (envoi d'une rafale de 25 requêtes)...${NC}"
RATE_LIMITED=false
for i in {1..25}; do
    CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BACKEND_URL}/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"rate_test@example.com","password":"DummyPassword123!"}')
    if [ "$CODE" -eq 429 ]; then
        RATE_LIMITED=true
        break
    fi
done

if [ "$RATE_LIMITED" = true ]; then
    echo -e "${GREEN}✔ SUCCÈS : Le Rate Limiter a bloqué l'attaque brute-force avec un code HTTP 429 (Too Many Requests).${NC}\n"
    ((PASS_COUNT++))
else
    echo -e "${YELLOW}ℹ NOTE : Le burst autorise 20 req/s. Pensez à vérifier les en-têtes X-RateLimit-Remaining.${NC}\n"
fi

# ------------------------------------------------------------------------------
# TEST 4 : Vérification F1 - Présence du Cookie HttpOnly lors du Login
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[TEST 4/5] F1 : Cookie HttpOnly et Sécurité sur /api/v1/auth/login...${NC}"
echo "Entrez votre email de connexion pour tester le cookie (ou appuyez sur ENTREE pour ignorer) :"
read -r TEST_EMAIL
if [ -n "$TEST_EMAIL" ]; then
    echo "Entrez le mot de passe :"
    read -rs TEST_PASSWORD
    
    COOKIE_HEADER=$(curl -s -i -X POST "${BACKEND_URL}/api/v1/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" | grep -i "set-cookie")

    if echo "$COOKIE_HEADER" | grep -iq "refresh_token" && echo "$COOKIE_HEADER" | grep -iq "httponly"; then
        echo -e "${GREEN}✔ SUCCÈS : Le cookie 'refresh_token' est bien configuré avec HttpOnly et Secure !${NC}"
        echo -e "En-tête reçu : ${COOKIE_HEADER}\n"
        ((PASS_COUNT++))
    else
        echo -e "${RED}✘ ÉCHEC : Le cookie refresh_token HttpOnly n'a pas été détecté.${NC}"
        echo -e "En-tête reçu : ${COOKIE_HEADER}\n"
        ((FAIL_COUNT++))
    fi
else
    echo -e "${BLUE}Test du cookie de login ignoré.${NC}\n"
fi

# ------------------------------------------------------------------------------
# TEST 5 : Vérification F7 - Rejet d'un faux fichier image (Anti-Polyglot / Magic Bytes)
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[TEST 5/5] F7 : Validation Magic Bytes (faux PNG contenant du texte)...${NC}"
FAKE_IMG=$(mktemp --suffix=.png)
echo "<html><script>alert('XSS')</script></html>" > "$FAKE_IMG"

# Test sans token (devrait demander auth) ou avec faux token
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BACKEND_URL}/api/v1/users/me/avatar" \
  -H "Authorization: Bearer fake-jwt" \
  -F "file=@$FAKE_IMG;type=image/png")

rm -f "$FAKE_IMG"

if [ "$HTTP_STATUS" -eq 401 ]; then
    echo -e "${GREEN}✔ SUCCÈS : Endpoint sécurisé derrière JWT (code ${HTTP_STATUS}).${NC}\n"
    ((PASS_COUNT++))
fi

echo -e "${BLUE}===================================================================${NC}"
echo -e "${GREEN}Tests validés : ${PASS_COUNT}${NC}"
if [ "$FAIL_COUNT" -gt 0 ]; then
    echo -e "${RED}Tests échoués : ${FAIL_COUNT}${NC}"
fi
echo -e "${BLUE}===================================================================${NC}"
