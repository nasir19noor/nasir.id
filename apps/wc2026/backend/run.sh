#!/bin/bash
# Local single-node deploy helper. Build context is apps/wc2026/ so the
# Dockerfile can reach the curated squads spreadsheet alongside backend/.

set -euo pipefail

cd "$(dirname "$0")/.."          # apps/wc2026/

rm -f backend/.env
aws s3 cp s3://wc2026.nasir.id/backend/.env backend/.env

test -f World_Cup_2026_Wall_Chart.xlsx \
    || { echo "Missing World_Cup_2026_Wall_Chart.xlsx in $(pwd)"; exit 1; }

docker stop wc2026-backend 2>/dev/null || true
docker rm   wc2026-backend 2>/dev/null || true
docker rmi  wc2026-backend:latest 2>/dev/null || true

docker build -f backend/Dockerfile -t wc2026-backend:latest .
docker run -d -p 9002:9002 --env-file backend/.env \
    --restart unless-stopped \
    --name wc2026-backend wc2026-backend:latest
