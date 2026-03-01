#!/bin/bash
set -e

PROJECT=anvili-insurance
SERVICE=reactai-demo
REGION=us-central1
IMAGE=gcr.io/$PROJECT/$SERVICE

echo "==> [1/4] Scanning components..."
npm run demo:scan

echo ""
echo "==> [2/4] Building & pushing image via Cloud Build..."
gcloud builds submit --tag "$IMAGE" .

echo ""
echo "==> [3/4] Deploying to Cloud Run..."
gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --quiet

URL=$(gcloud run services describe "$SERVICE" --region="$REGION" --format="value(status.url)")
echo ""
echo "✓ Deployed: $URL"
