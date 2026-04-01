#python3 -m venv venv
#source venv/bin/activate
#pip install -r requirements.txt
#uvicorn main:app --reload --host 0.0.0.0 --port 9000

rm .env
aws s3 cp s3://assets.itung.nasir.id/backend/.env .env

# Stop and remove existing container, then remove image
docker stop itung-backend 2>/dev/null || true
docker rm itung-backend 2>/dev/null || true
docker rmi itung-backend:latest 2>/dev/null || true

# Build and run fresh
docker build -t itung-backend:latest .
docker run -d -p 9000:9000 --env-file .env \
  -e GOOGLE_CLIENT_ID=943652190384-emo9evfro4d5n6rpabn1artu2brmtm9m.apps.googleusercontent.com \
  -e FONNTE_TOKEN=${FONNTE_TOKEN:-} \
  --name itung-backend itung-backend:latest
