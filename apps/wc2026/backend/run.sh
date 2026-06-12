#!/bin/bash
# Local single-node deploy helper. Build context = this directory.
set -euo pipefail

cd "$(dirname "$0")"

rm -f .env
aws s3 cp s3://wc2026.nasir.id/backend/.env .env

test -f World_Cup_2026_Wall_Chart.xlsx \
    || { echo "Missing World_Cup_2026_Wall_Chart.xlsx in $(pwd)"; exit 1; }

docker stop wc2026-backend 2>/dev/null || true
docker rm   wc2026-backend 2>/dev/null || true
docker rmi  wc2026-backend:latest 2>/dev/null || true

docker build -t wc2026-backend:latest .
docker run -d -p 9002:9002 --env-file .env \
    --restart unless-stopped \
    --name wc2026-backend wc2026-backend:latest
