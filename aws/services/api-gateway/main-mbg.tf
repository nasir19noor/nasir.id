module "mbg_api" {
  source        = "git::https://github.com/nasir19noor/terraform.git//aws/modules/api-gateway"
  api_name      = "mbg-api"          # was local.name-mbg (invalid)
  endpoint_type = "REGIONAL"

  tags = {
    Project     = "mbg"
    Environment = "prd"
    ManagedBy   = "terraform"
  }
}

data "aws_api_gateway_rest_api" "mbg" {
  name = module.mbg_api.api_name
}

locals {
  mbg_rest_api_id       = module.mbg_api.api_id
  mbg_root_resource_id  = data.aws_api_gateway_rest_api.mbg.root_resource_id
  mbg_lambda_invoke_arn = data.terraform_remote_state.lambda.outputs.mbg_invoke_arn
  app_origin            = "https://mbg.nasir.id"
}

# --- Cognito authorizer (REST API uses COGNITO_USER_POOLS, not a JWT authorizer) ---
resource "aws_api_gateway_authorizer" "cognito" {
  name            = "cognito-mbg"
  type            = "COGNITO_USER_POOLS"
  rest_api_id     = local.mbg_rest_api_id
  identity_source = "method.request.header.Authorization"
  provider_arns   = [data.terraform_remote_state.mbg_cognito.outputs.user_pool_arn]
  # If Cognito isn't in remote state, hardcode:
  # provider_arns = ["arn:aws:cognito-idp:ap-southeast-1:647459380434:userpool/ap-southeast-1_30cpoEHIv"]
}

# --- /profile resource ---
resource "aws_api_gateway_resource" "profile" {
  rest_api_id = local.mbg_rest_api_id
  parent_id   = local.mbg_root_resource_id
  path_part   = "profile"
}

# --- GET /profile, protected ---
resource "aws_api_gateway_method" "profile_get" {
  rest_api_id   = local.mbg_rest_api_id
  resource_id   = aws_api_gateway_resource.profile.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "profile_get" {
  rest_api_id             = local.mbg_rest_api_id
  resource_id             = aws_api_gateway_resource.profile.id
  http_method             = aws_api_gateway_method.profile_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = local.mbg_lambda_invoke_arn
}

# --- OPTIONS /profile for CORS preflight (MOCK) ---
resource "aws_api_gateway_method" "profile_options" {
  rest_api_id   = local.mbg_rest_api_id
  resource_id   = aws_api_gateway_resource.profile.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "profile_options" {
  rest_api_id       = local.mbg_rest_api_id
  resource_id       = aws_api_gateway_resource.profile.id
  http_method       = aws_api_gateway_method.profile_options.http_method
  type              = "MOCK"
  request_templates = { "application/json" = "{\"statusCode\": 200}" }
}

resource "aws_api_gateway_method_response" "profile_options" {
  rest_api_id = local.mbg_rest_api_id
  resource_id = aws_api_gateway_resource.profile.id
  http_method = aws_api_gateway_method.profile_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "profile_options" {
  rest_api_id = local.mbg_rest_api_id
  resource_id = aws_api_gateway_resource.profile.id
  http_method = aws_api_gateway_method.profile_options.http_method
  status_code = aws_api_gateway_method_response.profile_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'authorization,content-type'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.app_origin}'"
  }
  depends_on = [aws_api_gateway_integration.profile_options]
}

# --- Let API Gateway invoke the Lambda ---
resource "aws_lambda_permission" "profile" {
  statement_id  = "AllowAPIGatewayInvokeProfile"
  action        = "lambda:InvokeFunction"
  function_name = data.terraform_remote_state.lambda.outputs.mbg_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${data.aws_api_gateway_rest_api.mbg.execution_arn}/*/*"
}

