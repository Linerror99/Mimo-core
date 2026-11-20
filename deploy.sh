#!/usr/bin/env bash
# ==============================================================================
# Mimo Finance — Script de déploiement direct Cloud Run (Option B)
# Docker + Artifact Registry + Cloud Run + Smoke Tests
# Usage : ./deploy.sh [frontend|backend|all]
# ==============================================================================
set -euo pipefail

REGION="${REGION:-europe-west1}"
PROJECT_ID="${PROJECT_ID:-project-df0355fd-eba9-4724-bbd}"
REPOSITORY="${REPOSITORY:-mimo-repo}"
BACKEND_SERVICE="${BACKEND_SERVICE:-mimo-backend}"
FRONTEND_SERVICE="${FRONTEND_SERVICE:-mimo-frontend}"
IMAGE_REPO="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}"
TAG="${TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo latest)}"

TARGET="${1:-all}"

for cmd in docker gcloud curl; do
    if ! command -v "${cmd}" >/dev/null 2>&1; then
        echo "❌ Erreur : '${cmd}' est introuvable dans le PATH." >&2
        exit 1
    fi
done

echo "========================================="
echo "   Mimo Deploy Script (Target: ${TARGET})"
echo "   Project: ${PROJECT_ID} (${REGION})"
echo "   Tag:     ${TAG}"
echo "========================================="

deploy_backend() {
    echo ">> [1/2] Building and pushing Backend image (linux/amd64)..."
    docker build \
        --platform linux/amd64 \
        -t "${IMAGE_REPO}/backend:${TAG}" \
        -t "${IMAGE_REPO}/backend:latest" \
        -f backend/Dockerfile.prod \
        backend/
    docker push "${IMAGE_REPO}/backend:${TAG}"
    docker push "${IMAGE_REPO}/backend:latest"

    echo ">> [2/2] Updating Cloud Run service ${BACKEND_SERVICE}..."
    gcloud run deploy "${BACKEND_SERVICE}" \
        --image="${IMAGE_REPO}/backend:${TAG}" \
        --region="${REGION}" \
        --platform=managed \
        --quiet

    BACKEND_URL="$(gcloud run services describe "${BACKEND_SERVICE}" \
        --region="${REGION}" \
        --format='value(status.url)')"
    echo ">> Smoke test Backend: ${BACKEND_URL}/health"
    curl -sf "${BACKEND_URL}/health" && echo ""
    echo "✅ Backend deployed successfully: ${BACKEND_URL}"
}

deploy_frontend() {
    echo ">> [1/2] Building and pushing Frontend image (Next.js Standalone, linux/amd64)..."
    BACKEND_URL="$(gcloud run services describe "${BACKEND_SERVICE}" \
        --region="${REGION}" \
        --format='value(status.url)')"

    docker build \
        --platform linux/amd64 \
        --build-arg NEXT_PUBLIC_API_URL="/api/v1" \
        -t "${IMAGE_REPO}/frontend:${TAG}" \
        -t "${IMAGE_REPO}/frontend:latest" \
        -f frontend/Dockerfile.prod \
        frontend/
    docker push "${IMAGE_REPO}/frontend:${TAG}"
    docker push "${IMAGE_REPO}/frontend:latest"

    echo ">> [2/2] Updating Cloud Run service ${FRONTEND_SERVICE}..."
    gcloud run deploy "${FRONTEND_SERVICE}" \
        --image="${IMAGE_REPO}/frontend:${TAG}" \
        --region="${REGION}" \
        --platform=managed \
        --update-env-vars="INTERNAL_API_URL=${BACKEND_URL}/api/v1,NEXT_PUBLIC_API_URL=/api/v1" \
        --quiet

    FRONTEND_URL="$(gcloud run services describe "${FRONTEND_SERVICE}" \
        --region="${REGION}" \
        --format='value(status.url)')"
    echo ">> Smoke test Frontend: ${FRONTEND_URL}"
    curl -sf "${FRONTEND_URL}" >/dev/null
    echo "✅ Frontend deployed successfully: ${FRONTEND_URL}"
}

case "${TARGET}" in
    backend)
        deploy_backend
        ;;
    frontend)
        deploy_frontend
        ;;
    all)
        deploy_backend
        deploy_frontend
        ;;
    *)
        echo "Usage: ./deploy.sh [frontend|backend|all]"
        exit 1
        ;;
esac

echo "========================================="
echo "   🎉 Deployment completed successfully! "
echo "========================================="
