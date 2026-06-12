#!/bin/bash
set -euo pipefail

docker stop wc2026-frontend 2>/dev/null || true
docker rm   wc2026-frontend 2>/dev/null || true
docker rmi  wc2026-frontend:latest 2>/dev/null || true

docker build \
    --build-arg NEXT_PUBLIC_API_URL=https://api.wc2026.nasir.id \
    -t wc2026-frontend:latest .

docker run -d -p 5002:5002 \
    --restart unless-stopped \
    --name wc2026-frontend wc2026-frontend:latest
