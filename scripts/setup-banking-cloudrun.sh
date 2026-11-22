#!/usr/bin/env bash
# ==============================================================================
# Mimo Finance — Configuration Enable Banking sur Google Cloud Run + Scheduler
# Usage :
#   ENABLE_BANKING_APP_ID=<uuid> ./scripts/setup-banking-cloudrun.sh
# Options :
#   KEY_FILE=secrets/enable_banking_private.pem (défaut)
#   SETUP_SCHEDULER=true (crée/met à jour le job Cloud Scheduler toutes les 6h)
# ==============================================================================
set -euo pipefail

REGION="${REGION:-europe-west1}"
PROJECT_ID="${PROJECT_ID:-project-df0355fd-eba9-4724-bbd}"
BACKEND_SERVICE="${BACKEND_SERVICE:-mimo-backend}"
FRONTEND_SERVICE="${FRONTEND_SERVICE:-mimo-frontend}"
KEY_FILE="${KEY_FILE:-secrets/enable_banking_private.pem}"
SETUP_SCHEDULER="${SETUP_SCHEDULER:-true}"

if [[ -z "${ENABLE_BANKING_APP_ID:-}" ]]; then
    echo "❌ Erreur : définis ENABLE_BANKING_APP_ID avant de lancer ce script."
    echo "   Exemple : ENABLE_BANKING_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx ./scripts/setup-banking-cloudrun.sh"
    exit 1
fi

if [[ ! -f "${KEY_FILE}" ]]; then
    echo "❌ Erreur : clé privée introuvable : ${KEY_FILE}"
    echo "   Génère-la d'abord avec :"
    echo "   mkdir -p secrets && openssl req -x509 -newkey rsa:4096 -keyout secrets/enable_banking_private.pem -out secrets/enable_banking_cert.pem -days 3650 -nodes -subj \"/CN=MimoFinance\""
    exit 1
fi

for cmd in gcloud openssl base64; do
    if ! command -v "${cmd}" >/dev/null 2>&1; then
        echo "❌ Erreur : '${cmd}' est requis." >&2
        exit 1
    fi
done

echo ">> Récupération des URLs Cloud Run (${PROJECT_ID} / ${REGION})..."
BACKEND_URL="$(gcloud run services describe "${BACKEND_SERVICE}" --project="${PROJECT_ID}" --region="${REGION}" --format='value(status.url)')"
FRONTEND_URL="$(gcloud run services describe "${FRONTEND_SERVICE}" --project="${PROJECT_ID}" --region="${REGION}" --format='value(status.url)')"
REDIRECT_URL="${BANKING_REDIRECT_URL:-${FRONTEND_URL}/accounts/bank-callback}"

echo "   Backend  : ${BACKEND_URL}"
echo "   Frontend : ${FRONTEND_URL}"
echo "   Callback : ${REDIRECT_URL}"

KEY_B64="$(base64 < "${KEY_FILE}" | tr -d '\r\n')"
CRON_SECRET="${CRON_SYNC_SECRET:-$(openssl rand -hex 32)}"

echo ">> Mise à jour des variables Open Banking sur ${BACKEND_SERVICE}..."
gcloud run services update "${BACKEND_SERVICE}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --update-env-vars="BANKING_PROVIDER=enable_banking,ENABLE_BANKING_APP_ID=${ENABLE_BANKING_APP_ID},ENABLE_BANKING_PRIVATE_KEY_B64=${KEY_B64},BANKING_REDIRECT_URL=${REDIRECT_URL},CRON_SYNC_SECRET=${CRON_SECRET}" \
    --quiet

echo "✅ Variables Open Banking configurées sur ${BACKEND_SERVICE} !"

if [[ "${SETUP_SCHEDULER}" == "true" ]]; then
    JOB_NAME="mimo-banking-sync-6h"
    echo ">> Configuration du job Cloud Scheduler (${JOB_NAME}, toutes les 6h)..."
    if gcloud scheduler jobs describe "${JOB_NAME}" --project="${PROJECT_ID}" --location="${REGION}" >/dev/null 2>&1; then
        gcloud scheduler jobs update http "${JOB_NAME}" \
            --project="${PROJECT_ID}" \
            --location="${REGION}" \
            --schedule="0 */6 * * *" \
            --time-zone="Europe/Paris" \
            --uri="${BACKEND_URL}/api/v1/banking/cron-sync" \
            --http-method=POST \
            --update-headers="X-Cron-Secret=${CRON_SECRET}" \
            --quiet
    else
        gcloud scheduler jobs create http "${JOB_NAME}" \
            --project="${PROJECT_ID}" \
            --location="${REGION}" \
            --schedule="0 */6 * * *" \
            --time-zone="Europe/Paris" \
            --uri="${BACKEND_URL}/api/v1/banking/cron-sync" \
            --http-method=POST \
            --headers="X-Cron-Secret=${CRON_SECRET}" \
            --quiet
    fi
    echo "✅ Cloud Scheduler configuré (${JOB_NAME} -> toutes les 6h) !"
fi

echo ""
echo "========================================="
echo "  🎉 Configuration Open Banking terminée !"
echo "  Pense à vérifier que cette Redirect URL"
echo "  est bien enregistrée dans Enable Banking :"
echo "  ${REDIRECT_URL}"
echo "========================================="
