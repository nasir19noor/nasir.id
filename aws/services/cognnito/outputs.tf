output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.mbg.id
}

output "cognito_user_pool_client_id" {
  value = aws_cognito_user_pool_client.mbg.id
}

# You'll need this for the API Gateway JWT authorizer in the next step
output "cognito_issuer_url" {
  value = "https://cognito-idp.${local.region}.amazonaws.com/${aws_cognito_user_pool.mbg.id}"
}

output "cognito_user_pool_arn" {
  value = aws_cognito_user_pool.mbg.arn
}

