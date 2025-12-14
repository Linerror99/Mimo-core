#!/bin/bash
# Script to run database migrations manually in production
# Use this for the first deployment or when CI/CD migration step is disabled

set -e

PROJECT_ID="mimo-finance-prod"
REGION="europe-west1"
BACKEND_SERVICE="mimo-backend"

echo "🔄 Running Database Migrations on Production..."
echo ""

# Get backend URL
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format='value(status.url)')

echo "Backend URL: $BACKEND_URL"
echo ""

# Get admin token from Secret Manager
echo "📋 Retrieving admin token from Secret Manager..."
ADMIN_TOKEN=$(gcloud secrets versions access latest \
  --secret=admin-token \
  --project=$PROJECT_ID)

echo "✅ Admin token retrieved"
echo ""

# Call migration endpoint
echo "🚀 Calling migration endpoint..."
echo "POST $BACKEND_URL/api/v1/admin/migrate"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "X-Admin-Token: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Content-Length: 0" \
  -d "" \
  "$BACKEND_URL/api/v1/admin/migrate")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response Status: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Database migrations completed successfully!"
  exit 0
else
  echo "❌ Migration failed with HTTP $HTTP_CODE"
  exit 1
fi
