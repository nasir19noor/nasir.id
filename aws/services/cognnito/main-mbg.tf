resource "aws_cognito_user_pool" "mbg" {
  name = local.cognito_name_mbg

  # Sign in with email (matches the frontend's loginWith: { email: true })
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  # Emails a 6-digit code; the Amplify Authenticator's confirm screen expects this
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Your MBG verification code"
    email_message        = "Your verification code is {####}"
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Cognito's built-in sender — 50 emails/day cap. Swap to SES for production.
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  mfa_configuration = "OFF" # raise to OPTIONAL/ON later
}

resource "aws_cognito_user_pool_client" "mbg" {
  name         = "${local.cognito_name_mbg}-web"
  user_pool_id = aws_cognito_user_pool.mbg.id

  # Public SPA client — a browser can't keep a secret, and Amplify assumes none
  generate_secret = false

  # SRP is the flow Amplify uses
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  prevent_user_existence_errors = "ENABLED"

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}

