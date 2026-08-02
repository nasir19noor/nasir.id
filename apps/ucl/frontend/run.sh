#!/bin/bash
set -euo pipefail

docker stop ucl-frontend 2>/dev/null || true
docker rm   ucl-frontend 2>/dev/null || true
docker rmi  ucl-frontend:latest 2>/dev/null || true

docker build \
    --build-arg NEXT_PUBLIC_API_URL=https://api.ucl.nasir.id \
    -t ucl-frontend:latest .

docker run -d -p 5004:5004 \
    --restart unless-stopped \
    --name ucl-frontend ucl-frontend:latest
