#!/bin/bash
set -e

# Configuration
REGION="europe-west1"
PROJECT_ID="project-df0355fd-eba9-4724-bbd"
IMAGE_REPO="${REGION}-docker.pkg.dev/${PROJECT_ID}/mimo-repo"

TARGET=${1:-all}

echo "========================================="
echo "   Mimo Deploy Script (Target: $TARGET)  "
echo "========================================="

deploy_backend() {
    echo ">> [1/2] Building and pushing Backend..."
    gcloud builds submit --config=cloudbuild.backend.yaml
    echo ">> [2/2] Updating Cloud Run service mimo-backend..."
    gcloud run deploy mimo-backend \
        --image="${IMAGE_REPO}/backend:latest" \
        --region="${REGION}"
    echo "Backend deployed successfully!"
}

deploy_frontend() {
    echo ">> [1/2] Building and pushing Frontend..."
    gcloud builds submit --config=cloudbuild.frontend.yaml
    echo ">> [2/2] Updating Cloud Run service mimo-frontend..."
    gcloud run deploy mimo-frontend \
        --image="${IMAGE_REPO}/frontend:latest" \
        --region="${REGION}"
    echo "Frontend deployed successfully!"
}

case "$TARGET" in
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
