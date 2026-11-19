#!/usr/bin/env bash
# ==============================================================================
# Mimo Finance — Script de déploiement manuel Cloud Run
# Aligné sur .github/workflows/deploy-production.yml (Docker + Artifact Registry)
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

echo "========================================="
echo "   Mimo Deploy Script (Target: ${TARGET})"
echo "   Tag: ${TAG}"
echo "========================================="

deploy_backend() {
    echo ">> [1/2] Building and pushing Backend image..."
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
    echo "Backend deployed successfully!"
}

deploy_frontend() {
    echo ">> [1/2] Building and pushing Frontend image (Next.js Standalone)..."
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
    echo "Frontend deployed successfully!"
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
echo "   Deployment completed successfully!    "
echo "========================================="
