docker stop itung-frontend && docker rm itung-frontend
docker build \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:9000 \
  --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID=943652190384-emo9evfro4d5n6rpabn1artu2brmtm9m.apps.googleusercontent.com \
  -t itung-frontend:latest .
docker run -d -p 5000:5000 --name itung-frontend itung-frontend:latest


