# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app

ARG PUBLIC_API_URL=https://api.layarsehat.nasir.id
ENV PUBLIC_API_URL=$PUBLIC_API_URL

COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- run ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=5005

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

EXPOSE 5005
CMD ["node", "./dist/server/entry.mjs"]
