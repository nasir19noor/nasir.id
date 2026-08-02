#!/bin/bash
set -euo pipefail

docker stop ucl-backend 2>/dev/null || true
docker rm   ucl-backend 2>/dev/null || true
docker rmi  ucl-backend:latest 2>/dev/null || true

docker build -t ucl-backend:latest .

docker run -d -p 9004:9004 --env-file .env \
    --restart unless-stopped \
    --name ucl-backend ucl-backend:latest
