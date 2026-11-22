#!/usr/bin/env bash
# ==============================================================================
# Mimo Finance — Configuration sécurisée Open Banking sur Cloud Run + Scheduler
# Stocke les secrets sensibles dans GCP Secret Manager (jamais en env var brute)
# et permet de verrouiller les inscriptions publiques en production.
#
# Usage :
#   ENABLE_BANKING_APP_ID=<uuid> ./scripts/setup-banking-cloudrun.sh
# Options :
#   KEY_FILE=secrets/enable_banking_private.pem (défaut)
#   SETUP_SCHEDULER=true                        (job Cloud Scheduler toutes les 6h)
#   ALLOW_PUBLIC_REGISTRATION=false             (défaut: false en prod)
# ==============================================================================
set -euo pipefail

REGION="${REGION:-europe-west1}"
PROJECT_ID="${PROJECT_ID:-project-df0355fd-eba9-4724-bbd}"
BACKEND_SERVICE="${BACKEND_SERVICE:-mimo-backend}"
FRONTEND_SERVICE="${FRONTEND_SERVICE:-mimo-frontend}"
KEY_FILE="${KEY_FILE:-secrets/enable_banking_private.pem}"
SETUP_SCHEDULER="${SETUP_SCHEDULER:-true}"
ALLOW_PUBLIC_REGISTRATION="${ALLOW_PUBLIC_REGISTRATION:-false}"

SECRET_KEY_NAME="enable-banking-private-key-b64"
SECRET_CRON_NAME="cron-sync-secret"

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

upsert_secret() {
    local secret_name="$1"
    local secret_value="$2"
    if gcloud secrets describe "${secret_name}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
        printf '%s' "${secret_value}" | gcloud secrets versions add "${secret_name}" \
            --project="${PROJECT_ID}" \
            --data-file=- \
            --quiet >/dev/null
    else
        printf '%s' "${secret_value}" | gcloud secrets create "${secret_name}" \
            --project="${PROJECT_ID}" \
            --replication-policy="automatic" \
            --data-file=- \
            --quiet >/dev/null
    fi
}

echo ">> Récupération des URLs Cloud Run (${PROJECT_ID} / ${REGION})..."
BACKEND_URL="$(gcloud run services describe "${BACKEND_SERVICE}" --project="${PROJECT_ID}" --region="${REGION}" --format='value(status.url)')"
FRONTEND_URL="$(gcloud run services describe "${FRONTEND_SERVICE}" --project="${PROJECT_ID}" --region="${REGION}" --format='value(status.url)')"
BACKEND_SA="$(gcloud run services describe "${BACKEND_SERVICE}" --project="${PROJECT_ID}" --region="${REGION}" --format='value(spec.template.spec.serviceAccountName)')"
REDIRECT_URL="${BANKING_REDIRECT_URL:-${FRONTEND_URL}/accounts/bank-callback}"

echo "   Backend  : ${BACKEND_URL}"
echo "   Frontend : ${FRONTEND_URL}"
echo "   Callback : ${REDIRECT_URL}"
echo "   Inscriptions publiques : ${ALLOW_PUBLIC_REGISTRATION}"

KEY_B64="$(base64 < "${KEY_FILE}" | tr -d '\r\n')"
CRON_SECRET="${CRON_SYNC_SECRET:-$(openssl rand -hex 32)}"

echo ">> Stockage des secrets dans GCP Secret Manager..."
upsert_secret "${SECRET_KEY_NAME}" "${KEY_B64}"
upsert_secret "${SECRET_CRON_NAME}" "${CRON_SECRET}"

if [[ -n "${BACKEND_SA}" ]]; then
    for s in "${SECRET_KEY_NAME}" "${SECRET_CRON_NAME}"; do
        gcloud secrets add-iam-policy-binding "${s}" \
            --project="${PROJECT_ID}" \
            --member="serviceAccount:${BACKEND_SA}" \
            --role="roles/secretmanager.secretAccessor" \
            --quiet >/dev/null
    done
fi

echo ">> Mise à jour sécurisée de ${BACKEND_SERVICE} (secrets via Secret Manager)..."
# 1. Retire d'abord d'éventuelles anciennes env vars en clair
gcloud run services update "${BACKEND_SERVICE}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --remove-env-vars="ENABLE_BANKING_PRIVATE_KEY_B64,CRON_SYNC_SECRET" \
    --quiet >/dev/null 2>&1 || true

# 2. Injecte les variables non sensibles + les secrets depuis Secret Manager
gcloud run services update "${BACKEND_SERVICE}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --update-env-vars="BANKING_PROVIDER=enable_banking,ENABLE_BANKING_APP_ID=${ENABLE_BANKING_APP_ID},BANKING_REDIRECT_URL=${REDIRECT_URL},ALLOW_PUBLIC_REGISTRATION=${ALLOW_PUBLIC_REGISTRATION}" \
    --update-secrets="ENABLE_BANKING_PRIVATE_KEY_B64=${SECRET_KEY_NAME}:latest,CRON_SYNC_SECRET=${SECRET_CRON_NAME}:latest" \
    --quiet

echo "✅ Variables & secrets Open Banking configurés sur ${BACKEND_SERVICE} !"

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
echo "  🎉 Configuration sécurisée terminée !"
echo "  - Secrets stockés dans Secret Manager"
echo "  - Inscriptions publiques : ${ALLOW_PUBLIC_REGISTRATION}"
echo "  - Redirect URL Enable Banking :"
echo "    ${REDIRECT_URL}"
echo "========================================="
