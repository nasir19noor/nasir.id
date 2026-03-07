docker stop nasir && docker rm nasir
docker build -t nasir:latest .
docker run -d \
  --network host \
  -e PORT="${PORT:-7000}" \
  --env-file .env \
  --name nasir nasir:latest