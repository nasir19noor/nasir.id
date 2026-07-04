/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_API_BASE_URL: string;
  readonly PUBLIC_AWS_REGION: string;
  readonly PUBLIC_COGNITO_USER_POOL_ID: string;
  readonly PUBLIC_COGNITO_USER_POOL_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
