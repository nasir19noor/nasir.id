import type { ResourcesConfig } from "aws-amplify";

export const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.PUBLIC_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.PUBLIC_COGNITO_USER_POOL_CLIENT_ID,
      loginWith: { email: true },
    },
  },
};
