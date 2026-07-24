# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app

# Baked in at build time, exactly like NEXT_PUBLIC_* in the iTung frontend.
ARG PUBLIC_API_URL=https://api.agent.nasir.id
ENV PUBLIC_API_URL=$PUBLIC_API_URL

COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- run ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=5003

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

EXPOSE 5003
CMD ["node", "./dist/server/entry.mjs"]



