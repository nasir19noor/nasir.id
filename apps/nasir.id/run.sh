docker stop nasir && docker rm nasir
docker build -t nasir:latest .
docker run -d \
  --network host \
  -e PORT="7000" \
  -e DATABASE_URL \
  -e ADMIN_PASSWORD \
  -e AWS_REGION \
  -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY \
  -e AWS_S3_BUCKET \
  --env-file .env \
  --name nasir nasir:latest