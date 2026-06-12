#!/bin/bash
# Local dev / single-node deploy helper.
# Pull .env from S3, then build & run the backend container.

set -euo pipefail

rm -f .env
aws s3 cp s3://wc2026.nasir.id/backend/.env .env

# Copy the seed spreadsheet next to the Dockerfile so the image bakes it in.
SEED_SRC="../World_Cup_2026_Wall_Chart.xlsx"
if [ -f "$SEED_SRC" ]; then
    cp "$SEED_SRC" .
fi

docker stop wc2026-backend 2>/dev/null || true
docker rm   wc2026-backend 2>/dev/null || true
docker rmi  wc2026-backend:latest 2>/dev/null || true

docker build -t wc2026-backend:latest .
docker run -d -p 9002:9002 --env-file .env \
    --restart unless-stopped \
    --name wc2026-backend wc2026-backend:latest
