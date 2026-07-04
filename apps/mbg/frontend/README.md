# Asah — Daily Brain Gym (Astro frontend)

Static Astro site for the serverless brain-training app:
**Cognito → API Gateway (HTTP API) → Lambda → DynamoDB**.

Astro renders the page shells as static HTML; the interactive parts (auth, the
Schulte game, leaderboard) are client-side React islands mounted with
`client:only="react"`. `astro build` emits a plain static `./dist` — no SSR,
no export config — that drops straight into an S3 website bucket.

## Run and deploy

```bash
npm install
cp .env.example .env          # then fill in your 4 values
npm run build                 # -> ./dist (index.html at root)

# upload the BUILD OUTPUT, not the source
aws s3 sync ./dist s3://mbg.nasir.id --delete
```

`dist/` is the only thing that ever goes in the bucket: `index.html`,
`play/index.html`, `leaderboard/index.html`, and an `_astro/` assets folder.
Re-run `build` + `sync` whenever code or env values change.

Env vars use Astro's `PUBLIC_` prefix and are inlined at build time:

| Variable | Source |
| --- | --- |
| `PUBLIC_API_BASE_URL` | API Gateway HTTP API invoke URL |
| `PUBLIC_AWS_REGION` | e.g. `ap-southeast-1` |
| `PUBLIC_COGNITO_USER_POOL_ID` | Cognito user pool |
| `PUBLIC_COGNITO_USER_POOL_CLIENT_ID` | Cognito app client (public, no secret) |

## HTTPS is required for login

Amplify's Cognito SRP sign-in uses `crypto.subtle`, which only exists in a
secure context. The plain-HTTP S3 website endpoint won't work for auth — put
Cloudflare (proxied, SSL mode Flexible) or CloudFront in front so the browser
loads the site over HTTPS.

## Cognito app client

Public client, **no secret**, `USER_SRP_AUTH` flow enabled. Wire the API
Gateway JWT authorizer to this user pool and set the audience to the app
client ID. The frontend sends the Cognito **ID token** as
`Authorization: Bearer <jwt>` on every call.

## API contract

### `POST /sessions`
```jsonc
{ "game": "schulte" }
// -> { "sessionId": "uuid", "game": "schulte", "startedAt": 1719000000000 }
```
Server generates the puzzle, records `startedAt`, writes a `Sessions` row with TTL.

### `POST /sessions/{sessionId}/submit`
```jsonc
{ "completed": true, "mistakes": 2 }
// -> { "score": 18400, "elapsedMs": 18400, "personalBest": true, "bestScore": 18400 }
```
Server reads the session, computes `elapsedMs = now - startedAt` (never trust a
client time), scores, updates streak/totals, writes `Scores`.

### `GET /leaderboard?game=schulte`
```jsonc
{ "entries": [ { "rank": 1, "username": "umar", "score": 14200 } ] }
```
Back with a GSI on `Scores` (`PK = game#date`, `SK = score`), query ascending.

### `GET /profile`
```jsonc
{ "username": "nasir", "streak": 6, "totalGames": 41, "bestScores": { "schulte": 14200 } }
```
Derive `username` from the JWT.

## Layout

```
src/
  pages/                 index.astro, play.astro, leaderboard.astro (static shells)
  layouts/Base.astro     html head + global styles
  components/
    AppShell.tsx         Amplify config + Authenticator gate + top bar
    SchulteTable.tsx     the game
    pages/               Home / Play / Leaderboard island roots
  lib/
    amplify.ts           Cognito config from PUBLIC_ env
    api.ts               JWT-authed fetch client + types
  styles/global.css
```

Imports are relative throughout (no `@/` path alias), so the build doesn't
depend on tsconfig path resolution.

## Mobile parity

The Flutter client talks to the same API and Cognito pool via Amplify Flutter —
one backend, two front-ends.
